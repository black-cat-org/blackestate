# Black Estate — Roles, Permisos y Modelo de Tenancy

> Diseño del sistema de organizaciones, roles y permisos para Black Estate.
>
> **Creado:** 2026-04-13
> **Estado:** Decisión cerrada. Listo para implementar.

---

## 1. Modelo de tenancy

### Patrón elegido: "Everything is an org" (Patrón A)

Todo usuario pertenece a al menos una organización. No existen "cuentas personales" fuera de una org.

- **Auth provider:** Better Auth con Organization Plugin (open source).
- **Auto-crear org al signup:** Via hook `afterCreate` en Better Auth.
- **`organization_id` en todas las tablas de dominio:** `NOT NULL` siempre.
- **El plan vive en la org**, nunca en el usuario.

### Por qué este patrón

| Ventaja | Detalle |
|---------|---------|
| DB simplificada | `organization_id NOT NULL` en toda tabla. Sin nullable, sin `CASE WHEN`. |
| RLS uniforme | Una policy por tabla: `WHERE organization_id = jwt.org_id`. Sin branches. |
| JWT siempre completo | `org_id` nunca es `null`. Cada request tiene contexto de org. |
| Billing simple | Plan en la org. Stripe Customer = org. Sin ambigüedad. |
| Queries simples | `SELECT * FROM properties WHERE organization_id = $1`. Siempre. |
| Migración natural | Agente individual → agencia = solo cambiar plan + invitar. Cero migración de datos. |

---

## 2. Tipos de usuario y flujos

### Agente individual

```
Signup → Better Auth auto-crea org (1 miembro) → plan = free → usa el producto solo
Upgrade a Pro → más features, sigue solo
```

- Rol: `owner` de su org personal.
- UI: sin secciones de equipo, sin invitaciones, sin org switcher.
- Puede pertenecer a otras orgs como `agent` o `admin` simultáneamente.

### Dueño de agencia

```
Signup → Better Auth auto-crea org (1 miembro) → upgrade a enterprise → invita agentes
```

- Rol: `owner` de la org de su agencia.
- UI: sección "Equipo", puede invitar/gestionar miembros, ve todo.
- También tiene su org personal si quiere operar independientemente.

### Agente invitado a una agencia

```
Recibe invitación por email → signup (o signin si ya existe) →
se une a la org de la agencia → Better Auth también le crea su org personal auto
```

- Rol: `agent` en la org de la agencia.
- Rol: `owner` en su org personal.
- Puede switchear entre orgs con `<OrganizationSwitcher />`.
- Sus datos en cada org son completamente independientes.

### Multi-org (freelancer)

Un mismo usuario puede pertenecer a **múltiples organizaciones** con **roles distintos** en cada una:

| Org | Rol | Contexto |
|-----|-----|----------|
| "Mi Consultora" (personal) | `owner` | Su negocio independiente |
| "Inmobiliaria Sur" | `agent` | Trabaja como agente para esta agencia |
| "RE/MAX Bolivia" | `admin` | Administra esta franquicia |

Better Auth maneja esto nativamente. El componente OrgSwitcher permite cambiar de org y la session activa siempre refleja la org seleccionada.

---

## 3. Planes y pricing

| Tier | Plan en DB | Max miembros | Target | Features principales |
|------|-----------|-------------|--------|---------------------|
| **Free** | `free` | 1 | Agente individual que empieza | Límite de propiedades y leads, bot básico, analytics básicos |
| **Pro** | `pro` | 1 | Agente individual power-user | Propiedades y leads ilimitados, IA completa, analytics avanzados, exports |
| **Enterprise** | `enterprise` | N (por seat) | Agencias con equipo | Todo de Pro + gestión de equipo, reportes de agencia, reasignación de leads, analytics globales |

### Reglas de pricing

- **El plan vive en la org** (`organizations.plan`), nunca en el usuario.
- **Stripe Customer = org.** `organizations.stripe_customer_id`.
- **Free y Pro = máximo 1 miembro.** No se pueden invitar agentes.
- **Enterprise = N miembros.** Precio base + $X por seat adicional.
- **Un usuario puede tener plan Free en su org personal y ser agent en una org Enterprise.** No hay conflicto — cada org tiene su propio plan.

### Schema en DB

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',   -- 'free' | 'pro' | 'enterprise'
  max_seats INTEGER NOT NULL DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Roles

Definidos como **custom roles en Better Auth Organization Plugin** (`lib/auth-permissions.ts`).

| Role ID | Nombre visible | Descripción | Máximo por org |
|---------------|---------------|-------------|----------------|
| `owner` | Propietario | Dueño de la cuenta/agencia. Control total incluyendo billing. | 1 |
| `admin` | Administrador | Gerente de agencia. Todo excepto billing. | Ilimitado |
| `agent` | Agente | Agente inmobiliario operativo. Ve lo suyo + puede ver (no editar) lo de otros. | Ilimitado |

### Notas sobre roles

- **Agente individual** siempre es `owner` de su org. No ve UI de roles porque es solo 1 persona.
- **`owner` no se puede transferir** desde la UI (solo via API server-side si es necesario).
- **`admin` puede invitar y remover agentes**, pero no puede remover al owner ni a otros admins.
- **`agent` no puede invitar ni gestionar miembros.**

---

## 5. Permisos

### Permissions en Better Auth

```
# Propiedades
org:properties:create          → Crear propiedades
org:properties:read_own        → Ver propiedades propias
org:properties:read_all        → Ver TODAS las propiedades de la org
org:properties:edit_own        → Editar propiedades propias
org:properties:edit_all        → Editar TODAS las propiedades de la org
org:properties:delete_own      → Eliminar propiedades propias
org:properties:delete_all      → Eliminar cualquier propiedad de la org

# Leads
org:leads:create               → Crear leads
org:leads:read_own             → Ver leads propios
org:leads:read_all             → Ver TODOS los leads de la org
org:leads:edit_own             → Editar leads propios
org:leads:edit_all             → Editar cualquier lead de la org
org:leads:delete_own           → Eliminar leads propios
org:leads:delete_all           → Eliminar cualquier lead de la org
org:leads:assign               → Reasignar leads a otros agentes

# Analytics
org:analytics:read_own         → Ver analytics propios
org:analytics:read_all         → Ver analytics de toda la org

# Bot
org:bot:read                   → Ver actividad del bot
org:bot:configure              → Configurar el bot

# Equipo
org:members:read               → Ver lista de miembros
org:members:manage             → Invitar/remover miembros

# Settings
org:settings:read              → Ver settings de la org
org:settings:manage            → Cambiar settings de la org

# Billing
org:billing:manage             → Gestionar plan y billing
```

### Matriz de permisos por rol

| Permiso | Owner | Admin | Agent |
|---------|:-----:|:-----:|:-----:|
| **Propiedades** | | | |
| `org:properties:create` | ✓ | ✓ | ✓ |
| `org:properties:read_own` | ✓ | ✓ | ✓ |
| `org:properties:read_all` | ✓ | ✓ | ✓ (solo lectura) |
| `org:properties:edit_own` | ✓ | ✓ | ✓ |
| `org:properties:edit_all` | ✓ | ✓ | ✗ |
| `org:properties:delete_own` | ✓ | ✓ | ✓ |
| `org:properties:delete_all` | ✓ | ✓ | ✗ |
| **Leads** | | | |
| `org:leads:create` | ✓ | ✓ | ✓ |
| `org:leads:read_own` | ✓ | ✓ | ✓ |
| `org:leads:read_all` | ✓ | ✓ | ✓ (solo lectura) |
| `org:leads:edit_own` | ✓ | ✓ | ✓ |
| `org:leads:edit_all` | ✓ | ✓ | ✗ |
| `org:leads:delete_own` | ✓ | ✓ | ✗ |
| `org:leads:delete_all` | ✓ | ✓ | ✗ |
| `org:leads:assign` | ✓ | ✓ | ✗ |
| **Analytics** | | | |
| `org:analytics:read_own` | ✓ | ✓ | ✓ |
| `org:analytics:read_all` | ✓ | ✓ | ✗ |
| **Bot** | | | |
| `org:bot:read` | ✓ | ✓ | ✓ |
| `org:bot:configure` | ✓ | ✓ | ✗ |
| **Equipo** | | | |
| `org:members:read` | ✓ | ✓ | ✗ |
| `org:members:manage` | ✓ | ✓ | ✗ |
| **Settings** | | | |
| `org:settings:read` | ✓ | ✓ | ✓ |
| `org:settings:manage` | ✓ | ✓ | ✗ |
| **Billing** | | | |
| `org:billing:manage` | ✓ | ✗ | ✗ |

---

## 6. Visibilidad entre agentes (dentro de una agencia)

**Modelo elegido: visible pero no editable.**

Un `agent` dentro de una agencia Enterprise **puede ver** las propiedades y leads de otros agentes de la misma org, pero **no puede editarlos ni eliminarlos**.

### Razones

- En inmobiliaria es común que un agente necesite mostrar una propiedad de un colega a un cliente.
- Facilita la colaboración sin comprometer la integridad de los datos.
- Si un agente renuncia, el owner/admin puede reasignar sus leads sin fricción.
- Los CRMs inmobiliarios del mercado (Tokko, Inmuebles24 Pro, etc.) usan este modelo.

### Cómo se implementa en RLS

```sql
-- Ejemplo: policy para SELECT en properties
CREATE POLICY "properties_select" ON properties
FOR SELECT USING (
  -- Siempre dentro de la misma org
  organization_id = (auth.jwt() ->> 'org_id')
);

-- Ejemplo: policy para UPDATE en properties
CREATE POLICY "properties_update" ON properties
FOR UPDATE USING (
  organization_id = (auth.jwt() ->> 'org_id')
  AND (
    -- Owner/Admin pueden editar cualquiera
    role IN ('owner', 'admin') -- verificado via Better Auth session
    OR
    -- Agent solo puede editar las suyas
    (created_by_user_id = (auth.jwt() ->> 'sub')
     OR assigned_to_user_id = (auth.jwt() ->> 'sub'))
  )
);
```

---

## 7. Datos del usuario vs datos de la org

### Datos de la org (tienen `organization_id`)

Todas las entidades de dominio:
- `properties`, `property_media`
- `leads`, `lead_property_queue`
- `appointments`
- `bot_conversations`, `bot_messages`, `bot_config`
- `analytics_events`
- `ai_contents`

Settings de la - `organization_settings` (comisiones, moneda, configuración del bot, etc.)

### Datos del usuario (tienen `user_id`, sin `organization_id`)

Preferencias personales que siguen al usuario independientemente de la - `user_preferences` (tema claro/oscuro, idioma, timezone)
- `notification_preferences` (qué notificaciones recibe y por qué canal)
- `user_profiles` (nombre, avatar, bio, redes sociales, contacto)

---

## 8. Qué ve cada usuario en la UI

### Agente individual (Free/Pro, org de 1 miembro)

| Elemento UI | Visible | Notas |
|------------|---------|-------|
| Sidebar completo | ✓ | Todas las secciones estándar |
| Org Switcher | Oculto | Solo tiene 1 org (a menos que pertenezca a otras) |
| Sección "Equipo" | Oculto | No aplica, es solo 1 persona |
| Tab "Miembros" en settings | Oculto | No aplica |
| Billing en settings | ✓ | Para upgrade de plan |
| Analytics | ✓ | Solo sus datos (que son todos los de la org) |

### Owner/Admin de agencia (Enterprise)

| Elemento UI | Visible | Notas |
|------------|---------|-------|
| Sidebar completo | ✓ | Todas las secciones + "Equipo" |
| Org Switcher | ✓ | Si pertenece a múltiples orgs |
| Sección "Equipo" | ✓ | Invitar, gestionar, ver miembros |
| Tab "Miembros" en settings | ✓ | Gestión de roles y permisos |
| Billing en settings | ✓ (owner) / Oculto (admin) | Solo owner gestiona billing |
| Analytics | ✓ | Vista global de toda la agencia + filtro por agente |

### Agent dentro de agencia (Enterprise)

| Elemento UI | Visible | Notas |
|------------|---------|-------|
| Sidebar estándar | ✓ | Sin "Equipo" ni "Miembros" |
| Org Switcher | ✓ | Para cambiar entre su org personal y la agencia |
| Sección "Equipo" | Oculto | No tiene permiso |
| Tab "Miembros" en settings | Oculto | No tiene permiso |
| Billing en settings | Oculto | No tiene permiso |
| Analytics | ✓ | Solo sus datos propios |
| Propiedades de otros | ✓ (lectura) | Puede ver pero no editar |
| Leads de otros | ✓ (lectura) | Puede ver pero no editar |

---

## 9. Flujo de onboarding

### Paso 1: Signup

El usuario se registra con email/password o Google OAuth.

### Paso 2: Pregunta inicial

> **¿Cómo vas a usar Black Estate?**
>
> - 🏠 **Soy agente independiente** — Gestiono mis propiedades y leads por mi cuenta.
> - 🏢 **Tengo una agencia** — Quiero gestionar un equipo de agentes.

Esta pregunta **no cambia la arquitectura** (ambos crean una org). Solo afecta:
- El onboarding UX (individual → "cargá tu primera propiedad"; agencia → "invitá a tu primer agente").
- Metadata de la org (`organizations.type = 'individual' | 'agency'`) para analytics internos.
- Si elige agencia, se le muestra pricing de Enterprise inmediatamente.

### Paso 3: Better Auth auto-crea org

Invisible para el usuario. Un hook `afterCreate` en Better Auth crea la org y asigna rol `owner`.

### Paso 4: Onboarding contextual

- **Individual:** Completar perfil → cargar primera propiedad → configurar bot.
- **Agencia:** Completar perfil de empresa → invitar primer agente → cargar primera propiedad.
