---
id: atlas-feature
title: Travel Atlas Feature
kind: architecture
status: implemented
implementation_state: complete
updated: 2026-11-14
related:
  - content-model
supersedes: []
superseded_by: []
code_paths:
  - src/features/atlas
  - src/content/atlas
  - src/content/selectors/atlas.js
verification:
  state: verified
  evidence:
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
- `/atlas/utah`, `/atlas/puerto-rico`, and `/atlas/st-john` open registered
  destination roots directly.
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
their coordinate points remain visible; cards return when movement ends.

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
MapTiler.

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

## Persistence

Favorites, recently explored IDs, and the most recent camera context use the
versioned key `roamwithjustin.atlas.v1` in `localStorage`. Invalid or unavailable
storage falls back to an empty state and does not prevent exploration.
