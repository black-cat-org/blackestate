# Observaciones y mejoras — post Fase 11 / batch 1

**Fecha:** 2026-05-16
**Tester:** Gonzalo (manual exploratory testing tras cierre Fase 11 del sub-plan `contact-inquiry-refactor`)
**Branch base:** `feat/contact-inquiry-refactor` (todavía no mergeado a `main`)
**Modo de trabajo:** ticket por ticket. Cada uno sigue el workflow del master-prompt — diagnóstico + confirmación → impl → code review → fix → tests → confirmación manual del usuario → siguiente.

---

## Cómo se usa este doc

- Cada observación es un ticket **OBS-NN**.
- Estados: `pendiente` · `en triage` · `en progreso` · `en validación` · `✅ resuelto` · `⏭️ diferido` · `❌ rechazado`.
- Los tickets con **Bloqueado por:** dependen de otro ticket; se trabajan después.
- Los tickets marcados **sub-plan** requieren su propio plan en `docs/plans/` antes de codear (scope grande).
- El orden propuesto al final del doc es una **recomendación** basada en severidad + dependencias; se puede reordenar libremente.

---

## Resumen ejecutivo (27 tickets)

| Bloque | Cantidad | Característica |
|---|---|---|
| **Bugs** | 2 | OBS-01 (estado inquiry vs deal) · OBS-02 (visual kanban) |
| **UI quick-wins** | 9 | filtros, copy, alineación íconos, mapa, botón duplicado, modal overflow |
| **UX medio** | 7 | summary cards, naming, etiquetas mgmt, canal, crear contacto, save/publish |
| **Modal redesign** | 1 | nueva consulta — single search field |
| **Decisiones cross-cutting** | 3 | origin semantics · "creado por" · view toggle persist |
| **Features nuevas (sub-plan)** | 4 | kanban props/inquiries · slug SEO · approval workflow org |
| **Sin clasificar** | 1 | tabla data show more contactos/inquiries |

---

## Tickets — Bugs (P0)

### OBS-01 — Inquiry muestra "abierta" cuando el Contact ya está en Deal "negociación"

**Estado:** pendiente
**Área:** `/dashboard/inquiries` listing · `/dashboard/deals` kanban
**Tipo:** Bug (potencial) — requiere reproducción
**Severidad:** P0 (data correctness)

**Texto usuario:**
> En la vista negocios tengo a una persona en negociacion pero en la tabla de consultas me aparece como abierta (es decir ni si quiera se promovió a negocio).

**Triage:**
- Por diseño, al promover Inquiry → Deal el `inquiry.status` pasa a `'promoted'` (no `'open'`/`'abierta'`). Verificado en T3 del smoke R47 y en §6.4 invariant `bad_bidirectional=0`.
- Dos escenarios posibles:
  - **A. Es el caso EC10/T10**: el agente promovió la Inquiry original a Deal, después la misma persona volvió a consultar (form público o manual) sobre la misma prop → se creó una NUEVA Inquiry `open` que coexiste con la `promoted` previa. Esto es por diseño (`renewed interest`, EC8 partial UNIQUE permite). En ese caso no es bug, es UX confuso — la columna Estado de la tabla podría agregar un badge "Reactivada" o similar.
  - **B. Es bug real**: el promote no flipea `status` correctamente y queda en `open`. Reviewer ya verificó la lógica en R47 contra el code base, pero pudo regresar.
- Necesito: el `contact_id` + `property_id` del caso visto, o un screenshot, para distinguir A vs B en DB con un query.

**Pregunta abierta:**
- ¿Podrías capturar el ID del Deal en negociación y el ID de la Inquiry que aparece "abierta" (URL `/dashboard/deals/<id>` y `/dashboard/inquiries/<id>`)? Con esos dos IDs lo verifico en SQL en 30 segundos.

**Acciones potenciales:**
- Si caso A → cambio UX (no es bug): agregar disclaimer en lista de Inquiries cuando ese (contact, property) tiene Deal activo. Posible badge "También tiene negocio".
- Si caso B → fix real en `promoteInquiryUseCase` + test agregado al smoke.

---

### OBS-02 — Kanban: borde drop-hint cortado a la izquierda en primera columna

**Estado:** pendiente
**Área:** `/dashboard/deals` kanban (presunto, también aplica a futuros kanban de props/inquiries)
**Tipo:** Bug visual
**Severidad:** P0 (visual obvio)

**Texto usuario:**
> En la vista de kanban de negocios el primer tablero cuando se le acerca un elemento para posicionarlo ahi el borde tipo hint se muestra cortado en la parte izquierda por falta de padding.

**Triage:**
- Componente probable: `features/deals/presentation/components/deal-board.tsx` o `deal-board-column.tsx`. Borde `outline`/`ring` sobre el contenedor de la columna se está clippeando contra el padding del board wrapper.
- Fix típico: aumentar `padding-left` del board wrapper, o cambiar `overflow-hidden` por `overflow-visible` en el contenedor padre, o mover el `ring` al hijo para que respire dentro del padding.
- Captura screenshot ayudaría, pero el síntoma es claro.

**Acciones:**
- Identificar el wrapper culpable (5 min con grep)
- Ajustar padding/ring, verificar en kanban con ≥1 deal y drag activo.

---

## Tickets — UI quick-wins (P1)

### OBS-03 — Página pública de propiedad: mapa no aparece

**Estado:** pendiente
**Área:** `/p/[id]` componente `LandingMap`
**Tipo:** Regresión (estaba funcional)
**Severidad:** P1

**Texto usuario:**
> No esta apareciendo el mapa que teniamos previamoente configurado, en este punto no quiero cambios de codigo ni nada por que lo teniamos 100% funcional y testeado, solo necesito que se revise por que no aparece y volverlo a colocar.

**Triage:**
- Confirmé en el smoke T1 que `LandingMap` no aparecía en el snapshot — pensé que era porque la prop "Lote en Mallasa" no tenía coordenadas; pero parece ser un problema más amplio.
- Posibles causas:
  - Env var `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` no expuesta en runtime / restringida por HTTP referrer.
  - `lat`/`lng` nullable en propiedad y sin guard apropiado.
  - Componente removido/comentado en algún commit reciente — verificar `git log -- components/landing/landing-map.tsx`.
  - Restricción de dominio en Google Cloud Console que bloquea `localhost`.
- Scope: investigación + restauración, no rediseño.

**Acciones:**
- `git log --oneline -- components/landing/landing-map.tsx app/p/\[id\]/page.tsx`
- Inspeccionar imports actuales en `app/p/[id]/page.tsx` y ver si `LandingMap` se renderiza condicionalmente.
- Probar con prop que tenga lat/lng poblados.

---

### OBS-04 — Página pública: botón "Enviar consulta" duplicado arriba del form

**Estado:** pendiente
**Área:** `/p/[id]` (componente `landing-price-card.tsx` probable)
**Tipo:** UI dead code
**Severidad:** P1 (no rompe pero ensucia)

**Texto usuario:**
> Existen dos botones, Consulta por WhatsApp y Enviar consulta debajo, este ultimo boton no hace nada. Hay que removerlo (No me estoy refiriendo al boton del formulario).

**Triage:**
- Verifiqué en snapshot T1: hay un `link "Enviar consulta" /url: "#contacto"` arriba del form (anchor link a `#contacto`). El anchor probablemente no resuelve a ningún `id="contacto"` en la página → no scrollea ni hace nada útil. Remover.

**Acciones:**
- Identificar componente y borrar el link. Verificar que el form sigue accesible (probablemente está visible sin necesidad de anchor scroll, es la primera columna derecha).

---

### OBS-05 — Modal "Compartir propiedad": overflow horizontal con enlaces

**Estado:** pendiente
**Área:** `/dashboard/properties` listing (acción Compartir)
**Tipo:** UI bug
**Severidad:** P1

**Texto usuario:**
> Se despliega un modal pero este es mas pequeño que el contenido, este debe adaptarse ya que esta sucediendo un overflow con los enlaces.

**Triage:**
- Causa típica: `<DialogContent>` con `max-w-md` o similar pero el link tiene texto largo (`https://blackestate.app/p/uuid-largo`) sin `break-all` ni truncado. Fixes posibles:
  - Aumentar `max-w` del dialog.
  - Agregar `break-all` / `overflow-wrap: anywhere` al link.
  - Truncar visualmente + tooltip con full URL.
- El fix correcto pasa por OBS-26 (slugs) que reduce el largo del link de 36 chars (uuid) a ~30-50 chars con texto legible.

**Bloqueado por:** parcialmente OBS-26 (slugs reducen el problema, no lo eliminan).

**Acciones:**
- Fix inmediato: ampliar dialog + `break-all`.
- Long-term: OBS-26 (slugs) — los URLs siguen siendo largos pero legibles.

---

### OBS-06 — Inquiries: filtros con label ambiguo + typo "orígen"

**Estado:** pendiente
**Área:** `/dashboard/inquiries` (`inquiry-filters.tsx`)
**Tipo:** Copy fix
**Severidad:** P1

**Texto usuario:**
> Los filtros: Todos y Todos los orígen (Aqui dos correcciones, en el primer dropdown se debe especificar que se va a filtrar, Todos que?, el segundo dropdown tiene mal el texto, debe ser Todos los origenes).

**Triage:**
- Dropdown 1 = status filter (open/discarded/promoted) → label debe ser "Todos los estados" o "Todas las consultas" según preferencia.
- Dropdown 2 = source filter → typo: "orígen" → "orígenes".
- Cambios solo en strings (constantes en `lib/constants/` o inline en componente).

**Acciones:**
- Buscar string "Todos los orígen" en repo + corregir.
- Renombrar primer dropdown a "Todos los estados".

---

### OBS-07 — Deals: dropdown filtro "Todos los orígenes" se corta

**Estado:** pendiente
**Área:** `/dashboard/deals?view=table` (`deal-filters.tsx`)
**Tipo:** UI bug
**Severidad:** P1

**Texto usuario:**
> en los dropdowns de filtros en esta pantalla, el ultimo de Todos los origenes no entra en el dropdown se corta.

**Triage:**
- `<Select.Trigger>` con `min-w-[X]` insuficiente o `truncate` activo. Solución típica: aumentar `min-w` o cambiar a `w-auto` con `whitespace-nowrap`.

**Acciones:**
- Inspeccionar `deal-filters.tsx` con devtools → ajustar width.

---

### OBS-08 — Properties: filtros con labels ambiguos ("Todas", "Todos")

**Estado:** pendiente
**Área:** `/dashboard/properties` (`property-filters.tsx`)
**Tipo:** Copy fix
**Severidad:** P1

**Texto usuario:**
> Los filtros dicen Todos los tipos, Todas, Todos. (Estos ultimos 2 hay que especificar a que se refieren asi como el primero dropdown Todos los tipos).

**Triage:**
- "Todos los tipos" = type filter ✓ ok
- "Todas" = operation filter (Venta/Alquiler) → "Todas las operaciones"
- "Todos" = status filter probablemente → "Todos los estados"

**Acciones:**
- Identificar cada Select + corregir placeholder/"all" option label.

---

### OBS-09 — Property detail: alineación íconos en sección Características

**Estado:** pendiente
**Área:** `/dashboard/properties/[id]` y `/p/[id]` (componente characteristics)
**Tipo:** UI fix
**Severidad:** P1

**Texto usuario:**
> los iconos estan alineados al medio entre el titulo y la descripcion, por ejemplo en Baños 3, el icono esta alineado verticalmente osea entre el titulo y la descripcion, estei icono debe estar alineado horizontalmente con el titulo no con la columna entera de titulo descripción.

**Triage:**
- Layout actual: `flex items-center` en wrapper → ícono se centra entre title+desc. Cambio: `items-start` y un `pt-X` que alinee el ícono con el baseline del título.
- Otra opción: estructura `<div><Icon/><Title/></div><Desc/>` en lugar de `<Icon/><div><Title/><Desc/></div>`.

**Acciones:**
- Localizar componente (probablemente `landing-characteristics.tsx` o `property-characteristics.tsx`).
- Cambiar alignment.

---

### OBS-10 — Property detail: "Condición" sin ícono

**Estado:** pendiente
**Área:** mismo componente que OBS-09
**Tipo:** UI fix
**Severidad:** P1

**Texto usuario:**
> Condicion no tiene icono hay que agregarlo.

**Triage:**
- Decidir ícono apropiado de lucide-react. Sugerencias: `Sparkles` (nuevo), `Hammer` (a estrenar / refaccionar), `Star`. Para "Condición" en general puede servir `Tag` o `BadgeCheck`.

**Pregunta:** ¿Tenés preferencia de ícono? Si no, voy con `BadgeCheck` (neutral, "estado verificado de la propiedad").

---

### OBS-11 — Property edit step 4: cover image preview aspect ratio incorrecto

**Estado:** pendiente
**Área:** Flow de creación/edición de propiedad — paso 4 (Multimedia)
**Tipo:** UI fix
**Severidad:** P1

**Texto usuario:**
> la imagen de portada no debe ser cuadrada en el preview, debe ser rectangular con el mismo aspect ratio con el que se vera en la vista publica.

**Triage:**
- Verificar qué aspect ratio usa `LandingGallery` (típico inmobiliaria: 16:9 o 4:3). Aplicar mismo en preview del wizard.
- Cambio CSS simple: `aspect-square` → `aspect-video` (16:9) o `aspect-[4/3]`.

**Acciones:**
- Detectar aspect real de `LandingGallery` → replicar en preview.

---

## Tickets — UX medio (P2)

### OBS-12 — Property save: "Guardar cambios" + "Publicar" → un solo botón (o rediseño flow)

**Estado:** pendiente
**Área:** Flow de edición de propiedad — botones bottom
**Tipo:** UX rediseño chico
**Severidad:** P2

**Texto usuario:**
> existen dos botones, Guardar cambios y publicar, esto resulta algo confuso por que si se publica no se guarda? Publicar? donde se va a publicar? creo que seria mejor solo tener un boton Guardar cambios.

**Triage:**
- Implícito en el modelo actual: `status: 'draft' | 'in_review' | 'active' | 'paused' | 'sold'`. "Publicar" probablemente flipea a `'active'`. "Guardar cambios" deja en `'draft'`.
- Opciones:
  - **A.** Un botón "Guardar cambios" + un toggle separado "Publicada / Borrador" en la parte alta del form (UI más clara, separa intención).
  - **B.** Un botón "Guardar" + dropdown menu "Guardar como borrador / Guardar y publicar" (compatible con futuros estados como "Enviar a revisión" del OBS-27).
  - **C.** Solo "Guardar cambios" — el status se controla en otro lado (ej. botón "Publicar" SOLO desde la lista o detail page).
- Recomendación inicial: **B** porque escala a OBS-27 (approval workflow) — el menú se vuelve "Guardar borrador / Enviar a revisión / Publicar" según permisos.

**Bloqueado por:** decisión sobre OBS-27 — si el approval workflow se construye, este botón se transforma de nuevo.

**Pregunta abierta:**
- ¿Vamos con B ahora y lo extendemos al cerrar OBS-27, o esperamos OBS-27 y hacemos los dos juntos?

---

### OBS-13 — Dashboard summary cards: alinear formato con Analytics

**Estado:** pendiente
**Área:** `/dashboard` (home) — sección summary
**Tipo:** UI consistency
**Severidad:** P2

**Texto usuario:**
> Dashboard > Sumaries: Hacerlos en el mismo formato que manejamos en analyitics.

**Triage:**
- Analytics summary cards (verificado durante T16 del smoke) tienen: ícono colored bg, label, valor grande, delta vs período anterior, descripción contextual. Dashboard home tiene una variante más simple.
- Acción: extraer un `SummaryCard` shared en `components/ui/` (o `features/shared/presentation/`) y consumir desde ambos lugares.

**Acciones:**
- Identificar componente actual de dashboard y reemplazar por el formato analytics.

---

### OBS-14 — Dashboard "Consultas por fuente": renombrar "Form público"

**Estado:** pendiente
**Área:** Dashboard chart "Consultas por fuente" + global label
**Tipo:** Copy refinement
**Severidad:** P2

**Texto usuario:**
> Cambiar el nombre Form publico cuando un contacto se registra via Pagina de propiedad publica (Dar sugerencias de nombres alternativos, se ve feo actualmente).

**Triage:**
- Sugerencias (orden de mi preferencia):
  1. **"Sitio web"** — el más natural en CRMs inmobiliarios LATAM. Cubre tanto landing pública de prop como futuros forms públicos en sitio (home, marketing).
  2. **"Web pública"** — explícito pero un poco redundante.
  3. **"Ficha de propiedad"** — preciso pero limita al caso actual (si mañana sumás form en home, ya no encaja).
  4. **"Landing"** — anglo, no encaja con copy es-BO neutro del producto.
- Si "Sitio web" pisa otra cosa, alt: **"Sitio público"**.
- Impacto: cambio en `lib/constants/sources.ts` (o equivalente) + label en analytics + posible enum value rename (cuidado: si rename a nivel DB enum, requiere migración).

**Pregunta abierta:**
- ¿Vas con "Sitio web" o preferís alguna otra? El cambio puede ser solo display (mapping enum_value → label) o full rename del enum value en DB.

---

### OBS-15 — Contactos: falta botón "Crear contacto"

**Estado:** pendiente
**Área:** `/dashboard/contacts` page header
**Tipo:** Feature gap
**Severidad:** P2

**Texto usuario:**
> falta lo mas importante, el boton de Crear contacto.

**Triage:**
- Verificado en T11 / smoke: la página tiene solo header "Contactos" + tabla. No hay botón "Nuevo contacto" mirror al de Negocios/Consultas.
- Crear contacto desde la UI directa = use case `createContactUseCase` ya existe (consumido por `findOrCreateContactUseCase`). Solo falta wiring presentation.
- Componente: agregar `ContactCreateButton` (client island) + dialog reutilizando el form que ya tiene `contact-edit-dialog.tsx`.

**Acciones:**
- Espejo de `inquiry-create-button.tsx` / `deal-create-button.tsx`.

---

### OBS-16 — Contactos: Etiquetas — gestión real (texto/ícono/color)

**Estado:** pendiente · **sub-plan**
**Área:** Contacts table + nueva pantalla "Etiquetas" en Settings
**Tipo:** Feature nueva
**Severidad:** P2

**Texto usuario:**
> hay una columna que dice Etiquetas (Como las gestiono? de donde salen? por que estan ahí? como se crean?) ... deberiamos tener un apartado de Etiquetas que el agente pueda setear, no que vayan creandose miles automaticamente por que sino no se puede filtrar, las etiquetas sirven para eso, para que el agente pueda configurar las que quiera, con Texto, Icono y Color.

**Triage:**
- Hoy `contact.tags` es `text[]` (array libre, agente puede meter cualquier string). Esto rompe filtros consistentes.
- Diseño correcto:
  - Tabla nueva `tag` (org-scoped): `id`, `org_id`, `name`, `icon` (lucide name), `color` (hex/preset), `created_by_user_id`.
  - Tabla pivot `contact_tag` (`contact_id`, `tag_id`).
  - Migración: convertir `contact.tags text[]` → relaciones en `contact_tag`, deduplicando por nombre case-insensitive.
  - Settings page: `/dashboard/settings/tags` CRUD (owner/admin pueden gestionar, agent solo usa).
  - Decisión: tags también pueden aplicar a Inquiry/Deal en el futuro → pivot polimórfico o tabla separada por entidad. Por ahora solo Contact.
- Tamaño: sub-plan de ~10-15 tickets.

**Bloqueado por:** decisión de scope (¿solo Contact o también Inquiry/Deal?).

**Acciones cuando se atienda:**
- Crear `docs/plans/2026-XX-XX-tag-management.md`.

---

### OBS-17 — Contactos: "Canal" — clarificar semántica + default WhatsApp + inline edit

**Estado:** pendiente
**Área:** Contacts table + edit dialog
**Tipo:** UX + decisión semántica
**Severidad:** P2

**Texto usuario:**
> el Canal deberia crearse siempre como Whatsapp (Entiendo que este es el canal de comunicacion, pero preferido por quien? por el agente? por el cliente? deberiamos poder hacer cambios directamente desde la misma tabla con un boton de guardar cambios para confirmar, no solo desde editar contacto).

**Triage:**
- Semántica actual: `contact.preferred_channel: text` (free-form, opcional). Semánticamente ambigua. Decisión necesaria: ¿es preferencia del **cliente** (cómo prefiere que lo contacten) o del **agente** (por dónde le llega mejor)? La diferencia importa para escalabilidad (ej. cuando agreguemos automation: "enviar catálogo por el canal preferido del cliente" vs "el agente prefiere WhatsApp para todos").
- **Recomendación:** "Canal preferido **por el cliente**" (semántica más rica para futuros features como notifications/marketing). Default WhatsApp solo si no se sabe.
- Inline edit en tabla: cell con dropdown popup, guarda directo onChange (debounce 500ms) — no necesita "guardar cambios" si optimistic update + revert on error es robusto. Alternativa: edit mode toggle por fila.
- Enum sugerido: `whatsapp | phone | email | other` (storage como enum, no text).

**Pregunta abierta:**
- ¿Preferencia del cliente o del agente? Mi recomendación: cliente.
- ¿Inline edit auto-save o con botón confirm? Recomiendo auto-save con optimistic update + toast revert si falla.

---

### OBS-18 — Contactos: tabla mostrar más data (inquiries count, etc.)

**Estado:** pendiente
**Área:** Contacts table
**Tipo:** Feature gap
**Severidad:** P2

**Texto usuario:**
> Deberiamos ademas mostrar mas datos en esta tabla como por ejemplo los inquiries de cada contacto, etc.

**Triage:**
- Columnas candidatas a sumar:
  - **# Consultas abiertas** — count `inquiry WHERE contact_id = X AND status = 'open' AND deleted_at IS NULL`
  - **# Negocios activos** — count `deal WHERE contact_id = X AND stage NOT IN ('won','lost') AND deleted_at IS NULL`
  - **Última actividad** — max(updated_at) entre inquiry+deal+appointment
  - **Próxima cita** — min(starts_at) de appointment futuro
- Trade-off perf: cada count es un JOIN/subquery. Para listados grandes (>500 contactos) afecta. Opciones:
  - Subqueries en la repo query (acepta hasta ~2k filas).
  - Vista materializada `contact_summary` refreshed periodically.
  - Denormalización + triggers en insert/update de inquiry/deal.
- Para MVP de feedback batch: subqueries directos están bien.

**Pregunta abierta:**
- ¿Qué columnas priorizás? Sugiero las 3 primeras + dejar "próxima cita" para más adelante.

---

### OBS-19 — Contactos: filtros faltantes (Canal, Etiquetas)

**Estado:** pendiente
**Área:** `/dashboard/contacts` filter bar
**Tipo:** Feature gap
**Severidad:** P2

**Texto usuario:**
> faltan mas dropdowns de filtros, Canal por ejemplo, y etiquetas ... y pueda realizar filtros con ello.

**Bloqueado por:** OBS-16 (Etiquetas reales) + OBS-17 (Canal con enum). Sin ese cleanup, el filtro de etiquetas es inútil (lista libre) y el de canal trabaja sobre texto libre.

**Acciones:**
- Implementar después de OBS-16 + OBS-17. Reutilizar pattern de `inquiry-filters.tsx`.

---

## Tickets — Modal redesign (P2)

### OBS-20 — Nueva consulta modal: rediseño — single search field, sin existente/nuevo, sin Origen

**Estado:** pendiente
**Área:** `inquiry-create-dialog.tsx` (componente que abre el botón "Nueva consulta")
**Tipo:** UX rediseño
**Severidad:** P2

**Texto usuario:**
> aqui tenemos que hacer varios cambios, no quiero que exista la distincion de existente y nuevo, ya que para eso un agente tendria que saber de memoria quienes existen y quienes no, en su defecto solo debe haber una forma de crear consulta, y para los datos del cliente, debe haber un buscador de nombre, telefono, correo, en el mismo field y si se encuentra uno se rellenan los datos, sino se propone crear uno nuevo. Por otro lado hay un dropdown que dice Origen, esto resulta ademas de irrelevante, mucha friccion para el agente y ademas es obvio que el origen es Manual, osea creado por el agente. Creo que no necesitamos este dropdown.

**Triage:**
- Modal hoy: tabs "Existente / Nuevo" + Origen dropdown. Friction alta.
- Modal nuevo:
  - **Field único** "Buscar o crear contacto" — typeahead search por name/phone/email (mismo `contact-autocomplete` que ya existe del flujo de Deal).
  - Si match → autofill + lock fields (mostrar como "Comprador A T3 · +59172000001 · compradora@t3.test")
  - Si no match → mostrar inline "Crear nuevo contacto: [name input] [phone input] [email input]"
  - Eliminar dropdown "Origen" — derivar `'agent_manual'` automáticamente del path (ver OBS-21).
- Aplica también al modal "Nuevo negocio" (mismo problema de tabs existente/nuevo + Origen).

**Bloqueado por:** OBS-21 (origin auto-derive) — si no se decide la semántica, el dropdown Origen no se puede quitar sin perder data.

---

## Tickets — Decisiones cross-cutting (P2)

### OBS-21 — Origin semantics: auto-derivar (no input usuario)

**Estado:** pendiente · **decisión arquitectónica**
**Área:** Contact + Inquiry + Deal — todos los flows de creación
**Tipo:** Refactor data model + UI
**Severidad:** P2 (cross-cutting, afecta varios tickets más chicos)

**Texto usuario:**
> Desglose de origenes (Por lo que ese campo no debe ser elegido en los formularios debe ser automático):
> - Contacto: 1) Form publico, 2) Agente manual, 3) Bot WhatsApp
> - Consulta: 1) Form publico, 2) Agente manual, 3) Bot WhatsApp
> - Negocio: 1) Agente manual, 2) Bot WhatsApp

**Triage actual vs target:**

| Entidad | Hoy | Target |
|---|---|---|
| **Contact** | no tiene columna `source` (se infiere de su primera Inquiry) | Agregar `contact.source: 'public_form' \| 'agent_manual' \| 'bot_whatsapp'` |
| **Inquiry** | `source` enum existente con valores `'public_form' \| 'bot_whatsapp' \| 'manual'` (verificar) | Mantener enum, ajustar valores si difieren, **auto-derivar** en cada path de creación |
| **Deal** | `source` enum existente `'agent_manual' \| 'bot_whatsapp' \| 'inquiry_promoted'` (verificar) | Mantener enum, valores `agent_manual \| bot_whatsapp` — cuando viene de promote, hereda `inquiry.source` o se setea `inquiry_promoted` (decisión) |

**Decisiones a tomar:**
1. ¿Agregar `contact.source` o seguir infiriéndolo de la primera Inquiry? **Recomendación: agregarlo**. Es más simple, soporta el caso "contact creado sin Inquiry" (cuando OBS-15 se implemente — crear contact directo sin inquiry asociada).
2. Para Deal promovido desde Inquiry: ¿hereda `inquiry.source` o tiene su propio valor `'inquiry_promoted'`? **Recomendación: heredar `inquiry.source`** — el origin commercial del Deal es el mismo que el de su Inquiry; agregar valor extra duplica info.
3. Verificar valores actuales del enum vs target del usuario y renombrar si difieren (ej. `'manual'` → `'agent_manual'`).

**Migraciones requeridas:**
- `contact.source` column nueva + backfill (de primer inquiry de cada contact).
- Posible rename enum value (requiere `ALTER TYPE`).

**Bloqueante de:** OBS-20 (sacar dropdown Origen del modal nueva consulta).
**Habilita:** filtros consistentes en `/dashboard/contacts` por origen.

---

### OBS-22 — "Creado por" — quién creó (agente/admin/owner/bot) + cuál bot/agente

**Estado:** pendiente · **decisión arquitectónica**
**Área:** Contact + Inquiry + Deal — tabla + detail
**Tipo:** Audit + data model
**Severidad:** P2

**Texto usuario:**
> se debe tener si o si la distincion de si un contacto fue creado por un agente/admin/owner (Quien de todos ellos? ya que el contacto es compartido en toda la organizacion, se debe especificar quien lo creó, quiza con un campo creado por) o por un bot (El bot de que agente, admin u owner?).

**Triage:**
- Hoy `created_by_user_id uuid NOT NULL` está en las 3 tablas. Apunta a `auth.users`. Lo que falta es:
  - **Display denormalizado**: `created_by_user_name` + `created_by_user_role` (owner/admin/agent) — para que la tabla no haga JOIN con member en cada render. Mirror del pattern que ya usamos para `deleted_by_user_*`.
  - **Distinción humano vs bot**: agregar `created_by_kind: 'user' \| 'bot'` (default `'user'`). Cuando es `'bot'`, `created_by_user_id` es el agent owner del bot (porque "el bot de quién" = el agente al que pertenece el bot).
- Display en tabla: nueva columna "Creado por" con badge:
  - Usuario: `[Avatar] Gonzalo Pinell · Owner`
  - Bot: `[BotIcon] Bot de Gonzalo Pinell`

**Migraciones:**
- `ALTER TABLE contact|inquiry|deal ADD COLUMN created_by_user_name text` + `created_by_user_role text` (denorm).
- `ADD COLUMN created_by_kind text NOT NULL DEFAULT 'user'`.
- Backfill desde `member.name + member.role`.

**Acciones:**
- Sub-plan chico (3-4 tickets: migración DB + entity update + mapper + UI columna).

---

### OBS-23 — View toggle (Kanban/Tabla): default tabla + persistir preferencia user

**Estado:** pendiente · **cross-cutting**
**Área:** `/dashboard/deals` (existente), `/dashboard/properties` (OBS-24), `/dashboard/inquiries` (OBS-25)
**Tipo:** UX cross-cutting
**Severidad:** P2

**Texto usuario:**
> La vista por defecto debe ser formato tabla (En si todas las vistas que requieran tabla y kanban deben persistir la preferencia es decir si por defecto es tabla y yo dejo la vista en kanban, la siguiente vez que entre a la pagina debe estar en kanban).

**Triage:**
- Hoy `/dashboard/deals` lee `?view=kanban|table` de la URL. Default = kanban (cuando no hay query).
- Cambios:
  1. Default cuando no hay query: `table` (no kanban).
  2. Persistir preferencia del usuario por página. Dos opciones:
    - **localStorage** key tipo `view-preference:/dashboard/deals` → simple, instantáneo, no sobrevive incognito ni cambio device.
    - **DB** (tabla `user_preferences` o columna en `member`) → cross-device, requiere migración.
  - Recomendación: **localStorage** para MVP. Si se pide cross-device más tarde, hop a DB sin romper API (fallback chain: URL → localStorage → DB → default).
- Implementación: hook `useViewToggle(pageKey, defaultView)` consumido por `properties-view.tsx`, `deals-view.tsx`, `inquiries-view.tsx`.

**Bloqueante de:** OBS-24, OBS-25 (heredarán este hook).

---

## Tickets — Features nuevas (P3 — cada uno es sub-plan)

### OBS-24 — Properties: vista Kanban para gestión de status

**Estado:** pendiente · **sub-plan**
**Área:** `/dashboard/properties`
**Tipo:** Feature nueva
**Severidad:** P3

**Texto usuario:**
> Necesitamos una vista kanban en esta pagina para poder gestionar el estado de las propiedades de forma simple, usando el mismo sistema drag and drop que tenemos en Negocios.

**Triage:**
- Columnas = `propertyStatus` enum: `draft | in_review | active | paused | sold` (5 cols).
- Reuso: copiar `deal-board.tsx` + `useDealBoardOptimistic` adaptado.
- Decisiones:
  - ¿Permitir drag entre TODAS las columnas? Algunas transiciones tienen efectos (ej. → `sold` cierra deals asociados? trigger transfer? notif?). Probablemente solo permitir transiciones lineales: draft → in_review → active ↔ paused → sold.
  - Stage_order persistencia: properties no tiene `stage_order` hoy. ¿Lo agregamos? Sino, orden por `updatedAt DESC`.
- Si OBS-27 (approval workflow) se construye, esto se integra: la columna `in_review` es la que va al owner/admin.

**Bloqueado por:** OBS-23 (view toggle hook compartido).

---

### OBS-25 — Inquiries: vista Kanban

**Estado:** pendiente · **sub-plan chico**
**Área:** `/dashboard/inquiries`
**Tipo:** Feature nueva
**Severidad:** P3

**Texto usuario:**
> Pantalla de Consultas: Deberiamos tener una vista kanban para ver el estado y poder hacer cambios en los mismos.

**Triage:**
- Columnas = `inquiryStatus`: `open | discarded | promoted` (3 cols).
- Drag útil: `open → discarded` (drag a "Descartadas"). `open → promoted` no es drag directo (necesita el modal de promote con stage/source/note). Posible compromiso: drag a "Promovidas" abre el modal de promote.
- Reuso pattern Deal Kanban.

**Bloqueado por:** OBS-23 (view toggle hook compartido).

---

### OBS-26 — Share property: UUID → slug para SEO

**Estado:** pendiente · **sub-plan**
**Área:** `properties` schema + `/p/[id]` route + share dialog
**Tipo:** Feature + migración data
**Severidad:** P3 (impact SEO real)

**Texto usuario:**
> Los enlaces para compartir las propiedades incluyen el UUID de la propiedad, en su defecto deben ser los slugs de las propiedades para aumentar el SEO.

**Triage:**
- Hoy `properties` NO tiene columna `slug` (verificado en DB).
- Diseño:
  - Agregar `properties.slug text NOT NULL UNIQUE WITHIN ORG` (o globally unique con prefix de org).
  - Generación: `slugify(title) + short-hash`. Ejemplo: `casa-amplia-en-achumani-con-jardin-a3f9`. Hash al final evita colisiones sin pelear con uniqueness.
  - Route: `/p/[slug]` (nueva) + `/p/[id]` con redirect 301 a `/p/[slug]` para no romper links viejos.
  - Migración: backfill slug desde title de propiedades existentes.
  - Slug se regenera al editar title? **Recomendación: NO** — slug es immutable post-create (rompe SEO si cambia). Si title cambia, slug queda; nuevo `editTitleDoesNotChangeSlug` doc.
- Sub-plan necesario: ~6-8 tickets.

**Habilita:** mejora OBS-05 (modal overflow se atenúa con links legibles).

---

### OBS-27 — Approval workflow opcional configurable por org

**Estado:** pendiente · **sub-plan grande**
**Área:** Properties + Org settings + (potencialmente) Inquiries/Deals
**Tipo:** Feature compleja
**Severidad:** P3

**Texto usuario:**
> Cuando un agente crea o modifica una propiedad, quizás algunas organizaciones quieran tener aprobacion de parte de los Admins u owner. Asi se evita que publiquen cosas fuera de lugar por algun motivo. Esto debe ser configurable a nivel de organizacion solo como owner.

**Triage:**
- Diseño:
  - Setting org-level (owner-only): `organization.property_approval_required: boolean default false`.
  - Cuando `true`:
    - Agent edita/crea property → status forzado a `'in_review'`, NO puede `'active'` directo.
    - Admin/owner reciben notif (in-app + email).
    - Admin/owner pueden aprobar (→ `'active'`) o rechazar (→ `'draft'` + razón).
    - Audit trail: tabla `property_approval` con state machine.
  - UI:
    - Settings page `/dashboard/settings/properties` (owner ve toggle).
    - Inbox-like view para admin/owner: properties pending review.
    - Badge en sidebar con count.
- Decisiones:
  - ¿Solo properties o también Inquiries/Deals? Recomendación: arrancar solo properties, evaluar si pide para otros.
  - ¿Es bypass-able para owner? Recomendación: sí, owner edita y pasa directo a `'active'`.
- Sub-plan grande: ~15+ tickets.

**Bloqueante implícito de:** OBS-12 (botón Guardar/Publicar se transforma con esto en el contexto).

---

## Orden propuesto de trabajo

Bloque P0 (bugs) → P1 (quick wins UI) → cross-cutting decisiones → P2 features chicas → P3 sub-plans. Dentro de cada bloque, primero los que no dependen de otros.

| # | Ticket | Bloque | Notas |
|---|---|---|---|
| 1 | OBS-01 | P0 bug | Reproducción primero — necesito IDs. |
| 2 | OBS-02 | P0 bug | Visual, fix chico. |
| 3 | OBS-03 | P1 | Investigación → restauración. |
| 4 | OBS-04 | P1 | Borrar botón muerto. |
| 5 | OBS-06 | P1 | Typo + label. |
| 6 | OBS-07 | P1 | Dropdown width. |
| 7 | OBS-08 | P1 | Labels filtros props. |
| 8 | OBS-13 | P1 | Filter typos inquiries. (Duplicado del 5 — merged) |
| 9 | OBS-09 | P1 | Icon alignment chars. |
| 10 | OBS-10 | P1 | Condición icon. |
| 11 | OBS-11 | P1 | Cover image aspect. |
| 12 | OBS-05 | P1 | Modal overflow. |
| 13 | OBS-14 | P2 | Rename "Form público" + tu decisión sobre alt. |
| 14 | OBS-15 | P2 | Crear contacto button. |
| 15 | OBS-21 | P2 cross | Origin semantics (decisión + migración). **Bloquea OBS-20, OBS-22**. |
| 16 | OBS-22 | P2 cross | Creado por (depende de OBS-21 para la decisión user vs bot). |
| 17 | OBS-20 | P2 modal | Nueva consulta redesign (depende de OBS-21). |
| 18 | OBS-23 | P2 cross | View toggle persist. **Bloquea OBS-24, OBS-25**. |
| 19 | OBS-12 | P2 | Save/Publish botón — decisión depende de OBS-27 path. |
| 20 | OBS-13 (summary cards) | P2 | UI consistency. |
| 21 | OBS-17 | P2 | Canal semántica + inline edit. |
| 22 | OBS-18 | P2 | Contacts table show more data. |
| 23 | OBS-16 | sub-plan | Etiquetas mgmt. |
| 24 | OBS-19 | depende 16+17 | Filtros canal + etiquetas. |
| 25 | OBS-25 | sub-plan chico | Kanban inquiries. |
| 26 | OBS-24 | sub-plan | Kanban properties. |
| 27 | OBS-26 | sub-plan | Slug SEO. |
| 28 | OBS-27 | sub-plan grande | Approval workflow. |

---

## Notas operativas

- **Branch:** todo se trabaja en `feat/contact-inquiry-refactor` (no mergeado todavía) o branch nuevo si decidís separar. Mi sugerencia: branch separado `feat/post-r47-batch-1-fixes` para que el PR del refactor original quede limpio.
- **Workflow por ticket:** master-prompt 12 pasos. Cada ticket = commit atómico. Tabla de tests obligatoria post-fix.
- **Reviewer:** se ejecuta por ticket o se agrupa por bloque homogéneo (e.g. los 6 quick-wins P1 podrían pasar por un reviewer conjunto). Decisión por bloque.
- **Code review acceptance:** NO ACCEPTABLE rule — todos los issues del reviewer se resuelven.

