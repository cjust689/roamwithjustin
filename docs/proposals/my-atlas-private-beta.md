---
id: my-atlas-private-beta
title: My Atlas Private Beta V1.1 Architecture
kind: proposal
status: approved
implementation_state: partial
created: 2026-11-16
updated: 2026-11-16
related:
  - my-atlas-geography
  - my-atlas-private-beta-implementation
  - docs-index
supersedes:
  - my-atlas-private-beta-v1
superseded_by: []
code_paths:
  - src/features/my-atlas
  - scripts/my-atlas
  - scripts/test-my-atlas-place-catalog.mjs
verification:
  state: unverified
  evidence: []
---

# My Atlas: Private Beta V1.1 - Lean Implementation Proposal

> **Adoption status:** This is the accepted product and architecture target.
> Phase 1 is implemented as an environment-gated local geographic proof. The
> secure backend, authentication, sharing, and invited beta remain unimplemented
> and are tracked in the linked active implementation document.

> **Implementation handoff:** This document supersedes the earlier My Atlas beta V1 proposal at the product-design level. Audit the actual repository and external service configuration before each implementation phase. Do not alter the curated Roam With Justin Atlas or existing media-upload Worker. This is the accepted target, not a claim that every phase already exists.
>
> **Documentation promotion:** This accepted target now follows the managed repository schema. The previously unmanaged V1 was adopted under the stable historical ID `my-atlas-private-beta-v1`, archived, and linked reciprocally through `supersedes` metadata.

## 0. Product decision (read first)

**My Atlas** is a lightweight, shareable digital pushpin map. An invited traveler signs in, searches for countries/cities, marks places they have visited, optionally records visited year(s), and shares a public map. It is **not** another Journey authoring system and does not inherit the owner's Stories, Experiences, media pipeline, or business sponsorship controls.

**V1 beta is deliberately minimal:** Google login, invitation redemption, personal profile, country/city search, pin CRUD, explicitly published share link, export, deletion, moderation, and beta reset notices. No end-user image uploads, named attractions, Facebook login, public people search, annual recap art, ad serving, Workers KV, social feed, or per-pin pages.

**Important principles:**

1. **MapLibre renders**; existing **MapTiler tiles/terrain** provide appearance; an **independently licensed GeoNames-derived catalog** supplies persistent geographic identity. Do not treat MapTiler search feature IDs or MapTiler geocoding result coordinates as the canonical pin dataset.
2. **One Cloudflare Worker API** plus a **single registration-registry Durable Object** and **one per-user Durable Object** are sufficient for this beta. SQLite-backed DO storage can be accessed through the DO key/value API; no conventional SQL data-model redesign is required.
3. **GitHub Pages continues hosting the Vue application.** The production Cloudflare Worker Route uses a supported wildcard path such as `roamwithjustin.com/my-atlas/*`, **not** a named `{handle}` parameter. The Worker must recognize only a valid single-segment profile handle and pass unrelated/reserved subroutes through to GitHub Pages. Keep staging until tested.
4. **Privacy before growth:** beta profiles begin private; only an explicit user action publishes a profile. No public KV cache or CDN caching of dynamic profile data; hidden, suspended and deleted profiles must stop being served from authoritative state immediately. Geographic catalog R2 objects, if used, live in a separate dedicated bucket, never the curated media bucket.
5. **Ads are not part of beta.** Reserve a future profile ad region but make no AdSense requests until approval, publisher-content/moderation review, and a separately enabled feature flag. Ad fill or impression count can never be guaranteed per visit.
6. **V2 media remains four images per profile max:** one cover and three favorites, not attached to individual pins; optional yearly-photo rotation is future work.

## 1. Beta definition and user experience

### Creator (invited beta tester)

1. Open `/my-atlas` or a friend's public shared map.
2. Read the visible **Private Beta** notice: profile/pins may be reset; data is not guaranteed permanent; export available; no promise of future preservation.
3. Enter an invitation code (browser performs **format-only** validation; no unauthenticated code-check endpoint).
4. Authenticate through **Auth0 Universal Login -> Google**. An Auth0 identity existing by itself is **not** My Atlas membership; the Worker must separately approve and redeem a valid code before any account/pin write.
5. Choose a non-sensitive display name and unique public handle; accept versioned beta terms and privacy notice. Account begins **private**, with an empty map.
6. Search country/city, choose an unambiguous match, pin it, and optionally add one or more visit years. Repeat, edit years, remove pins.
7. Use **Publish My Atlas** explicitly (enabled after at least one pin) to create a public share link. A **Make Private** action revokes public access immediately. Public viewer access never requires login or invitation.
8. Export their pins as JSON/CSV and delete their account if desired. Old published handles must not be immediately reassigned.

### Viewer (no account required)

- Open `/my-atlas/{handle}`; see a beautiful, lightweight map, display name, visited-place totals, and a prominent **Create your own Atlas** invitation CTA. They can view but cannot modify pins.
- Share using Web Share API, copy-link fallback, and generic Open Graph preview. No per-pin article, story, gallery, or advertisement.
- See a friendly invitation-only sign-up screen if they click CTA and lack a beta invitation. Do not expose an open registration bypass.

### Owner (operator)

- Generate/revoke invitation codes; view operational metrics; suspend/hide abusive profiles; respond to profile reports; export and delete user data; perform announced beta resets with an export window.
- No requirement to build a full administrative dashboard initially: protected CLI and narrowly scoped admin API are acceptable.

## 2. Minimal system architecture

```text
  roamwithjustin.com (existing domain)
  Vue 2.6 + Vue Router 3 / GitHub Pages
     |                         |
     | curated Atlas           | independent My Atlas component
     | unchanged               | MapLibre + existing MapTiler basemap/terrain
     |                         | search results from OUR GeoNames catalog
     |                         |
     +-------------------------+-------------------------+
                                                       |
                                     HTTPS API / Auth0 API access token
                                                       v
                                api.roamwithjustin.com/v1/*
                                       Cloudflare Worker
                                              |
               +------------------------------+-----------------------+
               |                              |                       |
         Auth0 ACCESS JWT verify       Registry DO              User DO
         Google initially        ONE registration owner      One per user
         issuer/JWKS/API audience  invites + identity + handle profile + pins
               |                pending/active/tombstones    revisioned CRUD
               |                              |                       |
               |                              +-----------+-----------+
               |                                          |
               +------------------------------------------+
                                                       |
                                           GeoNames catalog/search
                                      separate MY_ATLAS_CATALOG_R2
                                        bucket or static shards
                                            (NO MapTiler IDs)

   GitHub Pages remains the SPA origin.
   Actual Cloudflare Worker Route: roamwithjustin.com/my-atlas/*
   Worker parses /my-atlas/{handle} as an APPLICATION path, not a route pattern.
   Valid public handles get HTTP 200 HTML with per-profile OG tags and live DO visibility.
   Reserved and unrelated paths pass through to the GitHub Pages origin.

   Workers KV: NOT in beta.  New R2 user uploads: NOT in beta.
   AdSense: OFF in beta.     Existing upload Worker: UNCHANGED.
```

**Cloudflare domain caveat:** Cloudflare Worker Routes require a matching DNS record and the request to pass through Cloudflare's proxy. Verify DNS/proxy/TLS and the existing GitHub Pages custom-domain configuration before enabling a route. If routing on the apex site is not feasible without disturbing the existing application, use a staging `share.*` Worker hostname, and only migrate the public URL after the integration is tested.

**Cloudflare scaling caveat:** A single global registration DO is intentionally simple for a small invite-only beta. It becomes a contention point if registrations/handle lookups explode. Reevaluate indexing and sharding as real traffic approaches large scale, **without** sacrificing invitation uniqueness or privacy revocation. Do not design an imaginary 100,000-user backend before testing actual adoption.

## 3. Permanent geographic identity: MapLibre + MapTiler + GeoNames

### Separation of responsibilities

| Layer | Use | Persistence rule |
|---|---|---|
| MapLibre | Browser renderer, markers, clustering, interactions | No geographic identity or search authority |
| Existing MapTiler | Basemap and terrain tile delivery; existing cartographic style | Keep tile use within MapTiler terms; **do not derive pin identity from search** |
| Our GeoNames catalog | Search country and city, resolve names/aliases, hierarchy, representative coordinates | Downloaded and transformed under GeoNames CC BY 4.0; persist our canonical entries |
| User Durable Object | Saved user's selected catalog IDs and optional visited years | Authoritative user state; reads/writes under authenticated owner authorization |

### Canonical IDs

- Countries: `iso-country:CR` or `iso-country:HR` (explicit territory/country convention).
- Cities: `geonames:<numeric-geonameid>` (for example, the actual ID resolved by the imported catalog, **not a fabricated ID**).
- Preserve GeoNames `geonameid`, name/alternate names, feature code, ISO country, administrative region codes/names, representative WGS84 lat/lng, license/source, catalog revision, and deprecation status.
- Catalog import is **append-preserving by ID**: never delete or reuse an ID issued in any previous published catalog revision. Renames update canonical metadata in-place; entries absent from a subsequent source snapshot remain resolvable as `deprecated: true` catalog records. Do not silently reassign a pin ID. Genuine ID merges/corrections require an explicit audited migration; each pin continues to store only `placeId`, not copied or frozen location metadata.
- Users select entries from the catalog, never arbitrary coordinate pairs, addresses, GPS tracks or MapTiler-derived IDs.

### Source ingest and search design

1. Create a reproducible offline catalog import script from `countryInfo.txt`, GeoNames city extracts, `admin1CodesASCII.txt`, and other license-appropriate reference files. Record source dates and hashes, import settings and attribution version. An import must compare against the last released catalog, retain all previous IDs as current or deprecated, and fail on unexpected ID reassignments.
2. Use `cities500.zip` or a comparably broad set to get worldwide coverage; **do not limit V1 to `cities15000` or `cities5000`** without evaluating small destinations. Supplement with selected populated places from `allCountries.zip` where needed. The Uvita, Costa Rica example must be covered or clearly reported as a catalog-coverage gap during testing.
3. Filter primarily populated-place class `P` for city/locality selection and a normalized country set for countries; exclude dangerous/noisy categories (addresses, streets, private residences, non-populated entities, arbitrary POIs).
4. Build a compact normalized search index with sensible accent/alias handling and geographic disambiguation (e.g., `Paris, France` vs `Paris, Texas, United States`). Exact or strong prefix matches first; rank significant/populated matches reasonably without hiding small communities.
5. Serve search from **our own** catalog, not MapTiler geocoding or the public OpenStreetMap Nominatim API. Keep the catalog out of unnecessarily large initial browser bundles: package a modest static lookup/index if proven small, or use versioned partitioned R2 data and a Worker search endpoint. Search should normally omit deprecated entries, while resolving an already pinned deprecated ID must remain supported. Select implementation after measuring generated catalog size and query latency.
6. Search UI: minimum query length, debounce, bounded result list, keyboard/mobile accessibility and clear country/region labels. Output includes canonical `placeId`; browser sends ID and visit years, and server resolves/validates the selected identity.
7. Display GeoNames attribution in My Atlas and in relevant data/export documentation. Maintain existing MapTiler attribution. Document exactly which elements derive from which licensed provider.
8. For later country coloring, verify boundary dataset/license separately; a country centroid marker is sufficient for beta. No user-supplied coordinates.

**Source of truth:** Downloaded GeoNames catalog assets (or generated index) can be versioned as machine-owned project/build data or as versioned Cloudflare R2 objects. Country/city identity is independent of tile rendering. Never substitute a map-tile feature ID for a catalog ID.

**R2 isolation if catalog shards are used:** Create a distinct catalog bucket (with staging/production separation) and a dedicated My Atlas Worker binding named `MY_ATLAS_CATALOG_R2`. Never point it at the curated editorial media bucket, and do not share media-upload Worker bindings, upload credentials, or access secrets. The catalog API must perform **GET/read operations only** and accept only allowlisted/versioned catalog keys. **Cloudflare's direct R2 Worker bucket binding is not itself a read-only permission boundary** (it exposes write operations); enforce read-only usage in Worker code, deployment review, and separate import/deployment responsibilities. If binding-level permission isolation is a hard requirement, evaluate a separately scoped read-only R2 API credential/access mechanism rather than assuming Wrangler offers a read-only bucket binding.

### Pin semantics and annual counting

- One pin per canonical place per user, with `visitedYears: []` or `[2025, 2026]`, rather than repeated identical pins.
- `visitedYears: []` means visited, year unknown; it participates in lifetime stats but not a year-specific recap.
- A pinned city implies the relevant country for aggregate country totals, avoiding double counting a simultaneously pinned country.
- A country-only pin must not fabricate city visits.
- Future annual summaries must be labeled **"destinations recorded for this year"**, not **"new destinations"**, unless first-visit semantics exist.
- Fix a documented country/territory denominator before advertising a percentage-of-world metric. No claims that travel records are complete or verified.

## 4. Authentication and invitations

### Managed identity

- **Auth0 Universal Login + Google connection only for beta.** Auth0's framework-neutral `@auth0/auth0-spa-js` (PKCE) is appropriate for the existing **Vue 2.6** codebase; do not install the Vue 3-only `@auth0/auth0-vue` plugin. Facebook, Apple and other providers are deferred.
- Create a dedicated Auth0 **API resource identifier / audience** for the protected backend, e.g. `https://api.roamwithjustin.com` if that exact string is configured in Auth0. The URL hostname and the Auth0 API identifier are not automatically equivalent: choose one canonical identifier, configure it in the Auth0 API settings and SPA authorization request, and verify its exact value on every protected Worker request.
- The SPA calls `getTokenSilently` (or the supported SDK equivalent) for an **access token issued for that API audience** and sends it as `Authorization: Bearer <access_token>` on protected API calls. **ID tokens are for client-side presentation of signed-in identity only; they MUST NOT authorize Worker API access**, nor should a generic access token without the configured API audience be accepted.
- Create a separate **web SPA Auth0 application**. Do not reuse the desktop Google OAuth client configured for the Sheets/Drive editorial publishing workflow.
- Confirm authorized callback, logout and web-origin URLs for `https://roamwithjustin.com`, staging and callback routes. Prefer normal redirect with state/nonce/PKCE; verify mobile in-app browsers.
- Worker validates the Auth0 **API access token** signature and claims: expected issuer, JWKS/key rotation, exact configured API audience, expiration, token algorithm, and relevant scopes/permissions (if used). Reject ID tokens, tokens for a different audience, expired tokens, and unsigned/untrusted tokens. Never trust client-supplied `userId`, email, or `isAdmin` flags. Derive the account binding from the verified token's issuer and subject.
- Persist qualified identity bindings (`issuer` + `subject`, optionally provider/connection), not a singular unqualified identity field; no unsafe auto-merging based only on email.
- **A social account is not a beta account** until server-side invite redemption has completed.

### Single registration registry DO

Use **one logical beta-registration registry DO** to atomically coordinate:

1. Hash-based invite validation and max-use claim (store keyed digest of secret, not plaintext).
2. Provider-qualified identity -> immutable internal `userId` mapping.
3. Case-normalized handle -> immutable `userId` mapping, reserved handles and retired/tombstoned handles.
4. Pending/active registration state and idempotency keys.
5. Handle changes and deletion claims, with safe retry semantics.

**Do not split these claims across invitation, identity and handle DOs for beta.** They cannot participate in a globally atomic cross-object transaction. Provisioning a user's separate DO also cannot be part of that registry transaction, so implement an explicit **idempotent saga:**

```text
Authenticated POST /beta/register
 -> RegistryDO: validate invite + unique identity + handle; reserve in pending state
 -> UserDO(userId): initialize only if absent; safe to retry
 -> RegistryDO: finalize active; invite counted exactly once
 -> return profile + handle
```

On failures, retry safely using a stable registration operation key; reclaim abandoned pending reservations only after a documented lease/timeout and verified nonactivation. Include reconciler/repair behavior and never allow one invite to be consumed by two users under concurrent requests. To limit brute force, expose **no public `/invites/check` endpoint** and do format-only pre-validation in browser. Admin-generated codes should be high entropy and short-lived when appropriate.

Use Turnstile server-side verification for redemption/high-risk actions, strict rate limits and generic error messages. CORS/origin restrictions supplement, but do not replace, token verification.

## 5. Durable Object state, privacy and concurrency

### Ownership and storage

- **Registration registry DO:** registration/invite/handle mappings + tombstones; single strongly consistent owner of uniqueness.
- **Per-user DO:** versioned profile, visited-place pins and owner-state transitions. Serve public data directly from this DO after resolving handle; no KV snapshots, cross-region public HTML cache, or eventual-consistency authorization window.
- Use SQLite-backed DO with DO key/value API for beta (not an instruction to create SQL tables).
- Never store raw OAuth tokens, Auth0 ID/access tokens, raw invitations, provider secrets, full IP/device history, or unrestricted user prose in public state. Keep tokens out of URLs, console logs, telemetry and exported profile data.

### Illustrative profile and pin contracts

```json
{
  "schemaVersion": 1,
  "userId": "usr-c7eab2",
  "identities": [{"issuer": "https://example-auth0-tenant/", "subject": "google-oauth2|opaque"}],
  "handle": "traveler-example",
  "displayName": "Traveler Example",
  "public": false,
  "status": "active",
  "acceptedTermsVersion": "beta-1",
  "acceptedPrivacyVersion": "privacy-1",
  "acceptedAt": "2026-11-16T15:00:00Z",
  "revision": 1
}
```

```json
{
  "pinId": "pin-f3b8c1",
  "placeId": "iso-country:CR",
  "visitedYears": [2026],
  "createdAt": "2026-11-16T15:15:00Z",
  "updatedAt": "2026-11-16T15:15:00Z",
  "revision": 1
}
```

`placeId` always references the catalog; coordinates/labels are resolved from the authoritative catalog record for display. Catalog releases **never remove previously issued IDs**: when a source place disappears, keep a resolvable `deprecated` catalog record with its last known metadata, excluded from new search selections. Correct genuine duplicates via explicit reviewed migration. User pins store only the stable ID and visited years, not frozen location metadata.

### Data behavior and boundaries

- Profile created as `public: false`. Require user-confirmed **Publish My Atlas** after at least one pin; allow immediate private/suspend; default new/empty/disabled profiles to private.
- Public read must check owner profile status at the authoritative user DO on every request; return 404 for private/suspended/unknown, 410 for deleted **tombstoned handles**; never serve old data from stale KV or edge cache. No profile enumeration endpoint.
- Cache-control for dynamic public JSON and HTML: `private, no-store` (or similarly verified no-cache behavior at every relevant layer). Even with immediate origin revocation, external social platforms may retain previously generated previews; disclose that limitation in privacy information.
- Allow profile rename, handle update, privacy toggle, pin add/edit/remove, user export (JSON + optional CSV), and permanent account deletion. Owners control only their own data; admin moderation separately authorized.
- Use `revision`/ETag `If-Match` (or equivalent) for all profile/pin edits to prevent lost updates; return 409/412 with refreshed state on conflicts.
- Enforce **300 distinct destination pins per user** for beta (configurable setting; reject above cap clearly) and small display-name/handle sizes; no arbitrary biographies, free-form URLs or HTML at beta launch.
- Old public handles are reserved/tombstoned rather than immediately recyclable, so previously shared URLs cannot be taken over by another account.
- Retention/reset: beta data may be wiped only through an explicit administrator workflow, with advance notice when possible and export window; user-requested deletion remains available independently. Specify what identities/handles remain reserved after a reset and document minimal security records and retention durations.

### Report abuse and moderation

Even without photos, display names and handles can be abusive. Offer a **Report profile** action, with throttled report endpoint and a protected admin suspend/hide action. Do not serve ads on UGC in beta. Report data must not be a public browsing surface.

## 6. API outline (naming illustrative)

**Public, no login:**

| Route | Use |
|---|---|
| `GET /v1/places/search?q=...` | Search owned, persistent GeoNames-derived catalog; bounded results/quotas |
| `GET /v1/places/{placeId}` | Resolve canonical catalog item and attribution |
| `GET /v1/public/atlas/{handle}` | Only if DO status is public and active; sanitized map/pins; no-store |
| `POST /v1/reports` | Abuse report, rate limited and anti-spam protected |

**Authenticated owner:**

| Route | Use |
|---|---|
| `POST /v1/beta/register` | JWT + invite + Turnstile; registry claim and idempotent provisioning |
| `GET /v1/me` | Own profile and editor data |
| `PATCH /v1/me` | Display name/handle; visibility Publish or Make Private with revision |
| `DELETE /v1/me` | Confirmed deletion/tombstone |
| `GET /v1/me/pins` | Paginated pins and catalog-reconciled metadata |
| `POST /v1/me/pins` | Canonical place ID, optional visited years; idempotent dedupe |
| `PATCH /v1/me/pins/{pinId}` | Correct years, optionally replace catalog place; revision required |
| `DELETE /v1/me/pins/{pinId}` | Delete pin; revision required |
| `GET /v1/me/export` | JSON or CSV with place IDs, metadata, years, version |

**Restricted admin (CLI or protected API):** issue/revoke invitations, inspect pending provisioning/reconcile, moderate/reinstate, export/delete, initiate announced reset and audit operations. No public invitation-validity endpoint. Existing upload API remains separate and unaffected.

All mutations: correctly audience-scoped Auth0 **API access token** and server-side authorization (never an ID token), CSRF considerations if sessions use cookies, strict schema/length validation, request size caps, rate limits, idempotency keys for repeated requests, secret-safe logs, CORS restricted to known frontends, and consistent error formats.

## 7. Public share URL and social metadata

Desired URL: `https://roamwithjustin.com/my-atlas/{handle}`.

**Problem:** GitHub Pages' `404.html` SPA fallback can hydrate client-side routes but may return status 404 and generic HTML to social crawlers. An ordinary Vue route cannot reliably create profile-specific OG tags for link unfurling.

**Beta approach:**

1. Verify the apex domain routes through Cloudflare; first deploy a staging Worker route/hostname without changing existing production routes.
2. Use the supported Cloudflare zone Worker Route **`roamwithjustin.com/my-atlas/*`** (explicit wildcard; do **not** attempt `roamwithjustin.com/my-atlas/{handle}`). A Worker Route is not a parameterized router. Inspect the pathname in Worker code. Treat exactly `/my-atlas/<valid-single-segment-handle>` as a potential public profile (with documented handle syntax, case normalization, and reserved-name list). `/my-atlas` (which can remain on GitHub Pages without matching this wildcard), `/my-atlas/`, `/my-atlas/login`, `/my-atlas/callback`, `/my-atlas/settings`, `/my-atlas/edit`, nested paths, and other reserved/unrelated paths are **not profile handles**; pass them through to the existing GitHub Pages origin/application unchanged. Do not intercept `/atlas` or site assets. Use a route-origin passthrough such as `fetch(request)` only after verifying Cloudflare origin behavior and preventing fetch loops; do not fetch the same public Worker route recursively. Test both apex and any `www` canonicalization separately.
3. Resolve handle through the registry, check authoritative user DO visibility, then return **HTTP 200** HTML with escaped, user-specific title/description/Open Graph tags and a static generic OG image. Render a Vue app shell (sourced safely from existing GitHub Pages build/origin or a versioned static shell) so normal browser navigation hydrates My Atlas.
4. If private/suspended/unknown, return the correct 404 with generic non-personal metadata. For deleted tombstoned handles, return 410. Never return private profile details to a crawler.
5. Set `noindex` on beta profiles, including `X-Robots-Tag: noindex`, without blocking share-preview bots. Public viewing and search-engine indexing are distinct opt-ins. Confirm behavior with real social unfurlers.
6. Validate direct refresh, browser navigation, same-site links, external Instagram/in-app browsers, HTTP status, back/forward and no malformed asset paths. Protect against Worker origin fetch loops. Do not cache dynamic HTML or public profile payloads where stale private data could be exposed.

**Honesty limit:** making a profile private can prevent new origin reads, but social networks and recipients may retain previously captured previews/screenshots. Do not promise retroactive deletion from third-party caches.

## 8. Performance, quotas, analytics, costs

- Beta target: small invited group, not an assumed 100,000-user launch. Define and instrument latency, API search requests, DO operations, public profile reads, map tile requests, auth requests, invitation failure counts and error rates.
- Bound public search to 2-3 characters minimum, debounce, <= 10 results per request, sensible server rate limits and optional anti-abuse measures; refine with actual behavior.
- Marker clustering and country aggregation should handle 300 pins smoothly on mobile; no narrative/gallery payload per pin.
- Model costs separately: **MapTiler page/map loads and tiles**, Cloudflare Worker requests, DO invocation/storage, Auth0 active users, and catalog storage/requests. A small amount of pin data is not automatically the largest cost.
- Public pageview, profile share, sign-in completion, first pin, public publish, return visits and destination-region engagement may be measured in aggregate with appropriate privacy disclosures.
- Do not share individual users' travel pins or exportable trip histories with advertisers. Aggregate only above an approved privacy threshold. A `visited` pin reflects **history**, not necessarily intent to book travel.
- Implement account-level stop switches, Worker rate limits and spending alerts before beta invites go out.

## 9. Advertising and future growth - deliberately out of beta

**Beta:** No AdSense script/slot/requests anywhere inside My Atlas. This is intentional, even though eventual monetization is a product goal: AdSense account approval, the quality of sparse profile pages, user-generated-content policy and moderation must be reviewed first.

**Future ad experiment (separate approval / Phase 3):** At most **one responsive ad request attempt** per eligible public profile view when configured and policy-compliant, in a designated clearly separate area, never attached to a pin, popover, editor, login page or invitation gate. Actual matched/served/viewable impressions and revenue are not guaranteed and must be measured independently from profile pageviews.

Do not use ad blockers, artificial reloads or auto-refresh to force impressions. Preserve ordinary navigation/share experience. Defer sponsored hotels/tours to separately labeled discovery placements, not user-supplied visited pins; sell measured contextual engagement and aggregate audience segments, never personal histories.

## 10. Roadmap, not V1 implementation

### Post-beta yearly recap

- Keep `visitedYears` from day one, but defer recap graphics and annual campaigns.
- Later deliver text/map-based recap with **"destinations recorded for [year]"**, distinct countries/cities, and a shareable 9:16 visual once data retention is stable.
- Lifetime traveled, first-time visited and recorded-for-year are different concepts. Do not advertise "new countries" without recording first visit semantics.
- Beta data resets invalidate lifetime/annual claims: communicate clearly; export remains available.

### V2 images: strictly four per profile

- One **cover photo** and **three favorite travel images** across the whole profile, not per pin, with no required location association. Favorites can be swapped annually.
- Keep user-media uploads separate from existing editorial R2 bucket/prefix. Enforce quota and bytes/dimensions server-side, strip EXIF/GPS, resize/re-encode, handle orientation, use short-lived upload permissions, remove replaced/orphan objects, and moderate rights/content.
- Illustrative optimized targets: cover <= 200 KB, each favorite <= 150 KB where visually acceptable. These are test targets, not guaranteed limits for every source photo; choose dimensions/encoding empirically.
- Before adding image-rich annual recaps, decide whether older recaps show current favorites, stored historical versions, or immutable pre-rendered snapshots. Define retention/deletion rights.
- Potential future providers: Facebook/Apple auth, attractions under licensed provider, opt-in user directory, sponsor discovery, and read caching **only with correct privacy revocation**.

## 11. Repository integration for coding agent

Audit actual repo and configuration before writing code. Prior review reported Vue **2.6**, Vue Router **3** in history mode, an existing `AtlasMap.vue` tied to the curated Atlas, GitHub Pages build using `404.html` fallback, an R2-only media-upload Worker, and current MapTiler/MapLibre integrations. Reverify rather than assuming those facts remain current.

**Implementation boundaries:**

- New feature directory (suggested): `src/features/my-atlas/` with its **own** MapLibre map component and auth/editor/viewer pages. Share design tokens, map configuration and minimal visual primitives only; do not reuse the owner Atlas's domain registry/state mutations.
- New independent Worker (suggested): `workers/my-atlas/` with `api`, `auth`, `registry`, `user`, `places`, `sharing`, and `admin`. Own Wrangler environments and DO bindings. Do not broaden existing `workers/media-upload/` privileges or expose its R2 upload secrets.
- Reproducible GeoNames import (suggested): `scripts/my-atlas/build-place-catalog.*`, immutable catalog version and license manifest, test fixtures for city/country disambiguation.
- Maintain dev/staging/prod separation for Auth0 tenant/application, DO namespaces, Worker routes and catalog artifacts. Never check in tokens, real beta identities, invitation codes or user data.
- Preserve and test existing routes, GitHub Pages deployments, SSR fallback and editorial Atlas behavior.
- Conform to repository coding style and managed documentation index. This accepted proposal is now managed at `docs/proposals/my-atlas-private-beta.md`; implementation evidence belongs in the active implementation and as-built architecture documents.

## 12. Phased implementation and release gates

| Phase | Deliverable | Gate / forbidden shortcuts |
|---|---|---|
| **0 - Audit/decisions** | Repo/DNS/Worker route review (including wildcard/reserved-path passthrough), GeoNames license and catalog size benchmark, Auth0 SPA + exact API audience, catalog isolation, cost cap, terms/privacy/retention decisions | **No deployment or content changes**; GeoNames catalog coverage and permanent storage rights are prerequisites |
| **1 - Geographic proof** | Download/build small country+city catalog, IDs, search and map markers using unchanged MapLibre/MapTiler visuals | Searching Uvita and ambiguous cities works; map tiles do not supply persistent pin ID |
| **2 - Secure backend** | Worker + Auth0 Google validation + registration registry DO + user DO + invite flow + profile/pin CRUD + export/delete/report | Concurrent invite redemption, registration retries, stale revision and private-visibility tests pass; no public release |
| **3 - Share experience** | Vue 2 user flow, private default, explicit Publish, dynamic public profile Worker HTML and Open Graph, noindex, staging share preview | HTTP 200 correct OG for public; 404/410/no leak for private/deleted; curated Atlas intact |
| **4 - Invited beta** | Admin invitations, monitoring, user reports, reset notice/export process, small invited test group | Users can safely sign in/pin/edit/share/revoke; no KV, ads, photos, Facebook or recap graphics |
| **Later - monetization** | Policy-reviewed one-slot AdSense experiment and analytics | Feature flag off until eligible and approved; zero promises of one impression per visit |
| **V2 - media/recap** | One cover + three favorites; R2 upload and yearly share graphic | Separate explicit approval, cost/rights/moderation and privacy audit |

## 13. Acceptance tests (minimum)

**Geographic correctness**
- [ ] Existing curated map appearance stays unchanged; My Atlas MapLibre uses MapTiler **tiles/terrain only**, not MapTiler feature IDs as stored pins.
- [ ] GeoNames-derived country/city catalog has documented CC BY 4.0 attribution and versioned source files.
- [ ] Uvita, Costa Rica and homonymous cities are searchable or a failed catalog-coverage test blocks launch with a documented fix.
- [ ] Catalog imports are append-preserving by stable ID; removed source records remain resolvable as deprecated, not physically deleted; search omits deprecated records and an explicit migration is required for actual merges/corrections.
- [ ] User cannot create an arbitrary street-level location, unsupported ID, address or duplicate pin.

**Account, invites and ownership**
- [ ] Beta invite is required for My Atlas account provisioning and pin writes; Google login alone cannot create a personal Atlas.
- [ ] Single registry DO enforces one-use invite and unique handle under concurrent requests; pending registration can recover without ghost accounts or permanently consumed codes.
- [ ] Auth0 SPA client works with **Vue 2** and in-app/mobile browsers; protected requests use an **access token for the configured My Atlas API audience**, never an ID token; Worker rejects wrong-audience, expired, unsigned and ID tokens and enforces owner authorization.
- [ ] There is **no** public invite-check endpoint; no raw invite tokens or auth tokens in logs.
- [ ] Validated provider-qualified identities are used; cross-user mutations always fail.
- [ ] Every profile and pin edit requires matching revision or returns a conflict; safe retries do not duplicate state.

**Pin CRUD and portability**
- [ ] Create/read/edit/delete a canonical country or city pin and its optional visited years; dedupe and 300-pin ceiling behave clearly.
- [ ] Add year to existing pin; country aggregation does not double count a pinned city plus its country.
- [ ] Profile display name/handle changes work; old handles remain reserved or tombstoned.
- [ ] Owner can export all data and delete account; account deletion revokes all public data and produces 410 for tombstoned public handles.

**Sharing, privacy, safety**
- [ ] New profile defaults private and has no public content until explicit Publish after one pin.
- [ ] Every new public profile URL delivers HTTP 200 and correct, safely escaped profile-specific OG metadata without client JavaScript.
- [ ] Private/suspended/unknown profiles disclose no personal data (404); deleted/tombstoned handles return 410.
- [ ] A previously published profile made private cannot be fetched from stale Workers KV, CDN or Workers route caches; no cache layer is present.
- [ ] Beta profile page is `noindex`; share previews still function; user is warned that external cached previews may remain.
- [ ] Abuse reporting and admin hide/suspend work; routes never permit public user discovery/enumeration.
- [ ] Route is configured as `roamwithjustin.com/my-atlas/*` (not `{handle}`), valid handle routes produce authoritative share HTML, and `/my-atlas`, reserved login/callback/settings paths, nested paths, site assets, and `/atlas` continue to reach the existing Vue/GitHub Pages application without loops.

**Scope, monetization, operations**
- [ ] Beta contains **no** image upload, public Nominatim autocomplete, Facebook auth, recap graphic, KV, AdSense request or per-pin article.
- [ ] Terms/privacy versions are acknowledged; beta reset language is shown; export and deletion tested.
- [ ] Real traffic, storage, map API and auth costs have monitoring/budget alerts.
- [ ] An approved future ad slot can be designed later, but no code tries to guarantee ad fill or 1 impression per visit.
- [ ] GeoNames catalog is stored in an independent artifact location; if R2 is used, `MY_ATLAS_CATALOG_R2` points only to a dedicated catalog bucket, code only reads it, and no editorial media-upload bucket, binding or credentials are exposed to the My Atlas Worker.
- [ ] All new Worker deployments and tests are isolated from production editorial media-upload Worker and GitHub Pages publishing pipeline.

## 14. Codex handoff prompt

> Review this My Atlas Private Beta V1.1 proposal against the current repository. Start with Phase 0 and report real blockers, especially GeoNames catalog coverage/licensing/deprecation, Cloudflare `roamwithjustin.com/my-atlas/*` route passthrough, Vue 2-compatible Auth0 integration with **API-audience access tokens (never ID tokens)**, isolated GeoNames catalog bindings, DO registration race safety, privacy revocation and backend costs. Preserve existing Atlas design and MapLibre/MapTiler tile configuration. Implement only the smallest approved phase; do not provision production resources, activate ads, enable user uploads or edit curated Atlas records by default. Keep My Atlas isolated from the existing media uploader. Once accepted, reconcile this document's frontmatter with the real docs schema, resolve stable documentation IDs, move it to `docs/proposals/my-atlas-private-beta.md`, supersede the original V1 in the index and update `docs/README.md`. Provide an implementation diff and acceptance test evidence before progressing to later phases.

## 15. Reference URLs for implementation verification

- GeoNames download, licensing, commercial permission and attribution: https://www.geonames.org/export/
- GeoNames downloadable catalog structure and CC BY 4.0: https://download.geonames.org/export/dump/readme.txt
- MapTiler Cloud API and terms (keep tile use separate from search persistence): https://docs.maptiler.com/cloud/api/reference/ and https://www.maptiler.com/terms/cloud/
- MapLibre map library: https://maplibre.org/
- Public Nominatim autocomplete prohibition: https://operations.osmfoundation.org/policies/nominatim/
- Auth0 generic SPA SDK for Vue 2: https://auth0.github.io/auth0-spa-js/
- Auth0 access tokens vs ID tokens: https://developer.auth0.com/resources/get-started/spa
- Cloudflare R2 Worker bucket bindings and their available operations: https://developers.cloudflare.com/r2/api/workers/workers-api-usage/
- Auth0 Vue SDK framework limitation: https://developer.auth0.com/resources/guides/spa/vue/basic-authentication
- Cloudflare Durable Objects strong-consistency storage: https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/
- Why Workers KV is unsuitable for instantaneous privacy revocation: https://developers.cloudflare.com/kv/concepts/how-kv-works/
- Cloudflare Worker Route requirements: https://developers.cloudflare.com/workers/configuration/routing/routes/
- Google policy for user-generated content around AdSense: https://support.google.com/adsense/answer/1355699

**Review status:** The four final review corrections (API access-token audience, real Worker wildcard routing, isolated catalog R2, and append-preserving deprecated GeoNames identities) are incorporated. The target is accepted and managed. Phase 1 is locally implemented and verified; later phases remain gated. No DNS, cloud resources, accounts, production routes, or existing user data were changed during managed-doc adoption.
