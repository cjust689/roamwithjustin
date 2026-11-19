---
id: atlas-integrated-story-reader-phase-5-2026-11-18
title: Atlas Integrated Story Reader Phase 5 Mobile Hierarchy 2026-11-18
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-18
updated: 2026-11-18
related:
  - atlas-integrated-story-reader
  - atlas-integrated-story-reader-phase-4-2026-11-18
  - content-model
supersedes: []
superseded_by: []
code_paths:
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/features/atlas/components/AtlasJourneyPlayer.vue
  - src/features/atlas/views/AtlasView.vue
  - scripts/test-atlas-story-discovery.mjs
  - docs/audits/assets/atlas-story-phase5-detail-mobile.png
  - docs/audits/assets/atlas-story-phase5-guided-mobile.png
verification:
  state: verified
  evidence:
    - npm run atlas:test
    - npm run lint
    - npm run docs:audit
    - npm run build
    - Local Chrome mobile detail checks at 320 by 720 and 390 by 844 CSS pixels
---

# Atlas integrated story reader Phase 5 mobile hierarchy

This refinement responds to the owner review of the mobile Atlas detail. It
changes presentation only. Canonical Journey, Visit, Place, Experience, and
Media relationships are unchanged.

## Mobile detail changes

The previous `Scroll for story, photos & links` control is removed. While
content remains below the visible drawer, a passive dark gradient now fades
the bottom of the scroll surface into the fixed dock. It has no text, icon,
focus target, or pointer behavior, and it disappears near the end of content.

The detail hero no longer renders the presentation category beneath its title.
The stop story no longer repeats `In [Journey]`, and the personal note no
longer carries `From the trip`. Functional section labels remain where they
identify distinct content, including Journey stops, Photography, and Useful
links.

HTML character glyphs previously supplied the detail and guided disclosure
icons. They are replaced with SVG chevrons whose view boxes and button layout
keep them centered independent of platform font rendering. Reduced-motion
mode removes the detail chevron transition.

While a mobile detail drawer is present, the toolbar's global Saved control is
hidden. The bottom dock retains the selected-place Save control and now shows
the total saved count. Returning to the Atlas root restores the global Saved
control and its saved-place drawer entry.

## Browser evidence

At 390 by 844 CSS pixels, the expanded Utah detail contained no category line,
`In Utah` label, `From
the trip` label, or textual scroll pill. The bottom fade computed to a 77 pixel
linear gradient with `pointer-events: none`. The global toolbar Saved control
was hidden, while the bottom Save control showed a count of zero. The guided
expand icon and expanded collapse icon both reported zero pixel horizontal and
vertical center offset relative to their controls.

At 320 by 720 CSS pixels, the detail dock occupied exactly 0 to 320 pixels,
the saved-count badge remained within its edge, the fade stayed visible, and
horizontal overflow remained zero.

- [Mobile detail hierarchy](assets/atlas-story-phase5-detail-mobile.png)
- [Guided disclosure alignment](assets/atlas-story-phase5-guided-mobile.png)

## External review

No production deployment or owner real-device acceptance is claimed. The
existing real-device and assistive-technology review remains open.
