---
id: atlas-integrated-story-reader-phase-6-2026-11-18
title: Atlas Integrated Story Reader Phase 6 Atlas First Shell 2026-11-18
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-18
updated: 2026-11-18
related:
  - atlas-integrated-story-reader
  - atlas-integrated-story-reader-phase-5-2026-11-18
  - my-atlas-account-state
supersedes: []
superseded_by: []
code_paths:
  - src/App.vue
  - src/router/index.js
  - src/features/atlas/routes.js
  - src/features/atlas/views/AtlasView.vue
  - src/features/my-atlas/config/featureFlags.mjs
  - src/utils/analytics.mjs
  - scripts/test-atlas-story-discovery.mjs
  - scripts/test-analytics.mjs
  - docs/audits/assets/atlas-story-phase6-root-mobile.png
verification:
  state: verified
  evidence:
    - npm run atlas:test
    - npm run analytics:test
    - npm run lint
    - npm run docs:audit
    - npm run build
    - Local Chrome root, My Atlas, Back, mobile, and desktop checks from 320 through 1280 CSS pixels
---

# Atlas integrated story reader Phase 6 Atlas first shell

The public root now renders the same lazy Atlas view as `/atlas` without an
intermediate redirect or marketing homepage. Existing `/atlas`, Journey,
Place, story, and browser history routes remain available. The obsolete Home
component and its router registration are removed.

## My Atlas entry

Feature-enabled builds expose one `My Atlas` action in the Atlas toolbar. The
action uses the same `isMyAtlasGeographicProofEnabled` gate as the private
route registration, so a disabled build exposes neither the route nor a dead
link. The action enters `/my-atlas`, and browser Back returns to the Atlas at
the original root URL.

My Atlas remains a separate private application surface. This phase does not
merge its owner state, authentication, planning data, or analytics into the
public Atlas projection.

## Analytics boundary

The retired homepage no longer emits distinct primary and card entry values.
The controlled Atlas entry vocabulary now contains `atlas_direct` for root
map loads and `trip_story` for explicit Journey story links. No private My
Atlas activity is added to public analytics.

## Browser evidence

With the My Atlas feature flag enabled, Chrome at 390 by 844 CSS pixels loaded
`/` and retained that URL while rendering `.atlas-page`, not the former Home
surface. The My Atlas action linked to `/my-atlas`, navigation rendered the
private proof surface, and Back restored the root Atlas and toolbar action.
The toolbar stayed within its 6 to 384 pixel bounds with no horizontal
overflow.

At 320 by 720 CSS pixels, My Atlas, Surprise, and Saved occupied distinct
nonoverlapping control bounds and the document had no horizontal overflow. At
1280 by 900 CSS pixels, the root URL still rendered Atlas, the My Atlas action
remained visible, and horizontal overflow was zero.

- [Mobile Atlas first root](assets/atlas-story-phase6-root-mobile.png)

## External review

No production deployment is claimed. Owner real-device review and production
analytics verification remain external work.
