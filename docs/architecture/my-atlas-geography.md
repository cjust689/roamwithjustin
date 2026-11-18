---
id: my-atlas-geography
title: My Atlas Geographic Catalog, Local Proof, and Worker Index
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-16
updated: 2026-11-18
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
  - src/features/my-atlas/catalog/customPlace.mjs
  - src/features/my-atlas/catalog/mapMemory.mjs
  - src/features/my-atlas/config/placeSearch.mjs
  - src/features/my-atlas/config/featureFlags.mjs
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/data/place-catalog.proof.json
  - scripts/my-atlas/build-place-catalog.mjs
  - scripts/my-atlas/data/curated-spots.json
  - scripts/my-atlas/data/reviewed-cities.json
  - scripts/my-atlas/build-worker-place-catalog.mjs
  - scripts/my-atlas/local-place-search-server.mjs
  - scripts/my-atlas/lib/build-place-catalog.mjs
  - scripts/my-atlas/lib/build-worker-place-catalog.mjs
  - workers/my-atlas/src/catalog/store.mjs
  - workers/my-atlas/src/catalog/projection.mjs
  - workers/my-atlas/src/account/custom-place.mjs
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
    - Full geonames-2026-11-17-reviewed-spots artifact built 256 resolution shards and 256 search shards for 237448 records, including 225569 selectable populated places and 11607 append-preserved deprecated records
    - Full geonames-2026-11-18-reviewed-utah artifact built 256 resolution shards and 256 search shards for 237451 records, including 225571 selectable populated places, 23 reviewed spots, and 11607 append-preserved deprecated records
    - Local shard-backed searches resolved Torrey and Hanksville as cities and Capitol Reef National Park as a National park from geonames-2026-11-18-reviewed-utah
    - Catalog tests reject PPLX sections, populated localities, and settlement records from new search while preserving prior identities as deprecated exact-resolution records
    - Catalog and Worker-artifact tests resolve Krka National Park and Canyonlands as National park, and Mount Rushmore as Monument, from reviewed product classifications
    - Pull requests 91 and 92 passed validation runs 44031806025 and 44032270298, develop validation run 44032062160 passed, and Pages workflow 44032453669 deployed main merge 44c7811cb07085ad3d01a9661766d687a716469b
    - Rclone reported 512 matching geonames-2026-11-17-reviewed-spots release objects with zero differences before catalog/current.json was uploaded last
    - Rclone reported 512 matching geonames-2026-11-18-reviewed-utah release objects with zero differences before catalog/current.json was uploaded last
    - Production-origin staging searches returned Torrey, Hanksville, and Capitol Reef National Park from geonames-2026-11-18-reviewed-utah after manifest activation
    - Resource-limit reproduction returned platform-generated 503 responses without application CORS headers for Atlanta, Torrey, Capitol Reef, and Hanksville against the two-character search index
    - Full geonames-2026-11-18-reviewed-utah-search-v2 artifact built 256 resolution shards and 4096 four-or-six-character search shards for 237451 records
    - Rclone reported 4352 matching geonames-2026-11-18-reviewed-utah-search-v2 release objects with zero differences before catalog/current.json was updated last
    - Staging Worker version 2b35b3f4-8c5e-42de-b37e-93b83aa1291d accepted the previous and optimized manifests during activation
    - Production-origin staging searches returned HTTP 200 with CORS and request IDs for Atlanta, Torrey, Capitol Reef, Hanksville, Uvita, and San Jose from geonames-2026-11-18-reviewed-utah-search-v2
    - Full geonames-2026-11-18-reviewed-utah-catalog-v3 artifact built 4096 resolution shards and 4096 four-or-six-character search shards for 237451 records
    - The six owner-reported wishlist IDs resolved through five catalog-v3 shards totaling 212348 decoded bytes and 265 candidate records, down from approximately 3.45 MiB across the prior unique resolution shards
    - Rclone reported 8192 matching geonames-2026-11-18-reviewed-utah-catalog-v3 release objects with zero differences before catalog/current.json was updated last
    - Staging Worker version 5234f470-dfc9-4d4c-af2b-3dbb922f0a9a deployed an explicit 30000 ms CPU limit plus persisted invocation logs before catalog-v3 activation
    - Production-origin staging reads returned HTTP 200 with CORS and request IDs for health, Atlanta, Torrey, Capitol Reef, Hanksville, Uvita, and exact Uvita resolution from geonames-2026-11-18-reviewed-utah-catalog-v3
    - Pull request 145 passed validation run 44367937370 and merged the resource fix to develop as 3443d1a010830ab33d3e029eceafa7bd91a83f61; develop validation run 44368309406 then succeeded
    - History-only pull request 147 passed validation run 44368814693 and merged current main ancestry to develop as d10038be1abd2992c9100c1cd6eabcd8b53740ad; develop validation run 44369190504 then succeeded
    - Pull request 146 merged the validated develop head to main as 1758fea1681ff72ec0e9423f2a06f4fb07d5e13b, and Pages run 44369566126 built and deployed it successfully
    - Live content-addressed chunk 885.9c3d6805.js returned 200 and contained the four-character search boundary
    - Pull requests 133 and 134 passed validation runs 44316400839 and 44317077225, develop validation run 44316716233 passed, and Pages run 44317427615 deployed main merge d799e961b6aedcfd2e3dfbe4224446350ab482c9
    - Live chunk 894.461d6b6a.js returned 200 and contained geonames-2026-11-18-reviewed-utah-proof, Capitol Reef National Park, Torrey, and Hanksville
    - Production-origin live searches returned Krka National Park and Canyonlands as National park and Mount Rushmore as Monument from geonames-2026-11-17-reviewed-spots; Coolbinia returned no search result while its prior PPLX ID resolved as deprecated
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
    - Twenty-four Workers-runtime tests passed, including owner-created custom-pin persistence, catalog bypass, safe public projection, and corrupt-state failure
    - Browser and Worker contract tests passed bounded custom names, coordinate normalization, owner-scoped identity, API projection, and formula-safe CSV export
    - Headless Chrome at 390 pixels verified custom-name entry, map click placement, a draggable rendered marker, transition to the shared visit editor, and zero horizontal overflow
    - Map-memory contract tests passed selected-pin, show-all, and empty-memory visibility boundaries
    - Headless Chrome verified full selected-pin memory callouts and the optional all-memory map layer at desktop and 390 pixel mobile widths
    - Pull requests 95 and 96 passed validation runs 44042472207 and 44042988296, and develop validation run 44042753182 passed
    - Pages workflow 44043262797 deployed main merge 2dc4133eb63f98c702dd3cd0b6951952853006f8
    - Live My Atlas JavaScript and CSS chunks returned 200 and contained the map-memory controls, memory-callout sizing, and compact public mobile identity grid
    - Pull requests 87 and 88 passed required validation runs 44024490207 and 44025014014, then merged through develop and main as 0a5e7a4 and c54ea44
    - Develop validation run 44024742154 and Pages deployment 44025229521 succeeded
    - Staging Worker version 9fa931b5-f32f-4df2-a84e-8a0516f83951 returned 200 health after the custom-pin contract deployed
    - Live chunks 102.9bc646f9.js, 850.f2e2b9be.js, and 102.fa12fe12.css returned 200 and contained the custom-pin prompt, map placement event, form, and marker styles
---

# My Atlas geographic catalog, local proof, and Worker index

This document describes the implemented geographic proof and the isolated
staging Worker catalog. The public site uses the staging API for the controlled
private beta, but this does not establish a production API route or general
public-beta approval.

## Runtime boundary

My Atlas is isolated under src/features/my-atlas. It does not import curated
Journey, Place, Visit, Experience, Moment, media, or editorial state. Its map
component reuses only the existing MapLibre style and terrain configuration
from the curated Atlas.

The map can project a pin's already authorized favorite memory as plain text.
Selecting a standalone pin reveals its complete memory in that pin's label.
An explicit owner or visitor control can reveal shortened memory previews for
all currently visible standalone pins. Compact low-zoom clusters never include
memory text, so the overview remains legible.

The route is absent unless VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF is exactly
true. The repository and GitHub Pages workflow do not set that variable, so
the proof is not reachable in the default production build.

Without an active beta account, the browser proof stores draft selections in
Vue component memory only and refreshing clears them. With an authenticated
active account, the Phase 2C browser loads and persists pins through the Worker.
The isolated staging Worker, R2 catalog, Durable Object namespaces, and limiter
are deployed. The active `geonames-2026-11-18-reviewed-utah` revision returns
Torrey and Hanksville as cities and Capitol Reef as a National park. The prior
reviewed release also verified Krka National Park, Canyonlands National Park,
and Mount Rushmore with their reviewed result types. Coolbinia, a prior `PPLX`
record, returned no new-search result while exact resolution preserved it as
deprecated. No production API route or public profile has been verified.

An active account may also create an explicitly labeled custom pin when a
destination is absent from the catalog. The owner supplies its plain-text name
and selects coordinates on the map. This fallback is owner content, not a new
GeoNames record, and it never enters catalog search or exact catalog
resolution.

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
Reviewed entries may explicitly override the source feature's product category
and result label. This presents Krka as a National park even though GeoNames
codes it as a nature reserve, and Mount Rushmore as a Monument even though
GeoNames codes it as a mountain.

The separate reviewed `scripts/my-atlas/data/reviewed-cities.json` source adds
specific useful towns that fall below the `cities500` population boundary.
Each entry must still be a supported GeoNames populated-place feature and pass
the same identity, coordinate, country, and source-URL validation. It does not
admit neighborhoods, city sections, localities, or an unbounded small-town
import. Torrey and Hanksville are the first reviewed supplements.

Countries use IDs such as iso-country:CR. Populated places use IDs such as
geonames:3621138. Curated spots use the same stable GeoNames identity, for
example Yellowstone National Park is geonames:5843642. MapLibre renders the
coordinates associated with those catalog records, but map tiles never provide
or replace a stored place ID.

Custom pins use a server-generated `custom:` ID derived from the authenticated
owner plus the normalized name and coordinates. Repeating that exact entry for
the same owner therefore hits the existing destination index, while another
owner receives a different ID. This identity does not claim a stable shared ID
for the real-world feature. The browser and Worker both normalize the
owner-supplied name and longitude-latitude pair before storage.

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
France, Paris, Texas, Torrey, and Hanksville, plus 23 reviewed spots across six
continents. It is a development fallback, not a worldwide production catalog.

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
shape against 225,571 selectable populated places, 250 country or territory
records, and 23 reviewed spots. It binds only to `127.0.0.1`, allows only localhost browser
origins, accepts only GET and OPTIONS, bounds query and result sizes, and sends
no-store responses. It is a development reference, not the production Worker,
an invitation API, or a persistence service.

The isolated Worker now implements the same public bounded search route plus
`GET /v1/places/{placeId}` against immutable versioned artifacts. Search reads
one manifest and one query-prefix shard. Exact resolution reads one manifest
and one place-ID hash shard. The optimized manifest rejects normalized queries
outside 4 to 80 characters and limits results to ten. The Worker retains read
compatibility with the earlier two-character manifest for safe activation and
reversal. Resolution preserves deprecated records, while normal search omits
them. The default local Worker has no catalog R2 binding. The named staging
environment binds the isolated, provisioned catalog bucket.

Catalog search and exact resolution use the staging weighted public limiter
under a `catalog` key scoped to the connecting IP address. Search costs two
units and exact resolution costs one. Signed-out public Atlas reads use a
separate `public-atlas` key, so browsing a shared Atlas cannot consume the same
bucket as place search. Authenticated owner Atlas routes do not use this public
limiter.

Canonical name matches rank ahead of alias matches. This prevents an airport
code or alternate name from outranking the actual city, such as the `Moab`
alias on another GeoNames populated place outranking Moab, Utah.

The importer excludes the withdrawn AN and CS codes. It accepts only GeoNames
`PPL`, `PPLA`, `PPLA2`, `PPLA3`, `PPLA4`, `PPLA5`, and `PPLC` populated-place
feature codes for new city and town choices. It explicitly excludes `PPLX`
sections of populated places plus locality, settlement, abandoned, historical,
religious, destroyed, and other subdivision-style records. It retains
GeoNames' XK record as an explicit source exception pending the later product
decision on a fixed country and territory denominator.

Draft pin creation accepts only a current country, city, or spot catalog ID. It
rejects arbitrary coordinate IDs, deprecated records, duplicate destinations,
and more than 300 destinations. Spots use the same optional visit-date,
timeline, sharing, and export lifecycle as every other destination.

The authenticated custom-pin path is separate from catalog selection. It
accepts no client-selected place ID. Names are normalized to NFC, folded to one
line, limited to 80 code points and 320 UTF-8 bytes, and reject markup,
controls, bidirectional overrides, selected invisible formatting characters,
noncharacters, and unpaired surrogates. Coordinates are limited to valid
longitude and Web Mercator latitude, then rounded to six decimals. The map
supports click or tap placement, a draggable marker, and keyboard arrow
adjustment. Custom pins do not contribute inferred country, continent, city,
spot, or capital statistics.

## Append-preserving releases

Passing a previous catalog to the importer preserves records missing from the
new source and marks them deprecated. Deprecated records remain resolvable for
existing pins but cannot be selected for a new pin and are hidden from normal
search.

The importer fails if an existing place ID changes place type, country, or
GeoNames source identity. Those changes require a separately reviewed
migration rather than silent reassignment.

## Measured full-catalog boundary

The 2026-11-16 cities500 snapshot plus the reviewed 2026-11-18 city and spot
sources produce 225,571 selectable populated places, 250 country or territory
records, and 23 spot records. The append-preserving successor also retains
11,607 prior city identities as deprecated, for 237,451 total records. The
deterministic combined JSON benchmark must be regenerated whenever the
importer changes. The verified reviewed-Utah artifact is 170,693,035 bytes.
Full-catalog searches resolved Torrey and Hanksville as cities and Capitol Reef
National Park as a National park with their expected stable IDs.

That artifact is intentionally excluded from Git. It is too large for the
initial browser bundle. The loopback development server proves full-source
coverage but performs an in-memory linear search.

The Worker artifact command transforms that catalog into immutable gzip
objects under `catalog/releases/{revision}` plus a small
`catalog/current.json` pointer. Active exact place resolution uses 4,096
SHA-256 prefix shards. The runtime still accepts earlier manifests with 256
resolution shards for safe reversal. The
optimized search format indexes four-character and six-character normalized
query or name-token prefixes across 4,096 hash shards. Longer queries select
the six-character index, reducing unrelated candidates before decoding and
ranking. Search objects contain compact result records and only the normalized
names relevant to their shard. Identical inputs produce byte-identical files;
attempting to change an existing revision fails instead of overwriting it.

The active `geonames-2026-11-18-reviewed-utah-catalog-v3` local build contains
4,096 resolution shards and 4,096 search shards for 237,451 records. Resolution
shards total 34,786,476 compressed bytes, and search shards total 176,042,273
compressed bytes. The largest resolution shard is 14,126 bytes compressed.
The largest search shard is 1,179,090 bytes compressed. The six saved wishlist
IDs reported during the incident resolve through five unique resolution shards
containing 265 candidate records and 212,348 decoded bytes, rather than parsing
approximately 3.45 MiB across the prior unique resolution shards. Measured query shards
for Atlanta, Torrey, Capitol Reef, Hanksville, Uvita, and San Jose decoded to
approximately 0.23 to 0.66 MiB rather than the prior multi-megabyte request
objects. The Worker still enforces 16 MiB compressed and 64 MiB decoded object
limits.

Cold local directory-backed checks returned Uvita, Salt Lake City, Miami,
Paris, and Paris, Texas from the full artifact in approximately 39 to 242
milliseconds on the owner's workstation. These are development measurements,
not production R2 latency claims.

The active optimized artifact remains ignored under
`.state/my-atlas/worker-catalog-reviewed-utah-catalog-v3`. All 8,192 immutable
release shards were uploaded to the isolated staging bucket and rclone reported
8,192 matching files with zero differences before `catalog/current.json` was
updated last. Staging Worker `5234f470-dfc9-4d4c-af2b-3dbb922f0a9a` sets a
30,000 millisecond request CPU limit and persists invocation logs for diagnosis.
The staging Worker now resolves
`geonames-2026-11-18-reviewed-utah-catalog-v3`. The earlier
`geonames-2026-11-18-reviewed-utah-search-v2`,
`geonames-2026-11-18-reviewed-utah`, `geonames-2026-11-16`,
`geonames-2026-11-17-spots`, and
`geonames-2026-11-17-reviewed-spots` releases remain intact for reversal. The
editorial media bucket and uploader remain outside this boundary.

## License boundary

GeoNames states that its downloadable data is CC BY 4.0 and permits commercial
use with attribution. The proof displays GeoNames attribution independently
from MapLibre and the configured tile provider. The imported data remains
subject to GeoNames accuracy and completeness limitations.

Custom-pin names and positions are supplied by the Atlas owner rather than
GeoNames. The owner and public views identify that distinction in their
attribution copy.
