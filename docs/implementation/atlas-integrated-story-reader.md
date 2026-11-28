---
id: atlas-integrated-story-reader
title: Atlas Integrated Story Reader
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-18
updated: 2026-11-27
related:
  - atlas-integrated-story-reader-phase-0-2026-11-18
  - atlas-integrated-story-reader-phase-2-2026-11-18
  - atlas-integrated-story-reader-phase-3-2026-11-18
  - atlas-integrated-story-reader-phase-4-2026-11-18
  - atlas-integrated-story-reader-phase-5-2026-11-18
  - atlas-integrated-story-reader-phase-6-2026-11-18
  - content-model
  - atlas-content-strategy
  - storytelling-framework
  - editorial-voice
supersedes: []
superseded_by: []
code_paths:
  - src/components/JourneyStoryBody.vue
  - src/content/selectors/projections.mjs
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/features/atlas/components/AtlasMap.vue
  - src/features/atlas/components/AtlasStoryReader.vue
  - src/features/atlas/config/markerLayout.mjs
  - src/features/atlas/routes.js
  - src/features/atlas/views/AtlasView.vue
  - src/views/roam/RoamTripOverview.vue
  - src/router/index.js
  - scripts/test-atlas-story-discovery.mjs
  - scripts/test-atlas-journey-readiness.mjs
  - scripts/test-atlas-marker-layout.mjs
  - scripts/test-atlas-story-reader.mjs
  - scripts/test-atlas-story-relationships.mjs
  - package.json
  - docs/audits/atlas-integrated-story-reader-phase-0-2026-11-18.md
verification:
  state: verified
  evidence:
    - Pull requests 208 and 209 passed validation runs 44736412417 and 44737017269, merged through protected develop and main as 05eb2a0d8bf42b428f297dded08e61cbf9f11ffa and afd771c5e63d53a24f1a2e234c7ed111f9dbf67c, and develop validation run 44736727554 succeeded
    - Pages run 44737312245 deployed the production merge; the live Atlas rail rendered exactly three Explore actions for Utah 2025, Puerto Rico 2024, and St. John 2025, and chunk 852.ccfda71b.js contained the stories-to-explore marker
    - npm run atlas:test verifies that all ten registered Journey roots own story leads, incomplete Journeys carry the update note, and published Experiences project to exact stops before Journey completion
    - Pull requests 287 and 288 merged the progressive Journey discovery through develop and main; Pages run 45898969341 succeeded and live Uvita rendered both exact Experience cards
    - npm run atlas:test verifies that single-Moment stop cards lead with Uvita Horses and Uvita House while retaining their parent Experience labels
    - npm run atlas:test verifies that exact Uvita Experience relationships retain their canonical Moments and registered video for inline stop rendering
    - Local Chrome at 2000 by 1600 CSS pixels rendered the full Uvita Horses narrative and video followed by Uvita House inside the selected Uvita inspector while retaining the map
    - npm run atlas:test
    - npm run lint
    - npm run content:validate
    - npm run docs:audit
    - npm run build
    - Local Chrome responsive checks at 320, 375, 390, 768, 1024, and 1440 CSS pixels
    - Local Chrome Back and Forward check between the Utah Journey and Bonneville Salt Flats
    - Local Chrome standalone Utah story route and Atlas return check
    - Local Chrome in-place reader, map identity, scroll restoration, map peek, stop handoff, and lightbox checks
    - Local Chrome stop preview, exact chapter landing, many-to-many chapter, adjacent stop, and same-stop handoff checks
    - Local Chrome reader proportion, exact-section focus, deferred video, interrupted restoration, and reduced-motion checks
    - Local Chrome acceptance matrix at 320, 375, 390, 768, and 1024 CSS pixels with keyboard, lightbox, invalid-link, unavailable-story, and standalone-story checks
    - Local Chrome accessibility tree checks for mobile dialog, mobile map peek region, and desktop split region semantics
    - Local Chrome mobile detail hierarchy checks at 320 and 390 CSS pixels
    - Local Chrome direct root Atlas and feature-gated My Atlas handoff checks at 320, 390, and 1280 CSS pixels
    - Local Chrome Atlas invitation checks at 390 and 1280 CSS pixels
    - npm run atlas:test verifies that the root Journey explorer starts collapsed and returns to the collapsed state at World
    - npm run atlas:test verifies that colliding World-level Journey roots remain individual while child stops retain ordinary clustering
    - Local headless Chrome at 390 CSS pixels measured Utah 2025 at pixels 4 through 68 and Utah 2026 at 76 through 140, fully inside the viewport with an 8 pixel gap
    - npm run atlas:test verifies that a root without an Atlas-specific hero inherits its Journey hero, an explicit Atlas hero still overrides it, and child Places remain isolated
    - npm run content:validate verifies that the Costa Rica Journey and guided route omit Playa San Josecito while its standalone Place remains registered
    - npm run content:validate verifies that the Costa Rica overview orders San José third, Drake Bay fourth, and Uvita fifth while preserving one city pin
    - npm run content:validate verifies that Uvita Whale Tail is parented beneath Uvita in both canonical Place and Atlas presentation hierarchy
    - npm run atlas:test verifies that the reparented Whale Tail stop retains its published High Tide Whale Tail Moment and all seven registered media items
    - npm run atlas:test verifies that the Costa Rica Atlas root and story lead resolve the same canonical Journey hero and that mobile CSS does not hide the story-card image
    - npm run atlas:test verifies clean public Journey titles and separate date labels in the Atlas detail hero, story lead, Journey explorer, and map pills
---

# Atlas integrated story reader

The accepted target is a story-first Journey experience that reads the
substantive editorial body inside the mounted Atlas. Phase 2 provides that
reader. Phase 3 now connects mapped stops to the canonical Journey chapters
and published Experiences that explicitly reference their Visits.

## World-level Journey marker collisions

The World map keeps tightly colliding top-level Journey roots as separate
interactive markers. A pure projected-screen layout rule detects root
coordinates within 14 CSS pixels, excludes those roots from ordinary clustering
and applies stable horizontal card spacing. Compact markers use 72 pixels and
larger markers use 154 pixels. Near the viewport edge, the complete collision
group shifts inward without changing its internal spacing. Coordinate dots stay
at the canonical Place coordinates, and child stop markers continue using the
existing cluster rules.

## Current implementation

Every Journey root now derives a `storyLead` from its canonical Journey. The
lead reuses the canonical Journey title, description, hero, public story ID,
and existing `/trips/:id` route. It is not a second content store. Incomplete
Journeys include a natural update note in both the root detail and shared story
body, while completed Journeys omit it.

The same canonical Journey hero now supplies the root Atlas display image when
the presentation does not declare a map-specific override. Explicit Atlas
heroes remain first in precedence. The fallback applies only to top-level
Journey roots, so destination pins still require their own Atlas hero, Visit
hero, or verified Visit image.
The root `Explore the story` card consumes that same projected hero. Mobile
layouts now retain it above the card copy with bounded height rather than
hiding it, keeping the Journey header and story entry visually aligned.
Public Journey headings also remove a trailing parenthesized year from their
canonical title. The unchanged Journey date label renders as a compact accent
above the Atlas detail title and story lead, below the World explorer title,
and inside root map pills. Canonical titles keep their year for Sheet choices
and other operator-facing identity.

The owner-corrected Costa Rica route omits Playa San Josecito. Drake Bay now
relates directly to Uvita in the Atlas presentation. The standalone Playa San
Josecito Place and its source context remain available without projecting a
Visit, Atlas stop, related route edge, or guided stop into this Journey.

The latest owner chronology correction keeps the existing San José Visit as
the third top-level stop, after La Fortuna and Bajos del Toro. Drake Bay is
fourth and Uvita is fifth. Uvita Whale Tail is now a child beneath Uvita in
both canonical Place and Atlas presentation hierarchy, using the same nested
hub pattern as Moab. Its Visit, exact Experience and Moment binding, and seven
registered media items are unchanged. The route still records the later
return to San José through related navigation, while one broad city pin
preserves the Casa Jungla story and media without creating overlapping pins.

The detail panel now presents the real story lead and `Explore the story`
action before Journey stops. `View N stops` scrolls the existing panel to the
ordered stop list. Google Maps and official Place destinations remain external
actions under a compact `Useful links` section after editorial media. Incomplete
Journey roots expose the same story lead and toolbar Story action as completed
Journeys. The root welcome rail uses that same selector, so all ten registered
trips remain available while their established content grows.

Phase 2 extracts `JourneyStoryBody.vue` as the shared canonical presentation
used by the public Journey page and `AtlasStoryReader.vue`. Atlas reader state
uses `?story=1` on the same selected-node route. The map remains mounted beside
the desktop reader and beneath the mobile focused sheet. A mobile map peek,
reader and inspector scroll restoration, browser Back and Forward behavior,
focus return, deep linking, and accessible image expansion are implemented.
The focused mobile sheet is a named modal dialog while it covers the map. Its
map peek and the desktop split pane expose the same named reader as a normal
region, matching the states where focus is not contained.

Phase 3 derives stop relationships from existing
`Journey.days[].visits[].visitId` references. A Visit can appear in more than
one chapter, and two Visits at one Place remain distinct even when Atlas
deliberately presents one pin. Published Experiences join a stop only when
their canonical `visitId` and `placeId` both match. Structural hubs and
Journey-only chapters with no Visit references receive no stop relationship.

Related stops now show an editorial preview near the top of the inspector.
Its action opens the shared reader at the exact chapter or Experience section
through the `section` query value. Browser Back restores the stop and focus.
Canonical previous and next stop actions use the already derived guided
Journey order rather than a new sequence. Reader `Show on map` also handles
the current stop without replacing the map or losing the saved reader offset.
Single-Moment Experience cards lead with the recognizable Moment title and
retain the Experience title as context.

Phase 8 hoists the full matched Moment projection into the primary Atlas stop
inspector. Selecting Uvita now reveals the Uvita Horses and Uvita House text
and registered videos in the same scrolling place panel without requiring the
reader action. The compact cards and their exact Experience reader links remain
below the inline presentation so the owner can compare both approaches. Both
surfaces consume the same selector-backed Experience and Moment records.

The bounded Phase 4 refinement leaves more desktop map visible, moves focus to
an explicitly requested chapter heading, stops the short restoration window
as soon as the visitor interacts, and prevents embedded story videos from
requesting media before playback. It adds no analytics event or multi-story
index because no production engagement review or multi-story Journey evidence
supports either addition.

The Phase 5 mobile refinement removes the textual scroll prompt and replaces
it with a passive bottom fade, removes redundant Journey eyebrow labels,
centers the guided and detail disclosure icons, and consolidates selected
place saving into the bottom dock with the total saved count. The duplicate
toolbar Saved control is hidden only while a mobile detail drawer is present.

The Phase 6 entry-shell refinement removes the separate marketing homepage.
The root `/` route now renders `AtlasView.vue` directly without an intermediate
redirect. Feature-enabled builds expose one My Atlas control in the Atlas
toolbar, using the same flag that registers `/my-atlas`; disabled builds expose
neither the route nor its control.

The Atlas to My Atlas handoff now also includes a dismissible invitation that
appears once per browser tab when the same feature flag is enabled. It links
directly to `/my-atlas`, stays out of story-reader state, and moves clear of the
desktop inspector and mobile detail dock. Sparse Journey cards and panels no
longer expose internal editorial workflow labels. They present only established
places and content. The welcome rail now includes every registered Journey,
with an update note inside incomplete Journey details and stories.

The root Journey explorer now starts collapsed so the homepage opens with the
map available for immediate interaction. Returning through browser history or
the World breadcrumb restores the same map-first state. The compact explorer
launcher remains visible and keeps the existing story navigation available on
demand.

The public `/trips/:id` URL remains available and retains its commercial and
advertising modules. The embedded Atlas reader deliberately excludes ads,
lodging and planning offers, Partner cards, and affiliate Gear links. Active
reader state receives scoped `noindex,follow` metadata so the public story page
remains the indexable representation.

## Checklist

### Phase 0, source audit

- [x] Trace canonical Journey, Visit, Place, Media, Experience, Moment, and
  Atlas projections.
- [x] Trace the existing story route, renderer, analytics, route state, map
  lifecycle, panel scrolling, gallery, and mobile drawer.
- [x] Record published story availability and the false slug-only story action.
- [x] Capture mobile and desktop baseline screenshots.

### Phase 1, discovery and hierarchy

- [x] Derive an authentic published story lead without copying content.
- [x] Present the lead before ordered Journey stops.
- [x] Keep story and stop actions visible as peers.
- [x] Demote external utilities into `Useful links`.
- [x] Present incomplete Journey story UI with an honest update note.
- [x] Add bottom scroll clearance and allow mobile dock titles to wrap.
- [x] Verify the full panel at 320, 375, 390, 768, 1024, and 1440 CSS pixels.
- [x] Preserve standalone story routing, Atlas selection, and browser history.

### Phase 2, in-Atlas reader

- [x] Extract a shared presentational Journey body from the standalone page
  without moving canonical content or duplicating full article markup.
- [x] Add explicit Atlas reader route state and browser history semantics.
- [x] Keep the existing MapTiler SDK instance mounted while the reader opens.
- [x] Implement desktop split-pane and mobile focused sheet behavior.
- [x] Restore Journey and reader scroll positions and keyboard focus.
- [x] Reconcile analytics so an in-place open is not counted as an unrelated
  full page view.

### Phase 3, stop and chapter relationships

- [x] Define selector-backed Journey chapter and Experience relationships for
  stops that explicitly own published editorial content.
- [x] Add stop previews and deliberate map or chapter actions without creating
  duplicate pins.
- [x] Add adjacent stop navigation only where canonical route order supports
  it.

### Phase 4, refinement

- [ ] Review real engagement before adding new measurements.
- [x] Tune media loading, reader proportions, focus behavior, transitions, and
  scroll stability through local responsive and reduced-motion QA.
- [x] Complete the local acceptance matrix for responsive reachability,
  keyboard focus containment, lightbox return, deep-link repair, unavailable
  stories, and the standalone Journey regression.
- [x] Verify conditional dialog and region semantics in the browser
  accessibility tree at mobile and desktop sizes.
- [ ] Complete owner review on real devices and with assistive technology.
- [x] Keep the multi-story index absent because no Journey owns several strong
  published stories.

### Phase 5, mobile hierarchy

- [x] Replace the textual detail scroll pill with a passive content fade.
- [x] Remove redundant Journey category and trip eyebrow labels from detail
  content.
- [x] Replace misaligned collapse glyphs with centered disclosure icons.
- [x] Keep one selected-place Save control in the mobile dock and show its
  total saved count.
- [x] Verify the revised detail drawer, saved count, fade, and disclosure
  alignment at 320 and 390 CSS pixels.

### Phase 6, Atlas-first entry shell

- [x] Render the Atlas directly at `/` without a redirect or marketing page.
- [x] Remove the obsolete Home component and homepage Atlas analytics values.
- [x] Add one feature-gated My Atlas entry to the Atlas toolbar.
- [x] Preserve `/atlas` and all existing Journey, Place, and story deep links.
- [x] Verify root startup, My Atlas handoff, browser Back, mobile toolbar fit,
  and desktop reachability with the My Atlas flag enabled.
- [x] Add and browser-check a once-per-session My Atlas invitation outside
  story state at mobile and desktop widths.
- [x] Remove visitor-facing sparse-content workflow labels from Atlas cards and
  detail panels.
- [x] Restrict the welcome rail Explore action to Journey roots with a derived
      canonical story lead.
- [x] Start the homepage Journey explorer collapsed and restore that map-first
      state whenever navigation returns to World.

### Phase 7, progressive Journey discovery

- [x] Expose every registered Journey through the Atlas explorer and reader.
- [x] Add a natural update note to incomplete Journey details and stories.
- [x] Project published Experiences to exact stops before full Journey
      completion.
- [x] Lead single-Moment stop cards with the Moment title while preserving the
      parent Experience label.
- [x] Verify all ten Journey roots and the incomplete Journey stop relationship
      with `npm run atlas:test`.

### Phase 8, inline stop Experiences

- [x] Retain the full canonical Moment and media projection on each exact
      Atlas Experience relationship.
- [x] Render matched Experience text and media directly in the selected stop
      inspector without opening the nested reader.
- [x] Keep the existing compact cards and exact Journey reader links below the
      inline presentation for owner comparison.
- [x] Keep videos deferred with `preload="none"` until visitor playback.
- [x] Verify Uvita Horses, Uvita House, and their registered media through
      `npm run atlas:test`.

## Verified flow after Phase 3

`Journey` opens the authentic lead first. `Explore the story` opens the shared
editorial body in Atlas without replacing the map. Browser Back restores the
same Journey and inspector position; Forward restores the reader position.
`Show map` provides a phone map peek without unmounting the reader. Exact
Journey locations can open their existing Atlas stop and browser Back returns
to the prior reader position. Related stop inspectors show canonical chapter
previews and open the exact section. Repeated Visit references expose every
matching chapter, while Journey-only chapters and structural hubs stay
unrelated.

## Responsive evidence

At every checked width, the document and fixed Atlas shell reported no
horizontal overflow. After scrolling the panel to its end, remaining vertical
scroll was zero, the overlay cue was absent, and both external links were
inside the visible scroll area. The mobile dock title computed to normal white
space rather than the previous forced single line.

- [Mobile after Phase 1](../audits/assets/atlas-story-phase1-after-mobile.png)
- [Desktop after Phase 1](../audits/assets/atlas-story-phase1-after-desktop.png)
- [Mobile reader after Phase 2](../audits/assets/atlas-story-phase2-reader-mobile.png)
- [Desktop reader after Phase 2](../audits/assets/atlas-story-phase2-reader-desktop.png)
- [Desktop stop preview after Phase 3](../audits/assets/atlas-story-phase3-stop-desktop.png)
- [Mobile stop preview after Phase 3](../audits/assets/atlas-story-phase3-stop-mobile.png)
- [Mobile exact chapter after Phase 3](../audits/assets/atlas-story-phase3-reader-mobile.png)
- [Desktop exact chapter after Phase 4](../audits/assets/atlas-story-phase4-reader-desktop.png)
- [320 pixel reader end after Phase 4](../audits/assets/atlas-story-phase4-reader-320.png)
- [Mobile detail hierarchy after Phase 5](../audits/assets/atlas-story-phase5-detail-mobile.png)
- [Guided disclosure after Phase 5](../audits/assets/atlas-story-phase5-guided-mobile.png)
- [Atlas-first mobile root after Phase 6](../audits/assets/atlas-story-phase6-root-mobile.png)

## Remaining owner review

Review the reader density, map peek, stop preview, and return behavior on a
real phone and desktop. No production deployment, real device touch check, or
assistive technology session is claimed by this implementation. The automated
Chrome accessibility tree check verifies roles, accessible names, modal state,
and initial focus only. Production engagement was not available in this local
task, so no additional measurement was added. Future relationships must
continue to require a canonical Visit edge.
