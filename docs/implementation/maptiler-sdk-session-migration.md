---
id: maptiler-sdk-session-migration
title: MapTiler SDK JS Session Migration
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-19
updated: 2026-11-19
related:
  - atlas-integrated-story-reader
  - my-atlas-geography
  - my-atlas-account-state
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - package.json
  - package-lock.json
  - scripts/test-maptiler-sdk.mjs
  - src/features/atlas/config/mapConfig.js
  - src/features/atlas/components/AtlasMap.vue
  - src/features/atlas/views/AtlasView.vue
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/views/MyAtlasPublicView.vue
verification:
  state: verified
  evidence:
    - npm run atlas:test
    - npm run lint
    - npm run build
    - Built lazy Atlas chunk contains the MapTiler SDK session identifier request path
    - Local headless Chrome verified Atlas, Utah Journey, and My Atlas in one continuous SDK session with every chargeable tile request carrying one shared mtsid
    - Local headless Chrome verified MapTiler canvas, terrain control, markers, and zero horizontal overflow at desktop and 390 by 844 mobile widths
---

# MapTiler SDK JS session migration

The curated Atlas and My Atlas now use the official MapTiler SDK JS browser
runtime. The application no longer declares or imports `maplibre-gl` directly.
MapTiler SDK JS retains its own compatible rendering core internally, so its
generated DOM continues to use `maplibregl-*` class names. The scoped CSS
selectors for those SDK generated elements remain necessary and do not select
the billing model.

The migration is a cost boundary. `maptilersdk.config.session` is explicitly
set to `true`, which keeps MapTiler Cloud map traffic on the SDK session model.
Persistent SDK caching is also enabled. Both map experiences share the same
configuration module, API key, hybrid style, terrain setup, and session state.

## Implemented and locally verified

- [x] Replace the direct `maplibre-gl` dependency with `@maptiler/sdk` 4.2.1.
- [x] Remove the application-owned MapLibre worker URL setup.
- [x] Construct both interactive maps with `mapTilerSdk.Map`.
- [x] Use the SDK hybrid style, terrain, navigation, and attribution options.
- [x] Explicitly retain session tracking and persistent MapTiler request cache.
- [x] Remove the MapLibre demonstration basemap fallback and fail closed when a
      MapTiler browser key is absent.
- [x] Preserve existing marker, popup, bounds, camera, route, planner, and
      accessibility behavior through the SDK compatible API.
- [x] Update owner and public attribution copy to name MapTiler SDK JS.
- [x] Add a regression test that rejects a new direct MapLibre dependency,
      import, worker URL, terrain source, or demo tile fallback.
- [x] Compile the production Vue bundle with the new lazy SDK chunk.

## Browser verification

- [x] Inspect real browser map requests and confirm one shared `mtsid` session
      identifier is attached to chargeable MapTiler Cloud tile traffic.
- [x] Confirm Atlas, a selected Journey, and My Atlas retain their expected map
      canvas, controls, terrain, markers, route transition, and mobile layout.
- [ ] Promote through protected develop and main pull requests.
- [ ] Verify the live production bundle and browser request model.

One continuous local Chrome session opened the root Atlas, selected the Utah
Journey, and navigated to My Atlas. The final network capture observed 29
chargeable tile requests. All 29 carried `mtsid`, and all shared one session
identifier. The only MapTiler request without `mtsid` was the TileJSON
bootstrap request, which MapTiler documents as a free request. Requests
canceled by the single page application route transition were not counted as
successful responses, but their session parameters remained present.

The same pass rendered one map canvas and one terrain control in each map,
three Atlas markers, three Utah coordinate pins, and no component error. The
My Atlas mobile check at 390 by 844 CSS pixels retained its canvas, hid its
desktop-only controls, and produced zero horizontal overflow.

## Operational boundary

`VUE_APP_MAPTILER_KEY` remains required and must be restricted to approved
production and local origins. The runtime uses the SDK `MapStyle.HYBRID`
reference so the key and session identifier are managed centrally rather than
being repeated in hand-built style, tile, and terrain URLs.
