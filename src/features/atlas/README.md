---
id: atlas-feature
title: Travel Atlas Feature
kind: architecture
status: implemented
implementation_state: complete
updated: 2026-11-15
related:
  - content-model
supersedes: []
superseded_by: []
code_paths:
  - src/features/atlas
  - src/content/atlas
  - src/content/atlas/preview-presentation.mjs
  - src/content/selectors/atlas.js
verification:
  state: verified
  evidence:
    - npm run adsense:test
    - npm run atlas:test
    - npm run content:validate
    - npm run build
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
3. `package.json` includes the lazily loaded `maplibre-gl` dependency and a
   narrow transitive override that preserves the project's Node 20 support.
4. The Pages workflow exposes the optional `MAPTILER_API_KEY` repository secret
   as `VUE_APP_MAPTILER_KEY` during the build.

Canonical content is also consumed by trip views, so deleting this feature
would remove the Atlas UI but must not delete `src/content/` records.

## Routes

- `/atlas` opens the atlas landing view.
- `/atlas/utah`, `/atlas/utah-2026`, `/atlas/puerto-rico`, `/atlas/st-john`,
  `/atlas/europe`, and `/atlas/costa-rica` open multi-stop journey roots.
- `/atlas/miami-south-beach`, `/atlas/north-georgia-blue-ridge`,
  `/atlas/peoria-illinois`, and `/atlas/hungary` open bounded coming-soon
  destination roots.
- `/atlas/moab`, `/atlas/old-san-juan`, and other IDs registered in
  `src/content/atlas/presentation.mjs` are shareable deep links.

The route is lazy-loaded, so MapLibre and atlas code are not downloaded by
visitors who only use the existing site.

The atlas brand uses a normal document link back to `/`. This deliberately
reloads the legacy Materialize homepage instead of swapping the legacy and
standalone application layouts during the same Vue render cycle.

MapLibre 6 requires an explicit worker URL when bundled with webpack. The map
component uses `setWorkerUrl(new URL(..., import.meta.url))`, which makes Vue
CLI emit the worker as a JavaScript asset. Do not remove that setup: otherwise
the worker URL resolves against the current `/atlas/...` route and receives the
SPA HTML fallback instead of executable JavaScript.

## Marker behavior

Each marker is rendered as two synchronized MapLibre markers. Its numbered
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

## Map configuration

Without configuration, the atlas uses the MapLibre demonstration basemap and
displays a `Preview basemap` indicator. This keeps local development and pull
request previews functional.

For the default MapTiler `hybrid-v4` satellite imagery and terrain, create a
MapTiler browser key and set:

```text
VUE_APP_MAPTILER_KEY=your_browser_key
```

For local development, put the value in an uncommitted `.env.local`. For
GitHub Pages, add it as the repository Actions secret `MAPTILER_API_KEY`.
Restrict the browser key to the production and local-development origins in
MapTiler. Store only the key itself: do not include quotes or leading/trailing
whitespace. The application trims accidental surrounding whitespace before it
constructs MapTiler requests, but keeping the secret clean makes deployment
configuration easier to audit.

If production displays `Map unavailable`, inspect the failed `style.json`
request in browser developer tools. A `401` or `403` response means the key is
invalid, expired, or does not allow the current production origin. Confirm the
GitHub Actions `MAPTILER_API_KEY` secret and the key's allowed origins in
MapTiler, then rerun the Pages deployment.

An optional custom MapTiler style can be supplied locally with:

```text
VUE_APP_MAPTILER_STYLE_URL=https://api.maptiler.com/maps/your-style/style.json?key=your_browser_key
```

## Adding content

Add factual identity and coordinates to the appropriate canonical Place,
Journey/Visit, and Media modules. Add only Atlas-specific grouping/camera
choices to `src/content/atlas/presentation.mjs`, then register a destination
root in `src/content/atlas/roots.mjs` when needed. Child relationships are
derived from `parentId`; guided order comes from Journey visit order rather
than a hand-maintained `childIds` array.

Do not add unverified business information. Only include website, directions,
phone, or booking actions when the source has been confirmed. External actions
are derived from canonical Place/Journey links and remain separate from map
rendering so commercial or affiliate behavior does not enter the map engine.

Confirmed but incomplete Journeys are registered through
`src/content/atlas/preview-presentation.mjs`. Their real coordinates and public
Place summaries remain visible, and their top-level navigation cards use the
reader-facing `Journey preview` cue. Missing material stays absent instead of
rendering an empty section or an editorial workflow message. Planned-only
stops are excluded. The validator requires every internally incomplete Journey
Visit to resolve to an Atlas node so later media ingestion enriches stable IDs
instead of creating a parallel map record.

Every Atlas root uses the canonical Journey title and date label, including
its year, because the same Place can host multiple trips. Child nodes use their
canonical Place names and local labels without repeating the Journey year.

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
