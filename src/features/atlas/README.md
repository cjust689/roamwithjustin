---
id: atlas-feature
title: Travel Atlas Feature
kind: architecture
status: implemented
implementation_state: complete
updated: 2026-11-26
related:
  - content-model
  - atlas-integrated-story-reader
  - maptiler-sdk-session-migration
supersedes: []
superseded_by: []
code_paths:
  - src/features/atlas
  - src/router/index.js
  - src/features/my-atlas/config/featureFlags.mjs
  - src/content/atlas
  - src/content/geography
  - src/content/atlas/preview-presentation.mjs
  - src/content/selectors/atlas.js
  - src/components/JourneyStoryBody.vue
  - src/features/atlas/components/AtlasStoryReader.vue
verification:
  state: verified
  evidence:
    - npm run adsense:test
    - npm run atlas:test
    - npm run lint
    - npm run content:validate
    - npm run build
    - GitHub pull request 38 validated and merged to develop as c75d8d9 on 2026-11-16
    - GitHub pull request 39 validated and merged to main as a36da55 on 2026-11-16
    - Pages workflow run 43816272856 succeeded on 2026-11-16
    - sparse-Journey chooser and panel behavior verified in production on 2026-11-16
    - local Chrome story discovery checks at 320, 375, 390, 768, 1024, and 1440 CSS pixels on 2026-11-18
    - local Chrome in-place reader, retained map, Back and Forward, scroll restoration, map peek, stop handoff, and lightbox checks on 2026-11-18
    - local Chrome accessibility tree checks for mobile modal, map peek region, and desktop region semantics on 2026-11-18
    - local Chrome mobile detail checks at 320 and 390 CSS pixels on 2026-11-18
    - local Chrome direct root Atlas and feature-gated My Atlas handoff checks at 320, 390, and 1280 CSS pixels on 2026-11-18
    - pull requests 287 and 288 plus Pages run 45898969341 deployed all ten Journey story leads and exact incomplete-Journey Experience projection on 2026-11-26
    - live Chrome rendered both Uvita Experience cards after the progressive Journey deployment on 2026-11-26
    - npm run atlas:test verified Uvita Horses and Uvita House as the single-Moment card titles while retaining parent Experience context
    - local Chrome at 2000 by 1600 CSS pixels rendered the full Uvita Horses narrative and video followed by Uvita House inside the selected Uvita inspector
    - local Chrome MapTiler SDK session check across Atlas, the Utah Journey, and My Atlas on 2026-11-19 found one shared session identifier and no chargeable tile request without mtsid
    - local Chrome MapTiler SDK layout check on 2026-11-19 retained both map canvases, terrain controls, Journey markers, and zero horizontal overflow at desktop and 390 by 844 mobile widths
    - Pull requests 188 and 189 passed validation runs 44628906987 and 44629509687, merged through develop and main, and Pages run 44629848589 deployed the official SDK runtime
    - Live Chrome on 2026-11-19 observed 75 chargeable tile requests across Atlas, a Journey, and My Atlas with zero missing mtsid values and one shared session identifier
---

# Travel Atlas feature

This directory contains the lazy-loaded interactive Atlas UI, route, map
configuration, and browser persistence. Its content is projected from the
canonical records under `src/content/` rather than owned by this feature.

## Isolation boundary

The feature owns its route, map configuration, persistence, components, and
styles under `src/features/atlas/`. Canonical Media, Places, Journeys, and
Atlas presentation live under `src/content/`; `src/content/selectors/atlas.js`
builds the UI-facing Atlas records.

The only application-level integration points are:

1. `src/router/index.js` imports and spreads `atlasRoutes` before the catch-all
   route.
2. `src/App.vue` renders routes with `meta.standalone` without the legacy site
   chrome.
3. `package.json` includes the lazily loaded official `@maptiler/sdk`
   dependency. The application does not declare or import `maplibre-gl`
   directly.
4. The Pages workflow exposes the optional `MAPTILER_API_KEY` repository secret
   as `VUE_APP_MAPTILER_KEY` during the build.

Canonical content is also consumed by trip views, so deleting this feature
would remove the Atlas UI but must not delete `src/content/` records.

## Routes

- `/` renders the Atlas landing view directly without a redirect.
- `/atlas` opens the atlas landing view.
- `/atlas/utah`, `/atlas/utah-2026`, `/atlas/puerto-rico`, `/atlas/st-john`,
  `/atlas/europe`, and `/atlas/costa-rica` open multi-stop journey roots.
- `/atlas/miami-south-beach`, `/atlas/north-georgia-blue-ridge`,
  `/atlas/peoria-illinois`, and `/atlas/hungary` open bounded sparse
  destination roots.
- `/atlas/moab`, `/atlas/old-san-juan`, and other IDs registered in
  `src/content/atlas/presentation.mjs` are shareable deep links.
- `?story=1` opens a Journey's secondary in-Atlas reader state on the same
  selected-node route. Invalid or unavailable story state is removed.

The Atlas view remains a lazy route component, but the root application now
selects it immediately so visitors enter the map experience without a separate
marketing surface.

The atlas brand uses a normal document link back to `/`, which resets the
Atlas to its root Journey explorer.

MapTiler SDK JS owns its rendering worker and resource URL handling. The
application does not set a MapLibre worker URL. The SDK remains inside the
lazy Atlas route chunk so nonmap routes do not pay its download cost.

## Marker behavior

Each marker is rendered as two synchronized MapTiler SDK markers. Its numbered
coordinate point uses map pitch/rotation alignment and subpixel positioning,
so it remains attached to the canonical Place coordinate and Journey route
while the map turns. Its card stays viewport-aligned so the title remains
readable. During camera movement, non-selected cards fade temporarily while
their coordinate points remain visible. After movement ends, marker DOM is
rebuilt on the second paint frame so every card returns at its final projected
coordinate. Atlas marker elements must remain absolutely positioned; putting
them back into document flow causes each card to inherit cumulative vertical
drift from the markers before it.

Below zoom `12.25`, nearby unselected stops are grouped by projected screen
distance so fixed-size labels do not stack over one another. A cluster is a
display-only map affordance: it does not create or alter a Place. Selecting a
cluster fits its member coordinates and expands back to individual markers.
Selecting an individual leaf pin centers its canonical coordinate at a minimum
zoom of `15.5`; destination/root selections retain their broader configured
camera. The pure clustering and focus-camera rules live in
`config/markerLayout.mjs` and are covered by `npm run atlas:test`.

`Surprise me` randomly chooses among mapped child places belonging to published
Journeys. Journey roots are not destinations for this control. It excludes
internally incomplete Journey previews, avoids the currently open place, and
avoids immediately repeating the previous surprise when another completed
place is available. The selection rule lives in `config/surpriseSelection.mjs`
and is covered by `npm run atlas:test`.

## Map configuration

The map fails closed when no MapTiler browser key is configured. It does not
fall back to a third-party demonstration basemap or silently change the usage
model.

For the default MapTiler SDK hybrid satellite imagery and terrain, create a
MapTiler browser key and set:

```text
VUE_APP_MAPTILER_KEY=your_browser_key
```

For local development, put the value in an uncommitted `.env.local`. For
GitHub Pages, add it as the repository Actions secret `MAPTILER_API_KEY`.
Restrict the browser key to the production and local-development origins in
MapTiler. Store only the key itself: do not include quotes or leading/trailing
whitespace. The application trims accidental surrounding whitespace before it
configures the SDK, but keeping the secret clean makes deployment configuration
easier to audit.

The shared configuration explicitly enables MapTiler SDK session tracking and
persistent request caching. The SDK adds the session identifier to MapTiler
Cloud map traffic, so interactive tile and terrain use follows MapTiler's
session model rather than third-party request billing.

If production displays `Map unavailable`, inspect the failed `style.json`
request in browser developer tools. A `401` or `403` response means the key is
invalid, expired, or does not allow the current production origin. Confirm the
GitHub Actions `MAPTILER_API_KEY` secret and the key's allowed origins in
MapTiler, then rerun the Pages deployment.

## Adding content

Existing curated records can still be added to the appropriate canonical
Place, Journey/Visit, and Media modules. A missing Place beneath an existing
Journey also has an explicit Sheet-backed route: put its name in `Location`,
choose `New Place` in `Atlas Place`, keep `Atlas Mode = Off`, then preview and apply
`editorial:register:place`. The command writes the generated geography shard,
adds the Visit and child Atlas pin, deploys it through protected branches,
refreshes the Sheet Catalog, and binds the row. Ordinary post publication never
creates geography from a Location label.

Add only Atlas-specific grouping/camera choices to
`src/content/atlas/presentation.mjs`, then register a destination root in
`src/content/atlas/roots.mjs` when needed. Child relationships are derived from
`parentId`; guided order comes from Journey visit order rather than a
hand-maintained `childIds` array. Generated Visits use the explicit
`--after-place` registration option or append to the Journey; dates do not
silently determine order.

Do not add unverified business information. Only include website, directions,
phone, or booking actions when the source has been confirmed. External actions
are derived from canonical Place/Journey links and remain separate from map
rendering so commercial or affiliate behavior does not enter the map engine.

Atlas media strips render video entries as dedicated `Play video` tiles rather
than borrowing the Place hero as a poster. This prevents a photograph and a
video from appearing to be duplicate items. An explicitly registered video
poster is reserved for the opened video player; a missing poster remains empty.

Confirmed but incomplete Journeys are registered through
`src/content/atlas/preview-presentation.mjs`. Their real coordinates, public
Place summaries, root Journey entries, and available story content remain
visible. A natural update note explains that more places, stories, photographs,
and films will be added. Missing material stays absent instead of rendering
empty sections or editorial workflow language in cards or panels. Planned-only
stops are excluded. The validator requires every internally incomplete Journey
Visit to resolve to an Atlas node so later media ingestion enriches stable IDs
instead of creating a parallel map record.

Every Atlas root uses the canonical Journey title and date label, including
its year, because the same Place can host multiple trips. Child nodes use their
canonical Place names and local labels without repeating the Journey year.

## Story discovery

Every Journey root derives a story lead from the same canonical Journey used
by `/trips/:id`. The lead reuses its real title, overview, hero, public story
ID, and route, and appears before the ordered stop list. `View N stops` scrolls
the existing detail container to those stops. External map and official Place
actions appear after editorial media under `Useful links`.

Incomplete Journeys expose the same story route and toolbar action as completed
Journeys. Their root detail and shared story body include an update note that
sets an honest expectation without showing internal workflow language.

Child stops derive specific story relationships from canonical Visit edges.
Journey chapter matches come from
`days[].visits[].visitId`, so one Visit can appear in several chapters and two
Visits at one Place stay distinct. Published Experiences join only when their
`visitId` and `placeId` both match, regardless of the containing Journey's
publication state. Structural hubs and Journey-only chapters with no Visit
references do not receive a preview.

A stop card for an Experience with one distinctly titled Moment leads with the
Moment title and shows the parent Experience title as context. This keeps Sheet
entry names recognizable at the stop without flattening the canonical
Experience and Moment relationship. Multi-Moment cards retain the Experience
title.

The primary stop inspector also renders every matched Moment's text and
registered media inline. Visitors selecting a location can therefore read and
play its available Experiences in the same scrolling panel without another
reader action. The compact Experience cards and exact in-Journey reader links
remain below that inline presentation as a comparison path. Both presentations
consume the same selector projection, so this hoisting does not create a second
copy of the story.

`Explore the story` now adds `?story=1` to the selected Atlas route and mounts
`AtlasStoryReader.vue` without replacing `AtlasView.vue` or `AtlasMap.vue`.
`JourneyStoryBody.vue` is shared with the standalone `/trips/:id` page and
renders the same canonical chapters, locations, Experiences, Moments, and
media. The Atlas variant omits ads and commercial modules. Temporary
`noindex,follow` metadata leaves the standalone page as the indexable story.

The desktop reader occupies a bounded pane beside the retained map. Mobile
uses a full-width focused sheet with a deliberate map peek toggle. Reader and
inspector scroll offsets survive browser Back and Forward, exact `Show on map`
actions can open an existing stop, and browser Back restores the reader. A
stop preview opens the exact shared-body chapter or Experience through the
validated `section` route value. Previous and next stop actions use the
canonical guided Journey order and do not introduce another route sequence.

The focused mobile sheet exposes a named modal dialog and contains keyboard
focus. Map peek changes that same reader to a named nonmodal region, which is
also the role used by the desktop split pane.

Fresh exact-section entries focus the requested heading after their bounded
initial scroll pass. Pointer, touch, wheel, or reader navigation-key input
cancels that pass so restoration never fights an early visitor action. A
browser-history offset still takes precedence when returning to the reader.
Embedded story videos use `preload="none"`; the public standalone story keeps
metadata preload. The desktop reader uses a 46 percent starting width and a
720 pixel maximum so the active map remains the larger context on wide screens.

The mobile panel retains one vertical scroll container. Extra bottom content
clearance keeps the final utility actions above the dock and temporary scroll
fade, while the dock title wraps instead of forcing a single ellipsized line.
The photography rail remains an intentional horizontal carousel with a partial
next item as its swipe cue.

The mobile detail fade is passive and contains no textual scroll pill. Journey
category and trip eyebrow labels are omitted when the guided control already
provides that context. SVG disclosure chevrons replace platform-dependent
glyphs. While a mobile detail drawer is present, the selected place's bottom
Save control carries the total saved count and the duplicate toolbar Saved
control is hidden. At the Atlas root, the toolbar control remains available to
open the saved-place drawer.

When `VUE_APP_ENABLE_MY_ATLAS_GEOGRAPHIC_PROOF=true`, the Atlas toolbar exposes
one `My Atlas` link to `/my-atlas`. The same flag owns route registration, so a
disabled build cannot expose a dead control. My Atlas remains a separate
private application boundary; the toolbar entry does not mix its account data
into public Atlas state.

The same feature flag enables a dismissible Atlas invitation that says `Make
your own Atlas` and links to `/my-atlas`. It appears outside story-reader state
once per browser tab, records dismissal in `sessionStorage`, and moves clear of
the desktop inspector and mobile detail dock.

## Persistence

Favorites, recently explored IDs, and the most recent camera context use the
versioned key `roamwithjustin.atlas.v1` in `localStorage`. Invalid or unavailable
storage falls back to an empty state and does not prevent exploration.

## Optional guided Journey advertising

Atlas advertising is independent of the story placement and disabled by
default. It uses the shared manual `AdSlot` only after a visitor arrives at
three distinct stops through the guided Journey player. The Journey must have
at least five mapped stops, and the current stop must be published, contain at
least 180 characters across its summary and personal note, and own at least one
media item.

The unit renders inside the stop's editorial detail content, below its notes
and media and above its actions. It never renders on the map canvas, markers,
free exploration, incomplete Journeys, thin stops, or beside the guided
Previous and Next controls. The key
`roamwithjustin.adsense.atlas.v1.<journey-id>` in `sessionStorage` reserves the
single allowed request for that Journey and tab. If storage is unavailable,
the Atlas ad fails closed. Replaying or revisiting stops does not request a new
unit.

Eligibility and session reservation live in
`config/atlasAdEligibility.mjs`. Production activation additionally requires
`VUE_APP_ADSENSE_ATLAS_ENABLED=true` and a numeric
`VUE_APP_ADSENSE_ATLAS_SLOT_ID`; the shared privacy, Auto ads, publisher, and
ads.txt gates remain in force.
