---
id: content-model
title: Canonical Content Model
kind: architecture
status: implemented
implementation_state: complete
created: 2026-11-14
updated: 2026-11-27
related:
  - media-pipeline
  - gear-system
  - lodging-partner-operations
  - stays-sheet-intake
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
  - src/content/experiences/curated-contract.mjs
  - src/content/experiences/curated.json
  - scripts/experiences/import-editorial-experiences.mjs
  - src/components/EditorialExperienceCard.vue
  - src/content/experiences/index.mjs
  - src/content/editorial/generated/records.json
  - src/content/selectors/experiences.mjs
  - src/content/selectors/projections.mjs
  - src/components/JourneyStoryBody.vue
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/features/atlas/components/AtlasStoryReader.vue
  - src/features/atlas/routes.js
  - src/features/atlas/views/AtlasView.vue
  - src/views/roam/RoamTripOverview.vue
  - src/router/index.js
  - scripts/test-atlas-story-discovery.mjs
  - scripts/test-atlas-story-reader.mjs
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
  - scripts/lib/editorial-public-copy.mjs
  - scripts/lib/editorial-story-generator.mjs
  - scripts/lib/editorial-google-publication.mjs
  - scripts/lib/editorial-publication-plan.mjs
  - scripts/test-editorial-google.mjs
  - scripts/test-editorial-migration.mjs
  - scripts/test-editorial-catalog.mjs
  - scripts/test-editorial-bindings.mjs
  - scripts/test-editorial-place-suggestions.mjs
  - scripts/test-editorial-place-decisions.mjs
  - scripts/test-editorial-place-registration.mjs
  - scripts/test-editorial-story-generator.mjs
verification:
  state: verified
  evidence:
    - npm run experiences:editorial:test
    - npm run content:validate
    - npm run editorial:test
    - npm run editorial:baseline -- --dry-run
    - npm run build
    - live table-aware Sheet migration verified on 106 eligible rows on 2026-11-16
    - live Atlas Reference verified with 81 canonical choices on 2026-11-16
    - live Atlas Place dropdown verified with the New Place request choice on 2026-11-16
    - live Catalog refresh verified 223 references, 71 Visit choices, and 106 exact bindings with no Posts ID writes on 2026-11-16
    - Atlas Journey First look presentation verified in production on 2026-11-16
    - npm run atlas:test verified all ten Journey story leads, incomplete Journey update notes, and exact Experience stop projection
    - Pull requests 287 and 288 plus Pages run 45898969341 deployed progressive Journey discovery; live Uvita rendered both exact Experience relationships
    - npm run atlas:test verified Uvita Horses and Uvita House as single-Moment Atlas card titles with their parent Experience context
    - npm run atlas:test verified the corrected Costa Rica top-level order, all three Uvita child Place pins, the direct unpinned house Experience, and retained horse and Whale Tail media
    - npm run content:validate verified San José third, Drake Bay fourth, Uvita fifth, and matching Place and Atlas parentage for the Uvita child Places
    - live guarded Sheet migrations added Atlas Coordinates and Atlas Stop as two independent visible headers while preserving all creator fields and 108 eligible Post IDs and bindings on 2026-11-27
    - local Chrome at 1440 by 1200 CSS pixels rendered three child Place entries plus the direct house Experience inside Uvita, then rendered Uvita Horses and its existing video inside Rancho La Merced
    - Pull requests 303 and 304 passed required validation, merged through protected develop and main as 2399530799aa7b91e358f8c8722139492ab97332 and 8c9d64850cccf93c11520b9eccf10985c3bd3874, and Pages run 46101408334 succeeded
    - live Chrome rendered Uvita Whale Tail, Rancho La Merced, Nauyaca Waterfalls, and Uvita House on the deployed Uvita route, then rendered Uvita Horses on the deployed Rancho La Merced route
    - npm run atlas:test verified Journey-hero fallback for Atlas roots, explicit Atlas override precedence, and child Place isolation
    - Local Chrome verified one retained MapLibre canvas, shared body rendering, and inspector and reader scroll restoration on 2026-11-18
    - Local Chrome accessibility tree verified conditional mobile dialog and nonmodal region semantics on 2026-11-18
    - Local Chrome verified the revised mobile detail hierarchy at 320 and 390 CSS pixels on 2026-11-18
    - Local Chrome verified direct root Atlas startup and the feature-gated My Atlas handoff at 320, 390, and 1280 CSS pixels on 2026-11-18
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
  lodging context, narrative, and contextual Media usages.
- **Partners** own reusable provider, lodging, operator, or merchant identity,
  disclosure-safe external links, and the stable slug used for public referral
  measurement. Journey lodging points to these records through `partnerId`
  rather than duplicating property URLs.
- **Commercial offers** own an approved public placement and provider-specific
  tracking configuration. They reference a Partner and do not replace the
  Partner, Journey, or private planning models.
- **Atlas presentation** owns map-only grouping, camera, root, and relationship
  choices. It does not replace Place or Journey identity.

The separate [Stays sheet intake](../implementation/stays-sheet-intake.md)
captures reviewed main Atlas property/stay data, including intentionally rough
public display coordinates. `editorial:stays` previews and compiles approved
rows into `src/content/lodging/generated/records.json`. This generated shard
composes lodging Partners and Journey stays through their existing registries.
It preserves curated records and accepts only registered, rights-reviewed Media.
Private source notes are excluded. Blank property links require an explicit
privacy omission policy. Public map bindings must already resolve to reviewed
Places/Visits with matching public coordinates; ingestion does not create pins.
Sheet flags select intent for the explicit command, without background polling.
Compiled content is distinguished from verified publication. Private My Atlas
trip stays belong to the owner account model and never feed this pipeline.

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

Place and Experience answer different questions. A Place is a physical
destination and can be nested under another Place to any depth. A Journey
Visit records that the Place was visited. An Experience is a story owned by a
Journey and, when geographically specific, by one Place and Visit at any depth.
Only a Place with an Atlas presentation becomes a map pin. A destination
inspector can list both child Place pins and direct Experiences, but it does
not turn an Experience into synthetic geography. This supports country, city,
district, venue, and attraction nesting without imposing a fixed stop depth.

Incomplete but confirmed trips use bounded internal publication scaffolds. Europe,
Costa Rica, Utah 2026, Miami, North Georgia, Peoria, and the retained Hungary
preview have canonical Journey/Place identity and public Atlas presentation.
Europe remains one Journey with geographic stops beneath its Europe root;
Utah 2026 remains separate from Utah winter 2025 and reuses the shared Utah,
Zion, and Park City geography. Planned-only Hanksville is not registered as a
visited Place. Playa San Josecito remains a canonical Place with retained
source context, but the owner removed it from the Costa Rica 2025 Journey, so
it has no Visit, Atlas stop, related route edge, or guided stop in that Journey.
Costa Rica orders San José by its first distinct stay, after Bajos del Toro.
Drake Bay is the fourth top-level stop and Uvita is the fifth. Uvita Whale
Tail, Rancho La Merced, and Nauyaca Waterfalls have independent Visits and use
Uvita as their Place and Atlas presentation parent. The horse Experience and
its existing video are associated with Rancho La Merced. The house Experience
remains directly associated with Uvita and therefore has no separate pin. This
makes Uvita a nested exploration hub without changing existing Moment IDs,
media asset IDs, or R2 object keys.
The later return uses the same broad San José geography and closes the related
route from Manuel Antonio without creating an overlapping map pin. The Casa
Jungla Experience, Moment, and media remain attached to the unchanged San José
Visit identity.

Every top-level Atlas entry derives a clean public display title from its
canonical Journey title and projects the Journey date as a separate secondary
label. Canonical titles retain their year for editorial automation and unique
operator-facing choices. This keeps repeat visits to the same geography visibly
separate without putting parenthesized dates inside public headings. Child
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
unsupported details. Their Atlas Journey entries and story routes remain
available, and every incomplete Journey explains that more places, stories,
photographs, and films will be added over time. This sets an honest
completeness expectation without exposing
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

Every Atlas root with a canonical Journey slug receives a story lead. The lead
reuses the canonical Journey title, description, hero, public story ID, and
standalone route. Incomplete Journeys carry a visitor-facing update note while
published Journeys omit it. This keeps every registered trip discoverable
without presenting internal publication state as public copy.

Root display media follows one bounded precedence: an explicit Atlas
presentation hero wins, otherwise the root inherits the canonical Journey
hero, otherwise it may use the first verified root-scoped image. Child Place
nodes do not inherit the Journey hero. They continue to use an explicit Atlas
or Visit hero and then the first verified image published to that Visit. This
lets one reviewed Journey cover populate its trip surface and default root map
pill without implying that the same photograph belongs to every destination.
The root `storyLead` projection resolves the same canonical Journey hero. Its
mobile Atlas card retains that photograph in a bounded single-column layout,
so the trip header, root inspector, and story entry remain visually consistent.

Stop-to-story relationships reuse canonical IDs already present in the content
model. `Journey.days[].visits[].visitId` creates a chapter edge to that Visit,
including many-to-many cases where one Visit appears in several chapters.
Published Experiences create a stop edge as soon as both their `visitId` and
`placeId` match, even while the containing Journey remains incomplete. Atlas
presentation selects the intended Visit when more than one Visit shares a
Place, so it can retain one deliberate pin without merging the underlying
story relationships. Structural hubs and chapters without a Visit reference
have no stop-specific relationship.

When a stop Experience contains exactly one published Moment with a distinct
title, its Atlas card leads with that Moment title and retains the Experience
title as context. Multi-Moment Experiences keep their Experience title. The
stop relationship also carries the canonical Moment projection, including its
registered media, so the primary Atlas inspector can render that content
inline without creating another record or copying prose. The compact card and
the shared Journey story remain available as the nested comparison path.

`src/components/JourneyStoryBody.vue` renders the canonical Journey chapters,
locations, published Experiences and Moments, and media for both
`RoamTripOverview.vue` and the in-Atlas reader. Atlas does not copy narrative
or media into a second content shape. The exact Atlas node ID added to a trip
location remains navigation identity. The stop-to-chapter relationship comes
from the canonical Visit reference, not from matching a Place slug or map
node.

The Atlas reader is presentation state on the existing selected-node route,
expressed by `?story=1`. `AtlasView.vue` keeps the single `AtlasMap.vue`
instance mounted while `AtlasStoryReader.vue` replaces the inspector. The
reader uses the same projected trip body, preserves browser history and local
scroll positions, and applies temporary `noindex,follow` metadata so the
standalone `/trips/:id` page remains the indexable representation. A validated
`section` query can land on a derived Journey chapter ID or an explicitly
related Experience anchor. Fresh section entries focus that section heading,
while browser-history restoration retains its saved offset. Embedded videos
defer media requests until playback; the standalone Journey renderer retains
metadata preload. The full mobile sheet is a named modal dialog, while mobile
map peek and the desktop split pane expose the reader as a named nonmodal
region. Ads,
lodging and planning offers, Partner cards, and affiliate Gear links remain
outside the embedded reader.

Mobile Atlas detail presentation removes redundant Journey labels, uses a
passive bottom fade for scroll affordance, and places the selected-place Save
state and total saved count in the bottom dock. The root route now renders the
same Atlas projection as `/atlas`; it introduces no alternate content model.
The feature-gated My Atlas toolbar action links to the separate private route
and does not merge private account state into public Atlas records.

Published Experiences are projected into their Journey page. Their stable
deep link is `#experience-<slug>`. Published Moments retain explicit append
order and their own Media set. `Travel Date / Range` is shown as supplied
evidence but does not silently reorder Moments or manufacture exact dates.
Draft Experiences, Moments, and placements are excluded from public selectors.

Sheet-authored Moment copy has two deliberately separate fields. `Atlas Notes`
is private source evidence and is never projected as public prose. `Atlas
Story` is the reviewed public draft. Preview regenerates it from the private
notes, the complete storytelling framework, the relevant owner travel-context
section, canonical Journey and Place identity, and media counts only. Publish
does not call a model. It requires and ingests the current `Atlas Story` when
the row names an Experience. A blank Experience remains a media-only Journey
or Visit contribution and creates neither a Story nor a Moment.

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
rule. The same validator scans public source under `src` and `public`, rejects
Unicode dash punctuation, and rejects decorative eyebrow or kicker treatments
in Vue components. Functional labels such as dates, form state, map controls,
and account status remain allowed when they supply information that the heading
does not. `npm run build` runs content validation first.

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

`Atlas Place` selects the physical destination that owns a row. `Atlas
Experience` selects or creates the story within that destination. A selected
Place may be a Journey root or a descendant at any depth. A new physical pin
must first be registered with its intended parent Place. A row that should not
expose a precise pin stays bound to the appropriate broader Place. Changing a
row's Place does not silently move an existing Experience or its media. That
reassociation is an explicit reviewed migration, after which later rows must
select the Experience's new Place.

`Atlas Coordinates` is the explicit new-Place pin input. It uses `latitude,
longitude`, the order shown by Google Maps. Place registration converts that
cell to the canonical `[longitude, latitude]` storage contract and writes a
normalized value back to the row. Existing Places ignore row coordinates and
retain their canonical position, preventing one post from moving a shared pin.

`Atlas Stop` explicitly classifies whether a row represents a physical Place
that should become a map pin. `Yes` is required for explicit Place
registration. `No` means the row remains an Experience or Moment inside its
selected Place and does not create geography. This classification does not
move an existing Place or hide its shared pin. Parent Place identity determines
nesting, and canonical coordinates determine marker position.

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
Preview calls the OpenAI Responses API only for rows with an Experience,
validates the structured result, rechecks the unchanged stable row, and
overwrites only `Atlas Story`. It then plans generated Media and editorial
records without R2, GitHub, tracked-content, deployment, or publication-status
writes. Apply uses the reviewed Sheet story and verified R2 receipts, creates
or reuses an Experience, upserts one stable Moment for the Post, validates the
generated pair, and then hands only those machine-owned shards to the isolated
Git publisher. A blank Experience leaves the media at Journey or Visit scope
rather than inventing one. The publisher does not infer missing geography.

`editorial:register:place` is the separate explicit geography boundary. The
selected row must contain `Atlas Place = New Place`, put the requested name in
`Location`, set `Atlas Stop = Yes`, and keep `Atlas Mode = Off`. Preview
resolves the Journey and produces the proposed canonical IDs, order,
coordinates, public summary, Visit, and Atlas pin without writes. Apply
updates only `src/content/geography/generated/records.json`, validates and
builds it, promotes it through the protected develop and main branches,
verifies the rendered Atlas URL, refreshes both Sheet lookup tabs, and replaces
the request with the registered Place plus hidden Journey, Place, and Visit
IDs. A matching existing Place is reused when only its Visit is missing. A new
Place requires an explicit parent, verified `Atlas Coordinates`, and public
summary. The command line longitude and latitude pair is an explicit recovery
override. Visit order is explicit through `--after-place` or defaults to the
Journey end; a display date never silently determines route order.

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

## Local curated experience intake and cards

The Experience composition root now combines the existing Sheet-generated
shard with `src/content/experiences/curated.json`. Curated authoring reuses exact
Journey/Visit/Place IDs and cannot collide with generated identities or slugs.
Its importer previews by default, validates public copy, requires firsthand
source references for publication, strips private references and publishes
atomically only with `--publish`. Missing prior records are refused; draft
visibility withdraws a record. Registry changes invalidate stale previews.
No generated Sheet record or media association is rewritten by this command.

The curated contract permits an optional confirmed independent trip-operator
Partner reference already linked to the exact Visit, and an owned cover image already published there.
Raw operator URLs, affiliate/sponsor links, unregistered media and private
My Atlas recaps are excluded from this intake. Shared selectors project compact
cards with explicit public fields, and `EditorialExperienceCard.vue` renders
both the Journey story header and exact Atlas stop context. Existing publication
gates and story-section anchors are preserved. The curated shard remains empty;
actual Split/Raptor operator and media acceptance is not claimed. This slice
has local test/browser verification only and is not deployed.
