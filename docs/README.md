---
id: docs-index
title: Documentation Index
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-14
updated: 2026-11-19
related:
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

Start here before using an older implementation brief.

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

| Subsystem              | As-built authority                                                                                                                                                                                                                                                                                                                                                                                                | Operational/reference guide                                                                                                                                                                                                                                                                                                                                                      | Verified state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical content      | [Content model](architecture/content-model.md)                                                                                                                                                                                                                                                                                                                                                                    | [Atlas feature guide](../src/features/atlas/README.md) and [active story reader implementation](implementation/atlas-integrated-story-reader.md)                                                                                                                                                                                                                                 | Media, Places, Journeys, Visits, Experiences, Moments, Partners, selectors, and validation exist. Journeys and geography remain curated authorities. An explicit Sheet-backed registration command can add a reviewed generated Place, Visit, and Atlas pin, while ordinary publication cannot infer geography. A separate generated editorial shard adds stable Post-authored Experiences and Moments. Published Experiences project into Journey pages with stable deep links. Published Journey roots derive an authentic story lead before their ordered stops, while incomplete Journeys omit false story invitations. Published bodies render through one shared component on the standalone Journey page and inside a deep-linkable Atlas reader that retains the mounted map, route context, scroll positions, and a mobile map peek. Stop previews derive exact Journey chapter relationships from canonical day-to-Visit references and exact Experience relationships from matching Visit and Place IDs. The focused mobile reader exposes a modal dialog, while map peek and desktop split view expose a named nonmodal region. `/` now renders this Atlas directly without creating another content projection. |
| Media                  | [Media pipeline](architecture/media-pipeline.md)                                                                                                                                                                                                                                                                                                                                                                  | [Journey media implementation](implementation/journey-media-ingestion.md) and [R2 Worker upload](implementation/r2-worker-media-upload.md)                                                                                                                                                                                                                                       | Journey and Place/Visit image optimization plus lossless MP4 pass-through packaging, authenticated manifest-only upload, ingestion, reversible placement culling, Journey media, location media, and existing-Atlas-pin projection exist. Editorial Drive folders may mix JPEG, PNG, and MP4 files, which the publisher partitions internally by delivery policy. Worker deployment remains externally unverified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Gear                   | [Gear system](architecture/gear.md)                                                                                                                                                                                                                                                                                                                                                                               | [Gear authoring workflow](reference/gear-authoring-workflow.md), [Gear Sheet workflow](reference/gear-sheet-workflow.md), [Gear ingestion CLI](reference/gear-ingestion-cli.md), [Gear image preparation](reference/gear-image-preparation.md), [active implementation](implementation/gear-publishing.md), and [readiness audit](audits/gear-affiliate-readiness-2026-11-17.md) | Canonical generated Gear/Usage ingestion, a generated Excel authoring workbook with a reusable Gear Library, explicit Google Sheet preview/apply with verification writeback, public selectors, and the registry-backed Gear page exist. Gear merchant actions reuse canonical Partner IDs, explicit tracking modes and hosts, and the strict shared `partner_click` path. Amazon Associates is registered for complete owner-generated URLs on a bounded host allowlist, with no automatic tag rule. Pull requests 157 and 158 plus Pages run 44407947707 promoted the foundation. Pull requests 164 through 169 and Pages runs 44447213314, 44449597304, and 44452107546 then promoted Journey-independent preparation, receipt-backed immutable WebP upload, and card-approved canonical image revisions. A file-based authoring command now composes record preview, local image review, immutable upload, and canonical publication through two explicit checkpoints. The generated registry remains empty. The first real product still requires reviewed product, usage, image-rights, and merchant inputs, and the external Worker deployment remains unverified.                                                    |
| Analytics and commerce | [Monetization and analytics](architecture/monetization-and-analytics.md)                                                                                                                                                                                                                                                                                                                                          | [Tracking audit](audits/ga4-tracking-audit-2026-11-17.md), [event dictionary](reference/analytics-event-dictionary.md), [lodging operations](reference/lodging-partner-operations.md), [AdSense operations](reference/adsense.md), and [active plan](implementation/monetization-and-analytics.md)                                                                               | A production-host-only GA4 adapter preserves Enhanced Measurement as the safe page-view default. Direct and client-routed private My Atlas activity is excluded, and public Atlas plus canonical Partner events use a strict contract. Six lodging records resolve through canonical Partners and a verified audit command; the same audit flags `La Fortuna Airbnb` for an exact owner URL. The Utah 2025 story has a deployed, visitor-activated Expedia stays and flights block using the owner-supplied campaign reference and unique Pubrefs. Canonical Gear actions reuse the same Partner and `partner_click` contract with optional public `gear_id`; no merchant-specific automatic Gear tracking rule is active. Cross-origin Expedia banner clicks continue to use Pubref reporting. The conservative AdSense implementation remains disabled by default.                                                                                                                                                                                                                                                                                                                                                         |
| Deployment             | [Project README](../README.md#how-production-works)                                                                                                                                                                                                                                                                                                                                                               | [Pages workflow](../.github/workflows/deploy-pages.yml) and [editorial implementation](implementation/editorial-sheet-publishing.md)                                                                                                                                                                                                                                             | GitHub Actions builds and deploys the static Vue site to Pages. Protected `develop` and `main` require pull requests, merge commits, and the strict `validate` check. The explicit Place registration release was promoted through pull requests 42 and 43, then its table-compatible `New Place` correction through pull requests 44 and 45. Develop runs 43866268383 and 43867984954 and Pages runs 43866785598 and 43868555523 succeeded. The live Catalog refresh and actual table metadata readback then verified the new request choice without changing Posts values.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| My Atlas               | [Geographic catalog, local proof, and Worker index](architecture/my-atlas-geography.md), [Auth0 browser authentication](architecture/my-atlas-authentication.md), [API authentication](architecture/my-atlas-api-authentication.md), [registration and operator recovery](architecture/my-atlas-registration.md), and [profile, pin, sharing, and private planning state](architecture/my-atlas-account-state.md) | [Accepted private beta target](proposals/my-atlas-private-beta.md), [trip-planning target](proposals/my-atlas-trip-planning.md), [active planning implementation](implementation/my-atlas-trip-planning.md), [favorite travel image implementation](implementation/my-atlas-favorite-travel-image.md), and [MapTiler SDK migration](implementation/maptiler-sdk-session-migration.md) | Permanent account deletion releases identity and handle assignments while preserving safe exact retries. Planner refresh reads wishlist and plan state through one atomic account snapshot, and an HTTP 412 recovery reads the authoritative profile revision before one write retry. The planner provides direct Add to trip, a private route overlay, read only trip links, optional nearby ideas, and Expedia handoff. Curated Atlas and My Atlas now share the official MapTiler SDK JS runtime with explicit session tracking and no direct MapLibre application dependency. One owner-only favorite travel image has an authenticated Images transform, immutable private R2 replacement, and local Atlas Story export use. Authenticated remote transformation evidence, budget alerts, and real-device acceptance remain external gates. |

## Active work

| Work                                                                                   | Status            | What remains                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Journey media ingestion](implementation/journey-media-ingestion.md)                   | Partial, verified | The Sheet coordinator now reuses preparation, upload, receipts, and ingestion. Verify the production Worker credentials and first real row-backed R2 batch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [R2 Worker media upload](implementation/r2-worker-media-upload.md)                     | Partial, verified | Deploy to the owner's Cloudflare account, install the upload secret, and verify the first real immutable image/video batch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [Gear publishing](implementation/gear-publishing.md)                                   | Partial, verified | The publishing foundation and repository-side image workflow are deployed, and exact live Gear page and bundle markers are verified. Journey-independent preparation, authenticated immutable WebP upload, checksum receipts, an idempotent rollback-safe canonical image transaction, and a two-checkpoint file-based authoring command are implemented. The first product publication still needs reviewed identity and usage inputs, an owner image, merchant data, a verified real upload, and card approval.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| [Monetization and analytics](implementation/monetization-and-analytics.md)             | Partial, verified | The Utah Expedia banners are deployed and production rendering is verified. Confirm final destinations, Pubref attribution, program eligibility, disclosure and privacy acceptance, and responsive accessibility. Verify GA4 `partner_click` separately on direct Partner links because cross-origin Expedia banners are not locally observable. Complete the remaining GA4, direct-route, AdSense account, and consent checks before drawing acquisition or monetization conclusions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [Single-row Sheets and Drive publishing](implementation/editorial-sheet-publishing.md) | Partial, verified | One-command preview/apply, friendly routing, the protected Atlas Reference, Drive snapshots, generated Experience/Moment presentation, and guarded GitHub promotion are implemented. A separate explicit `New Place` choice uses the row's Location to create or reuse a Place, add its Visit and Atlas pin, refresh the Catalog, and bind the requesting row without allowing ordinary publication to infer geography. The live Sheet table and 106 current bindings are verified. The first live Place registration and first row-backed Drive/R2 publication remain owner-controlled and unverified. Missing Journey creation and optional polling remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [My Atlas private beta](implementation/my-atlas-private-beta.md)                       | Partial, verified | The deployed visited-map scope remains as previously verified: secure registration and owner state, canonical and custom visited pins, optional dates and memories, public-safe sharing, timeline playback, statistics, tutorials, Story export, and resilient search. My Atlas uses the existing Poppins family throughout its interface and Story canvas without requesting Russo One. The active staging `geonames-2026-11-18-reviewed-utah-catalog-v3` catalog contains 23 reviewed spots, Torrey and Hanksville, plus bounded 4,096-shard search and exact-resolution indexes. The six owner-reported wishlist IDs now require 212,348 decoded record bytes instead of approximately 3.45 MiB. Staging Worker `5234f470-dfc9-4d4c-af2b-3dbb922f0a9a` explicitly allows 30 seconds of CPU and persists invocation logs. Public health, search, and exact-resolution checks are verified; authenticated private-state acceptance remains owner action. Earlier manifests remain available for reversal. The linked trip-planning implementation owns wishlist, future-plan, retention, and account-deletion work. Reporting, moderation, and server share HTML remain. |
| [My Atlas trip planning](implementation/my-atlas-trip-planning.md)                     | Partial, verified | The signed-in overview opens the route-first planner, and the profile control lives in the upper right. Planner refresh uses one atomic wishlist and plan snapshot. A stale write reads the authoritative profile revision before one retry, while incomplete-success recovery confirms the saved plan through an authoritative read. Desktop uses the owner panel as the single scrolling surface. Owners can copy a private-field-filtered read only route snapshot, request optional nearby ideas in the planning prompt, and open a dated neutral Expedia search for an explicit Fly boundary. Completed account deletion releases its identity and handle assignments while preserving exact retry safety. Authenticated owner interaction and provider behavior remain external acceptance. Stable schema v2 node identity, persisted logistics, stays, and commercial activation remain separate.                                                                                                                                                                                                                                                                  |
| [My Atlas favorite travel image](implementation/my-atlas-favorite-travel-image.md)     | Partial, verified | One private account-level favorite travel image is implemented for owner Atlas Story export. The Worker enforces a 10 MiB input ceiling, 36 megapixel decode ceiling, exact 1200 by 1200 WebP output, 1 MiB stored ceiling, immutable replacement, authenticated delivery, removal, and account-deletion cleanup. The private staging bucket and Worker bindings are deployed and the public boundary checks pass. Measure an authenticated remote sample transformation, confirm budget alerts, and complete authenticated device acceptance. The older per-destination photo scope is superseded. |
| [MapTiler SDK JS session migration](implementation/maptiler-sdk-session-migration.md)  | Partial, verified | Both interactive Atlas maps now use the official SDK with explicit session tracking, persistent MapTiler caching, hybrid style and SDK terrain. The direct MapLibre dependency, imports, worker setup, hand-built terrain URLs, and demo basemap fallback are removed. Browser request inspection and protected production promotion remain. |
| [Atlas integrated story reader](implementation/atlas-integrated-story-reader.md)       | Partial, verified | Phase 0 through Phase 3 and the bounded Phase 4 through Phase 6 local refinements are implemented and verified. Published Journey roots show a canonical story lead before their stops, incomplete Journeys omit false story actions and workflow labels, and the substantive shared Journey body opens inside Atlas without remounting the MapTiler SDK map. The root route now enters Atlas directly. Feature-enabled builds expose My Atlas once in the toolbar and once through a dismissible per-session invitation outside story state. Desktop split-pane, mobile focused sheet and map peek, deep linking, Back and Forward, exact chapter focus, reader and inspector scroll restoration, deferred embedded video, same-stop handoff, reduced motion, image focus return, keyboard containment, conditional dialog and region semantics, simplified mobile detail hierarchy, invalid-link repair, unavailable-story handling, and the standalone Journey regression are checked from 320 through 1,280 pixels plus prior wide-screen checks. Production engagement review, real-device review, and assistive technology acceptance remain.                                   |

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
  live verified. Real Drive-folder access, R2 credentials, the first deployed
  row and Sheet write-back, the first explicit generated Place registration,
  and any optional Utah 2026 Salt Lake City Airport transit Visit remain
  externally unverified.

**Last repository documentation audit:** 2026-11-19.
