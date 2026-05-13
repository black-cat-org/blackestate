# Analytics — Appointments by Origin

**Status:** Spec / no implementado todavía
**Fecha:** 2026-05-12
**Sub-plan dependiente:** futuro `analytics/appointment-funnel`

## Contexto

Tras la migración `025_appointment_origin.sql`, cada cita lleva una columna `appointment.origin` con valores:

- `agent` — agendada manualmente por un agente desde el dashboard
- `bot` — agendada por el bot conversacional para un lead

A su vez, el flujo de creación inicializa `status` según `origin` únicamente:

| origin | status inicial al crear | racional |
|--------|-------------------------|----------|
| `agent` | `confirmed` | el agente crea = el agente confirma. Cualquier fecha (pasada o futura) |
| `bot` | `requested` | el bot agenda, el agente confirma |

Esto significa que **el estado `requested` queda reservado exclusivamente al origen `bot`**. Citas creadas por agentes nunca pasan por ese estado.

**`completed` NO se asigna al crear ni se transiciona manualmente** — es un estado **derivado al leer**: una cita con `status='confirmed' AND ends_at < now()` se muestra como completada en la UI. La columna `status` en DB para esa fila sigue siendo `confirmed`; el mapper de Application calcula `completed` al vuelo al construir la Entity. Ver `appointment.mapper.ts → mapRowToEntity`.

### Implicación para queries SQL

Las queries SQL contra `appointments` que filtran por status NO ven la transición derivada. Una query tipo `WHERE status = 'completed'` devuelve solo las filas históricas que quedaron persistidas como completed antes de este cambio (eventualmente cero filas nuevas). Para capturar las completed derivadas a nivel SQL:

```sql
WHERE (
  status = 'completed'
  OR (status = 'confirmed' AND ends_at < now())
)
```

Si esto se vuelve recurrente (ver sección "Pendiente para sub-plan futuro" abajo), conviene encapsularlo en una vista SQL.

## Implicaciones para analytics

`appointment.origin` es la fuente de verdad para separar el flujo del bot del flujo manual del agente. Toda métrica debe filtrar/agrupar por esa columna explícitamente — nunca confiar en `status` solo como proxy de origen.

### Reglas no negociables

1. Toda query de analytics que tenga sentido distinto por origen DEBE incluir `WHERE origin = 'agent'` o `WHERE origin = 'bot'` o `GROUP BY origin`.
2. Si una métrica solo es interpretable para un origen (ej. "time-to-confirm" depende del tránsito `requested → confirmed`, que solo el bot tiene), filtrar explícitamente y documentar la limitación en el dashboard.
3. No mezclar conteos cross-origin sin desglose — siempre desglose primero, agregado después.

## Métricas propuestas

### Volumen

```sql
-- Comparativo agent vs bot
SELECT origin, count(*) AS total
FROM appointments
WHERE deleted_at IS NULL
  AND organization_id = $1
GROUP BY origin
```

### Bot conversion rate

Mide cuántas de las citas que el bot agendó terminaron siendo aceptadas por el agente:

```sql
SELECT
  count(*) FILTER (WHERE status IN ('confirmed', 'completed', 'cancelled')) AS resolved,
  count(*) FILTER (WHERE status IN ('confirmed', 'completed')) AS confirmed_or_completed,
  count(*) FILTER (WHERE status = 'requested') AS pending_agent_review,
  count(*) FILTER (WHERE status = 'cancelled') AS cancelled
FROM appointments
WHERE origin = 'bot'
  AND organization_id = $1
  AND deleted_at IS NULL
```

KPI: `confirmed_or_completed / resolved` — tasa de aceptación neta del bot.

### Time-to-confirm (bot only)

```sql
-- Solo aplica a citas con origin='bot' porque agent skipea 'requested'
SELECT
  percentile_cont(0.5) WITHIN GROUP (ORDER BY confirmed_at - created_at) AS p50,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY confirmed_at - created_at) AS p90
FROM appointments
WHERE origin = 'bot'
  AND status IN ('confirmed', 'completed')
  AND confirmed_at IS NOT NULL
  AND organization_id = $1
```

### Agente workload directo

```sql
-- Citas que el agente carga manualmente (sin asistencia del bot)
SELECT
  date_trunc('week', created_at) AS week,
  count(*) AS appointments_logged_by_agent
FROM appointments
WHERE origin = 'agent'
  AND organization_id = $1
  AND deleted_at IS NULL
GROUP BY 1
ORDER BY 1
```

### Bot effectiveness (workload reduction)

```sql
-- % del flujo total que el bot está cubriendo
SELECT
  100.0 * count(*) FILTER (WHERE origin = 'bot') / count(*) AS bot_coverage_pct
FROM appointments
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND created_at >= now() - interval '30 days'
```

### Cancellation rate por origen

```sql
SELECT
  origin,
  100.0 * count(*) FILTER (WHERE status = 'cancelled') / count(*) AS cancellation_pct
FROM appointments
WHERE organization_id = $1
  AND deleted_at IS NULL
GROUP BY origin
```

Si `bot.cancellation_pct >> agent.cancellation_pct`, el bot está agendando con poca cualificación y vale ajustar el prompt o las reglas de calificación previa.

### No-show rate por origen

Una cita en `confirmed` que pasó su `endsAt` y nunca se marcó `completed` ni `cancelled` es no-show. Si llegamos a un dashboard de no-show:

```sql
SELECT
  origin,
  count(*) FILTER (WHERE ends_at < now() AND status = 'confirmed') AS no_shows,
  count(*) FILTER (WHERE status = 'completed') AS completed,
  100.0 * count(*) FILTER (WHERE ends_at < now() AND status = 'confirmed')
    / nullif(count(*) FILTER (WHERE status IN ('confirmed', 'completed')), 0) AS no_show_pct
FROM appointments
WHERE organization_id = $1
  AND deleted_at IS NULL
GROUP BY origin
```

## Decisiones cerradas

- **`requested` es exclusivo de bot** — los agentes nunca crean citas en este estado. Si veo `origin='agent' AND status='requested'` es un bug.
- **Agentes pueden loguear citas pasadas** — entran como `completed` por default. Útil para CRM completeness pero NO marcar como cita bot-asistida ni mezclarla en bot effectiveness.
- **`origin` es inmutable** — una vez creada la cita, su origen no cambia (es columna NOT NULL DEFAULT 'agent', sin UPDATE en flows actuales).

## Pendiente para sub-plan futuro

- [ ] Página `/dashboard/analytics/appointments` con cards de los KPIs de arriba
- [ ] Filtros: rango de fechas, lead source, propiedad
- [ ] Transición `completed → cancelled` para corregir log-after-the-fact errors (hoy no existe)
- [ ] Detección de no-show automática (cron job que mueva `confirmed AND ends_at < now() - 24h` a un estado/flag específico)
- [ ] **SQL view `appointments_effective_status`** — solo si llegamos a necesitar mostrar métricas SQL-level sobre `completed`. Hoy la lógica de derivación vive en `appointment.mapper.ts → mapRowToEntity` (Opción 1 — TypeScript-side). Esto cubre todos los flujos del dashboard (Kanban, filtros UI, listas), donde el agrupamiento por status ocurre en memoria post-mapper. Si en el futuro queremos hacer queries SQL directas (`WHERE status='completed'`, reportes, exportes CSV, integraciones externas), conviene migrar a una vista SQL:

  ```sql
  CREATE OR REPLACE VIEW appointments_effective AS
  SELECT
    *,
    CASE
      WHEN status = 'confirmed' AND ends_at < now() THEN 'completed'
      ELSE status
    END AS effective_status
  FROM appointments
  ```

  Ventajas vs el approach actual: lógica centralizada en DB, real-time (sin lag), funciona para cualquier consumidor SQL sin acordarse del WHERE expandido. Trade-off: requiere reescribir las lecturas de Drizzle para consultar la vista en SELECTs (los INSERT/UPDATE siguen yendo a la tabla base). Diferido porque el foco actual son `requested / confirmed / cancelled` — `completed` no es una métrica de producto crítica todavía.

## 🔴 PENDIENTE — Investigación profunda antes de implementar dashboard

Antes de levantar la página de analytics hay decisiones de producto sin cerrar que afectan cómo se miden las cosas. **Esto se decide ANTES de implementar el dashboard.**

### Capacidad real del bot

A día de hoy:

- **El bot solo hace `request`** — agenda la cita y la deja en `status='requested'`. Nunca confirma autónomamente.
- **Solo el agente confirma** — la transición `requested → confirmed` es siempre humana, vía Kanban en `/dashboard/appointments`.

Implicaciones:
- "Bot effectiveness" hoy es esencialmente "qué % de los requests del bot el agente acepta". Si el agente está saturado, las citas se quedan en `requested` y eso **NO es culpa del bot** — es backlog del agente.
- La métrica "time-to-confirm bot" mide en realidad **velocidad de respuesta del agente al backlog del bot**, no la velocidad del bot.

### Pregunta abierta: ¿debe el bot poder confirmar en horarios establecidos?

Opción que está sobre la mesa: que el agente configure ventanas horarias en `bot_config` donde el bot esté autorizado a confirmar directamente (sin pasar por `requested`).

Beneficios:
- Atender leads fuera del horario laboral del agente
- Reducir time-to-confirm casi a 0
- Mayor conversion (lead recibe confirmación inmediata vs esperar al día siguiente)

Costos / riesgos:
- Doble booking si la ventana del bot solapa con citas que el agente está agendando manualmente al mismo tiempo
- El agente pierde el control de qualification — citas confirmadas con leads poco calificados
- Más sofisticación en `bot_config`: ventanas horarias + qualification rules

**Decisión pendiente** — investigar:

1. ¿Cómo modelar las ventanas autorizadas en `bot_config`? (¿por día de la semana? ¿por rango horario? ¿por tipo de propiedad?)
2. ¿Cómo resolver doble booking si el agente confirma a la vez que el bot? (probablemente `EXCLUDE constraint` en `appointments` sobre `agent_id × tstzrange(starts_at, ends_at)`)
3. ¿Qué calificación mínima exige el bot antes de confirmar? (¿budget declarado? ¿propiedad específica visitada? ¿N mensajes en la conversación?)
4. ¿El agente puede "revertir" una confirmación del bot? (transición `confirmed → cancelled` ya existe)

Hasta cerrar esto, el modelo actual queda como:

| Status | Origen real (con la lógica actual) |
|--------|--------------------------------------|
| `requested` | Solo bot. Espera revisión humana. |
| `confirmed` | Solo agent (creación directa) o agent confirmando un request del bot. |
| `completed` | Cualquier origen, una vez que la cita ocurrió. |
| `cancelled` | Cualquier origen. |

### Implicaciones para el dashboard de analytics

Hasta que se cierre la decisión de auto-confirm del bot:

- **No confundir "bot agendó" con "bot logró cerrar la cita"**. El bot solo logra cerrar cuando el agente la confirma. Dashboard debe ser explícito en la copy.
- KPI principal del bot hoy: **`appointments_requested_by_bot_per_period`** y **`request_to_confirm_conversion_rate`** (qué % de los requests del bot el agente confirma).
- KPI de salud operativa: **`requested_backlog`** (citas en estado `requested` por más de N horas). Si crece, el agente no está atendiendo el flujo del bot y hay que escalar.
- Métricas que mezclen orígenes deben separarse SIEMPRE en visualización (stacked bar / grouped bar con `origin` como dimensión).

### Acciones antes de implementar dashboard

- [ ] Cerrar decisión: ¿bot puede auto-confirmar en ventanas horarias? Si sí, escribir sub-plan dedicado: `docs/plans/bot-auto-confirm.md` con modelo de datos, RLS, exclusión por doble booking, UI de configuración.
- [ ] Confirmar lista final de KPIs con métricas de negocio (probablemente con feedback de un agente real, no inventar desde el código)
- [ ] Definir granularidad temporal default (diario / semanal / mensual)
- [ ] Definir qué métricas son "owner/admin only" y cuáles ve el agent (un agente probablemente no necesita ver el comparativo cross-agente de la org)
