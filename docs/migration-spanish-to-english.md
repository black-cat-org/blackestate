# Migración: Identificadores de Código de Español a Inglés

> **Regla:** TODO el código debe estar en inglés. Español SOLO para contenido visible al usuario final (labels, mensajes, placeholders).
>
> **Creado:** 2026-04-14
> **Estado:** Pendiente
> **Archivos afectados:** 43
> **Violaciones estimadas:** ~200+

---

## Tabla Maestra de Mapeo

Referencia canónica para todos los reemplazos. Cada agente/fase usa esta tabla.

### Enums de DB (PostgreSQL `ALTER TYPE ... RENAME VALUE`)

#### `operation_type`
| Español | Inglés |
|---|---|
| `venta` | `sale` |
| `alquiler` | `rent` |
| `temporal` | `short_term` |
| `anticretico` | `anticretico` *(término LATAM sin traducción — excepción documentada)* |

#### `property_status`
| Español | Inglés |
|---|---|
| `borrador` | `draft` |
| `en_revision` | `in_review` |
| `activa` | `active` |
| `pausada` | `paused` |
| `vendida` | `sold` |
| `alquilada` | `rented` |
| `rechazada` | `rejected` |

#### `property_condition`
| Español | Inglés |
|---|---|
| `nueva` | `new` |
| `excelente` | `excellent` |
| `buena` | `good` |
| `regular` | `fair` |
| `a_reciclar` | `to_renovate` |

#### `orientation`
| Español | Inglés |
|---|---|
| `norte` | `north` |
| `sur` | `south` |
| `este` | `east` |
| `oeste` | `west` |
| `noreste` | `northeast` |
| `noroeste` | `northwest` |
| `sureste` | `southeast` |
| `suroeste` | `southwest` |

#### `lead_status`
| Español | Inglés |
|---|---|
| `nuevo` | `new` |
| `contactado` | `contacted` |
| `interesado` | `interested` |
| `ganado` | `won` |
| `perdido` | `lost` |
| `descartado` | `discarded` |

#### `lead_source`
| Español | Inglés |
|---|---|
| `referido` | `referral` |
| `directo` | `direct` |
| `otro` | `other` |

#### `queue_item_status`
| Español | Inglés |
|---|---|
| `pendiente` | `pending` |
| `enviada` | `sent` |
| `pausada` | `paused` |

#### `appointment_status`
| Español | Inglés |
|---|---|
| `solicitada` | `requested` |
| `confirmada` | `confirmed` |
| `completada` | `completed` |
| `cancelada` | `cancelled` |

#### `conversation_status`
| Español | Inglés |
|---|---|
| `activa` | `active` |
| `pausada` | `paused` |
| `cerrada` | `closed` |

#### `ai_content_type`
| Español | Inglés |
|---|---|
| `descripcion` | `description` |

### Tipos TypeScript (no en DB, solo código)

#### `QueueStatusId`
| Español | Inglés |
|---|---|
| `en_espera` | `waiting` |
| `activa` | `active` |
| `pausada_conversacion` | `paused_conversation` |
| `pausada_cita` | `paused_appointment` |
| `inactiva_catalogo` | `inactive_catalog` |
| `inactiva_cita_completada` | `inactive_appointment_completed` |
| `inactiva_ganado` | `inactive_won` |
| `inactiva_perdido` | `inactive_lost` |
| `inactiva_descartado` | `inactive_discarded` |

#### `SentPropertyStatus`
| Español | Inglés |
|---|---|
| `enviada` | `sent` |
| `vista` | `viewed` |
| `interesado` | `interested` |
| `cita_agendada` | `appointment_scheduled` |
| `descartada` | `discarded` |

#### Amenities / Equipment (persisten como text[] en DB)
| Español | Inglés |
|---|---|
| `aire_acondicionado` | `air_conditioning` |
| `agua_caliente` | `hot_water` |
| `cocina_equipada` | `equipped_kitchen` |
| `balcon` | `balcony` |
| `terraza` | `terrace` |
| `jardin` | `garden` |
| `quincho` | `grill_area` |
| `pileta` | `pool` |
| `ascensor` | `elevator` |
| `seguridad` | `security` |
| `baulera` | `storage_unit` |
| `sum` | `common_room` |
| `quincho_compartido` | `shared_grill_area` |
| `jardin_compartido` | `shared_garden` |

#### Days of Week (persisten como keys JSONB en `bot_config.schedule`)
| Español | Inglés |
|---|---|
| `lunes` | `monday` |
| `martes` | `tuesday` |
| `miércoles` | `wednesday` |
| `jueves` | `thursday` |
| `viernes` | `friday` |
| `sábado` | `saturday` |
| `domingo` | `sunday` |

#### Chart data keys
| Español | Inglés |
|---|---|
| `ganados` | `won` |
| `perdidos` | `lost` |
| `citas` | `appointments` |
| `propiedades` | `properties` |
| `mensajes` | `messages` |

#### Variable names
| Español | Inglés |
|---|---|
| `ingreso` | `revenue` |

---

## Fases de Ejecución

### Fase 0 — Migración SQL (BLOQUEANTE)

Debe ejecutarse primero. Los `ALTER TYPE ... RENAME VALUE` actualizan los valores in-place en filas existentes.

- [ ] **0.1** Generar migración SQL con `ALTER TYPE ... RENAME VALUE` para los 10 enums
- [ ] **0.2** Generar migración SQL para actualizar text[] de amenities en `properties.amenities`
- [ ] **0.3** Generar migración SQL para actualizar keys JSONB en `bot_config.schedule`
- [ ] **0.4** Aplicar migraciones via `drizzle-kit generate` + `drizzle-kit migrate` o SQL manual via Supabase MCP

### Fase 1 — Schema Source of Truth (secuencial, un solo agente)

Archivos: 6

- [ ] **1.1** `lib/db/schema/enums.ts` — Cambiar todos los valores de los 10 enums
- [ ] **1.2** `lib/db/schema/properties.ts` — `.default("borrador")` → `.default("draft")`
- [ ] **1.3** `lib/db/schema/leads.ts` — `.default("nuevo")` → `.default("new")`
- [ ] **1.4** `lib/db/schema/appointments.ts` — `.default("solicitada")` → `.default("requested")`
- [ ] **1.5** `lib/db/schema/lead-property-queue.ts` — `.default("pendiente")` → `.default("pending")`
- [ ] **1.6** `lib/db/schema/bot-conversations.ts` — `.default("activa")` → `.default("active")`

### Fase 2 — Types (paralelo, un agente)

Archivos: 5

- [ ] **2.1** `lib/types/property.ts` — `OperationType`, `PropertyStatus`, `Property.condition`, `Property.orientation`
- [ ] **2.2** `lib/types/lead.ts` — `LeadStatus`, `QueueStatusId`, `QueueItemStatus`
- [ ] **2.3** `lib/types/bot.ts` — `SentPropertyStatus`, `AppointmentStatus`
- [ ] **2.4** `lib/types/settings.ts` — `BusinessSettings.commissionByType` keys
- [ ] **2.5** `lib/types/ai-content.ts` — `AiContentType`

### Fase 3 — Constants (paralelo, un agente)

Archivos: 6

- [ ] **3.1** `lib/constants/property.ts` — `OPERATION_TYPE_LABELS`, `PROPERTY_STATUS_LABELS`, `PROPERTY_STATUS_COLORS`, `STATUS_TRANSITIONS`, `CONDITION_OPTIONS`, `ORIENTATION_OPTIONS`, `EQUIPMENT_OPTIONS`, `AMENITIES_OPTIONS` (keys y .value fields)
- [ ] **3.2** `lib/constants/lead.ts` — `LEAD_STATUS_LABELS`, `LEAD_STATUS_COLORS`, `LEAD_STATUS_TRANSITIONS`
- [ ] **3.3** `lib/constants/bot.ts` — `SENT_PROPERTY_STATUS_LABELS/COLORS`, `APPOINTMENT_STATUS_LABELS/COLORS/TRANSITIONS`, `DAYS_OF_WEEK`, `DEFAULT_BOT_CONFIG.schedule`
- [ ] **3.4** `lib/constants/ai.ts` — `AI_CONTENT_TYPE_LABELS` key `descripcion`
- [ ] **3.5** `lib/constants/sources.ts` — `VALID_SOURCES` valor `"otro"`, `SOURCE_LABELS` key `otro`
- [ ] **3.6** `lib/constants/settings.ts` — `DEFAULT_BUSINESS_SETTINGS.commissionByType` keys

### Fase 4 — Data Layer (paralelo, un agente)

Archivos: 5

- [ ] **4.1** `lib/data/properties.ts` — Todos los mock data: operationType, status, condition, orientation + amenities
- [ ] **4.2** `lib/data/leads.ts` — Status values, `mockQueueStatuses`, `mockPropertyQueues`
- [ ] **4.3** `lib/data/bot.ts` — Status values en mock data y lógica programática
- [ ] **4.4** `lib/data/analytics.ts` — `STATUS_HSL`, comparaciones `.status === "..."`, `ganados`/`perdidos`, `SOURCE_COLORS`, variable `ingreso`
- [ ] **4.5** `lib/data/dashboard.ts` — Comparaciones de status, `lead.source ?? "otro"`
- [ ] **4.6** `lib/data/ai-contents.ts` — `type: "descripcion"`

### Fase 5A — Components: Properties Domain (paralelo, un agente)

Archivos: 5

- [ ] **5A.1** `components/properties/property-form/property-form-wizard.tsx` — `status: "pausada"`, `status: "activa"`
- [ ] **5A.2** `components/properties/property-detail/property-detail-header.tsx` — `property.status === "activa"`
- [ ] **5A.3** `components/properties/property-actions-menu.tsx` — `property.status === "activa"`
- [ ] **5A.4** `components/properties/share-links-dialog.tsx` — `s !== "otro"`
- [ ] **5A.5** `app/p/[id]/page.tsx` — `property.status !== "activa"`

### Fase 5B — Components: Contacts & Appointments (paralelo, un agente)

Archivos: 5

- [ ] **5B.1** `components/contacts/lead-bot-timeline.tsx` — `queueStatusConfig` keys (9 QueueStatusId)
- [ ] **5B.2** `components/contacts/lead-property-queue-item.tsx` — Config keys `pendiente`, `enviada`, `pausada`
- [ ] **5B.3** `components/appointments/appointments-kanban.tsx` — `COLUMNS` array, object keys
- [ ] **5B.4** `components/appointments/appointment-card.tsx` — Comparaciones y `handleTransition()` args
- [ ] **5B.5** `components/dashboard/leads-funnel-chart.tsx` — `chartConfig` keys (6 LeadStatus)

### Fase 5C — Components: Analytics Charts (paralelo, un agente)

Archivos: 7

- [ ] **5C.1** `components/analytics/charts/conversions-by-month-chart.tsx` — `chartConfig` keys `ganados`, `perdidos`
- [ ] **5C.2** `components/analytics/charts/commissions-by-type-donut.tsx` — `TYPE_COLORS`, `chartConfig` keys
- [ ] **5C.3** `components/analytics/charts/leads-by-source-stacked.tsx` — `chartConfig` key `otro`
- [ ] **5C.4** `components/analytics/charts/bot-activity-area.tsx` — `chartConfig` keys `citas`, `propiedades`, `mensajes`
- [ ] **5C.5** `components/analytics/charts/commissions-by-source.tsx` — `SOURCE_COLORS.otro`
- [ ] **5C.6** `components/analytics/charts/conversion-by-source.tsx` — `SOURCE_COLORS.otro`
- [ ] **5C.7** `components/analytics/charts/source-donut-chart.tsx` — `SOURCE_COLORS.otro`

### Fase 5D — Components: Settings, AI, Bot (paralelo, un agente)

Archivos: 3

- [ ] **5D.1** `components/settings/sections/business-section.tsx` — `updateCommissionByType("venta"/"alquiler"/"anticretico"/"temporal", ...)`
- [ ] **5D.2** `components/ai/ai-brochure-generator.tsx` — amenity value references
- [ ] **5D.3** `components/ai/ai-caption-generator.tsx` — amenity value references

### Fase 6 — Verificación Final

- [ ] **6.1** `npm run build` — verificar que compila sin errores
- [ ] **6.2** Grep exhaustivo por valores españoles remanentes
- [ ] **6.3** `npm run lint` — verificar que no hay warnings nuevos
- [ ] **6.4** Verificar UI en browser — golden paths de propiedades, leads, appointments, bot, analytics

---

## Inventario Completo de Archivos (43)

### Schema (6)
1. `lib/db/schema/enums.ts`
2. `lib/db/schema/properties.ts`
3. `lib/db/schema/leads.ts`
4. `lib/db/schema/appointments.ts`
5. `lib/db/schema/lead-property-queue.ts`
6. `lib/db/schema/bot-conversations.ts`

### Types (5)
7. `lib/types/property.ts`
8. `lib/types/lead.ts`
9. `lib/types/bot.ts`
10. `lib/types/settings.ts`
11. `lib/types/ai-content.ts`

### Constants (6)
12. `lib/constants/property.ts`
13. `lib/constants/lead.ts`
14. `lib/constants/bot.ts`
15. `lib/constants/ai.ts`
16. `lib/constants/sources.ts`
17. `lib/constants/settings.ts`

### Data Layer (6)
18. `lib/data/properties.ts`
19. `lib/data/leads.ts`
20. `lib/data/bot.ts`
21. `lib/data/analytics.ts`
22. `lib/data/dashboard.ts`
23. `lib/data/ai-contents.ts`

### Components — Properties Domain (5)
24. `components/properties/property-form/property-form-wizard.tsx`
25. `components/properties/property-detail/property-detail-header.tsx`
26. `components/properties/property-actions-menu.tsx`
27. `components/properties/share-links-dialog.tsx`
28. `app/p/[id]/page.tsx`

### Components — Contacts & Appointments (5)
29. `components/contacts/lead-bot-timeline.tsx`
30. `components/contacts/lead-property-queue-item.tsx`
31. `components/appointments/appointments-kanban.tsx`
32. `components/appointments/appointment-card.tsx`
33. `components/dashboard/leads-funnel-chart.tsx`

### Components — Analytics Charts (7)
34. `components/analytics/charts/conversions-by-month-chart.tsx`
35. `components/analytics/charts/commissions-by-type-donut.tsx`
36. `components/analytics/charts/leads-by-source-stacked.tsx`
37. `components/analytics/charts/bot-activity-area.tsx`
38. `components/analytics/charts/commissions-by-source.tsx`
39. `components/analytics/charts/conversion-by-source.tsx`
40. `components/analytics/charts/source-donut-chart.tsx`

### Components — Settings, AI, Bot (3)
41. `components/settings/sections/business-section.tsx`
42. `components/ai/ai-brochure-generator.tsx`
43. `components/ai/ai-caption-generator.tsx`

---

## Notas de Ejecución

### Paralelismo
- **Fase 0** es bloqueante (SQL migration).
- **Fase 1** es bloqueante (source of truth del schema).
- **Fases 2, 3, 4, 5A, 5B, 5C, 5D** pueden ejecutarse en **7 agentes paralelos** una vez completada la Fase 1.
- **Fase 6** es secuencial y final.

### Excepciones
- `anticretico` se mantiene como está — es un término legal LATAM sin equivalente en inglés.
- Contenido user-facing en español (labels dentro de `LABELS`, `MESSAGES`, helpText, tooltips) NO se toca.
- Comentarios en español dentro de archivos de utilidad (`lib/utils/relative-time.ts`, `lib/db/schema/bot-config.ts`) son baja prioridad y no bloquean.

### Riesgo
- El cambio más riesgoso es la Fase 0 (SQL). Si la DB tiene datos reales, los `ALTER TYPE ... RENAME VALUE` deben ser testeados en staging primero.
- Las amenities (text[]) requieren `UPDATE properties SET amenities = array_replace(amenities, 'old', 'new')` por cada valor.
- El JSONB de schedule requiere manipulación de keys con `jsonb_build_object` o similar.
