---
id: atlas-integrated-story-reader-phase-3-2026-11-18
title: Atlas Integrated Story Reader Phase 3 Verification 2026-11-18
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-18
updated: 2026-11-18
related:
  - atlas-integrated-story-reader
  - atlas-integrated-story-reader-phase-0-2026-11-18
  - atlas-integrated-story-reader-phase-2-2026-11-18
  - content-model
supersedes: []
superseded_by: []
code_paths:
  - src/components/JourneyStoryBody.vue
  - src/content/selectors/projections.mjs
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/features/atlas/components/AtlasStoryReader.vue
  - src/features/atlas/views/AtlasView.vue
  - scripts/test-atlas-story-relationships.mjs
  - docs/audits/assets/atlas-story-phase3-stop-desktop.png
  - docs/audits/assets/atlas-story-phase3-stop-mobile.png
  - docs/audits/assets/atlas-story-phase3-reader-mobile.png
verification:
  state: verified
  evidence:
    - npm run atlas:test
    - npm run lint
    - npm run content:validate
    - npm run docs:audit
    - npm run build
    - Local Chrome relationship and route checks at 390 by 844 and 1440 by 1000 pixels
    - Local Chrome same MapLibre canvas and exact chapter landing checks
    - Local Chrome same-stop map handoff and browser Back scroll restoration check
---

# Atlas integrated story reader Phase 3 verification

Phase 3 connects Atlas stops to the published Journey sections that explicitly
reference their canonical Visits. It adds no narrative database, Atlas pin, or
geographic inference.

## Canonical relationship rule

`src/content/selectors/projections.mjs` derives Journey chapter IDs from the
Journey ID and chapter position. Each chapter retains the explicit Visit IDs
already stored in `Journey.days[].visits[]`. An Atlas node receives every
chapter whose Visit ID matches the Visit selected by Atlas presentation.

Published Experiences use a stricter pair: both `experience.visitId` and
`experience.placeId` must match the selected Visit. The current generated
Costa Rica Experience remains excluded because its Journey is not published.
Moments remain children of Experiences and do not create an independent stop
edge.

The selector checks recorded these edge cases:

- Bonneville Salt Flats resolves to Utah chapter 2.
- Cruz Bay resolves to USVI chapters 1 and 3 because the same Visit appears in
  both canonical chapter arrays.
- The two Potash Road Visits share the deliberate Atlas pin but retain chapter
  positions 2 and 4 in the Journey projection.
- The Utah root, Moab structural hub, Europe preview, and Utah arrival chapter
  receive no stop relationship.
- The projected Atlas count remains 65, equal to the presentation record count.

## Stop and reader flow

Related stop panels render an editorial preview near the top of the existing
single scroll container. The first related chapter supplies the headline and
summary. Additional chapter or Experience relationships remain independently
selectable. The action adds `story=1` and a validated `section` value to the
same selected-node route.

`JourneyStoryBody.vue` owns the section anchors for both the public story and
Atlas. `AtlasStoryReader.vue` lands the reader on the requested anchor when no
saved reader position exists. A restored scroll position takes precedence on
browser Back, which prevents a deep link from snapping the visitor away from
the place they left.

Previous and next stop actions come from the existing guided Journey view,
whose stop order is derived from canonical Journey Visit order. Structural
hubs are not inserted into that sequence.

## Browser evidence

At 1440 by 1000 pixels, the Bonneville panel showed the real Utah chapter 2
headline, summary, photograph, and `Read this chapter` action. Opening it
produced
`/atlas/bonneville-salt-flats?story=1&section=utah-winter-2025-chapter-2`,
placed the matching heading at the top of the reader at 1,328 pixels, retained
one MapLibre canvas with the same object identity, and reported zero horizontal
overflow. Browser Back returned focus to the stop action with the same map.

Cruz Bay exposed chapter 1 and chapter 3 separately. Selecting chapter 3
opened the `Day 3: Boat Day` heading at the top of the reader at 4,230 pixels.

At 390 by 844 pixels, the expanded stop preview measured 351 pixels within a
390 pixel viewport, the panel reached zero remaining scroll, and the document
reported zero horizontal overflow. The exact chapter reader occupied 390
pixels, retained one map canvas, and placed its requested heading at the top.

The same-stop handoff was also checked from the Cruz Bay reader. At a reader
offset of 1,169 pixels, `Show on map` opened `/atlas/cruz-bay` without replacing
the MapLibre canvas. Browser Back restored the chapter URL and the exact 1,169
pixel reader offset.

- [Desktop stop preview](assets/atlas-story-phase3-stop-desktop.png)
- [Mobile stop preview](assets/atlas-story-phase3-stop-mobile.png)
- [Mobile exact chapter](assets/atlas-story-phase3-reader-mobile.png)

## Remaining external verification

No production deployment, real-device touch session, screen-reader session,
or owner acceptance is claimed. Phase 4 retains those review and refinement
tasks.
