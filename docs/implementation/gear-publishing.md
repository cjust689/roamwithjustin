---
id: gear-publishing-implementation
title: Gear Publishing Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-17
updated: 2026-11-19
related:
  - gear-system
  - gear-ingestion-cli
  - gear-sheet-workflow
  - gear-image-preparation
  - gear-ingestion-affiliate-analytics-ai
  - gear-affiliate-readiness-2026-11-17
  - monetization-analytics
supersedes: []
superseded_by: []
code_paths:
  - scripts/ingest-gear.js
  - scripts/gear-workflow.mjs
  - scripts/test-gear-workflow.mjs
  - scripts/ingest-gear-sheet.mjs
  - scripts/generate-gear-workbook.mjs
  - scripts/prepare-gear-image.mjs
  - scripts/publish-gear-image.mjs
  - scripts/upload-media.js
  - scripts/lib/gear-ingestion.js
  - scripts/lib/gear-image-preparation.mjs
  - scripts/lib/gear-image-publication.mjs
  - scripts/lib/image-normalization.js
  - scripts/test-gear-image-preparation.mjs
  - scripts/test-gear-image-upload.mjs
  - scripts/test-gear-image-publication.mjs
  - workers/media-upload/src/index.mjs
  - src/content/gear/generated/images.json
  - scripts/lib/gear-tracking-sheet.js
  - templates/roam-with-justin-gear-tracker.xlsx
  - src/content/commercial-links.js
  - src/content/gear
  - src/content/partners/index.mjs
  - src/content/selectors/gear.mjs
  - src/content/selectors/media.mjs
  - src/components/GearGrid.vue
  - src/views/roam/RoamTripOverview.vue
  - src/utils/analytics.mjs
  - scripts/test-gear-ingestion.js
  - scripts/test-commercial-content.mjs
  - scripts/test-analytics.mjs
verification:
  state: verified
  evidence:
    - npm run gear:test
    - npm run media:worker:check
    - npm run commerce:test
    - npm run analytics:test
    - npm run content:validate
    - npm run docs:audit
    - npm run lint
    - npm run build
    - pull request 157 and validation run 44406793123
    - develop validation run 44407203277
    - pull request 158 and validation run 44407591044
    - Pages run 44407947707 for production merge 58aa42a280775d6efeb150f9b6eec8339be1dcda
    - pull requests 164 through 169 for the Gear image preparation, upload, and canonical publication slices
    - validation runs 44449049950, 44449342350, 44451625808, and 44451891842
    - Pages runs 44447213314, 44449597304, and 44452107546
    - production image-workflow merges 98211b8fa5223ba2617755ef01ed75ea3fd36e35, 87ce942cf443101c1f7dcfff7fb23ae26c3c14c1, and f84cc34f8ba04ef09dd049385ca8f7eafc8f56a2
    - live https://roamwithjustin.com/gear rendered and bundle markers verified 2026-11-18
    - node scripts/test-gear-workflow.mjs
---

# Gear publishing implementation

The repository has a tested Gear identity and Journey Usage ingestor, public
selectors, a registry-backed Gear page, and Journey Gear projection. This
implementation track owns the remaining work needed to turn one real product
with an original image into a repeatable publishing workflow.

## Completed foundation

- [x] Canonical Gear and contextual Gear Usage registries with stable IDs.
- [x] Deterministic preview and apply ingestion with rollback on failed
  content validation.
- [x] Generated Excel workbook with one sortable Gear authoring table and
  repository-derived Journey, Visit, Partner, and contract catalogs.
- [x] Reusable Gear Library table aligned with the Gear authoring columns and
  prefilled from canonical products when available.
- [x] Google Sheet preview for `Preview` and `Publish` rows using read-only
  Sheets access.
- [x] Explicit Sheet apply for `Publish` rows with validation, rollback, and
  `Published` hash and timestamp writeback.
- [x] Public visibility gates for reviewed product identity, evidence, actual
  use, and Journey scope.
- [x] Registry-backed Gear page and canonical Journey Gear presentation.
- [x] Canonical Partner references for Gear merchant actions.
- [x] Explicit `custom`, `approved-rule`, and `none` tracking modes.
- [x] Exact custom tracked URL preservation and explicit permitted-host
  validation.
- [x] Automatic tracking rules fail closed when no provider adapter exists.
- [x] Shared strict `partner_click` behavior for travel and Gear, with optional
  public `gear_id` and no raw URL or private state.
- [x] Visible affiliate disclosure near Gear actions and sponsored link
  qualification.
- [x] Canonical Amazon Associates Partner identity and bounded host allowlist
  for complete owner-generated URLs. No automatic Amazon tag rule is active.
- [x] One file-based `gear:workflow` command with a no-write preview, local
  prepare checkpoint, and separately approved publish checkpoint.
- [x] Workflow rollback restores the prior canonical Gear file when record,
  preparation, upload, or image publication fails. Immutable uploaded objects
  remain available for a safe rerun.

## Production release, 2026-11-18

- [x] Pull request 157 promoted commit
  `85e4d667732036458bd72cbbe6de18eafe86bf03` to `develop` after validation
  run 44406793123 succeeded.
- [x] The resulting `develop` merge
  `70e795c3a9727d2b7594b99eaf4e8964e40b3e68` passed validation run
  44407203277.
- [x] Pull request 158 promoted that protected `develop` state to `main`
  after validation run 44407591044 succeeded.
- [x] Pages run 44407947707 built and deployed production merge
  `58aa42a280775d6efeb150f9b6eec8339be1dcda`.
- [x] Exact live verification rendered `https://roamwithjustin.com/gear`, found
  `Gear I use`, `No gear notes yet`, and the visitor-facing empty-state copy,
  and confirmed the obsolete workflow phrase was absent.
- [x] Exact deployed bundle verification found the Amazon Associates disclosure,
  `partner_click`, and `gear_catalog` markers. This establishes deployed code,
  not an observed GA4 event or Amazon conversion.

## Gear image workflow releases, 2026-11-18

- [x] Pull requests 164 and 165 promoted Journey-independent image
  preparation to production merge
  `98211b8fa5223ba2617755ef01ed75ea3fd36e35`. Pages run 44447213314
  succeeded.
- [x] Pull request 166 passed validation run 44449049950 and merged to
  `develop` as `6d24865f7dafc46e6b711ce0b4931de0477607c2`. Pull request 167 passed
  validation run 44449342350 and promoted receipt-backed upload to production
  merge `87ce942cf443101c1f7dcfff7fb23ae26c3c14c1`. Pages run 44449597304
  succeeded.
- [x] Pull request 168 passed validation run 44451625808 and merged to
  `develop` as `4d315bf4301c4d9a24d39156ec69f6ca3c89c8c1`. Pull request 169 passed
  validation run 44451891842 and promoted canonical image publication to
  production merge `f84cc34f8ba04ef09dd049385ca8f7eafc8f56a2`. Pages run 44452107546
  succeeded.
- [x] Post-deployment verification received HTTP 200 from
  `https://roamwithjustin.com/gear`, rendered the expected empty state, omitted
  the retired workflow phrase, and found the Amazon Associates disclosure,
  `partner_click`, and `gear_catalog` markers in deployed bundles.
- [ ] The external Cloudflare upload Worker deployment and first real Gear
  object upload remain owner-controlled and unverified. Pages deployment does
  not deploy the Worker.

## First real product gate

- [ ] Owner supplies the exact product and variant.
- [ ] Owner confirms its Journey usage and provides firsthand notes.
- [ ] Owner supplies one creator-owned product photograph or approves an
  existing canonical image with suitable rights.
- [ ] Owner supplies an official product URL.
- [ ] Owner supplies the exact approved affiliate URL and program identity,
  or explicitly selects an ordinary noncommissionable link.
- [ ] Add the canonical Partner only after relationship and destination hosts
  are established. Repository presence is not proof of external approval.
- [ ] Preview and review the resulting card before publication.

## Authoring orchestration, 2026-11-19

- [x] Accept one versioned JSON workflow that binds one exact Gear ID,
  canonical Journey, existing record source, and reviewed local image input.
- [x] Resolve workflow paths relative to the workflow file so the command is
  replayable from any working directory.
- [x] Repeat record and image preview before either apply checkpoint.
- [x] Refuse publish unless the deterministic package already exists from an
  earlier prepare checkpoint and `--approve-card` is present.
- [x] Reuse the existing Gear ingestor, image preparation, upload receipt, and
  canonical publication implementations instead of copying their contracts.
- [x] Keep credentials in private environment variables and keep Git, branch
  promotion, deployment, remote image intake, and AI outside the command.

## Journey-independent image phase

- [x] Add `gear:prepare --dry-run` for a local JPEG or PNG with explicit
  creator-owned rights.
- [x] Reuse the current Sharp normalization and metadata-stripping primitives.
- [x] Produce deterministic product derivatives and a scoped manifest without
  a fake Journey, Visit, Place, or media placement.
- [x] Write packages atomically and treat an exact repeat as unchanged while
  rejecting a conflicting package instead of overwriting it.
- [x] Reuse authenticated immutable upload and checksum receipt semantics with
  a Gear-specific manifest validator.
- [x] Accept prepared WebP through the existing Worker key, checksum, size,
  authentication, and create-only controls.
- [x] Keep upload idempotent by verifying matching remote objects and refusing
  to overwrite a different local receipt.
- [x] Publish only after receipt verification and explicit card approval.
- [x] Make receipt-backed canonical publication idempotent and preserve the
  prior record if validation or build fails.

Remote image download, automatic Amazon tagging, additional merchant adapters,
product detail routes, and AI research remain outside the next slice. Local
image preparation does not make a product public. The generated Gear registry
remains empty until real owner input satisfies the gate above and the
first reviewed product is deliberately published. Worker source accepts the
Gear WebP contract, but its external Cloudflare deployment and the first real
Gear upload remain unverified.
