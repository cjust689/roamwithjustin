---
id: my-atlas-destination-memory-photo-implementation
title: My Atlas Destination Memory and Single Photo Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-19
updated: 2026-11-19
related:
  - my-atlas-account-state
  - my-atlas-private-beta-implementation
  - my-atlas-destination-memory-photo-phase-0-2026-11-19
  - media-pipeline
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/components/MyAtlasPinEditor.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/api/client.mjs
  - workers/my-atlas/src
  - workers/my-atlas/wrangler.jsonc
  - scripts/test-my-atlas-planning.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run lint
    - npm run docs:audit
---

# My Atlas destination memory and single photo implementation

Phase 0 and Phase 1 are implemented locally. Phase 2 remains gated because the
repository has no isolated traveler media bucket or verified server image
transformation binding.

## Implemented and test verified

- [x] Audit the live pin, memory, revision, export, deletion, sharing, R2, and
      editorial media boundaries.
- [x] Add a direct Add memory or Edit memory action to the selected destination
      card.
- [x] Add a visited destination action named Add memory or Edit memory while
      retaining the separate Visit dates and Remove actions.
- [x] Reuse the existing pin editor and pin patch contract rather than adding a
      second memory field or endpoint.
- [x] In memory mode, preserve the stored visit dates, hide date editing, focus
      the text area, and retain explicit Close and Save memory actions.
- [x] Preserve catalog pins, custom pins, existing public memory projection,
      pin identity, revision conflict retry, idempotency, export, and deletion.

## Phase 2 gate

- [ ] Confirm the Cloudflare Images plan, current transformation pricing, and
      an initial budget alert or stop policy.
- [ ] Provision a dedicated private traveler media R2 bucket for local and
      staging environments. Do not reuse the catalog or editorial media bucket.
- [ ] Add a My Atlas Images binding and private R2 binding, then verify the
      high fidelity transformation path in remote staging.
- [ ] Define the one photo pin metadata contract and immutable object key while
      keeping the raw storage key out of owner and public projections.
- [ ] Implement authenticated add, read, replace, and remove operations under
      the account global revision and idempotency contract.
- [ ] Enforce input bytes, decoded pixel count, output dimensions, actual output
      format, output bytes, animation rejection, and `metadata: "none"` on the
      server.
- [ ] Keep the prior image attached until a replacement object is durable and
      the pin pointer commits. Delete failed or superseded objects reliably.
- [ ] Extend pin deletion, account deletion, export, quotas, rate limits, and
      orphan cleanup with tests.
- [ ] Keep every new photo private. Public image sharing remains a later,
      separately approved phase.
- [ ] Complete authenticated desktop, mobile, keyboard, screen reader, and
      cross device acceptance for the memory flow.

## Verified commands

```text
npm run my-atlas:test
npm run lint
npm run docs:audit
```

