---
id: atlas-integrated-story-reader-phase-0-2026-11-18
title: Atlas Integrated Story Reader Phase 0 Audit 2026-11-18
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-18
updated: 2026-11-18
related:
  - atlas-integrated-story-reader
  - content-model
  - atlas-content-strategy
  - storytelling-framework
supersedes: []
superseded_by: []
code_paths:
  - src/content/selectors/projections.mjs
  - src/content/selectors/trips.js
  - src/features/atlas/views/AtlasView.vue
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/views/roam/RoamTripOverview.vue
  - src/router/index.js
  - docs/audits/assets/atlas-story-phase0-before-mobile.png
  - docs/audits/assets/atlas-story-phase0-before-desktop.png
verification:
  state: verified
  evidence:
    - Repository source and canonical selector audit on 2026-11-18
    - Local Chrome baseline at 390 by 844 and 1440 by 1000 pixels
---

# Atlas integrated story reader Phase 0 audit

This audit records the source verified before the story discovery change. It
does not treat the owner brief as implementation evidence.

## Actual source and flow

| Concern | Verified source | As built before Phase 1 |
| --- | --- | --- |
| Canonical Journey story | `src/content/journeys/`, composed by `src/content/journeys/index.mjs` | Journeys own the title, overview, ordered Visits, chapter summaries, hero, gallery, and publication state. |
| Atlas projection | `src/content/selectors/projections.mjs` | `buildAtlasNodeView()` combines Journey, Place, Visit, and Media. `atlasActions()` added `Read the trip story` to every node whenever the Journey had a slug. |
| Atlas state and map | `src/features/atlas/views/AtlasView.vue` | One mounted `AtlasMap` is retained while the route parameter and detail panel change. The selected node is the route state. Favorites, recent items, and camera context use Atlas browser storage. |
| Journey inspector | `src/features/atlas/components/AtlasDetailPanel.vue` | The panel rendered hero, overview, trip note, stops, related places, media, an optional guided ad, then all actions with equal visual weight. |
| Standalone story | `src/views/roam/RoamTripOverview.vue` through `src/content/selectors/trips.js` | `/trips/:id` renders the Journey hero, chapter summaries, locations, Experiences, Moments, media, notes, lodging, and commercial sections from the same canonical projections. It is a full page layout rather than a reusable story body. |
| Analytics | `src/features/atlas/views/AtlasView.vue` | Atlas story links use `atlas_story_opened`. A client routed story open also receives the normal route title and page measurement behavior. |

## Story availability

The source audit found three published Journeys with resolved covers and
substantive chapter bodies:

- `utah-winter-2025`, eight chapter records, eleven Visits, and forty three
  projected media items.
- `puerto-rico-2024`, six chapter records, seventeen Visits, and fifty eight
  projected media items.
- `usvi-st-john-2025`, seven chapter records, ten Visits, and fifty nine
  projected media items.

The other seven Journeys retain the internal incomplete publication state.
Some have useful overview text, media, or one generated Experience, but none
has a published full Journey story under the existing route contract. The old
slug-only rule nevertheless exposed a story action for every one of them.

No current generated Experience supplies a published stop-specific chapter
for the three published Journey roots. This audit initially treated that as
the absence of a canonical relationship. Phase 3 corrected that conclusion:
the older Journey structure already records explicit
`days[].visits[].visitId` edges. Those references safely relate a Visit to one
or more Journey chapters without inferring a relationship from geography.

## Clipping and scroll findings

The detail panel has one vertical scroll container. The stop list is not a
nested vertical scroller, and the photography rail is deliberately horizontal
with each item at seventy six percent width so the next item peeks into view.
The rail already used horizontal overflow, so that partial item was an
affordance rather than lost media.

The reported clipped appearance had two confirmed contributors:

1. The fixed scroll cue sits above the lower part of the visible panel until
   the reader nears the end. It did not reserve matching content clearance.
2. The mobile dock forced the selected Place title onto one ellipsized line.

All legacy sections were technically reachable when the panel was scrolled to
its end, and the cue disappeared there. Phase 1 adds explicit bottom content
and scroll clearance, preserves the one-scroll-container model, and lets the
mobile title wrap instead of truncating it.

## Baseline screenshots

- [Mobile before Phase 1](assets/atlas-story-phase0-before-mobile.png)
- [Desktop before Phase 1](assets/atlas-story-phase0-before-desktop.png)

## Minimal implementation boundary

Phase 1 can safely derive a published story lead in the existing selector,
render it before Journey stops, filter the old generic action out of utility
links, and preserve the standalone story route. An in-Atlas body requires a
separate extraction from `RoamTripOverview.vue`, explicit reader route state,
scroll restoration, focus behavior, and mobile sheet behavior. Those changes
remain Phase 2 and were not folded into the discovery slice.
