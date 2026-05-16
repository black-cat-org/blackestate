# UI Restoration Audit — Lead surface preserved before split

**Created:** 2026-05-15
**Status:** Draft — pending user review before any migration ticket starts
**Owner:** Gonzalo

## 1. Purpose

The legacy `Lead` surface carried a rich UI (bot conversation timeline, WhatsApp-style chat dialog, suggested-properties sidebar, drag-and-drop send queue, activity timeline) that is **not yet ported** into the new `Contact / Inquiry / Deal` split. This document inventories what exists in `features/leads/presentation/` today so we can decide what to recover, where to host it in the new model, and what to drop.

**Reading order:**
1. Inventory (§3) — what components exist, what they do, LOC, dependencies.
2. Legacy page composition (§4) — how the components compose `/dashboard/leads/[id]` today.
3. Mapping proposals (§5) — where each component could live in the new model.
4. Decision points (§6) — questions to resolve before any migration starts.
5. Phasing (§7) — proposed restoration phases (no code yet).

**Hard rule of this audit:** ZERO code changes during the audit phase. The legacy `features/leads/` module + `app/dashboard/leads/*` routes stay intact and reachable (URL-direct) so the user can navigate them while reading this document. After the audit, a separate ticket migrates / ports / drops components based on the decisions in §6.

## 2. Status quo (2026-05-15)

| Artifact | State | Notes |
|---|---|---|
| `features/leads/` (entire module) | ✅ Preserved | R43–R46 paused under strict confirmation |
| `app/dashboard/leads/page.tsx` (list) | ✅ Preserved | URL-direct accessible |
| `app/dashboard/leads/[id]/page.tsx` (detail) | ✅ Preserved | URL-direct accessible — composes the rich UI |
| Sidebar entry "Leads" | ❌ Removed in R41 | The route works but nothing links to it from the dashboard chrome |
| Legacy DB table `public.leads` | ✅ Preserved | R46 (DROP TABLE) paused |
| Legacy enums in `enums.ts` | ✅ Preserved | R45 paused |

The user navigated to `/dashboard/leads/[id]` on a legacy lead row and confirmed the surface still renders end-to-end with the old data.

## 3. Inventory — 16 components, 1.911 LOC total

### 3.1 Rich / high-value components (likely worth porting)

| File | LOC | Responsibility | Top dependencies |
|---|---|---|---|
| `lead-bot-timeline.tsx` | 357 | **Bot conversation panel** — combines: queue of properties pending to send (drag-and-drop reorder via `@dnd-kit`), send-now and remove actions, queue status badge (active/paused/pending), catalog-tracking summary, "add property" dialog launcher. Right-column real-time orchestration of the bot's outreach against this lead | `@dnd-kit/core` + `@dnd-kit/sortable`, `features/leads/presentation/actions.ts` (`reorderQueueAction`, `sendQueueItemNowAction`, `removeFromQueueAction`, `addToQueueAction`), `features/bot/domain/bot.entity` (`SentProperty`), `features/properties/domain/property.entity`, lead entity types `CatalogTracking` / `QueueStatus` / `PropertyQueueItem` |
| `lead-suggested-properties.tsx` | 234 | **Property suggester dialog** — search + filter all org properties, add to queue, remove from queue. Acts as the picker for `add-property-dialog` | `features/leads/domain/lead.entity` (`Lead`), `features/properties/domain/property.entity` |
| `lead-detail-info.tsx` | 132 | **Lead info block** — phone (tel: link), email (mailto:), property of interest (link to property detail), preferences (`zoneOfInterest`, `propertyTypeSought`, `budget`), `wantsOffers` toggle, notes | `features/leads/domain/lead.entity`, `features/properties/domain/property.entity` |
| `lead-detail-header.tsx` | 108 | **Lead detail header** — back link, name + status badge, status transition actions (mark-contacted, mark-interested, schedule-visit, won, lost, archive). Equivalent to the new `InquiryDetailHeader` + `DealDetailHeader` combined | `features/leads/presentation/actions.ts` (status transitions), legacy status enum |
| `lead-chat-dialog.tsx` | 108 | **WhatsApp-style chat modal** — read-only scrollback of every message (received/sent), tick-mark status icons (sent/delivered/read), per-message timestamp, contact avatar header. The "WhatsApp simulation" the user remembers | `features/bot/domain/bot.entity` (`BotMessage`, `MessageStatus`) |
| `lead-timeline.tsx` | 102 | **Bot activity timeline** — vertical list of every `BotActivity` (property_sent, message_received, appointment_*, reminder_sent, property_viewed, lead_created) with icon + label + relative time. Launches the chat dialog inline | `features/bot/domain/bot.entity` (`BotActivity`, `BotActivityType`, `BotMessage`), `lib/constants/bot` |
| `lead-sent-properties.tsx` | 90 | **Sent-property card list** — shows every property the bot has sent to this lead, with status badge (sent / viewed / interested / discarded / appointment_scheduled). Read-only summary | `features/bot/domain/bot.entity` (`SentProperty`) |

### 3.2 Support / utility components (port mechanically)

| File | LOC | Responsibility | Notes |
|---|---|---|---|
| `add-property-dialog.tsx` | 137 | Launches the suggester from inside `lead-bot-timeline` | Coupled to queue actions |
| `lead-property-queue-item.tsx` | 107 | Sortable row inside the queue (drag handle, status icon, send-now, remove) | `@dnd-kit/sortable` |
| `lead-source-badge.tsx` | 17 | Source pill (facebook/instagram/whatsapp/etc.) | Equivalent already exists as `InquirySourceBadge` / `DealSourceBadge` — likely just delete the legacy one |
| `lead-status-badge.tsx` | 16 | Status pill (6 legacy states) | Maps to a mix of `InquiryStatusBadge` (3 buckets) + `DealStageBadge` (5 stages); legacy version becomes redundant after migration |

### 3.3 List-view components (already replaced by inquiry/deal/contact equivalents)

| File | LOC | Replaced by |
|---|---|---|
| `lead-data-table.tsx` | 101 | `InquiryDataTable` / `DealDataTable` / `ContactDataTable` |
| `lead-columns.tsx` | 93 | `inquiry-columns` / `deal-columns` / `contact-columns` |
| `lead-filters.tsx` | 73 | `InquiryFiltersBar` / `DealFiltersBar` / `ContactFiltersBar` |
| `lead-actions-menu.tsx` | 101 | `InquiryActionsMenu` / `DealActionsMenu` / `ContactActionsMenu` |
| `lead-trash-list.tsx` | 135 | `InquiryTrashList` / `DealTrashList` (already shipped) / `ContactTrashList` (R24) |

These five are **fully superseded** — no UI is lost; the new modules already cover the equivalent surface with a cleaner separation. Only the rich detail-page components (§3.1) carry real UI that does not yet exist anywhere in the new model.

## 4. Legacy page composition (`/dashboard/leads/[id]`)

```
DashboardHeader (breadcrumb)
└── flex-col gap-6 p-4 pt-0
    │
    ├── LeadDetailHeader (status badge + transition actions + back nav)
    │
    ├── grid lg:grid-cols-[1fr_1fr] gap-6
    │   ├── LeadDetailInfo (contact + property + preferences + notes)
    │   └── LeadBotTimeline (queue + drag-drop reorder + add-property + catalog tracking)
    │
    └── LeadTimeline (activities + messages, with chat dialog launcher)
```

Data fetched in the page (8 server actions in `Promise.all`):

```
[property, allProperties, messages, activities, sentProperties,
 catalogTracking, queueStatus, propertyQueue]
  = Promise.all([
      getPropertyByIdAction(lead.propertyId),
      getPropertiesAction(),
      getMessagesByContactAction(id),
      getActivitiesByContactAction(id),
      getSentPropertiesByContactAction(id),
      getCatalogTrackingAction(id),
      getQueueStatusAction(id),
      getPropertyQueueAction(id),
    ])
```

This composition is the "lost" UI. Every piece is either preserved (here) or has no equivalent in the new model. Cross-feature data flow (`bot` + `properties` + `leads`) is the reason the legacy detail page is rich — and the reason it's worth porting carefully.

## 5. Mapping proposals — where each preserved piece could live

Six rich components have no equivalent in the new model. Each row below is a **proposal**, not a decision. Decisions belong in §6.

| Legacy component | New host (candidate) | Why | Open questions |
|---|---|---|---|
| `LeadBotTimeline` (queue + add-property + catalog) | **Contact detail page** as a new tab "Bot" alongside the existing Consultas / Negocios / Citas tabs | The queue and catalog are per-person, not per-inquiry or per-deal. Belongs at the Contact level | Does the queue still target a single `propertyId` (legacy semantic) or many? The bot can send N properties to the same contact, but the legacy queue was scoped to one starting property |
| `LeadTimeline` (activity feed + chat launcher) | **Contact detail page**, "Bot" tab as a sub-section under the queue | Same scope: activities are per-contact via `bot_conversations.contactId` (after R35) | Should we show the timeline on Inquiry/Deal detail too, scoped to that inquiry/deal? Or only at the Contact level? |
| `LeadChatDialog` (WhatsApp modal) | **Reusable** from anywhere — Contact detail Bot tab + optionally from Inquiry detail to see the conversation that triggered the inquiry | The dialog is pure presentation, takes `BotMessage[]` + `leadName` + `leadPhone` | Locale fix needed: line 21 hardcodes `es-AR` for `toLocaleTimeString` — must change to `es-BO` per project convention before re-mounting |
| `LeadDetailInfo` (preferences + notes) | **Contact detail Info section** (extend existing `ContactDetailInfo`) | The fields `zoneOfInterest`, `propertyTypeSought`, `budget`, `wantsOffers` belong to the Contact (persona), not the Inquiry (event) | These fields are NOT on the new `contact` schema. Either we add them (denormalize from the legacy lead snapshot at migration time) or we treat them as Deal-level qualification (R27 dialog already captures part of this) |
| `LeadSuggestedProperties` (search + add to queue) | **Contact detail Bot tab**, modal launcher | Suggesting properties to send to a person is a per-contact action | Tied to bot queue model — depends on previous question about queue scope |
| `LeadSentProperties` (read-only sent list) | **Contact detail Bot tab**, summary card | Read-only summary of what the bot has already sent | None — straightforward port |

## 6. Decision points — resolve before any migration ticket

These questions need explicit answers before we can start moving code. Each one affects the migration plan.

### Q1 — Queue scope: per-contact or per-inquiry/deal?

The legacy queue is keyed by `lead_id + property_id`. In the new model, do we want:
- **A)** Queue per Contact (the bot tracks "which properties did I send this person?"), referenced from every Inquiry/Deal for context.
- **B)** Queue per Inquiry (each inquiry has its own queue context).
- **C)** Queue per Deal (the queue only matters once the contact has committed to a deal).

Reco: A. Bot outreach is inherently per-person, not per-event.

### Q2 — Where does the Bot tab live?

- **A)** Only on Contact detail page, as a new tab.
- **B)** On Contact detail + a compact summary on Inquiry/Deal detail (collapsed view).
- **C)** Spread across Inquiry detail (for the inquiry that triggered the conversation) and Deal detail (for the deal).

Reco: A first, then evaluate B once we see it. Avoids data duplication across three surfaces.

### Q3 — Lead-level preferences (`zoneOfInterest`, `propertyTypeSought`, `budget`, `wantsOffers`): keep them?

These fields existed on `lead` but were intentionally dropped during the split (R3 design notes said qualification migrates to the Deal). The legacy data still exists on `public.leads` rows but is not migrated to `contact` or `deal`.

- **A)** Add denormalized columns to `contact` (preferences are per-person, not per-deal).
- **B)** Migrate to first Deal of each contact at promote time.
- **C)** Drop entirely — they were rarely used.
- **D)** Drop the column, capture per-Deal in the create dialog instead.

This is the biggest architectural call in the audit. Reco: A — preferences are a Contact attribute (the person wants X, regardless of which property triggered the current Inquiry). But the migration is non-trivial.

### Q4 — Activity timeline scope: per-contact or per-inquiry/deal?

`BotActivity` already has both `contactId` and (optionally, after R34/R35) deal/inquiry references. The page could show all activities for the contact, or filter by the currently viewed inquiry/deal.

Reco: per-contact view first; per-inquiry/deal filter as a future enhancement.

### Q5 — `LeadDetailHeader` status transitions: do we resurface the "schedule visit" / "mark contacted" inline actions?

The legacy header had 1-click buttons for status transitions. The new `InquiryDetailHeader` has Promote/Discard; `DealDetailHeader` has stage transition selector + won/lost. Some of the legacy convenience (e.g. "schedule visit" as a single click that also creates the appointment) is gone.

Reco: revisit after we see the new flow with bot timeline restored. The inline button UX may be redundant once the bot tab surfaces "appointment_requested" events naturally.

### Q6 — Locale fix in `LeadChatDialog`

Line 21 hardcodes `es-AR`. Project convention (`feedback_spanish_neutral_bolivia` memory) requires `es-BO`. This is a 1-character fix and must happen before re-mounting the component anywhere.

### Q7 — Bot ai-content sub-section

Mentioned in the deferred list but not in `features/leads/` — likely lives in `features/ai-contents/` (already refactored in R38b/c/d). Verify whether the user means a different surface, or whether this is already restored elsewhere.

## 7. Phasing proposal (no code yet — plan only)

Once §6 is resolved:

**Phase R-UI-1: Sidebar restore + observation**
- Re-add the "Leads" entry to the sidebar pointing to `/dashboard/leads` (single-file change). Marked as **temporary** with a TODO comment referencing this audit doc.
- User navigates the legacy surface, confirms what is "missing" vs what they remember, and feeds answers back into §6.

**Phase R-UI-2: Schema decision (if Q3 = A)**
- Add `zoneOfInterest`, `propertyTypeSought`, `budget`, `wantsOffers` columns to `contact` table (Drizzle generate + migrate).
- Backfill from `public.leads` for migrated rows. Update `contact.entity` + mapper + use cases.

**Phase R-UI-3: Component migration**
- Move rich components (§3.1) into `features/contacts/presentation/components/` (or split: `features/bot/presentation/components/` for the timeline + queue, depending on Q2 outcome).
- Decouple from `features/leads/` imports (rename `Lead` types to `Contact`, swap action calls).
- Locale fix on chat dialog (§6 Q6).
- One commit per component family, atomic and reviewable.

**Phase R-UI-4: Mount in Contact detail Bot tab**
- Add the "Bot" tab to `ContactRelatedTabs` (the slot-pattern component R39 shipped).
- Compose `BotTimeline` + `SentProperties` + activity timeline.
- Verify Playwright smoke for: navigate to contact, switch tabs, drag queue item, open chat dialog.

**Phase R-UI-5: Legacy cleanup**
- After Phases 3-4 verified live, unblock R43–R46 with explicit user confirmation.
- Sidebar "Leads" entry removed again.
- `features/leads/` deleted.
- `lib/db/schema/leads.ts` deleted.
- `enums.ts` legacy enums deleted.
- `drizzle/sql/027_drop_legacy_leads.sql` written + applied.

## 8. Constraints carried forward

- `CLAUDE.md` rules unchanged: strict English in code, Spanish only user-facing copy with `tú` neutral, `withRLS` on every query, no Admin API for domain data, no `db` direct, throw token lowercase_snake_case (per the R46c convention now documented).
- Existing components in `features/leads/` use the SCREAMING token casing — a port to `features/contacts/` must migrate the tokens too (similar mechanical sweep as R46c).
- `@dnd-kit` is already a project dependency (used by Kanban). The queue reorder uses the same primitives — no new lib.
- Cross-feature `Application → Application` imports are allowed when the dependency is intrinsic (CLAUDE.md exception list). The bot tab on Contact detail will compose `features/bot/application/` use cases and `features/contacts/application/` — both directions need to be inventoried in the migration plan and added to the documented exceptions if any new edge appears.

---

**Next step:** user answers Q1–Q7 (or some subset), then phase R-UI-1 starts (sidebar restore + observation).
