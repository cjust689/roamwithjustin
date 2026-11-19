---
id: atlas-integrated-story-reader-phase-4-2026-11-18
title: Atlas Integrated Story Reader Phase 4 Local Refinement 2026-11-18
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-18
updated: 2026-11-18
related:
  - atlas-integrated-story-reader
  - atlas-integrated-story-reader-phase-3-2026-11-18
  - content-model
supersedes: []
superseded_by: []
code_paths:
  - src/components/JourneyStoryBody.vue
  - src/features/atlas/components/AtlasStoryReader.vue
  - scripts/test-atlas-story-reader.mjs
  - docs/audits/assets/atlas-story-phase4-reader-desktop.png
  - docs/audits/assets/atlas-story-phase4-reader-320.png
verification:
  state: verified
  evidence:
    - npm run atlas:test
    - npm run lint
    - npm run content:validate
    - npm run docs:audit
    - npm run build
    - Local Chrome exact-section focus and interrupted restoration checks
    - Local Chrome deferred video request check
    - Local Chrome responsive and reduced-motion checks
    - Local Chrome keyboard containment, lightbox return, invalid-link repair, unavailable-story, and standalone-story checks
    - Local Chrome accessibility tree checks at 390 by 844 and 1024 by 768 CSS pixels
---

# Atlas integrated story reader Phase 4 local refinement

This bounded refinement responds to local rendered QA. It changes reader
presentation and loading behavior without adding content, relationship rules,
analytics, or a multi-story interface.

## Refinements

The desktop story pane now starts at 46 percent of the viewport with a 720
pixel maximum, while the narrower landscape rule retains a readable 480 pixel
minimum where the viewport permits it. This leaves more of the active map
visible without turning the editorial column into a narrow sidebar.

Fresh section links retain their initial-entry intent independently from the
reactive saved scroll value. After the bounded restoration pass, focus moves
to the requested chapter or Experience heading. A restored browser-history
offset still takes precedence over section focus. Pointer, touch, wheel, and
reader navigation-key input cancel the short restoration window immediately,
so the reader does not pull against an early visitor action.

Story videos use `preload="none"` only in the embedded Atlas renderer. The
standalone public Journey page retains `preload="metadata"`. The reader hero
is still requested eagerly because it is the first visual after a general
story open, while below-the-fold story images retain lazy loading.

Reader semantics now follow the same responsive state as the visual layout
and keyboard containment. The full mobile sheet is a named modal dialog. Map
peek removes the modal state and presents a named region, which is also the
desktop split-pane role.

## Browser evidence

The desktop check reported an actual 1,424 by 849 CSS pixel viewport. The
reader measured 655 pixels, or 46 percent, and left 750 pixels of map visible.
The direct Cruz Bay chapter 3 link placed `Day 3: Boat Day` at the top of the
reader and made its `H3` the active element. Horizontal overflow remained zero.

The rendered USVI story contained seven video elements. Every element reported
`preload="none"`, and the browser performance timeline reported zero MP4,
WebM, or Ogg requests before playback.

An immediate pointer interaction followed by a scroll to 420 pixels remained
at exactly 420 pixels after the restoration window elapsed. Under emulated
reduced motion, the reader transition duration was zero seconds and story
scroll behavior was `auto`.

At 390 by 844 pixels, the reader measured 390 pixels, focused the requested
chapter heading, and reported zero horizontal overflow. The map peek opened at
270 pixels with one MapLibre canvas and a zero-second reduced-motion
transition.

The completed responsive matrix checked 320 by 720, 375 by 812, 390 by 844,
768 by 1,024, and 1,024 by 768 CSS pixels. Every reader reported zero
horizontal overflow, zero remaining scroll at the end, a visible footer, and
fully visible toolbar actions. The 1,024 pixel landscape reader measured 532
pixels and left 473 pixels before the pane for map context.

On the 390 pixel reader, keyboard simulation wrapped focus from the last of 85
focusable controls to the first and from the first back to the last. Opening a
story photograph focused the lightbox close control; Escape closed it and
returned focus to the original photograph button.

An invalid Utah section repaired itself to `/atlas/utah?story=1` and retained
the general reader. An unavailable Europe story request repaired itself to
`/atlas/europe`, rendered the normal detail panel, and exposed no story action.
The standalone `/trips/utah-2025` route retained the shared story body, zero
horizontal overflow, no Atlas reader or MapLibre canvas, and metadata preload
for its public-page video. The browser reported no console exceptions during
the matrix.

At 390 by 844 pixels, Chrome's accessibility tree exposed the focused Utah
reader as a `dialog` named `Utah (2025)` with modal state true and initial
focus on `Back to journey`. Opening map peek changed the same named reader to
a nonmodal `region`. At 1,024 by 768 pixels, the desktop split reader remained
a nonmodal named `region`. These automated results verify browser semantics,
not real assistive technology behavior.

- [Desktop exact chapter](assets/atlas-story-phase4-reader-desktop.png)
- [Reader end at 320 pixels](assets/atlas-story-phase4-reader-320.png)

## Deliberate omissions and external review

No engagement report or production analytics source was available in this
local task. The existing `atlas_story_opened` event remains unchanged, and no
section-selection or conversion event was added.

The current published Journeys each expose one substantive Journey story with
chapters, not several independently published stories. A multi-story index
would therefore be speculative and remains absent.

No production deployment, real-device touch session, screen-reader session,
or owner acceptance is claimed. Those remain the open Phase 4 checks.
