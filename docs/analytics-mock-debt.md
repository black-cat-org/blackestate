# Analytics — Mock Data Debt Inventory

> **Estado del módulo:** UI completa, pero ~80% de las funciones de `features/analytics/infrastructure/analytics.service.ts` devuelven datos mock (deterministas o hardcoded). Este documento inventa **cada surface mock** y describe el camino concreto para reemplazarlo con queries reales contra DB.
>
> **Por qué importa:** el módulo Analytics existe hoy como **maqueta de producto** — sirve para definir qué métricas deberíamos construir, no para mostrar datos reales al usuario. Cuando salgamos a producción habrá que reemplazar cada entrada de esta tabla. Mientras tanto, en código cada función mock lleva un comment `// MOCK:` describiendo el gap.
>
> **Cómo usar este doc:**
> - Antes de presentar Analytics al primer usuario beta: resolver al menos las filas P1.
> - Antes de marketing/lanzamiento público: resolver P1 + P2.
> - P3 puede quedar como roadmap longer-term (requiere schema work mayor).
>
> **Convención de prioridad:**
> - **P1** — Quick win: schema YA existe, solo falta escribir la query.
> - **P2** — Requiere migración menor: agregar campo derivado / tabla auxiliar / event tracking.
> - **P3** — Schema gap mayor: requiere modelo de datos nuevo (comisiones, history tables, etc.).

---

## Tab "Resumen general" (overview)

| Función | Mock kind | Schema gap | Reco para migrar a real | Prioridad |
|---|---|---|---|---|
| `getOverviewStats.change` (4 stats) | partial — los counts son reales, `change: 12.5/3.2/-5.1/8.3` es fake | period-over-period needs date-range queries | `WITH curr AS (count WHERE created_at IN [from, to]), prev AS (count WHERE created_at IN [from - period, to - period]) SELECT ((curr - prev)::float / NULLIF(prev,0)) * 100` | **P1** |
| `getOverviewStats.pipelineValue` | full hardcoded `1_200_000` | computable, no schema gap | `SUM(property.priceAmount) WHERE deal.stage IN ('visit_scheduled','negotiation','reserved') AND deal.deletedAt IS NULL` (JOIN deal → property) | **P1** |
| `getOverviewStats.commissionRate` | hardcoded `0.03` | needs to read `business_settings.commission_rate` | `getBusinessSettings()` already exists in `features/settings/infrastructure/settings.service.ts` — read `commissionRate` field | **P1** |
| `getOverviewStats.commissionValue` | derived from mocks above | computable | `pipelineValue × business_settings.commission_rate` | **P1** |
| `getInquiriesTrend` | full deterministic — 6 puntos de `synth(base, i)` | computable, schema OK | `SELECT date_trunc('month', created_at) AS month, COUNT(*) FROM inquiry WHERE created_at >= now() - interval '6 months' GROUP BY 1 ORDER BY 1` | **P1** |
| `getConversionsByMonth` | full deterministic | computable, schema OK | `SELECT date_trunc('month', closed_at) AS month, stage, COUNT(*) FROM deal WHERE closed_at IS NOT NULL AND stage IN ('won','lost') GROUP BY 1,2` | **P1** |
| `getAlerts` (inquiries "open >48h") | currently real (post-R36) | — | n/a — ya queryea inquiries reales | ✅ done |
| `getHighlights` | currently real (post-R36) | — | n/a | ✅ done |

---

## Tab "Consultas" (inquiries — antes "Leads")

| Función | Mock kind | Schema gap | Reco | Prioridad |
|---|---|---|---|---|
| `getInquiriesStats.total / open / promoted / discarded` | counts reales post-R36 | — | ✅ ya real | ✅ done |
| `getInquiriesStats.change` (4 stats) | partial — counts reales, `change` fake | period-over-period | igual que `getOverviewStats.change` | **P1** |
| `getInquiriesStats.avgCloseDays` | hardcoded `12` | computable | `AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) FROM deal WHERE stage = 'won'` | **P1** |
| `getInquiriesStats.responseRate` | full hardcoded `75` | needs bot first-response tracking | **column `bot_conversations.first_response_at` NO existe hoy** — verificado contra `lib/db/schema/bot-conversations.ts`. Migración P2 = agregar columna + trigger que la popule cuando llegue el primer `bot_message` con `sender='contact'`. Alternativa sin schema change: agregar query que JOIN bot_conversations + EXISTS(bot_messages WHERE sender='contact') | **P2** |
| `getConversionFunnel` (Inquiry+Deal 2-fase) | counts reales post-R36 — incluye won/lost al mergear active+closed deals | — | ✅ ya real | ✅ done |
| `getInquiriesBySourceOverTime` | full deterministic | computable | `SELECT date_trunc('month', created_at) AS month, source, COUNT(*) FROM inquiry GROUP BY 1,2 ORDER BY 1` last 6 months | **P1** |
| `getConversionBySource` | partial — count real, conversion-rate uses mock fallback `[25,50,15,10,5]` when real is 0 | computable, source-scoped won count | `SELECT i.source, COUNT(i) AS inquiries, COUNT(d) FILTER (WHERE d.stage='won') AS won FROM inquiry i LEFT JOIN deal d ON d.inquiry_id=i.id GROUP BY i.source` — drop mock fallback | **P1** |
| `getInquiriesByPropertyType` | currently real post-R36 | — | ✅ ya real | ✅ done |
| `getPipelineVelocity` | full mock — stage transition days | **stage transition timestamps NOT tracked today** | nueva tabla `deal_stage_history (deal_id, from_stage, to_stage, transitioned_at)` populated via DB trigger on `deal.stage` update | **P3** |
| `getPipelineExits` | full mock | mismo gap que velocity | mismo modelo `deal_stage_history` + filter terminal stages | **P3** |
| `getBotEngagement` (rate + distribution) | full mock — `engagementRate: 72`, hardcoded distribution | computable | engagement = `bot_conversations` with `COUNT(bot_messages) >= 2` AND `messages.sender IN ('agent','bot','contact')` distribution / total conversations | **P2** |

---

## Tab "Propiedades" (properties)

| Función | Mock kind | Schema gap | Reco | Prioridad |
|---|---|---|---|---|
| `getPropertiesStats.active` | real count | — | ✅ ya real | ✅ done |
| `getPropertiesStats.avgPriceUsd` | real avg from active properties USD | — | ✅ ya real | ✅ done |
| `getPropertiesStats.avgDays` | hardcoded `45` | computable | `AVG(EXTRACT(EPOCH FROM (deleted_at - created_at)) / 86400) FROM properties WHERE status IN ('sold','rented') AND deleted_at IS NOT NULL` | **P2** |
| `getPropertiesStats.totalVisits` | derived as `active.length × 12` | event-sourced | `SELECT COUNT(*) FROM analytics_events WHERE event_type='property_viewed' AND created_at IN period` — table existe | **P1** |
| `getInventoryStatus` | **full mock hardcoded** `[{count:12},{count:4},...]` aunque tenemos `getPropertiesAction` real | computable, schema OK | `SELECT status, COUNT(*) FROM properties WHERE deleted_at IS NULL GROUP BY status` | **P1** ⚠️ embarrassing — fix first |
| `getAvgPriceByZone` | full mock — usa `"Equipetrol"`, `"Urubó"`, etc. hardcoded | **no campo `zone`** en properties, pero existe `addressNeighborhood` | `SELECT address_neighborhood AS zone, AVG(price_amount) FROM properties WHERE deleted_at IS NULL AND price_currency='USD' GROUP BY 1 HAVING COUNT(*) >= 2` | **P2** — requiere normalización de neighborhood values |
| `getPricePerM2ByZone` | aliasa `getAvgPriceByZone` mock | schema OK — properties tiene `total_area_value` / `covered_area_value` + `surfaceUnitEnum` | `SELECT address_neighborhood, AVG(price_amount / total_area_value) FROM properties WHERE total_area_unit = 'm2' AND price_currency='USD' GROUP BY 1` | **P2** |
| `getPropertyTypeDistribution` | currently real | — | ✅ ya real | ✅ done |
| `getTopProperties` (`{leads, visits, appointments}`) | full mock | partial — pieces existen | `JOIN inquiry, analytics_events (event=property_viewed), appointment ON property_id`, rank `COUNT(*)`. Rename field `leads → inquiries` para match nueva entity | **P1** |
| `getPriceTrendByZone` | full deterministic — variación mensual fake | **no price history** — properties.priceAmount es current-only, no audit log de cambios | nueva tabla `property_price_history (property_id, price_amount, valid_from, valid_to)` + trigger on UPDATE | **P3** |

---

## Tab "Financiero" (financial) — TODO el tab es mock

> **⚠️ Tab entera mock — sin schema support.** No tenemos modelo de comisiones cobradas / operaciones cerradas con monto. Cuando se construya, va a requerir nueva fase de schema design.

| Función | Mock kind | Schema gap | Reco | Prioridad |
|---|---|---|---|---|
| `getFinancialStats.collectedCommissions` | hardcoded `36000` | **no `commission` table** | nueva tabla `commission_payment (deal_id, amount, currency, collected_at, status)` | **P3** |
| `getFinancialStats.pendingCommissions` | derived from pipelineValue × rate | parcial — pipelineValue puede ser real (ver overview), rate sí está en settings | mismo cálculo que `getOverviewStats.commissionValue` pero scoped a current period | **P1** (si pipelineValue ya es real) |
| `getFinancialStats.avgCommission` | derived from mocks | depende de `commission_payment` | `AVG(amount) FROM commission_payment WHERE status='collected'` | **P3** |
| `getRevenueByMonth` (revenue + goal) | mocks: `[4200, 5800, 3500, 6100, 4800, 7200]`; goal computa con `business_settings.monthlyGrowthTarget` | revenue depende de commissions; goal sí es real | mismo gap commission table | **P3** revenue / **P1** goal |
| `getPipelineByStage` (ticket value per stage) | hardcoded `[{stage:sale, value:8500}, ...]` | partial — stages reales pero "value" requiere derivación | `SELECT d.stage, AVG(p.price_amount × settings.commission_rate) FROM deal d JOIN properties p GROUP BY d.stage` — `business_settings.commissionRate` actúa como proxy | **P2** |
| `getCommissionsBySource` | hardcoded `[{source:facebook, amount:12800}, ...]` | mismo gap commission | igual | **P3** |
| `getCommissionsByOperationType` | hardcoded | mismo gap | igual | **P3** |
| `getTopOperations` (closed ops list) | 6 entries hardcoded `[op1, op2, ...]` | mismo gap | join `deal (stage=won) ↔ property ↔ commission_payment` cuando exista | **P3** |

---

## Tab "Bot" (bot performance)

| Función | Mock kind | Schema gap | Reco | Prioridad |
|---|---|---|---|---|
| `getBotStats.messagesSent` | hardcoded `156` | computable, schema OK | `SELECT COUNT(*) FROM bot_messages WHERE created_at IN period` | **P1** |
| `getBotStats.responseRate` | hardcoded `72` | computable | `(COUNT(messages where sender='contact') / COUNT(distinct conversations)) * 100` — needs interpretation | **P2** |
| `getBotStats.appointmentsBooked` | hardcoded `18` | computable, schema OK | `SELECT COUNT(*) FROM appointments WHERE origin='bot' AND status IN ('confirmed','completed') AND created_at IN period` | **P1** |
| `getBotStats.propertiesSent` | hardcoded `43` | computable, schema OK | `SELECT COUNT(*) FROM contact_property_queue WHERE sent_at IS NOT NULL AND sent_at IN period` (or via `bot_messages.propertyId IS NOT NULL`) | **P1** |
| `getBotStats.totalLeads` | hardcoded `24` | rename to `totalInquiries` + real | `SELECT COUNT(*) FROM inquiry WHERE source IN ('bot','public_form','manual','whatsapp') AND created_at IN period` | **P1** |
| `getBotActivityByDay` | full deterministic — 30 days `synth()` | computable | `SELECT date_trunc('day', created_at), COUNT(messages), COUNT(properties), COUNT(appointments) FROM ... GROUP BY 1` last 30 days | **P1** |
| `getBotFunnel` (Registrado / Prop. enviada / Prop. vista / Cita agendada) | full mock | partial — pieces exist | step1 = `bot_conversations` count, step2 = `contact_property_queue WHERE sent_at IS NOT NULL`, step3 = `analytics_events WHERE event_type='property_viewed' AND metadata.source='bot'`, step4 = `appointments WHERE origin='bot'` | **P2** |
| `getEngagementHeatmap` (day-of-week × hour grid) | full deterministic | computable | `SELECT EXTRACT(dow FROM created_at) AS day, EXTRACT(hour FROM created_at) AS hour, COUNT(*) FROM bot_messages GROUP BY 1,2` last 30 days | **P1** |

---

## Tab "Mi actividad" (agent manual activity)

> **Nota:** "agent activity" hoy filtra por `origin='agent'` en appointments. Tracking de mensajes manuales del agente (vs bot) ya está soportado en `bot_messages.sender = 'agent'`.

| Función | Mock kind | Schema gap | Reco | Prioridad |
|---|---|---|---|---|
| `getAgentManualStats.manualMessages` | hardcoded `12` | computable, schema OK | `SELECT COUNT(*) FROM bot_messages WHERE sender='agent' AND created_at IN period` | **P1** |
| `getAgentManualStats.manualAppointments` | hardcoded `5` | computable | `SELECT COUNT(*) FROM appointments WHERE origin='agent' AND status IN ('confirmed','completed') AND created_at IN period` | **P1** |
| `getAgentManualStats.manualProperties` | hardcoded `7` | computable | `SELECT COUNT(*) FROM contact_property_queue WHERE sent_at IS NOT NULL AND sent_by='agent'` (assuming column exists; verificar) | **P2** |
| `getAgentManualStats.manualLeads` (rename → `manualInquiries`) | hardcoded `3` | computable | `SELECT COUNT(*) FROM inquiry WHERE source='manual' AND created_at IN period` | **P1** |
| `getAgentActivityByDay` | full deterministic | computable | same shape as `getBotActivityByDay` but `sender='agent'` / `origin='agent'` filters | **P1** |
| `getAgentFunnel` | full mock | partial | step1 = `inquiry WHERE source='manual'`, step2..4 progressively filter agent-touched records | **P2** |
| `getAgentHeatmap` | full deterministic | computable | `EXTRACT(dow, hour) FROM bot_messages WHERE sender='agent' GROUP BY` | **P1** |
| `getAppointmentOutcomes` | currently real | — | ✅ ya real | ✅ done |

---

## Resumen de prioridades

| Prioridad | Cantidad | Esfuerzo estimado |
|---|---|---|
| **P1** quick-win (schema OK) | ~20 funciones | 1-2 sprints — reemplazar synth() / hardcoded por queries directas |
| **P2** migración menor | ~8 funciones | 2-3 sprints — agregar campos/triggers, normalizar neighborhood, etc. |
| **P3** schema major | ~10 funciones | dedicated phase — commission_payment + deal_stage_history + property_price_history |

**Bloqueadores duros:**
- **Commission tracking** → tab Financiero entero gated. Diseño schema separado.
- **Deal stage history** → Pipeline velocity/exits gated. Trigger-based audit log.
- **Property price history** → trend lines gated. Idem.

---

## Convención de marcado en código

Cada función mock tiene un comment header así:

```ts
// MOCK: <full | partial>. <descripción breve>.
// Schema gap: <"none" | "missing table X" | "no period comparison" | etc>.
// TODO: <SQL approximation that would replace this>. Priority: <P1 | P2 | P3>.
// See docs/analytics-mock-debt.md.
```

Para grep rápido en code review / future migration:

```bash
grep -n "// MOCK:" features/analytics/infrastructure/analytics.service.ts
```

---

## Cuándo actualizar este documento

- Al reemplazar una función mock con query real → tachar la fila + agregar nota "✅ done R<ticket>".
- Al descubrir un nuevo schema gap → agregar fila en la tab correspondiente.
- Al cerrar una fila P3 (schema major) → mover el bloque a un sub-doc dedicado (e.g. `docs/commission-schema-design.md`).
