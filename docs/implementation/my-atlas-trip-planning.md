---
id: my-atlas-trip-planning-implementation
title: My Atlas Trip Planning Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-17
updated: 2026-11-17
related:
  - my-atlas-trip-planning
  - my-atlas-private-beta-implementation
  - my-atlas-account-state
  - my-atlas-registration
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - package.json
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - src/features/my-atlas/components/MyAtlasRegistrationForm.vue
  - src/features/my-atlas/catalog/placeSearchClient.mjs
  - src/features/my-atlas/planning/handoffs.mjs
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/views/roam/Privacy.vue
  - workers/my-atlas/src/account/service.mjs
  - workers/my-atlas/src/index.mjs
  - workers/my-atlas/src/planning
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/test/planning.test.mjs
  - scripts/test-my-atlas-planning.mjs
  - scripts/test-my-atlas-place-catalog.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run lint
    - npm run my-atlas:worker:check
    - npm run my-atlas:worker:check:staging
    - npm run build
    - Wrangler dry run packaged the Worker; its optional user-profile log write reported a sandbox EPERM without failing the package check
    - Thirty-one Workers-runtime tests verified wishlist isolation, duplicate rejection, global revision conflicts, immutable wishlist and direct endpoint snapshots, a four-destination plan, controlled-clock retention, plan-only expiry, and permanent account erasure
    - Client utility tests verified ordered segmented Google Maps output with no more than three intermediary waypoints per leg, direct selected finishes, custom-coordinate confirmation, the 2,048-character guard, the 50-destination defensive ceiling, and coordinates omitted from AI prompts by default
    - Catalog client tests verified canonical search-result coordinates and the shared rate-limit error presentation used by visited and planner search
    - Thirty-two Workers-runtime tests verified that an unresolved canonical wish remains visible and removable while plan snapshot creation rejects it
    - npm run lint and npm run build passed after the planner disclosure spacing and request-reference recovery changes
    - Local Chromium component-state measurements at 1,264 and 390 CSS pixels verified that the planner disclosure exactly matches the neighboring Add destination header width, height, vertical padding, centered alignment, and zero viewport overflow
    - Staging Worker version cfd6a48b-03fe-43fb-9e4a-9e4b8022e962 returned 200 health with the production CORS origin and exposed request ID, while its unauthenticated wishlist read returned the required 401
    - Pull request 109 passed validation run 44153248293 and merged the recovery to develop as c54a27710689019cab794d17a307c0626462f8f5; develop validation run 44153597602 then succeeded
    - Pull request 110 passed production validation run 44153925179 and merged to main as ebc0ee59fa25185dbd899662316cf9b59cca0659
    - Pages workflow 44154348301 built and deployed main merge ebc0ee59fa25185dbd899662316cf9b59cca0659 successfully
    - Live content-addressed chunk 515.27a58f3d.js returned 200 with the planner disclosure, unavailable-entry recovery, remove-and-add guidance, and request-reference copy together
    - Staging Worker version e7538fcf-b117-4905-9c0e-f8383f3f1bcd returned 200 health with the production origin, exposed ETag and X-Request-Id, rejected unauthenticated owner reads and deletion with 401, and rejected an unrelated origin with 403
    - Staging Worker version f66133bb-6050-4491-ab37-70ab8fee42b3 deployed the backward-compatible direct start/finish contract, returned 200 health with the production CORS origin and X-Request-Id, and rejected an unauthenticated trip-plan read with 401
    - Pull request 105 passed validation run 44143259391 and merged the feature to develop as e8436e94fe6221ad5757c17e1ef830651970f645; develop validation run 44143711352 then succeeded
    - Pull request 106 passed production validation run 44144016650 and merged to main as db18ad829bb8781dfebb6b8adcf00bcec829fd7c
    - Pages workflow 44144353792 built and deployed main merge db18ad829bb8781dfebb6b8adcf00bcec829fd7c successfully
    - Live content-addressed chunk 216.0c437c4d.js returned 200 with Add a destination, Visited destinations, Plan future travel, and Use as finish together; a live headless render showed the compact signed-out flow
    - Pull requests 101 and 102 passed required validation and merged through protected develop and main as 3b30d3608b35b23a05460c33aed659392b21b3e6 and 8add555205dcd23314c0e11e1f0a2b4d1038fd54
    - GitHub Pages run 44128602408 deployed main merge 8add555205dcd23314c0e11e1f0a2b4d1038fd54
    - Live content-addressed privacy and My Atlas bundles contained the final retention notice, ordered-plan UI, segmented Google Maps links, and permanent account-deletion control
    - Direct /privacy and /my-atlas requests returned the existing GitHub Pages application fallback with HTTP 404; a direct-route 200 strategy remains unimplemented and is not claimed
---

# My Atlas trip planning implementation

The implementation is deployed for controlled owner testing. Staging
Worker version `cfd6a48b-03fe-43fb-9e4a-9e4b8022e962` now serves the
backward-compatible direct start and finish contract plus unavailable-wish
read recovery. Pull requests 109 and 110 promoted the server-compatible planner
recovery and compact disclosure correction through protected `develop` and
`main`. Pages run 44154348301 and live chunk 515.27a58f3d.js verify the current
frontend release.
Additional external beta invitations remain gated on the owner checks below.

## Implemented and test verified

- [x] Permanent owner account deletion route, explicit confirmation, revision
  guard, registry and handle cleanup, per-user erasure, and exact retry
  tombstone.
- [x] Owner-only wishlist CRUD for catalog and existing custom-place shapes.
- [x] Deterministic owner-scoped wish IDs, duplicate index, 250-entry cap,
  normalized notes, priorities, optional desired year, and 100-record paging.
- [x] One private plan with an ordered destination list, accessible move
  controls, lifecycle status, optional year and note, and three end modes. A
  start or selected finish may come directly from the catalog, from private
  custom coordinates, or from an existing wishlist record. The API retains a
  defensive 50-destination ceiling rather than presenting a three-stop product
  limit.
- [x] Immutable catalog/custom location snapshots with source-wish references,
  route-readiness state, and catalog revision.
- [x] Account-global ETag, `If-Match`, and idempotency behavior across wishlist,
  plan, Keep, and deletion writes.
- [x] Six-calendar-month retention, 30-day deletion grace, visible Keep/Delete
  review, per-owner alarm scheduling, and automatic plan-only expiry.
- [x] Client-only Google Maps URL and privacy-filtered AI prompt builders.
  Longer plans become continuous Maps legs with at most three intermediary
  waypoints per link for the conservative mobile-browser boundary.
- [x] JSON export schema 2 including visited pins, wishlist, plans, snapshots,
  and retention state.
- [x] Existing public projection continues enumerating only `pin:` keys; tests
  prove private wishlist text does not enter an empty public response.
- [x] Gated Vue owner UI for catalog or coordinate wishlist entry, editing,
  one-plan assembly, reordering, handoffs, retention review, JSON download, and
  account deletion.
- [x] Independent planner search for canonical countries, cities, and reviewed
  spots through the shared My Atlas search endpoint. Results and saved wishlist
  cards expose catalog latitude and longitude; manual coordinates remain the
  explicit custom-place fallback.
- [x] Search results and manual coordinates can be assigned directly as the
  plan start or selected finish without creating a wishlist record. The Worker
  resolves catalog IDs authoritatively and stores the same immutable snapshot
  shape used by wishlist-backed plan locations.
- [x] No paid routing, app-owned AI inference, new telemetry route, public plan,
  ad slot, partner card, or marketing pixel.
- [x] Public privacy copy now explains My Atlas storage, sharing, service
  providers, plan retention, export, application-account deletion, and the
  limited deletion tombstones. Registration links directly to that notice.
- [x] Planner controls now expose busy and expanded state, named move controls,
  a labeled prompt preview, explicit new-tab Maps link names, visible keyboard
  focus, wrapped narrow-width actions, and 44-pixel-equivalent action targets.
- [x] The planner starts collapsed within the owner workflow. Its expanded
  wishlist, destination chooser, and ordered-stop collections use bounded
  scrolling so large private lists do not lengthen the whole Atlas panel.
- [x] A missing canonical catalog record no longer prevents the owner from
  opening the planner. The unresolved wish remains visible and removable, is
  disabled as a route choice, and cannot enter a new immutable plan snapshot.
  Planner errors now retain the Worker request ID, and the planner disclosure
  uses the same compact full-width spacing as its neighboring workflow cards.
- [x] Isolated staging Worker version
  `cfd6a48b-03fe-43fb-9e4a-9e4b8022e962` is deployed with the
  backward-compatible direct endpoint contract and unavailable-wish recovery.
  It passed health, production-origin CORS, request-ID, and unauthenticated
  wishlist probes. The earlier foreign-origin rejection remains covered by
  automated tests and the prior staged release evidence.

## Partial or not yet verified

- [x] Deploy the backward-compatible Worker to isolated staging.
- [x] Promote the frontend through protected develop and main pull requests and
  verify the Pages deployment plus exact live bundle markers.
- [ ] Run account deletion against a real disposable staging account. The
  authenticated destructive check cannot safely use the owner's existing
  account; automated durable-state erasure and exact retry tests pass.
- [ ] Complete authenticated planner layout, keyboard, screen-reader, and
  horizontal-overflow acceptance at desktop and phone widths. Code review and
  lint cover the new semantics and responsive rules, and local component-state
  measurements verify the corrected disclosure geometry at desktop and phone
  widths. A real authenticated owner-session review of the full expanded
  planner still remains.
- [ ] Verify Google Maps output on Android app/browser, iOS app/browser, and
  desktop. The code enforces the conservative three-intermediary limit, but
  provider behavior remains externally unverified.
- [x] Complete public policy copy for future-location retention, private versus
  public state, service providers, export, application deletion, and upstream
  Google/Auth0 identity handling.
- [x] Plan start and selected finish support direct catalog or custom-coordinate
  entry. Ordered intermediate destinations remain explicit wishlist choices.
- [x] Segment long Google Maps handoffs into continuous mobile-safe links.
- [ ] Implement the separate owner-reviewed Mark Visited transition.
- [x] Keep the API on its isolated staging Worker while promoting the
  feature-gated Pages frontend. No apex Worker route was added.

## Verified commands

```text
npm run my-atlas:test
npm run lint
npm run my-atlas:worker:check
npm run my-atlas:worker:check:staging
npm run build
```

The full production build passed, and the staging Worker plus Pages frontend
deployments are recorded above. Disposable-account deletion, authenticated
responsive and accessibility acceptance, and real-device Maps behavior remain
external owner actions before additional invitations are issued.
