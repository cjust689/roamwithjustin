---
id: my-atlas-trip-planning-implementation
title: My Atlas Trip Planning Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-17
updated: 2026-11-19
related:
  - my-atlas-trip-planning
  - my-atlas-trip-planner-ux-routes-flights-lodging
  - my-atlas-trip-planner-phase-0-2026-11-18
  - my-atlas-directions-phase-2-2026-11-18
  - my-atlas-private-beta-implementation
  - my-atlas-account-state
  - my-atlas-registration
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - package.json
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - src/features/my-atlas/components/MyAtlasRegistrationForm.vue
  - src/features/my-atlas/catalog/placeSearchClient.mjs
  - src/features/my-atlas/planning/errors.mjs
  - src/features/my-atlas/planning/handoffs.mjs
  - src/features/my-atlas/planning/mapProjection.mjs
  - src/features/my-atlas/planning/sharedTrip.mjs
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/views/MyAtlasSharedTripView.vue
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
    - Pull request 196 passed validation run 44657690886 and merged the weak ETag recovery plus separate saved trip and Visited Atlas sharing workflows to develop as 03a188025480129e57156d75243bc70f3a67d229; develop validation run 44657932409 then succeeded
    - Pull request 197 passed production validation run 44658215573 and merged to main as d0fba5c3da9d054b36ef6f9d7a070dcdd39f3246; Pages run 44658409109 deployed it successfully
    - Live chunk 917.6e99172f.js returned 200 with Share saved trip, Share Visited Atlas, and Show on public profile together
    - Source assertions and the production compile verify that Share saved trip remains visible beside a collapsed saved plan, uses the existing private-field-filtered read only snapshot, and reports copy success or failure outside the expanded planner; the separate owner workflow is named Share Visited Atlas
    - Authenticated local Chrome against staging observed an idempotent POST /v1/me/bucket-list return HTTP 200, a complete Wish body, and W/"rev-9"; the normalized local client retained revision 9, refreshed the atomic planning snapshot at W/"rev-10", and showed the new destination without a planner error
    - npm run my-atlas:test passed after client coverage was expanded to accept the observed weak revision ETag on a valid idempotent wishlist response
    - npm run atlas:test passed while the monitored MapTiler teardown warnings were traced to map.remove cleanup during development hot reload rather than a live request or render failure
    - Local Chrome component-state verification at 1280 by 900 and 390 by 844 confirmed that a saved trip hides the route builder, exposes Copy share link in its heading, uses Edit trip and Trip tools as the only primary actions, and replaces the long itinerary with a compact header while editing; the editor uses the stable Saved places disclosure
    - npm run my-atlas:test
    - npm run lint
    - Pull request 180 passed validation run 44574292911 and merged the semantic route and memory slice to develop as 72bfc9f497b8e80ede8dad00fa37b8eb7864ffdf; develop validation run 44574697970 then succeeded
    - Pull request 181 passed production validation run 44575077843 and merged to main as 08cf577cbe73143606346e3dc70df7528e047b67
    - Pages run 44575490190 deployed the production merge, and live chunk 593.43c30535.js returned 200 with the Start, Route, Return map key and coral return styling
    - Pull request 174 passed validation run 44551655463 and merged to develop as 9dc320c08ee9b0efa87477236aded35e15dca7c8; develop validation run 44552079192 then succeeded
    - Pull request 175 passed production validation run 44552479821 and merged to main as 8852245ef99bb70d63658e20c70ac87bd71e84ab
    - Pages run 44552804408 deployed the production merge successfully
    - Live bundles app.1723abca.js, 863.53806ea6.js, and 327.76157321.js returned 200 and contained the read only trip action, dated Expedia handoff, upper-right profile action, and official park identity markers
    - Staging Worker version cfcd24f1-eb25-4ca9-ae9c-bea2340cfdfe deployed the atomic planning snapshot, returned 200 health with the production CORS origin, and rejected an unauthenticated planning snapshot read with 401
    - Pull request 176 passed validation run 44564175987 and merged to develop as 33265fc69069d7cba5333388fb38440924dbcc4c; develop validation run 44564599236 then succeeded
    - Pull request 177 passed production validation run 44564960456 and merged to main as 6c83c834cd1849fbad87e34b2e53cf657b64e47d
    - Pages run 44565347879 deployed the production hotfix successfully
    - Live chunks 327.509840b5.js and 761.a1e574b6.js returned 200 and contained the atomic planning endpoint, invalid snapshot guard, and authoritative revision recovery method
    - Client tests verify versioned read only trip snapshot encoding, private field omission, optional nearby suggestion prompt copy, dated Expedia handoff parameters, and successful mutation recovery through an authoritative read
    - Planner boundary tests verify one atomic wishlist and saved-plan snapshot, the temporary legacy fallback, authoritative profile revision reads, and the exact revision used by subsequent writes
    - Workers runtime tests verify GET /v1/me/planning returns wishlist and plan records under one account revision
    - Workers runtime tests verify that deletion releases registration identity and handle assignments and permits clean registration with the same identity and handle through a new invitation
    - Client deletion recovery tests verify a stale account DELETE at revision 5, authoritative profile recovery at revision 7, persisted revision replacement, and one successful retry with the original idempotency key
    - Pull requests 192 and 193 passed validation runs 44635828088 and 44636436895, merged through develop and main, and develop validation run 44636119731 succeeded
    - Pages run 44636727908 deployed main merge 08e5d6d2f1bac45a1dd8596ad87ba64581702668; live chunk 129.fea5c713.js contained both deletion revision recovery callbacks
    - Phase 1 source assertions verify the primary saved-itinerary region, explicit Start and Finish presentation, collapsed editor and destination controls, functional Directions and planning-prompt panels, dirty-state marker, and absence of dead Flights or Stays actions
    - Phase 2 client tests verify point inclusion, retained order, Maps mode grouping, fly and ferry boundaries, one-point search, same-place collapse, new-adjacency default behavior, three-waypoint segmentation, URL length limits, coordinate confirmation, and URL privacy
    - Phase 2 source assertions verify browser-only preference handlers do not call the API, a mutation, plan save, or planning refresh
    - Saved-plan source assertions verify the mutation response is rendered immediately, a partial companion read retains that confirmed snapshot, and a successful deletion clears it without waiting for refresh
    - Planner-coherence tests verify direct Add to trip wiring, visible save requirements, eager planning reads, parent map-mode switching, start and stop and finish route projection, selected-finish omission until chosen, and shared-coordinate role preservation
    - npm run my-atlas:test, npm run lint, npm run docs:audit, and npm run build passed for the planner-coherence slice
    - Local Chrome fixture verification at 1280 and 390 CSS pixels confirmed the compact account menu, overview actions, route-first planner, nested wishlist, readiness-gated trip-details dialog, and zero horizontal overflow
    - Local Chrome fixture verification on 2026-11-19 at 1280 and 390 CSS pixels confirmed the full-width account row, expanded planner width, natural-height scrolling, readable route builder, and zero horizontal overflow
    - Pull request 141 passed validation run 44358088143 and merged to develop as e514e6d06bcb011cfabd0f2fe68b77144213e8cb; develop validation run 44358509804 then succeeded
    - Pull request 142 passed production validation run 44358862563 and merged to main as 01c8a83e54b14f4cec3a47ac26b82b9804dad62f
    - Pages workflow 44359227708 built and deployed the production coherence merge successfully
    - Live content-addressed chunks 944.dfa848dd.js and 327.9488c543.js returned 200 and together contained Add to trip, Before this trip can be saved, Your private draft route, and Open trip
    - Pull request 137 passed validation run 44347357469 and merged to develop as eecbc6590d47d526a376525c18e1e6399f95bbc2; develop validation run 44347715150 then succeeded
    - Pull request 138 passed with the validated develop head and merged to main as 61e5542885238c5816f5289a93c3bc20af2481ec
    - Pages workflow 44348107246 built and deployed main merge 61e5542885238c5816f5289a93c3bc20af2481ec successfully
    - Live content-addressed chunk 417.972f66bc.js returned 200 and contained Saved, refresh needed, the route-choice introduction, Fly separate handoff, the save receipt, and Your itinerary together
    - docs/audits/assets/my-atlas-directions-phase2-desktop.png
    - docs/audits/assets/my-atlas-directions-phase2-mobile.png
    - Revision-conflict recovery tests verify monotonic browser revision state, one complete read retry when wishlist and plan ETags differ, and one safe mutation retry only after an explicit HTTP 412 confirms no write occurred
    - Catalog and API client tests resolve Yellowstone National Park from its immutable record shard as a reviewed spot and accept its complete created-pin response
    - Owner-view source assertions verify authoritative account refresh before a stale-write retry and a bounded phone profile control with explicit focus treatment
    - A live-page containment check at 432 CSS pixels applied the corrected scoped rules to the production component structure: the focused profile control measured 397 by 38.5 CSS pixels, remained inside the 432-pixel document, and no longer inherited the legacy navigation background, shadow, 56-pixel line height, or pill radius
    - Source assertions verify the signed-in overview exposes Plan a trip on desktop and mobile, closes competing destination panels, opens the existing planner, scrolls it into view, and focuses its disclosure heading
    - Pull request 153 passed validation run 44401070493 and merged to develop as 8ef9e32650012f50ea5ab1752e45b71d129c0707; develop validation run 44401457014 then succeeded
    - Pull request 154 passed production validation run 44401842472 and merged to main as 5f6c64d37074ea547c3dd75215dab6bb6fd63706
    - Pages run 44402230386 deployed the production merge, and live chunk 571.b9f0d996.js returned 200 with the new stale-save recovery, unavailable-catalog, and Plan a trip markers together
    - docs/audits/assets/my-atlas-planner-phase1-desktop.png
    - docs/audits/assets/my-atlas-planner-phase1-mobile.png
    - Thirty-three Workers-runtime tests verified atomic selected-stop conversion, exact retry, duplicate prevention, planning-state preservation, and account-global revision behavior
    - Thirty-four Workers-runtime tests passed after absent-Wish deletion became an idempotent no-op that preserves revision and count
    - Staging Worker version 2b35b3f4-8c5e-42de-b37e-93b83aa1291d deployed the absent-Wish reconciliation and backward-compatible optimized catalog reader
    - Pull requests 145 and 146 promoted the absent-Wish and bounded-search release through protected develop and main; history-only pull request 147 restored current main ancestry before production promotion
    - Pages run 44369566126 succeeded for main merge 1758fea1681ff72ec0e9423f2a06f4fb07d5e13b, and live chunk 885.9c3d6805.js returned 200 with the four-character search boundary
    - npm run my-atlas:worker:check
    - npm run my-atlas:worker:check:staging
    - npm run build
    - Wrangler dry run packaged the Worker; its optional user-profile log write reported a sandbox EPERM without failing the package check
    - Thirty-one Workers-runtime tests verified wishlist isolation, duplicate-place indexing, global revision conflicts, immutable wishlist and direct endpoint snapshots, a four-destination plan, controlled-clock retention, plan-only expiry, and permanent account erasure
    - Client utility tests verified ordered segmented Google Maps output with no more than three intermediary waypoints per leg, direct selected finishes, custom-coordinate confirmation, the 2,048-character guard, the 50-destination defensive ceiling, and coordinates omitted from AI prompts by default
    - Catalog client tests verified canonical search-result coordinates and the shared rate-limit error presentation used by visited and planner search
    - Focused client tests verified permission, invalid-response, and saved-write refresh-failure guidance; npm run lint and npm run build passed with the direct-selection receipt and draft-preservation flow
    - Wishlist retry tests verified that a repeated owner and Place create returns the existing Wish without changing revision or count; API boundary tests verified safe duplicate, limit, unavailable-place, and invalid-input codes
    - Partial planning-load tests verified that a valid wishlist and revision remain available when the companion saved-trip request fails, including its safe request reference
    - Staging Worker version 538823a4-0333-4b71-9825-1647acf8e832 deployed the wishlist retry, partial-load API support, and Mark Visited boundary; its health endpoint returned 200 with the production CORS origin, exposed X-Request-Id, and no-store response policy
    - Pull request 129 passed validation run 44309523090 and merged the recovery to develop as c2eda023041550e50476c2226dfe604236faf1be; develop validation run 44309859960 then succeeded
    - Pull request 130 passed production validation run 44310230836 and merged to main as 5925c8e6c2d46334441ec03d56939654147d6dd9
    - Pages workflow 44310533617 built and deployed main merge 5925c8e6c2d46334441ec03d56939654147d6dd9 successfully
    - Live content-addressed chunk 931.ec2a4758.js returned 200 and contained the targeted bucket-list-loaded and saved-trip-unavailable recovery message
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
The 2026-11-18 wishlist retry and Mark Visited Worker changes are deployed to
isolated staging as version `538823a4-0333-4b71-9825-1647acf8e832`. Pull
requests 129 and 130 promoted the partial-load frontend correction through
protected `develop` and `main`. Pages run 44310533617 and live chunk
931.ec2a4758.js verify the production release. Authenticated owner acceptance
remains.

Pull requests 137 and 138 promoted the readable saved itinerary, the resilient
post-save snapshot, and the browser-only mixed-mode Maps handoffs through
protected `develop` and `main`. Develop validation run 44347715150 passed.
Pages run 44348107246 deployed production merge
`61e5542885238c5816f5289a93c3bc20af2481ec`, and live chunk
417.972f66bc.js contains the exact release markers. No Worker deployment was
required because this release changes no server or persistence contract.

Pull requests 141 and 142 promoted direct Add to trip behavior, visible save
requirements, eager authenticated planning reads, and the private draft map
overlay through protected `develop` and `main`. Pages run 44359227708 deployed
production merge `01c8a83e54b14f4cec3a47ac26b82b9804dad62f`.
Content-addressed chunks 944.dfa848dd.js and 327.9488c543.js contain the exact
release markers. Authenticated owner interaction and visual acceptance remain
external work.

Pull requests 145 and 146 promoted the bounded catalog search index, the
four-character browser search boundary, and idempotent already-absent Wish
deletion through protected `develop` and `main`. History-only pull request 147
restored the current `main` ancestry before production promotion. Pages run
44369566126 deployed production merge
`1758fea1681ff72ec0e9423f2a06f4fb07d5e13b`, and live chunk
885.9c3d6805.js contains the browser boundary. Authenticated owner verification
of the private wishlist read and stale-delete path remains external.

Pull requests 153 and 154 promoted monotonic browser revisions, one safe
explicit-412 write retry, Yellowstone spot creation coverage, contained phone
profile styling, and direct overview access to the private planner through
protected `develop` and `main`. Validation runs 44401070493, 44401457014, and
44401842472 succeeded. Pages run 44402230386 deployed production merge
`5f6c64d37074ea547c3dd75215dab6bb6fd63706`, and live chunk
571.b9f0d996.js returned 200 with the exact recovery and planner markers.
Authenticated owner interaction remains external acceptance.

## Implemented and test verified

- [x] Permanent owner account deletion route, explicit confirmation, revision
      guard, registry and handle cleanup, per-user erasure, and exact retry
      tombstone.
      Completed deletion removes the active handle assignment instead of
      retaining a handle tombstone, so a newly invited account can reuse the
      former identity and handle with a new internal user ID.
      A definitive HTTP 412 now reads the authoritative profile revision,
      persists it with the existing deletion idempotency key, and retries once.
      The same recovery runs when a reload resumes a stored deletion operation.
- [x] Owner-only wishlist CRUD for catalog and existing custom-place shapes.
- [x] Deterministic owner-scoped wish IDs, duplicate index, 250-entry cap,
      normalized notes, priorities, optional desired year, and 100-record paging.
- [x] Repeated creation of an existing owner and Place Wish returns that Wish
      idempotently without increasing the count or revision. The browser stores
      a successful create response before refreshing, and safe wishlist
      conflicts now expose actionable public codes instead of the generic
      account conflict.
- [x] Repeated deletion of an already-absent owner Wish returns the current
      profile revision without changing state, including when the retry carries
      the pre-delete revision. Existing records still enforce `If-Match`.
- [x] A saved-trip read failure no longer suppresses a successfully loaded
      bucket list. The owner can view and edit saved destinations while the
      saved-trip editor stays disabled behind a targeted retry message.
- [x] One private plan with an ordered destination list, accessible move
      controls, lifecycle status, optional year and note, and three end modes. A
      start or selected finish may come directly from the catalog, from private
      custom coordinates, or from an existing wishlist record. The API retains a
      defensive 50-destination ceiling rather than presenting a three-stop product
      limit.
- [x] Immutable catalog/custom location snapshots with source-wish references,
      route-readiness state, and catalog revision.
- [x] Account-global ETag, `If-Match`, and idempotency behavior across wishlist,
      plan, Keep, Mark Visited, and deletion writes. The browser accepts either
      a strong `"rev-N"` or weak `W/"rev-N"` response validator when recovering
      the numeric revision, while every mutation continues to send a strong
      `If-Match: "rev-N"` value.
- [x] Six-calendar-month retention, 30-day deletion grace, visible Keep/Delete
      review, per-owner alarm scheduling, and automatic plan-only expiry.
- [x] Client-only Google Maps URL and privacy-filtered AI prompt builders.
      Longer plans become continuous Maps legs with at most three intermediary
      waypoints per link for the conservative mobile-browser boundary.
      The prompt preview has an explicit option to request possible nearby
      stops and activities while keeping them separate from the chosen route.
- [x] Client-only read only trip links encode a versioned route snapshot in the
      URL. They include broad place labels, coordinates, order, finish mode,
      title, and optional year. They exclude notes, plan IDs, Wish IDs, account
      identity, and live location. The recipient route performs no account read.
- [x] Explicit Fly boundaries can open a dated one way Expedia search after the
      owner enters a departure date. The click sends only the two displayed
      place names and date. My Atlas does not claim price, availability, airport
      selection, or partner attribution.
- [x] A successful plan mutation with an incomplete response now reads the
      authoritative wishlist and plan revision. If the expected plan exists at
      the saved or newer revision, the client accepts that confirmed snapshot
      instead of stranding the editor in an invalid response state.
- [x] Planner refresh now reads wishlist and saved-plan records through one
      atomic owner snapshot and one ETag. A temporary fallback supports an older
      Worker during deployment overlap. Revision-conflict recovery reads the
      authoritative profile revision before retrying the intended write once.
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
- [x] Search results and manual coordinates expose a direct Add to trip path.
      It creates or reuses the private Wish required by the existing Worker
      contract, appends the returned Wish ID to the ordered draft immediately,
      and keeps Save to wishlist as a distinct action. Save requirements remain
      visible beside the disabled action, so a missing title, start, destination,
      or selected finish cannot look like an ignored click.
- [x] Direct start and finish selections now show an immediate receipt beside
      search, remain visible in the trip editor before any wishlist entry exists,
      and survive saving the first route destination. Planner mutations distinguish
      a rejected write from a successful write followed by a failed refresh, and
      permission, session, configuration, and invalid-response failures now provide
      specific recovery guidance while retaining the Worker request reference.
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
- [x] Opening the planner closes Add destination, Visited, and Share Visited Atlas
      sections, expands the desktop owner panel to a readable working width,
      and preserves every direct child at its natural height so overflow scrolls
      instead of flex-shrinking the planner into horizontal strips.
      Desktop planner collections also release their nested height limits, so
      the owner panel is the single vertical scrolling surface.
- [x] Planner failure state includes an explicit retry action. Narrow screens
      place builder actions in a full-width two-column row beneath the heading.
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
- [x] Isolated staging Worker version
      `538823a4-0333-4b71-9825-1647acf8e832` is deployed with idempotent
      duplicate Wish recovery, partial planning-load API support, and the Mark
      Visited boundary. Its health probe returned 200 with the production CORS
      origin and an exposed request ID.
- [x] Owner-reviewed Mark Visited converts only selected saved-plan stops into
      visited pins. Each selected stop accepts an optional year, month, and
      favorite memory. The server validates the current immutable snapshots,
      rejects existing visited places, writes the selected pins atomically under
      one revision and idempotency operation, and leaves the wishlist and saved
      plan unchanged. The browser requires a final confirmation and warns when the
      owner's Atlas is already public.
- [x] Planner presentation Phase 1 makes the saved plan the primary readable
      object with a distinct start, numbered stops, finish, title, year, plan
      note, current wishlist-note previews, and saved versus unsaved state.
      Destination management and the full editor start collapsed for an
      existing plan, while an empty planner opens the trip builder. Existing
      Directions and planning-prompt handoffs use mutually exclusive next-action
      panels. No Flights or Stays action appears before those capabilities exist.
- [x] The owner page now uses progressive disclosure around that planner. Sign in
      or the signed-in profile menu occupies one compact account control, while
      Add destination and Visited are attached to the Atlas overview. The planner
      leads with start, ordered stops, and finish, keeps the route builder closed
      for an existing saved trip, and names the private destination disclosure
      Saved places. A collapsed saved trip exposes Share saved trip without
      requiring the planner to open, and the expanded itinerary repeats that
      action. Both copy the same read only snapshot and show visible success or
      failure feedback. Edit trip reveals route management and Trip tools
      contains Directions and the planning prompt. Trip naming and persistence
      open in a modal only after the route has a start, at least one stop, and a
      finish.
- [x] A rejected stale mutation still relies on the Worker `If-Match` boundary.
      The browser treats revisions as monotonic, fetches the authoritative
      profile revision after an explicit HTTP 412, preserves the local itinerary
      draft, and retries the intended write once. Network failures and second
      conflicts are not replayed. Successful wishlist mutations also stop
      replacing an unrelated unsaved plan draft during their refresh.
- [x] Directions Phase 2 adds browser-only start, stop, and finish inclusion,
      a visible Drive, Transit, Walk, or Bike default, reviewed per-pair
      overrides, mixed-mode splitting, one-point Maps search, and Fly or Ferry
      boundaries. Longer Maps groups retain the conservative three-waypoint
      segmentation. Custom coordinates remain previewed and confirmation
      gated. These controls do not write account state or refresh retention.
- [x] A successful plan save or Keep response displays its confirmed plan
      snapshot before the atomic planning refresh. If that refresh fails, the
      confirmed itinerary remains visible. Successful deletion clears the local
      plan immediately. The revision and persistence contracts are unchanged.
- [x] The authenticated component now loads planning state when it mounts and
      names the current saved trip in its collapsed heading. Opening it replaces
      visited-map pins with a private draft overlay on the existing MapTiler SDK
      instance. Start, ordered stops, and finish have distinct markers, shared
      coordinates combine their roles, schematic connections strengthen the
      route, and closing the planner restores the visited Atlas. The overlay is
      browser-only and changes no Worker, storage, export, public projection,
      analytics, or retention contract.
- [x] Planner route connections now distinguish the departure leg in teal,
      intermediate travel in gold, and the final finish or return leg in coral.
      The map key names Start, Route, and Finish or Return, while shared start
      and return coordinates retain their combined marker.

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
      widths. Focused client tests cover the new error distinctions, while the
      search-to-start, search-to-finish, and first wishlist-save state flow passed
      lint and the production compile. A real authenticated owner-session review
      of the full expanded planner still remains.
- [ ] Verify Google Maps output on Android app/browser, iOS app/browser, and
      desktop. The code enforces the conservative three-intermediary limit, but
      provider behavior remains externally unverified.
- [x] Complete public policy copy for future-location retention, private versus
      public state, service providers, export, application deletion, and upstream
      Google/Auth0 identity handling.
- [x] Plan start and selected finish support direct catalog or custom-coordinate
      entry. Ordered intermediate destinations remain explicit wishlist choices.
- [x] Segment long Google Maps handoffs into continuous mobile-safe links.
- [x] Implement the separate owner-reviewed Mark Visited transition. Local
      Worker, service, contract, client, and durable-state tests pass. The Worker
      is deployed to isolated staging and the frontend is deployed through
      protected `main`; authenticated owner acceptance is not yet claimed.
- [x] Keep the API on its isolated staging Worker while promoting the
      feature-gated Pages frontend. No apex Worker route was added.
- [ ] Authenticate the 2026-11-18 wishlist retry correction against staging.
      Worker version `538823a4-0333-4b71-9825-1647acf8e832` is deployed and its
      unauthenticated health probe passed. Local client, Worker boundary, and
      Durable Object tests pass; owner-session acceptance remains.
- [ ] Complete authenticated owner acceptance of the Phase 1 readable itinerary
      at desktop and phone widths, including keyboard and screen-reader review.
      The frontend is deployed; authenticated visual acceptance is not yet
      claimed.
- [x] Implement Phase 2 as a separate UI-only directions change: ephemeral
      endpoint and stop inclusion, Maps modes, one-place search, and mixed-mode
      splitting without account writes or retention refresh. Compiled component
      evidence verifies zero horizontal overflow at 1,280 and 390 CSS pixels;
      authenticated and real-device acceptance remain open above.
- [ ] Implement stable itinerary node IDs, persisted logistics, schema-backed
      map occurrence identity, neutral stay helpers, and any
      commercial activation only through their separately reviewed later
      phases. The current private overlay intentionally uses the unique-stop
      version 1 draft and does not imply road geometry.
- [ ] Validate the Expedia handoff on desktop and phone against the provider's
      current search behavior. Skyscanner integration remains unimplemented
      because its official referral link requires an approved affiliate media
      partner ID and airport or city codes.

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
