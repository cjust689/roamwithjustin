---
id: docs-index
title: Documentation Index
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-14
updated: 2026-11-27
related:
  - my-atlas-integrated-trip-management-2026-11-21
  - my-atlas-location-experience-commerce
  - visual-themes
  - theme-toggle-implementation
  - content-model
  - media-pipeline
  - gear-system
  - monetization-analytics
  - ga4-three-day-improvement-roadmap
  - ga4-tracking-audit-2026-11-17
  - analytics-event-dictionary
  - my-atlas-geography
  - my-atlas-authentication
  - my-atlas-api-authentication
  - my-atlas-registration
  - my-atlas-account-state
  - my-atlas-private-beta
  - my-atlas-private-beta-implementation
  - my-atlas-trip-planning
  - my-atlas-trip-planning-implementation
  - my-atlas-trip-planner-ux-routes-flights-lodging
  - my-atlas-trip-planner-phase-0-2026-11-18
  - my-atlas-destination-memory-photo-implementation
  - my-atlas-destination-memory-photo-phase-0-2026-11-19
  - my-atlas-favorite-travel-image-implementation
  - my-atlas-directions-phase-2-2026-11-18
  - gear-ingestion-affiliate-analytics-ai
  - my-atlas-travel-booking-affiliate-partnerships
  - affiliate-activation-public-editorial-first-slice
  - lodging-partner-operations
  - stays-sheet-intake
  - my-atlas-trip-lodging
  - gear-affiliate-readiness-2026-11-17
  - editorial-voice
  - sitewide-copy-audit-2026-11-17
  - sitewide-story-punctuation-2026-11-19
  - atlas-integrated-story-reader
  - atlas-integrated-story-reader-phase-0-2026-11-18
  - atlas-integrated-story-reader-phase-2-2026-11-18
  - atlas-integrated-story-reader-phase-3-2026-11-18
  - atlas-integrated-story-reader-phase-4-2026-11-18
  - atlas-integrated-story-reader-phase-5-2026-11-18
  - atlas-integrated-story-reader-phase-6-2026-11-18
  - maptiler-sdk-session-migration
  - gear-publishing-implementation
  - gear-sheet-workflow
  - gear-image-preparation
  - gear-authoring-workflow
supersedes:
  - documentation-lifecycle-adoption-brief
  - master-plan-ai-context
superseded_by: []
code_paths:
  - docs/README.md
  - scripts/docs-audit.mjs
verification:
  state: verified
  evidence:
    - npm run docs:audit
---

# Roam With Justin documentation

Costa Rica now uses its reviewed generated waterfall asset as the canonical
Journey hero and full image. Atlas roots without a separate map-specific hero
inherit that Journey hero, while explicit Atlas overrides retain priority and
child Places never borrow the broad Journey cover. Selector and content
validation cover the precedence locally; this correction is not yet deployed.
The owner also removed Playa San Josecito from the public Costa Rica 2025
Journey. Its standalone Place and source history remain registered, but it is
no longer a Journey Visit, Atlas stop, related route edge, or guided stop.
The owner then corrected the opening chronology to La Fortuna, Bajos del Toro,
the San José Airbnb, and Uvita. San José now orders as the third distinct stop.
The later return to the same city remains route context rather than a duplicate
map pin, preserving the existing Casa Jungla story and every media reference.
The Costa Rica root also keeps that same canonical Journey hero on its
`Explore the story` card at mobile widths instead of hiding the card image.
Visitor-facing Journey titles no longer repeat their year in parentheses.
Canonical titles retain the year for editorial automation and identity, while
trip pages, Atlas cards, map pills, and story leads render the date as a styled
secondary label.

Local Atlas marker follow-up: tightly colliding World-level Journey roots now
remain individually selectable instead of collapsing into one marker. Their
cards receive stable responsive spacing while their coordinate dots remain at
the canonical location. Viewport-edge correction keeps repeat Journeys such as
Utah 2025 and Utah 2026 fully visible on a 390 pixel map. Verification and the
implemented boundary are recorded in the
[integrated story reader checklist](implementation/atlas-integrated-story-reader.md#world-level-journey-marker-collisions).

Atlas Journey discovery now exposes all ten registered trips. Incomplete
Journeys carry a visitor-facing note that more places, stories, photographs,
and films will be added, while published Experiences appear at their exact
stops as soon as their Visit and Place IDs match. Local selector and copy
coverage passes through `npm run atlas:test`. Pull requests 287 and 288 plus
Pages run 45898969341 deployed the all-Journey discovery change, and live Uvita
verification found both exact Experience relationships. The follow-up
single-Moment card presentation now leads with the recognizable Moment title
while retaining the parent Experience title as context. The primary Atlas
inspector also hoists each matched Experience's full Moment text and registered
media into the selected stop, while preserving the existing nested Journey
reader as a second path for comparison. These inspector refinements remain
locally verified and not yet deployed.

Homepage map feedback now makes the root Atlas map immediately usable: the
Journey explorer card starts collapsed and returns to that compact state when
visitors navigate back to World. Its existing Open control still provides the
story list on demand. The behavior and automated coverage are recorded in the
[integrated story reader checklist](implementation/atlas-integrated-story-reader.md#phase-6-atlas-first-entry-shell).

The reviewed story generator from commit `38a6d5d` is reconciled with the
current publisher. For Experience rows, Preview generates `Atlas Story` from
private `Atlas Notes` and writes the guarded draft back to Sheets. Apply
publishes the reviewed Story without calling the model. An ordinary Preview
replaces the prior draft. The explicit `--reuse-story` recovery mode keeps the
current draft and resumes local planning without another model call or Sheet
write. See the [editorial workflow](implementation/editorial-sheet-publishing.md#story-generation-restoration-and-branch-audit).

Editorial Drive intake now streams each source file to private state while
incrementally computing its size and SHA-256. Existing snapshot verification
also hashes through a stream. This removes the former whole-file array-buffer
boundary for large source videos while preserving immutable snapshot checks.
Automated publication also follows required PR checks on the submitted head
commit rather than GitHub's temporary merge ref, so a successful validation can
advance through the guarded `develop` and `main` merges.

Editorial Windows subprocess repair: npm build commands now use Node and the
installed npm CLI instead of executing a `.cmd` shim directly. Existing Bajos
del Toro image/video packages and receipts passed nonpublishing verification.
Implementation and recovery details are in the
[editorial checklist](implementation/editorial-sheet-publishing.md#windows-build-launch-and-retry).
Git status capture also preserves its leading status columns, preventing the
first generated file's `src/` path from being misread as `rc/`. Real Git and
pending-publication scope regressions pass with the original allowlist intact.
The Bajos del Toro post is deployed through PR 267 and Pages run 45277672821.
Guarded recovery restored its missing Sheet publication metadata after the
original promotion PR closed, preserving the social Posted status. Recovery
evidence is in the
[editorial checklist](implementation/editorial-sheet-publishing.md#replaced-promotion-pr-and-social-status-recovery).
Drake Bay later completed the resumable publisher through PRs 277 and 278,
Pages run 45321807276, exact live media verification, Catalog refresh and
guarded Sheet row 20 writeback without manual metadata recovery.

Two separate lodging features are implemented. Main Atlas
`editorial:stays` previews approved sheet rows, compiles canonical lodging and
optionally uses protected publication with verified writeback. Rough public
location fields remain separate from explicit geography registration. Its
[Stays checklist](implementation/stays-sheet-intake.md) records source and
external-service acceptance. Private trip-owned stays use the existing My Atlas
destination picker and owner storage, with no publication into the main Atlas.
Their [implementation checklist](implementation/my-atlas-lodging-implementation.md)
tracks API/UI verification and release status.
The owner authorized release on November 23. The API is deployed as Worker
`3151c546-c995-4ebc-b857-61876be0f687`, with successful remote health,
authentication and CORS checks. Protected frontend promotion and final Pages
evidence are tracked in [pull request 260](https://github.com/cjust689/roamwithjustin/pull/260).

Planning follow-up: destination arrival/departure dates are visible in the
default Planning editor and save with notes. Canonical trips also support
optional private start/finish locations, each with its own dates. Flight tools
use those dates as suggestions, retain chosen airports and send normalized
airport codes in Expedia's documented handoff format. Verification, provider
limitations and release status are recorded in the
[active integrated trip checklist](implementation/my-atlas-integrated-trip-management-2026-11-21.md).

Current follow-up: save a trip name before destination entry, use one trip
location field for search/coordinates/Maps/Plus Codes, and expose explicit map
pin confirmation with a return to the originating form. Both canonical and
legacy planner paths are covered without account migration. Implementation,
actual verification and release state are tracked in the
[integrated trip checklist](implementation/my-atlas-integrated-trip-management-2026-11-21.md)
and [account-state architecture](architecture/my-atlas-account-state.md).

Current trip work: [Integrated trip management, November 21](implementation/my-atlas-integrated-trip-management-2026-11-21.md)
connects visit reassignment, per-trip public visibility, saved private travel
searches and Overview journey cards. It preserves independent destinations and
full visit identities. Its API is deployed to staging as
`71692099-3991-455a-b9e9-a8a794433a38`. PRs 228 and 229 released the integrated
feature, with alignment through PR 230 and successful Pages run 44912326394.
The compact workspace release includes one-row headers,
info popovers, switches and a single dialog with tabs for larger editors.
Clickable titles with pen icons replace standalone edit buttons; redundant
single-trip selection and unusable one-stop controls are hidden.
Switch press and saving feedback keeps the track in place.
Destination search now includes scrollable result cards, location context,
selected draft destinations and confirmation fixed inside the dialog.
Search selections populate their preview; manual coordinate entry is an
explicit optional alternative, explained by an info icon.
PRs 231 and 232 released this follow-up; Pages run 44918695671 succeeded.

Newest local feedback batch: registration readiness guidance, full-sidebar
collapse to a bottom restore control, map navigation hints, an in-map trip/stop
navigator, and marker containment corrections. The owner subsequently authorized
testing, fixes and promotion. Script and browser verification are recorded in
the active implementation checklist; deployment is tracked in the release handoff.

Released follow-up: touch-specific map help and collapsible public-profile
overviews with read-only in-map stop/trip navigation. Public trip grouping uses
a new limited API projection. Worker version
`9761acee-97a3-4cf1-b3e8-5e1ca3ff5232` is deployed. PRs 235 and 236 promoted
the frontend through develop/main; Pages run 44962250911 succeeded.

Layout follow-up: full-width mobile bottom restore bars for owner/public
views and provider information moved beside the upper map controls. This is
separate from the reported saved-Atlas loading incident, which remains open.

Profile-photo follow-up: uploaded My Atlas photos suppress right-click
saving and dragging in the owner preview, public profile/full-image dialog and
Explore cards. Other site and Viator images retain their browser behavior.
[Favorite travel image implementation](implementation/my-atlas-favorite-travel-image.md#profile-photo-interactions-november-21)
records verification and limitations. The owner authorized develop/main promotion
on November 21; release tracking is recorded in the implementation checklist.

Public Atlas view states: a single on-map View selector chooses Planned,
Past or Destinations with matching cards and pins. Public Story downloading
is removed; owners retain their Story export. Explicitly published planned
trips are projected separately
from visited geography, preserving the existing public response for older
clients. Planned-only profiles can be published without creating a visited
place. Private trip content remains excluded. Worker
`abf6fa12-b4ca-4239-8cfb-a860fbdaf41a` is deployed; live public-profile reads
returned both lifecycles. PRs 239 and 240 released the frontend through develop/main; Pages run
44988943277 succeeded. Live checks passed for both lifecycles, map filtering
and owner-only export. See the
[public grouped browsing checklist](implementation/my-atlas-integrated-trip-management-2026-11-21.md#public-grouped-trip-browsing-local).

November 22 map correction: Show/Hide map memories now applies to visited and trip
pins, including selected markers. Trip pins consolidate using the primary Atlas
clustering rules, count physical locations and expand on activation. Stop numbers
are replaced by dots while explicit Start/Finish markers and ordered paths remain.
Verification is recorded in the active integrated trip checklist.
The mobile route key also moves to the upper-left map corner with space
reserved for SDK controls and attribution; open/hidden menu layouts were checked.
The header follow-up aligns branding, theme, profile and collapse controls
in one row. The collapsed bar retains the themed RWJ mark and My Atlas label.
Menus, sidebar changes and native dialogs use short transitions with reduced-
motion support; focus, pending-save guards and unsaved drafts were checked.
The mobile navigator now contains its own gesture-help icon instead of
overlapping the floating Map gestures control. Its height follows the available
map area, with Previous/Next kept outside the scrolling stop details, for owner
and public views.
The location picker now uses one field for coordinate pairs, compass/DMS
coordinates, Google/Apple links and Plus Codes. Separate latitude/longitude
inputs are removed. Short Plus Codes require a chosen nearby reference before
confirmation. See the [location implementation record](implementation/my-atlas-location-experience-commerce.md#unified-location-input-november-22-local).
The shared-trip header also insets the RWJ mark inside its rounded pill,
with aligned 44 pixel brand/theme controls and verified mobile spacing.

November 22 promotion: the owner authorized develop/main release of this
map, navigation, motion, location-input and shared-branding batch. The compatible
map-link parser is deployed as Worker `70d750e9-9dbc-4dd1-9a8e-2053d1287480`.
Source commit `e6bc867` passed GitHub validation run 45034855868 and merged
through [develop PR 241](https://github.com/cjust689/roamwithjustin/pull/241).
[Main promotion PR 242](https://github.com/cjust689/roamwithjustin/pull/242)
tracks protected-branch release status; the integrated trip implementation
handoff links the checks and Pages workflow.

Explore alignment follow-up: the in-map Explore opener explicitly centers its text
and arrow vertically, with a consistent line height and retained 44 pixel target.
Owner and public layouts were checked in both themes with menus open and hidden.
The owner authorized develop/main promotion; protected checks, Pages status and
post-deployment acceptance are recorded in the release PRs.

Sharing follow-up: List my profile in Explore Atlases in Profile settings
is the single profile visibility control. On publishes and lists the profile;
off removes the listing and makes it private in one atomic save. Overview retains
direct-trip guidance and Story export without a separate public-profile control.
Customize My Atlas retains the favorite-image editor; direct trip links remain
independent. Existing unlisted profiles are not advertised automatically.
The owner authorized develop/main promotion. The integrated trip implementation
record tracks verification, and the release PRs record protected checks,
deployment and post-deployment browser acceptance.

Profile-surface follow-up: Profile settings now uses the shared native
modal with an opaque panel, dimmed/blurred backdrop, trapped focus and internal
scrolling. This separates it from sidebar/map controls while retaining account
recovery, drafts, pending-save guards and Customize navigation.
The owner authorized develop/main promotion; its release PRs record protected
checks, Pages deployment and post-deployment browser acceptance.

Local journey-summary follow-up: Planned and Past journeys now lead with known
dates, compact numbered destinations, memory previews and a View journey on map
action. Read-only lifecycle and visibility badges replace summary switches.
Destination recaps and tabbed journey management keep editing controls out of the
default summary, with pointer/keyboard reordering, explicit permanent-removal
confirmation and a separate read-only sharing dialog. The expanded mockup pass
adds separate trip list/detail views, an Overview destination detail view,
compact journey cards and two sharing cards with owner-only Story preview.
Mobile signed-in menus fill the viewport and retain the full-map collapse action.
An additive Worker change supports named empty drafts and private planning notes;
capability checks preserve compatibility with older servers. Public projections
remain unchanged. The owner authorized develop/main promotion. Compatible Worker
`b84e61df-6755-4cbd-aed2-f4d1d794ffa4` is deployed, with seven remote health,
authentication and CORS checks passing without account writes. The active
integrated-trip checklist records verification; protected checks, Pages deployment
and live frontend acceptance are recorded in the release PRs.

Destination follow-up: the main journey list now exposes drag handles directly,
including edge scrolling for long lists. The destination editor replaces its
six-tab row and empty Recap step with one native section picker. Past visits
open on Memory, Planned visits on Planning notes; Dates, Experiences and More
actions remain available without a wide toolbar. Local verification passed;
the integrated-trip checklist and release PRs track protected promotion and
post-deployment browser acceptance for this follow-up.

Public header alignment: the public Atlas now uses the owner overview's RWJ mark
and My Atlas lockup, with 44 pixel theme, Explore and collapse controls in one row.
The separate Hide overview row is removed. The Explore link is a labeled compass
button; the existing public map, favorite image and collapse/restore behavior
remain. Verification and release tracking are in the integrated-trip checklist.

Site appearance: [Classic and Explorer architecture](architecture/visual-themes.md)
and [theme implementation and verification](implementation/theme-toggle.md).
The owner-approved amber and orange SVG marks now follow the selected theme;
the same masters produce the browser favicons and stable amber app icons.
Pull requests 214 and 215 promoted the release through develop and main.
Pages run 44779910068 succeeded, and live Chrome passed 24 theme/brand/favicon
checks across six header routes at mobile and desktop widths. The existing
My Atlas API also serves the registration response correction as Worker
version `b5b3674c-6219-4053-b024-7cb65cd4e539`.

Start here before using an older implementation brief.

Current completion inventory: [Release completion checklist, November 20, 2026](implementation/release-completion-checklist-2026-11-20.md).
PRs 224 and 225 and Pages run 44847083891 deployed the recent tabs, location and
trip-workspace source. The inventory separates released code from disabled trip
writes, unfinished implementation, provider/content dependencies and acceptance.

Latest owner correction: adding a visited destination must not create a trip.
The destination model keeps visits ungrouped until explicitly assigned
to a named trip. The review now counts destinations separately from existing
planned trips and replaces the typed phrase with a name and retention checkbox.
See the independent-destinations correction in the trip transition checklist.
Staging Worker `21912d9e-652a-4693-ab15-222d0e9eb6b8` first enabled this explicit
version-2 save flow; the November 21 staging version above extends it. PRs 226
and 227 merged the independent-destination correction and profile controls
through develop and main before the current local integrated feature.
The profile follow-up separates Share Your Atlas, Customize My Atlas and
the top-right profile dropdown. Story-image creation stays on Overview; profile
links, private data export and deletion are in the dropdown. The active trip
transition and account-state documents record the tested navigation boundaries.
Owner controls also share local hover/press/focus feedback, 44 pixel touch
targets and busy indicators for the main save/export actions, with reduced-motion
support. These controls were included in PRs 226 and 227.
Explore Atlases in the intro now uses an outlined secondary pill with the same
height and alignment as Sign in or Quick start.
Share Your Atlas and Customize My Atlas now use matching disclosure headers
with the same Open/Hide control and keyboard behavior.

My Atlas mobile action feedback and the explicit trip-architecture acceptance
audit are tracked in [Trip centric transition](implementation/my-atlas-trip-centric-transition.md).
Creator-first trip organization is now the next priority. The local foundation
adds canonical occurrence contracts and an owner-only migration preview with
no account or alarm writes. The following local slice adds canonical persistence, explicit upgrade/rollback,
occurrence editing and Combine into Trip, with writes disabled by default.
The local creator workspace now selects trips, edits occurrences, combines Past trips
and shares ordered read-only snapshots. Upgrade remains gated; the record distinguishes
fixture-tested behavior from real-account rollout acceptance.
The Visited list now exposes Group destinations directly, carrying the selected
places into upgrade review and the trip grouping form without a special URL.
The local owner UI now separates Overview, Planning and Past tabs. Visited Atlas
sharing lives on Overview; each saved trip retains its own share action.
Staging Worker `fc6a784b-7e87-4850-b335-5f292771f276` now serves the trip
read/preview routes used by localhost. Upgrade writes remain disabled; deployment
and unauthenticated route/CORS evidence are recorded in the transition checklist.

The full canonical trip architecture remains partial. The new explicit
Planned/Past transitions and migration APIs are locally tested, with writes
disabled in default and staging configuration. No real account was migrated.
The account-state architecture also describes the optional Instagram profile
link and Explore image-refresh follow-up, tracked in the private-beta checklist.

The source code and tests determine what exists. Documentation describes that
verified behavior, records active work, or preserves proposals and history.
An old Markdown claim is never implementation evidence.

## How to use these docs

1. Find the subsystem in the system map below.
2. Read its as-built architecture document.
3. Read a linked implementation or proposal only when it is relevant.
4. Inspect the listed code paths and tests before changing behavior.
5. Update the architecture and active-work documents when verified behavior or
   project status changes.

Document metadata uses these meanings:

- `architecture`: behavior verified in current source and tests.
- `implementation`: bounded active work; check its progress and known gaps.
- `proposal`: desired behavior that is not currently available.
- `reference`: stable operational, editorial, or integration guidance.
- `historical`: preserved context that must not be used as current instruction.

`status: implemented` requires `verification.state: verified` and concrete
evidence. Partial delivery remains `in-progress` / `partial`.

## System map

| Subsystem              | As-built authority                                                                                                                                                                                                                                                                                                                                                                                                | Operational/reference guide                                                                                                                                                                                                                                                                                                                                                           | Verified state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical content      | [Content model](architecture/content-model.md)                                                                                                                                                                                                                                                                                                                                                                    | [Atlas feature guide](../src/features/atlas/README.md) and [active story reader implementation](implementation/atlas-integrated-story-reader.md)                                                                                                                                                                                                                                      | Media, Places, Journeys, Visits, Experiences, Moments, Partners, selectors, and validation exist. Journeys and geography remain curated authorities. An explicit Sheet-backed registration command can add a reviewed generated Place, Visit, and Atlas pin, while ordinary publication cannot infer geography. A separate generated editorial shard adds stable Post-authored Experiences and Moments. Published Experiences project into Journey pages with stable deep links and into exact Atlas stops when their Visit and Place IDs match. All ten registered Journey roots derive a canonical story lead. Incomplete Journeys include a natural update note instead of internal workflow labels. Pull requests 208 and 209 plus Pages run 44737312245 deployed the earlier three-Journey selector-backed rail; the all-Journey discovery change is locally verified and not yet claimed as deployed. Published bodies render through one shared component on the standalone Journey page and inside a deep-linkable Atlas reader that retains the mounted map, route context, scroll positions, and a mobile map peek. Stop previews derive exact Journey chapter relationships from canonical day-to-Visit references and exact Experience relationships from matching Visit and Place IDs. The focused mobile reader exposes a modal dialog, while map peek and desktop split view expose a named nonmodal region. `/` now renders this Atlas directly without creating another content projection.                                                                                                                 |
| Media                  | [Media pipeline](architecture/media-pipeline.md)                                                                                                                                                                                                                                                                                                                                                                  | [Journey media implementation](implementation/journey-media-ingestion.md) and [R2 Worker upload](implementation/r2-worker-media-upload.md)                                                                                                                                                                                                                                            | Journey and Place/Visit image optimization plus lossless MP4 pass-through packaging, authenticated manifest-only upload, ingestion, reversible placement culling, Journey media, location media, and existing-Atlas-pin projection exist. Editorial Drive folders may mix JPEG, PNG, and MP4 files, which the publisher partitions internally by delivery policy. Worker deployment remains externally unverified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Gear                   | [Gear system](architecture/gear.md)                                                                                                                                                                                                                                                                                                                                                                               | [Gear authoring workflow](reference/gear-authoring-workflow.md), [Gear Sheet workflow](reference/gear-sheet-workflow.md), [Gear ingestion CLI](reference/gear-ingestion-cli.md), [Gear image preparation](reference/gear-image-preparation.md), [active implementation](implementation/gear-publishing.md), and [readiness audit](audits/gear-affiliate-readiness-2026-11-17.md)      | Canonical generated Gear/Usage ingestion, a generated Excel authoring workbook with a reusable Gear Library, explicit Google Sheet preview/apply with verification writeback, public selectors, and the registry-backed Gear page exist. Gear merchant actions reuse canonical Partner IDs, explicit tracking modes and hosts, and the strict shared `partner_click` path. Amazon Associates is registered for complete owner-generated URLs on a bounded host allowlist, with no automatic tag rule. Pull requests 157 and 158 plus Pages run 44407947707 promoted the foundation. Pull requests 164 through 169 and Pages runs 44447213314, 44449597304, and 44452107546 then promoted Journey-independent preparation, receipt-backed immutable WebP upload, and card-approved canonical image revisions. A file-based authoring command now composes record preview, local or authorized remote image review, immutable upload, and canonical publication through two explicit checkpoints. Remote intake requires reviewed creator-owned rights, one exact approved HTTPS host, pinned public DNS results, bounded same-host redirects, and byte, signature, decoded format, and pixel checks. Pull requests 200 and 201 plus Pages run 44663455644 promoted that intake to production merge `2c2244f77eeb3282bce00b06aff68ef48d0b3ae9`. The generated registry remains empty. The first real product still requires reviewed product, usage, image-rights, and merchant inputs, and the external Worker deployment remains unverified.                                                                                                                         |
| Analytics and commerce | [Monetization and analytics](architecture/monetization-and-analytics.md)                                                                                                                                                                                                                                                                                                                                          | [Tracking audit](audits/ga4-tracking-audit-2026-11-17.md), [event dictionary](reference/analytics-event-dictionary.md), [lodging operations](reference/lodging-partner-operations.md), [AdSense operations](reference/adsense.md), and [active plan](implementation/monetization-and-analytics.md)                                                                                    | A production-host-only GA4 adapter preserves Enhanced Measurement as the safe page-view default. Direct and client-routed private My Atlas activity is excluded, and public Atlas plus canonical Partner events use a strict contract. Six lodging records resolve through canonical Partners and a verified audit command; the same audit flags `La Fortuna Airbnb` for an exact owner URL. The Utah 2025 story has a deployed, visitor-activated Expedia stays and flights block using the owner-supplied campaign reference and unique Pubrefs. Canonical Gear actions reuse the same Partner and `partner_click` contract with optional public `gear_id`; no merchant-specific automatic Gear tracking rule is active. Cross-origin Expedia banner clicks continue to use Pubref reporting. The conservative AdSense implementation remains disabled by default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Deployment             | [Project README](../README.md#how-production-works)                                                                                                                                                                                                                                                                                                                                                               | [Pages workflow](../.github/workflows/deploy-pages.yml) and [editorial implementation](implementation/editorial-sheet-publishing.md)                                                                                                                                                                                                                                                  | GitHub Actions builds and deploys the static Vue site to Pages. Protected `develop` and `main` require pull requests, merge commits, and the strict `validate` check. The explicit Place registration release was promoted through pull requests 42 and 43, then its table-compatible `New Place` correction through pull requests 44 and 45. Develop runs 43866268383 and 43867984954 and Pages runs 43866785598 and 43868555523 succeeded. The live Catalog refresh and actual table metadata readback then verified the new request choice without changing Posts values.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| My Atlas               | [Geographic catalog, local proof, and Worker index](architecture/my-atlas-geography.md), [Auth0 browser authentication](architecture/my-atlas-authentication.md), [API authentication](architecture/my-atlas-api-authentication.md), [registration and operator recovery](architecture/my-atlas-registration.md), and [profile, pin, sharing, and private planning state](architecture/my-atlas-account-state.md) | [Accepted private beta target](proposals/my-atlas-private-beta.md), [trip-planning target](proposals/my-atlas-trip-planning.md), [active planning implementation](implementation/my-atlas-trip-planning.md), [favorite travel image implementation](implementation/my-atlas-favorite-travel-image.md), and [MapTiler SDK migration](implementation/maptiler-sdk-session-migration.md) | Permanent account deletion releases identity and handle assignments while preserving safe exact retries. A stale deletion revision now performs one authoritative profile read, persists the recovered revision with the original idempotency key, and retries once instead of trapping later clicks and reloads in repeated HTTP 412 responses. Planner refresh reads wishlist and plan state through one atomic account snapshot, and other HTTP 412 mutation recovery reads the authoritative profile revision before one write retry. The browser normalizes both strong and weak response ETags to the same monotonic revision while retaining strong `If-Match` on every mutation. The planner provides direct Add to trip, a private route overlay, read only trip links, optional nearby ideas, and Expedia handoff. A shared trip opens the same route projection without account or editing controls and keeps its itinerary as a compact overlay. Curated Atlas and My Atlas share the official MapTiler SDK JS runtime with explicit session tracking and no direct MapLibre application dependency. One favorite travel image has an authenticated Images transform, immutable private R2 replacement, local Story export use, an explicit public visibility choice, and a labeled public profile hero with full image viewing. Legacy images remain private until the owner opts in. Staging Worker version `1113afaf-4600-4777-b92d-b2eb40e43826` exposes the new public image and visibility boundaries. Pull requests 196 and 197 plus Pages run 44658409109 promoted and deployed the frontend. Authenticated acceptance remains an external gate. |

My Atlas staging Worker version `242ef647-283c-415d-99d5-493e4be38313`
corrects the favorite-image visibility route gate so authenticated
`PATCH /v1/me/atlas-image` requests reach the implemented mutation instead of
returning HTTP 405. Remote staging returned HTTP 401 for the same request
without a bearer token, proving that it now passes method routing and reaches
authentication.
Pull requests 204 and 205 promoted the correction through protected branches,
and Pages run 44678154430 deployed production merge
`84c546e078ce2b50097d20b16803ff5200f94182`.

Explore Atlases is now implemented locally at `/my-atlas/explore`. It lists
only public profiles whose owners separately opt into discovery, shows the
handle and approved favorite image, favors public Atlas activity from the prior 24 hours,
and continues through older profiles with an opaque cursor. The companion
`npm run my-atlas:account:wipe` command is dry run by default, verifies the
signed in handle, and reuses permanent My Atlas deletion. It has no access to
the curated Roam With Justin Atlas. Both features are test verified but not
frontend deployed or externally accepted. Staging Worker version
`600da38d-29c5-410d-9290-48dbe89a609f` now serves the directory with HTTP 200
and production-origin CORS. The admin wipe preview rejects missing tokens
with HTTP 401. No real account wipe was performed.

The wipe command also supports `--all` using an admin token. It previews active
handles and requires `WIPE ALL USER MY ATLAS ACCOUNTS` before applying a global
reset in the selected environment. Pending registrations and invitations remain.
This mode is locally tested, with no real account wipe performed.

The local owner My Atlas route now requires sign-in and a loaded account
before showing private map data or account tools. The empty map remains visible
before sign-in. Signed-out draft exploration is
removed, while public shared views remain accessible.
The owner entry screen also links directly to Explore Atlases beside sign-in.
Local account deletion and private export controls now sit below the
public/private sharing controls instead of inside the trip planner.
The branch also corrects a locally reproduced registration response mismatch
that made the browser reject a successfully created profile after handle
reuse. The registration response now includes discovery visibility and account
counts. This server correction remains undeployed; specific live handle
conflicts still require their response status and error code to distinguish.

## Active work

The local My Atlas reload safety correction removes automatic replay of stored
account deletion on loading/HMR, binds explicit retries to the selected account,
and preserves the configured backend during normal local development. A
controlled 48-test Worker run left the running local database unchanged.
Details and verification are in the private-beta checklist and account-state
architecture. Local and staging account stores remain separate.

The [location, recap and destination-link work](implementation/my-atlas-location-experience-commerce.md)
shipped its foundation slice through pull requests 222 and 223. Pages run
44820076141 deployed main `e27eca51f2aacd3340c90024e0f032c501b2d220`;
Worker version `d3286de9-e52a-4e0e-b39c-3a005e5b911f` serves the compatible
account changes. The next local slice adds the shared location picker, explicit
Maps URL previews, guarded short-link resolution, custom-pin editing and recap
entry shortcuts. The following local editorial phase adds preview-first
canonical experience intake and shared story/stop cards, with private evidence
stripped from public records. These follow-up changes are not yet deployed. Real Viator
search still returns 401; enabled Expedia URLs and merchant placement approval
remain owner actions. Normal localhost continues using its configured staging
backend and catalog, with no automatic switch to isolated account storage.

The November 20 My Atlas release adds optional Instagram handles, refreshable
Explore image cards, mobile action confirmations, and required favorite-photo
location labels. New photos and explicit image publication require a label;
existing photos can receive one without reuploading. Verification and release
state are tracked in the active private-beta, trip-transition, and
favorite-travel-image implementation documents. Protected pull requests 218
and 219 promoted the release; Pages run 44797186548 deployed it successfully.
The matching Worker is deployed and live page/bundle checks passed. Genuine
authenticated remote image acceptance remains externally unverified.

The [trip centric transition](implementation/my-atlas-trip-centric-transition.md)
reconciles the new canonical-trip and flight/rental briefs with the existing
single-plan storage. Independent browser flight and rental tools are implemented
locally. Canonical trip migration, reversible lifecycle, persistent logistics,
and grouped trip maps remain in the recorded implementation sequence.

| Work                                                                                   | Status             | What remains                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Journey media ingestion](implementation/journey-media-ingestion.md)                   | Partial, verified  | The Sheet coordinator now reuses preparation, upload, receipts, and ingestion. Verify the production Worker credentials and first real row-backed R2 batch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| [R2 Worker media upload](implementation/r2-worker-media-upload.md)                     | Partial, verified  | Deploy to the owner's Cloudflare account, install the upload secret, and verify the first real immutable image/video batch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| [Gear publishing](implementation/gear-publishing.md)                                   | Partial, verified  | The publishing foundation and repository-side image workflow are deployed, and exact live Gear page and bundle markers are verified. Journey-independent preparation, authenticated immutable WebP upload, checksum receipts, an idempotent rollback-safe canonical image transaction, and a two-checkpoint file-based authoring command are implemented. The first product publication still needs reviewed identity and usage inputs, an owner image, merchant data, a verified real upload, and card approval.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [Monetization and analytics](implementation/monetization-and-analytics.md)             | Partial, verified  | The Utah Expedia banners are deployed and production rendering is verified. Confirm final destinations, Pubref attribution, program eligibility, disclosure and privacy acceptance, and responsive accessibility. Verify GA4 `partner_click` separately on direct Partner links because cross-origin Expedia banners are not locally observable. Complete the remaining GA4, direct-route, AdSense account, and consent checks before drawing acquisition or monetization conclusions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [Single-row Sheets and Drive publishing](implementation/editorial-sheet-publishing.md) | Partial, verified  | One-command preview/apply, friendly routing, the protected Atlas Reference, Drive snapshots, generated Experience/Moment presentation, and guarded GitHub promotion are implemented. A separate explicit `New Place` choice uses the row's Location to create or reuse a Place, add its Visit and Atlas pin, refresh the Catalog, and bind the requesting row without allowing ordinary publication to infer geography. The live Sheet table and 106 current bindings are verified. Drake Bay has now completed the row-backed Drive/R2 path through protected promotion, live verification and guarded Sheet writeback. The first live Place registration remains owner-controlled and unverified. Missing Journey creation and optional polling remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [My Atlas private beta](implementation/my-atlas-private-beta.md)                       | Partial, verified  | The deployed visited-map scope remains as previously verified: secure registration and owner state, canonical and custom visited pins, optional dates and memories, public-safe sharing, timeline playback, statistics, tutorials, Story export, and resilient search. My Atlas uses the existing Poppins family throughout its interface and Story canvas without requesting Russo One. The active staging `geonames-2026-11-18-reviewed-utah-catalog-v3` catalog contains 23 reviewed spots, Torrey and Hanksville, plus bounded 4,096-shard search and exact-resolution indexes. The six owner-reported wishlist IDs now require 212,348 decoded record bytes instead of approximately 3.45 MiB. Staging Worker `5234f470-dfc9-4d4c-af2b-3dbb922f0a9a` explicitly allows 30 seconds of CPU and persists invocation logs. Public health, search, and exact-resolution checks are verified; authenticated private-state acceptance remains owner action. Earlier manifests remain available for reversal. The linked trip-planning implementation owns wishlist, future-plan, retention, and account-deletion work. Reporting, moderation, and server share HTML remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [My Atlas trip planning](implementation/my-atlas-trip-planning.md)                     | Partial, verified  | The signed-in overview opens the route-first planner, and the profile control lives in the upper right. Planner refresh uses one atomic wishlist and plan snapshot. A stale write reads the authoritative profile revision before one retry, while incomplete-success recovery confirms the saved plan through an authoritative read. The browser now accepts an intermediary-weakened response ETag without misreporting a successful wishlist write as an invalid API response, and it still sends strong revision preconditions. A saved trip keeps route editing collapsed and exposes Share saved trip without requiring the planner to open. This read only route snapshot remains separate from the Share Visited Atlas workflow and does not require visited pins. Its recipient view now presents the semantic route on the existing MapTiler projection with the compact itinerary layered over the map. Pull requests 208 and 209 plus Pages run 44737312245 deployed the shared map, and live rendering verified its itinerary, map shell, and exact route-key bundle markers. The planner groups Directions and the planning prompt under Trip tools and uses a stable Saved places disclosure instead of changing Want to go and Hide want to go labels. Desktop uses the owner panel as the single scrolling surface. Owners can request optional nearby ideas in the planning prompt and open a dated neutral Expedia search for an explicit Fly boundary. Completed account deletion releases its identity and handle assignments while preserving exact retry safety. Pull requests 196 and 197 plus Pages run 44658409109 deployed the weak ETag recovery and separate trip and Visited Atlas sharing workflows. Authenticated owner interaction and provider behavior remain external acceptance. Stable schema v2 node identity, persisted logistics, stays, and commercial activation remain separate. |
| [My Atlas favorite travel image](implementation/my-atlas-favorite-travel-image.md)     | Partial, verified  | One account-level favorite travel image is implemented for owner Story export and explicitly approved public profile use. The Worker enforces a 10 MiB input ceiling, 36 megapixel decode ceiling, exact 1200 by 1200 WebP output, 1 MiB stored ceiling, immutable private R2 replacement, removal, and account-deletion cleanup. Public delivery rechecks the active public profile and image visibility without exposing the R2 key. The public profile identifies the favorite image, offers a full image view, and includes it in signed out Story export. Legacy images remain private until the owner opts in. Staging Worker version `1113afaf-4600-4777-b92d-b2eb40e43826` passed health, PATCH preflight, and closed public image checks. Authenticated account acceptance remains external. The older per-destination photo scope is superseded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| [MapTiler SDK JS session migration](implementation/maptiler-sdk-session-migration.md)  | Complete, verified | Both interactive Atlas maps use the official SDK with explicit session tracking, persistent MapTiler caching, hybrid style and SDK terrain. The direct MapLibre dependency, imports, worker setup, hand-built terrain URLs, and demo basemap fallback are removed. Protected pull requests 188 and 189 plus Pages run 44629848589 deployed the migration. Live Chrome observed 75 chargeable tile requests with zero missing `mtsid` values and exactly one shared session identifier across Atlas, a Journey, and My Atlas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [Atlas integrated story reader](implementation/atlas-integrated-story-reader.md)       | Partial, verified  | Phase 0 through Phase 8 is locally implemented and selector-tested. All ten registered Journey roots expose their canonical story route. Incomplete Journeys use a natural update note instead of internal workflow labels, and published Experiences project to exact Atlas stops before the full Journey is complete. The primary stop inspector now renders matched Moment text and media inline while preserving the nested full Journey reader for comparison. The substantive shared Journey body opens inside Atlas without remounting the MapTiler SDK map. The root route enters Atlas directly, with its Journey explorer collapsed for immediate map use. Feature-enabled builds expose My Atlas once in the toolbar and once through a dismissible per-session invitation outside story state. Desktop split-pane, mobile focused sheet and map peek, deep linking, Back and Forward, exact chapter focus, reader and inspector scroll restoration, deferred embedded video, same-stop handoff, reduced motion, image focus return, keyboard containment, conditional dialog and region semantics, simplified mobile detail hierarchy, invalid-link repair, unavailable-story handling, and the standalone Journey regression are checked from 320 through 1,280 pixels plus prior wide-screen checks. The progressive discovery change is deployed; the Moment label and inline inspector refinements have automated local coverage but no production deployment claim. Production engagement review, real-device review, and assistive technology acceptance remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Proposals and backlog

These documents describe proposed targets or partially delivered work. Their
implementation status must be checked before treating a feature as available:

- [Lightroom publishing](proposals/lightroom-publishing.md)
- [Photo EXIF and capture gear](proposals/photo-exif-gear.md)
- [Video metadata pipeline](proposals/video-metadata-pipeline.md)
- [My Atlas private beta](proposals/my-atlas-private-beta.md), accepted and
  partially implemented through its local geographic proof
- [My Atlas bucket list and trip planning](proposals/my-atlas-trip-planning.md),
  accepted and locally implemented as a first private slice
- [My Atlas planner redesign and travel handoffs](proposals/my-atlas-trip-planner-handoffs.md),
  whose readable planner, ephemeral directions, private map overlay, read only
  sharing, and neutral dated Expedia handoff are locally implemented while
  schema v2, stays, and commerce remain future work
- [Three-day GA4 improvement roadmap](proposals/ga4-three-day-improvement-roadmap.md),
  accepted and locally implemented through its first public measurement slice
- [Gear ingestion, affiliate, analytics, and optional AI expansion](proposals/gear-ingestion-affiliate-analytics-ai.md),
  partially implemented through the canonical Gear and Usage foundation plus
  local product-image preparation, receipt-backed upload, and canonical image
  publication; the first reviewed product remains owner-gated future work
- [Planning-to-booking partnerships and commerce](proposals/travel-booking-affiliate-partnerships.md),
  whose private-planning prerequisite is implemented while merchant handoffs
  and sponsored placements remain future work
- [First public editorial affiliate activation](proposals/affiliate-activation-public-editorial.md),
  deployed for the Utah 2025 Journey using the owner-supplied Expedia banner
  code; advertiser reporting and external acceptance remain

The [accepted single-row Sheets and Drive target](proposals/single-row-sheets-drive-atlas-publishing.md)
is partially implemented and tracked by the active implementation document.

## Reference and editorial guidance

Before generating or revising public travel content, read the
[Experiential storytelling framework](reference/storytelling-framework.md)
completely, then reconcile the relevant owner-supplied travel context against
canonical source and registered media. The framework governs voice and pacing;
it never turns an unverified detail into fact.

Public travel prose also avoids dash punctuation, semicolons, and colons unless
a colon immediately follows a numeral. Public interface copy avoids redundant
decorative labels above headings. Small labels are reserved for functional
context that is not otherwise visible, such as dates, state, category, or
controls. `npm run content:validate` enforces those source-level boundaries and
rejects known editorial workflow phrases in visitor-facing components.

Use the [sitewide editorial voice](reference/editorial-voice.md) for the Atlas
shell, Gear, My Atlas, and commercial supporting copy. It supplements, and
does not replace, the stricter travel-story framework.

- [Living Atlas content strategy](reference/atlas-content-strategy.md)
- [R2 video delivery](reference/r2-video-delivery.md)
- [AdSense manual placement and activation](reference/adsense.md)
- [Public analytics event dictionary](reference/analytics-event-dictionary.md)
- [Lodging Partner URL and tracking operations](reference/lodging-partner-operations.md)
- [Gear image preparation](reference/gear-image-preparation.md)
- [Gear authoring workflow](reference/gear-authoring-workflow.md)
- [GA4 tracking audit](audits/ga4-tracking-audit-2026-11-17.md)
- [Experiential storytelling framework](reference/storytelling-framework.md)
- [Travel context and evidence boundaries](reference/travel-context.md)
- [USVI / St. John source notes](reference/usvi-st-john-source.md)
- [Sitewide editorial voice](reference/editorial-voice.md)

Reference documents can contain owner-supplied facts, workflows, or external
service guidance. They do not override canonical repository records.

## Audits

- [Documentation inventory and migration](audits/documentation-inventory-2026-11-14.md)
- [External-link audit](audits/external-links-2026-11-14.md)
- [Journey-media inventory snapshot](audits/journey-media-inventory-2026-11-14.md)
- [Gear and affiliate readiness](audits/gear-affiliate-readiness-2026-11-17.md)
- [Sitewide copy audit](audits/sitewide-copy-audit-2026-11-17.md)
- [Sitewide story punctuation audit](audits/sitewide-story-punctuation-2026-11-19.md)
- [Atlas integrated story reader Phase 0 audit](audits/atlas-integrated-story-reader-phase-0-2026-11-18.md)
- [Atlas integrated story reader Phase 2 verification](audits/atlas-integrated-story-reader-phase-2-2026-11-18.md)
- [Atlas integrated story reader Phase 3 verification](audits/atlas-integrated-story-reader-phase-3-2026-11-18.md)
- [Atlas integrated story reader Phase 4 local refinement](audits/atlas-integrated-story-reader-phase-4-2026-11-18.md)
- [Atlas integrated story reader Phase 5 mobile hierarchy](audits/atlas-integrated-story-reader-phase-5-2026-11-18.md)
- [Atlas integrated story reader Phase 6 Atlas-first shell](audits/atlas-integrated-story-reader-phase-6-2026-11-18.md)
- [My Atlas destination memory and photo Phase 0 audit](audits/my-atlas-destination-memory-photo-phase-0-2026-11-19.md)

## Archive policy

Superseded and completed briefs live under [`archive/`](archive/). Each has an
archived warning and metadata pointing to its current replacement where one
exists. Archived files preserve requirements and rationale but are excluded
from the normal agent reading path.

Do not delete an archived brief merely because its feature shipped. Do not use
an archive document as an implementation instruction without rechecking the
current source and active docs.

## Validation

Run:

```bash
npm run docs:audit
```

The audit checks frontmatter, controlled metadata, document IDs, supersession
links, listed code/evidence paths, and relative Markdown links. It checks
structure only; it cannot prove application behavior.

## Known unknowns

- Cloudflare R2 bucket policy, object metadata, CORS, and credentials are not
  verifiable from this repository.
- The GA4 property configuration and received production events require owner
  or Analytics-console verification.
- The owner supplied two Expedia banner configurations and their campaign
  reference for the public Utah slice. Repository tests verify exact local
  configuration and Pubrefs, but advertiser eligibility, live banner
  destinations, provider attribution, commissions, disclosure acceptance, and
  dashboard state remain externally unverified. The placeholder Booking.com
  identifier has been removed from public source.
- No Lightroom plug-in, background publishing watcher, or EXIF extractor
  exists. The local one-row publisher must be started explicitly.
- My Atlas has owner-reported Auth0 SPA and API resources, an implemented
  browser client, and a deployed staging token-validation Worker. Auth0
  accepted both configured callbacks and routed the configured connection to
  Google in noninteractive checks. The owner verified the interactive browser
  flow, token acquisition, and genuine-token staging Worker round trip. Tenant
  dashboard readback remains externally unverified. My Atlas now has
  provisioned staging SQLite Durable Objects, account controls, a safe
  client-rendered share view, and tests. Isolated staging R2, Durable Objects,
  a weighted limiter, policy defaults, and secrets are deployed. The owner has
  a staging account. The browser route remains disabled by default and is now
  wired to explicit GitHub repository variables for controlled production
  frontend testing. No external invited beta account is verified.
- Owner OAuth, live Sheet reads, the table-aware schema and identity migration,
  the visible protected Reference, the hidden Catalog, and all 106 Journey and
  Place bindings are verified. Eighty-two rows have Visit-backed Atlas Place
  choices. Experience and
  Moment compilation is test-verified. Guarded GitHub promotion, Actions,
  Pages, rendered production output, and merge-only protected-branch rules are
  live verified. Bajos del Toro media and editorial records are deployed, and
  final Sheet metadata was recovered and verified. Drake Bay then verified live
  Story generation, uninterrupted resumable publication and Sheet writeback.
  The first explicit generated Place registration and any optional Utah 2026
  Salt Lake City Airport transit Visit remain externally unverified.

**Last repository documentation audit:** 2026-11-20.
