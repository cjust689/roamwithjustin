---
id: my-atlas-trip-planner-ux-routes-flights-lodging
title: My Atlas Trip Planner Redesign and Travel Handoffs
kind: proposal
status: approved
implementation_state: partial
created: 2026-11-18
updated: 2026-11-18
related:
  - my-atlas-trip-planning
  - my-atlas-trip-planning-implementation
  - my-atlas-trip-planner-phase-0-2026-11-18
  - my-atlas-directions-phase-2-2026-11-18
  - my-atlas-travel-booking-affiliate-partnerships
  - affiliate-activation-public-editorial-first-slice
  - monetization-analytics
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/planning/handoffs.mjs
  - src/features/my-atlas/planning/mapProjection.mjs
  - src/features/my-atlas/api/client.mjs
  - workers/my-atlas/src/planning/contracts.mjs
  - workers/my-atlas/src/planning/service.mjs
  - workers/my-atlas/test/planning.test.mjs
  - scripts/test-my-atlas-planning.mjs
verification:
  state: unverified
  evidence: []
---

# My Atlas trip planner redesign and travel handoffs

This is the approved phased target for turning the existing controls-first
private planner into a readable itinerary with useful, explicitly initiated
travel handoffs. The active implementation record remains the authority for
what is available. Source and tests remain the authority for actual behavior.

## Preserved foundation

The redesign keeps one private plan, up to 50 unique ordered destinations,
direct or wishlist-backed start and finish choices, immutable place snapshots,
retention, export, deletion, Mark Visited, account-global revisions,
idempotency, and the private versus public projection boundary. Loading an
existing plan must never migrate it or write account state.

Private planner routes remain analytics-free. No affiliate offer, AdSense
placement, tracking pixel, live booking inventory, paid routing request, or
private-plan sharing is authorized by this proposal.

## Delivery phases

1. **Readable planner presentation.** Show the saved start, numbered stops,
   finish, status, note, and next actions before secondary editing forms.
   Collapse destination management and editing without changing APIs or stored
   data. Keep Up and Down ordering and the existing driving-only Maps handoff.
2. **Ephemeral Maps export choices.** Add include and exclude controls, a Maps
   default mode, reviewed per-leg overrides, one-place search, mixed-mode
   splitting, and the existing conservative three-waypoint segmentation.
   These controls perform no account write and do not refresh retention.
3. **Plan schema version 2.** Add stable itinerary `nodeId` values for start,
   stop occurrences, and finish. Persist logistics by adjacent node identity,
   preserve v1 reads without writes, upgrade only on an explicit save, and
   retain v1 Mark Visited compatibility while adding stable occurrence input.
   Duplicate destinations remain rejected.
4. **Private map overlay.** Reuse the existing MapLibre instance to show
   numbered private plan nodes and schematic connections. Do not add plan data
   to public pin projection or claim road geometry.
5. **Neutral flight assistant.** Use explicit flight legs and copyable area
   details. Let an ordinary provider search choose airports until a separately
   reviewed airport source exists. Do not invent airport codes or deep-link
   parameters.
6. **Neutral stay planning.** Persist overnight, day-visit, undecided, and
   optional user-selected base choices by stable stop node. Use copyable
   details or ordinary provider links without prices or availability claims.
7. **Optional commerce.** Requires separate merchant surface permission,
   privacy and consent review, approved links, disclosure, feature gating, and
   an explicit decision before any private-planner analytics. Free utility
   remains available without commerce.

## Current implementation state

Phases 1 and 2 are implemented, locally verified, and deployed. A subsequent
planner-coherence slice also implements the presentation portion of Phase 4
against the version 1 unique-stop contract. Search can add a result directly
to the ordered draft by creating or reusing its private Wish, save requirements
remain visible, planning state loads when the component mounts, and the existing
MapLibre instance switches between visited and private draft projections. The
draft overlay shows start, ordered stops, finish, and schematic connections. It
does not provide stable schema node identity or road geometry.

Phase 2 keeps point inclusion, the default Maps mode, per-pair overrides, and
prepared links in browser component memory only. One retained point becomes a
Maps place search. Compatible adjacent pairs are grouped by mode and segmented
at the existing three-waypoint boundary. Fly and Ferry split those groups
without creating a road route or provider link. No Worker, API, storage,
retention, export, public projection, analytics, or commerce contract changed.

Pull requests 137 and 138 promoted the release through protected `develop` and
`main`, and Pages run 44348107246 deployed production merge
`61e5542885238c5816f5289a93c3bc20af2481ec`. Authenticated owner acceptance and
real-device Google Maps checks remain external work. Pull requests 141 and 142
then promoted the coherence slice, and Pages run 44359227708 deployed main merge
`01c8a83e54b14f4cec3a47ac26b82b9804dad62f`. Live chunks 944.dfa848dd.js and
327.9488c543.js contain its exact interface markers. Phase 3, the stable-node
portion of Phase 4, and Phases 5 through 7 remain unimplemented.

## Phase 1 contract

Phase 1 changes browser presentation only. It introduces no Worker route,
request field, stored field, migration, new database, external provider
request, or map instance. A saved plan is the primary visual object. It shows
an explicit start, numbered stops, and finish, plus a saved or unsaved state.
Destination management, itinerary editing, Mark Visited, export, retention,
and deletion remain available through progressive disclosure.

Directions and the privacy-filtered planning prompt are the only active next
actions. Flights and stays are not rendered as dead controls. Revision
conflicts continue to reject the stale mutation. The browser may refresh the
latest read state while preserving the local itinerary draft, but it must not
automatically replay the failed write.

## Later schema requirements

Stable identity is an API and storage change, not a Vue-only key. Version 2
must use node identity for every logical endpoint and stop, preserve IDs across
reorder, discard modes only when their node pair is no longer adjacent, and
keep stay choices attached to the same stop. Reads do not migrate. Existing
plans upgrade only through an explicit, revision-protected save.

Repeated destinations remain deferred because selection, pin deduplication,
Mark Visited, and export semantics require a separate decision.

## Privacy and commercial boundary

The first flight and lodging releases are neutral utilities. They do not send
notes, plan IDs, wish IDs, account identifiers, custom coordinates, or entire
itineraries to analytics or providers. Every external handoff previews the
user-selected information and requires a click.

Existing Expedia offers are approved only for their current public Journey
surfaces. They cannot be moved into My Atlas without new surface approval.
`partner_click`, GA4, AdSense, and third-party widgets stay disabled on private
planner routes unless separately authorized and documented.

## Verification still required

- Authenticated desktop and phone review of the readable itinerary and
  ephemeral directions controls.
- Keyboard and screen-reader review of collapsed controls, reordering, point
  inclusion, and mode selection.
- Real-device Google Maps verification on Android, iOS, and desktop.
- Each later phase's API, export, deletion, retention, isolation, and public
  projection regression matrix before that phase can ship.
