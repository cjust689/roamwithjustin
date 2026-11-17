---
id: my-atlas-private-beta-implementation
title: My Atlas Private Beta Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-16
updated: 2026-11-17
related:
  - my-atlas-authentication
  - my-atlas-api-authentication
  - my-atlas-registration
  - my-atlas-account-state
  - my-atlas-private-beta
  - my-atlas-geography
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - package.json
  - src/features/my-atlas
  - src/router/index.js
  - scripts/my-atlas
  - scripts/test-my-atlas-place-catalog.mjs
  - scripts/test-my-atlas-worker.mjs
  - workers/my-atlas
  - docs/architecture/my-atlas-geography.md
  - docs/architecture/my-atlas-authentication.md
  - docs/architecture/my-atlas-api-authentication.md
  - docs/architecture/my-atlas-registration.md
  - docs/architecture/my-atlas-account-state.md
  - docs/proposals/my-atlas-private-beta.md
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run my-atlas:worker:check
    - npm run my-atlas:worker:check:staging
    - npm run build
    - npx eslint "src/features/my-atlas/**/*.{js,mjs,vue}" src/router/index.js "scripts/my-atlas/**/*.mjs" scripts/test-my-atlas-place-catalog.mjs
    - node --check scripts/serve.js && node --check scripts/my-atlas/local-place-search-server.mjs
    - Headless Chrome local proof at desktop and emulated 390px mobile widths
    - Noninteractive Auth0 authorization checks accepted the configured local and production callbacks and returned login_required
    - A noninteractive Auth0 connection check redirected the configured SPA to accounts.google.com
    - Owner reported successful Google sign in, callback return, and audience-scoped API access verification in the local browser proof
    - Local cities500 search returned canonical Salt Lake City, Miami, Moab, and Uvita results
    - Headless Chrome searched and pinned Salt Lake City through the full local catalog endpoint
    - Headless Chrome searched Yellowstone National Park, displayed its National park type, and opened its Add destination editor without horizontal overflow at desktop and 390 pixel widths
    - Ephemeral-RSA tests accepted an exact-issuer and exact-audience access token and rejected ID-token audiences, wrong issuer or audience, expired, unsigned, HS256, wrong-type, and under-permissioned tokens
    - Local Wrangler GET /health returned 200 and protected GET /v1/auth/check without a token returned 401
    - npm run my-atlas:serve exposed the Vue proof, isolated Worker, and catalog search on loopback ports 8080, 8787, and 8788
    - Workers-runtime SQLite Durable Object tests passed one-use invitation concurrency, identity and handle uniqueness, idempotent provisioning, private default, owner isolation, and eviction persistence
    - Workers-runtime operator tests passed deterministic invitation retry, secret-safe storage, ID-based revocation, bounded pending pagination, exact-profile completion, lease enforcement, safe slot release, and ghost-activation prevention
    - Workers-runtime account tests passed concurrent revision control, idempotent pin retries, duplicate prevention, the 300-pin ceiling, pagination, update, deletion, export, and empty-profile privacy
    - A two-account Workers-runtime test passed distinct owner-qualified pin IDs, isolated lists and exports, rejected cross-owner update and delete attempts, preserved the victim account, and rejected an unregistered identity
    - API boundary tests passed read-only delete rejection, absent user-addressed mutation routes, rejected client-supplied user IDs, and token-derived delete identity
    - Twenty Workers-runtime tests passed, including private-by-default public lookup, safe-field projection, explicit publication, immediate unpublication, spot persistence and projection, and batched catalog resolution
    - Versioned Worker catalog tests passed deterministic artifact generation, exact resolution, bounded search, runtime gzip decoding, revision mismatch rejection, and deprecated-record preservation
    - Full geonames-2026-11-16 local artifact built 256 resolution shards and 256 search shards for 237426 records
    - Full geonames-2026-11-17-spots local artifact built 256 resolution shards and 256 search shards for 237445 records
    - Full geonames-2026-11-17-reviewed-spots local artifact built 256 resolution shards and 256 search shards for 237448 records, with 225569 selectable populated places and 11607 append-preserved deprecated identities
    - Fixture and full-artifact checks reject PPLX, locality, and settlement records from new search while resolving Krka National Park and Canyonlands as National park and Mount Rushmore as Monument
    - Local Wrangler POST /v1/beta/register without a token returned 401
    - New-user account-state regression test maps registration_not_found to HTTP 404
    - Staging Worker deployment 037496ad-400a-4dda-b54f-41470cd3aa17 contains the new-user account lookup correction
    - Owner reported successful one-use invitation issuance, localhost Turnstile completion, redemption, and private account entry
    - Owner reported that the Uvita pin persisted through reload and a second sign in even though the earlier browser build displayed a false save failure
    - npm run my-atlas:test passed optional month and year date compatibility, Auth0 session restoration, statistics, year filtering, chronological destination playback, cumulative reveal, and curved connection tests
    - Headless Chrome verified exact desktop year-editor alignment and cinematic playback at 1248 by 598 and 390 by 844 without horizontal overflow
    - Headless Chrome verified search, active destination editor, then result-list document and visual order at desktop and 390 pixel mobile widths without horizontal overflow
    - Headless Chrome verified the feature-gated My Atlas homepage card, three-card desktop and stacked mobile layouts, exact /my-atlas navigation, and no horizontal overflow
    - A 390 pixel emulated mobile viewport reported 390 pixel root, body, panel, and input boundaries with no horizontal overflow
    - Headless Chrome verified collapsed owner and public map-control drawers, hidden MapLibre desktop controls, full-width visible year selectors, and 390 pixel root and panel boundaries; desktop retained expanded controls and the MapLibre button stack
    - Headless Chrome verified an initially collapsed MapLibre attribution info control and successful click-to-expand behavior
    - Headless Chrome verified the signed-out four-step walkthrough and empty revision-1 account quick start at 390 by 844 and 1200 by 900, including final-action focus targets, saved dismissal, four progress steps, and no horizontal overflow
    - Headless Chrome verified one four-place overview cluster at zoom 3.09, standalone release at zoom 8.5, selected timeline pin alignment within one pixel, a stronger shadowed 94 percent opacity connection line, and no horizontal overflow at 390 pixels
    - Staging Worker deployment c1923a3b-2a8f-47a8-acd0-cf033ea49790 returned 200 health and exposed ETag and X-Request-Id to the allowed localhost origin
    - Pull requests 73 and 74 passed required validation, merged through develop to main, and Pages workflow 44009928197 succeeded
    - Staging Worker deployment e20404c5-0250-47f0-88af-2d0db14983ee returned 200 health after the spot-aware release
    - Rclone verified 512 matching geonames-2026-11-17-spots objects with zero differences before catalog/current.json was uploaded last
    - Production-origin live searches returned Yellowstone National Park, the Eiffel Tower, and Uvita from geonames-2026-11-17-spots, and exact Yellowstone resolution returned 200
    - Catalog client and Worker routing tests preserve 429 recovery metadata, isolate catalog and public Atlas limiter keys, and prove authenticated owner bootstrap bypasses the public limiter
    - Headless Chrome at 390 pixels received a simulated catalog 429 with Retry-After and request ID, retried the unchanged query in place, and rendered Yellowstone without reloading or horizontal overflow
    - Pull request 77 merged the recovery implementation to develop after validation run 44013285435 passed; develop validation run 44013463887 then succeeded
    - History-only pull request 79 connected the prior production merge back into develop without changing files, and validation runs 44013805600 and 44014014502 passed
    - Pull request 78 merged the current develop head to main as 7c2b1a9135ce45a834bf7aadda869460452e55de, and Pages workflow 44014283401 succeeded
    - Staging Worker f039455e-35bf-4c9d-bd15-c03716e63f72 returned 200 health and live Yellowstone from geonames-2026-11-17-spots after limiter-scope deployment
    - The deployed My Atlas chunk returned 200 and contained Retry saved Atlas, Retry search, rate-limit, and API-session-renewal messages
    - Favorite-memory contract tests passed NFC and whitespace normalization, 255-code-point and 1,020-byte ceilings, markup and invisible-control rejection, direct-object enforcement, unsafe public-state failure, owner isolation, public projection, and CSV formula neutralization
    - Twenty-two Workers-runtime tests passed with one favorite memory stored on each owner-qualified pin and no separate user-addressable memory route
    - Headless Chrome at 390 pixels verified exact-limit and over-limit feedback, markup rejection, normalized local save, escaped list and selected-place rendering, and zero horizontal overflow
    - Pull request 82 merged the favorite-memory implementation to develop as 0647f176987dd3c21d111ea4827bb8170bd19169 after validation runs 44018100141 and 44018321716 passed
    - History-only pull request 84 synchronized current main into develop without file changes; validation runs 44018666432, 44018838662, and 44018845869 passed
    - Staging Worker 2fbce736-0799-4235-a7b5-018727e39b64 returned 200 health after the backward-compatible favorite-memory API deployed
    - Pull request 83 merged current develop to main as ea1af7cb5c66301d13bf206f084fbe135fa69097, and Pages workflow 44019105927 succeeded
    - Live content-addressed My Atlas chunks 239.39312812 and 229.528c3c46 returned 200 and contained Favorite memory, Save destination, and the public-sharing disclosure
    - Twenty-four Workers-runtime tests passed with custom pins stored only in the authenticated owner's object, projected without catalog resolution, shared only with the whole Atlas, and rejected when stored state is corrupt
    - Browser and Worker contract tests passed strict custom-name and coordinate normalization, server-generated owner-scoped custom IDs, API projection, and formula-safe CSV export
    - Headless Chrome at 390 pixels verified a Canyonlands custom-name entry, map click placement, rendered draggable marker, transition into the existing date and memory editor, and zero horizontal overflow
    - Pull request 87 passed validation run 44024490207 and merged to develop as 0a5e7a439e6e16df55b930214dee112df907a415; develop validation run 44024742154 then succeeded
    - Staging Worker version 9fa931b5-f32f-4df2-a84e-8a0516f83951 deployed before the frontend and returned 200 health
    - Pull request 88 passed production validation run 44025014014 and merged to main as c54ea44490c05014698ffb2a0cfbcdd076ee12c4
    - Pages workflow 44025229521 succeeded, and live chunks 102.9bc646f9.js, 850.f2e2b9be.js, and 102.fa12fe12.css returned 200 with the custom-pin UI, map event, disclosure, and marker styles
    - Headless Chrome generated a 1080 by 1920 Story PNG with the bundled Natural Earth land silhouette and correctly aligned Uvita and Paris pins
    - npm run my-atlas:test verified year-only visitor formatting while retaining API compatibility with stored month values
    - Pull request 51 merged to develop as e2b3ae448cfef3fffc01cefb7485f104ce75a956 after its required validation passed
    - Develop workflow run 43969294710 succeeded before production promotion
    - Pull request 52 merged to main as db67295c26fb624f36c9318aec1166903cbe8603 after its required validation passed
    - Pages workflow run 43969999089 succeeded
    - Headless Chrome rendered the production heading, Google sign-in section, and My Atlas branding
    - Production-origin health, CORS, and Uvita catalog search returned 200 from the isolated staging Worker
    - Pull request 55 merged the cinematic timeline to develop as fdf57a69114fe129b33035bd620ebdc49b500715 after validation run 43987030269 passed
    - Develop workflow run 43987307324 succeeded before the cinematic production promotion
    - Pull request 56 merged the cinematic timeline to main as c558add0f628ce5bd88512e00534b2939057511a after validation run 43987602293 passed
    - Pages workflow run 43987868552 deployed the cinematic timeline successfully
    - Live production JavaScript and CSS chunks returned 200 and contained the timeline copy, plane marker, Add year control, and exact 2.9rem alignment rule
---

# My Atlas private beta implementation

The accepted target is a separate personal pushpin product. Phase 1, the
bounded Phase 2A authentication boundary, the Phase 2B local registration,
operator recovery, profile, and pin-state foundations, and a Phase 2C local
sharing slice are implemented. The owner provisioned an isolated staging R2
catalog, Durable Objects, secrets, limiter, and Worker. The validation and
Pages workflows now accept explicit repository variables for a controlled
production frontend release. The API remains the isolated staging Worker, and
no apex Worker route is enabled. This work does not alter the curated Atlas or
media-upload Worker.

## Current state

| Area                                      | State                                                 | Evidence or boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Managed proposal                          | Implemented                                           | Accepted V1.1 is under docs/proposals and the unmanaged V1 is archived with reciprocal supersession metadata.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Repository preflight                      | Verified                                              | Vue 2.6, Vue Router 3 history mode, GitHub Pages fallback, curated Atlas coupling, map configuration, and upload-only Worker were inspected in source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| DNS and live route preflight              | Partial, externally observed                          | Apex and www resolve to Cloudflare addresses. Root returned 200 through Cloudflare on 2026-11-16. Atlas and My Atlas returned a hydrated-app 404 status. api and share names did not resolve. Dashboard route and origin settings remain owner-console verification.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| GeoNames rights                           | Verified against provider documentation               | GeoNames publishes the dump under CC BY 4.0, requests attribution, permits commercial use, and describes cities500 as cities over 500 population or administrative seats.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Geographic proof                          | Implemented and test verified                         | Deterministic importer, stable IDs, append-preserving deprecation, normalized search, disambiguation, bounded draft pins, and a separate MapLibre proof exist. A manually reviewed GeoNames-backed spot source adds 22 national parks, cultural landmarks, and natural landmarks as a third destination type, including product classification overrides for Krka National Park and Mount Rushmore. New city search accepts only populated-place and administrative-seat codes, explicitly excluding `PPLX` and other subdivision-style records. The same search, pin, optional year, timeline, statistics, sharing, and Story export flow accepts spots. A loopback-only development search server lets the browser query the ignored full source without bundling or committing it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Versioned Worker catalog                  | Implemented and staging verified                      | The full catalog compiles into immutable gzip resolution and query-prefix shards plus a current manifest. The active staging `geonames-2026-11-17-spots` release contains 250 countries, 237,176 cities, and 19 spots across 512 shards. Its locally verified `geonames-2026-11-17-reviewed-spots` successor contains 250 countries, 22 spots, 225,569 selectable populated places, and 11,607 append-preserved deprecated city identities across 512 shards; it has not yet replaced the staging manifest. Rclone verified all 512 active immutable objects with zero differences before the earlier manifest switch. Live production-origin searches resolved Yellowstone National Park, the Eiffel Tower, and Uvita, while exact Yellowstone resolution returned its canonical spot record. Staging Worker `f039455e-35bf-4c9d-bd15-c03716e63f72` retained that active revision and live Yellowstone result after catalog and public Atlas limiter keys were isolated. The intact `geonames-2026-11-16` and `geonames-2026-11-17-spots` releases provide reversal targets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Production frontend route                 | Deployed and rendered verified                        | The My Atlas route exists only when VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF equals true. Pull requests 51 and 52 promoted the explicit repository-variable wiring, and Pages run 43969999089 deployed it. Pull requests 55 and 56 then promoted the cinematic timeline through both protected validation gates, successful develop workflow 43987307324, and Pages workflow 43987868552. Pull requests 73 and 74 promoted spots through both protected validation gates, and Pages workflow 44009928197 deployed main merge `23d8c96`. Pull requests 77 and 78 promoted request recovery through both protected validation gates, and Pages workflow 44014283401 deployed main merge `7c2b1a9`. The live feature chunk contains the retry and session-renewal controls. Headless Chrome rendered the spot search and editor locally at desktop and mobile widths. Direct deep links still return the known Pages fallback HTTP 404 before client rendering, so server share HTML and crawler behavior remain future work. This does not create a Cloudflare apex Worker route or move the API out of isolated staging.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Auth0 browser client                      | Implemented and owner verified locally                | The owner supplied the public tenant domain, SPA client ID, and exact API audience. The Vue 2 client implements Google redirect login, callback completion, logout, audience-scoped access-token acquisition, and silent restoration of an existing Auth0 session after reload. Tokens remain memory only. The owner reported successful sign in, callback return, identity display, token acquisition, and a genuine Worker round trip. Owner verification of silent reload after the latest client build remains.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Worker authentication boundary            | Phase 2A implemented and staging verified             | A separate Worker verifies RS256 signatures through Auth0 JWKS, exact issuer and API audience, time claims, token type, and `read:my-atlas`. Mutations additionally require `write:my-atlas`; user-addressed mutation paths do not exist and client-supplied ownership fields are rejected. The staging `workers.dev` deployment returned Phase 2C health, rejected an unauthenticated protected request with 401, allowed the exact production origin, and rejected an unrelated origin. The owner also verified a genuine Auth0 API-audience access token through the live Worker. The default environment remains undeployed with no production route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Registration Durable Objects and API      | Phase 2B staging redemption owner verified            | One SQLite-backed registry class atomically reserves invitation, qualified identity, handle and idempotency claims. One SQLite-backed user class initializes a private revision-1 profile. The authenticated browser form requires a one-use invitation, bounded identity fields, explicit staging acceptance, and a real Turnstile token. The owner reported successful invitation redemption, private account entry, and a Uvita pin that persisted through reload and a second sign in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Operator invitation and recovery workflow | Implemented and staging issue owner verified          | An `admin:my-atlas` API issues recoverably idempotent high-entropy invitations, returns the code only through the protected issue response, revokes by nonsecret ID, paginates safe pending summaries, completes matching profiles, and releases only aged uninitialized registrations. Per-user abandonment tombstones block late ghost activation. A dedicated M2M grant has `read:my-atlas` and `admin:my-atlas`; the owner reported the first successful one-use invitation response without exposing its code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Profile, pin CRUD, memory, and export     | Deployed, test verified, and partially owner verified | Owner lookup is derived from the verified qualified identity. Strong ETags, `If-Match`, idempotency keys, display and visibility changes, canonical pin create/update/delete, duplicate rejection, 300-pin ceiling, bounded pagination, JSON/CSV export, owner browser bootstrap, and automatic privacy for an empty profile are tested. Each owner-qualified pin can hold one optional favorite memory with strict normalized plain-text limits, direct-object enforcement, safe legacy fallback, escaped rendering, and CSV formula neutralization. A two-account runtime test proves isolated reads and exports, distinct same-Place pin IDs, rejected cross-owner update and delete attempts, and preservation of the targeted owner state. Owner bootstrap bypasses the public read limiter, preserves the Worker request ID when rejected, and exposes an in-place retry for transient load failures. The browser authors no year or one or more visit years. The API retains optional month compatibility without exposing month in the current editor or timeline. Staging Worker `2fbce736-0799-4235-a7b5-018727e39b64` exposes the backward-compatible memory contract, while Pages workflow `44019105927` deployed the matching editor and presentation. Authenticated memory persistence against that deployment remains owner verification. Handle change, account deletion, and reporting remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Atlas presentation and Story export       | Deployed, test and browser verified                   | Owner and public views provide place, country, continent, capital, undated, date range, and map span statistics; exact year and undated filters; chronological destination playback with cumulative reveal; previous and next cycling; mobile layouts; persistent place and year pin labels; deterministic year colors; zoom-responsive screen-distance clusters; and decorative connections that do not claim a travel order. Marker elements retain absolute positioning so their bottom anchors remain on projected coordinates during playback. Connection lines use a dark underlay and stronger gold treatment for satellite contrast. Phone layouts collapse secondary map controls by default, hide the desktop MapLibre button stack, and restore a full-width native year selector when expanded. Map provider attribution remains accessible through an info control whose text starts collapsed. Playback frames successive destinations, animates a plane across a curved connection, then focuses the destination. Same-year ordering is explicitly a visual sequence, and reduced-motion preferences suppress the plane. A signed-out four-step walkthrough explains the product before registration, while a first-account quick start introduces place entry and remains manually reopenable. Headless Chrome verified owner and public controls at desktop and 390 pixel widths plus exact desktop year-editor alignment, both tutorial paths, marker clustering, and timeline anchor alignment. Pages run 43987868552 deployed the earlier cinematic chunks. The mobile-control refinement, tutorials, and marker refinement are locally browser verified. The browser generates a local 1080 by 1920 PNG labeled `My Atlas by RoamWithJustin.com` with bundled Natural Earth land geometry, so export does not depend on or capture live tiles. Authenticated visual verification remains owner action. |
| Public Atlas sharing                      | API staging boundary verified                         | Explicit publication exposes `/my-atlas/{handle}` and a signed-out safe API containing only display name, handle, canonical place summaries, optional visit dates, derived visited years, and nonempty favorite memories. A memory remains owner-only while the Atlas is private. The public service fails closed on invalid stored memory, and the browser renders memory as text rather than HTML. Live staging returned the generic no-store 404 for an absent handle. Local tests verify private-by-default publication and immediate unpublication. Public Atlas reads and catalog reads now have separate limiter keys for the same connecting IP, while owner routes bypass the public limiter. The owner view publishes, unpublishes, copies the link, filters by year, plays the cumulative timeline, and exports the visible Story card. Profile-specific server HTML, Open Graph tags, a real public profile, live rate-limit exhaustion, and browser staging verification remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Terms, privacy, retention, and moderation | Staging defaults approved; public beta blocked        | Staging uses technical-only policy labels, one use per invitation, a 24-hour maximum invitation lifetime, and a 15-minute abandoned-registration lease. These values permit controlled owner testing and do not constitute final terms or privacy approval. Retention durations, beta reset notice, operator response process, and cost stop limits must be approved before invited accounts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Phase 0 audit decisions

### Repository and route boundary

The curated Atlas route mounts a domain-specific AtlasMap and canonical Atlas
selectors. My Atlas therefore has a separate feature directory and map
component. It imports only mapStyleUrl and terrainSource from the existing
configuration.

The existing Pages postbuild copies index.html to 404.html. Live checks on
2026-11-16 returned:

- https://roamwithjustin.com/ as HTTP 200 with server cloudflare;
- https://roamwithjustin.com/atlas as HTTP 404;
- https://roamwithjustin.com/my-atlas as HTTP 404.

This confirms that client hydration alone cannot satisfy future public share
HTTP and Open Graph requirements. A later Worker route must be staged and must
pass reserved or unrelated paths through to the origin without a fetch loop.
No Worker route was added in Phase 1.

Cloudflare documents that Routes require an active zone and a proxied DNS
record, use wildcard matching rather than parameter syntax, and fetch the
configured origin when a routed Worker calls fetch on the incoming request.
The proposed production pattern remains roamwithjustin.com/my-atlas/\*, subject
to a staging passthrough test.

### Geographic catalog

The current official dump was downloaded to ignored local state, not committed.
Its extracted files are recorded by hash in generated catalogs. Uvita resolves
to geonames:3621138. Paris, France resolves to geonames:2988507 and Paris,
Texas resolves to geonames:4717560.

A committed reviewed source adds 22 GeoNames spots, including national parks,
cultural landmarks, and natural landmarks across six continents. The importer
validates each stable numeric ID, official feature code, coordinate, country,
alias set, and direct GeoNames source URL. This bounded review path avoids
turning every small park, building, mountain, or raw feature into a product
search result. Product classifications are reviewed independently of the raw
source feature, so Krka is a National park and Mount Rushmore is a Monument.
New city and town search is limited to populated-place and administrative-seat
codes. `PPLX` sections plus locality, settlement, abandoned, historical, and
other subdivision-style codes are rejected.

The full benchmark is recorded in the as-built geography document. The result
blocks bundling all cities500 records into Vue. Phase 2 should build a compact
search index or versioned partitions and expose bounded queries from the
separate My Atlas Worker. Any R2 artifact must use a new catalog bucket and
MY_ATLAS_CATALOG_R2. The existing editorial media bucket and uploader remain
out of scope.

The browser now has a bounded catalog-search client, and
`npm run my-atlas:serve` starts a loopback-only reference endpoint against the
full ignored cities500 source. Salt Lake City, Miami, Moab, and Uvita resolve to
canonical GeoNames records locally. This fixes full-source development testing
without checking the 163 MB generated catalog into Git. The endpoint uses a
linear in-memory search for browser development. The separate Worker now has a
deterministic indexed artifact builder, bounded public search, and exact-ID
resolver. Its full local artifact is ignored. The staging binding is declared
and dry-run verified. The owner created the isolated staging bucket, verified
all 512 immutable release objects with rclone, uploaded the manifest last, and
live staging searches resolved Uvita and Salt Lake City.

The spot-inclusive `geonames-2026-11-17-spots` release was built as 256
resolution shards and 256 search shards. All 512 objects matched the local
release before the manifest was uploaded last. Live staging searches and exact
resolution now return its spot records while preserving legacy city search.

### Auth0 and authorization

The owner supplied the non-secret Auth0 tenant domain, SPA client ID, and exact
API audience `https://api.roamwithjustin.com`. The Vue 2 compatible
framework-neutral SPA SDK now performs PKCE login through the Google
connection, callback completion, logout, and audience-scoped access-token
acquisition. Tokens use memory-only SDK caching and are never displayed or
logged.

Auth0 accepted noninteractive authorization requests for both configured
callback URLs. That verifies the public client, exact audience, requested
scopes, and callback allowlist. A separate check routed the configured
connection to Google's authorization endpoint. The owner then reported a
successful Google sign in, local callback return, identity display, and
audience-scoped token acquisition. The local Phase 2A Worker now validates API
access tokens and never authorizes from an ID token. The browser verification
button sends the memory-only token to its protected endpoint. Ephemeral-RSA
tests verify accepted and rejected claim boundaries without exposing the
owner's token. The owner verified the genuine Auth0-to-Worker round trip.
Phase 2B now has browser registration, private-profile provisioning, and
protected operator recovery. Staging has environment secrets, technical policy
limits, and a dedicated Auth0 M2M grant. The owner reported successful
invitation issuance, Turnstile completion, redemption, and private account
entry. The owner also reported that Uvita persisted through reload and a second
sign in. The browser now restores an existing Auth0 session with `checkSession`.
Owner verification of that restoration and of corrected write feedback remains.
Final policy approval and registration or operator rate limiting remain before
external users can be invited.

### Cost and operational gate

Cloudflare's 2026-11-13 Durable Objects pricing documentation lists SQLite
Durable Objects on Free and Paid plans. The Free plan lists 100,000 requests
and 13,000 GB-seconds per day, with operations failing after a free limit is
exceeded. The owner has provisioned isolated staging resources and still needs
to choose the account plan, monthly stop amount, alerts, and initial invite
ceiling before inviting external users.

## Phase checklist

### Phase 0, audit and decisions

- [x] Verify repository framework, routes, Pages fallback, map configuration,
      curated Atlas boundary, and existing Worker.
- [x] Verify apex DNS observation and current HTTP status behavior.
- [x] Verify GeoNames download terms and source structure.
- [x] Measure a current cities500 catalog and choose not to browser bundle it.
- [x] Preserve an isolated MY_ATLAS_CATALOG_R2 boundary if R2 is selected later.
- [x] Owner supplied a dedicated Auth0 SPA, API audience, and callback
      configuration; Auth0 accepted local and production noninteractive callback
      checks, and the owner verified the interactive local browser flow.
- [ ] Owner chooses Cloudflare plan, budget alerts, hard stop, and initial invite
      ceiling.
- [ ] Owner approves beta terms, privacy, retention, reset, and moderation
      decisions.
- [ ] Staging verifies the actual Cloudflare route and GitHub Pages origin
      passthrough before any production route exists.

### Phase 1, geographic proof

- [x] Reproducibly import countryInfo, admin1 codes, and cities500.
- [x] Record source hashes, revision, source date, and CC BY 4.0 attribution.
- [x] Use ISO country IDs and GeoNames populated-place IDs.
- [x] Add a reviewed GeoNames spot source and the stable `spot` place type for
      national parks, cultural landmarks, and natural landmarks.
- [x] Keep non-city spots on a manual allowlist, add Krka National Park,
      Canyonlands National Park, and Mount Rushmore with reviewed result types,
      and exclude PPLX and other subdivision-style populated-place codes from
      new search while preserving previously issued IDs as deprecated.
- [x] Search Uvita, Paris, and Paris Texas with disambiguated labels.
- [x] Render selected catalog coordinates with an isolated MapLibre component
      using the unchanged configured map style and terrain.
- [x] Reject arbitrary coordinates, unsupported IDs, duplicate pins,
      deprecated new selections, and pins over the 300 item cap.
- [x] Run spots through the existing authenticated owner-scoped pin lifecycle
      and safe public projection rather than a separate mutation path.
- [x] Add an explicit owner-created custom-pin fallback for catalog misses.
      Bound and normalize the plain-text name and coordinates, generate IDs on
      the server, store the entry only in the authenticated owner's object,
      exclude it from inferred geography statistics, and disclose it when the
      whole Atlas is shared.
- [x] Preserve removed records as resolvable deprecated identities.
- [x] Keep the proof disabled by default and enable it only through the
      explicit GitHub repository variable used by validation and Pages.

### Phase 2, secure backend

- [x] Add the isolated Vue 2 Auth0 login, callback, logout, and exact-audience
      access-token acquisition behind the existing local feature gate.
- [x] Define and test the bounded browser catalog-search contract with a
      loopback-only full cities500 reference server.
- [x] Add the isolated Worker, strict environment separation, and no production
      route.
- [x] Verify API-audience Auth0 access tokens and reject ID tokens in automated
      cryptographic tests, then verify the owner's genuine token through the
      deployed staging Worker.
- [x] Implement and Workers-runtime test local atomic registry claims,
      one-use invitation reservation, identity and handle uniqueness,
      private-profile initialization, and idempotent finalization.
- [x] Add and Workers-runtime test the protected operator invitation workflow,
      bounded pending-registration inspection, exact-profile completion, and
      lease-gated release with per-user ghost-activation protection.
- [x] Add the authenticated browser redemption form, public Turnstile sitekey
      configuration, real challenge widget, one-use invitation submission, and
      private-account bootstrap.
- [ ] Approve and enforce the registration and operator rate-limit policy before
      real registration is enabled.
- [x] Implement and Workers-runtime test private display and visibility changes,
      revisioned pin CRUD, bounded pagination, and JSON/CSV export.
- [x] Connect the authenticated browser to the bounded owner-state bootstrap,
      pin creation and removal, explicit publication, immediate unpublication,
      and copyable handle link.
- [x] Store one optional 255-code-point favorite memory on each owner-qualified
      pin, expose it only through owner state or an explicitly public Atlas,
      validate it independently at browser, HTTP, Durable Object, and output
      boundaries, and neutralize spreadsheet formulas in CSV export.
- [x] Add an undated state, multiple optional visit years, and year editing
      after pin creation. Retain optional month compatibility in the API while
      keeping the current editor and timeline at year precision.
- [x] Place the active Add destination editor directly below its search control
      and before the remaining catalog results on desktop and mobile.
- [x] Add a feature-gated homepage discovery card that routes visitors directly
      to My Atlas and remains responsive with the existing Atlas and guide cards.
- [x] Add an accessible pre-account product walkthrough and a once-per-browser
      quick start for newly provisioned empty accounts, with permanent manual
      access and task-focused completion actions.
- [x] Add safe derived statistics, exact year and undated filters,
      chronological destination playback with cumulative reveal, animated
      curved hops, deterministic year-colored pins, zoom-responsive marker
      grouping, destination cycling, high-contrast decorative unordered
      connections, responsive layouts, and local 1080 by 1920 Story export.
- [x] Restore an existing Auth0 browser session after reload without changing
      the memory-only access-token cache.
- [x] Implement and Workers-runtime test the safe signed-out public Atlas
      projection, indistinguishable private or absent 404, no-store response,
      and noindex client viewer.
- [ ] Implement handle-change coordination, permanent account deletion, abuse
      reporting, and their approved retention and moderation contracts.
- [x] Build and Workers-runtime test the bounded catalog search and exact
      resolution API from deterministic indexed versioned artifacts.
- [x] Add and test weighted public-read rate limiting in the Worker and declare
      its staging binding.
- [x] Isolate catalog and public Atlas rate-limit keys, keep authenticated
      owner bootstrap outside that limiter, and add in-place search and saved
      Atlas recovery with actionable error and request-reference messages.
- [x] Verify the owner-reported isolated staging bucket publication through
      successful live manifest and shard reads for Uvita and Salt Lake City.
      The owner separately verified all 512 release objects with rclone before
      uploading the manifest last.
- [x] Publish and verify all 512 immutable `geonames-2026-11-17-spots` objects,
      then update the staging `catalog/current.json` manifest last.
- [x] Pass automated concurrency, authorization, cross-owner isolation, stale
      revision, privacy, and retry tests.

### Staging cloud handoff

The owner has completed the isolated bucket, catalog publication, staging
secrets, Auth0 grants, Turnstile setup, and Worker deployment. Remaining and
completed handoff evidence is:

1. Confirm the intended Cloudflare account with `npx wrangler whoami`, then set
   the plan, budget alerts, stop threshold, and initial invite ceiling.
2. Completed by owner report: the private
   `roamwithjustin-my-atlas-catalog-staging` R2 bucket is separate from the
   editorial media bucket.
3. Completed by owner report and live search: all 512 immutable release objects
   were verified before `catalog/current.json` was uploaded last.
4. The owner approved staging-only technical labels `staging-beta-1` and
   `staging-privacy-1`, one use per invitation, a 24-hour invitation lifetime,
   and a 15-minute pending-registration lease. Replace these with approved
   policy versions before inviting any external beta user.
5. Completed by owner report: `INVITE_HASH_PEPPER`,
   `INVITE_GENERATION_SECRET`, and `TURNSTILE_SECRET_KEY` are staging secrets
   rather than tracked variables.
6. Completed for owner testing: the dedicated M2M client has its staging grant,
   and the SPA callback, logout URL, frontend origin, and Turnstile hostname are
   configured. Scope review remains before external users.
7. Tests and the staging dry run passed. Spot-aware Worker
   `e20404c5-0250-47f0-88af-2d0db14983ee` is deployed without a production
   route.
8. Production-origin health, CORS, Uvita and spot search, exact spot
   resolution, and direct client rendering now pass. Genuine-token auth on the
   production origin, a real public handle,
   rate-limit 429, immediate unpublication, and direct mobile interaction remain
   owner verification. Do not add an apex Worker route yet.

### Later gates

- [ ] Build profile-specific server HTML, Open Graph tags, and correct crawler
      status behavior only after the secure backend and staging tests pass.
- [ ] Invite users only after privacy, moderation, monitoring, reset, and export
      procedures are approved and tested.
- [ ] Keep ads, photos, Facebook, recaps, public people discovery, and editorial
      content outside the beta.
- [ ] Design memory images as a separate media release. Before implementation,
      choose the per-pin image count and retention policy, then enforce JPEG or
      PNG decoded signatures, raw-byte and pixel ceilings, metadata stripping,
      server-controlled re-encoding, owner-scoped object keys, authenticated
      deletion, private delivery, storage quotas, and abuse handling. Do not
      store image bytes in the profile Durable Object or trust extensions and
      browser MIME types as validation.
- [ ] Design planned destinations as a separate lifecycle that does not count
      as visited or enter visited playback by default. Require an explicit,
      revisioned transition into visited state and a separate public-sharing
      choice before implementing trip-planning behavior.

## Verification commands

The current implementation is verified with:

```text
npm run my-atlas:test
npm run my-atlas:worker:check
npm run my-atlas:worker:check:staging
npx eslint "workers/my-atlas/src/**/*.mjs" workers/my-atlas/vitest.config.mjs workers/my-atlas/test/registration.test.mjs "src/features/my-atlas/**/*.{js,mjs,vue}" src/router/index.js "scripts/my-atlas/**/*.mjs" scripts/test-my-atlas-place-catalog.mjs scripts/test-my-atlas-worker.mjs
node --check scripts/serve.js && node --check scripts/my-atlas/local-place-search-server.mjs
npm run build
npm run my-atlas:serve
```

The standard build and documentation audit must remain green before handoff.

## Browser verification

The proof was built with its feature flag enabled and inspected in headless
Chrome with software WebGL. The configured satellite map and attribution
rendered at 1440 by 1000. A 390 pixel emulated mobile viewport reported body
and root scroll widths of 390, so it had no horizontal overflow after the
panel correction. Searching Uvita returned the Puntarenas Province, Costa Rica
record. Selecting it produced one destination, one selected marker, and the
canonical marker ID geonames:3621138.

The final standard production build was then run without the feature flag. The
route remains absent by default.

The full-source local search was then browser tested separately. Headless Chrome
searched Salt Lake City, received `geonames:5780993` with Utah and United States
disambiguation, selected the result, and rendered it in the destination list.

The cinematic timeline was browser verified with Uvita in 2024 and Paris in 2026. At 1248 by 598, both labeled pins, the year legend, the curved connection,
and the in-flight plane rendered while Paris was the second of two destinations.
At 390 by 844, the map kept both endpoints and the plane visible above the
stacked panel with root, body, and panel widths of 390 and no horizontal
overflow. The desktop year input and Add year button had identical top and
bottom coordinates, with a zero pixel alignment difference.

Pull request 55 promoted that implementation to develop as `fdf57a6` after its
required validation passed, and develop workflow 43987307324 succeeded. Pull
request 56 then promoted it to main as `c558add` after the production validation
passed. Pages workflow 43987868552 succeeded. Direct reads of the current live
content-addressed JavaScript and CSS returned 200 and contained the new timeline
copy, plane marker styles, Add year control, and exact 2.9rem alignment rule.
This verifies deployment of the tested implementation without claiming an
authenticated production playback session.

The search interaction was then verified with Uvita at 1084 by 749 and 390 by 844. In both layouts the search control preceded the active Add destination
editor, the editor preceded the catalog result list, and the document had no
horizontal overflow.

The feature-enabled homepage was verified with three photographic discovery
cards at desktop width and a deliberate single-column stack at 390 pixels. All
mobile cards measured 369 pixels inside the 390 pixel viewport, the document
had no horizontal overflow, and activating the My Atlas card changed the route
to `/my-atlas`.

The owner and fixture-backed public Atlas were then verified at 390 by 844.
Both showed a collapsed map-controls disclosure by default, expanded it with
an accurate `aria-expanded` state, and rendered the restored native year
selector at the full drawer width. The 390 pixel root and panel boundaries had
no horizontal overflow. MapLibre's desktop navigation and terrain stack was
hidden at that width. At 1200 pixels the disclosure trigger was hidden, the
control drawer remained expanded, and the MapLibre controls remained visible.

The MapLibre attribution control was verified separately after its provider
metadata loaded. It began as the compact info button with its attribution text
hidden. Activating that button expanded the original provider attribution, so
the presentation change does not remove or replace required attribution.

The onboarding tutorials were verified at 390 by 844 and 1200 by 900. The
signed-out `See how it works` flow exposed all four progress steps, kept the
mobile document at 390 pixels with no horizontal overflow, locked background
scrolling, and moved focus to Google sign in after `Create your Atlas`. An
in-browser empty revision-1 account fixture automatically opened its distinct
quick start, stored dismissal locally without reopening, remained available
through `Quick start guide`, and moved focus to place search after `Add your
first place`. Escape dismissal and the desktop 495 pixel dialog bounds were
also verified.

The marker refinement was verified with four Costa Rica cities and Paris. At
the 3.09 overview zoom, the four nearby destinations rendered as one accessible
count marker while Paris remained independent. Activating that cluster framed
the nearby destinations at zoom 8.5 and released all five fixture destinations
into standalone markers. Uvita's marker anchor differed from its projected
coordinate by 0.1 pixels horizontally and 0.04 pixels vertically. During the
timeline, the selected Monteverde marker remained independently addressable and
its anchor was within one pixel of its projection while the remaining nearby
destinations could stay grouped. The connection layer exposed its new dark
underlay and a three-pixel line at 0.94 opacity. The 390 pixel mobile fixture
retained the overview cluster, absolute marker positioning, and a 390 pixel
document width with no horizontal overflow.

The owner-created custom-pin path was verified separately with an authenticated
account fixture at 390 by 844. Entering `Canyonlands National Park`, sending a
map placement at longitude -109.88016 and latitude 38.32687, and continuing the
flow rendered the gold draggable marker and then the existing date and favorite
memory editor with the `Custom map pin` label. The pending payload retained the
normalized name and coordinates, the placement mode closed after continuing,
no authentication error appeared, and the root, body, and scroll widths all
remained 390 pixels.

## External references checked

- GeoNames export and license: https://www.geonames.org/export/
- GeoNames dump schema: https://download.geonames.org/export/dump/readme.txt
- Cloudflare Worker Routes: https://developers.cloudflare.com/workers/configuration/routing/routes/
- Cloudflare Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Cloudflare Durable Object class exports: https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/
- Cloudflare Workers Vitest integration: https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/
- Cloudflare Turnstile server-side validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Cloudflare R2 Worker API: https://developers.cloudflare.com/r2/api/workers/workers-api-usage/
- Cloudflare R2 bulk upload guidance: https://developers.cloudflare.com/r2/objects/upload-objects/
- Cloudflare Worker environments: https://developers.cloudflare.com/workers/wrangler/environments/
- Cloudflare Worker rate limiting: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Auth0 SPA SDK: https://auth0.github.io/auth0-spa-js/
- Auth0 SPA SDK source and current usage: https://github.com/auth0/auth0-spa-js
