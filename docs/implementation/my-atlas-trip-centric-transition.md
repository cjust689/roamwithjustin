---
id: my-atlas-trip-centric-transition
title: My Atlas Trip Centric Transition and Travel Searches
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-20
updated: 2026-11-20
related:
  - my-atlas-account-state
  - my-atlas-trip-planning-implementation
  - my-atlas-trip-planner-ux-routes-flights-lodging
  - my-atlas-favorite-travel-image-implementation
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - src/features/my-atlas/components/MyAtlasTravelSearch.vue
  - src/features/my-atlas/planning/travelSearch.mjs
  - src/features/my-atlas/planning/handoffs.mjs
  - workers/my-atlas/src/planning/contracts.mjs
  - workers/my-atlas/src/planning/service.mjs
  - workers/my-atlas/src/planning/retention.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - scripts/test-my-atlas-travel-search.mjs
verification:
  state: verified
  evidence:
    - npm run build passed on 2026-11-20, including the full My Atlas suite and 44 Workers runtime tests; the build retained existing asset-size warnings
    - npx eslint passed for MyAtlasTravelSearch.vue, MyAtlasPlanner.vue, travelSearch.mjs, and test-my-atlas-travel-search.mjs
    - npm run docs:audit passed with 71 managed documents
    - Local Chrome fixture verification at desktop and 390 CSS pixels prepared an ATL to MAD round trip and independent Madrid to Malaga rental details while retaining exactly three itinerary stops and the flight draft across tool changes
    - Local Chrome measured 390 pixel viewport, root scroll width, and body scroll width after reviewing the rental tool; screenshots were inspected and the inherited checkbox styling collision was corrected
---

# Trip centric transition

This record reconciles the owner supplied `my-atlas-trip-architecture.md` and
`My_Atlas_Flights_Round_Trip_and_Car_Rental_Addendum.md` briefs against source.
Those inputs are proposals, not descriptions of deployed behavior. This target
changes the earlier single-plan and unique-Place restrictions for future
canonical trips. Existing contracts remain in effect until their replacement
is implemented and verified. No account migration is implemented here.

## Audit of actual behavior

| Concern | Actual implementation | Required change |
| --- | --- | --- |
| Persistence | One per-owner Durable Object stores `pin:`, `wish:`, and `plan:` records | Keep the same ownership boundary and introduce one canonical trip representation |
| Plan identity | `planning/service.mjs` derives one deterministic first-private-plan ID | Support multiple trips and preserve migrated plan IDs |
| Stop identity | Snapshots use Place and source Wish references, with index-based Mark Visited input | Assign stable occurrence IDs and preserve them across edits and reordering |
| Lifecycle | `draft`, `saved`, and `archived` are plan workflow statuses | Add independent `planned` and `past` lifecycle; never infer travel from dates |
| History | Mark Visited creates owner-qualified pins; duplicate Places are rejected | Change lifecycle on the existing trip, preserving its stops, memories, and logistics |
| Endpoints | Save requires a start and at least one unique Wish stop | Accept a single-stop journey without origin, home, airport, or return markers |
| Retention | One plan expires after six months and a 30 day grace | Prevent legacy alarms from erasing past trip history or preserved memories |
| Public Atlas | Safe projection enumerates only visited pins | Derive visited geography from explicitly shared past trips after migration, keeping repeated visits distinct internally |
| Export and deletion | Schema 2 exports pins, wishes, and one plan; deletion erases the whole user object and account image | Include canonical trips, migration mappings, and logistics without exposing them to public views |
| Map | Visited pins and planner overlay are separate projections on one MapTiler instance | Group canonical stop occurrences by trip ID, with one marker and no connector for single stops |
| Flights | Directions previously linked each Fly pair directly to a one way Expedia search | Review independent gateways and flight shape before prefilled click-out |
| Rentals | No rental tool existed | Add optional independent pickup and drop off details without editing stops |

The current return Fly pair uses the final retained route point before the
finish. That is a schematic itinerary leg, not evidence of a chosen return
airport. It cannot determine a round trip ticket. No airport database or
verified rental-station catalog exists in the repository.

## Implemented travel search slice

Flights and Rental cars are progressive tools beside Directions and the
planning prompt. Only one tool is expanded at a time. Stays remains absent
until it provides a working utility.

The flight draft supports round trip intention, different return airports,
one way, and individually configured Fly legs. Gateway entries are independent
of visited stops. Round trip search reverses the two chosen gateways, while
open jaw uses the separately entered return gateways and produces two one way
links. Explicit Fly pairs remain visible when the main search shape changes.
A conflicting explicit return pair blocks prepared round trip links until
the user chooses the separate main search or individual legs. Labels alone
cannot establish that an airport code matches a city, so conflict detection
is deliberately conservative.

Prepared searches require explicitly reviewed uppercase three-letter codes
and valid dates. Date-free or city-label drafts can be copied and open the
ordinary Expedia flight launch page. No code is inferred from a Place,
coordinate, endpoint, or tourist stop. Individual Fly legs can seed a one way
draft only after the user chooses that action.

Rental cars supports Yes, Not sure, and No; independent pickup; same or
different drop off; and optional local date/time ordering checks. Same pickup
resolves at review time. Avis is an ordinary landing-page link with no search
parameters. A location label does not identify an Avis station. No flight is
required to prepare rental details.

Drafts live in the planner component and survive switching tools or opening
and closing the itinerary editor. They are not saved with the plan, exported,
or restored after navigation or reload. The UI states this before entry and
offers copy actions. Route changes keep their entered gateway and rental
labels and prompt another review. Existing route mode preferences remain
ephemeral under the deployed v1 rules; persistent stable-leg identity is not
claimed. No account mutation or retention refresh occurs from tool entry,
review, copying, or provider navigation.

## Canonical trip implementation sequence

1. Define versioned trip contracts inside the existing per-owner object.
   Lifecycle `planned | past` is independent of workflow/archive state. Stops
   have occurrence IDs, immutable Place snapshots, separate planned and actual
   dates, and trip/stop memory references. Logistics use independent IDs and
   gateways, with optional stable adjacency references. Never use Place IDs as
   stop IDs. Repeated visits are permitted.
2. Add read compatibility and a migration preview with no writes on load.
   Preserve each existing plan ID and all endpoint, snapshot, note, and
   retention fields as legacy metadata. Do not turn endpoints into artificial
   visited stops. Each legacy pin becomes one single-stop past trip, retaining
   every stored visit year/date and memory. Do not infer multi-stop grouping.
3. Implement one explicit, revisioned, idempotent account upgrade. Preserve a
   rollback snapshot and deterministic source-to-trip/stop mappings within
   owner storage. Verify counts and field equality before switching the
   account schema marker. Legacy write endpoints must route to canonical
   records or reject writes after upgrade, never maintain editable duplicates.
   Account deletion must erase backups and mappings too.
4. Resolve retention before enabling upgrade. The current six-month automatic
   deletion policy cannot erase past history or a planned trip containing
   preserved memories. The new policy and privacy wording must explicitly
   cover both directions of lifecycle change. Old alarms must skip migrated
   records, and a new schedule must not destroy history during a reversal.
5. Add multiple-trip owner APIs and UI. Add Trip offers Planned or Past;
   Mark as Traveled and Move to Planned update the same record in place.
   Review actual dates without requiring them. Keep memory editing independent
   of lifecycle. Require reassignment or explicit deletion when removing a
   stop with memories. Combine legacy trips only through owner review.
6. Persist the optional flight and rental drafts through explicit save under
   the same revision and idempotency rules. Include them in private export
   and deletion, preserve them across status changes, and omit them from public
   sharing unless independently authorized. Do not claim reservations occurred.
7. Replace the map and shared/public projections with trip-aware views and
   Planned/Past/All filtering. Keep the existing map instance. Preserve the
   public image and owner publication choices. Migration must not silently
   publish private plan notes, logistics, or memories.

## Verification and remaining acceptance

The automated suite verifies reviewed round trip and open jaw URL fields,
copy-only date-free and unconfirmed drafts, independent intermediate Fly
selections, explicit return conflicts, invalid calendar dates and ordering,
same/different rental drop off, and neutral URL privacy. Existing Maps,
revision, retention, and account boundary tests continue to pass. Browser
fixture checks do not establish genuine-token save/reopen acceptance because
the new travel draft fields are intentionally not part of a saved plan yet.

- [x] Audit existing storage, endpoints, retention, sharing, and flight builder.
- [x] Implement independent flight/rental browser drafts and reviewed handoffs.
- [ ] Persist stable trip, stop, memory, and logistics identities.
- [ ] Prove reversible lifecycle changes preserve field equality and IDs.
- [ ] Prove single-stop direct-past creation and repeated-Place isolation.
- [ ] Prove migration retry, rollback, export, account deletion, and alarm safety.
- [ ] Demonstrate transport save, reopen, export, and lifecycle preservation.
- [ ] Implement grouped trip map and explicit Combine into Trip.
- [ ] Complete keyboard and phone acceptance with real owner data.

## Provider evidence and limits

Reviewed on 2026-11-20:

- [Expedia official flight deeplinks](https://developers.expediagroup.com/white-label-template/traffic-growth/deeplinking/flight-deeplinks)
  documents one way and round trip search paths, airport parameters, dates, and
  the flight launch URL. The generated URL shape is covered by tests. A direct
  example search could not be opened by the research tool, so successful
  Expedia search execution and airport retention are externally unverified.
- [Avis ordinary booking page](https://www.avis.com/en/home) opened successfully
  and offers rental search. The implementation sends no location or date
  query and adds no affiliate parameters.
- [Avis official affiliate information](https://www.avis.com/en/business-rentals/affiliates)
  describes Partnerize enrollment and approved links. No owner dashboard
  access or authenticated-planner placement approval was supplied. Tracking,
  commissions, merchant-issued URLs, and attribution testing are not activated.

No booking iframe, SDK, tracking pixel, analytics event, or AdSense request is
added to private planning. Existing public Journey affiliate settings are not
reused. Full saved-trip transport acceptance remains incomplete until the
canonical persistence phases above are implemented.
