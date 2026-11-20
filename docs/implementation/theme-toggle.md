---
id: theme-toggle-implementation
title: Theme Toggle Implementation and Verification
kind: implementation
status: implemented
implementation_state: complete
created: 2026-11-20
updated: 2026-11-20
related:
  - visual-themes
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - public/theme-preference.js
  - src/components/ThemeSelector.vue
  - src/components/BrandMark.vue
  - scripts/build-brand-icons.mjs
  - public/img/icons/SVG/amber.svg
  - public/img/icons/SVG/orange.svg
  - src/styles/themes.css
  - src/theme.js
  - scripts/test-theme.mjs
  - package.json
verification:
  state: verified
  evidence:
    - npm run theme:test
    - npm run build
    - npm run atlas:test
    - npm run lint -- --no-fix
    - npm run docs:audit
    - Local Chrome keyboard, accessibility-tree and 320, 390, 768 and 1440 pixel checks
    - Classic fallback audit compared 5797 existing CSS declarations with zero changed values
---

# Theme toggle

Source request: `codex-context/Roam_With_Justin_Theme_Toggle_Codex_Brief.md`.
This active checklist and the as-built visual-theme architecture describe
the implementation; the proposal does not establish release state.

## Audit

- [x] Read documentation index, content architecture, Atlas reader work and
      MapTiler migration evidence; inspect actual Vue components and styles.
- [x] Inventory scoped colors across shared components, public pages, Atlas,
      My Atlas, planner, dialogs, forms, footer and map overlays.
- [x] Verify HYBRID map style, shared SDK session configuration, inline
      categorical year colors, CSS map controls and stable favicon assets.
- [x] Capture the existing homepage, owner My Atlas and public page shell at
      1440 and 390 CSS pixels before edits.

The audit found no existing theme preference or theme token system. Existing
local preferences are feature-specific and remain unchanged. Classic uses
charcoal/gold and Atlas green-black/gold variants, documented in
`docs/architecture/visual-themes.md`. The initial implementation retained the
existing icons. The owner's subsequent amber/orange SVG approval is now
implemented as described below.

## Implementation

- [x] Add synchronous early preference boot, safe localStorage persistence,
      invalid-value fallback and cross-tab synchronization.
- [x] Add compact labeled selector to shared and standalone navigation.
- [x] Preserve Classic values in semantic-token fallbacks throughout routed
      app components; add optional Explorer root palette.
- [x] Theme owned map overlays without changing basemap, session, camera,
      canvas route semantics, account or trip interfaces.
- [x] Preserve photography, provider frames, export-image design,
      affiliate tracking and analytics behavior.
- [x] Add preference/recovery/contrast regression tests to the build pipeline.
- [x] Complete browser keyboard, persistence and responsive review.
- [x] Verify map instance, camera and unrelated storage stability on toggle.
- [x] Review before/Classic/Explorer screenshots and record concrete evidence.
- [x] Complete lint, Atlas tests, full build and managed documentation audit.

## Approved icon follow-up

- [x] Use the supplied amber SVG for Classic and orange SVG for Explorer.
- [x] Replace RWJ letter marks in the site, Atlas, owner/public My Atlas,
      shared-trip and Explore headers with the shared decorative BrandMark.
- [x] Remove the old solid gold badge backgrounds around the new mark.
- [x] Switch the SVG browser favicon alongside the selected theme; keep
      installed-app and legacy fallback icons on stable amber artwork.
- [x] Generate and check SVG/ICO plus 16, 32, 48, 96, 180, 192 and 512 pixel
      derivatives, with opaque dark raster backgrounds for white-R legibility.
- [x] Update the manifest launch background and existing icon paths.
- [x] Verify responsive brand rendering on six routes, two themes and two
      viewport widths, including a 320-pixel mobile layout.
- [ ] Verify the live release after promotion.

The master assets retain their original viewBox and path geometry. Raster
and favicon wrappers add padding and a dark tile; no source art is redrawn.
`npm run icons:build` is the repeatable export command, and `npm run theme:test`
checks all generated asset sizes and both browser favicon choices. The theme
bootstrap stays synchronous in the head after the SVG favicon link and before
the application/style bundles.

The final icon follow-up passed the full build, Atlas tests, theme/icon tests,
targeted ESLint and 24 local browser brand/favicon checks. Reports and the
Classic/Explorer screenshots are under `.state/theme/brand-*`. All six marks
load the expected SVG, retain the existing accessible home-link names and
stay within the viewport. The masters and generated exports are included in
the release; local QA state and the owner's editable artwork are excluded.

## Theme verification

`npm run theme:test` passes. It executes the actual head bootstrap in isolated
browser-like environments, including blocked read/write storage, invalid
preferences, reload, cross-tab changes and storage clearing. It checks WCAG AA
body-text contrast for Explorer semantic text/state colors, orange-button text,
and focus/control contrast. No OS preference API is consulted.

Local pre-edit screenshot artifacts live under `.state/theme/before-*.png`.
They cover homepage, owner My Atlas, Stories, Gear, About and Explore at desktop
and mobile widths. Generated screenshots and browser reports remain local QA
artifacts, not public media. Initial development screenshots captured a lint
overlay and were discarded as acceptance evidence. Final review used clean
builds.

Final clean captures use `.state/theme/classic-*.png` and
`.state/theme/explorer-*.png`, covering homepage, My Atlas, Stories, Gear,
About and Explore at 1440 and 390 pixels. Additional synthetic owner/planner,
tutorial-dialog and actual Utah story screenshots exercise forms, trip tools,
modal controls and photography overlays. The favorite-image export palette
and third-party rendering exceptions remain intentional.

The local browser checks in `.state/my-atlas/theme-browser-qa.mjs` passed
on the Utah Atlas, My Atlas and Stories at 320, 390, 768 and 1440 pixels.
The theme panel stays inside the viewport, there is no horizontal overflow,
Escape restores focus, keyboard Enter/Tab reaches and selects Classic, and
the accessibility tree exposes the current-theme button label. Explorer
survives a hard refresh. Both actual SDK map instances and camera values
remain identical across toggles, with zero fetch calls during the settled
toggle interval and no unrelated localStorage changes. A synthetic saved
itinerary and flight/rental drafts also remain identical across toggles.
Reports are `.state/theme/browser-qa.json` and `.state/theme/fixture-qa.json`.
An additional SPA navigation check retained Explorer through router push,
browser Back and browser Forward between Utah and Stories, recorded in
`.state/theme/navigation-qa.json`.

The first 320-pixel Atlas check found a clipped selector popover. The Atlas
selector now opens from its leading edge; the full responsive check passed
after that correction. No app business logic was changed to fix this.

`.state/my-atlas/theme-classic-audit.mjs` compared 5797 common existing CSS
declarations against HEAD after resolving the new theme fallbacks, with no
changed values. This verifies source-level Classic color preservation;
screenshots are visual review rather than a claim of whole-page pixel
identity, since map rendering, random About photography and saved resume
state can differ. The post-change homepage captures include a resume action
from the QA journey visit; that is existing behavior, not a theme change.

`npm run build` passed all content, preference, analytics, commerce, AdSense,
My Atlas and 44 Worker runtime tests, then produced the production bundle.
Webpack reports its asset and entrypoint size warnings. `npm run atlas:test`
passed; `npm run lint -- --no-fix` passed. Managed documentation audit passes
with the existing explicitly unverified-document warnings. The later
popover alignment correction also passed targeted ESLint and browser compile
checks. The earlier literal-color focus regression assertion now recognizes
the same gold fallback through the semantic accent token.

Deployment and actual hosted Auth0 round-trip verification are not part of the
current local implementation. Manual screen-reader testing, installed-app
behavior and every provider-owned frame are externally unverified. No new
optional map-basemap design is included. The approved SVG brand replacement
is included; there is no installed-app theme-switching guarantee.
