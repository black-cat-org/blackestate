# Sub-plan — Refactor `lead → contact + inquiry`

**Fecha:** 2026-05-13
**Branch:** `feat/contact-inquiry-refactor`
**Bloqueante de:** `docs/plans/2026-05-13-property-transfers.md`
**Estado actual:** Schema mono-tabla `leads` mezcla identidad (persona) con oportunidad (interés en una prop). Refactor a modelo CRM industria-standard (Contact ↔ Inquiry).

---

## 1. Motivación

Hoy una persona interesada en 3 propiedades = 3 filas `leads` duplicadas con mismo `name + phone + email` y `property_id` distinto. Eso rompe:

- **Identidad del contacto**: no hay forma de saber "todas las inquiries de Carlos" sin agrupar por phone/email a mano.
- **Transferencia de propiedades**: cascadear `leads` cuando transferís una prop arrastra contactos que querés conservar.
- **Analytics y reporting**: "contactos únicos del mes" requiere DISTINCT por (phone, email), frágil.
- **Bot conversacional**: una conversación bot es con un contacto (persona), no con un "interés en prop". Hoy `bot_conversations.lead_id` apunta a un par persona-prop arbitrario.
- **Marketing y nurturing**: campañas a "leads únicos" duplican mensajes si el contacto figura en 3 props.

El modelo estándar (HubSpot, Salesforce Propertybase, AlterEstate) separa:

- **Contact** = la persona física (entidad de identidad). Único por `(org_id, phone, email)`.
- **Inquiry** = el interés concreto en una propiedad (Contact ↔ Property con metadata: status, source, message). Un Contact puede tener N Inquiries.

---

## 2. Modelo target

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   contact    │ 1─────N │   inquiry    │ N─────1 │   property   │
│              │         │              │         │              │
│ id           │         │ contact_id ──┤         │ id           │
│ org_id       │         │ property_id ─┤         │ org_id       │
│ name         │         │ org_id       │         │ ...          │
│ phone        │         │ status       │         └──────────────┘
│ email        │         │ source       │
│ tags         │         │ message      │
│ ...          │         │ created_by   │
│ created_by   │         │ ...          │
└──────────────┘         └──────────────┘
       │                        │
       │                        │
       │                  ┌─────┴─────────┐
       │                  │  appointment  │ (lead_id → contact_id; conserva property_id)
       │                  └───────────────┘
       │
       ├──────── contact_property_queue (lead_property_queue renombrada)
       │
       └──────── bot_conversation (lead_id → contact_id)
```

### 2.1 Tabla `contact` (NUEVA)

| Columna | Tipo | NOT NULL | Notas |
|---|---|---|---|
| `id` | `text` PK | ✅ | UUID via `$defaultFn` |
| `organization_id` | `uuid` | ✅ | tenancy |
| `created_by_user_id` | `uuid` | ✅ | agente que capturó el contacto |
| `name` | `text` | ✅ | |
| `phone` | `text` | ❌ | normalizado E.164 cuando exista |
| `email` | `text` | ❌ | `lower()` |
| `notes` | `text` | ❌ | observaciones genéricas |
| `tags` | `text[]` | ✅ default `'{}'` | etiquetas libres |
| `preferred_channel` | `text` | ❌ | "whatsapp"/"phone"/"email" — futuro |
| `created_at` | `timestamptz` | ✅ | |
| `updated_at` | `timestamptz` | ✅ | `$onUpdate` |
| `deleted_at` | `timestamptz` | ❌ | soft delete |
| `deleted_by_user_id/name/email` | `uuid/text/text` | ❌ | audit (mirror pattern) |

**Índices:**
- `contact_org_id_idx` ON `(organization_id)`
- `contact_org_phone_idx` ON `(organization_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL` — dedup lookup
- `contact_org_email_idx` ON `(organization_id, lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL` — dedup lookup
- `contact_org_created_by_idx` ON `(organization_id, created_by_user_id)` — agent ownership
- `contact_active_org_idx` ON `(organization_id) WHERE deleted_at IS NULL` — hot path

**Unicidad lógica (no constraint):** un contacto por `(org, phone)` y por `(org, email)`. **Por qué no UNIQUE constraint:** phone/email pueden ser NULL (no todos los leads tienen ambos), pueden cambiar (persona cambia de número), y la deduplicación es responsabilidad del use case (búsqueda fuzzy + confirmación humana), no del schema. La pareja `(org, phone, email)` igual puede repetirse legítimamente cuando dos personas comparten un teléfono familiar — el constraint bloquearía casos válidos.

### 2.2 Tabla `inquiry` (rename desde `leads`, slimmed-down)

| Columna | Tipo | NOT NULL | Notas |
|---|---|---|---|
| `id` | `text` PK | ✅ | preserva IDs viejos en migración |
| `organization_id` | `uuid` | ✅ | tenancy |
| `created_by_user_id` | `uuid` | ✅ | agente que capturó la inquiry |
| `contact_id` | `text` FK → `contact.id` | ✅ | **NUEVO** |
| `property_id` | `text` FK → `properties.id` | ✅ | conservado |
| `source` | `lead_source_enum` | ❌ | conservado (renombrar enum a `inquiry_source_enum` en fase 2) |
| `status` | `lead_status_enum` | ✅ default `'new'` | conservado (renombrar enum en fase 2) |
| `message` | `text` | ❌ | conservado |
| `property_type_sought` | `text` | ❌ | conservado (preferencias específicas de esta inquiry, no del contact) |
| `budget` | `text` | ❌ | conservado |
| `zone_of_interest` | `text` | ❌ | conservado |
| `wants_offers` | `boolean` | ✅ default false | conservado |
| `created_at/updated_at/deleted_at + audit cols` | | | conservados |

**Lo que se mueve fuera (van a `contact`):** `name`, `phone`, `email`. Esas son propiedades de la persona, no del interés.

**Constraint nuevo:** `UNIQUE(organization_id, contact_id, property_id) WHERE deleted_at IS NULL` — un contact tiene a lo sumo una inquiry activa por propiedad. Si pregunta dos veces por la misma prop, se reactiva la inquiry existente (status vuelve a `new`/`contacted`).

**Índices:**
- `inquiry_org_id_idx`
- `inquiry_property_id_idx` (existe como `leads_property_id_idx`)
- `inquiry_contact_id_idx` — NUEVO, hot path para "todas las inquiries de Carlos"
- `inquiry_org_status_idx` (existe)
- `inquiry_org_created_by_idx` (existe)
- `inquiry_active_org_idx ON (organization_id) WHERE deleted_at IS NULL` (existe como `leads_active_org_idx`)

### 2.3 Cambios en tablas dependientes

| Tabla actual | Cambio |
|---|---|
| `appointments` | `lead_id` → `contact_id` (FK → contact). Conserva `property_id`. Una cita es "este contacto visita esta prop". No requiere inquiry. |
| `lead_property_queue` | Rename a `contact_property_queue`. `lead_id` → `contact_id` (FK → contact). Conserva `property_id`. La cola de props sugeridas pertenece al contact, no a una inquiry específica. |
| `bot_conversations` | `lead_id` → `contact_id` (FK → contact). El bot conversa con una persona; los mensajes pueden referenciar varias props vía el contenido. |
| `bot_messages` | (no cambia — sigue ligado a `bot_conversations.id`). |
| `ai_contents` | NO cambia — `property_id` apunta a prop. Los contenidos AI son assets de la propiedad, no del contacto. |
| `analytics_events` | `metadata.leadId` legacy → `metadata.contactId` + `metadata.inquiryId` cuando aplique. Eventos viejos quedan con `leadId` (no se rewrites el historial). El service de analytics maneja ambos por compatibilidad de lectura hacia atrás. |
| `property_transfers` | NO cambia. Los counts cascade ahora se refieren a inquiries (no contacts). Renombramos `leadsCount` → `inquiriesCount` en schema. |

### 2.4 RLS policies a actualizar

Las policies de `leads` (`drizzle/sql/006`) se replican para:

- `contact` — mismas reglas (org isolation + soft delete + papelera role-aware + super admin para SELECT; INSERT/UPDATE per role).
- `inquiry` — mismas reglas (clone de las de leads).
- `appointments`, `contact_property_queue`, `bot_conversations` — policies existentes siguen valiendo (la columna `lead_id` se renombra a `contact_id` sin cambiar la semántica de "pertenece a la org y al agente").

Migración SQL nueva: `drizzle/sql/026_contact_inquiry_refactor.sql` con todas las DDL + RLS.

---

## 3. Mapping de datos (lead → contact + inquiry)

Algoritmo de migración determinístico, idempotente, ejecutable en una sola transacción Postgres.

### 3.1 Paso 1 — agrupar leads por persona

Para cada `org_id`:

```sql
-- "Persona" = misma normalización de phone Y mismo email (case-insensitive).
-- Si phone es NULL pero email coincide → misma persona.
-- Si email es NULL pero phone coincide → misma persona.
-- Si ambos NULL → cada lead es su propia persona (no se agrupa).
WITH normalized AS (
  SELECT
    l.id AS lead_id,
    l.organization_id,
    l.created_by_user_id,
    l.name,
    NULLIF(regexp_replace(coalesce(l.phone, ''), '[^0-9+]', '', 'g'), '') AS phone_norm,
    NULLIF(lower(trim(coalesce(l.email, ''))), '') AS email_norm,
    l.created_at
  FROM public.leads l
  WHERE l.deleted_at IS NULL
),
keyed AS (
  SELECT
    *,
    -- Clave de agrupación: prefer phone, fallback email, fallback unique per row
    coalesce(phone_norm, email_norm, lead_id) AS group_key
  FROM normalized
)
SELECT
  organization_id,
  group_key,
  array_agg(lead_id ORDER BY created_at) AS lead_ids,
  -- Earliest creator wins ownership of the contact
  (array_agg(created_by_user_id ORDER BY created_at))[1] AS earliest_creator,
  -- Most recent non-null name wins display
  (array_agg(name) FILTER (WHERE name IS NOT NULL) ORDER BY created_at DESC)[1] AS display_name,
  (array_agg(phone_norm) FILTER (WHERE phone_norm IS NOT NULL))[1] AS phone,
  (array_agg(email_norm) FILTER (WHERE email_norm IS NOT NULL))[1] AS email,
  min(created_at) AS contact_created_at
FROM keyed
GROUP BY organization_id, group_key;
```

### 3.2 Paso 2 — crear contacts

Por cada grupo del Paso 1 → un `INSERT INTO public.contact(...)`. Generar UUID nuevo para `contact.id`. Mantener mapping interno (CTE temporal o tabla `_migration_lead_to_contact(lead_id, contact_id)`) para el Paso 3.

### 3.3 Paso 3 — crear inquiries (rename leads)

```sql
-- Crear tabla inquiry, copiar leads moviendo `name/phone/email` a contact y enlazando contact_id.
INSERT INTO public.inquiry(
  id, organization_id, created_by_user_id, contact_id, property_id,
  source, status, message, property_type_sought, budget, zone_of_interest,
  wants_offers, created_at, updated_at, deleted_at, deleted_by_user_id,
  deleted_by_user_name, deleted_by_user_email
)
SELECT
  l.id, l.organization_id, l.created_by_user_id, m.contact_id, l.property_id,
  l.source, l.status, l.message, l.property_type_sought, l.budget, l.zone_of_interest,
  l.wants_offers, l.created_at, l.updated_at, l.deleted_at, l.deleted_by_user_id,
  l.deleted_by_user_name, l.deleted_by_user_email
FROM public.leads l
JOIN _migration_lead_to_contact m ON m.lead_id = l.id;
```

**Conservar `inquiry.id = leads.id`** para que las FK existentes (`appointments.lead_id`, `lead_property_queue.lead_id`, `bot_conversations.lead_id`) sigan apuntando al mismo `text` ID que ahora vive en `inquiry`. Esto evita re-mapping de FKs en el mismo paso.

### 3.4 Paso 4 — switch de FKs a `contact_id`

Las tablas dependientes (`appointments`, `*_queue`, `bot_conversations`) hoy referencian `leads.id`. Después del Paso 3, sus FKs deberían apuntar a `contact.id` (no a `inquiry.id`). Migración por tabla:

```sql
-- appointments: agregar contact_id, poblarlo, drop FK vieja, drop lead_id, rename.
ALTER TABLE public.appointments ADD COLUMN contact_id text;

UPDATE public.appointments a
SET contact_id = i.contact_id
FROM public.inquiry i
WHERE a.lead_id = i.id;

ALTER TABLE public.appointments
  ALTER COLUMN contact_id SET NOT NULL,
  ADD CONSTRAINT appointments_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES public.contact(id),
  DROP CONSTRAINT appointments_lead_id_fkey,
  DROP COLUMN lead_id;
```

Mismo patrón para `lead_property_queue` → `contact_property_queue` (incluye RENAME TABLE) y `bot_conversations`.

### 3.5 Paso 5 — drop `leads`

Una vez `inquiry` poblada y FKs migradas, drop legacy:

```sql
DROP TABLE public.leads;
```

⚠️ **Solo después de validar manual que `inquiry` tiene exactamente `count(leads)` rows y no hay FK dangling.**

### 3.6 Paso 6 — drop tabla auxiliar

```sql
DROP TABLE _migration_lead_to_contact;
```

### 3.7 Idempotencia de la migración

La migración corre en una sola transacción Postgres. Si falla cualquier paso → ROLLBACK total. No hay "estado intermedio". Para correrla en dev primero, en staging después, en prod al final. **Backup obligatorio antes de prod.**

---

## 4. Arquitectura — módulos `features/contacts` + `features/inquiries`

Reemplaza `features/leads/` (entera).

### 4.1 `features/contacts/`

```
features/contacts/
  domain/
    contact.entity.ts              # Contact + DTOs
    contact.repository.ts          # IContactRepository
  application/
    create-contact.use-case.ts     # Crear con dedup check
    find-or-create-contact.use-case.ts  # Búsqueda por phone/email + crear si no existe
    get-contacts.use-case.ts
    get-contact-by-id.use-case.ts
    get-contact-by-phone-or-email.use-case.ts
    update-contact.use-case.ts
    delete-contact.use-case.ts
    restore-contact.use-case.ts
    search-contacts.use-case.ts    # Para autocomplete en form de inquiry
  infrastructure/
    contact.model.ts
    contact.mapper.ts
    drizzle-contact.repository.ts
  presentation/
    actions.ts
    components/                    # Lista, detalle, dialog, etc.
```

### 4.2 `features/inquiries/`

```
features/inquiries/
  domain/
    inquiry.entity.ts              # Inquiry + DTOs
    inquiry.repository.ts          # IInquiryRepository (CRUD + queue + visits)
  application/
    create-inquiry.use-case.ts     # Orquesta findOrCreateContact + inquiry insert
    get-inquiries.use-case.ts
    get-inquiry-by-id.use-case.ts
    get-inquiries-by-contact.use-case.ts
    get-inquiries-by-property.use-case.ts
    update-inquiry.use-case.ts
    delete-inquiry.use-case.ts
    manage-queue.use-case.ts       # Mantiene cola (renombrar variables)
    track-visit.use-case.ts
    get-suggested-properties.use-case.ts
  infrastructure/
    inquiry.model.ts
    inquiry.mapper.ts
    drizzle-inquiry.repository.ts
  presentation/
    actions.ts
    public-actions.ts              # Form público de inquiry desde landing
    components/
```

### 4.3 Entity Domain — diseño

```ts
// features/contacts/domain/contact.entity.ts
export interface Contact {
  id: string
  name: string
  phone?: string
  email?: string
  notes?: string
  tags: string[]
  preferredChannel?: "whatsapp" | "phone" | "email"
  createdAt: string
  updatedAt: string
  deletedAt?: string
  deletedBy?: { userId?: string; userName?: string; userEmail?: string }
  createdByUserId: string
  // Derived/joined:
  activeInquiriesCount?: number
  lastInquiryAt?: string
}

export interface CreateContactDTO {
  name: string
  phone?: string
  email?: string
  notes?: string
  tags?: string[]
  preferredChannel?: Contact["preferredChannel"]
}
```

```ts
// features/inquiries/domain/inquiry.entity.ts
export type InquiryStatus = "new" | "contacted" | "interested" | "won" | "lost" | "discarded"
export type InquirySource = "facebook" | "instagram" | "whatsapp" | "tiktok" | "google" | "referral" | "direct"

export interface Inquiry {
  id: string
  contactId: string
  propertyId: string
  propertyTitle?: string         // join
  contactName?: string           // join
  contactPhone?: string          // join
  contactEmail?: string          // join
  status: InquiryStatus
  source?: InquirySource
  message?: string
  propertyTypeSought?: string
  budget?: string
  zoneOfInterest?: string
  wantsOffers: boolean
  createdAt: string
  // ...
}

export interface CreateInquiryDTO {
  // Either contactId (existing) OR contactDraft (create new)
  contactId?: string
  contactDraft?: CreateContactDTO
  propertyId: string
  source?: InquirySource
  message?: string
  // ...
}
```

### 4.4 Use case clave — `createInquiryUseCase`

```ts
export async function createInquiryUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  inquiryRepo: IInquiryRepository,
  data: CreateInquiryDTO,
): Promise<Inquiry> {
  // Resolve contact: existing or create new
  let contactId = data.contactId
  if (!contactId) {
    if (!data.contactDraft) {
      throw new Error("Either contactId or contactDraft must be provided")
    }
    // Find-or-create: dedup by phone or email before inserting
    const existing = await contactRepo.findByPhoneOrEmail(
      ctx,
      data.contactDraft.phone,
      data.contactDraft.email,
    )
    contactId = existing ? existing.id : (await contactRepo.create(ctx, data.contactDraft)).id
  }

  // Check unique constraint: contact+property+org+active
  const existingInquiry = await inquiryRepo.findActiveByContactAndProperty(ctx, contactId, data.propertyId)
  if (existingInquiry) {
    // Reactivate instead of duplicating
    return inquiryRepo.update(ctx, existingInquiry.id, { status: "new" })
  }

  return inquiryRepo.create(ctx, { ...data, contactId })
}
```

### 4.5 UX — form de inquiry con autocomplete

El form de "crear inquiry" cambia su flujo:

```
┌─────────────────────────────────────────┐
│ Nueva consulta sobre Casa A             │
├─────────────────────────────────────────┤
│ Contacto:                               │
│  ○ Buscar contacto existente            │
│    [autocomplete por nombre/teléfono]   │
│  ○ Crear contacto nuevo                 │
│    Nombre: ___________________          │
│    Teléfono: _________________          │
│    Email: ____________________          │
│                                         │
│ Detalles de esta consulta:              │
│  Origen: [dropdown]                     │
│  Presupuesto: ________________          │
│  Mensaje: ____________________          │
│                                         │
│              [Cancelar] [Crear]         │
└─────────────────────────────────────────┘
```

Al escribir en autocomplete, llama `searchContactsAction(query)` con debounce 300ms. Si encuentra match → preselecciona el contact. Si el usuario teclea phone/email que coincide con un contact existente → toast: "Este contacto ya existe (Carlos López). ¿Asociar a esta consulta?".

---

## 5. RLS policies — drizzle/sql/026

Mirrors policies de `leads` actuales sobre `contact` + `inquiry`. Ya enumeradas en §2.4.

**Cambio de FK en policies existentes:** policies de `appointments`, `bot_conversations`, `contact_property_queue` siguen vigentes — la columna se renombra pero la lógica RLS sigue siendo "org + agent ownership".

---

## 6. UI — cambios visibles

### 6.1 Sidebar

- Ítem actual "Contactos" (que apunta hoy a `leads`) ahora apunta a **`/dashboard/contacts`** — listado de contacts.
- Ítem nuevo o sub-link "Consultas" (`/dashboard/inquiries`) — listado de inquiries con filtros por propiedad.

### 6.2 Página `/dashboard/contacts/[id]`

Detalle del contact muestra:
- Datos personales (nombre, phone, email, tags, notes).
- **Sección "Consultas activas"** — lista de inquiries con su prop, status, fecha.
- **Sección "Citas agendadas"** — lista de appointments (todos, sobre todas las props).
- **Sección "Historial de bot"** — conversaciones bot con este contacto.
- Acciones: editar, eliminar, agregar nueva consulta.

### 6.3 Página `/dashboard/inquiries/[id]`

Detalle de inquiry muestra:
- Link al contact (header con nombre + teléfono + email).
- Link a la prop.
- Status, source, mensaje, presupuesto, etc.
- Acciones específicas: cambiar status, agendar cita, marcar won/lost.

### 6.4 Form de inquiry pública (landing → form)

Endpoint público (que hoy crea un `lead`) ahora:
- Llama `createPublicInquiryAction` (rate-limited).
- Bajo el capó: `findOrCreateContact` (dedup) + `createInquiry`.

---

## 7. Plan de tests

### 7.1 Migración de datos

| # | Test | Esperado |
|---|---|---|
| MIG1 | Count post-migración: `count(contact) ≤ count(leads pre-mig)` | ✅ (dedup reduce o iguala) |
| MIG2 | Count post-migración: `count(inquiry) == count(leads pre-mig)` | ✅ (1:1 leads → inquiries) |
| MIG3 | Lead con phone "+591 7xxx" y otro con "591-7xxx" en misma org → 1 contact, 2 inquiries | ✅ |
| MIG4 | Lead sin phone ni email → su propio contact (no se agrupa) | ✅ |
| MIG5 | Lead con email duplicado cross-org → contacts distintos (tenancy isolation) | ✅ |
| MIG6 | FK integrity post-migración: 0 `appointments` con `contact_id` dangling | ✅ |
| MIG7 | Mismo para `contact_property_queue` y `bot_conversations` | ✅ |
| MIG8 | Soft-deleted leads → soft-deleted inquiries; contacts NO soft-deleted automáticamente | ✅ |

### 7.2 Type / lint / build

| Test | Comando | Esperado |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 errors |
| ESLint | `npm run lint` | 0 errors / 0 warnings |
| Build | `npm run build` | success |

### 7.3 Playwright smoke

| # | Test | Esperado |
|---|---|---|
| T1 | Crear inquiry para contact existente (autocomplete) | Reutiliza contact, crea inquiry nueva |
| T2 | Crear inquiry con contact draft cuyo phone ya existe en otra inquiry | Dedup: misma contact, 2 inquiries |
| T3 | Crear inquiry para contact con misma prop ya tiene inquiry activa | Reactiva la inquiry existente (no duplica) |
| T4 | Borrar contact (soft) → sus inquiries activas se ven en papelera | Cascade soft-delete vía use case |
| T5 | Restaurar contact → inquiries siguen soft-deleted (no auto-restore) | Restore explícito por inquiry |
| T6 | Detalle de contact muestra inquiries + appointments + bot conv | Joins resuelven |
| T7 | RLS cross-org: user de Org-B no ve contacts/inquiries de Org-A | Filtrado RLS |
| T8 | Agent solo edita inquiries propias (`created_by_user_id = sub`) | RLS UPDATE policy |
| T9 | Búsqueda autocomplete por phone parcial | Devuelve top 5 con score |
| T10 | Form público de inquiry desde landing crea contact + inquiry | End-to-end |
| T11 | Bot conversation existing → migrated → sigue funcional con `contact_id` | Smoke |
| T12 | Analytics dashboard sigue mostrando counts correctos | Metadata legacy tolerated |

### 7.4 Verificación DB

```sql
-- Sin contacts huérfanos (sin ninguna inquiry, appointment, queue, conv)?
-- Es válido que existan (capturados sin oportunidad concreta aún).
SELECT count(*) FROM contact WHERE NOT EXISTS (
  SELECT 1 FROM inquiry WHERE contact_id = contact.id
  UNION ALL SELECT 1 FROM appointments WHERE contact_id = contact.id
  UNION ALL SELECT 1 FROM contact_property_queue WHERE contact_id = contact.id
  UNION ALL SELECT 1 FROM bot_conversations WHERE contact_id = contact.id
);

-- Sin inquiries dangling
SELECT count(*) FROM inquiry i
WHERE NOT EXISTS (SELECT 1 FROM contact c WHERE c.id = i.contact_id);
```

---

## 8. Edge cases

| # | Caso | Comportamiento |
|---|---|---|
| EC1 | Phone normalizado idéntico pero email distinto → ¿misma persona? | **SÍ** (phone wins). Mientras coincida phone, es la misma persona. El email distinto se preserva en el contact recién creado eligiendo el más reciente. Trade-off: si en realidad son 2 personas que comparten teléfono familiar, el agente puede separarlas manualmente después. Conservador en favor de "menos duplicados". |
| EC2 | Email idéntico pero phones distintos → ¿misma persona? | **SÍ** (fallback cuando phone es NULL en uno de los lados). Mismo trade-off. |
| EC3 | Ambos NULL (lead sólo con name) → ¿se agrupa por name? | **NO**. Cada lead = su propio contact. Names duplicados ("Juan Perez") son tan ambiguos que mergearlos garantiza falsos positivos. Se queda como contact aislado. |
| EC4 | Lead borrado (soft) en migración | Inquiry se crea soft-deleted. Contact NO se borra (sus otras inquiries pueden estar activas). |
| EC5 | Lead con `name = NULL` o vacío | Contact se crea con name = "Sin nombre" o el phone/email como display. Agente lo edita luego. |
| EC6 | Same person reinvitada en multiple orgs | Contacts distintos por tenancy. NO se cruza identidad cross-org (privacy). |
| EC7 | Reactivación de inquiry: contact ya tiene inquiry "won" en prop X y vuelve a preguntar | Use case decide: si la última inquiry está "won"/"lost"/"discarded" → permitir crear nueva inquiry (el deal se cerró, vuelve interés). Si está "new"/"contacted"/"interested" → reactivar status, no duplicar. |
| EC8 | Cambiar phone/email de contact existente | Update del contact. Las inquiries no se ven afectadas (siguen con su contact_id). Display en inquiries refleja el contact actualizado vía join. |
| EC9 | Merge manual de contacts (Carlos López y Carlos L. son la misma persona) | UI futura ⏭️ (no v1). Por ahora: edit manual + reassign manual de inquiries. Operación administrativa. |
| EC10 | Borrar contact con appointments futuros agendados | Hard error: "Tiene citas activas. Cancela primero". |
| EC11 | Borrar contact sin actividad | Soft delete. Sus inquiries quedan visibles en papelera. |
| EC12 | Restaurar contact | Sus inquiries siguen soft-deleted; restore separado por inquiry. |
| EC13 | Public form: spam con phones/emails inexistentes | Rate limit por IP. Validación phone/email format. Heurística: si phone+email son ambos vacíos → rechazar. |

---

## 9. Tareas (checkboxes)

Orden interno por tarea: `implementar → code review → fixes → tests → confirmación → docs → commit`.

### Fase 1 — Infra (schema + RLS + migración)

- [ ] **R1** — Drizzle schema: `lib/db/schema/contact.ts` + `lib/db/schema/inquiry.ts`. Renombrar `lib/db/schema/leads.ts` (se borra al final). Renombrar `lead-property-queue.ts` → `contact-property-queue.ts`.
- [ ] **R2** — Schema: actualizar `appointments.ts` (`lead_id` → `contact_id`), `bot-conversations.ts` (igual).
- [ ] **R3** — Migración SQL `drizzle/sql/026_contact_inquiry_refactor.sql` con DDL completa + algoritmo de mapping (§3) + RLS (§5). Idempotente, transaccional, con rollback si falla.
- [ ] **R4** — Aplicar migración en Supabase dev. Validar contadores §7.1. Backup explícito antes de ejecutar.
- [ ] **R5** — Rename enums `lead_status_enum` → `inquiry_status_enum` y `lead_source_enum` → `inquiry_source_enum` (`ALTER TYPE RENAME`). Actualizar referencias en TS.

### Fase 2 — Módulo `contacts`

- [ ] **R6** — Domain: `contact.entity.ts` + `contact.repository.ts`.
- [ ] **R7** — Infrastructure: model + mapper + drizzle repo con `findByPhoneOrEmail`, `searchByQuery`.
- [ ] **R8** — Use cases (8): create, find-or-create, get-list, get-by-id, get-by-phone-or-email, update, delete, restore, search.
- [ ] **R9** — Server Actions + components base (lista, detalle, dialog crear/editar).

### Fase 3 — Módulo `inquiries`

- [ ] **R10** — Domain: `inquiry.entity.ts` + `inquiry.repository.ts`.
- [ ] **R11** — Infrastructure: model + mapper (join contact + property para display) + drizzle repo.
- [ ] **R12** — Use cases (9): create (orquesta find-or-create contact), get-list, get-by-id, get-by-contact, get-by-property, update, delete, manage-queue, track-visit, get-suggested-properties.
- [ ] **R13** — Server Actions + components (lista, detalle, dialog crear con autocomplete contact).
- [ ] **R14** — Public actions: `public-actions.ts` para form público de inquiry.

### Fase 4 — Migración de módulos dependientes

- [ ] **R15** — `features/appointments`: cambiar `lead_id` → `contact_id` en entity, mapper, repo, use cases, UI. Joins ahora a `contact`.
- [ ] **R16** — `features/bot`: `bot_conversations.lead_id` → `contact_id`. Actualizar entity, repo, use cases.
- [ ] **R17** — `features/analytics`: payloads de eventos nuevos usan `contactId` + `inquiryId`. Service de lectura tolera ambos (`metadata.leadId` legacy o `metadata.contactId`+`inquiryId`).
- [ ] **R18** — `features/dashboard`: aggregations actualizadas (contactos únicos, inquiries activas).
- [ ] **R19** — `features/ai-contents`: sin cambios (no toca leads).

### Fase 5 — UI

- [ ] **R20** — Sidebar: ítem "Contactos" apunta a `/dashboard/contacts`. Sub-ítem "Consultas" → `/dashboard/inquiries`. Renombrar copy actual "Contactos" si confunde.
- [ ] **R21** — Página `/dashboard/contacts` (lista) + `/dashboard/contacts/[id]` (detalle).
- [ ] **R22** — Página `/dashboard/inquiries` (lista con filtros) + `/dashboard/inquiries/[id]` (detalle).
- [ ] **R23** — Form de crear inquiry con autocomplete contact (existing-or-new).
- [ ] **R24** — Form público (landing) sigue funcionando — apunta a `createPublicInquiryAction`.
- [ ] **R25** — Eliminar páginas/components viejos de `features/leads`. Borrar dir.

### Fase 6 — Cleanup + tests + docs

- [ ] **R26** — Eliminar `features/leads/` entera. Eliminar `lib/db/schema/leads.ts`.
- [ ] **R27** — DROP TABLE `public.leads` en Supabase dev (después de validar migración).
- [ ] **R28** — Smoke Playwright completo §7.3. Tabla de resultados obligatoria.
- [ ] **R29** — Actualizar `docs/implementation-plan.md` con el refactor (sección nueva o reemplazo de referencias a `leads`).
- [ ] **R30** — Actualizar `CLAUDE.md`: sección "Tenancy & Auth Model" + "Project Structure" + entity examples. Cualquier mención a `leads` se actualiza.
- [ ] **R31** — Commits atómicos por fase (1 por R1-R30 grupo coherente; no 30 commits).

---

## 10. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migración pierde data por bug de mapping | Baja | Crítico | Backup pre-migración. Migración transaccional (rollback total si falla). Conteos pre/post validados en §7.1. Correr en dev → staging → prod. |
| Dedup agresivo merge personas distintas con phone compartido | Media | Medio | UI futura para "split contact". Por ahora aceptamos riesgo (más raro que el dolor de duplicados actuales). |
| Refactor toca demasiados módulos a la vez → rama de larga vida | Alta | Medio | Fasear en R1-R31. Cada fase es PR/commit propio. Cada fase deja la app funcional (los reads tolerantes a ambos modelos durante migración interna). |
| Analytics queries históricas rompen porque `metadata.leadId` ya no existe | Media | Bajo | Eventos viejos NO se rewriten — siguen con `leadId`. Service de analytics lee ambos: `metadata.contactId ?? metadata.leadId`. |
| Bot en producción rompe durante refactor | Media | Crítico | Bot está mock. Cuando se conecte (capa 4) ya estará el nuevo modelo. Sin riesgo prod hoy. |
| FK cascade DROP destruye datos | Baja | Crítico | NUNCA `DROP TABLE leads CASCADE`. Se valida FK migration en R15-R16 antes del drop. |

---

## 11. Rollback plan

Si la migración rompe algo después de aplicarse en prod:

1. Restaurar backup pre-migración (Supabase point-in-time recovery o pg_dump).
2. Revertir merge del PR del refactor.
3. Investigar causa raíz off-prod.

No hay "migración inversa" automatizada — sería trabajo equivalente al refactor mismo y aumenta superficie de bugs. Backup + revert es la estrategia.

---

## 12. Decisiones cerradas

| # | Decisión | Resolución |
|---|---|---|
| D1 | Modelo target: Contact + Inquiry (no junction table, no JSON array) | ✅ Contact + Inquiry strict |
| D2 | Unicidad de Contact en DB | ❌ NO UNIQUE constraint. Dedup en use case, no en schema |
| D3 | Estrategia de dedup en migración | ✅ Phone first, email fallback, ambos NULL → no agrupar |
| D4 | Conservar `id` de leads como `id` de inquiries | ✅ SÍ — preserva FKs sin re-mapping |
| D5 | Rename de FKs `lead_id` → `contact_id` en tablas dependientes | ✅ SÍ — appointments, queue, bot_conversations |
| D6 | Renombrar enums | ✅ SÍ pero en fase 2 (no bloquea migración) |
| D7 | Analytics historical events | ✅ Lectura tolerante a ambos. NO rewrite del historial |
| D8 | UI merge manual de contacts duplicados | ⏭️ Diferido a v2 |

---

## 13. Pre-flight checks antes de empezar R1

- [ ] Confirmar branch `feat/contact-inquiry-refactor` desde `main`.
- [ ] Confirmar backup automatizado en Supabase dev (point-in-time recovery activado).
- [ ] Confirmar contadores actuales: `SELECT count(*) FROM leads`, `SELECT count(DISTINCT phone) FROM leads`, etc. — para validar dedup post-migración.
- [ ] Confirmar plan con Gonzalo (este doc).
