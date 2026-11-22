---
id: my-atlas-integrated-trip-management-2026-11-21
title: Integrated My Atlas Trip Management
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-21
updated: 2026-11-22
related:
  - docs-index
  - my-atlas-trip-centric-transition
  - my-atlas-account-state
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/components/MyAtlasMapHelp.vue
  - src/features/my-atlas/views/MyAtlasPublicView.vue
  - src/features/my-atlas/api/client.mjs
  - src/views/roam/Privacy.vue
  - workers/my-atlas/wrangler.jsonc
  - workers/my-atlas/test/public.test.mjs
  - workers/my-atlas/src/public/service.mjs
  - src/features/my-atlas/components/MyAtlasDialog.vue
  - src/features/my-atlas/components/MyAtlasInfo.vue
  - src/features/my-atlas/components/MyAtlasSwitch.vue
  - src/features/my-atlas/components/MyAtlasVisitManager.vue
  - src/features/my-atlas/components/MyAtlasJourneyCards.vue
  - src/features/my-atlas/components/MyAtlasTrips.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/planning/journeyCards.mjs
  - src/features/my-atlas/planning/tripClient.mjs
  - shared/my-atlas-trip-logistics.mjs
  - workers/my-atlas/src/trips/service.mjs
  - workers/my-atlas/src/trips/store.mjs
  - workers/my-atlas/src/trips/visits.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/src/account/service.mjs
  - workers/my-atlas/src/index.mjs
  - workers/my-atlas/test/account.test.mjs
  - scripts/test-my-atlas-trip-workspace.mjs
  - scripts/test-my-atlas-profile-discovery.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:test passed all script suites and 59 Workers runtime tests
    - node scripts/test-my-atlas-trip-workspace.mjs passed journey dates, canonical/legacy cards, saved logistics reload and private share exclusion checks
    - npm run build passed with existing asset-size warnings
    - Local Chrome fixture checks passed at 320, 390 and 1440 CSS pixels with three cards, View all, correct Past trip opening and no horizontal overflow
    - Local Chrome verified unchanged visibility cannot save and explicit visibility/logistics buttons emit the corresponding writes without touching a real account
    - node scripts/test-my-atlas-load-safety.mjs verifies initial Overview loading and rejects stale owner/revision responses
    - npm run my-atlas:worker:check:staging passed before deployment
    - Staging Worker deployed as 71692099-3991-455a-b9e9-a8a794433a38; all four new route shapes returned 401 without authentication
    - Compact workspace follow-up passed npm run my-atlas:test including 59 runtime tests, npm run build, ESLint and npm run docs:audit on November 21
    - Local Chrome compact workspace checks passed both themes at 320, 390 and 1440 pixels, including 50-visit scrolling, focus wrapping and restoration, viewport-bounded help, single dialogs, failed drafts and map-placement return
---

# Integrated trip management

The owner requested the four proposed improvements as one feature. This
implementation extends the explicit trip model. Adding an independent
destination still does not create a trip. PRs 228 and 229 released the integrated
feature, with branch alignment in PR 230. Pages run 44912326394 succeeded for
main commit `7ee5c30fe6a457bebade61d13d8f4403d0ed66bb`; live owner, Explore and
unavailable-Atlas routes and shipped feature markers passed browser checks.
The compact workspace follow-up below remains local. Real owner acceptance
remains separate work. The additive
API is deployed to staging as `71692099-3991-455a-b9e9-a8a794433a38`, which is the
configured API used by localhost. No user data was migrated or written during
deployment or remote route checks.

## Implementation checklist

- [x] Move selected visits between existing trips of the same lifecycle.
- [x] Return Past visits to Ungrouped and create a named trip from selected
      visits. Preserve stop IDs, every memory, experience and dates.
- [x] Keep an emptied trip as a draft, preserving its description and logistics.
- [x] Edit ungrouped canonical visit memories, dates and private experiences.
- [x] Save each trip's public Atlas visibility independently of read-only links.
      The whole account must also be public for public Atlas display.
- [x] Save and reload private flight and rental search details with stable
      logistics IDs. Keep provider handoff review and draft/error protections.
- [x] Show up to three actual trip cards on Overview, with lifecycle, destination
      count, known dates, Open, Share and View all. Include saved legacy plans
      without manufacturing trips from standalone destinations.
- [x] Include independent canonical visits in private account exports and
      deletion. Include only public projections in the public Atlas.
- [x] Exercise revision conflicts, idempotent retry, cross-owner isolation,
      repeated visits, full-record preservation and private share exclusion.
- [ ] Complete genuine signed-in owner acceptance against deployed new routes.
- [x] Deploy the additive backend to staging and check authentication boundaries.
- [x] Release the integrated frontend through develop/main in PRs 228 and 229.

## Interfaces and boundaries

The existing authenticated, revisioned, idempotent trip write boundary adds:

| Route | Purpose |
| --- | --- |
| `POST /v1/me/trips/visits/transfer` | Move selected stop IDs between trips, Ungrouped, or an explicitly named new trip |
| `PATCH /v1/me/trips/visits/{stopId}` | Edit an independent canonical visit |
| `PATCH /v1/me/trips/{tripId}/sharing` | Save `publicAtlas` |
| `PATCH /v1/me/trips/{tripId}/logistics` | Save normalized private flight/rental search drafts |

The owner collection includes `ungroupedVisits` and `legacyPlans`. Independent
canonical visits use `visit:{stopId}` storage, preserving the full stop rather
than collapsing repeated occurrences into a unique-place legacy pin. The
compatibility map deduplicates geography without merging the stored memories.
Collection storage limits include independent visits. A transfer validates the
whole result before writing and never silently changes a visit's lifecycle.
Planned visits must first use the explicit lifecycle action before ungrouping.

Trip public visibility controls public Atlas inclusion, not access to an
existing read-only snapshot link. Private memories, experiences and logistics
remain excluded from snapshot links and public projections. An ungrouped visit
keeps its prior public visibility; moving to a trip uses the target's setting.

Saved logistics are search intentions, not reservations. Strict field, size,
calendar and ordering validation rejects unexpected payload fields and provider
URLs. The old legacy planner continues using browser drafts until explicitly
upgraded; no background migration or auto-save is introduced.

Overview cards display established trip metadata. They do not invent trip dates,
cover photos, trip titles or trips for each destination. Sign-out and account
deletion clear private Overview state and invalidate outstanding requests.

## Compact workspace follow-up, local

- [x] Keep the trip title, Add trip and Close in one compact header. Match
      hover/focus styling for dialog controls and remove inherited Materialize
      navigation colors and line heights.
- [x] Remove the empty Planning toolbar row and keep header actions next to the
      heading. Hide the redundant trip picker when its only trip is selected.
      Make trip and destination titles clickable with pen icons instead of
      separate Edit trip and Memories buttons. Hide unusable reorder/removal
      controls for a one-stop trip.
- [x] Group Public Atlas and Traveled switches together. Both wait for server
      acknowledgement. Keep Add stop beside Destinations, simplify Share trip,
      and move deletion into the title editor with confirmation in the same
      dialog. Experience fields live in their tab without another disclosure.
- [x] Verify computed desktop hover styling after overriding the shared
      stylesheet: no transform, brightness filter or glow; editable titles
      underline and keyboard focus remains visible.
- [x] Put sharing, lifecycle and visibility explanations behind labeled info
      buttons. Popovers remain within the viewport and dismiss on outside click,
      Escape, scrolling and resize.
- [x] Replace canonical workspace, visit-selection and travel-review checkboxes
      with keyboard-operable switches. Public visibility saves directly through
      the existing revisioned write; the displayed value changes only after
      acknowledgement. Pending or conflicted writes disable further changes.
- [x] Move trip creation, destination grouping, trip metadata, stop addition,
      visit management, trip combination and travel tools into a single native
      dialog. Memory/Dates/Experiences and Flights/Rental cars/Directions use
      tabs within that same dialog. No dialog opens inside another dialog.
- [x] Trap keyboard focus, restore it on close, support Escape/backdrop dismissal,
      lock background scrolling and scroll long forms within the dialog.
- [x] Temporarily close the dialog for map-pin selection, then return with the
      selected coordinates. A Return to destination editor action also works
      before a coordinate is chosen.
- [x] Keep failed/ambiguous saves and their drafts open. Display mutation status
      and refresh actions inside the dialog. Disable dismissal while saving.
- [x] Verify both themes at 320, 390 and 1440 pixels with a 50-visit fixture,
      single-dialog behavior, focus wrapping, Escape restoration, visibility
      acknowledgement/duplicate suppression, map selection and failed drafts.
- [x] Release the compact workspace follow-up in PRs 231 and 232.

Switch stability correction: switches are excluded from generic hover/press
transforms. Their saving indicator overlays the fixed-width track rather than
adding a flex item, so the label and track do not shift during a save. Local
Chrome mouse press, saving and settled-state measurements passed at 390 and
1440 pixels, recorded in `.state/theme/switch-stability.json`. This is a local
visual correction and does not change write or acknowledgement behavior.

`MyAtlasDialog.vue` uses the native dialog top layer; `MyAtlasInfo.vue` uses
nonmodal native popovers so help does not clip inside the map sidebar. Existing
legacy planner and registration consent controls retain their prior layouts.
No API contract, storage, trip lifecycle or privacy projection changes in this
follow-up. Browser evidence is recorded locally in
`.state/theme/compact-workspace-browser.json`; script regression coverage remains
in `scripts/test-my-atlas-trip-workspace.mjs`.
The affordance follow-up is additionally checked in
`.state/theme/compact-affordance-browser.json`, including real title clicks,
visit editor tabs, single-stop controls, acknowledgement of lifecycle changes
and deletion confirmation without another dialog. The full My Atlas suite
passed again with 59 runtime tests after these refinements.

### Destination search feedback, local follow-up

- [x] Keep confirmation/error/refresh status in a fixed dialog slot below its
      tabs. Modal actions do not emit a second toast behind the native dialog.
- [x] Show selected destinations in the Destinations tab with a count, removal
      actions and a Review trip details shortcut. The Trip details tab also
      shows its destination count; repeated visits are labeled explicitly.
- [x] Render full-width result cards with region, country, place type and known
      coordinates. Collapse duplicate result IDs while retaining different
      same-name places. Do not infer that nearby records are duplicates.
- [x] Bound search results and selected-destination lists with independent
      scrolling and preserve the 50-stop limit.
- [x] Extend `scripts/test-my-atlas-trip-workspace.mjs` for identity deduplication,
      place context, counts, modal-only feedback, repeated visits and limits.
- [x] Verify at 320, 390 and 1440 pixels with duplicate IDs, same-name places
      and 32 unique results: full-width padded rows, independent result scrolling,
      updated counts/selection and confirmation visible after scrolling the body.
      Evidence is in `.state/theme/trip-search-browser.json`.
- [x] Release with the compact-workspace changes in PRs 231 and 232.

This changes presentation and draft feedback only. Selection payloads sent to
the API still contain their original place references; display context is not
stored as canonical geography.

Destination-entry clarification: a selected search result now populates a
read-only name/latitude/longitude preview labeled Added from search, while
retaining its catalog place ID. Manual name/coordinate fields are hidden by
default and explicitly labeled optional when opened. An info popover explains
that clicking search already adds the destination; manual entry requires its
own Add custom stop action. Selecting a catalog place does not overwrite an
existing manual draft. Removing that searched visit also removes its added
preview. At 320, 390 and 1440 pixels, Chrome verified populated fields, separate
catalog/custom identities, optional editable manual fields, return to search
and zero horizontal overflow. Evidence: `.state/theme/destination-entry-browser.json`.

### Registration and map-only feedback batch, local draft

The compact editor release above subsequently shipped through PRs 231 and 232
and successful Pages run 44918695671. The following changes are a new local
feedback batch, not part of that deployment.

- [x] Draft clearer handle/name field guidance and list unmet creation
      requirements, including invitations, name/handle validity, consent and
      human verification. Disable stale username autofill on the handle field.
- [x] Draft whole-sidebar hide/open controls, with the restore control at the
      bottom of the map. Keep form instances mounted and resize the existing
      SDK map, preserving its camera and current route.
- [x] Draft map gesture hints and SDK zoom/compass controls.
- [x] Draft an in-map trip navigator with trip selection, current stop,
      progress, Previous/Next and collapse/close controls. Canonical visit order
      is retained, including repeated visits. All destinations is a geographic
      view, not a generated trip. Navigation changes only the current view.
- [x] Draft marker containment corrections: explicitly size the mobile map
      shell, isolate its stacking context, and animate the pin's inner shape
      rather than overriding the SDK-positioned marker transform.
- [x] Run registration, sidebar, map and accessibility verification after the
      owner finishes providing feedback.
- [x] Run formatting/managed documentation audit and final checks with the
      completed feedback batch before release.
- [x] Promote through PRs 233 and 234; Pages run 44939782730 succeeded.

The owner initially deferred testing, then explicitly authorized testing,
resolution and promotion. The map navigator and marker corrections are included
in this same batch. Source paths are `MyAtlasMapNavigator.vue`, `MyAtlasMap.vue`
and `MyAtlasGeographicProof.vue`; no SDK map instance is replaced during navigation.

Verification after that authorization:

- [x] Full My Atlas suite passed, including 59 Workers runtime tests.
- [x] Production build, ESLint and documentation audit passed.
- [x] Script tests validate registration requirements, signed-out map privacy,
      repeated-visit navigation, original stop numbering when coordinates are
      missing, boundary stops and unchanged saved trip data.
- [x] Chrome checked 320, 390 and 1440 pixels: sidebar restoration, same map
      instance, viewport bounds, trip switching, repeated visits, collapse and
      untouched account revision/trip records. Registration fields were exercised
      with synthetic verification values; no account was created.
- [x] Mobile city cycling checked selected marker containment, isolated/clipped
      map rendering and the absence of transform transitions on SDK markers.

Browser evidence: `.state/theme/map-feedback-browser.json` and
`.state/theme/map-marker-containment.json`. Genuine signed-in acceptance remains
separate from these synthetic browser fixtures and isolated runtime tests.

### Public map navigation and touch help, local

- [x] Share responsive map help between owner/public views. Mobile/coarse-pointer
      help explains two-finger panning, spreading fingers to zoom in and pinching
      together to zoom out. Desktop help retains drag and Ctrl/Command scroll.
- [x] Hide the full public overview while retaining its mounted content and the
      SDK map. Restore it from a bottom control and retain page position.
- [x] Reuse the in-map navigator for public destinations and published Past trips,
      preserving repeated stops, progress, close/collapse and Previous/Next.
- [x] Add an optional public API `trips` array containing opaque presentation IDs,
      titles, Past lifecycle and ordered public place references. Only explicitly
      public, nonarchived Past trips appear. Planned/private trips, canonical
      trip/stop IDs, descriptions, notes, experiences and logistics stay excluded.
- [x] Keep clients compatible with public API responses without `trips`; the
      All destinations navigator works with the existing places response.
- [x] Full My Atlas suite passed, including 60 runtime tests; production build
      and ESLint passed. Tests cover the public projection and invalid references.
- [x] Chrome fixtures passed at 320, 390 and 1440 pixels: visible touch/desktop
      instructions, overview hide/restore, repeated stops, map identity and no
      horizontal overflow. Evidence: `.state/theme/public-map-browser.json`.
- [x] Deploy the additive public API before releasing grouped public-trip UI.
      Worker `9761acee-97a3-4cf1-b3e8-5e1ca3ff5232` deployed after a successful
      staging dry run. Live health, directory and public-profile reads passed;
      the checked profile had zero published trips, so grouped-trip acceptance
      remains covered by the runtime/browser fixtures.
- [x] Promote through PRs 235 and 236; Pages run 44962250911 succeeded.

Owner visibility help now explicitly mentions that public trip names accompany
their destinations. Browser fixtures do not create accounts or alter real data.
The backend projection is deployed; frontend promotion was subsequently
authorized by the owner. No account records were changed by deployment checks.

### Mobile bottom menu correction

- [x] Make owner and public overview restore controls span the full mobile
      viewport width, flush with the bottom edge, with safe-area padding.
      Desktop controls keep their previous compact placement.
- [x] Keep the trip navigator above the bottom bar, including safe-area spacing.
- [x] Move the existing compact provider attribution/info control beside the
      upper zoom controls on mobile, preserving its provider-credit links.
- [x] Browser geometry checks passed for owner/public views at 320, 390, 720
      and 1440 pixels with no horizontal overflow or navigator/bar overlap.
      Evidence: `.state/theme/bottom-bar-browser.json`.
- [x] Receive owner authorization to promote this correction and profile-photo
      interactions through develop and main. See release tracking below.

This visual correction does not resolve the separately reported production
saved-Atlas load error. That incident remains under investigation; no account
reset or data deletion is part of this work.

### Mobile menu and profile photo release tracking

The owner authorized develop/main promotion on November 21. Source commit
`2fc6c2f` includes the mobile menu/attribution correction and profile-photo
interaction changes. [PR 237](https://github.com/cjust689/roamwithjustin/pull/237)
tracks develop promotion; its validation and subsequent main promotion provide
the external release record. Focused ESLint and `npm run docs:audit` passed.
`npm run build` passed, including 60 isolated Worker runtime tests, using the
established local parallel-false configuration override. Build output is in
`.state/theme/mobile-photo-release-build.log`.
The existing Chrome fixture evidence above covers the layout; profile-photo
evidence is recorded in the favorite-image implementation checklist. This
release changes no Viator code or Worker deployment.

### Public grouped trip browsing, local

The owner clarified that Public Atlas applies to both Planned and Past trips.
This supersedes the initial local Past-only browser design, while retaining
its repeated-stop navigation and independent destination compatibility.

- [x] Expose Planned, Past and Destinations view states. Each filters cards,
      pins and routes; empty lifecycle views do not show another view's pins.
- [x] Show named trip cards, lifecycle labels, stop counts, compact order previews
      and ordered stops. Bound long pickers/lists with independent scrolling.
- [x] Scope route order and visible statistics to the selected trip; distinguish
      unique places from repeated stop occurrences. Public Story export is
      removed by the November 22 follow-up below.
- [x] Preserve trip/stop selection when closing controls or restoring Overview.
      Keep boundary controls disabled at the first/last stop.
- [x] Publish explicitly public, nonarchived Planned trips in additive
      `atlas.plannedTrips`, leaving visited/Past response fields compatible.
      Exclude all private notes, dates, experiences, logistics and canonical IDs.
- [x] Allow a public planned-only profile without inventing a visited destination.
      Keep owner visited counts unchanged. Directory counts include unique public
      map locations, and public trip changes update discovery activity.
- [x] Update owner visibility help, Share Your Atlas readiness, privacy copy and
      the next-deployment privacy version for opt-in publication of either status.
- [x] Extend client/view tests for lifecycle filtering, independent destinations,
      repeat stops, planned-only/empty states and older-response compatibility.
- [x] Chrome fixtures passed in both themes at 320, 390 and 1440 pixels: separate
      pins/cards for each view, unchanged visited counts, ordered repeats,
      retained SDK instance, no overflow and 44 pixel mode buttons. Planned-only
      and empty Past views passed; a 40-trip picker scrolled within its bounds.
      Evidence: `.state/theme/public-view-states-browser.json` and screenshots.
- [x] Backend runtime tests passed for public/private planned trips, planned-only
      publication, lifecycle changes, unsharing, archive exclusion and freshness.
- [x] Planned-only owner readiness passed at 320, 390 and 1440 pixels: public
      publishing enables only for an opted-in plan; Overview Story export stays
      disabled without visits. No profile was published. Evidence:
      `.state/theme/public-planned-owner-browser.json`.
- [x] Final build passed with hash `8d044a929ca1d3b9`, including the script suites
      and 61 isolated Worker runtime tests. After the directory count refinement,
      all 61 runtime tests and focused ESLint passed again. Worker staging dry
      run and managed docs audit passed. Evidence:
      `.state/theme/public-view-states-build.log`,
      `.state/theme/public-view-states-runtime.log`, and
      `.state/theme/public-view-states-worker-check.log`.
- [ ] Deploy the additive Worker API, then promote the frontend when requested.

No real account mutation, API switch, migration or production deployment was
performed by these checks. The configured localhost app still reads the existing
staging API; new planned publication is covered by isolated runtime/browser
fixtures until that Worker is promoted.

### Public map controls and owner-only Story export, November 22, local

- [x] Remove the public Story download button, its export method, pending/status
      state and Story-export import. Preserve owner export and public image viewing.
- [x] Replace the sidebar view buttons/year controls with one on-map View select
      for Planned trips, Past trips and Destinations; disable empty trip options.
- [x] Keep the selector visible with the overview hidden and preserve the existing
      trip/stop navigator, map instance and view-specific pins.
- [x] Remove unused public timeline/filter drawer code and styling. The sidebar
      contains profile, statistics, trip cards and ordered stops.
- [x] State tests confirm public export is absent and owner export still exists.
      Profile-discovery and planning checks passed with focused ESLint.
- [x] Chrome fixtures passed in both themes at 320, 390, 720, 721 and 1440 pixels:
      44 pixel selector, state-specific pins, unchanged visited counts, no sidebar
      select, no public export method, hidden-overview selector hit testing,
      repeated stops, unchanged map identity and no horizontal overflow.
      Evidence: `.state/theme/public-map-filters-browser.json` and screenshots.
- [x] Production build passed with hash `3b3fab129699138a`, including all script
      suites and 61 isolated Worker runtime tests. Focused ESLint and the final
      managed documentation audit passed with the existing 12 warnings. Build
      evidence: `.state/theme/public-map-filters-build.log`.
- [ ] Promote this local follow-up with the pending public-trip API/frontend work.

The owner-only account data export remains authenticated. This change removes
the public app's Story generation/download path; it does not change photo
visibility, private R2 delivery, trip permissions or account data.
