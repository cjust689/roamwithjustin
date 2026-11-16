---
id: content-model
title: Canonical Content Model
kind: architecture
status: implemented
implementation_state: complete
created: 2026-11-14
updated: 2026-11-16
related:
  - media-pipeline
  - gear-system
supersedes:
  - atlas-asset-architecture-brief
superseded_by: []
code_paths:
  - src/content/contracts.mjs
  - src/content/media/index.mjs
  - src/content/places/index.mjs
  - src/content/geography/index.mjs
  - src/content/geography/generated/records.json
  - src/content/places/europe.mjs
  - src/content/places/costa-rica.mjs
  - src/content/places/miami.mjs
  - src/content/places/next-destinations.mjs
  - src/content/journeys/index.mjs
  - src/content/journeys/costa-rica-2025.mjs
  - src/content/journeys/miami.mjs
  - src/content/journeys/utah-2026.mjs
  - src/content/journeys/next-destinations.mjs
  - src/content/atlas/preview-presentation.mjs
  - src/content/partners/index.mjs
  - src/content/experiences/index.mjs
  - src/content/editorial/generated/records.json
  - src/content/selectors/experiences.mjs
  - src/content/selectors/projections.mjs
  - scripts/validate-content.js
  - scripts/editorial-baseline.mjs
  - scripts/lib/editorial-baseline.mjs
  - scripts/lib/editorial-google-auth.mjs
  - scripts/lib/editorial-google-sheets.mjs
  - scripts/lib/editorial-google-drive.mjs
  - scripts/lib/editorial-google-migration.mjs
  - scripts/lib/editorial-google-catalog.mjs
  - scripts/lib/editorial-google-bindings.mjs
  - scripts/lib/editorial-place-suggestions.mjs
  - scripts/lib/editorial-place-decisions.mjs
  - scripts/editorial-migrate-sheet.mjs
  - scripts/editorial-build-catalog.mjs
  - scripts/editorial-bind-places.mjs
  - scripts/editorial-bind-journeys.mjs
  - scripts/editorial-suggest-places.mjs
  - scripts/editorial-bind-reviewed-places.mjs
  - scripts/editorial-bind-visits.mjs
  - scripts/lib/editorial-google-visits.mjs
  - scripts/editorial-publish.mjs
  - scripts/editorial-register-place.mjs
  - scripts/lib/editorial-place-registration.mjs
  - scripts/lib/editorial-content-compiler.mjs
  - scripts/lib/editorial-google-publication.mjs
  - scripts/lib/editorial-publication-plan.mjs
  - scripts/test-editorial-google.mjs
  - scripts/test-editorial-migration.mjs
  - scripts/test-editorial-catalog.mjs
  - scripts/test-editorial-bindings.mjs
  - scripts/test-editorial-place-suggestions.mjs
  - scripts/test-editorial-place-decisions.mjs
  - scripts/test-editorial-place-registration.mjs
verification:
  state: verified
  evidence:
    - npm run content:validate
    - npm run editorial:test
    - npm run editorial:baseline -- --dry-run
    - npm run build
    - live table-aware Sheet migration verified on 106 eligible rows on 2026-11-16
    - live Atlas Reference verified with 81 canonical choices on 2026-11-16
    - Atlas Journey First look presentation verified in production on 2026-11-16
---

# Canonical content model

This document describes the model verified in current source. The historical
design and migration narrative is preserved in the
[archived asset architecture brief](../archive/atlas-asset-architecture-brief.md).

## Authorities

- **Media** owns reusable image/video identity, provider and delivery location,
  intrinsic media facts, rights, capture facts, and generated publication
  metadata.
- **Places** own stable geographic identity, coordinates, hierarchy, category,
  description, and destination links.
- **Journeys** own a particular trip, ordered Visits, itinerary chapters,
  lodging, narrative, and contextual Media usages.
- **Partners** own reusable provider/operator identities and disclosure-safe
  external links.
- **Atlas presentation** owns map-only grouping, camera, root, and relationship
  choices. It does not replace Place or Journey identity.

**Experiences** own a reusable outing or story within one Journey and may bind
to one Place and Visit. **Moments** are additive Post-authored perspectives
inside an Experience. The generated editorial shard is composed and validated
by `src/content/experiences/index.mjs`; it does not replace Journey, Place, or
Visit authority.

The generated geography shard is a second canonical composition input. It is
not populated by ordinary publication or by matching free-form Location text.
Only the explicit Place registration command may add a reviewed Place, its
Journey Visit, and its Atlas presentation node. Static and generated records
share the same registries and duplicate-ID validation.

## Identity and composition

Each registry composes records in one `index.mjs` and uses
`createIdRegistry()` to reject missing or duplicate IDs at import time.
Every Journey carries a numeric `year`; its canonical ID and public slug end in
that year so repeat trips to the same destination can coexist. Public routes
use `Journey.slug`, while `legacySlugs` keep older unyeared links resolvable.
Internal relationships use canonical IDs. A Place may appear in more than one
Journey through distinct Visits.

Incomplete but confirmed trips use bounded internal publication scaffolds. Europe,
Costa Rica, Utah 2026, Miami, North Georgia, Peoria, and the retained Hungary
preview have canonical Journey/Place identity and public Atlas presentation.
Europe remains one Journey with geographic stops beneath its Europe root;
Utah 2026 remains separate from Utah winter 2025 and reuses the shared Utah,
Zion, and Park City geography. Planned-only Hanksville is not registered as a
visited Place.

Every top-level Atlas entry projects its year-specific Journey title and date
label. This keeps repeat visits to the same geography visibly separate. Child
Atlas entries continue to project canonical Place names and their own
place-level labels, so the Journey year is not repeated at every stop.

Miami's 2026 trip uses the repeat-safe `miami-south-beach-2026` Journey
identity, while `miami-south-beach` remains the stable geographic Place. Its
story expands through South Pointe Park, the broad Everglades region, Shark
Valley, and Oleta River State Park Visits. Its five ordered narrative sections use
`itineraryMode: "chapters"`: this preserves a useful story sequence without
claiming that every outing belongs to a known calendar day. The public story
labels these records as experience/story chapters, while the default remains a
day-by-day itinerary for other Journeys. A chapter may reuse a Visit when more
than one confirmed moment happened at the same Place. The broad Everglades
Place gives the confirmed airboat outing a truthful regional association while
the unresolved operator, launch, route, and park jurisdiction remain unpinned;
Shark Valley stays a separate, precise child Place.

The current generated Media registry places 84 images on the Miami Beach Visit,
18 on the Everglades Visit, and 9 on the Oleta Visit. Those placements do not
establish a more precise airboat route, prove that every Everglades frame
depicts the airboat, or identify Oleta's unnamed island. The Journey retains
its internal `coming-soon` status while South Pointe and Shark Valley media,
captions, editorial roles, and final curation are incomplete.

These previews may omit media, venues, external links, itinerary days, and
unsupported details. Their Atlas chooser cards use the visitor-facing `First
look` cue, and every incomplete Journey panel explains that the Journey is
still taking shape and will gain more places, stories, photographs, and films
over time. This sets an honest completeness expectation without exposing
internal status labels such as "coming soon," "confirmed," "unconfirmed,"
"verified," or "unverified." Missing links stay absent instead of being
replaced with guessed tourism or map URLs.
Coordinates use verified public geographic points or area centroids, with the
precision and limitations recorded on each Place; they are not treated as
photo capture positions.

Media references use `{ assetId, ...usageOverrides }`. Presentation-specific
alt text, captions, focal points, and roles belong to the usage/placement, not
the physical asset. Legacy URL resolution remains isolated in the shared media
selector for compatibility.

## Selectors

`src/content/selectors/projections.mjs` builds public trip, location, Atlas,
and guided-journey shapes. Feature components consume those projections rather
than maintaining another content database.

Published Experiences are projected into their Journey page. Their stable
deep link is `#experience-<slug>`. Published Moments retain explicit append
order and their own Media set. `Travel Date / Range` is shown as supplied
evidence but does not silently reorder Moments or manufacture exact dates.
Draft Experiences, Moments, and placements are excluded from public selectors.

An internally incomplete Journey may be media free. Story list/detail
components render a quiet decorative surface and the available date, place,
and story copy. Internal publication state, verification state, media counts,
missing-data labels, and canonical-record terminology are not exposed to
visitors. Published Journeys still require a resolved cover and complete
validated public content.

An internally incomplete Journey may also expose verified chapter copy before
media is available. When those chapters exist, the story view skips the
redundant generic destination preview and renders the chapters with
chronology-safe labels. Publication status remains `coming-soon` until its
media and remaining public content are ready.

Content validation requires every internally incomplete Journey to have an
Atlas root and every one of its Visits to resolve to an Atlas node. It also
requires every Atlas root to use its Journey title and date label while child
nodes retain Place titles. Confirmed broad route order can power guided
playback even while the internal publication state remains incomplete.

Retired authorities `src/data/trips.js` and
`src/features/atlas/data/atlasData.js` are absent and explicitly rejected by
content validation. Compatibility exports under `src/content/selectors/` are
derived from canonical records.

## Validation

`scripts/validate-content.js` verifies registry identity, foreign keys, local
media existence/dimensions, R2-key uniqueness, journey/visit relationships,
Atlas presentation, generated Gear, Media, Experience, and Moment records,
their foreign keys, projections, and the absence of retired legacy
authorities. It also rejects dash punctuation and editorial
workflow phrases in the Journey and Atlas copy that the selectors expose to
visitors. Technical IDs, slugs, URLs, and internal notes are outside that prose
rule. `npm run build` runs content validation first.

## Editorial baseline catalog

`scripts/editorial-baseline.mjs` now provides a read-only catalog and audit
boundary for the accepted single-row Google Sheets publishing direction. It
projects the current code-owned Journey, Place, Visit, and Atlas presentation
identities into a deterministic lookup catalog without cloning canonical
records or changing public content. An optional private CSV export can be
checked for the existing Posts headers, proposed Atlas columns, eligible
account rows, exact Journey/Place matches, missing stable IDs, and ambiguity.

The Google adapter uses local installed-app OAuth, batch-reads a designated
Posts tab, inventories and downloads every supported direct child of an
explicit Drive folder, and keeps credentials, snapshots, receipts, and
checkpoints outside tracked source. The separately gated migration writer
appended the approved Atlas and hidden automation columns, seeded 104 stable
Post IDs, and preserved historical `Off` state without changing original
fields. The owner's real Sheet baseline and migration are verified. A real
reviewed Drive download remains externally unverified.

The automation-owned hidden Atlas Catalog mirrors canonical references from
these registries without cloning their authority. A visible, warning-protected
Atlas Reference projects readable Journey, Journey-to-Place Visit, Experience,
scope, URL, and entity-ID rows from the same source. It is a review surface,
not a creator-managed relational model. A private Git-ignored binding report
keys candidate Place matches by stable Post ID. Catalog generation does not
write creator-owned values into Posts.

The native Google Sheets table owns typed dropdowns for `Publish To`, `Atlas
Journey`, `Atlas Place`, and `Atlas Mode`. The Place dropdown includes the
explicit `New Place` request while preserving current choices; the requested
name comes from the row's existing `Location` field. `Atlas Experience`
remains free text so it can accept an existing label or `New:` request.
Catalog sync refreshes the hidden and visible projections plus those table
choices. Apply-mode publication performs that refresh before selecting a row
and again after a successful content change.

After creator review, a separate guarded writer applied 33 exact `place_id`
bindings for Amsterdam, Costa Rica, and Utah. It keys by stable Post ID and
reviewed source hash rather than row position. The remaining broad or aliased
Location labels stay unbound because they do not resolve one-to-one to a
canonical Place.

A second creator-approved guarded writer assigned a canonical Journey label
and `journey_id` to every one of the 104 eligible historical rows. The five
approved Journey groupings cover Europe 2026, Costa Rica 2025, Utah winter
2025, Utah 2026, and St. John, USVI 2025. Each write resolves against the
catalog, checks the reviewed source hash, rejects conflicts, and preserves all
non-Journey cells. A separate read-only baseline verified all 104 bindings.

For the 71 still-unbound rows, a read-only suggestion pass now constrains
candidate Places to each approved Journey and then narrows them using canonical
country, region, and parent geography. Explicit Place names in existing row
text rank candidates, but the report marks every result unsafe to write. The
deterministic private JSON and CSV contain no generated Place records and do
not change Sheet or application state.

The creator subsequently reviewed every suggestion. Guarded per-Post writers
and later eligible rows now yield 106 verified canonical Journey and Place
identities. A guarded relation pass wrote 82 unique matching Visit IDs. The
2026-11-16 table upgrade backfilled those 82 rows with readable `Atlas Place`
values, defaulted all 106 eligible rows to `Publish To = Social`, and preserved
all original creator fields. Rows without `Atlas Place` deliberately publish
at Journey scope rather than inventing a Visit.

`editorial:publish` now translates exactly one `Preview` or `Publish` row whose
`Publish To` is `Atlas` or `Both`. It resolves the friendly Journey at runtime.
Blank `Atlas Place` clears Place and Visit targeting for Journey scope. A
selected Atlas Place must resolve to an existing canonical Place and a matching
Visit in that Journey. Guarded write-back persists the resolved hidden IDs.
Preview plans generated Media and editorial records without remote writes.
Apply uses verified R2 receipts, creates or reuses an Experience, upserts one
stable Moment for the Post, validates the generated pair, and then hands only
those machine-owned shards to the isolated Git publisher. A blank Experience
leaves the media at Journey or Visit scope rather than inventing one. The
publisher does not infer missing geography.

`editorial:register:place` is the separate explicit geography boundary. The
selected row must contain `Atlas Place = New Place`, put the requested name in
`Location`, and keep `Atlas Mode = Off`. Preview resolves the Journey and produces the proposed canonical IDs,
order, coordinates, public summary, Visit, and Atlas pin without writes. Apply
updates only `src/content/geography/generated/records.json`, validates and
builds it, promotes it through the protected develop and main branches,
verifies the rendered Atlas URL, refreshes both Sheet lookup tabs, and replaces
the request with the registered Place plus hidden Journey, Place, and Visit
IDs. A matching existing Place is reused when only its Visit is missing. A new
Place requires explicit parent, longitude, latitude, and public summary. Visit
order is explicit through `--after-place` or defaults to the Journey end; a
display date never silently determines route order.

## Current limitations

- Some Journey gear remains in legacy `gearHighlights` as a selector fallback.
- Many images are still local static files rather than generated R2 records.
- Canonical content is Git-backed; there is no runtime CMS or database.
- The single-row workflow is implemented for existing Journeys and Visits,
  including generated Experiences and Moments, guarded deployment, and Sheet
  write-back. Explicit Place and Visit registration is locally verified but
  its first live generated record is not. Live Sheet identity and all 106
  historical Journey and Place bindings are verified. The first real Drive
  and R2 post and creation of an entirely new Journey remain unverified or
  unimplemented.
