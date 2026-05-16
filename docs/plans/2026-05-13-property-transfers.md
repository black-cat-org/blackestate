# Sub-plan — Transferencia de propiedades entre agentes

**Fecha:** 2026-05-13
**Branch:** `feat/property-transfers`
**Pre-requisito:** `docs/plans/2026-05-13-contact-deal-refactor.md` mergeado (modelo Contact + Deal + Funnel activo).
**Tareas plan maestro:** `2.1.15.13`, `2.1.15.14`, `2.4.1`–`2.4.4` (2.4.5 ⏭️ Capa 4)
**Estado actual:** schema `property_transfers` ✅ + RLS ✅ + permisos `property.assign` ✅. Falta: aplicación, server actions, UI, notificación email + realtime.

---

## 1. Resumen

Owner/admin transfiere **N propiedades de un agente origen a un agente destino** dentro de la misma org. La operación hace **cascade configurable** sobre lo que cuelga de esas props (deals, appointments, ai_contents, contact_property_queue) actualizando `created_by_user_id`. Toda la operación corre en **una transacción** con audit row en `property_transfers`. El receptor:

1. **Ve la transferencia en su sidebar** (badge con count de pendientes) — SSR en page-load.
2. **Recibe push en tiempo real** vía Supabase Realtime broadcast — sin refrescar.
3. **Recibe email transaccional** — entregado vía `after()` post-action.
4. Marca la transferencia como revisada (`acknowledgedAt`) desde el inbox.

**No es:** transferencia de propiedad a otra org, transferencia sin cascade obligatorio (las deals siempre van, los contacts son opt-in via toggle), transferencia que mueve datos a un agente fuera de la org.

---

## 2. Por qué depende del refactor Contact+Inquiry+Deal

Con el modelo viejo (`leads` mono-tabla mezclando persona + interés + oportunidad), cascadear leads en un transfer significaba arrastrar la identidad del contacto — perdías la posibilidad de "conservar al contacto como tuyo aunque la prop concreta se vaya a Bob".

Con el modelo nuevo (Contact + Inquiry + Deal — sub-plan `2026-05-13-contact-inquiry-refactor.md`), la separación es natural y cada entidad cascadea distinto según lo que representa:

| Entidad | ¿Cascadea en transfer? | Razón |
|---|---|---|
| **Property** | sí (es lo que se transfiere) | Es el sujeto del transfer. `created_by_user_id` pasa al destino. |
| **Deal** | **sí, siempre** | Una Deal es **compromiso comercial real** del agente sobre una prop concreta (visita agendada, negociación abierta, reserva). El compromiso está atado a la prop — si la prop se va, la responsabilidad de cerrarla se va con ella. El receptor necesita continuar la negociación. |
| **Inquiry** | **no, nunca** | Una Inquiry es **interés ligero histórico** ("Carlos llenó el form preguntando por Casa A"). Es un registro de la conversación que el Contact tuvo con el agente original, no un compromiso. Vive con el Contact (su historial) y **NO se mueve con la prop**. Si transfieres el Contact (toggle opcional, ver siguiente fila), las Inquiries lo siguen porque viven en su línea de tiempo — no porque las cascadee el transfer de prop. |
| **Contact** | **opt-in** via toggle | Identidad de la persona. Por default queda con el agente original — el "directorio" es del agente, no de la prop. El toggle "transferir también los contactos asociados" lo activa para casos como "Alice se va de la agencia" donde todo su pipeline (contacts + sus inquiries históricas + sus deals + citas + queue) pasa a Bob. |
| **Appointment** | sí (vía `deal_id`) | Visita agendada atada a un Deal; viaja con él. |
| **AI content** | sí (vía `property_id`) | Brochures generados para la prop. |
| **`contact_property_queue`** | sí (vía `property_id`) | Cola de envío de la prop al contact; vive en el contexto de la prop. |

**Justificación operativa de "Inquiry no cascadea":** imaginá que Alice recibió 20 Inquiries sobre 10 props distintas durante el último año. Si vendemos 3 de esas props a Bob, Bob no necesita ver las 6 Inquiries históricas asociadas — son conversaciones que Alice tuvo y para las que ya decidió no abrir un Deal. Cascadear Inquiries (a) ensucia la inbox de Bob con contactos cold que no conoce, (b) le da visibilidad sobre contactos privados de Alice (contactos cuya información comercial vive con Alice), y (c) confunde el funnel de Bob mezclando "interés histórico de otro agente" con "interés mío activo".

La regla derivada es simple: **lo que cascadea en transfer de prop es lo que tiene compromiso comercial activo del agente sobre esa prop concreta. El registro de conversaciones pasadas no es compromiso — vive con el Contact.**

Esto elimina el toggle por categoría que habíamos discutido antes (leads/citas/contenidos/cola). Ahora el toggle es uno solo: "**¿transferir también los contactos asociados?**" — y la cascada de Inquiries se decide automáticamente por dónde vive el Contact (con el agente original → Inquiries con él; con el destino → Inquiries con él).

---

## 3. Arquitectura

Módulo nuevo `features/property-transfers/` con Clean Architecture estricta (template: `features/properties/`).

```
features/property-transfers/
  domain/
    property-transfer.entity.ts      # PropertyTransfer entity + DTOs + warnings
    property-transfer.repository.ts  # IPropertyTransferRepository (port)
  application/
    preview-transfer.use-case.ts     # Counts sin ejecutar
    execute-transfer.use-case.ts     # Bulk transfer + cascade + audit + broadcast + email
    get-transfers.use-case.ts        # Listado realizadas/recibidas
    acknowledge-transfer.use-case.ts # Marca revisada
    get-pending-ack-count.use-case.ts# Badge sidebar
  infrastructure/
    property-transfer.model.ts
    property-transfer.mapper.ts
    drizzle-property-transfer.repository.ts
    email/
      property-transfer-email.tsx    # React Email template
    realtime-broadcast-transfer.ts   # Mirror de realtime-broadcast.ts (membership)
  presentation/
    actions.ts                       # Server Actions
    components/
      transfers-page.tsx             # Listado tabs (realizadas/recibidas/todas)
      bulk-transfer-dialog.tsx       # Selección + agente destino + toggle + preview + confirm
      transfer-inbox-card.tsx        # Row receptor + ack button
      transfer-list-row.tsx          # Row genérica de listado
      pending-ack-badge.tsx          # Indicador sidebar (SSR + realtime refresh)
      realtime-transfer-refresher.tsx# Client component: subscribe a `user:{userId}:property_transfers`
```

### 3.1 Domain entity

```ts
// features/property-transfers/domain/property-transfer.entity.ts
export interface PropertyTransfer {
  id: string
  organizationId: string
  fromUserId: string
  toUserId: string
  transferredByUserId: string
  propertyIds: string[]
  counts: {
    properties: number
    contacts: number       // count cuando transferContacts = true; 0 si no
    deals: number
    appointments: number
    aiContents: number
    queueItems: number
  }
  transferContacts: boolean   // NUEVO — registra si la opción se activó
  acknowledgedAt?: Date
  notes?: string
  createdAt: Date
  // Denormalized via JOIN public.member:
  fromUserName?: string
  fromUserEmail?: string
  toUserName?: string
  toUserEmail?: string
  transferredByUserName?: string
}

export interface TransferPreview {
  fromUserId: string
  toUserId: string
  propertyIds: string[]
  transferContacts: boolean
  counts: PropertyTransfer["counts"]
  warnings: TransferWarning[]
}

export type TransferWarning =
  | { code: "destination_inactive"; message: string }
  | { code: "properties_not_found"; missingIds: string[] }
  | { code: "properties_not_owned_by_source"; ids: string[] }
  | { code: "properties_deleted"; ids: string[] }
  | { code: "contact_has_other_deals"; contactIds: string[]; note: string }
  // ↑ Solo cuando transferContacts = true Y el contact tiene deals en
  //   props que NO están en el batch — el receptor "hereda" un contact
  //   con visibilidad cruzada. Decisión del operador.

export interface ExecuteTransferInput {
  fromUserId: string
  toUserId: string
  propertyIds: string[]
  transferContacts: boolean
  notes?: string
}
```

**Schema change requerido:** agregar columna `transfer_contacts boolean NOT NULL default false` y `contacts_count integer NOT NULL default 0` a `property_transfers`. Generar con `drizzle-kit generate` (cambio aditivo, no destructivo).

### 3.2 Schema review (post-refactor + ajuste)

Tabla `property_transfers` con ajustes:

| Columna | Cambio | Razón |
|---|---|---|
| `leads_count` | RENAME → `deals_count` | Coherencia con refactor Contact+Deal |
| `contacts_count` | **NUEVA** `integer NOT NULL default 0` | Audit count cuando transferContacts=true |
| `transfer_contacts` | **NUEVA** `boolean NOT NULL default false` | Audit flag de si se transfirieron contacts |

Migración: `drizzle/sql/027_property_transfers_contacts_columns.sql` — aditiva, sin destructivo.

### 3.3 Repository interface

```ts
export interface IPropertyTransferRepository {
  preview(ctx: SessionContext, input: PreviewInput): Promise<TransferPreview>
  execute(ctx: SessionContext, input: ExecuteTransferInput): Promise<PropertyTransfer>
  findAllForUser(ctx: SessionContext): Promise<PropertyTransfer[]>
  findPendingAckForUser(ctx: SessionContext): Promise<PropertyTransfer[]>
  countPendingAckForUser(ctx: SessionContext): Promise<number>
  acknowledge(ctx: SessionContext, transferId: string): Promise<PropertyTransfer>
}
```

### 3.4 Drizzle repository — método `execute` (transacción atómica)

`execute(ctx, input)` corre **todo en una sola `withRLS` transacción**:

1. `SELECT id, created_by_user_id, deleted_at FROM properties WHERE id = ANY(:ids) AND organization_id = ctx.orgId FOR UPDATE`
   → defense-in-depth: `organization_id` + `FOR UPDATE` (lock).
2. Validar:
   - Todos los IDs existen → si no: `PROPERTIES_NOT_FOUND`.
   - Todos pertenecen a `fromUserId` → si no: `PROPERTIES_NOT_OWNED_BY_SOURCE`.
   - Ninguno está soft-deleted → si no: `PROPERTIES_DELETED`.
3. `SELECT 1 FROM member WHERE user_id = :toUserId AND organization_id = ctx.orgId AND deleted_at IS NULL AND role IN ('owner','admin','agent')`
   → si no: `DESTINATION_NOT_IN_ORG`.
4. `fromUserId != toUserId` (defense-in-depth post UI validation) → si no: `SAME_AGENT_TRANSFER`.
5. `UPDATE properties SET created_by_user_id = :toUserId WHERE id = ANY(:ids) AND organization_id = ctx.orgId` → updated count.
6. `UPDATE deal SET created_by_user_id = :toUserId WHERE property_id = ANY(:ids) AND organization_id = ctx.orgId AND deleted_at IS NULL RETURNING id` → `dealsCount`.
7. `UPDATE appointments SET created_by_user_id = :toUserId WHERE property_id = ANY(:ids) AND organization_id = ctx.orgId AND deleted_at IS NULL RETURNING id` → `appointmentsCount`.
8. `UPDATE ai_contents SET created_by_user_id = :toUserId WHERE property_id = ANY(:ids) AND organization_id = ctx.orgId AND deleted_at IS NULL RETURNING id` → `aiContentsCount`.
9. `UPDATE contact_property_queue SET created_by_user_id = :toUserId WHERE property_id = ANY(:ids) AND organization_id = ctx.orgId AND deleted_at IS NULL RETURNING id` → `queueItemsCount`.
10. **Si `transferContacts === true`:**
    - Resolver set de contacts afectados: `SELECT DISTINCT contact_id FROM deal WHERE property_id = ANY(:ids) AND organization_id = ctx.orgId AND deleted_at IS NULL`.
    - `UPDATE contact SET created_by_user_id = :toUserId WHERE id = ANY(:contactIds) AND organization_id = ctx.orgId AND deleted_at IS NULL RETURNING id` → `contactsCount`.
11. `INSERT INTO property_transfers (...)` con todos los counts + `transfer_contacts`.

**RLS doble defensa:** policies UPDATE de las 5+1 tablas ya filtran por org + agent ownership. Como ejecutor es owner/admin, RLS permite. El filtro `organization_id = ctx.orgId` explícito en cada UPDATE es defense-in-depth obligatoria (zero-trust CLAUDE.md).

**ROLLBACK si cualquier paso falla.**

### 3.5 Acknowledgment — RPC SECURITY DEFINER

La RLS de `property_transfers` es append-only (NO UPDATE policy). Para setear `acknowledged_at` sin romper inmutabilidad:

**RPC `public.acknowledge_property_transfer(p_id text)` SECURITY DEFINER:**
- Lee `auth.uid()`, valida `to_user_id = auth.uid()` (solo receptor).
- Valida `organization_id = (auth.jwt() ->> 'active_org_id')::uuid` (no ack cross-org).
- Valida `acknowledged_at IS NULL` → si ya estaba: `already_acknowledged`.
- `UPDATE public.property_transfers SET acknowledged_at = now() WHERE id = p_id`.
- Retorna row actualizada.

Patrón mirrors `bootstrap_organization` / `accept_invitation`. Migración: `drizzle/sql/028_acknowledge_property_transfer_rpc.sql`.

### 3.6 Realtime broadcast — mirror del invitation pattern

**Channel topic:** `user:{userId}:property_transfers` (mismo namespace que `user:{userId}:membership`).

**RLS policy nueva** (`drizzle/sql/029_realtime_user_property_transfers_channel_rls.sql`): mirror exacto de `drizzle/sql/018_realtime_user_membership_channel_rls.sql`. Solo el propio `auth.uid()` puede subscribirse a `user:{auth.uid()}:property_transfers`.

**Server-side broadcast** (`features/property-transfers/infrastructure/realtime-broadcast-transfer.ts`):

```ts
import "server-only"
import { requireSupabaseEnv } from "@/lib/supabase/env"

export function transferChannelTopic(userId: string): string {
  return `user:${userId}:property_transfers`
}

export interface TransferReceivedPayload {
  type: "transfer_received"
  transferId: string
  fromUserName: string
  propertyCount: number
  dealsCount: number
  appointmentsCount: number
}

export async function broadcastTransferReceived(
  userId: string,
  payload: TransferReceivedPayload,
): Promise<void> {
  // Idéntico al patrón de broadcastMembershipChange:
  // - Endpoint REST /realtime/v1/api/broadcast
  // - private: true flag (los suscriptores joinan con { config: { private: true } })
  // - Best-effort (log non-2xx, no throw)
  // Implementación completa en T6.
}
```

**Client-side listener** (`features/property-transfers/presentation/components/realtime-transfer-refresher.tsx`): mirror de `components/realtime-membership-refresher.tsx`. Mounted en dashboard layout. Subscribe + handler:

```tsx
const channel = supabase
  .channel(`user:${userId}:property_transfers`, { config: { private: true } })
  .on("broadcast", { event: "transfer_received" }, async ({ payload }) => {
    // 1. Toast notification: "Recibiste 3 propiedades de Alice"
    // 2. router.refresh() para recalcular badge + listas
  })
  .subscribe()
```

### 3.7 Email — mirror del invitation pattern

**Template** (`features/property-transfers/infrastructure/email/property-transfer-email.tsx`): React Email primitives (BrandLayout, EmailButton, InfoSection, Footer). Sigue el patrón de `features/shared/infrastructure/email/invitation-email.tsx`.

**Subject:** `"{fromUserName} te transfirió {N} propiedad(es)"`.

**Body:**
- Saludo al receptor por nombre.
- "**{fromUserName}** te transfirió {N} propiedad(es) en **{orgName}**".
- Detalle counts: "{X} negocios, {Y} citas, {Z} contenidos AI" (solo categorías con count > 0).
- `notes` opcional (si lo escribió el operador).
- Botón CTA → `${NEXT_PUBLIC_APP_URL}/dashboard/transfers`.
- Footer estándar.

**Dispatch:** dentro del Server Action `executeTransferAction`, post-`executeTransferUseCase` exitoso, dentro de un `after()` block (no bloquea response). Best-effort: si SMTP falla → log + invitación a refrescar inbox manualmente.

```ts
after(async () => {
  try {
    const result = await sendEmail({
      to: toUserEmail,
      subject: transferEmailSubject({ fromUserName, count: propertyIds.length }),
      react: createElement(PropertyTransferEmail, {
        toUserName,
        fromUserName,
        organizationName,
        counts: transfer.counts,
        notes: transfer.notes,
        dashboardUrl: buildTransfersUrl(),
      }),
    })
    if (!result.success) {
      console.error("[property-transfers] email send failed:", result.error.message)
    }
  } catch (err) {
    console.error("[property-transfers] email runtime error:", err)
  }
})
```

### 3.8 Use cases (Application)

- `previewTransferUseCase(ctx, repo, input)` — gates por `ctx.role ∈ {owner, admin}` + delega a `repo.preview`.
- `executeTransferUseCase(ctx, repo, input)` — gates + delega + retorna `PropertyTransfer`. Errores de dominio tipados.
- `getTransfersUseCase(ctx, repo)` — delega a `repo.findAllForUser`.
- `acknowledgeTransferUseCase(ctx, repo, id)` — delega a `repo.acknowledge` (que llama RPC).
- `getPendingAckCountUseCase(ctx, repo)` — delega a `repo.countPendingAckForUser`.

### 3.9 Server Actions

```ts
// features/property-transfers/presentation/actions.ts
"use server"

import { after } from "next/server"
import { createElement } from "react"
import { revalidatePath } from "next/cache"
// ... imports

const transferRepo = new DrizzlePropertyTransferRepository()
const memberRepo = new DrizzleMemberRepository()  // para resolver toUserEmail + name
const orgRepo = new DrizzleOrganizationRepository()  // para organizationName

export async function previewTransferAction(input: PreviewInput): Promise<TransferPreview> {
  const ctx = await getSessionContext()
  return previewTransferUseCase(ctx, transferRepo, input)
}

export async function executeTransferAction(input: ExecuteTransferInput): Promise<PropertyTransfer> {
  const ctx = await getSessionContext()
  const transfer = await executeTransferUseCase(ctx, transferRepo, input)

  // Resolve display data for email + broadcast (avoid Admin API)
  const [toMember, fromMember, org] = await Promise.all([
    memberRepo.findByUserId(ctx, transfer.toUserId),
    memberRepo.findByUserId(ctx, transfer.fromUserId),
    orgRepo.findById(ctx, ctx.orgId),
  ])

  after(async () => {
    // Broadcast realtime
    await broadcastTransferReceived(transfer.toUserId, {
      type: "transfer_received",
      transferId: transfer.id,
      fromUserName: fromMember?.name ?? fromMember?.email ?? "Un compañero",
      propertyCount: transfer.counts.properties,
      dealsCount: transfer.counts.deals,
      appointmentsCount: transfer.counts.appointments,
    })

    // Email
    if (toMember?.email && org) {
      try {
        await sendEmail({
          to: toMember.email,
          subject: transferEmailSubject({
            fromUserName: fromMember?.name ?? "Un compañero",
            count: transfer.counts.properties,
          }),
          react: createElement(PropertyTransferEmail, {
            toUserName: toMember.name ?? toMember.email.split("@")[0],
            fromUserName: fromMember?.name ?? "Un compañero",
            organizationName: org.name,
            counts: transfer.counts,
            notes: transfer.notes,
            dashboardUrl: buildTransfersUrl(),
          }),
        })
      } catch (err) {
        console.error("[property-transfers] email runtime error:", err, { transferId: transfer.id })
      }
    }
  })

  revalidatePath("/dashboard/transfers")
  revalidatePath("/dashboard/properties")
  return transfer
}

export async function getTransfersAction(): Promise<PropertyTransfer[]> {
  const ctx = await getSessionContext()
  return getTransfersUseCase(ctx, transferRepo)
}

export async function acknowledgeTransferAction(id: string): Promise<PropertyTransfer> {
  const ctx = await getSessionContext()
  const result = await acknowledgeTransferUseCase(ctx, transferRepo, id)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/transfers")
  return result
}

export async function getPendingAckCountAction(): Promise<number> {
  const ctx = await getSessionContext()
  return getPendingAckCountUseCase(ctx, transferRepo)
}
```

### 3.10 UI components

#### `bulk-transfer-dialog.tsx`

Disparado desde el listado de propiedades con selección múltiple:

```
┌─────────────────────────────────────────────┐
│ Transferir 3 propiedades                    │
├─────────────────────────────────────────────┤
│ Transferir a:                               │
│ [▼ Selecciona agente destino       ]        │
│                                             │
│ ☐ Transferir también los contactos          │
│   asociados a estas propiedades.            │
│   (Por defecto los contactos siguen siendo  │
│   tuyos; los negocios se mueven al destino)│
│                                             │
│ ── Resumen ──────────────────────────────── │
│   3 propiedades                             │
│   12 negocios                            │
│   5 citas agendadas                         │
│   8 contenidos AI                           │
│   4 ítems en cola del bot                   │
│   ⚠ 2 contactos tienen negocios en otras   │
│     propiedades — ven info de Bob ahora     │
│     (solo si activás el toggle)             │
│                                             │
│ Notas (opcional):                           │
│ [____________________________________]      │
│                                             │
│           [Cancelar]   [Transferir]         │
└─────────────────────────────────────────────┘
```

Estados:
- Selector de agente destino: query `members` de la org (excluye `fromUserId` y `deleted_at IS NOT NULL`).
- Toggle "transferir contactos": default OFF. Si ON → preview recalcula con `transferContacts: true`.
- Preview recalcula vía `previewTransferAction` cada vez que cambia toUserId o toggle (debounce 200ms).
- Botón "Transferir" deshabilitado si preview tiene warnings que bloquean (e.g. `DESTINATION_NOT_IN_ORG`).
- Loading state durante execute. Toast success/error.

#### `transfers-page.tsx`

```
/dashboard/transfers — RSC

Tabs:
  - Recibidas (acknowledgedAt IS NULL primero, luego ack ordenadas desc)
  - Realizadas (yo soy fromUserId o transferredByUserId)
  - Todas de la org (solo owner/admin)
```

Cada tab muestra `transfer-list-row.tsx` con: agente origen → agente destino, count props, fecha, estado ack. En "Recibidas" + pending → `transfer-inbox-card.tsx` con botón "Marcar como revisado".

#### `pending-ack-badge.tsx`

Server Component renderizado en sidebar. Llama `getPendingAckCountAction()` en server render. Si count > 0 → muestra dot rojo + número.

Refresh cuando:
- Page navigation (re-render natural).
- Realtime broadcast llega (handler en `realtime-transfer-refresher.tsx` llama `router.refresh()`).
- Tras ack (server action `revalidatePath('/dashboard')`).

#### `realtime-transfer-refresher.tsx`

Client Component mounted en `app/dashboard/layout.tsx` junto a `realtime-membership-refresher.tsx`. Subscribe a `user:{userId}:property_transfers`. Al recibir `transfer_received`:

```ts
toast.info(`Recibiste ${propertyCount} propiedad(es) de ${fromUserName}`)
router.refresh()
```

---

## 4. Flujo de datos

### 4.1 Preview (debounced, no efectos)

```
User selecciona props + toUserId + toggle en dialog
    ↓ debounce 200ms
previewTransferAction(input)
    ↓
getSessionContext + previewTransferUseCase(ctx, repo, input)
    ↓
repo.preview (withRLS, sin escribir):
  - COUNT deals, appointments, ai_contents, queue WHERE property_id = ANY(ids)
  - Si transferContacts: COUNT DISTINCT contact_id + detect "shared contacts"
  - Validate destination (member exists)
  - Build warnings[]
    ↓
TransferPreview → UI muestra counts + warnings
```

### 4.2 Execute (transaccional + after-effects)

```
User confirma en dialog
    ↓
executeTransferAction(input)
    ↓
executeTransferUseCase(ctx, repo, input)
    ↓
repo.execute(ctx, input) [ÚNICA TRANSACCIÓN]
  ├─ SELECT properties FOR UPDATE
  ├─ Validate ownership + soft-delete + destination
  ├─ UPDATE properties.created_by_user_id
  ├─ UPDATE deal.created_by_user_id WHERE property_id IN ...
  ├─ UPDATE appointments
  ├─ UPDATE ai_contents
  ├─ UPDATE contact_property_queue
  ├─ IF transferContacts: UPDATE contact.created_by_user_id
  └─ INSERT property_transfers (counts + transfer_contacts flag)
    ↓
PropertyTransfer entity
    ↓
Server Action enriquece con member + org info (via withRLS, no Admin API)
    ↓
after() [no bloquea response]:
  ├─ broadcastTransferReceived → Supabase Realtime REST /broadcast (private channel)
  └─ sendEmail → React Email template via SMTP
    ↓
revalidatePath('/dashboard/transfers') + revalidatePath('/dashboard/properties')
    ↓
UI cierra dialog + toast success
```

### 4.3 Recepción (3 canales independientes, coherentes)

```
┌── Bob entra al dashboard (SSR)
│    └─ pending-ack-badge.tsx: getPendingAckCountAction() → renderiza badge
│
├── Bob ya estaba en el dashboard (Realtime)
│    └─ realtime-transfer-refresher.tsx recibe broadcast
│       ├─ toast.info("Recibiste 3 propiedades de Alice")
│       └─ router.refresh() → badge + páginas se recalculan
│
└── Bob revisa email (off-app)
     └─ Link a /dashboard/transfers
```

### 4.4 Acknowledgment

```
Bob abre /dashboard/transfers (tab Recibidas)
    ↓
Click "Marcar como revisado" en row
    ↓
acknowledgeTransferAction(id)
    ↓
acknowledgeTransferUseCase → repo.acknowledge → supabase.rpc('acknowledge_property_transfer', { p_id })
    ↓
RPC SECURITY DEFINER:
  - Valida to_user_id = auth.uid()
  - Valida org match
  - Valida acknowledged_at IS NULL
  - UPDATE acknowledged_at = now()
    ↓
PropertyTransfer actualizado
    ↓
revalidatePath('/dashboard') → badge se recalcula a count - 1
```

---

## 5. Edge cases

| # | Caso | Comportamiento | Defensa |
|---|---|---|---|
| EC1 | Destino = origen | Bloqueado en UI (filtrado del selector) + use case + repo (`fromUserId != toUserId`) | Triple capa |
| EC2 | Destino fuera de la org | `SELECT member WHERE org_id = ctx.orgId AND deleted_at IS NULL` no encuentra → `DESTINATION_NOT_IN_ORG` | Query con org filter |
| EC3 | Destino soft-deleted | Mismo path que EC2 | Query filter |
| EC4 | Prop ya transferida (ya pertenece al destino) | Idempotente: UPDATE no cambia nada. Cascade idem. Audit row con counts = 0. Preview advierte | Idempotency + warning |
| EC5 | Prop soft-deleted | Filtrada en SELECT FOR UPDATE → `PROPERTIES_DELETED` con IDs | Filter `deleted_at IS NULL` |
| EC6 | Mixed batch (props de Alice + Carmen) | `created_by_user_id != fromUserId` para alguna → `PROPERTIES_NOT_OWNED_BY_SOURCE` | Comparación post-SELECT |
| EC7 | Prop de otra org (ID forjado) | RLS oculta + filtro explícito → reporta como NOT_FOUND | RLS + filtro explícito |
| EC8 | Agent intenta execute | Use case + RLS INSERT policy (role + `authorize('property.assign')`) | Use case + RLS |
| EC9 | Agent intenta ack transfer ajena | RPC valida `to_user_id = auth.uid()` → `not_recipient` | RPC validation |
| EC10 | Race: 2 owners transfieren misma prop | `FOR UPDATE` serializa. Segundo ve created_by ya cambiado → validation fail → ROLLBACK | FOR UPDATE lock |
| EC11 | Cualquier paso UPDATE falla | Transacción rollback total. Audit row no se crea. Realtime + email NO se ejecutan (corren en `after()` post-success) | Transaction atomicity |
| EC12 | Re-ack | RPC retorna `already_acknowledged` | RPC check |
| EC13 | `transferContacts = true` y contact tiene deal en otra prop (no transferida) | Preview warning `contact_has_other_deals`. Si el operador confirma → contact pasa a Bob; Bob ahora ve deal de Alice en su otra prop. Decisión del operador. | Warning + opt-in |
| EC14 | `transferContacts = true` pero ningún contact existe (props sin deals) | `contactsCount = 0`. Sin error. | Idempotency |
| EC15 | Email falla post-execute | DB y broadcast ya OK. Log error. Operador puede resend manual (futuro, fuera de scope v1) | Best-effort `after()` |
| EC16 | Realtime broadcast falla | DB OK. Email OK. Bob no ve el toast inmediato pero verá el badge en next nav. Log. | Best-effort `after()` |
| EC17 | Agente removido de la org tras transfer | Su membership queda `deleted_at IS NOT NULL`. Props que recibió quedan con `created_by_user_id` de un user inactivo. **Out of scope** — flow de offboarding lo maneja | N/A |
| EC18 | Notas con XSS | `notes` text plano, React escape automático | React default |
| EC19 | propertyIds vacío | UI bloquea botón. Use case → `EMPTY_BATCH` | UI + use case |
| EC20 | toUserId no es member válido | EC2 path | Query filter |

---

## 6. Plan de tests

### 6.1 Type / lint / build

| Test | Comando | Esperado |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 errors |
| ESLint | `npm run lint` | 0 errors / 0 warnings |
| Build | `npm run build` | success |

### 6.2 Playwright smoke

| # | Test | Setup | Esperado |
|---|---|---|---|
| T1 | Owner transfer 2 props con deals (toggle OFF) | Owner sesión, props de Alice | Preview counts. Execute success. Audit row creada. Props + deals/appts/contents cascade. **Contacts NO se mueven** (`contactsCount = 0`). Toast |
| T2 | Owner transfer mismo escenario con toggle ON | Toggle "transferir contactos" activado | Igual + contacts también pasan a Bob. `contactsCount > 0` |
| T3 | Admin transfer (no owner) | Admin sesión | Misma capacidad que owner |
| T4 | Agent abre /dashboard/transfers | Agent sesión | Tab "Todas de la org" no aparece. Solo "Recibidas" + "Realizadas" |
| T5 | Agent intenta `executeTransferAction` directo | DevTools fetch | Use case rechaza. 0 cambios DB |
| T6 | Transfer con prop soft-deleted en batch | Owner | Error UI lista IDs deleted. ROLLBACK confirmado |
| T7 | Destination = source | Owner | UI filtra selector. Bypass: use case rechaza |
| T8 | Receptor ack | Bob sesión | Badge baja. Row deja pending. `acknowledged_at` poblado |
| T9 | Re-ack | Bob | `already_acknowledged`. No cambio |
| T10 | Agent intenta ack transfer ajena | Carol sesión, transfer Alice→Bob | RPC rechaza `not_recipient` |
| T11 | Multi-org isolation | Owner Org-A intenta transfer a user de Org-B | `DESTINATION_NOT_IN_ORG`. JWT spoof bloqueado por RLS |
| T12 | Race: 2 owners concurrent | Concurrent calls | Una succeed, otra ROLLBACK por FOR UPDATE |
| T13 | Badge SSR | Bob page-load con 1 pending | Sidebar muestra "1" en server render |
| T14 | Badge Realtime | Bob ya en dashboard, otro tab Alice ejecuta transfer | Toast aparece en Bob sin refresh. Badge sube |
| T15 | Badge tras ack | Bob con 1 pending → ack | Badge baja a 0 sin refresh manual |
| T16 | Email recibido | Inbox Mailtrap | Email llega con counts + CTA |
| T17 | Email falla (SMTP down) | Mock SMTP error | DB OK. Toast UI normal. Log error |
| T18 | Realtime broadcast falla | Mock broadcast error | DB OK. Email OK. Badge se ve en próximo nav |
| T19 | Toggle ON + warning shared contacts | Setup: contact Carlos tiene deal en Casa A (transfer) y Casa Z (no transfer) | Preview muestra warning. Si confirma → Bob ve Carlos con deal de Casa Z también |
| T20 | Toggle OFF + contact preserva ownership | Setup igual T19 | Carlos sigue siendo de Alice. Deals en Casa A pasan a Bob. Deals en Casa Z quedan con Alice |

### 6.3 Verificación DB post-Playwright

| Check | Query |
|---|---|
| Counts denormalizados consistentes | `SELECT id, deals_count, (SELECT count(*) FROM deal WHERE property_id = ANY(property_ids)) FROM property_transfers` |
| Cero cross-org bleed | Query como Org-B → 0 visibilidad transfers Org-A |
| `created_by_user_id` cambió donde debía | `SELECT created_by_user_id FROM properties WHERE id = ANY(...)` |
| Audit row inmutable | `UPDATE property_transfers SET notes = 'x'` como authenticated → bloqueado |
| Toggle ON → contacts movidos | `SELECT created_by_user_id FROM contact WHERE id = ANY(...)` post-transfer T2 |

---

## 7. Tareas (checkboxes)

Orden interno por tarea: `implementar → code review → fixes → tests → confirmación → docs → commit`.

### Pre-requisitos

- [ ] **T0** — Verificar `feat/contact-deal-refactor` mergeado a `main`. Si NO → no empezar transfers, terminar refactor primero.
- [ ] **T1** — Crear branch `feat/property-transfers` desde `main` post-merge.

### Capa Infra (SQL + schema)

- [ ] **T2** — Migración SQL `drizzle/sql/027_property_transfers_contacts_columns.sql` (aditiva: `transfer_contacts boolean`, `contacts_count integer`, rename `leads_count` → `deals_count`). Aplicada vía Supabase MCP.
- [ ] **T3** — Migración SQL `drizzle/sql/028_acknowledge_property_transfer_rpc.sql` (RPC SECURITY DEFINER + grants + revokes).
- [ ] **T4** — Migración SQL `drizzle/sql/029_realtime_user_property_transfers_channel_rls.sql` (RLS policy en Supabase Realtime channel).
- [ ] **T5** — Actualizar Drizzle schema `lib/db/schema/property-transfers.ts` con las columnas nuevas.

### Capa Aplicación (2.1.15.13 + 2.1.15.14)

- [ ] **T6** — Domain: `property-transfer.entity.ts` + `property-transfer.repository.ts` + tipos warnings.
- [ ] **T7** — Infrastructure: `property-transfer.model.ts` + `property-transfer.mapper.ts` + `drizzle-property-transfer.repository.ts` con `preview`, `execute`, `findAllForUser`, `findPendingAckForUser`, `countPendingAckForUser`, `acknowledge` (RPC).
- [ ] **T8** — Infrastructure realtime: `realtime-broadcast-transfer.ts` (mirror del membership broadcast).
- [ ] **T9** — Infrastructure email: `email/property-transfer-email.tsx` (React Email template).
- [ ] **T10** — Application use cases: `preview-transfer`, `execute-transfer`, `get-transfers`, `acknowledge-transfer`, `get-pending-ack-count`.
- [ ] **T11** — Presentation Server Actions: `actions.ts` con 5 actions. `after()` para email + broadcast. Errores de dominio mapeados.

### Capa UI (2.4.1 + 2.4.2 + 2.4.3 + 2.4.4)

- [ ] **T12** — Página `app/dashboard/transfers/page.tsx` con tabs role-aware.
- [ ] **T13** — `transfer-list-row.tsx` + `transfer-inbox-card.tsx` (botón ack).
- [ ] **T14** — `bulk-transfer-dialog.tsx` con selector agente + toggle contacts + preview debounced + confirm.
- [ ] **T15** — Integración con listado de propiedades: selección múltiple (checkbox por fila) + botón "Transferir seleccionadas" → abre dialog.
- [ ] **T16** — `pending-ack-badge.tsx` (SSR) + integración al sidebar.
- [ ] **T17** — `realtime-transfer-refresher.tsx` (Client Component subscribe) + mount en `app/dashboard/layout.tsx`.
- [ ] **T18** — Constantes `lib/constants/property-transfers.ts` (labels español neutro "tú").

### Cierre

- [ ] **T19** — Smoke Playwright cubriendo T1–T20 de §6.2. Tabla de resultados obligatoria.
- [ ] **T20** — Actualizar `docs/implementation-plan.md` marcando 2.1.15.13, 2.1.15.14, 2.4.1, 2.4.2, 2.4.3, 2.4.4 ✅.
- [ ] **T21** — Actualizar `CLAUDE.md`: sección "Mailing" agrega caso transfer, sección "Tenancy & Auth Model" agrega RPC pattern para audit immutable + ack.
- [ ] **T22** — Commits atómicos por capa.

---

## 8. Decisiones cerradas

| # | Decisión | Resolución |
|---|---|---|
| D1 | Cascade semantics | ✅ **Deals siempre cascadean** (atadas a property). **Contacts opt-in via toggle** (default OFF). Modelo Contact+Deal hace toggle por categoría innecesario. |
| D2 | Multi-source en un batch | ✅ Single source (schema actual) |
| D3 | `acknowledgedAt` UPDATE | ✅ RPC SECURITY DEFINER (mirror invitation pattern) |
| D4 | Notificación al receptor | ✅ **A + B**: badge UI (SSR + Realtime broadcast) **+ email** (after() + React Email). Mirror exacto del flow de invitations. |
| D5 | Ack reversible | ✅ One-way (no des-marcar) |
| D6 | Soft-delete del audit | ✅ Nunca (audit inmutable) |
| D7 | Badge sidebar — polling vs realtime | ✅ **Mismo patrón que invitations**: SSR para page-load + Supabase Realtime broadcast para tiempo real + revalidate path tras ack |

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Refactor Contact+Deal no terminado al empezar este plan | Media | Crítico | T0 valida merge antes de empezar. Si no está mergeado: bloquear |
| Cascade UPDATE rompe trigger downstream | Baja | Medio | Auditar triggers existentes pre-T7. Si hay triggers reactivos a `created_by_user_id` change, evaluar |
| RPC SECURITY DEFINER mal escrito → privilege escalation | Baja | Crítico | `SET search_path = ''`, EXECUTE solo `authenticated`, validación `auth.uid() = to_user_id` dentro, code review obligatorio del SQL |
| Race transfer + soft-delete | Media | Medio | `FOR UPDATE` + filter `deleted_at IS NULL` en step 1 |
| Multitenancy bypass via prop IDs forjados | Media | Crítico | RLS + filtro explícito `organization_id = ctx.orgId` en TODOS los UPDATE |
| UI revalidate no refresca badge tras ack | Media | Bajo | `revalidatePath('/dashboard')` post-ack. Smoke T15 verifica |
| Realtime broadcast no llega al receptor | Media | Bajo | Best-effort `after()`. Badge SSR cubre fallback en next nav (T14, T18 verifican) |
| Email no se entrega | Media | Bajo | Best-effort `after()`. Log + futura UI de resend manual. T17 verifica que DB OK aunque email falle |
| Toggle contacts ON cuando contact tiene deal cross-prop | Media | Medio | Warning explícito en preview (EC13, T19). Opt-in del operador |

---

## 10. Out of scope (no se toca)

- Workflow Knock `property_transferred` (2.4.5) → Capa 4 (Knock complementa email, no lo reemplaza).
- Reversión automática de transferencia (rollback admin).
- Bulk acknowledge UI ("ack todas las pendientes").
- Reasignación automática al hacer baja de miembro.
- UI futura para resend manual de email si falla.
- Transferencias cross-org.

---

## 11. Pre-flight checks antes de empezar T1

- [ ] `feat/contact-deal-refactor` mergeado a `main` (T0).
- [ ] D1–D7 confirmadas (este doc).
- [ ] Acceso Supabase dev para aplicar migraciones T2–T4.
- [ ] Mailtrap sandbox configurado (already, vía `EMAIL_FROM` + `SMTP_*` env vars).
- [ ] Realtime habilitado en Supabase project settings (already, vía membership broadcast funcional).
