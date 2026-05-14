# Sub-plan — Refactor `lead → contact + inquiry + deal` (con funnel + Kanban)

**Fecha:** 2026-05-13
**Branch:** `feat/contact-inquiry-refactor`
**Bloqueante de:** `docs/plans/2026-05-13-property-transfers.md`
**Estado actual:** Schema mono-tabla `leads` mezcla identidad, interés ligero y oportunidad comercial. Refactor al modelo estándar de CRM real-estate validado contra Salesforce Propertybase + HubSpot: **Contact (persona) + Inquiry (interés ligero) + Deal (oportunidad con funnel)**.

> **Naming:** el archivo conserva el slug `contact-inquiry-refactor` por trazabilidad del commit que lo creó. El modelo usa tres entidades: **Contact**, **Inquiry**, **Deal**.

---

## 1. Motivación

Hoy una persona interesada en 3 propiedades genera 3 filas `leads` duplicadas, con el mismo `name + phone + email` y `property_id` distinto. Además, el modelo mete en la misma tabla dos cosas distintas:

- **Carlos llenó el form público de Casa A** → interés expresado, sin compromiso.
- **Carlos agendó visita para Casa A** → oportunidad comercial real.

Hoy ambas son `lead` con `status`. Eso rompe:

- **Identidad del contacto**: no hay forma de saber "todo lo de Carlos" sin agrupar por phone/email a mano.
- **Pipeline visual / Kanban**: no se puede separar "interés cold" de "oportunidad caliente". El Kanban se llena de ruido conversacional del bot.
- **Transferencia de propiedades**: cascadear `leads` arrastra contactos que querés conservar.
- **Analytics**: no podés medir "tasa de conversión Inquiry → Deal" si ambos viven en la misma tabla con un status.
- **Bot conversacional**: una conversación bot es con un contact (persona), no con un "interés en prop". Hoy `bot_conversations.lead_id` apunta a un par persona-prop arbitrario.

El modelo estándar separa **tres conceptos** (Propertybase, HubSpot, Salesforce):

- **Contact** = la persona física (identidad). Único por `(org_id, phone, email)` a nivel use case.
- **Inquiry** = interés expresado sin compromiso. Status `open` / `discarded` / `promoted`. Sin funnel.
- **Deal** = oportunidad comercial con compromiso real. Funnel de 5 stages (visita / negociación / reserva / ganado / perdido). Una Deal puede haber nacido de promover una Inquiry, o creada directo por el agente.

---

## 2. Modelo target

```
┌──────────────┐         ┌──────────────┐                ┌──────────────┐
│   contact    │ 1─────N │   inquiry    │ ───promoted─►  │     deal     │
│              │         │              │                │              │
│ id           │         │ contact_id ──┤                │ inquiry_id?──┤ (link al origen)
│ org_id       │         │ property_id ─┤                │ contact_id ──┤
│ name         │         │ status       │                │ property_id ─┤
│ phone        │         │ source       │                │ stage        │
│ email        │         │ message      │                │ stage_order  │
│ tags         │         │ promoted_*   │                │ ...          │
│ ...          │         │ ...          │                └──────────────┘
└──────────────┘         └──────────────┘                       │
       │                        │                               │
       │                  ┌─────┴────────────┐    ┌─────────────┴──────┐
       │                  │     bot conv     │    │    appointment     │
       │                  └──────────────────┘    └────────────────────┘
       │                                                       │
       └──────── contact_property_queue                         ▼
                                                          ai_contents (atada a property)
```

### 2.1 Tabla `contact`

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
| `catalog_sent_with_origin` | `boolean` | ✅ default false | tracking "le mandé el catálogo desde su origen" |
| `catalog_opened_at` | `timestamptz` | ❌ | tracking apertura del catálogo |
| `created_at` | `timestamptz` | ✅ | |
| `updated_at` | `timestamptz` | ✅ | `$onUpdate` |
| `deleted_at` | `timestamptz` | ❌ | soft delete |
| `deleted_by_user_id/name/email` | `uuid/text/text` | ❌ | audit (mirror pattern) |

**Índices (TS):** `contact_org_id_idx`, `contact_org_created_by_idx`. **Partial / functional indexes** (org+phone where not null, org+lower(email) where not null, active org where not deleted) viven en SQL manual (R12) — Drizzle Kit no los expresa nativamente.

**Unicidad lógica (no constraint):** un contacto por `(org, phone)` y por `(org, email)`. Dedup en use case, no en schema (phone/email pueden ser NULL, pueden cambiar, teléfonos familiares legítimamente compartidos).

### 2.2 Tabla `inquiry` (interés ligero)

Mirror del patrón `Inquiry` de Salesforce Propertybase. Representa un interés expresado por un Contact sobre una Property, sin compromiso comercial. Cuando ese interés madura (cita agendada, oferta), se **promueve** a un Deal mediante una transacción atómica que crea el Deal y marca la Inquiry como `promoted`.

| Columna | Tipo | NOT NULL | Notas |
|---|---|---|---|
| `id` | `text` PK | ✅ | UUID via `$defaultFn` |
| `organization_id` | `uuid` | ✅ | tenancy |
| `created_by_user_id` | `uuid` | ✅ | agente o bot que capturó la inquiry |
| `contact_id` | `text` FK → `contact.id` | ✅ | quién mostró interés |
| `property_id` | `text` FK → `properties.id` | ✅ | en qué propiedad |
| `source` | `inquiry_source_enum` | ❌ | `public_form` / `bot` / `manual` / `whatsapp` / etc. |
| `message` | `text` | ❌ | mensaje del form / extracto bot / nota del agente |
| `status` | `inquiry_status_enum` | ✅ default `'open'` | `open` / `discarded` / `promoted` |
| `promoted_deal_id` | `text` FK → `deal.id` | ❌ | link al deal cuando `status = 'promoted'` |
| `discarded_reason` | `text` | ❌ | opcional cuando `status = 'discarded'` |
| `created_at` | `timestamptz` | ✅ default `now()` | |
| `updated_at` | `timestamptz` | ✅ `$onUpdate` | |
| `deleted_at` | `timestamptz` | ❌ | soft-delete |
| `deleted_by_*` | uuid/text/text | ❌ | audit (mirror pattern) |

**Sin funnel/stages.** Solo 3 status: `open` (vigente), `discarded` (no avanzó), `promoted` (se convirtió en deal).

**Constraint:** `UNIQUE(organization_id, contact_id, property_id) WHERE deleted_at IS NULL AND status = 'open'` — un contact tiene a lo sumo una Inquiry **abierta** por propiedad. Si pregunta dos veces, se reactiva la existente.

**Índices:** `inquiry_org_id_idx`, `inquiry_contact_id_idx`, `inquiry_property_id_idx`, `inquiry_org_status_idx`, `inquiry_org_created_by_idx`.

**Enums:**
- `inquiry_status_enum`: `open` / `discarded` / `promoted`.
- `inquiry_source_enum`: `public_form` / `bot` / `manual` / `whatsapp` / `facebook` / `instagram` / `tiktok` / `google` / `referral` / `direct`.

**Promote atómico — invariante bidireccional Inquiry ↔ Deal:**

Las dos FK (`inquiry.promoted_deal_id` y `deal.inquiry_id`) son intencionales para navegación sin JOIN extra. El invariante de consistencia se mantiene SIEMPRE atómicamente: una sola transacción Postgres que (a) inserta el Deal con `inquiry_id = ?`, (b) actualiza la Inquiry con `status = 'promoted'` y `promoted_deal_id = <id del deal recién insertado>`. El use case `promoteInquiryUseCase` orquesta. El adapter ejecuta dentro de `withRLS(ctx, async (tx) => { tx.insert(deal)... tx.update(inquiry)... })`.

**Edge cases del invariante:**
- **Restore de Deal soft-deleted vinculado:** la Inquiry NO revierte automáticamente a `open`. El operador decide reabrir manualmente si quiere.
- **Restore de Inquiry soft-deleted con `status='promoted'`:** se mantiene como `promoted`. El link al Deal sigue válido.
- **Soft-delete de Inquiry con `status='promoted'`:** el Deal sigue vivo. El historial sigue navegable desde el Deal.
- **Hard-delete:** prohibido por política firme. `ON DELETE CASCADE` declarado en ambas FKs como red de seguridad si se introduce en el futuro.

### 2.3 Tabla `deal` (oportunidad comercial)

| Columna | Tipo | NOT NULL | Notas |
|---|---|---|---|
| `id` | `text` PK | ✅ | UUID via `$defaultFn` |
| `organization_id` | `uuid` | ✅ | tenancy |
| `created_by_user_id` | `uuid` | ✅ | agente dueño del deal |
| `contact_id` | `text` FK → `contact.id` | ✅ | |
| `property_id` | `text` FK → `properties.id` | ✅ | |
| `inquiry_id` | `text` FK → `inquiry.id` | ❌ | link al origen cuando el Deal nació promoviendo una Inquiry |
| `stage` | `deal_stage_enum` | ✅ default `'visit_scheduled'` | etapa del funnel |
| `stage_order` | `integer` | ✅ default `0` | orden dentro de la columna Kanban (drag&drop dentro de la misma etapa) |
| `source` | `deal_source_enum` | ❌ | canal de origen |
| `budget` | `text` | ❌ | |
| `message` | `text` | ❌ | |
| `property_type_sought` | `text` | ❌ | |
| `zone_of_interest` | `text` | ❌ | |
| `wants_offers` | `boolean` | ✅ default false | |
| `expected_close_at` | `timestamptz` | ❌ | fecha estimada de cierre (forecasting) |
| `closed_at` | `timestamptz` | ❌ | poblado cuando `stage` pasa a `won`/`lost` |
| `lost_reason` | `text` | ❌ | opcional cuando `stage = 'lost'` |
| `created_at/updated_at/deleted_at + audit cols` | | | |

**Enum `deal_stage_enum` (5 valores — solo compromisos reales):**

| Valor | Label UI | Descripción |
|---|---|---|
| `visit_scheduled` | Visita programada | Cita agendada o ya realizada |
| `negotiation` | Negociación | Hablando de precio / condiciones / oferta |
| `reserved` | Reservado | Reserva formal (seña o anticipo) |
| `won` | Ganado | Venta/alquiler concretado |
| `lost` | Perdido | Operación caída |

`won` y `lost` son terminales: el Deal sale del Kanban activo. Reopen permitido (limpia `closed_at` + `lost_reason`).

**Enum `deal_source_enum`:** `facebook` / `instagram` / `whatsapp` / `tiktok` / `google` / `referral` / `direct`. (Subset de `inquiry_source_enum`: no incluye `public_form` ni `bot` ni `manual` porque esos son canales de captura inicial — el Deal hereda el source del flujo de promoción cuando aplica, o el agente lo selecciona manualmente al crear directo.)

**Constraint:** `UNIQUE(organization_id, contact_id, property_id) WHERE deleted_at IS NULL AND stage NOT IN ('won','lost')` — un contact tiene a lo sumo un Deal **activo** por propiedad.

**Índices:** `deal_org_id_idx`, `deal_property_id_idx`, `deal_contact_id_idx`, `deal_org_stage_idx`, `deal_org_created_by_idx`. Partial `deal_active_org_idx ON (organization_id) WHERE deleted_at IS NULL AND stage NOT IN ('won','lost')` en SQL manual.

### 2.4 Cambios en tablas dependientes

| Tabla | Cambio | Razón |
|---|---|---|
| `appointments` | `lead_id` → `deal_id` (FK → deal). Conserva `property_id` como denormalización display | Cita = visita física de un Deal concreto. Agendar cita es el trigger natural de promover Inquiry → Deal |
| `lead_property_queue` | Rename `contact_property_queue`. `lead_id` → `contact_id` | Cola de props sugeridas por el bot. Atado al Contact (persona) |
| `bot_conversations` | `lead_id` → `contact_id` | El bot conversa con la persona |
| `bot_messages` | Sin cambio | Sigue ligado a `bot_conversations.id` |
| `ai_contents` | Sin cambio | Atado a `property_id`. Asset de la propiedad |
| `analytics_events` | `metadata.leadId` legacy → `metadata.contactId` + `metadata.inquiryId` / `metadata.dealId` cuando aplique | Service de analytics lee ambos para compatibilidad |
| `property_transfers` | `inquiriesCount` → `dealsCount` (sub-plan transfers coordinado) | Cascade del transfer actúa sobre Deals. Inquiries NO cascadean (son interés ligero) |

### 2.5 RLS policies

Mirror del pattern actual aplicado a `contact`, `inquiry`, `deal`. Reglas: org isolation + soft delete + papelera role-aware + super admin para SELECT; INSERT/UPDATE per role.

Migración SQL: `drizzle/sql/026_contact_inquiry_deal_refactor.sql` con DDL completa + RLS + enums.

---

## 3. Mapping de datos (lead → contact + inquiry/deal)

Algoritmo determinístico, idempotente, transaccional. Dev DB sin data real (confirmado por Gonzalo) — el algoritmo se escribe completo para staging/prod futuro.

### 3.1 Paso 1 — agrupar leads por persona

Phone-first / email-fallback / NULL-NULL → no agrupa.

```sql
WITH normalized AS (
  SELECT
    l.id AS lead_id, l.organization_id, l.created_by_user_id, l.name,
    NULLIF(regexp_replace(coalesce(l.phone, ''), '[^0-9+]', '', 'g'), '') AS phone_norm,
    NULLIF(lower(trim(coalesce(l.email, ''))), '') AS email_norm,
    l.created_at
  FROM public.leads l
  WHERE l.deleted_at IS NULL
),
keyed AS (
  SELECT *, coalesce(phone_norm, email_norm, lead_id) AS group_key FROM normalized
)
SELECT
  organization_id, group_key,
  array_agg(lead_id ORDER BY created_at) AS lead_ids,
  (array_agg(created_by_user_id ORDER BY created_at))[1] AS earliest_creator,
  (array_agg(name) FILTER (WHERE name IS NOT NULL) ORDER BY created_at DESC)[1] AS display_name,
  (array_agg(phone_norm) FILTER (WHERE phone_norm IS NOT NULL))[1] AS phone,
  (array_agg(email_norm) FILTER (WHERE email_norm IS NOT NULL))[1] AS email,
  min(created_at) AS contact_created_at
FROM keyed
GROUP BY organization_id, group_key;
```

### 3.2 Paso 2 — crear contacts

Por cada grupo del Paso 1 → un `INSERT INTO public.contact(...)`. Tabla auxiliar `_migration_lead_to_contact(lead_id, contact_id)` para los pasos siguientes.

### 3.3 Paso 3 — repartir leads legacy entre `inquiry` y `deal`

**Regla de mapping:**

| Lead legacy condition | Target | Stage/Status |
|---|---|---|
| Tiene **appointment** no soft-deleted, status NOT IN (`cancelled`) | **Deal** | `stage = visit_scheduled` |
| `status = 'won'` | **Deal** | `stage = won`, `closed_at = updated_at` |
| `status = 'lost'` | **Deal** | `stage = lost`, `closed_at = updated_at` |
| `status = 'discarded'` | **Inquiry** | `status = discarded`, `discarded_reason = 'migrated_from_discarded_lead'` |
| `status = 'new'` / `'contacted'` / `'interested'` sin appointment | **Inquiry** | `status = open` |

**Justificación:** un Deal requiere compromiso comercial real. La presencia de un appointment (o estado terminal) es el proxy disponible en data legacy. Sin esos signos, el lead se traduce como Inquiry.

```sql
-- Step 3a — Deals para leads con appointment o status terminal
WITH lead_to_deal AS (
  SELECT
    l.id AS lead_id,
    l.organization_id, l.created_by_user_id, m.contact_id, l.property_id,
    CASE
      WHEN l.status = 'won' THEN 'won'::public.deal_stage_enum
      WHEN l.status = 'lost' THEN 'lost'::public.deal_stage_enum
      ELSE 'visit_scheduled'::public.deal_stage_enum
    END AS stage,
    CASE WHEN l.status IN ('won','lost') THEN l.updated_at ELSE NULL END AS closed_at,
    l.source::text::public.deal_source_enum AS source,
    l.budget, l.message, l.property_type_sought, l.zone_of_interest, l.wants_offers,
    l.created_at, l.updated_at, l.deleted_at,
    l.deleted_by_user_id, l.deleted_by_user_name, l.deleted_by_user_email
  FROM public.leads l
  JOIN _migration_lead_to_contact m ON m.lead_id = l.id
  WHERE
    l.status IN ('won', 'lost')
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.lead_id = l.id AND a.deleted_at IS NULL
        AND (a.status IS NULL OR a.status NOT IN ('cancelled'))
    )
)
INSERT INTO public.deal(
  id, organization_id, created_by_user_id, contact_id, property_id, inquiry_id,
  stage, stage_order, source, budget, message, property_type_sought, zone_of_interest,
  wants_offers, closed_at, lost_reason, created_at, updated_at, deleted_at,
  deleted_by_user_id, deleted_by_user_name, deleted_by_user_email
)
SELECT
  lead_id, organization_id, created_by_user_id, contact_id, property_id,
  NULL AS inquiry_id,
  stage, 0 AS stage_order, source, budget, message, property_type_sought,
  zone_of_interest, wants_offers, closed_at, NULL AS lost_reason,
  created_at, updated_at, deleted_at,
  deleted_by_user_id, deleted_by_user_name, deleted_by_user_email
FROM lead_to_deal;

-- Recalcular stage_order por org+stage (orden por created_at)
UPDATE public.deal d SET stage_order = sub.row_number
FROM (
  SELECT id, row_number() OVER (PARTITION BY organization_id, stage ORDER BY created_at) - 1 AS row_number
  FROM public.deal
) sub
WHERE d.id = sub.id;

-- Step 3b — Inquiries para el resto
INSERT INTO public.inquiry(
  id, organization_id, created_by_user_id, contact_id, property_id,
  source, message, status, discarded_reason,
  created_at, updated_at, deleted_at,
  deleted_by_user_id, deleted_by_user_name, deleted_by_user_email
)
SELECT
  l.id, l.organization_id, l.created_by_user_id, m.contact_id, l.property_id,
  l.source::text::public.inquiry_source_enum,
  l.message,
  CASE WHEN l.status = 'discarded' THEN 'discarded' ELSE 'open' END::public.inquiry_status_enum,
  CASE WHEN l.status = 'discarded' THEN 'migrated_from_discarded_lead' ELSE NULL END,
  l.created_at, l.updated_at, l.deleted_at,
  l.deleted_by_user_id, l.deleted_by_user_name, l.deleted_by_user_email
FROM public.leads l
JOIN _migration_lead_to_contact m ON m.lead_id = l.id
WHERE NOT EXISTS (SELECT 1 FROM public.deal d WHERE d.id = l.id);
```

**Preservación de IDs:** `inquiry.id = leads.id` o `deal.id = leads.id` según donde aterriza el lead (mutuamente excluyente). Preserva los FKs existentes en tablas dependientes (appointments, queue, bot_conversations).

### 3.4 Paso 4 — switch de FKs en tablas dependientes

- `appointments.lead_id` → `deal_id`: rename + FK ahora apunta a `deal.id` (que conserva el ID).
- `lead_property_queue` → rename a `contact_property_queue`. Agregar `contact_id` poblándolo desde `_migration_lead_to_contact`. Drop FK vieja, drop `lead_id`.
- `bot_conversations.lead_id` → `contact_id`. Mismo patrón.

```sql
ALTER TABLE public.appointments RENAME COLUMN lead_id TO deal_id;
ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_lead_id_fkey,
  ADD CONSTRAINT appointments_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deal(id);

ALTER TABLE public.lead_property_queue RENAME TO contact_property_queue;
ALTER TABLE public.contact_property_queue ADD COLUMN contact_id text;
UPDATE public.contact_property_queue q SET contact_id = m.contact_id
FROM _migration_lead_to_contact m WHERE q.lead_id = m.lead_id;
ALTER TABLE public.contact_property_queue
  ALTER COLUMN contact_id SET NOT NULL,
  ADD CONSTRAINT contact_property_queue_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contact(id),
  DROP CONSTRAINT lead_property_queue_lead_id_fkey,
  DROP COLUMN lead_id;

-- bot_conversations: misma estrategia que queue
```

**Caveat:** appointments cuyo `lead_id` apuntaba a un lead que terminó como **Inquiry** (no Deal) quedan con FK dangling. Filtro defensivo: solo migrar appointments cuyo lead_id → deal.id en el mapping. Los demás se descartan con count registrado (era una cita asociada a un lead que el algoritmo clasificó como Inquiry — contradice la heurística §3.3, pero por safety se filtra). En dev sin data, no aplica.

### 3.5 Paso 5 — drop legacy

```sql
DROP TABLE public.leads;
DROP TABLE _migration_lead_to_contact;
```

Solo después de validar contadores (§7.4).

### 3.6 Idempotencia

Toda la migración corre en una sola transacción Postgres. ROLLBACK total si cualquier paso falla. Dev → staging → prod.

---

## 4. Arquitectura — módulos `features/contacts` + `features/inquiries` + `features/deals`

Reemplaza `features/leads/`.

### 4.1 `features/contacts/`

```
features/contacts/
  domain/
    contact.entity.ts
    contact.repository.ts
  application/
    create-contact / find-or-create / get-list / get-by-id /
    get-by-phone-or-email / search / update / delete / restore
  infrastructure/
    contact.model.ts / contact.mapper.ts / drizzle-contact.repository.ts
  presentation/
    actions.ts + components/ (lista, detalle, dialog, autocomplete reusable)
```

### 4.2 `features/inquiries/`

```
features/inquiries/
  domain/
    inquiry.entity.ts
    inquiry.repository.ts
  application/
    create-inquiry.use-case.ts     # crea inquiry (find-or-create contact embebido)
    get-inquiries.use-case.ts
    get-open-inquiries.use-case.ts # listado por default (filtra status='open')
    get-inquiry-by-id.use-case.ts
    get-inquiries-by-contact.use-case.ts
    get-inquiries-by-property.use-case.ts
    discard-inquiry.use-case.ts
    promote-inquiry.use-case.ts    # crea Deal atómicamente + marca inquiry promoted
    delete-inquiry / restore-inquiry
  infrastructure/
    inquiry.model.ts / inquiry.mapper.ts / drizzle-inquiry.repository.ts
  presentation/
    actions.ts
    public-actions.ts              # form público: crea Contact + Inquiry
    components/ (lista, dialog crear, botón promote, discard modal)
```

### 4.3 `features/deals/`

```
features/deals/
  domain/
    deal.entity.ts                 # 5 stages + inquiryId opcional
    deal.repository.ts
  application/
    create-deal.use-case.ts        # crea Deal directo (caso admin sin Inquiry previa)
    get-deals.use-case.ts / get-deal-by-id / get-by-contact / get-by-property / get-by-stage
    update-deal / move-deal-stage / reorder-deals-in-stage
    delete-deal / restore-deal
  infrastructure/
    deal.model.ts / deal.mapper.ts / drizzle-deal.repository.ts
  presentation/
    actions.ts
    components/ (deal-kanban, deal-card, deal-detail-page, deal-create-dialog)
```

### 4.4 Use case clave — `promoteInquiryUseCase`

```ts
export async function promoteInquiryUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
  inquiryId: string,
  dealInput: PromoteInquiryDealInput,
): Promise<{ deal: Deal; inquiry: Inquiry }> {
  return inquiryRepo.promote(ctx, inquiryId, dealInput)
}
```

El use case es delegación delgada — la atomicidad bidireccional vive **enteramente dentro de `IInquiryRepository.promote()`**. El adapter Drizzle (I6) corre `withRLS(ctx, async (tx) => { ... })`:
1. `SELECT inquiry ... FOR UPDATE` (lock + validation status='open').
2. `INSERT deal` con `contact_id` y `property_id` heredados de la Inquiry y `inquiry_id` apuntando a ella.
3. `UPDATE inquiry` con `status='promoted'` y `promoted_deal_id = deal.id`.

Una sola transacción → si falla cualquier paso, ROLLBACK total. El use case NO recibe `dealRepo` como parámetro: cross-table writes en una sola tx son responsabilidad del repo dueño de la operación atómica.

### 4.5 UX — flujos principales

**Form público landing:**

```
Persona X visita /p/[id] → "Quiero más info" → form (nombre, phone, email, mensaje)
    ↓
createPublicInquiryAction:
  findOrCreateContact (dedup) + createInquiry (status='open', source='public_form')
    ↓
Bot WhatsApp comienza conversación
```

**Listado de Inquiries para el agente:**

```
/dashboard/inquiries → tabla con filtros (open / discarded / promoted)
  Acciones por fila:
    - "Ver detalle" → /dashboard/inquiries/[id]
    - "Promover a Negocio" → dialog promoteInquiry (pide stage inicial + datos extra)
    - "Descartar" → modal pidiendo razón
```

**Listado de Deals (Kanban) para el agente:**

```
/dashboard/deals → Kanban con 5 columnas (visit_scheduled / negotiation / reserved / won / lost)
  Drag&drop entre columnas: moveDealStageAction
  Drag&drop dentro: reorderDealsInStageAction
  Vista tabla alternativa para listado plano
```

---

## 5. UI — cambios visibles

### 5.1 Sidebar

- "Contactos" → `/dashboard/contacts`
- "Consultas" → `/dashboard/inquiries`
- "Negocios" → `/dashboard/deals` (Kanban + Tabla)
- "Propiedades" sin cambio

### 5.2 Página `/dashboard/contacts/[id]` — detalle del contacto

Sub-secciones:
- Datos personales (nombre, phone, email, tags, notes).
- **Consultas activas** — Inquiries con `status='open'`.
- **Negocios activos** — Deals con `stage NOT IN (won,lost)`.
- **Historial** — Inquiries discarded + Deals closed.
- **Citas agendadas** — appointments via deal_id.
- **Historial de bot** — bot_conversations.

### 5.3 Página `/dashboard/inquiries/[id]`

Detalle de Inquiry: contact, property, source, message, status, fecha. Acciones: Promover a Negocio, Descartar, Volver a abrir (si está discarded).

### 5.4 Página `/dashboard/deals` — Kanban

```
┌────────────────────────────────────────────────────────────────────────┐
│ Negocios                              [Tabla] [Kanban*]  [+ Nuevo]     │
├────────────────────────────────────────────────────────────────────────┤
│ Filtros: [Agente▼] [Propiedad▼] [Origen▼] [Búsqueda...]                │
├──────────┬────────────┬───────────┬─────────┬───────────────────────────┤
│  Visita  │Negociación │ Reservado │ Ganados │     Perdidos              │
│programada│            │           │         │                           │
│    4     │     3      │     1     │   2 ✓   │       5 ✕                 │
├──────────┼────────────┼───────────┼─────────┼───────────────────────────┤
│ ┌──────┐ │ ┌────────┐ │ ┌───────┐ │ ┌─────┐ │ ┌────────────────────────┐│
│ │María │ │ │Roberto │ │ │Lucía  │ │ │Diego│ │ │Pablo                   ││
│ │Lote C│ │ │Comerc D│ │ │Casa E │ │ │Apto │ │ │Lote G                  ││
│ │$120k │ │ │$200k   │ │ │$95k   │ │ │F    │ │ │$110k                   ││
│ └──────┘ │ └────────┘ │ └───────┘ │ │$60k │ │ └────────────────────────┘│
│   ...    │    ...     │           │ └─────┘ │            ...            │
└──────────┴────────────┴───────────┴─────────┴───────────────────────────┘
```

### 5.5 Página `/dashboard/deals/[id]` — detalle Deal

Header con Contact + Property linkeados. Si hay `inquiry_id`, link a la Inquiry original ("vino de esta consulta"). Stage actual + selector manual. Citas asociadas. Acciones won/lost (lost pide razón vía UI).

### 5.6 Form público landing → `createPublicInquiryAction`

`/p/[id]` form de contacto público:
- `findOrCreateContact` (dedup por phone/email)
- `createInquiry` con `status='open'`, `source='public_form'`

NO crea Deal directamente. El Deal nace después, cuando el bot/agente promueve la Inquiry (cita agendada, negociación).

---

## 6. Plan de tests

### 6.1 Migración

| # | Test | Esperado |
|---|---|---|
| MIG1 | `count(contact) ≤ count(leads pre-mig)` | ✅ dedup reduce o iguala |
| MIG2 | `count(inquiry) + count(deal) == count(leads pre-mig)` | ✅ 1:1 leads → inquiry/deal |
| MIG3 | Lead con phone "+591 7xxx" y otro con "591-7xxx" en misma org → 1 contact | ✅ |
| MIG4 | Lead sin phone ni email → su propio contact (no se agrupa) | ✅ |
| MIG5 | Lead con email duplicado cross-org → contacts distintos (tenancy isolation) | ✅ |
| MIG6 | FK integrity: 0 `appointments` con `deal_id` dangling | ✅ |
| MIG7 | FK integrity: 0 `contact_property_queue` y `bot_conversations` con `contact_id` dangling | ✅ |
| MIG8 | Soft-deleted leads → soft-deleted inquiry/deal según mapping; contacts NO auto-soft-deletados | ✅ |
| MIG9 | Mapping: lead con appointment → Deal `visit_scheduled`; lead won/lost → Deal won/lost + closed_at; lead discarded → Inquiry discarded; resto → Inquiry open | ✅ |
| MIG10 | `stage_order` recalculado correcto (dense `0..N-1` por org+stage activo) | ✅ |
| MIG11 | `inquiry.id` y `deal.id` nunca colisionan (mutuamente excluyentes en el mapping) | ✅ |

### 6.2 Type / lint / build

| Test | Comando | Esperado |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 errors |
| ESLint | `npm run lint` | 0 errors / 0 warnings |
| Build | `npm run build` | success |

### 6.3 Playwright smoke

| # | Test | Esperado |
|---|---|---|
| T1 | Form público en /p/[id] | Crea Contact + Inquiry (status='open', source='public_form'). NO crea Deal |
| T2 | Bot conversa "me interesa Casa B" | Crea Inquiry sobre Casa B en mismo Contact existente |
| T3 | Agente promueve Inquiry → Deal | Transacción atómica: deal.inquiry_id=I, inquiry.status='promoted', inquiry.promoted_deal_id=D |
| T4 | Drag&drop card Visita → Negociación | UPDATE stage + recalcular stage_order de ambas columnas |
| T5 | Marcar Deal `lost` | Modal pide `lost_reason`. closed_at poblado. Card sale del Kanban |
| T6 | Marcar Deal `won` | Pide confirmación. closed_at poblado |
| T7 | Reopen Deal cerrado a `negotiation` | Clear closed_at + lost_reason |
| T8 | Discard Inquiry | status='discarded', discarded_reason capturado |
| T9 | Crear Inquiry sobre contact+prop con `open` existente | Reactiva la existente, no duplica |
| T10 | Crear Inquiry sobre contact+prop con `promoted` previo | Permite nueva Inquiry (interés renovado) |
| T11 | Detalle Contact muestra Inquiries activas + Deals activos + Citas + Bot history | Joins resuelven |
| T12 | RLS cross-org: user Org-B no ve datos de Org-A | Filtrado RLS |
| T13 | Agent edita solo sus propios Deals/Inquiries | RLS UPDATE policy |
| T14 | Búsqueda contact autocomplete por phone parcial | Top resultados con dedup |
| T15 | Bot conversation existente migrada → sigue funcional con `contact_id` | Smoke |
| T16 | Analytics: "Inquiries del mes" + "Tasa conversion Inquiry→Deal" | Métricas calculadas |
| T17 | Toggle Kanban ↔ Tabla mantiene filtros | UX |

### 6.4 Verificación DB

```sql
-- Bidireccional invariant: inquiry.promoted_deal_id ↔ deal.inquiry_id
SELECT count(*) FROM inquiry i
WHERE i.status = 'promoted'
  AND (i.promoted_deal_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM deal d WHERE d.id = i.promoted_deal_id AND d.inquiry_id = i.id
  ));
-- Esperado: 0

-- No deals dangling
SELECT count(*) FROM deal d WHERE NOT EXISTS (SELECT 1 FROM contact c WHERE c.id = d.contact_id);

-- stage_order sin gaps
SELECT organization_id, stage, count(*), max(stage_order) FROM deal
WHERE deleted_at IS NULL AND stage NOT IN ('won','lost')
GROUP BY organization_id, stage HAVING max(stage_order) != count(*) - 1;
```

---

## 7. Edge cases

| # | Caso | Comportamiento |
|---|---|---|
| EC1 | Phone idéntico, email distinto → ¿misma persona? | SÍ (phone wins). Conservador en favor de menos duplicados |
| EC2 | Email idéntico, phones distintos | SÍ (fallback) |
| EC3 | Ambos NULL (solo name) | NO agrupa. Cada uno = su propio contact |
| EC4 | Lead borrado (soft) migra | Inquiry/Deal soft-deleted; contact NO se borra |
| EC5 | Lead `name = NULL` | Contact con `name = "Sin nombre"` |
| EC6 | Persona en múltiples orgs | Contacts distintos por tenancy |
| EC7 | Crear Inquiry sobre contact+prop con Deal `won/lost` previo | Permite (interés renovado) |
| EC8 | Crear Inquiry sobre contact+prop con Inquiry `open` existente | Reactiva existente, no duplica |
| EC9 | Promover Inquiry → Deal + drag a `lost` inmediato | Permitido. Use case no obliga visita previa |
| EC10 | Reopen Deal cerrado a etapa activa | Clear `closed_at` + `lost_reason`. Inquiry NO revierte automáticamente |
| EC11 | Race: 2 agentes promueven la misma Inquiry simultáneamente | Unique constraint `(org, contact, property) WHERE status='open'` falla en el segundo → conflicto explícito. UI catch + retry/refresh |
| EC12 | Reorder múltiples cards rápido | Debounce cliente + lock optimista. Server reconcilia con stage_order recalculado |
| EC13 | Borrar contact con Deals activos | Hard error: "Tiene N negocios activos. Cierra o transfiere primero" |
| EC14 | Borrar contact sin actividad | Soft delete; Inquiries y Deals van a papelera |
| EC15 | Public form: spam | Rate limit + heurística (si phone+email ambos vacíos → rechazar) |
| EC16 | Soft-delete Inquiry promoted | Deal sigue vivo. Link conserva por historial |
| EC17 | Restore Deal previamente cerrado y luego soft-deleted | Pasa al estado anterior (stage previo a soft-delete). closed_at conservado salvo que se cambie stage |
| EC18 | Hard-delete (futuro hipotético) | Política firme: NO hay hard-delete. Cascade declarado en SQL como red de seguridad |

---

## 8. Tareas (checkboxes) — orden óptimo de desarrollo

Orden interno por tarea: `implementar → code review → fixes → tests → confirmación → docs → commit`.

> **Nota sobre data:** dev DB sin data real (confirmado 2026-05-13). Algoritmo §3 se escribe para staging/prod futuro.

### Fase 1 — Diseño Domain

- [x] **R1** — `features/contacts/domain/contact.entity.ts`. ✅ 2026-05-13.
- [x] **R2** — `features/contacts/domain/contact.repository.ts`. ✅ 2026-05-13.
- [x] **I1** — `features/inquiries/domain/inquiry.entity.ts` (Inquiry + CreateInquiryDTO + UpdateInquiryDTO + InquiryStatus + InquirySource + InquiryFilters). ✅ 2026-05-13. Review: 1 IMPORTANT (invariante `promotedDealId` ↔ `status='promoted'` documentado bidireccional) resuelto via JSDoc reforzado (Option B — consistente con Deal pattern). Build + tsc + eslint verdes.
- [x] **I2** — `features/inquiries/domain/inquiry.repository.ts` (IInquiryRepository — incluye `findOpenByContactAndProperty`, `discard`, `promote` atómico). ✅ 2026-05-13. Review: 3 IMPORTANT resueltos (throw token `deal_already_active` agregado; `findAll` vs `findAllOpen` ordering documentado coherente; §4.4 use case sin `dealRepo` — atomicidad vive en repo). Build + tsc + eslint verdes.
- [x] **R3** — `features/deals/domain/deal.entity.ts` (5 stages + inquiryId opcional). ✅ 2026-05-13.
- [x] **R4** — `features/deals/domain/deal.repository.ts`. ✅ 2026-05-13.

### Fase 2 — Drizzle schema TypeScript

Orden re-ajustado para que los enums y las tablas con FK cruzadas se construyan en el orden de dependencia correcto:

- [x] **R5** — `lib/db/schema/contact.ts`. ✅ 2026-05-13.
- [x] **R10** — Actualizar `enums.ts`: agregar `dealStageEnum` (5 valores), `dealSourceEnum`, `inquiryStatusEnum`, `inquirySourceEnum`. Conservar enums viejos durante transición. ✅ 2026-05-13. Review: 1 IMPORTANT (Spanish en JSDoc del dealStageEnum) resuelto. Build + tsc + eslint verdes.
- [x] **R6** — `lib/db/schema/deal.ts` (tabla `deal` con cols §2.3 + FK opcional `inquiry_id` a inquiry). ✅ 2026-05-13. Review: 1 IMPORTANT (cascade decision documentada) resuelto. Barrel update incluida. `inquiry_id` FK declarada SQL-side R12 para evitar circular import. Build + tsc + eslint verdes.
- [x] **I3** — `lib/db/schema/inquiry.ts` (tabla `inquiry` con cols §2.2 + FK opcional `promoted_deal_id` a deal). Cierra la navegación bidireccional sin JOIN extra. ✅ 2026-05-13. Review: 1 IMPORTANT (`ON DELETE SET NULL` documentado en ambos lados de la FK bidireccional Inquiry↔Deal) resuelto — fix simétrico en `deal.ts` también. Build + tsc + eslint verdes.
- [x] **R7** — `lib/db/schema/contact-property-queue.ts` creada en paralelo (Opción B coexistencia — confirmada con Gonzalo). El archivo legacy `lead-property-queue.ts` queda intacto hasta R46 (Fase 10) cuando el consumidor en `features/bot` se migre (R35). ✅ 2026-05-13. Review: 2 IMPORTANT (índice `cpq_property_id_idx` faltante + JSDoc menciones R34/R35 corregidas a solo R35) resueltos. Build + tsc + eslint verdes.
- [ ] **R8** — Actualizar `appointments.ts`: `leadId` → `dealId` (FK a `deal.id`).
- [ ] **R9** — Actualizar `bot-conversations.ts`: `leadId` → `contactId`.
- [ ] **R11** — Actualizar `lib/db/schema/index.ts` (barrel): exportar deal, inquiry, contact-property-queue.

### Fase 3 — Migración SQL + apply en dev

- [ ] **R12** — Escribir `drizzle/sql/026_contact_inquiry_deal_refactor.sql`:
  - BEGIN transaccional.
  - DDL types: `deal_stage_enum` (5 vals), `deal_source_enum`, `inquiry_status_enum`, `inquiry_source_enum`.
  - DDL tablas: `contact`, `inquiry` (con FK a contact + properties + opcional a deal), `deal` (con FK a contact + properties + opcional a inquiry).
  - Mapping algoritmo §3 con `_migration_lead_to_contact`.
  - Inserts diferenciados §3.3: lead→deal si tiene appointment o won/lost; lead→inquiry resto.
  - Recalcular stage_order.
  - FK switch §3.4: appointments.lead_id → deal_id, queue rename + contact_id, bot_conversations idem.
  - RLS policies sobre contact + inquiry + deal.
  - NO drop de leads (al final del refactor).
  - COMMIT.
- [ ] **R13** — Aplicar migración R12 en Supabase dev via MCP `apply_migration`.
- [ ] **R14** — Validar §6.4. Rollback si discrepancias.

### Fase 4 — Infrastructure repos

- [ ] **R15** — `features/contacts/infrastructure/contact.model.ts`.
- [ ] **R16** — `features/contacts/infrastructure/contact.mapper.ts` (null↔undefined).
- [ ] **R17** — `features/contacts/infrastructure/drizzle-contact.repository.ts`.
- [ ] **I4** — `features/inquiries/infrastructure/inquiry.model.ts`.
- [ ] **I5** — `features/inquiries/infrastructure/inquiry.mapper.ts` (join contact + property + deal cuando promoted).
- [ ] **I6** — `features/inquiries/infrastructure/drizzle-inquiry.repository.ts` con `promote` atómico (single tx: insert deal + update inquiry).
- [ ] **R18** — `features/deals/infrastructure/deal.model.ts`.
- [ ] **R19** — `features/deals/infrastructure/deal.mapper.ts` (join contact + property + inquiry).
- [ ] **R20** — `features/deals/infrastructure/drizzle-deal.repository.ts`.

### Fase 5 — Application use cases

- [ ] **R21** — `features/contacts/application/` (9 use cases).
- [ ] **I7** — `features/inquiries/application/` (10 use cases: create, get-list, get-open, get-by-id, get-by-contact, get-by-property, discard, promote, delete, restore). El `create` orquesta find-or-create contact via contactRepo. El `promote` orquesta la transacción atómica vía inquiryRepo.promote().
- [ ] **R22** — `features/deals/application/` (10 use cases).

### Fase 6 — Server Actions + components base

- [ ] **R23** — `features/contacts/presentation/actions.ts`.
- [ ] **R24** — `features/contacts/presentation/components/` (lista, detalle con sub-secciones, edit dialog, **contact-autocomplete reusable**).
- [ ] **I8** — `features/inquiries/presentation/actions.ts` (auth) + `public-actions.ts` (form público — crea Contact + Inquiry).
- [ ] **I9** — `features/inquiries/presentation/components/` (lista filtrable, detalle, dialog crear, **promote-inquiry-dialog**, discard modal).
- [ ] **R25** — `features/deals/presentation/actions.ts`.
- [ ] **R26** — `features/deals/presentation/components/deal-create-dialog.tsx`.
- [ ] **R27** — `features/deals/presentation/components/deal-detail-page.tsx`.

### Fase 7 — Kanban UI (drag&drop)

- [ ] **R28** — Elegir lib drag&drop (reco: dnd-kit).
- [ ] **R29** — `deal-kanban-column.tsx`.
- [ ] **R30** — `deal-card.tsx`.
- [ ] **R31** — `deal-kanban.tsx` (drag&drop + optimistic update + rollback).
- [ ] **R32** — `deal-stage-badge.tsx`.
- [ ] **R33** — Toggle Kanban ↔ Tabla en `/dashboard/deals`.

### Fase 8 — Migrar módulos dependientes

- [ ] **R34** — `features/appointments`: `lead_id` → `deal_id`. Joins a deal → contact + property.
- [ ] **R35** — `features/bot`: `bot_conversations.lead_id` → `contact_id`.
- [ ] **R36** — `features/analytics`: eventos nuevos con `contactId` + `inquiryId`/`dealId`. Lectura tolerante a `metadata.leadId` legacy. Métricas nuevas: "Inquiries del mes", "Conversion Inquiry→Deal".
- [ ] **R37** — `features/dashboard`: aggregations actualizadas.
- [ ] **R38** — `features/ai-contents`: review (sin cambios esperados).

### Fase 9 — UI dashboard

- [ ] **R39** — Página `/dashboard/contacts` (lista + detalle con sub-secciones).
- [ ] **I10** — Página `/dashboard/inquiries` (lista filtrable + `[id]` detalle + acciones promote/discard).
- [ ] **R40** — Página `/dashboard/deals` (Kanban + Tabla) + `[id]` detalle.
- [ ] **R41** — Sidebar: "Contactos", "Consultas", "Negocios". Eliminar "Leads".
- [ ] **R42** — Form público en `/p/[id]` apunta a `createPublicInquiryAction`.

### Fase 10 — Cleanup

- [ ] **R43** — Eliminar `features/leads/`.
- [ ] **R44** — Eliminar `lib/db/schema/leads.ts` + barrel.
- [ ] **R45** — Eliminar enums legacy en `enums.ts`.
- [ ] **R46** — SQL `drizzle/sql/027_drop_legacy_leads.sql`: `DROP TABLE public.leads;`. Aplicar en dev.

### Fase 11 — Tests + docs + commits

- [ ] **R47** — Smoke Playwright §6.3 (T1–T17). Tabla obligatoria.
- [ ] **R48** — Actualizar `docs/implementation-plan.md`.
- [ ] **R49** — Actualizar `CLAUDE.md`: project structure (modules contacts/inquiries/deals), null safety, entity examples.
- [ ] **R50** — Actualizar `docs/plans/2026-05-13-property-transfers.md`: cascade actúa sobre Deals; Inquiries NO cascadean en transfer (son interés ligero, no compromiso del agente origen).
- [ ] **R51** — Commits agrupados por fase.

### Dependencias

```
Fase 1 ─► Fase 2 ─► Fase 3 ─► Fase 4 ─► Fase 5 ─► Fase 6 ─► Fase 7 ─► Fase 8 ─► Fase 9 ─► Fase 10 ─► Fase 11
```

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migración pierde data por bug de mapping | Baja | Crítico | Backup pre-mig. Transaccional. Conteos pre/post §6.1 |
| Mapping appointment→Deal mal clasifica leads | Media | Medio | Validación post-migración explícita §6.4. Filtros defensivos |
| Race en promote Inquiry → Deal | Baja | Bajo | Unique constraint en DB. UI catch + refresh |
| Inquiry/Deal counts no balancean post-migración | Media | Medio | MIG2: `count(inquiry) + count(deal) == count(leads pre-mig)`. Falla loud |
| Bot en producción rompe | Media | Crítico | Bot mock hoy. Cuando se conecte ya está el modelo nuevo |
| Refactor toca demasiados módulos → rama larga | Alta | Medio | Fasear R1-R51. Cada fase buildable |
| Drag&drop optimistic se desincroniza | Media | Bajo | Rollback visual + revalidate |
| Hard-delete futuro rompe integridad bidireccional Inquiry↔Deal | Baja | Medio | Política firme NO hard-delete. Cascade en SQL como red de seguridad |

---

## 10. Rollback plan

Si la migración rompe algo en prod: restaurar backup (Supabase point-in-time) + revertir merge del PR + investigar off-prod. No hay migración inversa.

---

## 11. Decisiones cerradas

| # | Decisión | Resolución |
|---|---|---|
| D1 | Modelo target | ✅ Contact + Inquiry + Deal (mirror Propertybase/HubSpot) |
| D2 | Unicidad de Contact en DB | ❌ NO UNIQUE constraint. Dedup en use case |
| D3 | Estrategia de dedup en migración | ✅ Phone first, email fallback, ambos NULL → no agrupar |
| D4 | Conservar `id` de leads como `id` de inquiry o deal | ✅ Preserva FKs sin re-mapping |
| D5 | Rename FKs en tablas dependientes | ✅ `appointments.lead_id → deal_id`. `bot_conversations.lead_id → contact_id`. `lead_property_queue.lead_id → contact_id` |
| D6 | Enums | ✅ Nuevos: `deal_stage_enum` (5 vals), `deal_source_enum`, `inquiry_status_enum`, `inquiry_source_enum` |
| D7 | Analytics historical events | ✅ Lectura tolerante. NO rewrite del historial |
| D8 | UI merge manual de contacts duplicados | ⏭️ Diferido a v2 |
| D9 | Etapas del Deal funnel | ✅ 5 fijas: visit_scheduled / negotiation / reserved / won / lost. Configurable por org en v2 |
| D10 | Vista Kanban | ✅ Incluida (dnd-kit). Vista tabla alternativa |
| D11 | Citas (`appointments`) — ¿atadas a contact o a deal? | ✅ Atadas a **deal**. Cuando se agenda cita en una Inquiry, primero se promueve a Deal |
| D12 | Queue del bot — ¿atado a contact o deal? | ✅ Atado a **contact** |
| D13 | Reusar Inquiry abierta en mismo contact+prop | ✅ SÍ — UNIQUE constraint en DB |
| D14 | Crear Inquiry nueva donde había Deal `won/lost` | ✅ Permite (interés renovado) |
| D15 | `lost_reason` obligatorio | UI sí pide. Backend opcional |
| D16 | `expected_close_at` y `closed_at` | ✅ Incluidos para forecasting |
| D17 | Promote Inquiry → Deal | ✅ Transacción atómica bidireccional. `inquiry.promoted_deal_id` ↔ `deal.inquiry_id`. Ambas FK declaradas para navegación sin JOIN extra |

---

## 12. Pre-flight checks antes de empezar I1

- [x] Branch `feat/contact-inquiry-refactor` creada desde `main`.
- [x] R1, R2, R3, R4, R5 completadas (Fase 1 Contact + Deal + R5 Contact schema).
- [x] Sin data real en dev DB (2026-05-13).
- [x] Acceso a Supabase MCP `apply_migration`.
- [x] Plan confirmado con Gonzalo (2026-05-13).
