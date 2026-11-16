---
id: my-atlas-private-beta-implementation
title: My Atlas Private Beta Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-16
updated: 2026-11-16
related:
  - my-atlas-private-beta
  - my-atlas-geography
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas
  - src/router/index.js
  - scripts/my-atlas
  - scripts/test-my-atlas-place-catalog.mjs
  - docs/architecture/my-atlas-geography.md
  - docs/proposals/my-atlas-private-beta.md
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run build
    - npx eslint "src/features/my-atlas/**/*.{js,mjs,vue}" src/router/index.js "scripts/my-atlas/**/*.mjs" scripts/test-my-atlas-place-catalog.mjs
    - Headless Chrome local proof at desktop and emulated 390px mobile widths
---

# My Atlas private beta implementation

The accepted target is a separate personal pushpin product. Phase 1 is
implemented locally. Nothing in this work provisions cloud resources, changes
DNS, exposes a production route, alters the curated Atlas, or changes the
media-upload Worker.

## Current state

| Area | State | Evidence or boundary |
| --- | --- | --- |
| Managed proposal | Implemented | Accepted V1.1 is under docs/proposals and the unmanaged V1 is archived with reciprocal supersession metadata. |
| Repository preflight | Verified | Vue 2.6, Vue Router 3 history mode, GitHub Pages fallback, curated Atlas coupling, map configuration, and upload-only Worker were inspected in source. |
| DNS and live route preflight | Partial, externally observed | Apex and www resolve to Cloudflare addresses. Root returned 200 through Cloudflare on 2026-11-16. Atlas and My Atlas returned a hydrated-app 404 status. api and share names did not resolve. Dashboard route and origin settings remain owner-console verification. |
| GeoNames rights | Verified against provider documentation | GeoNames publishes the dump under CC BY 4.0, requests attribution, permits commercial use, and describes cities500 as cities over 500 population or administrative seats. |
| Geographic proof | Implemented and test verified | Deterministic importer, stable IDs, append-preserving deprecation, normalized search, disambiguation, bounded draft pins, and a separate MapLibre proof exist. |
| Production route | Disabled | The My Atlas route exists only when VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF equals true. No repository deployment environment enables it. |
| Auth0 | Not implemented | No SPA application, tenant configuration, exact API audience, callback list, dependency, token validation, or owner identity exists in source. |
| Worker and Durable Objects | Not implemented | No My Atlas Worker, namespace, route, registry, user object, or catalog R2 binding is provisioned. |
| Terms, privacy, retention, and moderation | Owner decision required | Versions, retention durations, beta reset notice, operator response process, and cost stop limits must be approved before invited accounts. |

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
The proposed production pattern remains roamwithjustin.com/my-atlas/*, subject
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

### Auth0 and authorization

The repository has no Auth0 integration. Phase 2 requires the owner to create a
dedicated SPA and API resource, then provide non-secret configuration for:

- Auth0 tenant domain;
- SPA client ID;
- one exact My Atlas API audience identifier;
- local and staging callback, logout, and allowed web-origin URLs.

The implementation must use the Vue 2 compatible framework-neutral SPA SDK.
Protected requests must send an API-audience access token. An ID token must
never authorize Worker requests.

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
- [ ] Owner creates dedicated Auth0 SPA and API resource and supplies the exact
  audience and callback configuration.
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

- [ ] Add the isolated Worker, strict environment separation, and no production
  route.
- [ ] Verify API-audience Auth0 access tokens and reject ID tokens.
- [ ] Implement atomic registry claims and idempotent user provisioning.
- [ ] Implement private profile and revisioned pin CRUD, export, deletion, and
  reporting.
- [ ] Build the bounded catalog search API from indexed versioned artifacts.
- [ ] Pass concurrency, authorization, stale revision, privacy, and retry tests.

### Later gates

- [ ] Build sharing and profile-specific HTML only after Phase 2 passes.
- [ ] Invite users only after privacy, moderation, monitoring, reset, and export
  procedures are approved and tested.
- [ ] Keep ads, photos, Facebook, recaps, public search, and editorial content
  outside the beta.

## Verification commands

The current implementation is verified with:

~~~text
npm run my-atlas:test
npx eslint "src/features/my-atlas/**/*.{js,mjs,vue}" src/router/index.js "scripts/my-atlas/**/*.mjs" scripts/test-my-atlas-place-catalog.mjs
~~~

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

## External references checked

- GeoNames export and license: https://www.geonames.org/export/
- GeoNames dump schema: https://download.geonames.org/export/dump/readme.txt
- Cloudflare Worker Routes: https://developers.cloudflare.com/workers/configuration/routing/routes/
- Cloudflare Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Cloudflare R2 Worker API: https://developers.cloudflare.com/r2/api/workers/workers-api-usage/
- Auth0 SPA SDK: https://auth0.github.io/auth0-spa-js/
