# Sub-plan — Refactor `lead → contact + deal` (con funnel + Kanban)

**Fecha:** 2026-05-13
**Branch:** `feat/contact-inquiry-refactor`
**Bloqueante de:** `docs/plans/2026-05-13-property-transfers.md`
**Estado actual:** Schema mono-tabla `leads` mezcla identidad (persona) con oportunidad (interés en una prop). Refactor a modelo CRM industria-standard validado contra AlterEstate / Tokko Broker / HubSpot Real Estate: **Contact ↔ Deal** con **pipeline funnel** y **vista Kanban**.

> **Nota de naming:** el archivo conserva el slug histórico `contact-inquiry-refactor` por trazabilidad del commit que lo creó. El modelo final usa **Deal** (no Inquiry) — "Inquiry" implica una pregunta del cliente, "Deal" captura la oportunidad comercial real que el agente registra y trabaja a través de un funnel.

---

## 1. Motivación

Hoy una persona interesada en 3 propiedades = 3 filas `leads` duplicadas con mismo `name + phone + email` y `property_id` distinto. Eso rompe:

- **Identidad del contacto**: no hay forma de saber "todos los deals de Carlos" sin agrupar por phone/email a mano.
- **Pipeline visual**: no hay funnel/Kanban — todas las oportunidades viven con `status` simple (new/contacted/interested/won/lost) que no refleja el ciclo de venta real.
- **Transferencia de propiedades**: cascadear `leads` cuando transferís una prop arrastra contactos que querés conservar.
- **Analytics y reporting**: "contactos únicos del mes" requiere DISTINCT por (phone, email), frágil. "Conversión por etapa de funnel" no se puede medir.
- **Bot conversacional**: una conversación bot es con un contacto (persona), no con un "deal en prop". Hoy `bot_conversations.lead_id` apunta a un par persona-prop arbitrario.
- **Marketing y nurturing**: campañas a "leads únicos" duplican mensajes si el contacto figura en 3 props.

El modelo estándar (HubSpot, Salesforce Propertybase, AlterEstate, Tokko Broker) separa **tres conceptos**:

- **Contact** = la persona física (entidad de identidad). Único por `(org_id, phone, email)`.
- **Deal** = la oportunidad comercial concreta (Contact ↔ Property con metadata: stage, source, budget). Un Contact puede tener N Deals (uno por cada propiedad de interés).
- **Pipeline (funnel)** = secuencia de etapas por las que avanza un Deal: Prospecto → Calificado → Visita → Negociación → Reservado → Cerrado-Ganado / Cerrado-Perdido.

---

## 2. Modelo target

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   contact    │ 1─────N │     deal     │ N─────1 │   property   │
│              │         │              │         │              │
│ id           │         │ contact_id ──┤         │ id           │
│ org_id       │         │ property_id ─┤         │ org_id       │
│ name         │         │ org_id       │         │ ...          │
│ phone        │         │ stage        │         └──────────────┘
│ email        │         │ source       │
│ tags         │         │ budget       │
│ ...          │         │ message      │
│ created_by   │         │ created_by   │
└──────────────┘         └──────────────┘
       │                        │
       │                        │
       │                  ┌─────┴────────────┐
       │                  │   appointment    │ (lead_id → deal_id; conserva property_id por display)
       │                  └──────────────────┘
       │                        │
       │                  ┌─────┴────────────┐
       │                  │   ai_contents    │ (sin cambio — atado a property)
       │                  └──────────────────┘
       │
       ├──────── contact_property_queue (lead_property_queue renombrada — atada a contact)
       │
       └──────── bot_conversation (lead_id → contact_id — bot conversa con persona)
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
| `property_visits` | `jsonb` | ✅ default `'[]'` | web tracking de qué props vio el contact. Mismo shape que el `propertyVisits` actual del lead |
| `catalog_sent_with_origin` | `boolean` | ✅ default false | tracking "le mandé el catálogo desde su origen" — heredado del lead actual |
| `catalog_opened_at` | `timestamptz` | ❌ | tracking apertura del catálogo |
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

**Unicidad lógica (no constraint):** un contacto por `(org, phone)` y por `(org, email)`. **Por qué no UNIQUE constraint:** phone/email pueden ser NULL (no todos los contactos tienen ambos), pueden cambiar, y dos personas pueden compartir teléfono familiar — el constraint bloquearía casos válidos. La deduplicación se resuelve en use cases (búsqueda + confirmación humana en autocomplete).

### 2.2 Tabla `deal` (nueva, reemplaza `leads`)

| Columna | Tipo | NOT NULL | Notas |
|---|---|---|---|
| `id` | `text` PK | ✅ | preserva IDs viejos en migración |
| `organization_id` | `uuid` | ✅ | tenancy |
| `created_by_user_id` | `uuid` | ✅ | agente dueño del deal |
| `contact_id` | `text` FK → `contact.id` | ✅ | **NUEVO** |
| `property_id` | `text` FK → `properties.id` | ✅ | conservado |
| `stage` | `deal_stage_enum` | ✅ default `'prospect'` | **NUEVO** — etapa del funnel |
| `stage_order` | `integer` | ✅ default `0` | **NUEVO** — orden dentro de la columna del Kanban (drag&drop dentro de la misma etapa) |
| `source` | `deal_source_enum` | ❌ | renombrado desde `lead_source_enum` |
| `budget` | `text` | ❌ | conservado |
| `message` | `text` | ❌ | conservado |
| `property_type_sought` | `text` | ❌ | conservado |
| `zone_of_interest` | `text` | ❌ | conservado |
| `wants_offers` | `boolean` | ✅ default false | conservado |
| `expected_close_at` | `timestamptz` | ❌ | **NUEVO** — fecha estimada de cierre (para forecasting futuro) |
| `closed_at` | `timestamptz` | ❌ | **NUEVO** — poblado cuando `stage` pasa a `won`/`lost` |
| `lost_reason` | `text` | ❌ | **NUEVO** — opcional cuando `stage = 'lost'` |
| `created_at/updated_at/deleted_at + audit cols` | | | conservados |

**Nuevo enum `deal_stage_enum` (7 valores fijos):**

| Valor (código) | Label UI (español) | Descripción |
|---|---|---|
| `prospect` | Prospecto | Recién entró al sistema, sin calificar |
| `qualified` | Calificado | Hablaste con la persona, sabés qué busca, hay match con la prop |
| `visit_scheduled` | Visita | Hay cita agendada o ya visitó la prop |
| `negotiation` | Negociación | Hablando de precio, condiciones, oferta |
| `reserved` | Reservado | Reserva formal pagada (seña o anticipo) — paso previo a cerrar |
| `won` | Cerrado-Ganado | Venta/alquiler concretado |
| `lost` | Cerrado-Perdido | Se cayó la operación |

`won` y `lost` son **estados terminales** — el Deal sale del Kanban activo y aparece en archivo. `lost_reason` opcional ayuda a entender por qué se cae el funnel.

**Lo que se mueve fuera (van a `contact`):** `name`, `phone`, `email`, `propertyVisits` JSONB, `catalogTracking`. Esas son propiedades de la persona, no del deal.

**Constraint nuevo:** `UNIQUE(organization_id, contact_id, property_id) WHERE deleted_at IS NULL AND stage NOT IN ('won','lost')` — un contact tiene a lo sumo un deal **activo** por propiedad. Si después de `won/lost` vuelve a interesarse, se crea uno nuevo (representa una negociación distinta).

**Índices:**
- `deal_org_id_idx`
- `deal_property_id_idx` (era `leads_property_id_idx`)
- `deal_contact_id_idx` — NUEVO, hot path para "todos los deals de Carlos"
- `deal_org_stage_idx` — NUEVO, para queries del Kanban (`WHERE org_id = X AND stage = 'qualified' ORDER BY stage_order`)
- `deal_org_created_by_idx` (era `leads_org_created_by_idx`)
- `deal_active_org_idx ON (organization_id) WHERE deleted_at IS NULL AND stage NOT IN ('won','lost')` — hot path Kanban activo

### 2.3 Cambios en tablas dependientes

| Tabla actual | Cambio | Razón |
|---|---|---|
| `appointments` | `lead_id` → `deal_id` (FK → deal). Conserva `property_id` como denormalización para display rápido. | Una cita es la visita física de un deal concreto. Si transferís el deal, la cita va con él |
| `lead_property_queue` | Rename a `contact_property_queue`. `lead_id` → `contact_id`. Conserva `property_id`. | La cola de props sugeridas por el bot pertenece al contact (persona). Cuando el contact muestra interés en una prop sugerida, **se crea un deal nuevo** (no se elimina del queue) |
| `bot_conversations` | `lead_id` → `contact_id`. | El bot conversa con una persona, no con un deal específico. Los mensajes pueden referenciar varias props vía contenido |
| `bot_messages` | Sin cambio | Sigue ligado a `bot_conversations.id` |
| `ai_contents` | Sin cambio | `property_id` apunta a prop. Contenidos AI son assets de la propiedad |
| `analytics_events` | `metadata.leadId` legacy → `metadata.contactId` + `metadata.dealId` cuando aplique. Eventos viejos quedan con `leadId` | Service de analytics lee ambos por compatibilidad histórica |
| `property_transfers` | Sin cambios estructurales en este refactor. El sub-plan de transfers se actualiza para renombrar `inquiriesCount` → `dealsCount` y cascade actúa sobre `deal` | Coordinado con `docs/plans/2026-05-13-property-transfers.md` |

### 2.4 RLS policies a actualizar

Las policies de `leads` (`drizzle/sql/006`) se replican para:

- `contact` — mismas reglas (org isolation + soft delete + papelera role-aware + super admin para SELECT; INSERT/UPDATE per role).
- `deal` — mismas reglas (clone de las de leads). Adicionalmente: agent puede mover stage de sus propios deals (UPDATE policy ya cubre el caso con `created_by_user_id = sub`).
- `appointments`, `contact_property_queue`, `bot_conversations` — policies existentes siguen valiendo (la columna se renombra pero la lógica RLS sigue siendo "org + agent ownership").

Migración SQL nueva: `drizzle/sql/026_contact_deal_refactor.sql` con todas las DDL + RLS + el enum nuevo.

---

## 3. Mapping de datos (lead → contact + deal)

Algoritmo de migración determinístico, idempotente, ejecutable en una sola transacción Postgres.

### 3.1 Paso 1 — agrupar leads por persona

Para cada `org_id`:

```sql
-- "Persona" = misma normalización de phone o mismo email (case-insensitive).
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
    coalesce(phone_norm, email_norm, lead_id) AS group_key
  FROM normalized
)
SELECT
  organization_id,
  group_key,
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

Por cada grupo del Paso 1 → un `INSERT INTO public.contact(...)`. Generar UUID nuevo para `contact.id`. Mantener tabla auxiliar `_migration_lead_to_contact(lead_id, contact_id)` para el Paso 3.

### 3.3 Paso 3 — crear deals (rename leads)

Cada `lead` se convierte en un `deal` con **stage inicial determinado por el status legacy**:

| Lead status legacy | Deal stage |
|---|---|
| `new` | `prospect` |
| `contacted` | `qualified` |
| `interested` | `qualified` (cuando hay info pero sin visita) |
| `won` | `won` |
| `lost` | `lost` |
| `discarded` | `lost` (con `lost_reason = 'discarded_migration'`) |

```sql
INSERT INTO public.deal(
  id, organization_id, created_by_user_id, contact_id, property_id,
  stage, stage_order, source, budget, message, property_type_sought,
  zone_of_interest, wants_offers, closed_at, lost_reason,
  created_at, updated_at, deleted_at, deleted_by_user_id,
  deleted_by_user_name, deleted_by_user_email
)
SELECT
  l.id, l.organization_id, l.created_by_user_id, m.contact_id, l.property_id,
  CASE l.status
    WHEN 'new' THEN 'prospect'::public.deal_stage_enum
    WHEN 'contacted' THEN 'qualified'::public.deal_stage_enum
    WHEN 'interested' THEN 'qualified'::public.deal_stage_enum
    WHEN 'won' THEN 'won'::public.deal_stage_enum
    WHEN 'lost' THEN 'lost'::public.deal_stage_enum
    WHEN 'discarded' THEN 'lost'::public.deal_stage_enum
  END AS stage,
  0 AS stage_order,  -- recalculado en post-migración por org+stage
  l.source::text::public.deal_source_enum,
  l.budget, l.message, l.property_type_sought, l.zone_of_interest,
  l.wants_offers,
  CASE WHEN l.status IN ('won','lost','discarded') THEN l.updated_at ELSE NULL END AS closed_at,
  CASE WHEN l.status = 'discarded' THEN 'discarded_migration' ELSE NULL END AS lost_reason,
  l.created_at, l.updated_at, l.deleted_at, l.deleted_by_user_id,
  l.deleted_by_user_name, l.deleted_by_user_email
FROM public.leads l
JOIN _migration_lead_to_contact m ON m.lead_id = l.id;

-- Recalcular stage_order por org+stage (orden por fecha de creación dentro de cada columna)
UPDATE public.deal d
SET stage_order = sub.row_number
FROM (
  SELECT id, row_number() OVER (PARTITION BY organization_id, stage ORDER BY created_at) - 1 AS row_number
  FROM public.deal
) sub
WHERE d.id = sub.id;
```

**Conservar `deal.id = leads.id`** para que las FK existentes (`appointments.lead_id`, `lead_property_queue.lead_id`, `bot_conversations.lead_id`) sigan apuntando al mismo `text` ID que ahora vive en `deal`.

Adicional: copiar `propertyVisits` JSONB y `catalogTracking` del lead al contact (no al deal — son comportamientos de la persona). Cuando varios leads se mergean en un contact, los `propertyVisits` se concatenan y `catalogTracking` toma el más reciente.

### 3.4 Paso 4 — switch de FKs

Las tablas dependientes hoy referencian `leads.id`. Después del Paso 3:

- `appointments.lead_id` → renombrar a `deal_id`. La columna mantiene el mismo `text` ID porque `deal.id = leads.id` (paso 3). Solo se renombra la columna y se ajusta la FK constraint a `REFERENCES public.deal(id)`.
- `lead_property_queue` → renombrar tabla a `contact_property_queue`. Agregar `contact_id` poblándolo desde el mapping, drop FK vieja a leads, drop `lead_id`.
- `bot_conversations.lead_id` → renombrar a `contact_id`, repoblar desde mapping, FK a `contact`.

```sql
-- appointments: la FK ahora apunta a deal (mismo ID, columna renombrada)
ALTER TABLE public.appointments RENAME COLUMN lead_id TO deal_id;
ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_lead_id_fkey,
  ADD CONSTRAINT appointments_deal_id_fkey
    FOREIGN KEY (deal_id) REFERENCES public.deal(id);

-- lead_property_queue → contact_property_queue
ALTER TABLE public.lead_property_queue RENAME TO contact_property_queue;
ALTER TABLE public.contact_property_queue ADD COLUMN contact_id text;
UPDATE public.contact_property_queue q
SET contact_id = m.contact_id
FROM _migration_lead_to_contact m
WHERE q.lead_id = m.lead_id;
ALTER TABLE public.contact_property_queue
  ALTER COLUMN contact_id SET NOT NULL,
  ADD CONSTRAINT contact_property_queue_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES public.contact(id),
  DROP CONSTRAINT lead_property_queue_lead_id_fkey,
  DROP COLUMN lead_id;

-- bot_conversations: misma estrategia que queue
ALTER TABLE public.bot_conversations ADD COLUMN contact_id text;
UPDATE public.bot_conversations bc
SET contact_id = m.contact_id
FROM _migration_lead_to_contact m
WHERE bc.lead_id = m.lead_id;
ALTER TABLE public.bot_conversations
  ALTER COLUMN contact_id SET NOT NULL,
  ADD CONSTRAINT bot_conversations_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES public.contact(id),
  DROP CONSTRAINT bot_conversations_lead_id_fkey,
  DROP COLUMN lead_id;
```

### 3.5 Paso 5 — drop `leads`

Una vez `deal` poblada y FKs migradas:

```sql
DROP TABLE public.leads;
DROP TABLE _migration_lead_to_contact;
```

⚠️ Solo después de validar manualmente que `count(deal) == count(leads pre-mig)` y no hay FK dangling.

### 3.6 Idempotencia

Toda la migración corre en una sola transacción Postgres. Si falla cualquier paso → ROLLBACK total. Dev → staging → prod.

---

## 4. Arquitectura — módulos `features/contacts` + `features/deals`

Reemplaza `features/leads/` (entera).

### 4.1 `features/contacts/`

```
features/contacts/
  domain/
    contact.entity.ts              # Contact + DTOs  ✅ R1 hecha
    contact.repository.ts          # IContactRepository
  application/
    create-contact.use-case.ts
    find-or-create-contact.use-case.ts  # Dedup por phone/email
    get-contacts.use-case.ts
    get-contact-by-id.use-case.ts
    get-contact-by-phone-or-email.use-case.ts
    search-contacts.use-case.ts    # Autocomplete del form de Deal
    update-contact.use-case.ts
    delete-contact.use-case.ts
    restore-contact.use-case.ts
  infrastructure/
    contact.model.ts
    contact.mapper.ts
    drizzle-contact.repository.ts
  presentation/
    actions.ts
    components/                    # Lista, detalle (con sub-secciones deals/citas/bot), dialog crear/editar
```

### 4.2 `features/deals/`

```
features/deals/
  domain/
    deal.entity.ts                 # Deal + DTOs + DealStage type
    deal.repository.ts             # IDealRepository (CRUD + Kanban ops)
  application/
    create-deal.use-case.ts        # Orquesta findOrCreateContact + deal insert
    get-deals.use-case.ts
    get-deal-by-id.use-case.ts
    get-deals-by-contact.use-case.ts
    get-deals-by-property.use-case.ts
    get-deals-by-stage.use-case.ts # Para Kanban columns
    update-deal.use-case.ts
    move-deal-stage.use-case.ts    # Mueve entre columnas Kanban (cambia stage + stage_order)
    reorder-deals-in-stage.use-case.ts  # Reordena dentro de la misma columna
    delete-deal.use-case.ts
    restore-deal.use-case.ts
  infrastructure/
    deal.model.ts
    deal.mapper.ts
    drizzle-deal.repository.ts
  presentation/
    actions.ts
    public-actions.ts              # Form público landing — crea Contact + Deal en stage=prospect
    components/
      deal-kanban.tsx              # Tablero principal (drag&drop)
      deal-kanban-column.tsx       # Columna por etapa
      deal-card.tsx                # Card del deal en el Kanban
      deal-detail-page.tsx
      deal-create-dialog.tsx       # Con autocomplete contact (existente o crear)
```

### 4.3 Domain entities

```ts
// features/contacts/domain/contact.entity.ts (ya creado en R1)
// — sin cambios respecto a R1
```

```ts
// features/deals/domain/deal.entity.ts
export type DealStage =
  | "prospect"
  | "qualified"
  | "visit_scheduled"
  | "negotiation"
  | "reserved"
  | "won"
  | "lost"

export type DealSource =
  | "facebook" | "instagram" | "whatsapp" | "tiktok"
  | "google" | "referral" | "direct"

export interface Deal {
  id: string
  createdByUserId: string
  contactId: string
  propertyId: string
  stage: DealStage
  stageOrder: number
  source?: DealSource
  budget?: string
  message?: string
  propertyTypeSought?: string
  zoneOfInterest?: string
  wantsOffers: boolean
  expectedCloseAt?: string
  closedAt?: string
  lostReason?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  deletedBy?: { userId?: string; userName?: string; userEmail?: string }

  // Join fields populated by infra queries when consumer needs them
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  propertyTitle?: string
}

export interface CreateDealDTO {
  // Either pick an existing contact OR create one inline
  contactId?: string
  contactDraft?: import("@/features/contacts/domain/contact.entity").CreateContactDTO
  propertyId: string
  stage?: DealStage         // default 'prospect' if omitted
  source?: DealSource
  budget?: string
  message?: string
  propertyTypeSought?: string
  zoneOfInterest?: string
  wantsOffers?: boolean
  expectedCloseAt?: string
}

export type UpdateDealDTO = Partial<Omit<CreateDealDTO, "contactId" | "contactDraft">>

export interface DealFilters {
  search: string
  stage: DealStage | "all"
  source: DealSource | "all"
  propertyId?: string
}
```

### 4.4 Use case clave — `createDealUseCase`

```ts
export async function createDealUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  dealRepo: IDealRepository,
  data: CreateDealDTO,
): Promise<Deal> {
  // Resolve contact: existing or create new (with dedup)
  let contactId = data.contactId
  if (!contactId) {
    if (!data.contactDraft) {
      throw new Error("Either contactId or contactDraft must be provided")
    }
    const existing = await contactRepo.findByPhoneOrEmail(
      ctx,
      data.contactDraft.phone,
      data.contactDraft.email,
    )
    contactId = existing
      ? existing.id
      : (await contactRepo.create(ctx, data.contactDraft)).id
  }

  // Reuse active deal if one exists for this contact+property (no duplicates)
  const existingDeal = await dealRepo.findActiveByContactAndProperty(
    ctx,
    contactId,
    data.propertyId,
  )
  if (existingDeal) {
    return existingDeal  // surface to UI; let agent decide whether to reactivate or view
  }

  // Place new deal at bottom of its stage column
  const stage = data.stage ?? "prospect"
  const maxOrder = await dealRepo.maxStageOrder(ctx, stage)

  return dealRepo.create(ctx, {
    ...data,
    contactId,
    stage,
    stageOrder: maxOrder + 1,
  })
}
```

### 4.5 UX — flujo principal "Nuevo Negocio"

```
┌────────────────────────────────────────────┐
│ Nuevo Negocio                              │
├────────────────────────────────────────────┤
│ Contacto:                                  │
│ [escribe nombre, teléfono o email...    ▼] │
│                                            │
│  ↓ mientras escribís se filtran resultados │
│                                            │
│  Carlos López — 7891-xxxx                  │
│  Carlos Mendoza — carlos@gmail.com         │
│                                            │
│  Si no aparece:                            │
│   [+ Crear contacto nuevo]                 │
│   → mini-form inline: nombre*, tel, email  │
│                                            │
│ Propiedad: [autocomplete por título/ID  ▼] │
│                                            │
│ Etapa inicial: [Prospecto ▼]               │
│  (default: Prospecto. Editable)            │
│                                            │
│ Origen: [WhatsApp ▼]                       │
│ Presupuesto: [____________]                │
│ Mensaje: [______________________________]  │
│                                            │
│              [Cancelar]  [Crear Negocio]   │
└────────────────────────────────────────────┘
```

Al escribir en el autocomplete:
1. Llama `searchContactsAction(query)` con debounce 300ms.
2. Si encuentra match → preselecciona.
3. Si NO encuentra y el agente aprieta "+ Crear contacto" → mini-form embebido. Al crear, el contacto se selecciona automáticamente y el form continúa con la prop + etapa + detalles del deal.
4. Si el agente teclea phone/email que coincide con un contact existente y eligió "Crear nuevo" sin querer → toast: "Este teléfono ya existe (Carlos López). ¿Asociar al deal o crear duplicado?".

**Botón secundario "Nuevo Contacto"** (administrativo, sin atar a propiedad): form simple solo con datos personales. Para propietarios, colegas, referidos sin oportunidad concreta.

---

## 5. RLS policies — drizzle/sql/026

Mirrors policies de `leads` actuales sobre `contact` + `deal`. Ya enumeradas en §2.4.

**Cambio de FK en policies existentes:** policies de `appointments`, `bot_conversations`, `contact_property_queue` siguen vigentes — la columna se renombra pero la lógica RLS sigue siendo "org + agent ownership".

**Policy adicional para mover stage:** la UPDATE policy del deal ya cubre el caso porque permite update sobre cualquier columna a owner/admin y solo sobre filas propias a agent. No requiere policy específica de `stage`.

---

## 6. UI — cambios visibles

### 6.1 Sidebar

- "Contactos" → `/dashboard/contacts` (lista de personas).
- "Negocios" → `/dashboard/deals` (Kanban + tabla switcheable).
- "Propiedades" sin cambio.

### 6.2 Página `/dashboard/contacts`

Lista de contacts con filtros (búsqueda + tags). Cada fila muestra: nombre, phone, email, # deals activos, último deal, agente owner.

### 6.3 Página `/dashboard/contacts/[id]` — detalle del contacto

Sub-secciones:
- **Datos personales**: nombre, phone, email, tags, notes, canal preferido.
- **Negocios** — lista de deals (activos arriba, won/lost abajo). Click → detalle del deal.
- **Citas agendadas** — agenda completa (sobre todas las props del contact).
- **Historial de bot** — conversaciones WhatsApp con timestamps.
- **Propiedades vistas (web)** — del `propertyVisits` JSONB.
- Acciones: editar, eliminar, **+ Nuevo Negocio** (preselecciona el contact en el form).

### 6.4 Página `/dashboard/deals` — Kanban (vista principal)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Negocios                                  [Tabla] [Kanban*]  [+ Nuevo Negocio]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Filtros: [Agente▼] [Propiedad▼] [Origen▼] [Búsqueda...]                         │
├─────────┬─────────┬──────────┬────────────┬───────────┬──────────┬─────────────┤
│Prospecto│Calificado│  Visita  │Negociación │ Reservado │ Ganados  │  Perdidos   │
│   12    │    7     │    4     │     3      │     1     │   2 ✓    │    5 ✕      │
├─────────┼─────────┼──────────┼────────────┼───────────┼──────────┼─────────────┤
│ ┌─────┐ │ ┌─────┐ │ ┌──────┐ │ ┌────────┐ │ ┌───────┐ │ ┌──────┐ │ ┌─────────┐ │
│ │Carl │ │ │Juan │ │ │María │ │ │Roberto │ │ │Lucía  │ │ │Diego │ │ │Pablo    │ │
│ │Casa │ │ │Apto │ │ │Lote  │ │ │Comerc. │ │ │Casa   │ │ │Apto  │ │ │Lote     │ │
│ │A    │ │ │B    │ │ │C     │ │ │D       │ │ │E      │ │ │F     │ │ │G        │ │
│ │$80k │ │ │$45k │ │ │$120k │ │ │$200k   │ │ │$95k   │ │ │$60k  │ │ │$110k    │ │
│ └─────┘ │ └─────┘ │ └──────┘ │ └────────┘ │ └───────┘ │ └──────┘ │ └─────────┘ │
│  ...    │  ...    │   ...    │    ...     │           │   ...    │     ...     │
└─────────┴─────────┴──────────┴────────────┴───────────┴──────────┴─────────────┘
```

Características:
- **Drag&drop entre columnas** → cambia `stage` (server action `moveDealStageAction`).
- **Drag&drop dentro de la misma columna** → cambia `stage_order` (server action `reorderDealsInStageAction`).
- **Vista alternativa "Tabla"** para quien prefiere lista plana — toggle en el header.
- Counter por columna arriba (cuántos deals tiene cada etapa).
- Card del deal muestra: nombre del contact + título de la prop + presupuesto + tags del contact.
- Click en card → drawer/page de detalle del deal.

### 6.5 Página `/dashboard/deals/[id]` — detalle del deal

- Header: Contact + Property con links a sus detalles.
- Stage actual + selector para cambiarlo manualmente (alternativa al drag&drop).
- Source, budget, mensaje, presupuesto, fecha estimada de cierre.
- Citas asociadas (sub-sección).
- Acciones: cambiar stage, agendar cita, marcar won/lost (cuando se marca lost → input "razón de pérdida" obligatorio).

### 6.6 Form público (landing → "Quiero más info")

Endpoint público que hoy crea un `lead` ahora:
- Llama `createPublicDealAction` (rate-limited).
- Bajo el capó: `findOrCreateContact` (dedup) + crea Deal en stage `prospect`.

### 6.7 Componente reusable: contact-autocomplete

Usado en: form de Nuevo Negocio, form de Nueva Cita (cuando se agenda sin deal previo, raro), filtro del Kanban "deals de X contacto".

---

## 7. Plan de tests

### 7.1 Migración de datos

| # | Test | Esperado |
|---|---|---|
| MIG1 | Count post-migración: `count(contact) ≤ count(leads pre-mig)` | ✅ dedup reduce o iguala |
| MIG2 | Count post-migración: `count(deal) == count(leads pre-mig)` | ✅ 1:1 leads → deals |
| MIG3 | Lead con phone "+591 7xxx" y otro con "591-7xxx" en misma org → 1 contact, 2 deals | ✅ |
| MIG4 | Lead sin phone ni email → su propio contact (no se agrupa) | ✅ |
| MIG5 | Lead con email duplicado cross-org → contacts distintos (tenancy isolation) | ✅ |
| MIG6 | FK integrity: 0 `appointments` con `deal_id` dangling | ✅ |
| MIG7 | FK integrity: 0 `contact_property_queue` y `bot_conversations` con `contact_id` dangling | ✅ |
| MIG8 | Soft-deleted leads → soft-deleted deals; contacts NO auto-soft-deletados | ✅ |
| MIG9 | Mapping legacy status → stage correcto (`new→prospect`, `contacted→qualified`, `won→won`, etc.) | ✅ |
| MIG10 | `stage_order` recalculado correcto: dentro de cada (org, stage) los rows tienen `0,1,2,...N-1` sin gaps | ✅ |
| MIG11 | Lead con `status='won'` o `'lost'` → deal con `closed_at` poblado | ✅ |
| MIG12 | Lead con `status='discarded'` → deal con `stage='lost'` y `lost_reason='discarded_migration'` | ✅ |
| MIG13 | `propertyVisits` JSONB y `catalogTracking` movidos al contact (no al deal) | ✅ |
| MIG14 | Contact con varios leads mergeados: `propertyVisits` concatenado, `catalogTracking` toma el más reciente | ✅ |

### 7.2 Type / lint / build

| Test | Comando | Esperado |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 errors |
| ESLint | `npm run lint` | 0 errors / 0 warnings |
| Build | `npm run build` | success |

### 7.3 Playwright smoke

| # | Test | Esperado |
|---|---|---|
| T1 | Crear Deal con contact existente (autocomplete) | Reusa contact, crea deal en stage='prospect' |
| T2 | Crear Deal con contact draft cuyo phone ya existe | Dedup: misma contact, deal nuevo |
| T3 | Crear Deal en contact+prop que ya tiene deal activo | Devuelve el existente, NO duplica |
| T4 | Después de marcar deal anterior `won`, crear nuevo deal en mismo contact+prop | Permite (representa nueva oportunidad) |
| T5 | Drag&drop card Kanban Prospecto → Calificado | UPDATE stage. Card aparece en columna nueva. Counter ajusta |
| T6 | Drag&drop dentro de Negociación (reordenar) | UPDATE stage_order. Orden visual respeta |
| T7 | Marcar deal como `lost` desde detalle | Modal pide `lost_reason`. Submit guarda + `closed_at`. Card sale del Kanban activo |
| T8 | Marcar deal como `won` | Pide confirmación. `closed_at` poblado. Card sale del Kanban activo |
| T9 | Borrar contact (soft) → sus deals activos van a papelera | Cascade soft-delete vía use case |
| T10 | Restaurar contact → deals NO se auto-restauran | Restore explícito por deal |
| T11 | Detalle de contact muestra deals + citas + bot conv + visitas web | Joins resuelven |
| T12 | RLS cross-org: user de Org-B no ve contacts/deals de Org-A | Filtrado RLS |
| T13 | Agent solo edita deals propios (`created_by_user_id = sub`) | RLS UPDATE policy |
| T14 | Búsqueda autocomplete contact por phone parcial | Top resultados con dedup |
| T15 | Form público crea Contact + Deal en `prospect` | End-to-end desde landing |
| T16 | Bot conversation existente → migrada → sigue funcional con `contact_id` | Smoke |
| T17 | Analytics: dashboard muestra "Contactos únicos del mes" + "Conversion por etapa" | Metadata legacy tolerada |
| T18 | Toggle Kanban ↔ Tabla mantiene filtros | UX |

### 7.4 Verificación DB

```sql
-- Sin contacts huérfanos (sin deals/appointments/queue/conv)?
-- Es válido que existan (capturados sin oportunidad aún).
SELECT count(*) FROM contact c
WHERE NOT EXISTS (SELECT 1 FROM deal WHERE contact_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM contact_property_queue WHERE contact_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM bot_conversations WHERE contact_id = c.id);

-- 0 deals dangling
SELECT count(*) FROM deal d
WHERE NOT EXISTS (SELECT 1 FROM contact c WHERE c.id = d.contact_id);

-- stage_order sin gaps por (org, stage) activos
SELECT organization_id, stage, count(*), max(stage_order) FROM deal
WHERE deleted_at IS NULL
GROUP BY organization_id, stage
HAVING max(stage_order) != count(*) - 1;
```

---

## 8. Edge cases

| # | Caso | Comportamiento |
|---|---|---|
| EC1 | Phone normalizado idéntico pero email distinto → ¿misma persona? | **SÍ** (phone wins). Email distinto se preserva en el contact tomando el más reciente. Trade-off: si son 2 personas con teléfono familiar, se separan manualmente después |
| EC2 | Email idéntico pero phones distintos | **SÍ** (fallback cuando phone NULL en uno) |
| EC3 | Ambos NULL (solo name) | **NO** se agrupa. Cada uno = su propio contact |
| EC4 | Lead borrado (soft) en migración | Deal soft-deleted. Contact NO se borra |
| EC5 | Lead con `name = NULL` | Contact con `name = "Sin nombre"` |
| EC6 | Misma persona en múltiples orgs | Contacts distintos por tenancy (privacy) |
| EC7 | Crear Deal activo donde ya hay uno: contact+prop con stage `won` o `lost` | Permite — representa nueva oportunidad de venta |
| EC8 | Crear Deal donde ya hay uno activo (stage NOT IN won/lost) | Devuelve el existente. UI ofrece "ver deal existente" |
| EC9 | Mover deal a `lost` sin `lost_reason` | UI pide razón. Backend permite NULL pero UX guía a llenarlo |
| EC10 | Drag&drop a etapa cerrada (won/lost) | Permite. Pide confirmación. Setea `closed_at` |
| EC11 | Drag&drop sale de etapa cerrada (reabrir un deal) | Permite. Limpia `closed_at` + `lost_reason`. Útil cuando se reabre una negociación |
| EC12 | Cambiar phone/email de contact existente | Update del contact. Deals no se ven afectados (siguen con `contact_id`). Display refleja el cambio vía join |
| EC13 | Merge manual de contacts duplicados | ⏭️ Diferido a v2 |
| EC14 | Borrar contact con citas futuras | Hard error: "Tiene citas activas en N deals. Cancela primero" |
| EC15 | Borrar contact sin actividad | Soft delete. Sus deals van a papelera |
| EC16 | Reorder múltiples cards Kanban rápido | Debounce + lock optimista en cliente. Server reconcilia con `stage_order` recalculado |
| EC17 | Race condition: 2 agents mueven el mismo deal a stages distintos | Last-write-wins en server (transacción atómica). UI del primero recibe nuevo state via revalidate |
| EC18 | Public form: spam | Rate limit + heurística (si phone+email ambos vacíos → rechazar) |
| EC19 | Stage_order conflict cuando 2 deals tienen el mismo número | Permitido en schema. UI usa `(stage_order, created_at)` como tiebreaker para orden visual |

---

## 9. Tareas (checkboxes) — orden óptimo de desarrollo

Orden interno por tarea: `implementar → code review → fixes → tests → confirmación → docs → commit`.

> **Nota sobre data:** dev DB no tiene data a conservar (confirmado por Gonzalo 2026-05-13). El algoritmo de migración §3 se escribe completo y se valida con seed sintética antes de aplicarlo — porque sí va a correr en staging/prod más adelante.

### Fase 1 — Diseño Domain (sin dependencias externas)

- [x] **R1** — `features/contacts/domain/contact.entity.ts` (Contact + CreateContactDTO + UpdateContactDTO). ✅ 2026-05-13. Review pass tras fix MINOR (JSDoc inglés). Build + tsc + eslint verdes.
- [x] **R2** — `features/contacts/domain/contact.repository.ts` (IContactRepository — puerto). ✅ 2026-05-13. Review encontró 2 MAJOR + 2 MINOR — todos resueltos. Key fix: eliminado `findAllActive` (redundante para Contact, no hay status). Build + tsc + eslint verdes.
- [x] **R3** — `features/deals/domain/deal.entity.ts` (Deal + CreateDealDTO + UpdateDealDTO + DealStage + DealSource + DealFilters). ✅ 2026-05-13. Review: 3 IMPORTANT issues — #1 false positive (inline import) con evidencia grep, #2 y #3 resueltos (JSDoc `wantsOffers?` default + JSDoc `propertyId?` drill-down). Build + tsc + eslint verdes.
- [x] **R4** — `features/deals/domain/deal.repository.ts` (IDealRepository — incluye `findActiveByContactAndProperty`, `maxStageOrder`, `findByStage`, `moveStage`, `reorderInStage`). ✅ 2026-05-13. Review: 3 IMPORTANT + 3 MINOR — todos resueltos. Decisión clave: introducido `ResolvedCreateDealDTO` para garantizar contact-resolved a nivel tipo (reemplaza intersection hack). Build + tsc + eslint verdes.

### Fase 2 — Drizzle schema TypeScript

- [ ] **R5** — `lib/db/schema/contact.ts` (tabla `contact` con cols de §2.1).
- [ ] **R6** — `lib/db/schema/deal.ts` (tabla `deal` con cols de §2.2 incluyendo `stage` + `stage_order`).
- [ ] **R7** — Renombrar `lib/db/schema/lead-property-queue.ts` → `contact-property-queue.ts`. Variable `leadPropertyQueue` → `contactPropertyQueue`. FK `leadId` → `contactId`.
- [ ] **R8** — Actualizar `lib/db/schema/appointments.ts`: `leadId` → `dealId` (FK a `deal.id`).
- [ ] **R9** — Actualizar `lib/db/schema/bot-conversations.ts`: `leadId` → `contactId` (FK a `contact.id`).
- [ ] **R10** — Actualizar `lib/db/schema/enums.ts`: agregar `dealStageEnum` (7 valores) + `dealSourceEnum` (rename desde leadSource). Conservar enums viejos durante la transición (se borran en Fase 9).
- [ ] **R11** — Actualizar `lib/db/schema/index.ts` (barrel): exportar nuevos schemas + mantener `leads` export hasta cleanup final.

### Fase 3 — Migración SQL + apply en dev

- [ ] **R12** — Escribir `drizzle/sql/026_contact_deal_refactor.sql`:
  - `BEGIN;` transaccional.
  - DDL `CREATE TYPE deal_stage_enum AS ENUM(...)` (7 valores).
  - DDL `CREATE TABLE contact` + índices (§2.1).
  - DDL `CREATE TABLE deal` + índices + FK a `contact` + `properties` (§2.2).
  - Mapping algoritmo §3.1 + §3.2 con tabla auxiliar `_migration_lead_to_contact`.
  - Inserts §3.3 con CASE de status legacy → stage nuevo.
  - Recalcular `stage_order` por (org, stage).
  - Migración tablas dependientes §3.4: appointments `lead_id → deal_id`, queue rename + nueva col, bot_conversations idem.
  - Mover `propertyVisits` JSONB + `catalogTracking` al contact.
  - RLS policies sobre `contact` + `deal`.
  - **NO** drop de `leads` aquí — se hace al final.
  - `COMMIT;`.
- [ ] **R13** — Aplicar migración R12 en Supabase dev via MCP `apply_migration`. Verificar éxito.
- [ ] **R14** — Validar §7.4 verificación DB. Si discrepancias → drop tablas nuevas en dev + arreglar SQL + reaplicar.

### Fase 4 — Infrastructure repos

- [ ] **R15** — `features/contacts/infrastructure/contact.model.ts`.
- [ ] **R16** — `features/contacts/infrastructure/contact.mapper.ts` (incluye `propertyVisits` JSONB↔array, `catalogTracking` flat↔nested).
- [ ] **R17** — `features/contacts/infrastructure/drizzle-contact.repository.ts` con `findByPhoneOrEmail`, `searchByQuery`, CRUD + soft-delete. withRLS.
- [ ] **R18** — `features/deals/infrastructure/deal.model.ts`.
- [ ] **R19** — `features/deals/infrastructure/deal.mapper.ts` (join contact + property para display).
- [ ] **R20** — `features/deals/infrastructure/drizzle-deal.repository.ts` con CRUD + `findActiveByContactAndProperty` + `maxStageOrder` + `moveStage` (atómico: UPDATE stage + recalcular stage_order de origen y destino) + `reorderInStage` (UPDATE stage_order con CTE batch).

### Fase 5 — Application use cases

- [ ] **R21** — `features/contacts/application/` (9 archivos): create, find-or-create, get-list, get-by-id, get-by-phone-or-email, search, update, delete, restore.
- [ ] **R22** — `features/deals/application/` (10 archivos): create (orquesta find-or-create-contact), get-list, get-by-id, get-by-contact, get-by-property, get-by-stage, update, move-stage, reorder-in-stage, delete, restore.

### Fase 6 — Server Actions + components base

- [ ] **R23** — `features/contacts/presentation/actions.ts` (thin auth actions).
- [ ] **R24** — `features/contacts/presentation/components/`: contact-list, contact-detail (con sub-secciones), contact-edit-dialog, **contact-autocomplete** (reusable).
- [ ] **R25** — `features/deals/presentation/actions.ts` (auth) + `public-actions.ts` (form público landing).
- [ ] **R26** — `features/deals/presentation/components/deal-create-dialog.tsx` (con contact-autocomplete embebido + mini-form contact inline).
- [ ] **R27** — `features/deals/presentation/components/deal-detail-page.tsx`.

### Fase 7 — Kanban UI (drag&drop)

- [ ] **R28** — Elegir librería drag&drop. Reco: **dnd-kit** (mantenido, accesible, soporta touch, ~10kb). Alternativas evaluadas: react-beautiful-dnd (deprecada), pragmatic-drag-and-drop (Atlassian, más nuevo). Decisión en code review.
- [ ] **R29** — `features/deals/presentation/components/deal-kanban-column.tsx`: columna con drop zone, header con counter, ordena por `stageOrder`.
- [ ] **R30** — `features/deals/presentation/components/deal-card.tsx`: card draggable. Muestra contact name, property title, budget, tags.
- [ ] **R31** — `features/deals/presentation/components/deal-kanban.tsx`: tablero principal. Maneja `onDragEnd` → `moveDealStageAction` o `reorderDealsInStageAction`. Optimistic update con rollback en error.
- [ ] **R32** — `features/deals/presentation/components/deal-stage-badge.tsx`: badge reusable con color por etapa (Prospecto azul / Calificado celeste / Visita amarillo / Negociación naranja / Reservado violeta / Ganado verde / Perdido rojo).
- [ ] **R33** — Toggle vista Kanban ↔ Tabla en `/dashboard/deals`. Filtros (agente, propiedad, origen, búsqueda) afectan ambas vistas.

### Fase 8 — Migrar módulos dependientes

- [ ] **R34** — `features/appointments`: entity (`leadId` → `dealId`), mapper, repo, use cases, UI. Joins desde appointment a deal → contact + property.
- [ ] **R35** — `features/bot`: `bot_conversations.lead_id` → `contact_id` en entity, repo, use cases, UI.
- [ ] **R36** — `features/analytics`: nuevos eventos con `contactId` + `dealId`. Lectura tolerante a `metadata.leadId` legacy.
- [ ] **R37** — `features/dashboard`: aggregations actualizadas — "contactos únicos", "deals activos por stage", "conversion rate funnel", "top agente por deals ganados".
- [ ] **R38** — `features/ai-contents`: review explícita (sin cambios esperados, verificar imports).

### Fase 9 — UI dashboard (páginas standalone)

- [ ] **R39** — Página `app/dashboard/contacts/page.tsx` + `[id]/page.tsx`.
- [ ] **R40** — Página `app/dashboard/deals/page.tsx` (Kanban + Tabla) + `[id]/page.tsx` (detalle).
- [ ] **R41** — Sidebar: agregar "Contactos" + "Negocios". Reemplazar "Leads" si existe en el sidebar actual.
- [ ] **R42** — Form público en `/p/[id]` apunta a `createPublicDealAction`.

### Fase 10 — Cleanup

- [ ] **R43** — Eliminar carpeta `features/leads/` entera.
- [ ] **R44** — Eliminar `lib/db/schema/leads.ts` + remover del barrel.
- [ ] **R45** — Eliminar enums legacy en `lib/db/schema/enums.ts`.
- [ ] **R46** — SQL `drizzle/sql/027_drop_legacy_leads.sql`: `DROP TABLE public.leads;`. Aplicar en dev.

### Fase 11 — Tests + docs + commits

- [ ] **R47** — Smoke Playwright §7.3 (T1–T18). Tabla de resultados obligatoria.
- [ ] **R48** — Actualizar `docs/implementation-plan.md`: marcar refactor + actualizar referencias a `leads`.
- [ ] **R49** — Actualizar `CLAUDE.md`: sección "Tenancy & Auth Model", "Project Structure", entity examples Contact+Deal, null safety pattern.
- [ ] **R50** — Actualizar `docs/plans/2026-05-13-property-transfers.md`: renombrar `inquiry` → `deal`, ajustar counts schema, ajustar cascade.
- [ ] **R51** — Commits agrupados por fase (~11 commits totales).

### Dependencias entre tareas

```
Fase 1 (Domain) ────────► Fase 2 (Schema TS) ───► Fase 3 (SQL apply) ──► Fase 4 (Repos)
                                                                              │
                                                                              ▼
                                                                       Fase 5 (Use cases)
                                                                              │
                                                                              ▼
                                                                  Fase 6 (Actions + base UI)
                                                                              │
                                                                              ▼
                                                                      Fase 7 (Kanban UI)
                                                                              │
                                                                              ▼
                                                                  Fase 8 (Migrar deps)
                                                                              │
                                                                              ▼
                                                                  Fase 9 (Páginas dashboard)
                                                                              │
                                                                              ▼
                                                                       Fase 10 (Cleanup)
                                                                              │
                                                                              ▼
                                                                  Fase 11 (Tests + docs)
```

---

## 10. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migración pierde data por bug de mapping | Baja | Crítico | Backup pre-migración. Transaccional (rollback total). Conteos pre/post §7.1. Dev → staging → prod |
| Dedup agresivo merge personas con phone compartido | Media | Medio | UI futura para "split contact". Aceptamos riesgo (más raro que el dolor de duplicados actuales) |
| Refactor toca demasiados módulos a la vez → rama de larga vida | Alta | Medio | Fasear en R1-R51. Cada fase es commit propio. Cada fase deja branch buildable |
| Analytics queries históricas rompen porque `metadata.leadId` ya no existe | Media | Bajo | Eventos viejos NO se reescriben — siguen con `leadId`. Service lee `metadata.dealId ?? metadata.leadId` |
| Bot en producción rompe durante refactor | Media | Crítico | Bot está mock. Cuando se conecte (Capa 4) ya estará el nuevo modelo. Sin riesgo prod hoy |
| FK cascade DROP destruye datos | Baja | Crítico | NUNCA `DROP TABLE leads CASCADE`. Validar FK migration antes del drop final |
| Drag&drop optimistic update se desincroniza con server | Media | Bajo | Rollback visual en error + revalidate del Kanban. UX clara cuando algo falla |
| Race condition: 2 agents mueven mismo deal a la vez | Baja | Bajo | Last-write-wins en server (transacción atómica). Real-time futuro vía Supabase Realtime channels para Kanban si se necesita |

---

## 11. Rollback plan

Si la migración rompe algo después de aplicarse en prod:

1. Restaurar backup pre-migración (Supabase point-in-time recovery o `pg_dump`).
2. Revertir merge del PR del refactor.
3. Investigar causa raíz off-prod.

No hay migración inversa automatizada — es trabajo equivalente al refactor mismo. Backup + revert es la estrategia.

---

## 12. Decisiones cerradas

| # | Decisión | Resolución |
|---|---|---|
| D1 | Modelo target | ✅ Contact + Deal + Pipeline funnel (validado contra AlterEstate / Tokko / HubSpot) |
| D2 | Unicidad de Contact en DB | ❌ NO UNIQUE constraint. Dedup en use case |
| D3 | Estrategia de dedup en migración | ✅ Phone first, email fallback, ambos NULL → no agrupar |
| D4 | Conservar `id` de leads como `id` de deals | ✅ Preserva FKs sin re-mapping de IDs |
| D5 | Rename FKs en tablas dependientes | ✅ `appointments.lead_id` → `deal_id`. `bot_conversations.lead_id` → `contact_id`. `lead_property_queue.lead_id` → `contact_id` |
| D6 | Renombrar enums | ✅ `lead_status_enum` → `deal_stage_enum` (con 7 valores, no 5). `lead_source_enum` → `deal_source_enum` |
| D7 | Analytics historical events | ✅ Lectura tolerante a ambos. NO rewrite del historial |
| D8 | UI merge manual de contacts duplicados | ⏭️ Diferido a v2 |
| D9 | Etapas del funnel | ✅ 7 fijas: Prospecto / Calificado / Visita / Negociación / Reservado / Cerrado-Ganado / Cerrado-Perdido. Hardcoded — configurable por org en v2 |
| D10 | Vista Kanban | ✅ Incluida en este refactor (R28–R33). Drag&drop con dnd-kit. Vista tabla alternativa |
| D11 | Citas (`appointments`) — ¿atadas a contact o a deal? | ✅ Atadas a **deal** — porque la cita es la visita física de un negocio concreto. Si transferís el deal, la cita va con él |
| D12 | Queue del bot — ¿atado a contact o deal? | ✅ Atado a **contact** — el bot sugiere props a una persona; cuando muestra interés se crea un deal |
| D13 | Reusar deal activo en mismo contact+prop | ✅ SÍ — si ya hay deal `NOT IN (won, lost)`, devolverlo en lugar de duplicar. UI ofrece "ver existente" |
| D14 | Crear nuevo deal donde había uno `won/lost` | ✅ Permite — nueva oportunidad de venta |
| D15 | `lost_reason` obligatorio | UI: sí pide. Backend: opcional (acepta NULL para flexibilidad) |
| D16 | `expected_close_at` y `closed_at` | ✅ Incluidos en schema para soportar forecasting y reporting futuro sin nuevo refactor |

---

## 13. Pre-flight checks antes de empezar R2

- [x] Branch `feat/contact-inquiry-refactor` creada desde `main` (post-merge PR #4, commit `ab279a2`).
- [x] R1 (Contact entity) completada y commiteada.
- [x] Sin data real en dev DB (confirmado por Gonzalo 2026-05-13).
- [x] Acceso a Supabase MCP `apply_migration` confirmado.
- [x] Plan confirmado con Gonzalo (2026-05-13): modelo Contact + Deal + Funnel con 7 etapas + Kanban.
