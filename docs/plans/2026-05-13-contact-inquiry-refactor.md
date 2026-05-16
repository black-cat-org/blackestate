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
- ⏭️ **R8** — ~~Actualizar `appointments.ts`: `leadId` → `dealId`~~ **Diferida a R34** (Fase 8 — `features/appointments` migrate). Razón: el schema TS y el código consumidor deben moverse juntos para evitar romper el build a mitad del refactor. La migración SQL real de la columna sí ocurre en R12 (CREATE TABLE deal + ALTER appointments). El schema Drizzle TS se realinea con el código en R34.
- ⏭️ **R9** — ~~Actualizar `bot-conversations.ts`: `leadId` → `contactId`~~ **Diferida a R35** (Fase 8 — `features/bot` migrate). Misma razón que R8.
- [x] **R11** — Actualizar `lib/db/schema/index.ts` (barrel): exportar contact (ya), deal, inquiry, contact-property-queue. ✅ 2026-05-13. Cubierta progresivamente durante R5/R6/I3/R7 — cada nueva tabla agregada incluyó su export en el barrel. Verificación final: los 4 exports presentes en la sección "Contact + Inquiry + Deal refactor".

### Fase 3 — Migración SQL + apply en dev

- [x] **R12** — Escribir `drizzle/sql/026_contact_inquiry_deal_refactor.sql`. ✅ 2026-05-14. Contenido final:
  - BEGIN transaccional.
  - DDL types: 4 pgEnums (`deal_stage` 5 vals, `deal_source`, `inquiry_status`, `inquiry_source`).
  - DDL tablas: `contact`, `deal`, `inquiry`, `contact_property_queue`. Partial UNIQUE constraints (`deal_unique_active_contact_property`, `inquiry_unique_open_contact_property`) + partial indexes que Drizzle Kit no expresa (functional `lower(email)`, `deleted_at IS NULL` filters).
  - Bidirectional FK pair `deal.inquiry_id ↔ inquiry.promoted_deal_id` ambos `ON DELETE SET NULL` (Section 3 — declarados después de crear ambas tablas para evitar circular DDL).
  - RLS: 5 policies per tabla mirror de `017a_domain_rls_membership_check.sql` + defense-in-depth `is_org_member()`. **Contact diverge**: `select_org` y `select_trash` org-wide (sin filtro `created_by_user_id`) para soportar dedup cross-agent. UPDATE sigue agent-scoped. Documentación inline en Section 4.
  - Mapping algoritmo §3 con dos TEMP tables: `_migration_groups` (pre-genera `new_contact_id` via `gen_random_uuid()` en grouping para evitar pairing race en NULL-NULL groups) + `_migration_lead_to_contact`. Inserts diferenciados §3.3: lead→deal si tiene appointment activo o status won/lost; lead→inquiry el resto. Stage_order recompute scoped a `WHERE stage NOT IN ('won','lost') AND deleted_at IS NULL`.
  - COMMIT.
  - **Diferido a R34/R35** (sub-plan §3.4): FK switches `appointments.lead_id → deal_id`, `lead_property_queue → contact_property_queue` rename, `bot_conversations.lead_id → contact_id`. Estos cambios SQL deben aterrizar junto con la migración del código consumidor (features/appointments, features/bot) para no romper el build mid-refactor. Mismo razonamiento que la deferral de R8/R9 (schemas TS).
  - **Code reviews**: 3 rounds con `feature-dev:code-reviewer`. Round 1: 3 CRITICAL + 5 IMPORTANT → fixed. Round 2: 3 CRITICAL (`array_agg(...) FILTER (...) ORDER BY ...` syntax inválida — habría rollback en prod; stage_order incluía soft-deleted active → MIG10 gap; pairing race con `min(created_at)`) + 4 IMPORTANT → fixed. Round 3: 1 MINOR (CLAUDE.md exceptions phrasing impreciso) → fixed. Sin issues abiertos.
  - **Tests post-fix**: tsc ✅ / eslint ✅ / build ✅. Playwright + Supabase apply diferidos a R13.
- [x] **R13** — Aplicar migración R12 en Supabase dev via MCP `apply_migration`. ✅ 2026-05-14. Resultado `{"success":true}` registrado en `_migrations` como `20260514041933 contact_inquiry_deal_refactor`. Estado post-apply: contact 3 rows, deal 2 rows, inquiry 1 row, contact_property_queue 0 rows. Data split 100% consistente — 3 leads → 3 contacts (0 dedup; los leads tenían phone/email distintos) + 2 deals (leads con appointment activo o terminal status) + 1 inquiry (resto). TEMP tables `_migration_groups` / `_migration_lead_to_contact` ambos `to_regclass()` NULL → cleanup correcto. Legacy `leads` (3) y `lead_property_queue` (0) intactos para coexistence hasta R46.
- [x] **R14** — Validar §6.4. Rollback si discrepancias. ✅ 2026-05-14. Ejecutado contra dev post-R13. 9 invariantes verificados (3 del plan §6.4 + 6 extras): MIG1 promoted-pair (0), MIG2 deal.contact_id FK (0), MIG3 stage_order gaps (0), MIG4 mutual exclusion lead.id (0), MIG6 inquiry.contact_id FK (0), MIG7 property_id FK deal+inquiry (0), MIG8 partial UNIQUE active deal (0), MIG9 partial UNIQUE open inquiry (0), MIG10 count parity 3-leads = 2-deals + 1-inquiry (0 delta). RLS check: `relrowsecurity=t` y `relforcerowsecurity=t` para contact/deal/inquiry/contact_property_queue. stage_order dense `[0,1]` para los 2 deals visit_scheduled. Sin rollback necesario. Migration locks in cleanly.

### Fase 4 — Infrastructure repos

- [x] **R15** — `features/contacts/infrastructure/contact.model.ts`. ✅ 2026-05-14. Exporta `ContactRow` / `ContactInsert` derivados de `typeof contact.$inferSelect` / `$inferInsert`, mirror exacto de `lead.model.ts` / `property.model.ts`. Review: 1 IMPORTANT (semicolons inconsistentes con templates) — fixed. Verificado 5/5 model files existentes (lead, property, bot, appointment, organization) sin semicolons. tsc + eslint + build verdes. Cleanup de `ContactRecord`/`NewContactRecord` schema-level diferido a R46b (no es regresión — exports coexisten temporalmente con consumers cero, R46b graps + delete al final del sub-plan).
- [x] **R16** — `features/contacts/infrastructure/contact.mapper.ts` (null↔undefined). ✅ 2026-05-14. 4 funciones: `mapContactRowToEntity`, `mapContactRowWithCountsToEntity` (variant para JOINs con `activeInquiriesCount`/`lastInquiryAt`), `mapCreateDTOToInsert`, `mapPartialDTOToUpdate` (dual idiom `!== undefined` para NOT NULL fields vs `'key' in data` para clearable). Review: 2 IMPORTANT — (1) entity `deletedBy.userId` tightened de optional a required string (invariant ya garantizado por mapper); (2) `preferredChannel` runtime whitelist `toPreferredChannel()` reemplaza cast silencioso. Catalog fields (`catalogSentWithOrigin`/`catalogOpenedAt`) NO surfaced en entity ni mapper — DB defaults kick in. Diferido a R34 cuando bot module se migre. tsc + eslint + build verdes.
- [x] **R17** — `features/contacts/infrastructure/drizzle-contact.repository.ts`. ✅ 2026-05-14. 9 métodos del contract R2: findAll, findAllDeleted, findById, findByPhoneOrEmail (dedup), searchByQuery (ILIKE autocomplete), create, update, softDelete, restore. Toda query envuelta en `withRLS(ctx, ...)`. Throw tokens: `CONTACT_NOT_FOUND_OR_NO_PERMISSION` (generic) + `CONTACT_NOT_FOUND`/`CONTACT_ALREADY_RESTORED`/`CONTACT_NO_PERMISSION` (restore disambiguation). Mapper extension: agregué `normalizeContactPhone` + `normalizeContactEmail` helpers usados en write paths (create + update) y por `findByPhoneOrEmail` lookup — garantiza hit-rate de partial indexes de migration 026 y semántica byte-exact entre write y read. Review: 2 CRITICAL (findByPhoneOrEmail + searchByQuery sin `organization_id` filter explícito — bypass de partial indexes + super-admin RLS leak) → fixed. Scope expandido por "zero tolerance": agregué org filter a TODOS los métodos restantes (findAll/findAllDeleted/findById/update/softDelete/restore + disambiguation SELECT) por consistencia. + 1 IMPORTANT doc clarification (UpdateContactDTO comment alineado con semántica real `undefined`-key = clear). tsc + eslint + build verdes. Catalog tracking fields siguen sin surface (R34 los activará).
- [x] **I4** — `features/inquiries/infrastructure/inquiry.model.ts`. ✅ 2026-05-14. Mirror exacto de `contact.model.ts` (R15) — `InquiryRow` / `InquiryInsert` derivados de `typeof inquiry.$inferSelect/$inferInsert`, sin semicolons, JSDoc espejo. Review: 0 issues. Coexistencia con `InquiryRecord`/`NewInquiryRecord` schema-level diferida a R46b cleanup. tsc + eslint + build verdes.
- [x] **I5** — `features/inquiries/infrastructure/inquiry.mapper.ts` (join contact + property + deal cuando promoted). ✅ 2026-05-14. 4 funciones: `mapInquiryRowToEntity`, `mapInquiryRowWithJoinsToEntity` (recibe `InquiryJoinedFields` con 5 campos: contactName/Phone/Email + propertyTitle + promotedDealStage), `mapCreateDTOToInsert(data, ctx, contactId)` (dual-mode resolution vive en use case R23 — mapper recibe contactId ya resuelto), `mapPartialDTOToUpdate` (narrow: solo `source`/`message`, `'key' in data` idiom para clear semantic). Sin runtime whitelist para source/status — enum PG (`inquiry_source_enum`/`inquiry_status_enum`) garantiza valid values. Review: 1 IMPORTANT (entity `deletedBy.userId` optional vs Contact required post-R16) → fixed con mismo invariant tightening. tsc + eslint + build verdes.
- [x] **I6** — `features/inquiries/infrastructure/drizzle-inquiry.repository.ts` con `promote` atómico (single tx: insert deal + update inquiry). ✅ 2026-05-14. 14 métodos: findAll/findAllOpen/findAllArchived/findAllDeleted (joined queries con LEFT JOIN contact + properties + deal), findById, findByContactId, findByPropertyId, findOpenByContactAndProperty (dedup), create, update, discard (FOR UPDATE lock + status guard defense-in-depth), promote (atomic tx: FOR UPDATE inquiry + INSERT deal + catch 23505 → `deal_already_active` + UPDATE inquiry status='promoted'), softDelete, restore. Org filter explícito en TODOS los queries. Review: 8 issues (2 CRIT + 6 IMP) TODOS resueltos: (1) stageOrder comment clarified; (2) discard TOCTOU → FOR UPDATE + status guard UPDATE WHERE; (3) isUniqueViolation 3-level depth check; (4) promote JSDoc clarified same-inquiry vs cross-inquiry race; (5) token casing inconsistency → R46c cleanup task agregada; (6) unsafe cast eliminado via Pick<CreateInquiryDTO> en mapper; (7) JoinedInquiryRow drift → keys-match Record assertion; (8) cross-feature infra import documented en CLAUDE.md Import Rules. tsc + eslint + build verdes.
- [x] **R18** — `features/deals/infrastructure/deal.model.ts`. ✅ 2026-05-14. Mirror exacto de R15 (contact) + I4 (inquiry). `DealRow`/`DealInsert` derivados de `typeof deal.$inferSelect/$inferInsert`. Sin semicolons. Review: 0 issues. tsc + eslint + build verdes. **Nota de orden:** ejecutado antes de I6 (no en el orden literal del plan) porque `IInquiryRepository.promote` necesita `mapDealRowToEntity` (R19); secuencia real es R18 → R19 → I6 → R20. Sub-plan trackea checkboxes (orden de ejecución no determinante).
- [x] **R19** — `features/deals/infrastructure/deal.mapper.ts` (join contact + property + inquiry). ✅ 2026-05-14. 4 funciones: `mapDealRowToEntity`, `mapDealRowWithJoinsToEntity` (4 joins: contactName/Phone/Email + propertyTitle), `mapCreateDTOToInsert(data, ctx, contactId, stageOrder)` (adapter computa stageOrder=MAX+1), `mapPartialDTOToUpdate` (dual idiom — `!== undefined` para NOT NULL stage/wantsOffers/propertyId, `'key' in data` para 7 clearable). Defaults aplicados en mapper boundary: `stage ?? 'visit_scheduled'`, `wantsOffers ?? false`. Lifecycle columns (`closedAt`/`lostReason`) NO expuestos en create/update — solo via `moveDealStage` use case. Entity tightening: `deletedBy.userId: string` (required, R16/I5 mirror). Review: 2 IMPORTANT — (1) `new Date()` con string inválido → Invalid Date silent → reemplazado por `toDateOrNull()` defensive helper en ambos callsites; (2) 4-positional-param signature false-positive (type-safe, reviewer dijo "acceptable as-is"). tsc + eslint + build verdes.
- [x] **R20** — `features/deals/infrastructure/drizzle-deal.repository.ts`. ✅ 2026-05-14. 15 métodos: findAllActive (Kanban, ORDER BY stage,stageOrder), findAllClosed (won/lost, ORDER BY closed_at DESC NULLS LAST), findAllDeleted, findById, findByContactId, findByPropertyId, findByStage, findActiveByContactAndProperty (dedup), maxStageOrder (utility para use case), create (con MAX+1 stageOrder en tx), update, **moveStage** (atomic: FOR UPDATE lock + same-stage vs cross-stage branch + dest column increment + source column decrement + closedAt/lostReason lifecycle), **reorderInStage** (atomic: FOR UPDATE column lock + set validation con doble Set-comparison + per-row UPDATE loop con defense-in-depth predicates), softDelete, restore. Org filter explícito en TODOS los queries. Review: 4 actionable (2 CRIT + 2 IMP) TODOS fixed: (1) moveStage final UPDATE faltaba `isNull(deletedAt)` → added; (2) reorderInStage UPDATE loop faltaba `eq(stage)` + `isNull(deletedAt)` → added; (3) terminal_stage_reorder distinct token (en lugar de reorder_ids_mismatch overload); (4) reorderInStage validation SELECT `.for("update")` agregado. 3 false-positives marcados con evidencia. tsc + eslint + build verdes. Fase 4 (infrastructure repos) cerrada.

### Fase 5 — Application use cases

- [x] **R21** — `features/contacts/application/` (9 use cases). ✅ 2026-05-14. 9 files thin-delegation con DI pattern (recibe `IContactRepository` interface, presentation layer R23 inyecta `DrizzleContactRepository`). Single composer: `findOrCreateContactUseCase` (lookup → fallback create). Anti-pattern legacy de leads explícitamente NO heredado (lead uses cases instancian `DrizzleLeadRepository` direct, viola CLAUDE.md). EC13 (hard-error deleting contact con deals activos) diferido a R23 server action layer (donde ambos repos están en scope) — documented inline. tsc + eslint + build verdes. Review: 0 issues actionable. Fase 5 contact use cases cerrada.
- [x] **I7** — `features/inquiries/application/` (10 use cases). ✅ 2026-05-14. 9 thin delegates + 1 composer (`createInquiryUseCase`). Composer features: dual-mode contact resolution (`contactId` precedence over `contactDraft`), throw `inquiry_missing_contact` cuando neither presente, EC8 reactivation (return existing open inquiry as-is, NO patch source/message — para ese caso el agente usa updateInquiry explícito). Cross-feature App→App import: createInquiry importa `findOrCreateContactUseCase` (documented exception en CLAUDE.md Import Rules table). promoteInquiry delegate puro sin `dealRepo` (atomicity vive en inquiryRepo.promote per §4.4). Review: 1 CRITICAL (contract JSDoc `findOpenByContactAndProperty` decía "reactiva con updates" pero use case retorna as-is — corregido a "return as-is, EC8 reactivation") + 1 IMPORTANT (App→App cross-feature undocumented en CLAUDE.md — added row con justification). Tokens: nuevo `inquiry_missing_contact` documentado in createInquiry JSDoc. tsc + eslint + build verdes.
- [x] **R22** — `features/deals/application/` (11 use cases). ✅ 2026-05-14. 10 thin delegates + 1 composer (`createDealUseCase`). Composer features: dual-mode contact resolution (contactId precedence), throw `deal_missing_contact`, dedup via `findActiveByContactAndProperty` (returns existing active Deal; past won/lost no bloquean fresh). moveDealStage + reorderDealsInStage son pure delegates (atomicity en repo). Cross-feature App→App import documented en CLAUDE.md (heredado de I7). Review: 2 IMPORTANT — (1) inquiryId silent drop on dedup hit fixed via dealRepo.update patch when existing.inquiryId undefined (preserves first-Inquiry attribution; never overwrites established link); (2) `maxStageOrder` dead surface on IDealRepository (use case nunca lo invoca, repo's create computes internally) — removed contract + impl. tsc + eslint + build verdes. Fase 5 (use cases) cerrada.

### Fase 6 — Server Actions + components base

- [x] **R23** — `features/contacts/presentation/actions.ts`. ✅ 2026-05-14. 8 server actions (4 reads + 4 mutations) con DI pattern: módulo-level singletons `contactRepo` + `dealRepo` construidos en presentation boundary (Clean Arch: Application no instancia adapters). `deleteContactAction` enforza EC13 cross-feature — query `getDealsByContactUseCase(ctx, dealRepo, id)` + filter `!TERMINAL_DEAL_STAGES.includes(d.stage)`; si activeCount>0 throw `contact_has_active_deals:<count>` (suffix N permite render UI sin segundo roundtrip). Race window agent-crea-deal-entre-read-y-write documentado en JSDoc — best-effort UX armour, no atomicity (futuro SQL trigger si race se vuelve problema real). Reviewer: 2 IMPORTANT + 1 MINOR. **Fix #1 (DRY)**: extraído `TERMINAL_DEAL_STAGES: ReadonlyArray<DealStage>` desde `features/deals/domain/deal.entity.ts` (pure domain constant, no infra leak), repo Drizzle (7 refs) y action (1 ref) lo consumen — single source of truth para "is closed". **Fix #2 (token-casing R46c)**: nota inline en JSDoc documenta que Contact feature predates lowercase snake_case convention (Inquiry/Deal), token nuevo `contact_has_active_deals:<count>` sigue nueva convención, R46c hará sweep de legacy SCREAMING tokens. **MINOR (empty query)**: false-positive — repo `searchByQuery` ya short-circuit en string vacío. tsc + eslint + build verdes.
- [x] **R24** — `features/contacts/presentation/components/` (lista, detalle con sub-secciones, edit dialog, **contact-autocomplete reusable**). ✅ 2026-05-14. 10 componentes mirror del pattern leads + 1 shared util + 1 primitive UI + 1 LABELS + 1 Zod schema. **Componentes nuevos:** `contact-channel-badge`, `contact-actions-menu`, `contact-edit-dialog` (dual create+edit), `contact-filters`, `contact-columns`, `contact-data-table`, `contact-detail-header`, `contact-detail-info`, `contact-trash-list`, `contact-autocomplete` (Popover+Command reusable para Deal create flow). **Shared util:** `features/contacts/presentation/contact-error-messages.ts` (3 helpers `describeContactDeleteError`/`describeContactRestoreError`/`describeContactSaveError`) — single source of truth para mapping de tokens server-action → copy es-BO; previene drift cuando R46c haga el sweep SCREAMING → lowercase. **UI primitive:** `components/ui/command.tsx` (shadcn standard, depende de `cmdk` 1.1.1 instalado). **Constants:** `lib/constants/contact.ts` con `PREFERRED_CHANNEL_LABELS: Record<ContactPreferredChannel, string>` (typed para que adding un canal nuevo sea compile error). **Zod:** `lib/validations/contact.ts` con `contactFormSchema` + `parseTagsInput`/`serializeTagsInput` helpers (tags comma-separated UI ↔ `string[]` DTO). Sub-secciones cross-feature del detalle (Inquiries/Deals/Citas/Bot) DIFERIDAS a R39 page composition — R24 entrega Contact-only detail primitives, R39 ensambla con sibling features. Forms: react-hook-form + zodResolver + shadcn Form/FormField/FormMessage + noValidate per memory `feedback_forms_react_hook_form`. Date locale `es-BO` per CLAUDE.md (legacy leads usaba `es-AR` erróneamente). Reviewer: 2 CRITICAL + 4 IMPORTANT + 1 MINOR + 3 false-positives. **Fix C1 (stale-response clobber)**: autocomplete usa `searchSeqRef` monotonic counter, discarda respuestas de queries obsoletas. **Fix C2 (empty-query create misfire)**: "Crear nuevo contacto" oculto cuando `trimmedQuery.length === 0`; `handleCreate` guard adicional. **Fix I1 (DRY describeDeleteError)**: extraído a shared util `contact-error-messages.ts`. **Fix I2 (dead CONTACT_NOT_FOUND branch)**: eliminado, replaced por `describeContactSaveError` que solo mapea tokens que el action realmente throw. **Fix I3 (CONTACT_NOT_FOUND_OR_NO_PERMISSION no mapeado en restore)**: agregado al switch. **Fix I4 (no clear-channel option)**: agregado SelectItem `Sin preferencia` con `NO_CHANNEL_SENTINEL` (Radix Select prohibe `value=""`). **Fix M1 (`query.trim()` repetido)**: extraído `trimmedQuery` const. False-positives marcados con evidencia: I5 (`cmdk` legítimamente separate de Radix), M2/M3 (`contact-detail-info`/`contact-channel-badge` válidos RSC). tsc + eslint + build verdes. Playwright smoke diferido a R39 (R24 son primitives sin ruta).
- [x] **I8** — `features/inquiries/presentation/actions.ts` (auth path, server actions). ✅ 2026-05-14. **Split** del scope original: I8 entrega auth actions, I8b NEW entrega public path (RPC + public-actions.ts). 12 server actions con DI pattern mirror R23 Contact: `getInquiriesAction`, `getOpenInquiriesAction`, `getArchivedInquiriesAction`, `getDeletedInquiriesAction`, `getInquiryByIdAction`, `getInquiriesByContactAction`, `getInquiriesByPropertyAction`, `createInquiryAction` (composer, dos repos en scope porque resuelve Contact + Inquiry), `discardInquiryAction`, `promoteInquiryAction` (retorna `{ deal, inquiry }` post-tx), `deleteInquiryAction`, `restoreInquiryAction`. Module-level singletons `contactRepo` + `inquiryRepo` en presentation boundary (CLAUDE.md-documented App→App cross-feature exception: createInquiry composer importa `findOrCreateContactUseCase`). **Race-retry en createInquiryAction**: catchea 23505 (partial UNIQUE `inquiry_unique_open_contact_property`) y reintenta el use case una vez — segundo pass ve el winner via `findOpenByContactAndProperty` y reactiva. Bounded a 1 retry. Throw tokens lowercase passthrough (`inquiry_not_found`, `inquiry_not_open`, `deal_already_active`, etc.) — sin re-wrap, consumers I9 mapean a copy. **Use cases nuevos en this ticket**: `getArchivedInquiriesUseCase` + `getDeletedInquiriesUseCase` (thin delegates a `findAllArchived` y `findAllDeleted`) que I7 omitió originalmente — sort orders distintos (`updated_at DESC` y `deleted_at DESC` respectivamente) que no son expresables como filtro sobre `getInquiriesUseCase`. Reviewer: 2 IMPORTANT + 0 critical. **Fix I-1 (isUniqueViolation divergence)**: hoisted helper a `lib/utils/pg-errors.ts` con guards `\| null \| undefined` canónicos. Repo y action ambos importan, eliminadas las copias duplicadas (3-level depth para raw pg / drizzle wrap / pool re-wrap). **Fix I-2 (missing archived/deleted actions)**: agregados los 2 use cases + 2 actions documentados arriba. tsc + eslint + build verdes. Playwright smoke diferido a I9 (no UI consumer aún).
- [x] **I8b** — Public path completo (RPC + public-actions + form refactor). ✅ 2026-05-14. **SQL migration `028_public_create_inquiry_rpc.sql`** aplicada via Supabase MCP: SECURITY DEFINER RPC `public_create_inquiry(p_property_id, p_name, p_phone, p_email, p_message)` returns text. `set search_path = ''` + `RAISE … USING errcode` patterns mirror `bootstrap_organization`/`accept_invitation` (007). Validations: name required (22023), at least one of phone/email (22023), property active+non-deleted (02000). Canonicalisation byte-byte con JS mapper (phone strip `[^0-9+]`, email lower+trim). Find-or-create Contact: phone-first dedup (LATAM identity strength), email fallback, ORDER BY created_at, id LIMIT 1 explícito. **EC8 reactivation race-safe**: pre-INSERT SELECT short-circuits hot path; cold-path race cerrada via EXCEPTION block sobre `unique_violation` que re-fetcha el winner row (FOR UPDATE no sirve sin row existente). Grants: REVOKE FROM public + GRANT TO anon, authenticated (función nunca trustea caller, deriva org de property server-side). **Zod schema `lib/validations/public-inquiry.ts`**: `publicInquiryFormSchema` narrow (name/phone/email/message). Drops 4 legacy lead-form fields (budget/zone/typeSought/wantsOffers) — pertenecen a Deal, no Inquiry. **`features/inquiries/presentation/public-actions.ts`**: `createPublicInquiryAction(propertyId, formData)` llama `supabase.rpc('public_create_inquiry', ...)` vía `getSupabaseServerClient()` (anon path por cookies vacías en visitor sin login). Throws lowercase tokens unwrapped: `invalid_input`/`name_required`/`contact_missing_phone_and_email`/`property_not_found_or_inactive`/`public_inquiry_failed`. Native `new Error(msg, { cause })` ES2022 ErrorOptions. **Form refactor**: `LandingContactForm` ahora imports `createPublicInquiryAction` directo (drop `submitInquiryAction` wrapper que era dead indirection), usa try/catch + toast + `describeSubmitError` map (anti-pattern `{ success, error }` eliminado per `feedback_http_status_codes`). 4 fields legacy removidos del UI. **Cleanup colateral**: `lib/validations/lead.ts` eliminado (zero consumers post-refactor, `feedback_no_dead_code`); `app/p/[id]/actions.ts` queda solo con `trackVisitAction`; `app/p/[id]/page.tsx` quita `source` prop del form (Inquiry source siempre `'public_form'`, marketing source sigue en `LandingPriceCard` + `LandingSourceTracker`); `drizzle/sql/README.md` documenta el slot 027 reservado para R46. Reviewer: 1 CRITICAL + 4 IMPORTANT + 2 MINOR. **Fix C1 (FOR UPDATE no cierra cold-path race)**: EXCEPTION-block on INSERT con re-fetch del winner. **Fix I1 (LIMIT 1 sin ORDER BY)**: ORDER BY `created_at, id` en todos los SELECT. **Fix I2 (email canonicalisation comment/code mismatch)**: comment clarifica trim-then-lower (orden equivalente ASCII vs JS mapper). **Fix I3 (`Error.cause` manual cast)**: native `new Error(msg, { cause: error })`. **Fix I4 (passthrough wrapper dead indirection)**: `submitInquiryAction` eliminado, form imports `createPublicInquiryAction` directo. **Fix M1 (gap 027 unannotated)**: README documenta. **Fix M2 (`lead.ts` dead)**: archivo eliminado. tsc + eslint + build verdes. Playwright smoke diferido a R39 page acceptance.
- [x] **I9** — `features/inquiries/presentation/components/` (lista filtrable, detalle, dialog crear, **promote-inquiry-dialog**, discard modal). ✅ 2026-05-14. 12 componentes mirror R24 + 3 support files. **Components**: `inquiry-status-badge`, `inquiry-source-badge`, `inquiry-actions-menu` (status-aware: promote/discard solo si `status === "open"`), `inquiry-columns`, `inquiry-data-table`, `inquiry-filters` (search + status + source), `inquiry-detail-header`, `inquiry-detail-info` (sub-secciones cross-feature diferidas a R39 mismo approach R24), `inquiry-trash-list`, `inquiry-create-dialog` (dual-mode contact resolution via Tabs + ContactAutocomplete R24 + property Select simple), `promote-inquiry-dialog` (minimal scope: stage + source + message, rest deferred a R27 deal-detail per decision #2), `discard-inquiry-dialog` (optional reason textarea). **Supporting**: `lib/constants/inquiry.ts` (INQUIRY_STATUS_LABELS + COLORS + INQUIRY_SOURCE_LABELS), `lib/validations/inquiry.ts` (Zod schemas create + promote + discard), `features/inquiries/presentation/inquiry-error-messages.ts` (5 token mappers — Create/Discard/Promote/Delete/Restore). **NEW cross-feature constants**: `lib/constants/deal.ts` (DEAL_STAGE_LABELS + DEAL_SOURCE_LABELS) — consumed por promote-inquiry-dialog y inquiry-detail-info, será reusable por R25-R27 deal components. **Helper rename**: `nullable()` → `emptyToUndefined()` en `lib/utils/form.ts` (renombre refleja semántica exacta — retorna `string | undefined` no `string | null`). 6 callers actualizados (3 inquiry dialogs + 2 appointments + 1 contact-edit-dialog) atómicamente. Reviewer: 6 IMPORTANT + 2 MINOR + 0 critical. **Fix I1 (STAGE/SOURCE duplicates)**: hoisted a `lib/constants/deal.ts`. **Fix I2 (superRefine cross-tab leak)**: schema discriminator `contactMode` agregado; superRefine valida solo branch activa; dialog sincroniza form state + `clearErrors` on tab switch. **Fix I3 (dead NONE_SENTINEL stage)**: removida la rama dead, Select simplificado. **Fix I4 (promotedDealStage raw enum)**: ahora usa `DEAL_STAGE_LABELS[stage]`. **Fix I5 (trash list disabled all rows)**: `disabled={isPending && restoringId === id}` para permitir restores concurrentes — aplicado también a contact-trash-list (R24) por consistencia. **Fix I6 (Tabs sin TabsContent)**: agregados TabsContent wrappers, ARIA pattern completo. **Fix M1 (`nullable` misleading)**: renombre canónico (8 archivos en total). **Fix M4 (deal_already_active deep-link gap)**: TODO comment con cross-ref a R27 (la acción layer no surface el conflicting deal id aún — protocol gap, tracked). tsc + eslint + build verdes. Playwright smoke diferido a R39 page acceptance.
- [x] **R25** — `features/deals/presentation/actions.ts`. ✅ 2026-05-14. 13 server actions mirror R23 Contact + I8 Inquiry pattern. **Reads (7)**: `getDealsAction` (Kanban activo), `getClosedDealsAction` (archive won/lost), `getDeletedDealsAction` (trash), `getDealByIdAction`, `getDealsByContactAction`, `getDealsByPropertyAction`, `getDealsByStageAction`. **Mutations (6)**: `createDealAction` (race-retry on 23505 igual que createInquiryAction), `updateDealAction` (JSDoc warning: NO tocar stage/stageOrder — usar `moveDealStageAction`), `moveDealStageAction` (Kanban drag entre columnas), `reorderDealsInStageAction` (Kanban reorder dentro de columna), `deleteDealAction`, `restoreDealAction`. Module-level singletons `contactRepo` + `dealRepo` (createDealUseCase es App→App composer documented exception). **Use cases nuevos en este ticket**: `getClosedDealsUseCase` + `getDeletedDealsUseCase` — thin delegates a `findAllClosed`/`findAllDeleted` que R22 omitió (mismo gap que I8 reviewer caught). Throw tokens lowercase passthrough: `deal_not_found`, `deal_already_restored`, `deal_no_permission`, `reorder_ids_mismatch`, `terminal_stage_reorder`. createDealAction race-retry usa canonical `isUniqueViolation` de `lib/utils/pg-errors`. Reviewer: 2 IMPORTANT + 0 critical. **Fix Issue 1 (stale "future" JSDoc en get-deals.use-case.ts)**: reemplazado por cross-ref a sibling use cases. **Fix Issue 2 (restoreDealAction sin JSDoc)**: agregado bloque docstring con 3 throw tokens documentados — paralelismo con `reorderDealsInStageAction` y `moveDealStageAction` (mismo pattern docblock-on-multi-token-mutations de R23 + I8). Minors marcados false-positive con evidencia (updateDealDTO type narrowing necesita verificación cross-caller separate, deal_already_active mapping intencional retry-en-action). tsc + eslint + build verdes. Playwright smoke diferido a R40.
- [x] **R26** — `features/deals/presentation/components/deal-create-dialog.tsx`. ✅ 2026-05-14. Manual Deal create dialog (no `inquiryId`; promote flow lives en `promote-inquiry-dialog` I9). Mirror del pattern I9 inquiry-create-dialog con scope ampliado: dual-mode contact (Tabs Existente/Nuevo + ContactAutocomplete R24), property Select (simple, lista pasada por prop como I9), stage + source en grid, message obligatorio nota, **Collapsible "Más detalles"** (budget, expectedCloseAt date input, propertyTypeSought, zoneOfInterest, wantsOffers Checkbox) — agent manual create implica que ya conoce qualification info, collapsed por default para no overwhelm. Schema `dealCreateFormSchema` en `lib/validations/deal.ts` con `contactMode` discriminator (mismo pattern superRefine I9). `expectedCloseAt` YYYY-MM-DD regex. Error mapping en `features/deals/presentation/deal-error-messages.ts` con 6 helpers (Create/Update/MoveStage/Reorder/Delete/Restore) — reusable por future Deal components (R27 detail, Kanban Fase 7). Reviewer: 2 IMPORTANT + 1 MINOR + 4 false-positives. **Fix I-2 (terminal stages selectable en create)**: schema usa `DEAL_STAGE_CREATE_VALUES` (subset que excluye won/lost) + Select filtra via `TERMINAL_DEAL_STAGES.includes()`. Crear un Deal directo en won/lost lo enviaba al archive sin pasar por Kanban — semantically incoherent. **Fix I-3 (duplicate enum tuples deal.ts ↔ inquiry.ts)**: extraídos a `lib/validations/_deal-enums.ts` (DEAL_STAGE_FORM_VALUES + DEAL_STAGE_CREATE_VALUES + DEAL_SOURCE_FORM_VALUES). Naming prefix `_` marca como internal shared dentro de `lib/validations/`. **Fix M-1 (NONE_SENTINEL duplicated 4 dialogs)**: extraído a `lib/constants/form.ts`. 4 dialogs updated (contact-edit, promote-inquiry, inquiry-create, deal-create); `NO_CHANNEL_SENTINEL` en contact-edit renombrado a `NONE_SENTINEL` por uniformidad. False-positives marcados con evidencia: I-1 (contactDraftEmail chain mismo pattern I9), I-4 (Zod gate + action defense), M-2 (Textarea spread intentional null-coalesce), M-3 (advancedOpen reset correctly added). tsc + eslint + build verdes. Playwright smoke diferido a R40 page acceptance.
- [x] **R27** — `features/deals/presentation/components/deal-detail-page.tsx`. ✅ 2026-05-14. Deal detail composer (header + info block) + edit dialog + lost dialog. Pattern mirror R24 contact-detail + I9 inquiry-detail. **Components nuevos (6)**: `deal-detail-page` (pure container), `deal-detail-header` (back nav + title `contact · property` + DealStageBadge + transition actions context-aware: activos ven Ganada/Perdida/Cambiar etapa, terminales ven Reabrir → activas, MoreHorizontal con Editar/Eliminar), `deal-detail-info` (InfoSection layout — Contact con phone/email href, Property link con fallback "Propiedad eliminada", Note, Lost reason solo si `stage='lost' && lostReason`, Calificación, Inquiry origin link, Source badge + dates `es-BO`), `deal-edit-dialog` (source/message/budget/typeSought/zone/wantsOffers/expectedCloseAt — NO permite editar contact/property/stage por design: cambio de contacto/property = Deal distinto, stage transitions van por `moveDealStageAction`), `lost-deal-dialog` (single atomic call), `deal-stage-badge` (R32 shipped early — reusable badge consume `DEAL_STAGE_BADGE_CLASSES` + `DEAL_STAGE_LABELS`). **Domain extension**: `MoveDealStageInput.lostReason?: string` agregado (JSDoc: ignorado si `toStage != 'lost'`, limpiado al reopen, Kanban drag lo deja undefined). **Infra change**: `drizzle-deal.repository.moveStage` escribe `lost_reason` atómico cuando `toStage='lost' && lostReason !== undefined` — single UPDATE en una transacción, sin race window entre "reason saved" y "stage flipped". **Schema additions**: `dealEditFormSchema` (excluye contactId/contactDraft/propertyId/stage), `lostDealFormSchema` (`lostReason` optional max 2000). **Constants addition**: `DEAL_STAGE_BADGE_CLASSES: Record<DealStage, string>` con Tailwind (blue/amber/indigo/emerald/zinc). **Discusión 2 calls vs 1 call para lost**: usuario eligió **Option A** — extender `MoveDealStageInput` con `lostReason` para garantía atómica nivel DB. Updated dto `updateDealAction` quedó libre de stage-side-effect concerns. Reviewer: 2 IMPORTANT + 1 design-concern (no-bug). **Fix Issue 1 (stale JSDoc en lostDealFormSchema)**: reescrito documentando el call atómico actual. **Fix Issue 2 (concurrent mutations posibles)**: `disabled={isPending}` agregado al MoreHorizontal trigger button. **Issue 3 (property soft-delete dead-end)**: reviewer marcó "not a code bug, product concern" — sin cambio en R27. tsc + eslint + build verdes. Playwright smoke diferido a R40 page acceptance (`/dashboard/deals/[id]` route es R40).

### Fase 7 — Kanban UI (drag&drop)

- [x] **R28** — Elegir lib drag&drop. ✅ 2026-05-14. **Decisión: `@dnd-kit`** — precedente locked: `@dnd-kit/core ^6.3.1`, `@dnd-kit/sortable ^10.0.0`, `@dnd-kit/utilities ^3.2.2` ya instalados y activos en `features/leads/presentation/components/lead-bot-timeline.tsx`, `features/leads/presentation/components/lead-property-queue-item.tsx`, `features/properties/presentation/components/property-form/steps/media-step.tsx`. Build verde con React 19.2.3 + Next 16.1.6. Alternativas descartadas: `@hello-pangea/dnd` (duplicaría paradigma DnD en codebase), `pragmatic-drag-and-drop` (Atlassian, low-level sin sortable list nativo), `react-dnd` (legacy), `swapy` (animaciones de swap, no Kanban completo). **Arquitectura locked** para R29-R31: `<DndContext>` top-level (R31, sensors `PointerSensor` con `activationConstraint: { distance: 8 }` + `KeyboardSensor` a11y, collision `closestCorners`), `<SortableContext items={deals}>` por columna (R29 column droppable), `<DealCard>` con `useSortable` (R30, card completa draggable, no handle dedicado). **5 decisiones de diseño locked**: (1) card completa draggable, no drag handle dedicado — distance:8px activation evita disparar drag en clicks de detail link. (2) terminal stages (won/lost) NO son drop targets — drag accidental a terminal incoherente con confirm flow; Kanban muestra solo activos (`visit_scheduled`, `negotiation`, `reserved`); won/lost viven en archive view. (3) `DragOverlay` para card flotante — estándar dnd-kit, evita layout shifts, mejor perf en columnas largas. (4) Empty column placeholder con texto "Suelta aquí" cuando `isOver && empty` — evita drop ambiguo. (5) Sensor `activationConstraint: { distance: 8 }` para PointerSensor + keyboard sensor estándar (enter/space + arrows). **Flow optimistic update + rollback**: `onDragEnd` → snapshot → `setState` optimista → `startTransition` → `reorderDealsInStageAction` (same stage) o `moveDealStageAction` (cross-stage) → si throw restaurar snapshot + `toast(describeDealMoveStageError)` → si ok `router.refresh()`. Backend cero cambios: actions R25 + repo R20 garantizan atomicidad de compactación `stage_order` single-tx. **Ticket no-code** — solo locked decisions; implementación arranca en R29.
- [x] **R29** — `deal-kanban-column.tsx`. ✅ 2026-05-14. Pure presentational Kanban column + drop target. Props `{ stage, dealIds, children, isDragOver? }` — children + dealIds en vez de `deals[]` separa column de card concerns, ship sin R30. `useDroppable` con id `column-${stage}` para que columnas vacías sigan siendo drop targets (sortable items no catch drops si lista vacía). `SortableContext items={dealIds} strategy={verticalListSortingStrategy}` wrapping children. Header con DealStageBadge + count derivado de `dealIds.length` (single source of truth). Empty state dual: `"Sin negocios"` muted cuando empty && !showDropIndicator, `"Suelta aquí"` cuando showDropIndicator. Drop indicator color stage-matched vía nueva constante `DEAL_STAGE_DROP_INDICATOR_CLASSES` en `lib/constants/deal.ts` (ring + bg tint mirror DEAL_STAGE_BADGE_CLASSES). Reviewer: 2 IMPORTANT + 1 MINOR + 1 self-resolved no-issue. **Fix Issue 1 (count vs dealIds.length invariant)**: prop `count` eliminado; header lee `dealIds.length` directo. Sin posibilidad de UI bug por desync. **Fix Issue 2 (isOver no fires en cols no-vacías)**: prop opcional `isDragOver?: boolean` añadida — R31 setea desde `useDndMonitor` en top-level DndContext, column compone `isOver || isDragOver` para indicador uniforme empty + non-empty. **Fix Issue 3 (placeholder solo empty)**: consecuencia directa de #2, resuelto al unificar `showDropIndicator` flag. Issue 4 (Tailwind v4 sintaxis) reviewer mismo lo concluyó no-issue. tsc + eslint + build verdes. Playwright smoke diferido a R33/R40 (column no se compone hasta R31 monte DndContext y page exponga vista Kanban).
- [x] **R30** — `deal-card.tsx`. ✅ 2026-05-14. Sortable Kanban card. Whole card draggable per R28 (no handle dedicado) — `{...attributes} {...listeners}` en outer div, `useSortable({ id: deal.id })`. Inner `<Link href="/dashboard/deals/${deal.id}">` para click → nav (R40 route placeholder OK, 404s pero no crashea). Card content: contactName (fallback "Sin contacto"), propertyTitle truncado muted, meta row condicional con Source Badge (DEAL_SOURCE_LABELS) + expectedCloseAt format `es-BO` short ("14 may."). `isDragging` → `opacity-30` para que original act as ghost slot (R31 DragOverlay clona). `touch-none cursor-grab active:cursor-grabbing`. Dos tab stops por card intencionales (outer draggable + inner Link) — explicado en JSDoc, no a11y violation. Reviewer: 2 IMPORTANT + 0 critical. **Fix Issue 1 (transition stutter al drag end)**: `transition: isDragging ? undefined : transition` para evitar settle animation simultánea con DragOverlay move — mirror del `media-step.tsx` precedent. Comment inline explicando. **Fix Issue 2 (R31 sensor hard-dependency invisible)**: JSDoc reforzado con ⚠️ HARD DEPENDENCY block — sin `activationConstraint: { distance: 8 }` en R31 PointerSensor, every tap on touch device consume `pointerdown` antes que `<Link>` click fire → cards no-navegables en mobile. Card NO debe mount fuera de `<DndContext>` con sensor constrained. Falsos positivos marcados con evidencia: `<span />` empty placeholder (flex spacer pattern), `opacity-30` ghost level (deliberate, ghost es structural no informational), `showMetaRow` flag (clean), `"Sin contacto"` fallback (entity marca contactName? optional para non-joined endpoints, fallback defensivo cero costo). tsc + eslint + build verdes. Playwright smoke diferido a R33/R40.
- [x] **R31** — `deal-kanban.tsx` (drag&drop + optimistic update + rollback). ✅ 2026-05-15. Top-level Kanban composer que cierra Fase 7. Monta `<DndContext>` con `PointerSensor({ activationConstraint: { distance: 8 } })` + `KeyboardSensor({ coordinateGetter: sortableKeyboardCoordinates })` (a11y nativo dnd-kit), `collisionDetection: closestCorners`. Renders `ACTIVE_STAGES` (visit_scheduled, negotiation, reserved) — terminales excluidas per R28 decision. Wrapper `flex gap-4 overflow-x-auto` para horizontal scroll. `<DragOverlay>` clona DealCard durante drag. **State machine optimistic**: `grouped: DealsByStage` (Record<DealStage, Deal[]>) local state + `activeId` para overlay + `overStage` tracking via `onDragOver` para que columns reciban `isDragOver` uniforme (resuelve gap R29 documented). useEffect resync cuando parent refetches `deals` prop. **Drop resolution**: `parseDropTarget(overId, grouped)` — si starts `column-${stage}` → empty drop, append at end. Si UUID → find owning stage, insertIndex = card position. `findSourceStage(activeId, grouped)` scan ACTIVE_STAGES. **Operation router**: fromStage === toStage → `arrayMove + reorderDealsInStageAction(stage, newIds)`. Cross-stage → splice out + splice in + `moveDealStageAction(id, { toStage, toOrder })`. **Optimistic + rollback**: setGrouped(next) sync → startTransition(action) → throw → setGrouped(serverGroupedRef.current) + toast. Success → router.refresh() para reconciliar con server state. No bloquea drags durante isPending — last-write-wins idempotente a nivel DB (R20 adapter rewrites stage_order atomically). Reviewer: 1 CRITICAL + 1 IMPORTANT + 5 false positives. **Fix Critical 1 (rollback race condition concurrent drags)**: `serverGroupedRef = useRef<DealsByStage>` actualizado SOLO en useEffect (server-confirmed). Rollback siempre a `serverGroupedRef.current` en vez de closure snapshot. Failure mode protegido: A optimista S1, B captures grouped=S1 como snapshot, A throws (rollback a S0 vía ref), B throws (rollback a S0 vía ref — no S1 incorrecto). JSDoc reforzado explicando el failure mode. **Fix Important 2 (type guard narrowing)**: `isActiveStage(value): value is (typeof ACTIVE_STAGES)[number]` en vez de `value is DealStage` — narrowing correcto a los 3 valores active, no a los 5 del union completo. Non-breaking: subset narrowing assignable a DealStage. False positives marcados con evidencia del reviewer: arrayMove semantics (standard dnd-kit pattern), useEffect timing (startTransition awaits action antes router.refresh), over null guard (no mutation before guard), activeDeal memo (DealCard no renderiza stage), DragOverEvent import (used at handleDragOver line). tsc + eslint + build verdes. Playwright smoke diferido a R40 (page route monta el Kanban).
- [x] **R32** — `deal-stage-badge.tsx`. ✅ 2026-05-14 (shipped early en R27). Reusable badge component que consume `DEAL_STAGE_BADGE_CLASSES` (Tailwind: blue/amber/indigo/emerald/zinc) + `DEAL_STAGE_LABELS` desde `lib/constants/deal.ts`. Usado en `deal-detail-header` (R27); reusable por Kanban cards (R30), tabla de Deals (R33 toggle), y cualquier vista futura que muestre stage badge.
- [x] **R33** — Toggle Kanban ↔ Tabla en `/dashboard/deals`. ✅ 2026-05-15. **Cierra Fase 7**. 4 componentes nuevos + 1 cross-fix R30. **Components (4)**: `deal-actions-menu.tsx` (row dropdown: Ver detalle Link + Editar dialog + Eliminar DeleteConfirmDialog — mirror inquiry-actions-menu, scope acotado: stage transitions viven en detail header R27), `deal-columns.tsx` (Tanstack `ColumnDef<Deal>[]` — Contacto Link, Propiedad Link truncado, Etapa DealStageBadge, Origen Badge, Cierre estimado, Fecha createdAt sortable, Actions), `deal-data-table.tsx` (Tanstack table + paginación 10 rows mirror inquiry pattern), `deal-board.tsx` (top-level Kanban ↔ Table view toggle composer). **Decisiones**: (1) URL search param `?view=kanban|table` persiste preferencia — shareable, SSR-safe, sin localStorage hydration issues. (2) Default view Kanban si no `?view`. (3) Table scope = mismo dataset Kanban (findAllActive — non-deleted non-terminal). Archive won/lost diferido. (4) Toggle UI shadcn `<Tabs>` con `TabsContent` correctos. (5) Pagination 10 rows mirror inquiry. **API**: `<DealBoard deals={...} />` — single prop, parent (R40 page) fetches via getDealsAction. Reviewer: 1 CRITICAL + 2 IMPORTANT + 2 self-cleared. **Fix Critical 1 (useSearchParams sin Suspense boundary)**: `DealBoard` ahora wrappa inner `DealBoardInner` con `<Suspense fallback={null}>`. Caller R40 no debe conocer requirement Next.js 16 — self-contained. Pattern split mirror del sign-in flow. **Fix Important 2 (TabsContent ARIA semantics missing)**: surfaces ahora viven dentro de `<TabsContent value="kanban">` y `<TabsContent value="table">` — restablece `role="tabpanel"`, `aria-labelledby`, `tabindex="0"` que Radix Tabs primitive provee. Justificación previa (unmount) era incorrecta — `TabsContent` default `forceMount={false}` produce mismo unmount behavior. Pattern consistent con resto del codebase (analytics-content, deal-create-dialog, inquiry-create-dialog). **Fix Important 3 (year ambiguity expectedCloseAt cross-year)**: `shortDateFormatter` ("14 may." sin year) reemplazado por `dateFormatter` full DD/MM/YYYY tanto en `deal-columns.tsx` como en `deal-card.tsx` (R30 cross-fix atomic — mismo bug, single concept). expectedCloseAt es future-facing forecast, frecuentemente spans calendar years; sin year display era ambiguo. Reviewer auto-retractó 2 items: `isPending` disable correcto, `propertyId` non-null garantizado por entity contract. tsc + eslint + build verdes. Playwright smoke diferido a R40 (page route monta DealBoard con datos reales).

### Fase 8 — Migrar módulos dependientes

- [x] **R34** — `features/appointments`: `lead_id` → `deal_id`. ✅ 2026-05-15. **Cierra Fase 8 R34**. Migración cross-cutting masiva: SQL ALTER + Drizzle schema + entity + mapper + repo + use case + actions + validation + 6 componentes + page route + 3 cross-feature consumers, todo en un commit atómico. **SQL migration** `drizzle/sql/027_appointments_lead_to_deal.sql` (aplicada via Supabase MCP): rename `appointments.lead_id` → `deal_id`, FK switch a `deal(id) ON DELETE CASCADE`. Backfill 2-step: (1) match via lead → contact (phone-normalized regexp_replace + email lowercase) → deal por (contact_id, property_id, org_id); (2) auto-create deals para orphan (contact, property) pairs sin deal previo. R12 había creado deals al nivel de lead pero appointments existen al nivel de (lead, property) — 6 de 8 dev appointments quedaban sin deal. Backfill auto-create eleva stage_order via ROW_NUMBER() collision-free, default stage `visit_scheduled`. Verify 100% backfill via DO block, ALTER NOT NULL, drop lead_id FK + idx + column, add appointments_deal_id_idx. **Entity**: rename `leadId/leadName/leadPhone` → `dealId/contactId/contactName/contactPhone` denormalizados desde deal→contact join. CreateAppointmentDTO incluye `contactId` (dialog lo resuelve desde Deal seleccionado). **Repo**: `findByLead` → `findByDeal`. 7 queries refactor: `innerJoin(deal)` (NOT NULL FK garantiza presencia), `leftJoin(contact)`+`leftJoin(properties)` con fallbacks Spanish `FALLBACK_CONTACT_NAME` ("Sin contacto") / `FALLBACK_PROPERTY_TITLE` ("Sin propiedad") cuando upstream drift. **Components**: appointment-card nav a `/dashboard/deals/${dealId}`, appointment-create-dialog ahora selecciona un Deal (1 select en vez de 2 lead+property — propertyId inherited del deal seleccionado), appointments-view filter dropdown muestra `${contactName} · ${propertyTitle}` para disambiguar. **Page route**: `getDealsAction()` en vez de `getLeadsAction() + getPropertiesAction()`. **Cross-feature consumers updated**: `components/dashboard/upcoming-appointments.tsx` (+ fix bugs preexistentes: locale `es-AR` → `es-BO`, "Proximas" → "Próximas"), `features/analytics/infrastructure/analytics.service.ts` (alert description), `features/shared/presentation/components/trash-content.tsx` (search predicate + placeholder copy). **`getLeadColor` util retains its name** — feature-agnostic hash util, rename diferido a R35 cuando bot module se migre. Reviewer: 3 CRITICAL + 4 IMPORTANT + 2 MINOR + 2 false-positives. **Fix Critical 1 (phone byte-exact match vs R12 normalized)**: SQL backfill ahora usa `c.phone = NULLIF(regexp_replace(l.phone, '[^0-9+]', '', 'g'), '')` mirror del R12 normalization. Dev DB verificado: 0 leads con phone formateado → backfill ya correcto, fix protege futuras applies en prod. **Fix Critical 2 (LEFT JOIN deal con NOT NULL FK)**: 7 queries en repo cambiadas a `innerJoin(deal)` — FK NOT NULL + CASCADE garantiza presencia, INNER JOIN refleja semántica correcta. **Fix Critical 3 (`contactId: ""` hardcoded en create)**: CreateAppointmentDTO extendido con `contactId: string`, dialog pasa `deal.contactId`, repo create usa `data.contactId`, stale comment reescrito. **Fix Important 4 ("Unknown" English string literal)**: extraído a `FALLBACK_CONTACT_NAME` / `FALLBACK_PROPERTY_TITLE` constants Spanish. **Fix Important 5+6 (upcoming-appointments locale + accent)**: `es-AR` → `es-BO`, "Proximas" → "Próximas". **Fix Important 7 (trash-content placeholder lead → contacto)**: "Buscar por contacto o propiedad…". **Fix Minor 8 (stale create comment)**: reescrito reflejando contactId real en DTO. **Fix Minor 9 (deal filter ambiguity)**: label compuesto contactName + propertyTitle. False positives marcados con evidencia del reviewer: ROW_NUMBER stage_orders collision-free, DISTINCT ON deal selection deterministic. tsc + eslint + build verdes. DB post-migration: 8 appointments active, 0 NULL deal_id, 4 distinct deals referenced (2 originales + 3 auto-creados). Playwright smoke diferido (dev env + R40 page route pendiente).
- [x] **R35** — `features/bot`: `bot_conversations.lead_id` → `contact_id`. ✅ 2026-05-15. **SQL migration** `drizzle/sql/029_bot_conversations_lead_to_contact.sql` (renombrada de 028 por colisión con `028_public_create_inquiry_rpc.sql` — reviewer Critical catch). Migración rename-only sin backfill: 0 bot_conversations + 0 bot_messages en dev DB. Drop FK + drop index + RENAME column + add FK to contact (ON DELETE CASCADE matching R34 precedent) + add index. **Drizzle schema**: `lib/db/schema/bot-conversations.ts` — leadId → contactId. **Domain entity**: 4 interfaces `BotMessage/SentProperty/BotActivity/AgentNotification` con leadId/leadName → contactId/contactName. **Repo interface**: 3 methods rename — `getMessagesByLead/getActivitiesByLead/getSentPropertiesByLead` → `*ByContact`. **Mapper + Drizzle adapter**: param rename, query join via `botConversations.contactId`. **Application**: 3 use cases function names + params. **Actions**: 3 actions rename `*ByLeadAction` → `*ByContactAction`. **Components (5)**: bot-leads-view interno `LeadSummary` → `ContactSummary`, nav `/dashboard/leads/${id}` → `/dashboard/contacts/${id}`, bot-type-view + bot-activity-log similares, bot-stats `a.contactId` + "Leads activos" → "Contactos activos", bot-view placeholder "Buscar por contacto o descripción..." + tab "Por Contacto". **Util rename (R34 deferred)**: `lib/utils/lead-colors.ts` → `lib/utils/stable-colors.ts` con `getStableColor`/`getStableColorLight`. JSDoc reescrito feature-agnostic. 5 consumidores actualizados (3 bot + 2 appointments). **Cross-feature consumers**: `app/dashboard/leads/[id]/page.tsx` (legacy leads page, alive hasta Fase 10 R46+) — bot actions imports, `components/dashboard/recent-activity.tsx` nav + inline formatRelativeTime consolidado al canonical `lib/utils/relative-time` (eliminó pre-existing es-AR locale bug), `components/notifications/notification-bell.tsx` notification.contactId nav + mismo inline formatRelativeTime consolidation, `features/bot/presentation/components/bot-view.tsx` `a.contactName` en search. **`LeadChatDialog` (features/leads)** mantiene legacy mientras Fase 10 R46+ cleanup — comment inline justifica deferral. Reviewer: 1 CRITICAL + 3 IMPORTANT. **Fix Critical 1 (migration prefix collision 028)**: renombrado a `029`, comment header actualizado. **Fix Important 2 (stale "lead" copy bot-view)**: placeholder + tab label actualizados a "Contacto". **Fix Important 3 (inline formatRelativeTime es-AR)**: ambos files (recent-activity + notification-bell) ahora importan `formatRelativeTime` desde `@/lib/utils/relative-time` (dayjs locale "es", correct), eliminando duplicación + bug locale pre-existente. **Important 4 (Drizzle snapshot drift)**: documented operational cost de pattern manual-SQL — mismo gap que toda migration manual del proyecto, sin acción en este commit. tsc + eslint + build verdes. DB post-migration: bot_conversations.contact_id existe con FK a contact, lead_id dropped, index renombrado a bot_conv_contact_id_idx. Playwright smoke diferido (bot module mayormente stubs TODO).
- [x] **R36** — `features/analytics`: eventos nuevos con `contactId` + `inquiryId`/`dealId`. Métricas nuevas: "Consultas del mes", "Conversión Inquiry→Deal", "Conversión Deal→Won". ✅ 2026-05-15. **Cierra Fase 8**. Migración masiva 21 archivos (+832/-389 líneas) del vocabulario legacy `Lead/lead_status 6 buckets` al split `Inquiry (3 buckets) + Deal (5 stages)`. **Service rewrite** (`features/analytics/infrastructure/analytics.service.ts`, ~961 líneas): imports `getInquiriesAction + getDealsAction + getClosedDealsAction` reemplazando `getLeadsAction`. Constants `INQUIRY_STATUS_FILL: Record<InquiryStatus, string>` + `DEAL_STAGE_FILL: Record<DealStage, string>` raw HSL para recharts. Pure aggregators tomando arrays pre-fetched. **Funnel rebuild**: `getConversionFunnel()` ahora 2-fase = 3 buckets Inquiry (open/promoted/discarded) + 5 stages Deal (visit_scheduled/negotiation/reserved/won/lost) stitched en `FunnelStep[]` — el chart component es genérico, no requirió cambios estructurales. **Composite action**: nuevo `getAnalyticsDataAction()` con un solo `Promise.all` que feedea 6 tab data objects al page composer. **Page composer simplificado**: `app/dashboard/analytics/page.tsx` pasa de 34-action `Promise.all` a single composite call. **Nuevas métricas R36**: `Consultas nuevas` + `Conversión Consulta→Negocio` (promoted/total inquiries × 100) en Overview tab, `Conversión Negocio→Venta` (won/total deals × 100) en Inquiries tab. Cross-funnel rate (wonDeals/totalInquiries) reemplaza legacy lead-status. **Tab "Leads → Consultas"**: id `leads → inquiries`, label "Leads → Consultas", `LeadsTab → InquiriesTab` componente (file rename via `git mv`). 5 stats card (era 4) — STAT_ICONS extendido. **Chart renames via `git mv`** (history-preserving): `leads-by-source-stacked.tsx → inquiries-by-source-stacked.tsx`, `leads-by-property-type.tsx → inquiries-by-property-type.tsx`, `leads-trend-chart.tsx → inquiries-trend-chart.tsx`. Internal types, props, função names renamed accordingly. **Top-properties-table**: `PropertyRanking.leads → inquiries` (domain entity), `SortKey "leads" → "inquiries"`, `maxLeads → maxInquiries`. **Spanish copy migration**: ~10 chart components helpText/subtitle/labels migrados `lead/leads → consulta/consultas` siguiendo gender agreement Spanish neutral (es-BO). **Alerts copy**: "Lead sin contactar → Consulta sin atender", URL `/dashboard/leads/${id} → /dashboard/inquiries/${id}`. **Highlights**: "fuente con N leads → fuente con N consultas", "leads interesados → negociaciones activas" (fix semantic vs status mapping). **INQUIRY_SOURCE_OTHER_LABEL** constant importado donde `chartConfig.other.label` o fallback dedup necesarios (`source-donut`, `inquiries-by-source-stacked`). **Mock data preservada con instrumentación**: cada función mock o partial-mock recibe comment block `// MOCK: <kind>. Schema gap: <X>. TODO: <SQL>. Priority: P1|P2|P3. See docs/analytics-mock-debt.md.` describiendo el camino para migración real. Mock se mantiene as-is — analytics es UI maqueta pre-MVP, no se mostraron badges/disabled (user-confirmed). **Nuevo doc `docs/analytics-mock-debt.md`**: inventario consolidado de ~40 mock surfaces con kind (full/partial), schema gap (concreto), replacement SQL, prioridad P1/P2/P3. P1 quick-win = schema OK falta query (~20 fns). P2 minor schema add. P3 schema major (commission tracking, deal_stage_history, property_price_history). Reviewer: 2 CRITICAL + 2 IMPORTANT, todos resueltos (NO ACCEPTABLE rule). **Fix Critical 1 (won/lost deals siempre 0)**: `getDealsAction()` excluye terminal stages by design — todos los callers que cuentan won/lost (`getOverviewStats`, `getInquiriesStats`, `getConversionFunnel`, `getHighlights`, `getConversionBySource`) ahora hacen `Promise.all([getDealsAction(), getClosedDealsAction()])` + merge spread. Sin este fix, conversion rate + funnel won/lost bars + "Cerraste N ventas" highlight todos pintaban cero permanentemente en producción. **Fix Critical 2 (agent activity Spanish object keys)**: `getAgentActivityByDay()` emitía `{mensajes, propiedades, citas}` mientras `BotActivityArea` chartConfig esperaba `{messages, properties, appointments}` — chart pintaba flat. Renombradas variables + object keys a inglés matching config, comment justificativo agregado. CLAUDE.md "Strict English in code" enforcement. **Fix Important 3 (mock annotation refs non-existent column)**: comment block decía `bot_conversations.firstResponseAt (existe post-R35)` cuando la columna NO existe — verificado contra `lib/db/schema/bot-conversations.ts`. Rewritten para reflejar P2 = schema addition + alternativa sin schema change (aggregate bot_messages WHERE sender='contact'). **Fix Important 4 (mock-debt.md inaccuracies)**: doc marcaba `getConversionFunnel` y `getInquiriesStats` como ✅ ya real cuando won/lost gap los rompía — actualizado para reflejar fix R36; entry de responseRate corregido también. tsc + eslint + build verdes (exit 0). Playwright smoke diferido (analytics es UI maqueta, dev DB sin enough data poblada).
- [x] **R37** — `features/dashboard`: aggregations actualizadas. ✅ 2026-05-15. **Scope**: migrar `features/dashboard/infrastructure/dashboard.service.ts` del vocabulario `leads` al split `Inquiry/Deal`. Antes contaba `leads` por `status` (6 buckets legacy `new/contacted/qualified/proposal/negotiation/closed`); ahora cuenta `Inquiry` por `status` (3 buckets `open/promoted/discarded`) y `Deal` por `stage='won'` para conversion rate. **Service rewrite**: nuevo `getDashboardData()` composite que hace **un solo `Promise.all`** sobre `getInquiriesAction + getClosedDealsAction + getPropertiesAction + getAppointmentsAction + getUnreadNotificationCountAction + getAllActivitiesAction`, luego pasa el array compartido a pure helpers `aggregateInquiriesBySource()` + `aggregateInquiriesByStatus()`. Granulares (`getDashboardStats`, `getInquiriesBySource`, `getInquiriesByStatus`, etc.) preservadas para reuso futuro. **Métricas Spanish-vocab**: `totalLeads → totalInquiries`, `newLeadsCount → newInquiriesCount`, `closedCount → wonDealsCount`. Conversion cross-funnel: `wonDealsCount / totalInquiries × 100`, documentado inline con justificación (stage-specific conversions diferidas a R36). **Status fill colors**: nuevo `INQUIRY_STATUS_FILL: Record<InquiryStatus, string>` raw HSL para recharts (no Tailwind utilities). **Action layer**: nuevo `getDashboardDataAction()`, `getLeadsBySourceAction → getInquiriesBySourceAction`, `getLeadsByStatusAction → getInquiriesByStatusAction`. **Page composer**: `app/dashboard/page.tsx` ahora destructura del composite — elimina 3 round-trips Inquiry redundantes que existían pre-R37. Labels Spanish: "Leads totales → Consultas totales", subtitle fix "X cerradas de Y consultas" (gender mismatch — `cerradas` agreeing con `consultas` pero refiriendo a deals) → **"X ventas ganadas de Y consultas"** (gender + semantics correctos). **Charts renombrados** vía `git mv`: `leads-by-source-chart.tsx → inquiries-by-source-chart.tsx`, `leads-funnel-chart.tsx → inquiries-funnel-chart.tsx`. Funnel chart: 3-bucket enum reemplaza 6-bucket legacy, título "Embudo de consultas". Source chart: 11 source entries + `other` fallback, título "Consultas por fuente". **Constants single-source-of-truth**: nuevo `INQUIRY_SOURCE_OTHER_LABEL = "Otro"` en `lib/constants/inquiry.ts` — service aggregator + chart config ambos importan, elimina duplicación. **Bot label fix**: chart `bot.label "Bot" → "Bot WhatsApp"` matching `INQUIRY_SOURCE_LABELS.bot`. Reviewer: 2 IMPORTANT + 2 MINOR, todos resueltos (NO ACCEPTABLE rule). **Fix Important 1 (Bot label divergence)**: chartConfig.bot.label alineado con INQUIRY_SOURCE_LABELS. **Fix Important 2 (Spanish gender)**: subtitle reescrita "ventas ganadas de X consultas". **Fix Minor 3 ("Otro" duplicación)**: extraído a constant `INQUIRY_SOURCE_OTHER_LABEL`. **Fix Minor 4 (N+1 fetch)**: composite `getDashboardData()` + single action call. tsc + eslint + build verdes (27 rutas compiladas, exit 0). Playwright smoke diferido (dev env). Lingering `leads*` refs en `features/analytics/` son scope R36 (próximo ticket), no R37.
- [x] **R38** — `features/ai-contents`: review (sin cambios esperados). ✅ 2026-05-15. **Verificación PASS scope-only**: grep confirma 0 refs a `leadId/leadName/lead_id/inquiry/deal/contact` en todo el módulo. Imports limpios (no `@/features/leads`, `@/features/inquiries`, `@/features/deals`, `@/features/contacts`). Schema dependencies cero (módulo aún sin DB layer — usa in-memory mock stores). Property entity refactor no tocó propertyId/propertyTitle que son los únicos campos consumidos por ai-contents. Zero `as any` en todo el módulo. Code reviewer PASS confirmado. **CERO cambios de código necesarios** — feature opera puramente sobre Property (que no cambió) + content mock store. **⚠️ DEUDA TÉCNICA DIFERIDA — ALTA PRIORIDAD POST-FASE-8** (user-flagged): reviewer detectó 3 issues pre-existentes en el módulo que NO son R38 scope pero son críticos antes de que feature pase a producción. Tickets dedicados creados abajo (R38b/R38c/R38d). NO trivial — atender obligatoriamente al cerrar Fase 8.

### Deuda técnica ai-contents — atender obligatoriamente post-Fase 8

⚠️ **NO trivial**. User-flagged: "es super importante, no es algo trivial". Todos los tickets abajo deben ejecutarse antes de que `features/ai-contents` reciba tráfico real o se persista en DB.

- [x] **R38b** — `features/ai-contents` SECURITY: actions sin `getSessionContext()` + cross-org leak en mock store. ✅ 2026-05-15. **Closed by R38c (auth wiring folded)**: el problema original ("10 server actions sin getSessionContext()") fue resuelto durante R38c naturalmente — las 11 actions (1 más post-rewrite) ahora hacen `await getSessionContext()` antes de delegar al use case. **Pending verification post-R38d**: cuando R38d swap el in-memory adapter por `DrizzleAiContentRepository`, verificar que todas las queries usan `withRLS(ctx, ...)` enforcing org boundaries en DB layer. Cross-org leak en mock store sigue real pero está documented en class JSDoc de ambos adapters in-memory — pre-MVP scaffolding, removed cuando R38d aterriza. **No code changes en R38b — el ticket sirve ahora como audit gate**.
- [x] **R38c** — `features/ai-contents` CLEAN ARCH: presentation importa infrastructure directo, sin application layer. ✅ 2026-05-15. **Scope expandido**: el ticket original tocaba solo arch retrofit (use cases + ports). Durante implementación se folded R38b (auth wiring) porque sin él los use cases necesitarían tomar ctx opcional o stub — quedaba intermediate state vulnerable y feo. **Nuevos archivos** (15): 2 domain ports (`ai-content.repository.ts`, `hashtag.repository.ts`) — interfaces ctx-aware desde día 1 (anti-corruption design para R38b/d zero-interface-churn). 11 application use cases en `application/` — cada uno toma `(ctx, repo, params)` y delega al repo method. `markAiContentPublishedUseCase` es el único non-trivial: genera `publishedAt = now` policy-side para evitar clock drift entre adapters. 2 infrastructure adapters: `InMemoryAiContentRepository` + `InMemoryHashtagRepository` — process-global state with `_ctx` ignored param convention. **Presentation rewrite**: `actions.ts` ahora es thin pattern — module-level singletons `aiContentRepo` + `hashtagRepo`, cada action hace `getSessionContext()` + delegate. **Hashtag entity skipped intentionally**: reco original era `interface Hashtag { tag: string }` minimal, pero con `findAll` retornando `string[]` la entity quedaba dead code (proyecto memory "no dead code"). Diferido a R38d cuando DB columns (id/orgId/createdAt) materialicen. **Auth wiring done in R38c (not deferred to R38b)**: `getSessionContext()` está wired en cada action. R38b original problem statement ("actions sin getSessionContext()") queda cerrado por R38c — R38b se reduce a verification audit post-R38d (RLS enforcement check cuando Drizzle adapter exista). **Deletes**: `ai-contents.service.ts` + `hashtags.store.ts` removidos clean cut (no deprecated wrappers, solo `actions.ts` los consumía). Reviewer: 0 CRITICAL + 2 IMPORTANT (todos resueltos NO ACCEPTABLE rule). **Fix Important 1 (eslint-disable redundancy)**: 9 occurrences de `// eslint-disable-next-line @typescript-eslint/no-unused-vars` en los adapters — innecesarias porque `eslint.config.mjs` ya tiene `argsIgnorePattern: "^_"`. El `_ctx` prefix solo cubre el caso. Removed todas las disable comments. CLAUDE.md memory rule "Nunca usar eslint-disable" honrado. **Fix Important 2 (add/remove tag normalization asymmetry)**: `add` normalizaba `tag → #tag` antes de almacenar pero `remove` no, causando silent no-op si caller pasaba `"foo"` en vez de `"#foo"`. Extracted private `normalizeTag()` helper, ambos métodos lo invocan. `addMany` reusa `add`. Documented en class JSDoc. tsc + eslint + build verdes (exit 0). Playwright diferido (sin DB todavía). **Bug encontrado mid-implementation y corregido**: sed batch rename de `SessionContext` import path movió accidentalmente el `getSessionContext` function import a domain layer (donde no existe — solo el type). Detected por tsc, fixed surgically en actions.ts.
- [x] **R38d** — `features/ai-contents` DB PERSISTENCE: reemplazar in-memory mock stores con Drizzle repository. ✅ 2026-05-15. **Cierra deuda técnica ai-contents (R38b/c/d/e completa)**. **Scope real más chico que estimado**: schema `ai_contents` + RLS policies + enums ya existían (`017a_domain_rls_membership_check.sql`); solo faltaba `analytics` JSONB column + tabla `hashtag_library` + Drizzle adapters. **Migration aplicada via Supabase MCP** `030_ai_contents_extras_and_hashtag_library.sql`: (1) `ALTER TABLE ai_contents ADD COLUMN analytics jsonb` para engagement metrics (loose schema views/likes/comments/shares/clicks). (2) `CREATE TABLE hashtag_library` per-org curated tag library: text id, uuid org_id + created_by_user_id, text tag, timestamps + soft-delete audit columns. (3) Partial UNIQUE `(org_id, tag) WHERE deleted_at IS NULL` para dedup with restore-friendly semantics. (4) 5 RLS policies mirror exacto de `ai_contents` (select_org / select_trash / insert_org / update_role_aware / update_restore) + ENABLE + FORCE RLS + GRANT to authenticated. **Domain layer**: `IAiContentRepository` + `CreateAiContentDTO` (excluye id/createdAt/createdByUserId — server-controlled) + `UpdateAiContentDTO` (también excluye `propertyTitle` denormalized). `IHashtagRepository` API retorna `string[]` (entity skipped per "no dead code"). **Application**: `CreateAiContentInput` reexport, `UpdateAiContentInput` reexport. **Infrastructure**: `ai-content.model.ts` + `hashtag.model.ts` (Drizzle inferred types). `ai-content.mapper.ts` con `FALLBACK_PROPERTY_TITLE = "Sin propiedad"` para soft-deleted upstream. `DrizzleAiContentRepository`: todas queries via `withRLS(ctx, ...)` + explicit `eq(aiContents.organizationId, ctx.orgId)` defense-in-depth + LEFT JOIN properties para `propertyTitle` en un round-trip + soft delete con audit columns. `DrizzleHashtagRepository`: `findAll` extract `row.tag → string[]`, `add` con restore-or-insert CTE atómico (tombstoned rows resurrected, no duplicate-active), `remove` soft delete, `addMany` con single multi-row CTE usando `UNNEST` array (zero N+1). **Presentation**: action singletons swap `InMemoryAiContentRepository → DrizzleAiContentRepository`. `createAiContentAction` toma `CreateAiContentInput` (sin `createdByUserId` — repo populate desde `ctx.userId`). `updateAiContentAction` toma `UpdateAiContentDTO`. **Entity**: `AiContent.createdByUserId: string` added mirror Inquiry. **Files deleted**: 2 in-memory adapters (clean cut). **Reviewer**: 2 CRITICAL + 2 IMPORTANT, todos resueltos (NO ACCEPTABLE rule). **Fix Critical 1 (hydrateAfterWrite missing org predicate)**: post-write propertyTitle re-fetch ahora carga `eq(properties.organizationId, ctx.orgId)` consistente con todas otras queries. RLS suficiente para correctness pero el explicit predicate mantiene pattern uniforme grepable para auditorías. **Fix Critical 2 (`es-AR` locale)**: `marketing-kit-content-card.tsx` line 53 `toLocaleDateString('es-AR') → 'es-BO'` per CLAUDE.md (user en Bolivia). **Fix Important 3 (addMany N round-trips)**: refactored a single CTE con `WITH input AS (UNNEST(tags::text[]))`, restore tombstones primero, INSERT remaining con `ON CONFLICT DO NOTHING` race-safe. "Agregar todas" en hashtag library ahora cuesta 1 transacción independiente del número de tags. **Fix Important 4 (action signature wider than DTO)**: `updateAiContentAction` ahora importa y usa `UpdateAiContentDTO` del domain — excluye `propertyTitle` correctamente. False positives marcados con evidencia (race safety del CTE restore-or-insert ya cubierta por partial UNIQUE + ON CONFLICT DO NOTHING). tsc + eslint + build verdes (exit 0). Playwright smoke diferido (DB recién creada con schema vacío, sin data dev to test).
- [x] **R38e** — `features/ai-contents` COPY: reemplazar mock data con seed neutral LATAM. ✅ 2026-05-15. **Scope expandido durante review**: arrancó como copy fix solo en `ai-contents.service.ts` mock seed; reviewer detectó residuos out-of-scope en 2 chart components que se folded into R38e (mismo ticket = mismo concern). **Service mock seed** (`infrastructure/ai-contents.service.ts`): locations `Palermo/CABA/Belgrano/Buenos Aires/Cabildo 2200` → `Equipetrol (Santa Cruz)/Sopocachi (La Paz)/Av. 6 de Agosto`; términos `pileta → piscina`, `quincho con parrilla → área de parrilla`; conjugación `Disfrute/Contactanos → Disfruta/Contáctanos` (tú, no voseo); currency `$ 650.000/mes → Bs 4.500/mes` (es-BO format); `2 amb → 2 dorms` (BO uses dormitorios). Comment header MOCK agregado describiendo regionalisms removed + ticket R38d successor (DB swap). **Component amenities cleanup** (`ai-brochure-generator.tsx`): lista de 18 amenity labels modernizada — `Pileta → Piscina`, `Quincho → Área de parrilla`, `Lavadero → Lavandería`, `Baulera → Bodega`, `SUM → Salón de usos múltiples`, `Playroom → Sala de juegos`, `Solarium → Solárium`, `24hs → 24/7`. Value keys (English) intactas — solo Spanish labels. **Placeholder fix** (`ai-caption-generator.tsx`): `'mencionar la pileta' → 'mencionar la piscina'`. Reviewer: 0 CRITICAL + 3 IMPORTANT (todos resueltos NO ACCEPTABLE rule). **Fix Important 1 (id:5 missing closing `!`)**: caption "¡No te lo pierdas! Contáctanos para coordinar una visita 📲" → "¡No te lo pierdas! ¡Contáctanos para coordinar una visita! 📲" (Spanish requires both opening/closing exclamation marks). **Fix Important 2 (quincho residual en service)**: 2 occurrences en id:1 description + id:3 caption migrados. **Fix Important 3 (pileta out-of-scope)**: expandido scope para incluir 2 chart components (amenity labels + placeholder). False positives: ninguno. tsc + eslint + build verdes (exit 0). Playwright smoke diferido (UI maqueta). Mock data desaparecerá cuando R38d migre a DB persistence + seed scripts.

### Fase 9 — UI dashboard

- [x] **R39** — Página `/dashboard/contacts` (lista + detalle con sub-secciones). ✅ 2026-05-15. **Scope chico real**: módulo `features/contacts/` ya estaba 95% construido por R15-R17 (data-table + filters + detail-header + detail-info + edit-dialog + 9 actions). R39 sólo cableó las páginas + 5 components/hook nuevos + 1 action by-contact para appointments. **Files NEW (8)**: `app/dashboard/contacts/page.tsx` (RSC list view + ContactsView wrapper), `app/dashboard/contacts/[id]/page.tsx` (RSC detail con `Promise.all` paralelo a 4 actions + `notFound()` guard), `hooks/use-contacts-filter.ts` (mirror `use-leads-filter`, dedup availableTags), `features/contacts/presentation/components/contacts-view.tsx` (client wrapper filter state), `contact-related-tabs.tsx` (client shadcn Tabs con slot pattern para mantener sub-lists como RSC), `contact-inquiries-list.tsx` + `contact-deals-list.tsx` + `contact-appointments-list.tsx` (RSC sub-lists con badges via `INQUIRY_STATUS_BADGE_CLASSES` / `DEAL_STAGE_BADGE_CLASSES` / `APPOINTMENT_STATUS_BADGE_CLASSES`, empty states es-BO neutral). **Appointments by-contact route**: nuevo `findByContact(ctx, contactId)` en `IAppointmentRepository`, Drizzle adapter mirror de `findByDeal` con INNER JOIN deal + LEFT JOIN contact/properties filtrando `deal.contactId`. Use case `getAppointmentsByContactUseCase` (instantiates repo internally matching `getAppointmentsByDealUseCase` pattern). Action `getAppointmentsByContactAction`. **lib/constants/bot.ts**: agregado `APPOINTMENT_STATUS_BADGE_CLASSES: Record<AppointmentStatus, string>` mirror de `INQUIRY_STATUS_BADGE_CLASSES` + `DEAL_STAGE_BADGE_CLASSES` para shadcn Badge variant="outline". Reviewer: 0 CRITICAL + 2 IMPORTANT, todos resueltos NO ACCEPTABLE rule. **Fix Important 1 (duplicated appointment labels + inline badge classes)**: removed inline maps en `contact-appointments-list.tsx`, ahora importa `APPOINTMENT_STATUS_LABELS` (ya existía en bot.ts) + nuevo `APPOINTMENT_STATUS_BADGE_CLASSES`. Cero duplicación. **Fix Important 2 (sub-lists forced client-side via import boundary)**: `ContactRelatedTabs` refactor a slot pattern — toma `inquiriesSlot/dealsSlot/appointmentsSlot: ReactNode` + counts numéricos. Page (RSC) renders las 3 listas (RSC también) y las pasa como nodes. Sólo `Tabs` shell es client; sub-lists mantienen RSC nature. False positives marcados: multitenancy `findByContact` (RLS suficiente, mirror exacto del pattern `findByDeal`), INNER JOIN deal cuando contact sin deals (correcto, retorna []), repo instantiation pattern (match local convention appointments). tsc + eslint + build verdes (exit 0). Playwright smoke diferido (DB seed vacío). Sidebar entry "Contactos" diferida a R41 — página accesible vía URL directa por ahora.
- [x] **I10** — Página `/dashboard/inquiries` (lista filtrable + `[id]` detalle + acciones promote/discard). ✅ 2026-05-15. **Scope chico, mismo pattern que R39**: módulo `features/inquiries/` ya estaba 100% construido por I7-I9 (actions + 12 components + dialogs + trash-list). I10 sólo cableó las páginas + 3 archivos nuevos. **Files NEW (4)**: `app/dashboard/inquiries/page.tsx` (RSC list, `Promise.all` paralelo `getInquiriesAction()` + `getActivePropertiesAction()`), `app/dashboard/inquiries/[id]/page.tsx` (RSC detail con `notFound()` guard sobre `getInquiryByIdAction`), `hooks/use-inquiries-filter.ts` (mirror `use-contacts-filter` con search en contactName OR message case-insensitive, status/source `"all"` sentinel, drill-down `propertyId` predicate seedeable via `initialPropertyId`), `features/inquiries/presentation/components/inquiries-view.tsx` (client wrapper filter state, self-contained `<div className="flex flex-col gap-4">` mirror `ContactsView`), `inquiry-create-button.tsx` (tiny client island que owns dialog open state — page RSC mantiene heading row). **Files MODIFIED (1)**: `inquiry-filters.tsx` placeholder `"Buscar en el mensaje…" → "Buscar por contacto o mensaje…"` para reflejar search ampliada en hook. **Deferred (explicit)**: tab "Consultas" en `/dashboard/trash` — toca shared `TrashContent` component, sale como ticket separado en Fase 9. Sidebar entry "Consultas" diferida a R41 — página accesible vía URL directa. Reviewer: 0 CRITICAL + 2 IMPORTANT + 2 MINOR, todos resueltos NO ACCEPTABLE rule. **Fix Important 1 (Fragment root + heading en client wrapper)**: extraído `InquiryCreateButton` como client island scoped a interactividad, heading movido a page RSC. `InquiriesView` ahora self-contained `<div className="flex flex-col gap-4">` mirror exacto `ContactsView`. Separation of concerns: page owns layout, view owns filter state, button owns dialog state. **Fix Important 2 (`propertyId` drill-down dead code)**: hook ahora acepta `UseInquiriesFilterOptions.initialPropertyId` con seed en `useState` initializer; `InquiriesView` expone `initialPropertyId?: string` prop y forward al hook. Stand-alone calls de la list page omiten (predicate dormant); future embeded callers (property detail page) pueden seedear. **Fix Minor 3 (gap-6 vs gap-4 detail)**: detail page `gap-6 → gap-4` align con `contacts/[id]` (sin tabs estructura simple). **Fix Minor 4 (stale-closure spread en Select.onValueChange)**: marked **false positive con evidencia** — reviewer confirmó "consistent with established codebase approach"; patrón idéntico en `ContactFiltersBar`, `LeadFiltersBar`, `PropertyFilters`. Cambiar solo `InquiryFiltersBar` diverge. Project-wide refactor queda como ticket separado si se decide. tsc + eslint + build verdes (exit 0). Routes confirmadas en build output. Playwright smoke diferido a R47 (DB seed vacío).
- [x] **R40** — Página `/dashboard/deals` (Kanban + Tabla) + `[id]` detalle. ✅ 2026-05-15. **Scope chico real, mismo pattern R39/I10**: R25-R34 ya construyeron 14 components + 13 actions (kanban dnd-kit + optimistic + rollback, tabla, board con toggle URL-persisted, dialogs, detail composer). R40 cableó pages + filters + 1 by-deal appointments list. **Files NEW (7)**: `app/dashboard/deals/page.tsx` (RSC list, `Promise.all([getDealsAction, getActivePropertiesAction])`), `app/dashboard/deals/[id]/page.tsx` (RSC detail con `notFound()` guard + `Promise.all([getAppointmentsByDealAction])` forward-compat array shape para futuras R47 sub-sections), `hooks/use-deals-filter.ts` (mirror useInquiriesFilter para `DealFilters` — search en contactName OR propertyTitle case-insensitive, stage/source `"all"` sentinel, propertyId drill-down seedeable), `deal-filters.tsx` (search + source siempre + stage SOLO Tabla via `showStageFilter` prop, stage options limitadas a `ACTIVE_DEAL_STAGES`), `deals-view.tsx` (client wrapper, lee URL `?view=` via useSearchParams + Suspense, drive `showStageFilter`, monta DealBoardContent directamente), `deal-create-button.tsx` (client island), `deal-appointments-list.tsx` (RSC read-only mirror ContactAppointmentsList — sin link porque la página IS el deal detail). **Files MODIFIED (2)**: `features/deals/domain/deal.entity.ts` agregó `ACTIVE_DEAL_STAGES: ReadonlyArray<DealStage>` (complement de TERMINAL_DEAL_STAGES, orden funnel) + `type ActiveDealStage = (typeof ACTIVE_DEAL_STAGES)[number]` + `DealFilters.stage` narrowed a `ActiveDealStage | "all"` (compile-time guard: terminal stages nunca aparecen en active board). `features/deals/presentation/components/deal-board.tsx` renamed `DealBoardInner` → exported `DealBoardContent` para que callers con propio Suspense (DealsView) eviten nested boundary; `DealBoard` self-wrap mantenido para uso standalone. **Deferred (explicit)**: sidebar entry "Negocios" sale en R41; trash tab integration en /dashboard/trash touches shared TrashContent; bot history + AI content sub-sections del detail defer a R47; agent filter requiere extender DealFilters + repo + member-list fetch. **Decisiones alineación**: 1) stage filter hidden en Kanban view (columns ARE stages — redundante), visible solo en Tabla; 2) agent filter deferred (entity no expone `agentId`); 3) appointments cross-feature wiring en detail page incluido (plan §5.5). Reviewer: 0 CRITICAL + 2 IMPORTANT + 1 MINOR (1 MINOR self-cancelled como false positive por reviewer mismo). **Fix Important 1 (nested Suspense double-blank)**: `DealsView` envolvía `DealBoard` (que ya tiene Suspense interno) en otro Suspense, causando flash blank → blank → content. Refactor: exportado `DealBoardContent` como inner shell renderable directly; `DealBoard` self-wrap mantenido para standalone callers. `DealsView` ahora monta `DealBoardContent` dentro de su propio Suspense — boundary única. **Fix Important 2 (sequential fetches diverge from contacts/[id] precedent)**: detail page hacía sequential `await getDealByIdAction(id)` → `await getAppointmentsByDealAction(id)`. Cambiado a `Promise.all([getAppointmentsByDealAction(id)])` con comment explicando que la array shape es deliberada para R47 que agregará bot history + AI content sub-sections en este mismo slot. **Fix Minor 4 (DealFilters.stage type too wide)**: era `DealStage | "all"` permitiendo "won"/"lost" que `getDealsAction` excluye by-design → silent empty board. Narrowed a `ActiveDealStage | "all"` (derived type del const array) — compile error si UI/hook intentan setear stage terminal. **Minor 3 (icon margin pattern)** self-cancelled por reviewer al verificar mirror exacto contra InquiryCreateButton. tsc + eslint + build verdes (32/32 pages compiled). Routes confirmadas en build output. Playwright smoke diferido a R47 (DB seed vacío).
- [x] **R41** — Sidebar: "Contactos", "Consultas", "Negocios". Eliminar "Leads". ✅ 2026-05-15. **Scope minimal**: 2 files modified. `components/app-sidebar.tsx`: removida entry `{ title: "Leads", url: "/dashboard/leads", icon: Users }`, insertadas 3 entries flat en orden funnel — Contactos (`/dashboard/contacts`, icon Users reused), Consultas (`/dashboard/inquiries`, icon HelpCircle), Negocios (`/dashboard/deals`, icon Handshake). Imports lucide-react ampliados con `Handshake` + `HelpCircle` (orden alfabético preservado). Decisiones alineación: (1) 3 entries flat top-level mirror literal plan §5.1, no collapsible parent; (2) icons HelpCircle (semántica pregunta/consulta) + Handshake (cierre deal/business intent). Reviewer: 0 CRITICAL + 1 IMPORTANT + 0 MINOR. **Fix Important 1 (pre-existing nav-main bug surfaced by R41)**: `components/nav-main.tsx` leaf `SidebarMenuButton` línea 85 usaba `isActive={pathname === item.url}` (exact match), ignorando la variable `isActive` precomputada arriba que SÍ maneja `startsWith`. Bug pre-existente pero expuesto por R41 al agregar 3 leaf routes con páginas `[id]` (`contacts/[id]`, `inquiries/[id]`, `deals/[id]`) — navegar al detail desactivaba el sidebar parent. Cambiado a `isActive={isActive}` (variable precomputada). Suggestions del reviewer (icon reuse Users, alphabetical imports, startsWith shadow check, copy es-BO neutro, no leftover "Leads") todos verificados sin issue. Route `/dashboard/leads` legacy queda accesible vía URL directa — eliminación features/leads + app/dashboard/leads/ defer a R43 (Fase 10 cleanup). tsc + eslint + build verdes (32/32 pages compiled). Playwright smoke diferido a R47 (cambio visual + navegación verificada implícitamente).
- [x] **R42** — Form público en `/p/[id]` apunta a `createPublicInquiryAction`. ✅ 2026-05-15. **Verification ticket**: wiring shipped earlier en commit `36a8e6c` (I8b — public-form path via SECURITY DEFINER RPC). `LandingContactForm` (`components/landing/landing-contact-form.tsx`) ya importa `createPublicInquiryAction` direct y `app/p/[id]/actions.ts` solo expone `trackVisitAction` con docstring explicando que el passthrough fue removido. Reviewer cross-certified el surface antes de Fase 10 cleanup. Reviewer: 0 CRITICAL + 2 IMPORTANT + 0 MINOR, todos resueltos NO ACCEPTABLE rule. **Fix Important 1 (Zod schema input/output type mismatch)**: `phone`/`email`/`message` declaraban `.optional().or(z.literal(""))` produciendo inferred `string | undefined` pero la form default era `""`, generando type drift. Refactor: extraído helper `optionalText(max, msg)` + agregado `.transform(v => v === "" || v === undefined ? undefined : v)` en cada campo opcional. `PublicInquiryFormValues` ahora exporta `z.input<typeof schema>` (mantiene `""` defaults para react-hook-form), action recibe `z.output` (string | undefined) y coalesce `?? null` para el RPC. Runtime type ahora coincide con inferido. **Fix Important 2 (dead superRefine output on email)**: cuando user metía email inválido + phone vacío, `superRefine` agregaba "Ingresa al menos un teléfono o un correo" a path `email` Y `phone` — shadcn `FormMessage` solo renderiza primer error/field, dropeando silenciosamente la mensaje de email. Cambiado a single issue solo en `phone` con comment explicando por qué (el actionable suggestion solo necesita aparecer una vez; email muestra su propio error "Correo inválido" en paralelo). Único legacy residual: `trackVisitAction` en `app/p/[id]/actions.ts` aún apunta a `@/features/leads/presentation/public-actions` (analytics visit tracking, separate concern) — defer a R43 (Fase 10 cleanup). tsc + eslint + build verdes (32/32 pages compiled). Playwright smoke diferido a R47 (form en producción desde I8b, transforms son no-ops para valores válidos).

### Fase 10 — Cleanup

> ⏸️ **R43–R46 PAUSADOS bajo confirmación estricta del usuario (2026-05-15)**
>
> El usuario pidió preservar todo lo legacy de `leads/` (módulo + schema + enums + tabla) hasta concluir la **restauración de UI perdida** (timeline de mensajes con bot, simulación WhatsApp, sub-secciones de detalle, etc.). Estos cuatro tickets son destructivos y se ejecutan SOLO después del audit de UI lost y la decisión explícita de borrar.
>
> Cualquier retoma requiere confirmación verbal previa — la rama de UI restoration nace en branch separada para preservar `features/leads/` como referencia consultable.

- [ ] **R43** — Eliminar `features/leads/`. ⏸️ Pausado.
- [ ] **R44** — Eliminar `lib/db/schema/leads.ts` + barrel. ⏸️ Pausado.
- [ ] **R45** — Eliminar enums legacy en `enums.ts`. ⏸️ Pausado.
- [ ] **R46** — SQL `drizzle/sql/027_drop_legacy_leads.sql`: `DROP TABLE public.leads;`. Aplicar en dev. ⏸️ Pausado (DESTRUCTIVO).
- [x] **R46b** — Cleanup de exports schema-level redundantes con feature-layer model files. ✅ 2026-05-15. Grep confirmó zero consumers de las 8 type exports (`ContactRecord`/`NewContactRecord`/`InquiryRecord`/`NewInquiryRecord`/`DealRecord`/`NewDealRecord`/`ContactPropertyQueueRecord`/`NewContactPropertyQueueRecord`) fuera del propio archivo schema. Removidos los 8 exports + sus 4 JSDoc blocks en `lib/db/schema/contact.ts`/`inquiry.ts`/`deal.ts`/`contact-property-queue.ts`. Feature-layer (`features/*/infrastructure/*.model.ts`) mantiene la canonical inference vía `typeof table.$inferSelect`/`$inferInsert` con naming `Row`/`Insert` matching `lead.model.ts`/`property.model.ts` baseline. Barrel `lib/db/schema/index.ts` ya no re-exportaba estos types (verificado). Reviewer: 0 issues. tsc + eslint + build verdes (32/32 pages).
- [x] **R46c** — Standardise throw token casing across feature repos. ✅ 2026-05-15. **Scope final**: 6 files modified. `features/contacts/infrastructure/drizzle-contact.repository.ts` — 6 throw sites migrados (`CONTACT_NOT_FOUND` → `contact_not_found`, `CONTACT_ALREADY_RESTORED` → `contact_already_restored`, `CONTACT_NO_PERMISSION` → `contact_no_permission`, `CONTACT_NOT_FOUND_OR_NO_PERMISSION` → `contact_not_found_or_no_permission` ×2) + JSDoc rewrite con cross-ref a CLAUDE.md convention. `features/contacts/presentation/contact-error-messages.ts` — 5 case + 2 condition checks lowercase, JSDoc rewritten canonical (sin "R46c pending" / "SCREAMING legacy"). `features/contacts/application/update-contact.use-case.ts` + `restore-contact.use-case.ts` — JSDoc refs migradas. `features/contacts/presentation/actions.ts` — comentario "Token-casing note (R46c)" reemplazado por nota factual del estado post-sweep. **CLAUDE.md**: nueva subsección "Throw token convention" (después de Import Rules table, antes Database Layer) — documenta lowercase canónico, parametric suffix pattern (`:`), generic `_not_found_or_no_permission` para no-leak existence, y explicit acknowledgement de properties/appointments como legacy SCREAMING a migrar separado. **Out of scope (intencional)**: `features/leads/` (preservación legacy bajo pedido del usuario hasta UI restoration), `features/properties/` + `features/appointments/` (legacy SCREAMING, refactor separado). Reviewer: 0 CRITICAL + 2 IMPORTANT + 0 MINOR, todos resueltos. **Fix Important 1 (stale R46c-pending comment en actions.ts)**: comentario decía "R46c will sweep" en futuro tense + ejemplo `EMAIL_ALREADY_EXISTS` que no existía como código. Reemplazado por nota factual lowercase + lista de los 4 throw tokens propagados unchanged. **Fix Important 2 (4th token missing en restore-contact JSDoc)**: repository `restore()` throws `contact_not_found_or_no_permission` como defensive fallback (caller can SELECT deleted row pero falla policy `contact_update_restore`). JSDoc del use-case omitía. Agregado con nota explicativa. tsc + eslint + build verdes (32/32 pages). Grep confirmó 0 SCREAMING `CONTACT_*` tokens remaining en repo.

### Fase 11 — Tests + docs + commits

- [x] **R47** — Smoke Playwright §6.3 (T1–T17). ✅ 2026-05-16. **17/17 tests pass.** Realizado vía Playwright MCP en sesión activa (test-h@blackestate.dev → Test H Renamed org + cross-org cut a test-a@blackestate.dev). **Bug lateral cazado y resuelto en commit `6efe28f` (fix R47)**: T1 falló con HTTP 500 `null value in column "id" of relation "contact"` — el RPC `public.public_create_inquiry` (`drizzle/sql/028`) emite `INSERT INTO public.contact (...)` sin `id` y la columna era `text NOT NULL` sin DB default. Drizzle `$defaultFn` solo aplica TS-side. Fix defense-in-depth: migración **031** `ALTER COLUMN id SET DEFAULT gen_random_uuid()::text` en contact + inquiry + deal, sync schemas TS con `.default(sql\`...\`)` para que `drizzle-kit check` no detecte drift, JSDoc explicando coexistencia con `$defaultFn`. Reviewer: 0 CRITICAL + 1 IMPORTANT (idempotency comment técnicamente incorrecto — corregido) + falsos positivos con evidencia investigada. Bug shipping desde I8b (R42); el path runtime nunca se ejercitó hasta R47 — confirma valor del checkpoint Playwright post-fix. **Tests por batch:** Batch 1 (T1 público, no auth) — re-run tras 031 ✅. Batch 2 (T2-T17 dashboard, sesión owner test-h) — todos ✅. **Caveats documentados (no son fail):** (a) **T4 drag&drop**: Playwright MCP sintético no dispara los Pointer events de dnd-kit (limitación documentada del provider); fix verificado equivalente vía menú "Cambiar etapa" en detail page (mismo server action `updateDealStage`) + Gonzalo validó manualmente que drag funciona y stage cambia. (b) **T2/T15 (bot)**: SQL-only smoke por acuerdo explícito previo — pipeline runtime bot (Twilio/WhatsApp) está fuera del scope del refactor contact/inquiry/deal. Verificación cruzada: `bot_conversations.contact_id` resuelve a Contact real (Roberto Salinas), 0 dangling FKs, columna `lead_id` no existe (DROP en mig 029 confirmado). (c) **T13 (RLS UPDATE policy)**: verificado por `pg_policies` inspection en lugar de write attempt — no hay UI para simular "agente con permisos limitados" sin seed adicional; la policy es la fuente de verdad y dice `(org_id match AND is_org_member AND (org_role IN owner/admin OR created_by_user_id = auth.uid()))` con with_check espejo. **§6.4 invariants** ✅ todos pasan: `bad_bidirectional=0` (Inquiry↔Deal links íntegros tras el ciclo T3→T5→T7→T6), `dangling_deals=0`, `stage_order` denso `0..N-1` por (org, active stage). **Side effects DB tras R47:** Gonzalo Pinell org: +1 contact + 1 inquiry (T1 smoke); Test H org: +1 contact (Comprador A T3, `c9c12368`) + 2 inquiries (`730b4413` promoted, `3bd9e91d` discarded) + 1 deal (`cb6fcdc0` won — flujo T3→T5→T7→T6 termina en `won`). Datos pueden purgar manualmente o quedar como seed adicional.
- [x] **R48** — Actualizar `docs/implementation-plan.md`. ✅ 2026-05-16. Commit `cb9c5d0`. Agregada sub-section `2.2.10 — Refactor lead → contact + inquiry + deal` con 12 sub-tareas (12 ✅ + 1 K1 paused). K1 documenta que R43–R46 (eliminar `features/leads/` + schema + DROP TABLE) están pausados bajo confirmación estricta — la UI legacy `/leads` sigue en uso y forma parte de `docs/ui-restoration-audit.md`. También se actualizó la descripción de la tarea 2.1.15.13 (`transferProperties()`) para reflejar la nueva cascade semantics (deals + contact_property_queue, opt-in contacts, NO inquiries) y marcar el refactor 2.2.10 como pre-requisito cumplido.
- [x] **R49** — Actualizar `CLAUDE.md`: project structure (modules contacts/inquiries/deals), null safety, entity examples. ✅ 2026-05-16. Commit `5b03967` (base) + commit fix reviewer (I3/M1/M2). Cambios: (1) `### Feature Module Structure` ascii tree expandido — contacts/inquiries/deals/property-transfers cada uno con sus files clave + notas cross-feature (Inquiry promote import documented exception); legacy `leads/` rotulado "do NOT add new code"; appointments/bot anotados con su FK renombrada (`deal_id`, `contact_id`). (2) `## Project Structure` listing alineado. (3) `### Null Safety` ganó worked example completo con 4 bloques de código (Model / Entity / DTO / Mapper) usando Contact como sujeto + paragraph "Why three shapes and not one?" explicando la razón por capa. (4) Fixes reviewer: lista `created_by_user_id NOT NULL` actualizada a nuevas entidades (línea ~393), worked example mapper return type corregido a `ContactInsert`, comentario `session-context.ts` actualizado de "Better Auth" a "Supabase Auth JWT claims".
- [x] **R50** — Actualizar `docs/plans/2026-05-13-property-transfers.md`: cascade actúa sobre Deals; Inquiries NO cascadean en transfer (son interés ligero, no compromiso del agente origen). ✅ 2026-05-16. Commit `d780e2e` (base) + commit fix reviewer (I4). Sección §2 reescrita con tabla por entidad (property/deal/inquiry/contact/appointment/ai_content/contact_property_queue) + justificación operativa de "Inquiry no cascadea" + regla derivada para futuros entidades ("lo que cascadea es compromiso comercial activo; conversaciones históricas viajan con el Contact"). Fix reviewer I4: §3.4 step 10 extendido a UNION con `inquiry` para que `transferContacts=true` también mueva contactos cuyo único vínculo con el batch es una Inquiry (no Deal) — cerraba el gap entre prosa §2 ("Inquiries siguen al Contact") y query SQL §3.4 (que solo resolvía contactos por Deal).
- [x] **R51** — Commits agrupados por fase. ⏭️ 2026-05-16. **Marcado como N/A con justificación.** El plan original asumía que durante las Fases 1–10 íbamos a acumular cambios sin commit y al final R51 los agruparía. En realidad seguimos el workflow del master-prompt (commit atómico por ticket) durante todas las fases, generando >40 commits granulares cada uno con HEREDOC explicando el "por qué". Agrupar ahora vía interactive rebase diluiría la trazabilidad ticket-por-ticket que el workflow estableció deliberadamente y rompería los Co-Authored-By / hashes referenciados desde los planes (e.g. `6efe28f`, `cb9c5d0`). Decisión: dejar los commits atómicos intactos. Si el PR final necesita squash al merge a `main`, eso se decide al momento de abrir el PR, no acá.

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
