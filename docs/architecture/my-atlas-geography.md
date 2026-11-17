---
id: my-atlas-geography
title: My Atlas Geographic Catalog, Local Proof, and Worker Index
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-16
updated: 2026-11-17
related:
  - my-atlas-authentication
  - my-atlas-account-state
  - my-atlas-private-beta
  - my-atlas-private-beta-implementation
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/routes.js
  - src/features/my-atlas/catalog/search.mjs
  - src/features/my-atlas/catalog/placeSearchClient.mjs
  - src/features/my-atlas/catalog/pinDraft.mjs
  - src/features/my-atlas/catalog/placeTypes.mjs
  - src/features/my-atlas/config/placeSearch.mjs
  - src/features/my-atlas/config/featureFlags.mjs
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/data/place-catalog.proof.json
  - scripts/my-atlas/build-place-catalog.mjs
  - scripts/my-atlas/data/curated-spots.json
  - scripts/my-atlas/build-worker-place-catalog.mjs
  - scripts/my-atlas/local-place-search-server.mjs
  - scripts/my-atlas/lib/build-place-catalog.mjs
  - scripts/my-atlas/lib/build-worker-place-catalog.mjs
  - workers/my-atlas/src/catalog/store.mjs
  - workers/my-atlas/src/catalog/projection.mjs
  - workers/my-atlas/src/index.mjs
  - workers/my-atlas/test/catalog.test.mjs
  - scripts/serve.js
  - scripts/my-atlas/fixtures/geonames
  - scripts/test-my-atlas-place-catalog.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run build
    - npx eslint "src/features/my-atlas/**/*.{js,mjs,vue}" src/router/index.js "scripts/my-atlas/**/*.mjs" scripts/test-my-atlas-place-catalog.mjs
    - node --check scripts/serve.js && node --check scripts/my-atlas/local-place-search-server.mjs
    - Headless Chrome local proof at desktop and emulated 390px mobile widths
    - Local cities500 search returned canonical Salt Lake City, Miami, Moab, and Uvita results
    - Headless Chrome searched and pinned Salt Lake City through the full local catalog endpoint
    - Deterministic fixture artifacts passed exact resolution, bounded search, missing-shard, revision-mismatch, and deprecated-record tests
    - Workers-runtime tests passed ordered batched resolution used by owner and public Atlas projections
    - Full geonames-2026-11-16 Worker artifact built 256 resolution shards and 256 search shards for 237426 records
    - Curated spot fixtures passed search, draft pin, authenticated persistence, safe public projection, and Story-stat contracts
    - Full geonames-2026-11-17-spots artifact built 256 resolution shards and 256 search shards for 237445 records
    - Headless Chrome searched Yellowstone National Park, displayed its National park type, and opened its Add destination editor without horizontal overflow at desktop and 390 pixel widths
    - Headless Chrome at 390 pixels received a simulated 429 with Retry-After and request ID, retried the unchanged query in place, and rendered the recovered result without reloading
    - Catalog client tests preserve typed status, error code, bounded Retry-After, and request ID details from a failed search
    - Worker routing tests verify separate catalog and public Atlas limiter keys for the same client address
    - Pull requests 77 and 78 passed their required validation gates; the history-only pull request 79 restored the protected branch ancestry without changing files
    - Pages workflow 44014283401 deployed main merge 7c2b1a9135ce45a834bf7aadda869460452e55de
    - Staging Worker f039455e-35bf-4c9d-bd15-c03716e63f72 returned 200 health and a live Yellowstone result from geonames-2026-11-17-spots after limiter-scope deployment
    - Pull requests 73 and 74 passed their required validation gates and merged through develop to main
    - Pages workflow 44009928197 deployed main merge 23d8c96edc00d291a6f3a119c852dfd89f85f846
    - Rclone verified 512 matching geonames-2026-11-17-spots release objects before catalog/current.json was uploaded last
    - Staging Worker e20404c5-0250-47f0-88af-2d0db14983ee returned live Yellowstone, Eiffel Tower, Uvita, and exact Yellowstone resolution from the activated spot catalog
---

# My Atlas geographic catalog, local proof, and Worker index

This document describes the implemented Phase 1 geographic proof and the local
Phase 2B versioned Worker catalog. It does not claim that the isolated catalog
bucket, Worker, persistence, sharing, or a public beta is deployed.

## Runtime boundary

My Atlas is isolated under src/features/my-atlas. It does not import curated
Journey, Place, Visit, Experience, Moment, media, or editorial state. Its map
component reuses only the existing MapLibre style and terrain configuration
from the curated Atlas.

The route is absent unless VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF is exactly
true. The repository and GitHub Pages workflow do not set that variable, so
the proof is not reachable in the default production build.

Without an active beta account, the browser proof stores draft selections in
Vue component memory only and refreshing clears them. With an authenticated
active account, the Phase 2C browser loads and persists pins through the Worker.
The isolated staging Worker, R2 catalog, Durable Object namespaces, and limiter
are deployed. Live searches for Yellowstone National Park, the Eiffel Tower,
and Uvita returned the active `geonames-2026-11-17-spots` revision, and exact
Yellowstone resolution returned its canonical spot record. No production API
route or public profile has been verified.

For development, `npm run my-atlas:serve` starts the Vue application and a
loopback-only catalog search process. The search process reads the ignored full
GeoNames source under `.state/my-atlas/geonames`; it does not copy the worldwide
catalog into Git or the browser bundle. The ordinary `npm run serve` command
does not start that process.

## Geographic identity

The offline importer reads these extracted GeoNames files:

- countryInfo.txt
- admin1CodesASCII.txt
- cities500.txt

It also reads the reviewed `scripts/my-atlas/data/curated-spots.json` source.
That source adds selected national parks, cultural landmarks, and natural
landmarks from official GeoNames records. It is intentionally reviewed and
bounded instead of importing every park, building, mountain, and feature in
the worldwide dump. Each entry carries its GeoNames ID, feature code,
coordinates, aliases, country hierarchy, and direct GeoNames source URL.

Countries use IDs such as iso-country:CR. Populated places use IDs such as
geonames:3621138. Curated spots use the same stable GeoNames identity, for
example Yellowstone National Park is geonames:5843642. MapLibre renders the
coordinates associated with those catalog records, but map tiles never provide
or replace a stored place ID.

Each generated catalog includes:

- an explicit immutable catalog revision and source snapshot date;
- SHA-256 and byte size for each extracted source file;
- GeoNames and CC BY 4.0 attribution;
- canonical labels, aliases, normalized search names, hierarchy, coordinates,
  feature code, population, and source modification date;
- a deterministic record order and deterministic JSON output.

Countries use a GeoNames capital coordinate when the capital matches a
populated-place record. If it does not, the importer uses that country's
largest populated place and records that coordinate kind. An unresolved
country remains searchable but has no map marker.

## Search and selection

Search normalizes Latin accents, punctuation, and case. Exact and prefix
matches rank before substring matches, then population and the disambiguated
display label break ties. Results are bounded to ten. Deprecated records are
excluded from new search by default.

The bundled fallback proof catalog contains 250 current GeoNames country or
territory records, the current GeoNames records for Uvita, Costa Rica, Paris,
France, and Paris, Texas, and 19 reviewed spots across six continents. It is a
development fallback, not a worldwide production catalog.

When `VUE_APP_MY_ATLAS_PLACE_SEARCH_URL` is configured, the browser issues a
bounded search request instead. It accepts at most ten records and rejects
responses that do not contain a canonical ISO country ID or numeric GeoNames
city or spot ID, supported place type, name, and valid coordinates. Spot
records must also carry a bounded category and human-readable kind. Returned
canonical records are held in component memory so they can pass the same
draft-pin validation as bundled records.

The browser waits 350 milliseconds after the latest search edit, cancels an
older request when the query changes, and invalidates the older response even
when the query is cleared. A failed request retains HTTP status, error code,
bounded `Retry-After`, and request ID metadata. The interface distinguishes an
exhausted search limit from a catalog or network outage and can retry the
unchanged query without a page reload.

The local endpoint exposes the intended `GET /v1/places/search?q=...` response
shape against all 237,176 cities, 250 country or territory records, and 19
reviewed spots. It binds only to `127.0.0.1`, allows only localhost browser
origins, accepts only GET and OPTIONS, bounds query and result sizes, and sends
no-store responses. It is a development reference, not the production Worker,
an invitation API, or a persistence service.

The isolated Worker now implements the same public bounded search route plus
`GET /v1/places/{placeId}` against immutable versioned artifacts. Search reads
one manifest and one query-prefix shard. Exact resolution reads one manifest
and one place-ID hash shard. Search rejects normalized queries outside 2 to 80
characters and limits results to ten. Resolution preserves deprecated records,
while normal search omits them. The default local Worker has no catalog R2
binding. The named staging environment declares an isolated binding, but the
bucket and objects do not exist until deliberately provisioned and published,
so cloud routes remain unavailable.

Catalog search and exact resolution use the staging weighted public limiter
under a `catalog` key scoped to the connecting IP address. Search costs two
units and exact resolution costs one. Signed-out public Atlas reads use a
separate `public-atlas` key, so browsing a shared Atlas cannot consume the same
bucket as place search. Authenticated owner Atlas routes do not use this public
limiter.

Canonical name matches rank ahead of alias matches. This prevents an airport
code or alternate name from outranking the actual city, such as the `Moab`
alias on another GeoNames populated place outranking Moab, Utah.

The importer excludes the withdrawn AN and CS codes. It retains GeoNames' XK
record as an explicit source exception pending the later product decision on a
fixed country and territory denominator.

Draft pin creation accepts only a current country, city, or spot catalog ID. It
rejects arbitrary coordinate IDs, deprecated records, duplicate destinations,
and more than 300 destinations. Spots use the same optional visit-date,
timeline, sharing, and export lifecycle as every other destination.

## Append-preserving releases

Passing a previous catalog to the importer preserves records missing from the
new source and marks them deprecated. Deprecated records remain resolvable for
existing pins but cannot be selected for a new pin and are hidden from normal
search.

The importer fails if an existing place ID changes place type, country, or
GeoNames source identity. Those changes require a separately reviewed
migration rather than silent reassignment.

## Measured full-catalog boundary

The 2026-11-16 cities500 snapshot plus the reviewed 2026-11-17 spot source
produced 237,176 city records, 250 country or territory records, and 19 spot
records. The deterministic combined JSON benchmark must be regenerated
whenever the importer changes. The verified spot-inclusive artifact is
168,799,990 bytes. Full-catalog searches resolved Yellowstone National Park,
the Eiffel Tower, and Machu Picchu to their expected stable IDs and spot kinds.

That artifact is intentionally excluded from Git. It is too large for the
initial browser bundle. The loopback development server proves full-source
coverage but performs an in-memory linear search.

The Worker artifact command transforms that catalog into immutable gzip
objects under `catalog/releases/{revision}` plus a small
`catalog/current.json` pointer. Place IDs use 256 SHA-256 prefix shards. Search
uses 256 SHA-256 shards keyed by the first two normalized characters of the
query or indexed name token. Search objects contain compact result records and
only the normalized names relevant to their shard. Identical inputs produce
byte-identical files; attempting to change an existing revision fails instead
of overwriting it.

The full `geonames-2026-11-17-spots` local build contains 256 resolution shards
and 256 search shards for 237,445 records. Resolution shards total 28,748,654
compressed bytes, and search shards total 92,321,905 compressed bytes. The
largest resolution shard is 123,423 bytes compressed. The largest search shard
is 2,248,074 bytes compressed. The Worker enforces 16 MiB compressed and 64 MiB
decoded object limits.

Cold local directory-backed checks returned Uvita, Salt Lake City, Miami,
Paris, and Paris, Texas from the full artifact in approximately 39 to 242
milliseconds on the owner's workstation. These are development measurements,
not production R2 latency claims.

The spot-inclusive local artifact remains ignored under
`.state/my-atlas/worker-catalog-spots`. All 512 immutable release shards were
uploaded to the isolated staging bucket and rclone reported 512 matching files
with zero differences before `catalog/current.json` was uploaded last. The
staging Worker now resolves `geonames-2026-11-17-spots`. The earlier
`geonames-2026-11-16` release remains intact for reversal. The editorial media
bucket and uploader remain outside this boundary.

## License boundary

GeoNames states that its downloadable data is CC BY 4.0 and permits commercial
use with attribution. The proof displays GeoNames attribution independently
from MapLibre and the configured tile provider. The imported data remains
subject to GeoNames accuracy and completeness limitations.
