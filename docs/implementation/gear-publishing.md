---
id: gear-publishing-implementation
title: Gear Publishing Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-17
updated: 2026-11-17
related:
  - gear-system
  - gear-ingestion-cli
  - gear-sheet-workflow
  - gear-ingestion-affiliate-analytics-ai
  - gear-affiliate-readiness-2026-11-17
  - monetization-analytics
supersedes: []
superseded_by: []
code_paths:
  - scripts/ingest-gear.js
  - scripts/ingest-gear-sheet.mjs
  - scripts/generate-gear-workbook.mjs
  - scripts/lib/gear-ingestion.js
  - scripts/lib/gear-tracking-sheet.js
  - templates/roam-with-justin-gear-tracker.xlsx
  - src/content/commercial-links.js
  - src/content/gear
  - src/content/partners/index.mjs
  - src/content/selectors/gear.mjs
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
    - npm run commerce:test
    - npm run analytics:test
    - npm run content:validate
    - npm run docs:audit
    - npm run lint
    - npm run build
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

## Journey-independent image phase

- [ ] Add `gear:prepare --dry-run` for a local JPEG or PNG with explicit
  creator-owned rights.
- [ ] Reuse the current Sharp normalization and metadata-stripping primitives.
- [ ] Produce deterministic product derivatives and a scoped manifest without
  a fake Journey, Visit, Place, or media placement.
- [ ] Reuse authenticated immutable upload and checksum receipt semantics with
  a Gear-specific manifest validator.
- [ ] Publish only after receipt verification and card approval.
- [ ] Make repeat publication idempotent and preserve the prior record if
  validation or build fails.

Remote image download, automatic Amazon tagging, additional merchant adapters,
product detail routes, and AI research remain outside the next slice. The
generated Gear registry remains empty until real owner input satisfies the
gate above.
