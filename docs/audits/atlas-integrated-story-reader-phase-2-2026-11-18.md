---
id: atlas-integrated-story-reader-phase-2-2026-11-18
title: Atlas Integrated Story Reader Phase 2 Verification 2026-11-18
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-18
updated: 2026-11-18
related:
  - atlas-integrated-story-reader
  - atlas-integrated-story-reader-phase-0-2026-11-18
  - content-model
supersedes: []
superseded_by: []
code_paths:
  - src/components/JourneyStoryBody.vue
  - src/content/selectors/projections.mjs
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/features/atlas/components/AtlasStoryReader.vue
  - src/features/atlas/routes.js
  - src/features/atlas/views/AtlasView.vue
  - src/views/roam/RoamTripOverview.vue
  - scripts/test-atlas-story-reader.mjs
  - docs/audits/assets/atlas-story-phase2-reader-mobile.png
  - docs/audits/assets/atlas-story-phase2-reader-desktop.png
verification:
  state: verified
  evidence:
    - npm run atlas:test
    - npm run lint
    - npm run content:validate
    - npm run build
    - Local Chrome reader checks at 390 by 844 and 1440 by 1000 pixels
    - Local Chrome browser Back and Forward checks with inspector and reader scroll restoration
    - Local Chrome Journey story to Bonneville Salt Flats and browser Back check
    - Local Chrome media lightbox focus restoration check
    - Local Chrome standalone Utah story regression check
---

# Atlas integrated story reader Phase 2 verification

Phase 2 moves substantive published Journey reading into the mounted Atlas
without changing the canonical content store or replacing the public story
URLs.

## As built flow

`src/features/atlas/routes.js` derives reader state from `?story=1` on the
existing `/atlas/:nodeId?` route. `AtlasView.vue` remains the one route
component, so `AtlasMap.vue` is never conditional on reader state. Opening and
closing the reader swaps the detail presentation while the original MapLibre
canvas, selected node, camera, favorites, and recent state remain mounted.

`JourneyStoryBody.vue` is the shared editorial renderer. The standalone
`RoamTripOverview.vue` and the in-Atlas `AtlasStoryReader.vue` both receive the
same `getTripViewModel()` projection. The renderer owns Journey chapters,
location field notes, published Experiences and Moments, photography, and
video. Atlas adds a plain canonical tips and notes section through the same
projection. No Atlas-specific story copy or media arrays were introduced.

The embedded reader does not mount the standalone story's AdSlot, lodging
offers, travel planning offers, itinerary Partner cards, or affiliate Gear
links. Public story behavior remains available at `/trips/:id`.

## Navigation and restoration evidence

The 1440 by 1000 browser check recorded one MapLibre canvas before opening the
reader, one while reading, one after browser Back, and one after browser
Forward. Object identity remained the same throughout.

The Journey inspector was scrolled to 340 pixels before opening the reader.
Browser Back restored 340 pixels. The reader was scrolled to 1,600 pixels;
browser Back followed by Forward restored 1,600 pixels. Selecting `Show on
map` at 2,205 pixels opened `/atlas/bonneville-salt-flats`, and browser Back
returned to `/atlas/utah?story=1` at 2,205 pixels with the same map canvas.

Direct reader links are secondary representations of the public story. While
the reader is active, Atlas adds a scoped `noindex,follow` robots element and
removes it on exit. The standalone story remains the shareable, indexable
page. The existing `atlas_story_opened` event records deliberate reader opens;
the reader route is a semantic, deep-linkable Atlas state rather than a new
content URL.

## Responsive and accessibility evidence

At 1440 pixels the reader measured 691 pixels and left 730 pixels of map
visible. At 390 by 844 it used a full-width focused sheet. `Show map` moved the
sheet to a 270 pixel top offset and retained its 520 pixel reader position;
`Continue reading` restored the focused sheet. The document, headline, and
reader reported zero horizontal overflow. At the end of the story the reader
reported zero remaining scroll and the final return action was visible.

The reader provides semantic headings, a persistent `Back to journey` action,
Escape handling, a keyboard-scrollable single reader container, visible focus,
and an image lightbox. The checked image returned focus to its triggering
button after Escape. Reduced-motion styling removes the mobile sheet
transition. Images below the first view retain lazy loading; the story body is
not mounted or fetched until reader state opens.

- [Desktop reader](assets/atlas-story-phase2-reader-desktop.png)
- [Mobile reader with map peek](assets/atlas-story-phase2-reader-mobile.png)

## Known limits and external verification

Phase 2 did not present stop-specific chapter mapping. Its audit correctly
found no published Experience or Moment relationship for the three published
Journey roots, but overlooked the explicit Visit references already present
under `Journey.days[].visits[]`. Phase 3 now uses those canonical edges while
retaining the Phase 2 exact Atlas stop handoff.

The browser session reported one unrelated external asset failure twice while
checking the standalone story: an existing Expedia lodging image returned
HTTP 404. The Atlas reader does not mount that lodging content and produced no
reader-specific console exception.

No production deployment, real-device touch session, screen-reader session,
or owner acceptance is claimed.
