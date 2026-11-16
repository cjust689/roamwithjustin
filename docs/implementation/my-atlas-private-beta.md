---
id: my-atlas-private-beta-implementation
title: My Atlas Private Beta Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-16
updated: 2026-11-16
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
    - Ephemeral-RSA tests accepted an exact-issuer and exact-audience access token and rejected ID-token audiences, wrong issuer or audience, expired, unsigned, HS256, wrong-type, and under-permissioned tokens
    - Local Wrangler GET /health returned 200 and protected GET /v1/auth/check without a token returned 401
    - npm run my-atlas:serve exposed the Vue proof, isolated Worker, and catalog search on loopback ports 8080, 8787, and 8788
    - Workers-runtime SQLite Durable Object tests passed one-use invitation concurrency, identity and handle uniqueness, idempotent provisioning, private default, owner isolation, and eviction persistence
    - Workers-runtime operator tests passed deterministic invitation retry, secret-safe storage, ID-based revocation, bounded pending pagination, exact-profile completion, lease enforcement, safe slot release, and ghost-activation prevention
    - Workers-runtime account tests passed concurrent revision control, idempotent pin retries, duplicate prevention, the 300-pin ceiling, pagination, update, deletion, export, and empty-profile privacy
    - Seventeen Workers-runtime tests passed, including private-by-default public lookup, safe-field projection, explicit publication, immediate unpublication, and batched catalog resolution
    - Versioned Worker catalog tests passed deterministic artifact generation, exact resolution, bounded search, runtime gzip decoding, revision mismatch rejection, and deprecated-record preservation
    - Full geonames-2026-11-16 local artifact built 256 resolution shards and 256 search shards for 237426 records
    - Local Wrangler POST /v1/beta/register without a token returned 401
    - New-user account-state regression test maps registration_not_found to HTTP 404
    - Staging Worker deployment 037496ad-400a-4dda-b54f-41470cd3aa17 contains the new-user account lookup correction
    - Owner reported successful one-use invitation issuance, localhost Turnstile completion, redemption, and private account entry
---

# My Atlas private beta implementation

The accepted target is a separate personal pushpin product. Phase 1, the
bounded Phase 2A authentication boundary, the Phase 2B local registration,
operator recovery, profile, and pin-state foundations, and a Phase 2C local
sharing slice are implemented locally.
Nothing in this work provisions cloud resources, changes DNS, exposes a
production route, alters the curated Atlas, or changes the media-upload Worker.

## Current state

| Area                                      | State                                          | Evidence or boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Managed proposal                          | Implemented                                    | Accepted V1.1 is under docs/proposals and the unmanaged V1 is archived with reciprocal supersession metadata.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Repository preflight                      | Verified                                       | Vue 2.6, Vue Router 3 history mode, GitHub Pages fallback, curated Atlas coupling, map configuration, and upload-only Worker were inspected in source.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| DNS and live route preflight              | Partial, externally observed                   | Apex and www resolve to Cloudflare addresses. Root returned 200 through Cloudflare on 2026-11-16. Atlas and My Atlas returned a hydrated-app 404 status. api and share names did not resolve. Dashboard route and origin settings remain owner-console verification.                                                                                                                                                                                                                                                                                                                       |
| GeoNames rights                           | Verified against provider documentation        | GeoNames publishes the dump under CC BY 4.0, requests attribution, permits commercial use, and describes cities500 as cities over 500 population or administrative seats.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Geographic proof                          | Implemented and test verified                  | Deterministic importer, stable IDs, append-preserving deprecation, normalized search, disambiguation, bounded draft pins, and a separate MapLibre proof exist. A loopback-only development search server lets the browser query the ignored full cities500 source without bundling or committing it.                                                                                                                                                                                                                                                                                          |
| Versioned Worker catalog                  | Implemented and staging verified               | The full catalog compiles into immutable gzip resolution and query-prefix shards plus a current manifest. The owner verified all 512 immutable `geonames-2026-11-16` shards with rclone before uploading the manifest last. Live staging health and R2-backed searches for Uvita and Salt Lake City returned 200 with that revision. The complete remote inventory remains owner-verified rather than independently enumerated by the repository environment.                                                                                                                        |
| Production route                          | Disabled                                       | The My Atlas route exists only when VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF equals true. No repository deployment environment enables it.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Auth0 browser client                      | Implemented and owner verified locally         | The owner supplied the public tenant domain, SPA client ID, and exact API audience. The Vue 2 client implements Google redirect login, callback completion, logout, and audience-scoped access-token acquisition. Auth0 accepted noninteractive authorization requests for the local and production callbacks and routed the configured connection to Google. The owner reported successful sign in, callback return, identity display, and token acquisition. The updated button now submits that token to the local Worker; its first owner-token round trip remains owner verification. |
| Worker authentication boundary            | Phase 2A implemented and staging verified      | A separate Worker verifies RS256 signatures through Auth0 JWKS, exact issuer and API audience, time claims, token type, and `read:my-atlas`. The staging `workers.dev` deployment returned Phase 2C health, rejected an unauthenticated protected request with 401, allowed the exact production origin, and rejected an unrelated origin. The owner also verified a genuine Auth0 API-audience access token through the live Worker. The default environment remains undeployed with no production route.                                                                            |
| Registration Durable Objects and API      | Phase 2B staging redemption owner verified     | One SQLite-backed registry class atomically reserves invitation, qualified identity, handle and idempotency claims. One SQLite-backed user class initializes a private revision-1 profile. The authenticated browser form requires a one-use invitation, bounded identity fields, explicit staging acceptance, and a real Turnstile token. The first live browser lookup exposed and now has a deployed correction for the never-registered identity response. The owner then reported successful invitation redemption and private account entry. Persisted pin behavior remains to be verified.                                                                                           |
| Operator invitation and recovery workflow | Implemented and staging issue owner verified   | An `admin:my-atlas` API issues recoverably idempotent high-entropy invitations, returns the code only through the protected issue response, revokes by nonsecret ID, paginates safe pending summaries, completes matching profiles, and releases only aged uninitialized registrations. Per-user abandonment tombstones block late ghost activation. A dedicated M2M grant has `read:my-atlas` and `admin:my-atlas`; the owner reported the first successful one-use invitation response without exposing its code.                                                                                                            |
| Profile, pin CRUD, and export              | Foundation implemented and test verified       | Owner lookup is derived from the verified qualified identity. Strong ETags, `If-Match`, idempotency keys, display and visibility changes, canonical pin create/update/delete, duplicate rejection, 300-pin ceiling, bounded pagination, JSON/CSV export, owner browser bootstrap, and automatic privacy for an empty profile are tested. The browser now persists pins when an active account exists. Pin writes fail closed because the authoritative cloud catalog is not yet populated. Handle change, deletion, and reporting remain.                                                               |
| Public Atlas sharing                      | API staging boundary verified                  | Explicit publication exposes `/my-atlas/{handle}` and a signed-out safe API containing only display name, handle, canonical place summaries, and visited years. Live staging returned the generic no-store 404 for an absent handle. Local tests verify private-by-default publication and immediate unpublication. The owner view publishes, unpublishes, and copies the link. Profile-specific server HTML, Open Graph tags, a real public profile, live rate-limit exhaustion, and browser staging verification remain.                                                                    |
| Terms, privacy, retention, and moderation | Staging defaults approved; public beta blocked | Staging uses technical-only policy labels, one use per invitation, a 24-hour maximum invitation lifetime, and a 15-minute abandoned-registration lease. These values permit controlled owner testing and do not constitute final terms or privacy approval. Retention durations, beta reset notice, operator response process, and cost stop limits must be approved before invited accounts.                                                                                                                                        |

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
and dry-run verified, but no isolated R2 bucket or object has been provisioned.

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
entry. Persisted pins remain to be verified. Final policy approval and
registration or operator rate limiting remain before external users can be
invited.

### Cost and operational gate

Cloudflare's 2026-11-13 Durable Objects pricing documentation lists SQLite
Durable Objects on Free and Paid plans. The Free plan lists 100,000 requests
and 13,000 GB-seconds per day, with operations failing after a free limit is
exceeded. The owner still needs to choose the account plan, monthly stop
amount, alerts, and initial invite ceiling. No cost-bearing resource was
created.

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
- [x] Search Uvita, Paris, and Paris Texas with disambiguated labels.
- [x] Render selected catalog coordinates with an isolated MapLibre component
      using the unchanged configured map style and terrain.
- [x] Reject arbitrary coordinates, unsupported IDs, duplicate pins,
      deprecated new selections, and pins over the 300 item cap.
- [x] Preserve removed records as resolvable deprecated identities.
- [x] Keep the proof disabled in the default production route table.

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
- [x] Implement and Workers-runtime test the safe signed-out public Atlas
      projection, indistinguishable private or absent 404, no-store response,
      and noindex client viewer.
- [ ] Implement handle-change coordination, permanent account deletion, abuse
      reporting, and their approved retention and moderation contracts.
- [x] Build and Workers-runtime test the bounded catalog search and exact
      resolution API from deterministic indexed versioned artifacts.
- [x] Add and test weighted public-read rate limiting in the Worker and declare
      its staging binding.
- [x] Verify the owner-reported isolated staging bucket publication through
      successful live manifest and shard reads for Uvita and Salt Lake City.
      The owner separately verified all 512 release objects with rclone before
      uploading the manifest last.
- [ ] Pass concurrency, authorization, stale revision, privacy, and retry tests.

### Staging cloud handoff

No following item is complete merely because its binding exists in the tracked
configuration:

1. Confirm the intended Cloudflare account with `npx wrangler whoami`, then set
   the plan, budget alerts, stop threshold, and initial invite ceiling.
2. Create the private `roamwithjustin-my-atlas-catalog-staging` R2 bucket. Do
   not enable a public bucket URL and do not reuse the editorial media bucket.
3. Build the ignored artifact with `npm run my-atlas:catalog:worker`. Bulk upload
   every object under `catalog/releases/{revision}` first, compare the remote
   object inventory, and upload `catalog/current.json` only after verification.
4. The owner approved staging-only technical labels `staging-beta-1` and
   `staging-privacy-1`, one use per invitation, a 24-hour invitation lifetime,
   and a 15-minute pending-registration lease. Replace these with approved
   policy versions before inviting any external beta user.
5. Install `INVITE_HASH_PEPPER`, `INVITE_GENERATION_SECRET`, and
   `TURNSTILE_SECRET_KEY` as staging secrets. Never add them to Wrangler vars or
   Git.
6. Grant `admin:my-atlas` only to the owner in Auth0 and confirm the staging
   frontend origin, callback, logout URL, and Turnstile hostname.
7. Re-run `npm run my-atlas:test`,
   `npm run my-atlas:worker:check:staging`, and `npm run build`. Only then run an
   explicit `wrangler deploy --env staging` after reviewing the Durable Object
   reconciliation output.
8. Verify health, Uvita and Salt Lake City search, genuine-token auth, private
   profile 404, public handle read, rate-limit 429, immediate unpublication, and
   direct mobile link loading. Do not add an apex production route yet.

### Later gates

- [ ] Build profile-specific server HTML, Open Graph tags, and correct crawler
      status behavior only after the secure backend and staging tests pass.
- [ ] Invite users only after privacy, moderation, monitoring, reset, and export
      procedures are approved and tested.
- [ ] Keep ads, photos, Facebook, recaps, public people discovery, and editorial
      content outside the beta.

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
