---
id: my-atlas-trip-centric-transition
title: My Atlas Trip Centric Transition and Travel Searches
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-20
updated: 2026-11-21
related:
  - my-atlas-integrated-trip-management-2026-11-21
  - my-atlas-account-state
  - my-atlas-trip-planning-implementation
  - my-atlas-trip-planner-ux-routes-flights-lodging
  - my-atlas-favorite-travel-image-implementation
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/styles/interactions.css
  - src/features/my-atlas/components/MyAtlasTrips.vue
  - src/features/my-atlas/planning/tripClient.mjs
  - src/features/my-atlas/planning/sharedTrip.mjs
  - src/features/my-atlas/views/MyAtlasSharedTripView.vue
  - scripts/test-my-atlas-trip-workspace.mjs
  - workers/my-atlas/src/trips/store.mjs
  - workers/my-atlas/src/trips/service.mjs
  - shared/my-atlas-trips.mjs
  - workers/my-atlas/src/trips/preview.mjs
  - scripts/test-my-atlas-trips.mjs
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - src/features/my-atlas/components/MyAtlasActionFeedback.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/components/MyAtlasTravelSearch.vue
  - src/features/my-atlas/planning/travelSearch.mjs
  - src/features/my-atlas/planning/handoffs.mjs
  - workers/my-atlas/src/planning/contracts.mjs
  - workers/my-atlas/src/planning/service.mjs
  - workers/my-atlas/src/planning/retention.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - scripts/test-my-atlas-travel-search.mjs
  - scripts/test-my-atlas-action-feedback.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:trips:test verifies canonical occurrence identity, reversible pure lifecycle transitions, repeated-Place separation, endpoint preservation and deterministic preview mappings
    - Workers runtime preview test verifies unchanged account KV, revision and alarm, private-field exclusion and owner isolation
    - node scripts/test-my-atlas-action-feedback.mjs verifies repeated draft selections, stop limits, pending/success/failure outcomes, confirmed-write refresh failures and notification lifetimes
    - Local Chrome checked centered Explore actions and viewport notifications at 320, 390 and 1440 CSS pixels, with zero horizontal overflow, keyboard dismissal and no owner API requests from local draft selections
    - npm run build passed on 2026-11-20, including the full My Atlas suite and 44 Workers runtime tests; the build retained existing asset-size warnings
    - npx eslint passed for MyAtlasTravelSearch.vue, MyAtlasPlanner.vue, travelSearch.mjs, and test-my-atlas-travel-search.mjs
    - npm run docs:audit passed with 71 managed documents
    - Local Chrome fixture verification at desktop and 390 CSS pixels prepared an ATL to MAD round trip and independent Madrid to Malaga rental details while retaining exactly three itinerary stops and the flight draft across tool changes
    - Local Chrome measured 390 pixel viewport, root scroll width, and body scroll width after reviewing the rental tool; screenshots were inspected and the inherited checkbox styling collision was corrected
---

# Trip centric transition

The [November 21 integrated trip management checklist](my-atlas-integrated-trip-management-2026-11-21.md)
now records local visit reassignment and ungrouping, public visibility controls,
persisted flight/rental searches and actual Overview cards. Earlier descriptions
of browser-only logistics apply to the legacy planner and historical baseline.
The independent-destinations correction remains the governing grouping model.

The latest owner-directed independent-destinations correction at the end of
this record supersedes the earlier automatic one-stop-trip conversion design.
Earlier local/deployed slices below are historical implementation evidence.

This record reconciles the owner supplied `my-atlas-trip-architecture.md` and
`My_Atlas_Flights_Round_Trip_and_Car_Rental_Addendum.md` briefs against source.
Those inputs are proposals, not descriptions of deployed behavior. This target
changes the earlier single-plan and unique-Place restrictions for future
canonical trips. Existing contracts remain in effect until their replacement
is implemented and verified. A gated local migration and persistence slice is now test-verified below; it is not activated for existing accounts.

## Deployed baseline audit, 2026-11-20

This table records the deployed baseline before the local slice below.
The full owner-supplied trip architecture is **not released**. This is
still a partial transition, not a canonical trip release. Current source
retains `pin:`, `wish:` and `plan:` storage by default, the deterministic first-private-plan
identity, and workflow states `draft | saved | archived`. The existing
Mark Visited action creates visited pins; it does not change a trip to Past.

| Brief acceptance flow                           | Current result | Remaining implementation                                                                                               |
| ----------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A. Plan to Past                                 | Not met        | A canonical trip and reversible lifecycle with stable stop/memory IDs                                                  |
| B. Direct Past creation                         | Not met        | Add Past Trip, optional endpoints and an owner persistence API                                                         |
| C. Past to Planned                              | Not met        | An in-place status update that preserves all trip content                                                              |
| D. Repeated destination                         | Not met        | Visit occurrence IDs and memories isolated by trip/stop; current visited pins are unique per Place                     |
| E. Single-stop trip without synthetic endpoints | Not met        | Remove mandatory start from the canonical trip contract; the existing planner still requires a start and a destination |
| F. Correct mistaken lifecycle status            | Not met        | Reversible transitions and field-equality/ID regression coverage                                                       |
| G. Migration integrity                          | Not met        | Explicit idempotent upgrade, rollback snapshot, mappings, retention/alarm safety and Combine into Trip                 |

Supporting pieces exist: authenticated account ownership, catalog/custom
places, private wishlist and saved-plan editing, ordered planner map
projection without rebuilding the SDK map, read-only route sharing, visited
place notes/dates and a single account favorite travel image. Flight/rental
tools are browser drafts and reviewed handoffs. They are not saved trip
logistics, and the account image is not a trip-level media collection.

Evidence comes from `workers/my-atlas/src/planning/contracts.mjs`
(`PLAN_STATUSES`, required start and unique Wish destinations),
`planning/service.mjs` (first-private-plan identity),
`registration/objects.mjs` (`pin-place:` uniqueness, Mark Visited and legacy
retention), plus the current owner/map projections. No lifecycle endpoint,
canonical trip/stop/memory store or migration is enabled by the mobile UI fix.

## Mobile action feedback

- [x] Align the Explore Atlases action with Sign in/Quick start in the intro
      row using shared height, centered content, wrapping and a real gap.
- [x] Show a viewport notification for planner actions instead of requiring
      a scroll to the bottom announcement. Show place names, busy states,
      failure messages and explicit draft-versus-saved wording.
- [x] Keep start/finish selections visible on search, saved-place and custom
      buttons, with pressed-state semantics. Confirm stop removal/reordering,
      endpoint changes and finish-mode changes without saving implicitly.
- [x] Preserve confirmed saves when companion refresh fails; show a warning
      rather than claiming the mutation failed. Do not claim a stop was added
      when the trip is already at its destination limit.
- [x] Reuse the same notification for adding/editing a visited destination.
- [x] Complete responsive, keyboard and API-outcome verification.

`MyAtlasPlanner.vue` emits `action-feedback` events to the owner view.
`MyAtlasActionFeedback.vue` is a fixed sibling of the scrolling panel, with
one polite live region and a dismiss button. Routine confirmations last eight
seconds, pause on hover/focus and restart for repeated actions. Busy, error
and refresh-warning messages remain until replaced or dismissed. These are
acknowledgements, not extra blocking confirmation dialogs. No account, route,
trip schema or retention policy changes are introduced.

Verification artifacts are `.state/theme/mobile-feedback-qa.json`,
`feedback-intro-*.png` and `feedback-start-390.png`. The browser fixture used
synthetic owner data and controlled asynchronous write/read outcomes. It
verified visible confirmation without scrolling, selected button labels,
repeat notifications, stop addition/removal, pending state, failure without
false success, and preservation of an acknowledged write after refresh
failure. Keyboard Enter dismissed the visible notification. Separate method
tests verify eight-second success/draft expiry and persistent busy/error/
warning states. No real user profile was mutated. Hosted authenticated
acceptance remains unverified. This follow-up was promoted through protected
pull requests 218 and 219 together with the profile and image-location changes;
exact release evidence is recorded in `my-atlas-favorite-travel-image.md`.

## Audit of actual behavior

| Concern             | Actual implementation                                                                                | Required change                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Persistence         | One per-owner Durable Object stores `pin:`, `wish:`, and `plan:` records                             | Keep the same ownership boundary and introduce one canonical trip representation                                        |
| Plan identity       | `planning/service.mjs` derives one deterministic first-private-plan ID                               | Support multiple trips and preserve migrated plan IDs                                                                   |
| Stop identity       | Snapshots use Place and source Wish references, with index-based Mark Visited input                  | Assign stable occurrence IDs and preserve them across edits and reordering                                              |
| Lifecycle           | `draft`, `saved`, and `archived` are plan workflow statuses                                          | Add independent `planned` and `past` lifecycle; never infer travel from dates                                           |
| History             | Mark Visited creates owner-qualified pins; duplicate Places are rejected                             | Change lifecycle on the existing trip, preserving its stops, memories, and logistics                                    |
| Endpoints           | Save requires a start and at least one unique Wish stop                                              | Accept a single-stop journey without origin, home, airport, or return markers                                           |
| Retention           | One plan expires after six months and a 30 day grace                                                 | Prevent legacy alarms from erasing past trip history or preserved memories                                              |
| Public Atlas        | Safe projection enumerates only visited pins                                                         | Derive visited geography from explicitly shared past trips after migration, keeping repeated visits distinct internally |
| Export and deletion | Schema 2 exports pins, wishes, and one plan; deletion erases the whole user object and account image | Include canonical trips, migration mappings, and logistics without exposing them to public views                        |
| Map                 | Visited pins and planner overlay are separate projections on one MapTiler instance                   | Group canonical stop occurrences by trip ID, with one marker and no connector for single stops                          |
| Flights             | Directions previously linked each Fly pair directly to a one way Expedia search                      | Review independent gateways and flight shape before prefilled click-out                                                 |
| Rentals             | No rental tool existed                                                                               | Add optional independent pickup and drop off details without editing stops                                              |

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
- [x] Persist stable trip, stop and memory identities in local runtime tests.
- [ ] Persist reviewed flight/rental logistics through owner APIs and UI.
- [x] Prove reversible lifecycle changes preserve field equality and IDs in local runtime tests.
- [x] Prove single-stop direct-past creation and repeated-Place isolation in local runtime tests.
- [x] Prove migration retry, rollback, export, account deletion, and alarm safety in local runtime tests.
- [ ] Demonstrate transport save, reopen, export, and lifecycle preservation.
- [x] Implement a selected-trip map and explicit Combine into Trip locally.
- [ ] Add multi-trip route overview and dense overlapping-marker acceptance.
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

## Creator-first trip organization, next workstream

The owner clarified the priority on November 20: the creator must clearly
organize destinations by trip; shared viewers should then receive that same
trip structure. A recipient-only redesign or trip labels attached to global
unique-Place pins would not satisfy this requirement. Public creator editorial
cards remain an ingestion workflow, while private traveler experience recaps
remain in-app. Commercial relationship activation is a separate workstream.

The first local slice establishes `shared/my-atlas-trips.mjs` and an authenticated
read-only `GET /v1/me/trips/upgrade-preview`. The deployed account schema,
planner, public views and existing shared links remain unchanged. This is not
an implemented migration, grouping editor, trip repository or lifecycle API.
No upgrade/apply endpoint exists yet.

The contract uses stable owner-qualified trip, stop-occurrence and memory IDs.
Legacy plan IDs remain valid trip IDs. Explicit `planned | past` lifecycle is
independent of `draft | saved | archived` workflow and dates. Planned and actual
dates remain separate, with existing year/month precision preserved as a list.
Repeated Places can occur across or within trips with separate stop/memory
identities. Pure transition helpers change only lifecycle/version/audit fields;
repeating the same status is a no-op. Stop reordering preserves attached data,
and removal refuses a stop with memories, experiences, visit dates or plan
notes. A single-stop map projection has no synthetic origin or finish.
This foundation originally exposed no account writes. The subsequent gated
repository and creator workspace are described below. Logistics arrays remain
reserved model slots; save/reopen and independent ownership validation of
managed trip media/logistics remain later work.

`workers/my-atlas/src/trips/preview.mjs` reads the existing per-owner export.
Each legacy pin becomes a separate one-stop past candidate, preserving its
complete source record, favorite memory, original dates and private recaps.
The legacy plan remains one planned candidate with the same ID and ordered
stop snapshots. Origin/finish, original retention fields and all raw plan
metadata are preserved in private legacy metadata, without manufacturing
visited stops. Existing wishes and the account image are left in place.
Existing public-pin publication choices are represented in candidates; private
plans remain private. Preview candidates themselves are never shared; version 2 links below project
only explicitly selected canonical trips.

Missing/invalid source geography produces a blocking issue instead of invented
coordinates or a ready candidate with discarded data. IDs are deterministic;
a fingerprint includes owner, revision, all source data and resolved candidates
so catalog changes also invalidate a stale preview. The authenticated endpoint
returns only review groups, stable mappings, counts, issues and fingerprint.
It omits raw snapshots, private notes/recaps, image keys and identity digests.
Responses have the owner revision ETag and `no-store`. Read-only permission is
sufficient; anonymous calls and non-GET methods are rejected. Empty/custom-only
accounts need no catalog binding or provider request.

- [x] Record the creator-first requirement and audit current one-plan/unique-Place limits.
- [x] Define canonical trip, occurrence and memory contracts with reversible pure transitions.
- [x] Build deterministic, nonmutating migration candidates and an owner-only preview summary.
- [x] Verify IDs, field preservation, repeated-Place isolation, unavailable-source blocking and zero account/alarm writes.
- [x] Implement canonical persistence, transactional explicit upgrade, rollback snapshot and legacy-write boundary behind a disabled write gate.
- [x] Add history-safe retention, explicit policy acknowledgement and privacy copy; activation remains disabled pending creator UI acceptance.
- [x] Add the local creator trip collection, explicit Combine into Trip, repeated-visit editing and lifecycle controls.
- [x] Extend the selected-trip map and read-only shared reader from canonical trips, with explicit sharing scope and legacy link compatibility.
- [ ] Complete genuine-owner upgrade, grouping and sharing acceptance before activation.

Verification: `npm run my-atlas:trips:test` and `node scripts/test-my-atlas-worker.mjs`
passed. All 51 Workers runtime tests passed, including the new preview case.
The runtime case compares complete stored KV and the scheduled alarm before
and after repeated previews, and verifies another owner receives no groups
from the first account. No real account was mutated and no Worker was deployed.
Large real-account preview performance and actual upgrade/rollback acceptance
remain unverified. The full acceptance matrix above remains not met until
real-owner upgrade and release acceptance are complete. The original read-only
foundation results below are historical evidence, not the current local scope.

Final verification for this foundation slice also passed `npm run my-atlas:test`
with all 51 Worker runtime tests, explicit ESLint of the added MJS modules,
`npm run my-atlas:worker:check:staging` with workspace-local Wrangler logging,
and `npm run docs:audit` (74 managed documents, 12 existing warnings). No frontend
or recipient UI was changed in this slice. That foundation baseline was read-only; subsequent local implementation and
verification are recorded below.

## Local canonical persistence and migration slice

The next local slice implements the repository and authenticated owner APIs in
`workers/my-atlas/src/trips/store.mjs` and `service.mjs`. It is disabled by
`MY_ATLAS_TRIP_WRITES_ENABLED=false` in both default and staging configuration.
No real account is migrated and no local backend is switched automatically.
The creator trip collection, upgrade review and shared reader are now also
implemented locally as described below. The earlier no-write foundation section describes its original
baseline; write routes now exist but cannot be activated through a browser flag.

| Method         | Path                               | Behavior                                                                                           |
| -------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| GET / POST     | `/v1/me/trips`                     | Read owner trip collection / create one Planned or Past trip with one to fifty stops               |
| POST           | `/v1/me/trips/upgrade`             | Explicit fingerprint-bound legacy conversion with typed confirmation and retention acknowledgement |
| POST           | `/v1/me/trips/rollback`            | Restore the original records before any subsequent saved account change                            |
| PATCH / DELETE | `/v1/me/trips/{id}`                | Edit title/description / explicitly delete the trip                                                |
| PATCH          | `/v1/me/trips/{id}/lifecycle`      | Change Planned/Past without copying stops or memories                                              |
| POST           | `/v1/me/trips/{id}/stops`          | Add another stable occurrence, including a repeated Place                                          |
| PATCH          | `/v1/me/trips/{id}/stops/order`    | Reorder exact existing stop IDs                                                                    |
| PATCH / DELETE | `/v1/me/trips/{id}/stops/{stopId}` | Edit memory, private experience or planned/actual dates / guarded removal                          |
| POST           | `/v1/me/trips/combine`             | Explicitly combine compatible Past trips, preserving stop and memory IDs                           |

All writes require authenticated ownership, write permission, strong `If-Match`
and an idempotency key. Source selections resolve through the existing catalog
or validated owner custom coordinates. Clients cannot submit arbitrary place
snapshots, sharing metadata, operator URLs or logistics through these routes.
Multiple trips and repeated Places get separate occurrence IDs. A single-stop
trip needs no origin or finish. Stale writes return 412 rather than overwrite.

Upgrade requires `confirmation: ORGANIZE MY ATLAS`, the current preview
fingerprint and `retentionAcknowledged: true`. The accepted policy version is
`my-atlas-trips-retention-1`. Organized trips remain until explicit deletion;
legacy six-month alarms skip the upgraded object and are cleared. Source pins
and plans move into one private rollback snapshot; active canonical trips
become the sole writable source. Wishes and the favorite image stay intact.
Old pin/plan write methods reject upgraded accounts. The transaction checks
source snapshots and account revision before changing the marker or records.

Rollback restores original pins, indexes, plan, profile choices and prior alarm,
while advancing the account revision. It cannot overwrite a later saved change.
Any subsequent successful trip, profile, image or wishlist mutation removes the
rollback copy. Canonical receipts contain only digests and IDs and re-read
current records; they cannot resurrect removed private content. Old geometry
receipts are converted to references so removed memories/experiences are not
left in receipt snapshots. Account deletion erases trips, upgrade metadata,
backup and receipts through the existing complete-object deletion path.

Owner export includes canonical trips and a sanitized rollback snapshot while
available. Existing owner/public Atlas geography is a derived compatibility
projection, not a second editable pin store. Snapshots keep names/coordinates
independent of catalog changes. The public projection includes only Past trips
with publication permission and previously published favorite notes; private
recaps, route-source Wish IDs, logistics and rollback metadata are excluded.
Private recap edits do not advance Explore ranking activity. New trips default
to private. Trip-specific public Atlas publication controls remain outstanding. Explicit
read-only snapshot links use the new reader below. The compatibility map still
aggregates repeated Places; the selected-trip map renders each occurrence.

Combine currently accepts saved Past trips with matching publication choices
and no flight/rental logistics. Mixed publication scopes or transport details
require review rather than silent merging. It preserves stop IDs and memories,
turns nonempty parent descriptions into separate private notes, and records
source trip IDs. Removing a stop with content requires an explicit discard
request; the last stop of a saved trip cannot be removed. Current limits are
501 trips, fifty stops per trip and 300 distinct Past destinations. Serialized
UTF-8 limits are 1 MiB per trip, 4 MiB for the collection and 1.5 MiB for the
rollback snapshot. Oversized upgrades reject before changing source records.
These conservative bounds are below the SQLite KV per-value limit and constrain
whole-collection reads; see [Cloudflare storage limits](https://developers.cloudflare.com/durable-objects/platform/limits/).

The Add experience action now matches the other visit actions, uses a compact
count badge and a destination-specific accessible label. Synthetic Chrome
checks at 320, 390 and 1440 pixels verified transparent styling, a 32 pixel
button height, count display, no horizontal overflow and focus moving to the
experience editor. The 390 pixel capture was visually inspected. Artifacts are
ignored under `.state/theme/experience-action-*`.

All 56 Worker runtime tests pass. New tests cover disabled writes, stale preview,
exact rollback and alarm restoration, blocked legacy writes, occurrence/memory
isolation, repeated network requests, status reversibility, stop dates/order,
guarded removal, explicit Combine, owner isolation, public exclusion, backup
purging, receipt privacy, owner export and complete account deletion. HTTP tests
also verify anonymous denial, read-versus-write permission and the disabled
write-gate response. No genuine-token production migration or deployment is
claimed; genuine-owner rollout acceptance remains outstanding.

## Local creator workspace and read-only sharing

MyAtlasTrips.vue uses the same authenticated owner APIs and account revision.
Development can preview it at /my-atlas?trips=1; production ignores the query.
The optional VUE_APP_MY_ATLAS_TRIPS_ENABLED=true build flag exposes review UI,
while already upgraded accounts always use the workspace. None of these client
conditions bypass the disabled server write gate. The normal local server keeps
its configured staging API and catalog; browser checks used isolated fixtures.

The collection offers All/Planned/Past, explicit Add Trip, title/overview editing,
ordered stops and occurrence-specific memory, recap and planned/actual date
editing. Catalog search and the shared custom-location picker reuse existing
services and the mounted map. Lifecycle changes preserve memories. Combine is
explicit and bounded by the publication/logistics restrictions above. Removal
with content and trip deletion require confirmation. Upgrade requires typed
confirmation and a separate retention acknowledgement. Ambiguous retries retain
the operation key and revision; conflicts retain drafts for review. Confirmed
writes followed by failed reads show refresh warnings without claiming failure.

The selected trip is rendered on the existing SDK map with occurrence IDs and
ordered stop markers, without invented start/finish points. Flight/rental tools
remain independent browser drafts, keyed by selected trip; they are not saved
logistics. Directions and planning prompts remain reviewed external handoffs.
Editing the saved geographic snapshot, trip-level media, multiple-trip route
overview and per-trip public Atlas publication controls remain later work.

Version 2 snapshot links include only the trip name, explicit lifecycle and
ordered location names/coordinates. Repeated places remain separate entries.
Private descriptions, memories, recaps, dates, logistics, source Wish IDs and
owner/stop IDs are excluded. The creator UI states this before copying. Links
are transferable snapshots, without automatic updates or revocation. Existing
version 1 links still open. A one-stop version 2 view has one marker and no
synthetic connector or start/finish rows. Encoded links above 12,000 characters
reject rather than producing a link the reader cannot open.

Upgraded JSON export uses schema 3 with canonical records; the client accepts
schemas 2 and 3 and rejects schema 3 without trips. Upgraded CSV uses quoted
JSON record rows to preserve nested occurrences and memories. Legacy exports
remain unchanged. Export tests cover canonical memory/rollback data, quoting
and the schema boundary; private export content is never the public projection.

Local Chrome fixtures at 320, 390 and 1440 pixels verified two trips, separate
memories for a repeated destination, reversible lifecycle, no horizontal
overflow, the same map instance and the version 2 shared reader. The 390 pixel
capture was visually inspected; native select/checkbox visibility and stop-date
spacing were corrected. Reports/captures are ignored under
.state/theme/trip-workspace-*. These checks are synthetic, not real-account
migration or phone acceptance. No deployment or genuine owner mutation occurred.

Final verification for this local slice passed `npm run build` with hash
`6c76f8ac94d40e5e`, including the full My Atlas suite and all 56 Worker runtime
tests. Existing bundle-size warnings remain. Explicit ESLint passed for changed
frontend, shared contract, service, store and test modules. The staging Worker
dry run passed with the trip write gate still false. `npm run docs:audit` passed
with 74 managed documents and 12 existing warnings. The normal local preview
continues at port 8080 with its configured staging API/catalog.

## Visited-list grouping entry point

- [x] Expose Group destinations inside the existing My Atlas Visited list.
- [x] Add accessible selection controls, count, cancellation and Group into trip.
- [x] Carry click order into the canonical grouping form and through the explicit
      upgrade review, with no automatic migration or Combine write.
- [x] Refuse automatic selection for already grouped or ambiguous repeated visits;
      ask the owner to select specific Past trips instead.
- [x] Preserve reviewed grouping selections on refresh and test the disabled gate.

`MyAtlasGeographicProof.vue` mounts the initially closed trip workspace for
signed-in owners, without fetching on mount. Grouping selects destinations from
the visited list, then opens `MyAtlasTrips.vue` and requests the existing private
read/preview endpoints. Existing accounts must still explicitly acknowledge the
upgrade. The configured server write gate remains false; missing/older server
endpoints show the existing load error rather than pretending a group was saved.
Compatible upgraded accounts review the group name before explicitly combining.
This entry point does not change the default legacy Plan a trip action.

`npm run my-atlas:trips:test`, explicit ESLint of the changed components/test,
and `npm run my-atlas:test` passed, including all 56 Worker runtime tests.
Grouping tests cover selection order, upgrade carryover, ambiguous visits,
no writes during preparation and preserving reviewed choices after refresh.
Real-account grouping remains gated and no deployment is claimed.

Chrome fixture checks passed at 320, 390 and 1440 pixels using the actual
Visited-list buttons and native checkboxes. They verified selected count/order,
visible controls, no horizontal overflow and selection carryover into upgrade
review, with zero mutation calls and the disabled server gate preserved. The
390 pixel screenshot was visually inspected. Materialize's additional checkbox
decoration was avoided, and the local server's stale lint overlay was cleared;
the repeated browser check explicitly rejected any compile overlay. Ignored
artifacts are `.state/theme/visited-grouping-*`. The configured local frontend
remains on port 8080 using its existing API/catalog settings.

## Staging route availability correction

The owner observed HTTP 404 for `/v1/me/trips` from the local frontend because
the configured staging Worker still lacked the new backend routes. Deployed the
tested current Worker using `npx wrangler deploy --env staging --config
workers/my-atlas/wrangler.jsonc`, with workspace-local Wrangler logging.
Version `fc6a784b-7e87-4850-b335-5f292771f276` uploaded and deployed successfully.
The server gate remains `MY_ATLAS_TRIP_WRITES_ENABLED=false`; no upgrade or
account write was executed and the frontend API/catalog settings were unchanged.

Remote checks returned 200 for `/health`, 401 for unauthenticated
`/v1/me/trips` and `/v1/me/trips/upgrade-preview`, and 204 for the trip GET
preflight with `Access-Control-Allow-Origin: http://localhost:8080`. The 401
responses establish route recognition and authentication enforcement, not a
successful genuine-owner collection read. Authenticated review and activation
remain outstanding. The frontend changes remain local; this deployment updates
only the staging API, which the current hosted frontend also uses.

## Local Overview, Planning and Past tabs

- [x] Replace the stacked owner workflows with Overview, Planning and Past tabs.
- [x] Keep Visited Atlas sharing/export on Overview and saved-trip sharing on
      each relevant trip, without a separate Share tab.
- [x] Keep the legacy planner in Planning and visited entry/grouping in Past.
- [x] Scope canonical trips to Planned/Past, with matching creation defaults and
      lifecycle-change feedback; preserve independent trip memories.
- [x] Preserve mounted planner/workspace state and existing SDK map identity.
- [x] Add tab semantics, keyboard navigation and mobile layout verification.

`MyAtlasGeographicProof.vue` owns the active tab and limits displayed sections
and route overlays to that context. Overview retains the existing summary and
timeline controls, plus one Add visited destination action that opens Past.
Past exposes Add destination and Group destinations. Overview's selected-memory
action also opens the Past editor. Existing Plan a trip/Visited action buttons
are replaced by tabs, avoiding repeated navigation. The canonical workspace
accepts a lifecycle scope; the development trip-preview flag remains available
when opening Planning. Account/profile controls remain in the header menu.

`MyAtlasTrips.vue` distinguishes missing-route and sign-in load errors and retains
the retry path. No authenticated network error cause is asserted from screenshots
alone. Backend deployment/write-gate settings are unchanged by this UI slice.

`npm run my-atlas:test` passed with all 56 Worker runtime tests before the final
scope refinement. Focused workspace tests additionally cover lifecycle scoping,
new Past-trip defaults and preserving memory drafts when switching scope. Chrome
fixtures at 320, 390 and 1440 pixels verified active-section visibility, relevant
sharing, preserved planner draft/grouping selection, keyboard End navigation,
unchanged map identity and zero horizontal overflow. The 390 pixel Past and
Planning captures were inspected; inherited Materialize nav styling was reset.
Artifacts are ignored under `.state/theme/atlas-tabs-*`. No real account was
changed, no feature gate enabled and no frontend deployment performed.

Final `npm run build` passed with hash `d2709bb99dc19c72`, including the full
My Atlas suite and 56 Worker runtime tests. Explicit ESLint passed for the
changed components and tests; existing bundle-size warnings remain. A separate
canonical browser fixture verified Planning/Past filtering, occurrence-specific
memory editing and Overview map-overlay isolation. `npm run docs:audit` passed
with 74 managed documents and 12 existing warnings. All frontend verification
used synthetic data; the server gate remains disabled.

## Independent destinations and explicit trip creation

The owner rejected treating every saved visited destination as a trip. Adding
Uvita, Atlanta or a custom pin must create a destination that can later be
assigned to a trip. A deliberately created trip may still have only one stop.
The existing plan is a trip; five visited destinations plus that plan are not
six trips. This supersedes the earlier pin migration design and its wording.

- [x] Preserve existing standalone pins on upgrade; convert only existing plans.
- [x] Return/count ungrouped destinations separately from actual trips.
- [x] Continue standalone destination creation, editing and deletion afterward.
- [x] Add explicit named trip creation or attachment to an existing compatible
      Past trip from ordered owner-selected destination IDs, including one stop.
- [x] Move visit data atomically, preserving dates, memories, private experiences
      and publication choices; leave unselected destinations unchanged.
- [x] Give later visits independent occurrence/memory identities and make retries
      safe even after their standalone source records have moved.
- [x] Replace the typed magic phrase with a trip name and retention checkbox.
- [x] Hide save controls when the server is unavailable for writes rather than
      asking users to type into a form that can never be submitted.
- [x] Require destination-model version 2 for upgrade so older clients cannot
      activate changed storage semantics.
- [x] Verify the name/acknowledgement enablement and actual Create trip click in
      isolated browser fixtures at 320, 390 and 1440 pixels.

The grouping API is `POST /v1/me/trips/group-destinations` with ordered `pinIds`
and either `title` or target `tripId`. The UI first performs explicit account
upgrade if needed, then performs grouping with its own revision/idempotency key.
If grouping fails after upgrade, destinations remain standalone and the draft
stays available. Successful grouping is not reported as failed because a
companion refresh fails. Current staging configuration enables writes while
the default local Worker configuration keeps the gate false; no real profile
has been upgraded by the agent.

All 57 Worker runtime tests passed before the final stale-client guard case,
including standalone add/edit/delete, zero inferred trips, exact source move,
order and memory/date preservation, replay, existing-trip attachment, repeated
Place visits, one-stop trips, aggregate counts, public/private exclusion and
rollback. Focused client tests verify button enablement without a typed phrase.
Chrome fixture reports/captures are ignored under
`.state/theme/destination-model-*`; the 390 pixel image was inspected. These
fixtures are not real-account acceptance. Deployment and final build evidence
will be recorded separately when actually completed.

Final correction verification: `npm run build` passed with hash
`378b3aa12c0c0c67`, all 57 Worker runtime tests and the existing bundle-size
warnings. Explicit ESLint and staging Worker dry run passed. The stale-client
test rejects upgrades without `destinationModelVersion: 2` before any mutation.
Staging Worker `21912d9e-652a-4693-ab15-222d0e9eb6b8` deployed with
`MY_ATLAS_TRIP_WRITES_ENABLED=true`. Default Worker configuration remains false.
Remote health returned 200, anonymous collection/preview reads returned 401,
and localhost trip GET preflight returned 204 with its expected allowed origin.
No real profile was read with owner credentials, upgraded or modified by the
agent. Genuine-owner save/reopen acceptance remains for the owner to exercise.
The corrected frontend is available locally on port 8080; this follow-up has
not yet been promoted to develop/main or deployed through Pages.

## Sharing and profile organization follow-up

- [x] Rename Share Visited Atlas to Share Your Atlas and keep public visibility,
      link copying and Create story image on Overview.
- [x] Move Instagram links, private data export and account deletion into the
      top-right profile dropdown beside the theme selector.
- [x] Keep public-link display and Explore Atlases navigation in that dropdown,
      with Explore described as discovering other publicly shared Atlases.
- [x] Separate favorite image/location and public presentation/listing controls
      into Customize My Atlas, reachable from Overview and the dropdown.
- [x] Keep Overview's journey navigation connected to the existing Past/Planning
      tabs without implying that ungrouped destinations are journeys.
- [x] Preserve deletion confirmation, API bindings, image processing and export
      handlers while changing their presentation.
- [x] Verify mobile menu sizing/internal scroll, keyboard dismissal, trigger
      focus restoration, outside-click dismissal and customization focus.
- [ ] Promote this frontend follow-up together with the independent-destination
      correction; the staging API correction is already deployed separately.

Chrome fixtures at 320, 390 and 1440 pixels verified account controls exist only
in the profile dropdown, story-image creation remains in Overview sharing,
image controls move to customization, existing handler callbacks still fire,
and deletion remains disabled without its typed confirmation. The expanded menu
fits the available viewport and no horizontal overflow occurs. A first check
exposed the need to size the menu from its actual screen position; this was
corrected and the stricter viewport check passed. The 390 pixel menu and image
editor captures were visually inspected. Reports and images are ignored under
`.state/theme/profile-organization-*`, `profile-dropdown-*` and
`profile-customization-*`. The existing My Atlas suite passed with 57 Worker
runtime tests before the final layout refinement; targeted ESLint passes on
the final source. No genuine profile, image or deletion request was submitted.

Final frontend build passed with hash `ece176a00d192b3d`, including the full
My Atlas suite and all 57 Worker runtime tests. Targeted lint and the repeated
strict dropdown viewport/focus checks passed on the final source. Existing
bundle-size warnings remain. `npm run docs:audit` passed with 75 managed
documents and 12 existing warnings. The matching UI is local at port 8080;
this follow-up does not deploy a frontend or change backend configuration.

## Local button responsiveness follow-up

- [x] Share hover, immediate pressed, keyboard focus and selected-state feedback
      across owner controls, including child editors and disclosures.
- [x] Keep SDK map controls outside the shared interaction styles.
- [x] Use at least 44 by 44 pixel coarse-pointer targets and touch manipulation.
- [x] Distinguish disabled controls and actual busy state; add busy semantics
      for image/export, visit saves and the main canonical trip save actions.
- [x] Keep progress distinct from acknowledged-save notifications and retain
      reduced-motion accessibility without moving or spinning controls.
- [x] Verify real pressed state, focus, busy indicator, coarse-pointer sizing,
      unchanged map identity and no horizontal overflow in browser fixtures.

`src/features/my-atlas/styles/interactions.css` is imported by the owner view.
`MyAtlasTrips.vue` tracks `pendingAction` during mutations; failed and completed
requests clear it in the existing finally path. The pin editor and owner image/
Story buttons reuse their actual pending properties. No backend or save timing
is changed. Active press styling applies immediately, with a short release/
hover transition; touch feedback does not wait for an API response.

Chrome verified a held pointer produces the pressed transform and inset shadow
with zero transition delay, a keyboard focus ring, a disabled busy Story button
with progress cursor/indicator, 44 by 44 pixel touch targets at 320/390 pixels,
unchanged SDK map identity and no horizontal overflow. Reduced-motion emulation
removed transitions and indicator animation. The report is ignored at
`.state/theme/button-feedback-qa.json`. Focused canonical/client tests and lint
passed. A stale development lint overlay was cleared by rebuilding the changed
template; the browser check rejects an active overlay. The normal configured
API/catalog and account data were preserved. This frontend work remains local.

Final `npm run build` passed with hash `fffd69d586088aba`, including all 57
Worker runtime tests and the full My Atlas checks. Existing bundle-size warnings
remain. `npm run docs:audit` passed with 75 managed documents and 12 existing
warnings. No deployment, account mutation or provider setting was changed.

Explore intro styling follow-up: the intro's Explore Atlases router link now
uses a rounded secondary outline and matching button padding, rather than bare
text beside Sign in. Targeted lint and local Chrome at 320, 390 and 1440 pixels
passed: equal 44 pixel heights, aligned top edges, visible border and no horizontal
overflow. The 390 pixel capture was inspected. Route remains `/my-atlas/explore`;
dropdown links are outside this style override. Artifacts are ignored under
`.state/theme/explore-button-*`. This small visual change remains local.

Matching disclosure follow-up: Share Your Atlas and Customize My Atlas now use
the same section-toggle class, heading/subtitle layout and Open/Hide pill.
Customization uses controlled expanded state rather than a differently styled
native details summary. Collapsing preserves the image/location editor, and the
profile shortcut still opens it with focus on its header. Targeted lint passed.
Chrome at 320, 390 and 1440 pixels verified identical computed header height,
padding, title color/font/weight and Open labels, plus working Hide state,
controlled content visibility, keyboard Space collapse and profile-shortcut
focus. No horizontal overflow occurred. The 390 pixel capture was inspected;
artifacts are ignored under `.state/theme/matching-sections-*`. The UI remains
local; no backend or account changes were needed.
