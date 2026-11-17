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
  - src/features/my-atlas/planning/handoffs.mjs
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/views/roam/Privacy.vue
  - workers/my-atlas/src/account/service.mjs
  - workers/my-atlas/src/index.mjs
  - workers/my-atlas/src/planning
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/test/planning.test.mjs
  - scripts/test-my-atlas-planning.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run lint
    - npm run my-atlas:worker:check
    - npm run my-atlas:worker:check:staging
    - npm run build
    - Wrangler dry run packaged the Worker; its optional user-profile log write reported a sandbox EPERM without failing the package check
    - Thirty Workers-runtime tests verified wishlist isolation, duplicate rejection, global revision conflicts, immutable snapshots, a four-destination plan, controlled-clock retention, plan-only expiry, and permanent account erasure
    - Client utility tests verified ordered segmented Google Maps output with no more than three intermediary waypoints per leg, custom-coordinate confirmation, the 2,048-character guard, the 50-destination defensive ceiling, and coordinates omitted from AI prompts by default
    - Staging Worker version e7538fcf-b117-4905-9c0e-f8383f3f1bcd returned 200 health with the production origin, exposed ETag and X-Request-Id, rejected unauthenticated owner reads and deletion with 401, and rejected an unrelated origin with 403
---

# My Atlas trip planning implementation

The implementation slice is present on `feature/my-atlas-trip-planning`. Its
backward-compatible API is deployed to the isolated staging Worker. The
frontend remains on the feature branch and additional external beta invitations
remain gated on the owner checks below.

## Implemented and test verified

- [x] Permanent owner account deletion route, explicit confirmation, revision
  guard, registry and handle cleanup, per-user erasure, and exact retry
  tombstone.
- [x] Owner-only wishlist CRUD for catalog and existing custom-place shapes.
- [x] Deterministic owner-scoped wish IDs, duplicate index, 250-entry cap,
  normalized notes, priorities, optional desired year, and 100-record paging.
- [x] One private plan with an ordered destination list, accessible move
  controls, lifecycle status, optional year and note, start, and two end modes.
  The API retains a defensive 50-destination ceiling rather than presenting a
  three-stop product limit.
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
- [x] No paid routing, app-owned AI inference, new telemetry route, public plan,
  ad slot, partner card, or marketing pixel.
- [x] Public privacy copy now explains My Atlas storage, sharing, service
  providers, plan retention, export, application-account deletion, and the
  limited deletion tombstones. Registration links directly to that notice.
- [x] Planner controls now expose busy and expanded state, named move controls,
  a labeled prompt preview, explicit new-tab Maps link names, visible keyboard
  focus, wrapped narrow-width actions, and 44-pixel-equivalent action targets.
- [x] Isolated staging Worker version
  `e7538fcf-b117-4905-9c0e-f8383f3f1bcd` is deployed and passed public health,
  CORS, foreign-origin rejection, and unauthenticated owner-route probes.

## Partial or not yet verified

- [x] Deploy the backward-compatible Worker to isolated staging.
- [ ] Deploy or promote the frontend after branch validation.
- [ ] Run account deletion against a real disposable staging account. The
  authenticated destructive check cannot safely use the owner's existing
  account; automated durable-state erasure and exact retry tests pass.
- [ ] Complete authenticated planner layout, keyboard, screen-reader, and
  horizontal-overflow acceptance at desktop and phone widths. Code review and
  lint cover the new semantics and responsive rules, but the local headless
  renderer failed in its GPU process before producing fresh visual evidence.
- [ ] Verify Google Maps output on Android app/browser, iOS app/browser, and
  desktop. The code enforces the conservative three-intermediary limit, but
  provider behavior remains externally unverified.
- [x] Complete public policy copy for future-location retention, private versus
  public state, service providers, export, application deletion, and upstream
  Google/Auth0 identity handling.
- [ ] Decide whether plan start and end need direct catalog/custom entry. The
  first slice deliberately selects its start and destinations from saved
  wishlist records.
- [x] Segment long Google Maps handoffs into continuous mobile-safe links.
- [ ] Implement the separate owner-reviewed Mark Visited transition.
- [ ] Update production routing only after staging acceptance. No apex Worker
  route is authorized by this implementation.

## Verified commands

```text
npm run my-atlas:test
npm run lint
npm run my-atlas:worker:check
npm run my-atlas:worker:check:staging
npm run build
```

The full production build passed after the managed documentation changes. No
frontend deployment, pull request, commit, or merge is claimed here. The
staging Worker deployment and probes are recorded above; disposable-account and
real-device acceptance remain external owner actions.
