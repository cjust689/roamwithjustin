---
id: visual-themes
title: Classic and Explorer Visual Themes
kind: architecture
status: implemented
implementation_state: complete
created: 2026-11-20
updated: 2026-11-20
related:
  - theme-toggle-implementation
  - maptiler-sdk-session-migration
supersedes: []
superseded_by: []
code_paths:
  - public/index.html
  - public/theme-preference.js
  - src/theme.js
  - src/styles/themes.css
  - src/styles/style.css
  - src/components/ThemeSelector.vue
  - src/components/BrandMark.vue
  - public/img/icons/SVG/amber.svg
  - public/img/icons/SVG/orange.svg
  - scripts/build-brand-icons.mjs
  - public/site.webmanifest
  - src/components/RoamHeader.vue
  - src/features/atlas/views/AtlasView.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/views/MyAtlasPublicView.vue
  - src/features/my-atlas/views/MyAtlasSharedTripView.vue
  - src/features/my-atlas/views/MyAtlasExploreView.vue
  - scripts/test-theme.mjs
verification:
  state: verified
  evidence:
    - npm run theme:test
---

# Classic and Explorer

The site uses Vue 2 with Materialize base styles and scoped CSS in its owning
components. The shared foundation is `src/styles/style.css`; Explorer's
semantic palette is `src/styles/themes.css`. No CSS framework or UI library
was added.

`current` is displayed as Classic and is always the first-visit default.
`explorer` is an explicitly selected navy, orange and cream alternative. No
operating-system theme detection is used. The root `data-theme` attribute is
the only palette selector.

## Preference and boot

`public/index.html` loads `theme-preference.js` synchronously in the head,
before stylesheet/application initialization. That small same-origin script
reads only `rwj:theme:v1` from localStorage, validates the two IDs and applies
the root attribute. Missing, invalid or inaccessible storage defaults to
Classic. Its `RWJTheme` interface reads and sets the theme, catches storage
failures and emits a local change event. A blocked write still permits an
in-tab selection. Storage events synchronize other open tabs, including a
reset after storage is cleared.

`src/theme.js` bridges the document preference into one Vue observable for
selector labels. The selector is registered once in `main.js` and appears in
the shared site navigation and standalone Atlas, owner Atlas, public Atlas,
shared trip and Explore headers. The callback screen inherits the palette
while completing sign-in. Auth0's hosted sign-in screen is an external page
and is not themed.

The compact button announces the current theme and expanded state. Its panel
contains two native buttons with `aria-pressed`, within a labeled group.
Keyboard Tab reaches both choices; Escape closes the panel and returns focus.
Selection also returns focus, and outside click, focus departure or route
navigation closes the panel. No palette transition animation is introduced.

## Color ownership

Classic was not one uniform palette. Its public shell uses `#0b1114`,
`#070b0e`, white text, and `#f6bd60` gold. Atlas and owner panels also use
`#0d1719`, `#0a1416`, `#111f22`, `#edf7f2` text and `#e6ba68` gold.
Typical border values are white at 9 to 16 percent opacity; text uses multiple
white opacities and green-gray values. Image scrims and shadows are black or
dark charcoal with component-specific opacity. Poppins remains the UI face,
with Georgia for story headings. Existing radii, spacing, shadows, layout,
photography and typography remain owned by their components.

Each converted declaration keeps its exact original Classic color as the
fallback in `var(--color-*, original)`. Explorer alone defines overrides at
the root. This deliberately preserves differences between Classic component
palettes instead of replacing them with one global default. RGB channel
tokens preserve the original transparency in layered surfaces and gradients.

Explorer uses page `#07152b`, surface `#10213a`, raised surface `#172c47`,
text `#fffaf0`, muted text `#b6c5d5`, orange `#ff8a00`, and soft gold/focus
`#ffbd59`. Button text on orange is `#07152b`. Error and success colors
remain distinct; decorative borders and control borders have separate roles.
The contrast test checks the semantic body-text palette against all three
surfaces, orange-button text, focus and control-border contrast.

App-owned navigation, cards, forms, panels, story reader, dialogs, lightboxes,
planner, tutorial, footer, loading states and map overlays consume these
tokens. Classic and Explorer previews inside the selector deliberately use
fixed colors to show the alternatives.

## Boundaries

Theme changes have no dependency on map components, routes, account state,
analytics or commerce. They do not call an API, write account preferences,
modify saved trips, switch map styles or recreate MapTiler instances.
The existing HYBRID basemap and SDK session configuration remain unchanged.
Canvas-rendered route lines, categorical year markers and their corresponding
legend colors retain their existing values. Map attribution and SDK icons
remain under their existing SDK styles. Neutral photographic scrims, shadow
colors and some categorical/status accents intentionally remain fixed.

Merchant frames, embedded video and ads retain their provider appearance.
Unused legacy WebHome/parallax styles are outside the routed site and were
not migrated. Exported Atlas Story images retain their independent export
design. No media is recolored.

## Approved brand assets

The owner supplied and approved `public/img/icons/SVG/amber.svg` and
`orange.svg` after the initial theme implementation. They share a white R
and mountain shape, with amber `#fbab44` and orange `#f68a1f` respectively.
`BrandMark.vue` replaces every header's RWJ letter badge using amber for
Classic and orange for Explorer. Existing home-link accessible names remain
on the parent links, so the nested mark is decorative with an empty alt.
The original SVG masters are served unchanged and are not cropped into the
previous gold circles.

The synchronous preference bootstrap also selects the browser SVG favicon.
The HTML defines `rwj-favicon` before loading the bootstrap, which still runs
before the application and its stylesheet links. `favicon.svg` and
`favicon-explorer.svg` wrap the supplied geometry in a padded dark tile so
the white R stays visible against light and dark browser chrome. A theme
change deliberately updates the favicon URL as well as the root attribute.
The `mountain-r1` URL revision prevents reuse of the previous cached favicon
when the approved mountain mark first ships.

`npm run icons:build` regenerates the checked-in SVG, PNG and ICO derivatives.
PNG sizes are 16, 32, 48, 96, 180, 192 and 512. ICO contains 16, 32 and 48
pixel PNG entries. Apple/manifest icons and legacy web-app icon paths use a
stable amber tile. The manifest uses a dark launch background, an explicit
root start URL and `purpose: any`. It does not promise maskable artwork or
theme-specific installed-app icon updates. SVG-capable browsers select the
theme-specific favicon; legacy raster/ICO fallbacks stay amber.

`npm run theme:test` verifies preference and favicon selection, plus source
SVG fidelity, derivative dimensions, ICO entries and recognizable white and
amber pixels even at the smallest raster sizes. No exploratory AI asset or
new third-party logo is introduced.
