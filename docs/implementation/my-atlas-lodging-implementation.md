---
id: my-atlas-trip-lodging
title: Private My Atlas Trip Lodging
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-23
updated: 2026-11-23
related:
  - my-atlas-account-state
  - my-atlas-integrated-trip-management-2026-11-21
  - stays-sheet-intake
supersedes: []
superseded_by: []
code_paths:
  - shared/my-atlas-trips.mjs
  - src/features/my-atlas/components/MyAtlasTripLodging.vue
  - src/features/my-atlas/components/MyAtlasStayEditor.vue
  - src/features/my-atlas/components/MyAtlasTrips.vue
  - src/features/my-atlas/components/MyAtlasDestinationPicker.vue
  - src/features/my-atlas/catalog/destinationDraft.mjs
  - src/features/my-atlas/planning/stays.mjs
  - src/features/my-atlas/planning/tripClient.mjs
  - workers/my-atlas/src/trips/service.mjs
  - workers/my-atlas/src/trips/store.mjs
  - workers/my-atlas/test/account.test.mjs
  - scripts/test-my-atlas-stays.mjs
  - scripts/test-my-atlas-trip-workspace.mjs
verification:
  state: verified
  evidence:
    - node scripts/test-my-atlas-stays.mjs
    - node scripts/test-my-atlas-trip-workspace.mjs
    - npm run my-atlas:worker:durable:test passed 66 runtime tests
    - npm run my-atlas:worker:check:staging passed with an in-workspace WRANGLER_LOG_PATH and no deployment
    - npm run build passed with existing asset-size warnings using the private parallel-false Vue CLI override
    - local Chrome verified both themes at 320, 390 and 1440 pixels with one scrollable dialog and zero horizontal overflow
    - browser fixture verified map-review draft return plus add/edit/remove while preserving five destinations
    - .state/my-atlas/lodging-browser-results.json
    - staging Worker 3151c546-c995-4ebc-b857-61876be0f687 deployed on 2026-11-23
    - remote health, three unauthenticated stay routes, collection authentication and allowed/foreign-origin CORS checks passed
---

# Private trip lodging

Implements the owner-supplied `codex-context/my-atlas-lodging-implementation.md`.
The owner clarified that this and main Atlas spreadsheet ingestion should be
separate features. This document covers user-owned My Atlas trips only. The
[Stays intake checklist](stays-sheet-intake.md) covers editorial publication.

## Data and interfaces

Canonical private trips may contain `stays`. Missing stays means an empty
collection without migrating existing trips. A stay is exactly
`{id, name, url, checkIn, checkOut, place}`. `place` uses the same
`tripPlaceProjection` metadata, `[longitude, latitude]` coordinates, catalog
resolution and custom-place normalization/identity as trip destinations.
Custom positions keep the destination workflow's six-decimal precision. The
name is required, URL optional, and both local calendar dates required.
Check-out must follow check-in. Nights are computed, never persisted.

| Route                                  | Method | Behavior                                              |
| -------------------------------------- | ------ | ----------------------------------------------------- |
| `/v1/me/trips/{tripId}/stays`          | POST   | Add a stay with a server-generated stable ID          |
| `/v1/me/trips/{tripId}/stays/{stayId}` | PATCH  | Replace one stay's editable fields, preserving its ID |
| `/v1/me/trips/{tripId}/stays/{stayId}` | DELETE | Remove one stay                                       |

Create/edit input is `{name, url?, checkIn, checkOut, place}` where `place`
contains the existing `{placeId}` or `{customPlace:{name,coordinates}}`
selection. The server resolves full destination metadata rather than trusting
a client-supplied place snapshot. Delete input is empty. The collection
capability `stays` prevents presenting writes against an older server.

All operations use existing authenticated owner Durable Object storage,
revision preconditions, idempotency digests, storage budgets and response
verification. There is a 50-stay per-trip ceiling. No separate database,
property catalog, stop association or reservation model is introduced.

Only the selected stay changes. Trip stops, memories, dates, logistics and
sharing persist independently. Lifecycle changes retain stays. Combining
trips with stays requires review, consistent with the existing guard for
private logistics/endpoints, so stays cannot be silently lost. Account export
includes private stays; trip/account deletion removes their owning records.
Mutation receipts store references/digests rather than lodging snapshots.

## UI and privacy

The trip recap has a separate Lodging section with stays sorted by check-in,
date range, computed nights, location summary and an optional safe external
link. Add/Edit use the existing single workspace dialog. Remove replaces its
content with confirmation rather than nesting dialogs. Forms retain their
draft through map confirmation and failed saves. Dates seed from known trip
dates, including actual visit dates for Past trips, without inventing dates.

Location selection reuses `MyAtlasDestinationPicker`, its universal text/Maps/
coordinates/Plus Code input and the existing in-map Yes/No return flow. Using
a location updates the lodging draft; Save lodging persists it. Lodging never
creates a destination, affects destination statistics or adds a route waypoint.
No lodging map markers were added in v1, as permitted by the brief.

Only HTTP/HTTPS links without embedded credentials are accepted. Links open
with `noopener noreferrer` and no referrer. Calendar arithmetic uses UTC solely
to subtract date-only values; stored dates stay `YYYY-MM-DD`, and display uses
the same calendar day regardless of the browser timezone.

Public profiles, Explore, share snapshots, the main Atlas registries and the
editorial sheet importer do not read private stays. No owner data was migrated,
reset or written during tests.

## Checklist and release boundary

- [x] Optional private trip storage and stable-ID CRUD.
- [x] Exact destination location contract and picker reuse.
- [x] Independent lodging section and compact single-dialog forms.
- [x] Required date validation, calendar nights and safe optional URLs.
- [x] Revision/idempotency, account isolation, export/deletion and public exclusion tests.
- [x] Five destinations with one, three or five stays without changing stops.
- [x] Complete mobile/desktop rendered acceptance evidence.
- [x] Deploy the additive Worker and prepare authorized protected frontend promotion.
- [ ] Complete signed-in owner acceptance after release.

Browser acceptance used synthetic in-memory trips and blocked real owner API
requests. Screenshots are under `.state/my-atlas/lodging-{theme}-{width}.png`.
The retained preview server runs at `http://localhost:8081/my-atlas` because
8080 was already occupied. The isolated browser fixture is evidence of UI
behavior, not signed-in remote owner acceptance.

## November 23 release evidence

The owner authorized release. Worker version
`3151c546-c995-4ebc-b857-61876be0f687` is deployed to the existing staging API,
which the production site's `MY_ATLAS_API_URL` repository variable also selects.
Remote checks passed health 200, owner collection and all three lodging writes
401 without authentication, site-origin preflight 204 and foreign-origin
preflight 403. No account was created, modified, migrated or reset by these checks.

Protected frontend promotion starts in [pull request 260](https://github.com/cjust689/roamwithjustin/pull/260).
Its release description records the final develop/main merge and Pages evidence
after completion. Signed-in owner acceptance remains a separate unchecked item.
