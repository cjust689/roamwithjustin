---
id: my-atlas-geography
title: My Atlas Geographic Catalog and Local Proof
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-16
updated: 2026-11-16
related:
  - my-atlas-private-beta
  - my-atlas-private-beta-implementation
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/routes.js
  - src/features/my-atlas/catalog/search.mjs
  - src/features/my-atlas/catalog/pinDraft.mjs
  - src/features/my-atlas/config/featureFlags.mjs
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/data/place-catalog.proof.json
  - scripts/my-atlas/build-place-catalog.mjs
  - scripts/my-atlas/lib/build-place-catalog.mjs
  - scripts/my-atlas/fixtures/geonames
  - scripts/test-my-atlas-place-catalog.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run build
    - npx eslint "src/features/my-atlas/**/*.{js,mjs,vue}" src/router/index.js "scripts/my-atlas/**/*.mjs" scripts/test-my-atlas-place-catalog.mjs
    - Headless Chrome local proof at desktop and emulated 390px mobile widths
---

# My Atlas geographic catalog and local proof

This document describes only the implemented Phase 1 geographic proof. It
does not claim that authentication, invitations, persistence, sharing, or a
public beta exists.

## Runtime boundary

My Atlas is isolated under src/features/my-atlas. It does not import curated
Journey, Place, Visit, Experience, Moment, media, or editorial state. Its map
component reuses only the existing MapLibre style and terrain configuration
from the curated Atlas.

The route is absent unless VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF is exactly
true. The repository and GitHub Pages workflow do not set that variable, so
the proof is not reachable in the default production build.

The proof stores selections in Vue component memory only. Refreshing the page
clears them. There is no browser storage, account API, Worker, Durable Object,
R2 binding, invitation, image upload, AdSense request, or public profile.

## Geographic identity

The offline importer reads these extracted GeoNames files:

- countryInfo.txt
- admin1CodesASCII.txt
- cities500.txt

Countries use IDs such as iso-country:CR. Populated places use IDs such as
geonames:3621138. MapLibre renders the coordinates associated with those
catalog records, but map tiles never provide or replace a stored place ID.

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

The proof catalog contains 250 current GeoNames country or territory records
plus the current GeoNames
records for Uvita, Costa Rica, Paris, France, and Paris, Texas. It is a
development artifact, not a worldwide production catalog.

The importer excludes the withdrawn AN and CS codes. It retains GeoNames' XK
record as an explicit source exception pending the later product decision on a
fixed country and territory denominator.

Draft pin creation accepts only a current country or city catalog ID. It
rejects arbitrary coordinate IDs, deprecated records, duplicate destinations,
and more than 300 destinations.

## Append-preserving releases

Passing a previous catalog to the importer preserves records missing from the
new source and marks them deprecated. Deprecated records remain resolvable for
existing pins but cannot be selected for a new pin and are hidden from normal
search.

The importer fails if an existing place ID changes place type, country, or
GeoNames source identity. Those changes require a separately reviewed
migration rather than silent reassignment.

## Measured full-catalog boundary

The 2026-11-16 cities500 snapshot produced 237,176 city records and 250 country
or territory records. The deterministic combined JSON benchmark must be
regenerated whenever the importer changes. The last verified artifact was
163,327,863 bytes and
22,484,524 bytes with gzip level 9. Node parsed it in about 1,060 milliseconds
on the owner's workstation. Median linear-search times across ten runs were
about 102.6 milliseconds for Uvita, 101 milliseconds for Paris, and
73.2 milliseconds for Paris Texas.

That artifact is intentionally excluded from Git. It is too large for the
initial browser bundle. A later backend phase must build a compact indexed and
versioned search artifact, preferably partitioned behind the Worker or a
dedicated catalog store. If R2 is chosen, it must use an isolated
MY_ATLAS_CATALOG_R2 binding and bucket rather than editorial media storage.

## License boundary

GeoNames states that its downloadable data is CC BY 4.0 and permits commercial
use with attribution. The proof displays GeoNames attribution independently
from MapLibre and the configured tile provider. The imported data remains
subject to GeoNames accuracy and completeness limitations.
