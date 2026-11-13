# Travel Atlas feature

This directory is a self-contained, lazy-loaded vertical slice of the
interactive travel atlas. The initial content uses existing Utah and Moab
photography because the repository does not currently contain a verified Split,
Croatia media set.

## Isolation boundary

The feature owns its routes, map configuration, content, persistence,
components, and styles under `src/features/atlas/`. Existing trip components
and `src/data/trips.js` are not imported or modified.

The only application-level integration points are:

1. `src/router/index.js` imports and spreads `atlasRoutes` before the catch-all
   route.
2. `src/App.vue` renders routes with `meta.standalone` without the legacy site
   chrome.
3. `package.json` includes the lazily loaded `maplibre-gl` dependency and a
   narrow transitive override that preserves the project's Node 20 support.
4. The Pages workflow exposes the optional `MAPTILER_API_KEY` repository secret
   as `VUE_APP_MAPTILER_KEY` during the build.

Removing those integration lines and deleting this directory completely
removes the atlas without changing the existing routes or content.

## Routes

- `/atlas` opens the atlas landing view.
- `/atlas/utah` opens the Utah destination directly.
- `/atlas/moab` and the location IDs in `data/atlasData.js` are shareable deep
  links.

The route is lazy-loaded, so MapLibre and atlas code are not downloaded by
visitors who only use the existing site.

MapLibre 6 requires an explicit worker URL when bundled with webpack. The map
component uses `setWorkerUrl(new URL(..., import.meta.url))`, which makes Vue
CLI emit the worker as a JavaScript asset. Do not remove that setup: otherwise
the worker URL resolves against the current `/atlas/...` route and receives the
SPA HTML fallback instead of executable JavaScript.

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

Add a node to `data/atlasData.js` with a unique ID, verified coordinates,
camera settings, existing media URLs, and optional actions. Connect it using
`parentId`, `childIds`, and `relatedIds`.

Do not add unverified business information. Only include website, directions,
phone, or booking actions when the source has been confirmed. The `actions`
array is deliberately separate from map rendering so future commercial or
affiliate behavior does not enter the map engine.

## Persistence

Favorites, recently explored IDs, and the most recent camera context use the
versioned key `roamwithjustin.atlas.v1` in `localStorage`. Invalid or unavailable
storage falls back to an empty state and does not prevent exploration.
