---
id: my-atlas-destination-memory-photo-phase-0-2026-11-19
title: My Atlas Destination Memory and Photo Phase 0 Audit 2026-11-19
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-19
updated: 2026-11-19
related:
  - my-atlas-account-state
  - my-atlas-private-beta-implementation
  - my-atlas-destination-memory-photo-implementation
  - media-pipeline
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/components/MyAtlasPinEditor.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/api/client.mjs
  - workers/my-atlas/src/account/contracts.mjs
  - workers/my-atlas/src/account/service.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/src/public/service.mjs
  - workers/my-atlas/wrangler.jsonc
  - workers/media-upload/src/index.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run lint
    - npm run docs:audit
---

# My Atlas destination memory and photo Phase 0 audit, 2026-11-19

This audit records the current repository boundary before private traveler
photo storage is introduced. It does not claim that a user photo can be
uploaded, transformed, stored, viewed, exported, or purged today.

## Existing memory behavior

- One optional `memory` string belongs directly to each owner qualified visited
  pin. It is not a separate record.
- The existing pin patch preserves the pin ID and destination while changing
  visit dates or memory under the account global revision, strong `If-Match`,
  and UUID idempotency contract.
- The browser already retries one explicit revision conflict after loading the
  authoritative owner state. The intended memory text remains in the action
  closure for that retry.
- Catalog and custom visited pins use the same memory editor and mutation.
- Pin deletion removes the pin record. Account deletion erases all pin records.
  JSON and CSV export include memory text.
- A nonempty memory enters the existing public Atlas projection only while the
  owner has explicitly made the Atlas public. It is rendered as text.

Before this slice, memory editing was hidden behind the Visited list's generic
`Edit` action, which opened the Add destination panel. A selected map card had
no edit action. The Phase 1 change therefore needs no Worker or schema change.

## Media infrastructure finding

The current My Atlas Worker has one staging R2 binding,
`MY_ATLAS_CATALOG_R2`. It points to the private catalog bucket and is used for
catalog reads. It is not user media storage.

The separate editorial media Worker is an operator authenticated,
upload only boundary for immutable public Journey and Gear assets. It has no
My Atlas owner authorization, private download route, pin association,
replacement transaction, account deletion integration, or user quota. Reusing
that route would cross the editorial and traveler privacy boundaries.

Sharp exists only in the local Node preparation workflow. It is not a verified
Cloudflare Worker image processor. The current My Atlas Worker has no Images
binding and no server side image decode, dimension inspection, metadata
stripping, resize, or re-encode path.

## Phase 2 architecture gate

The smallest compatible server path is a dedicated private traveler media R2
bucket bound to the My Atlas Worker, plus a Cloudflare Images binding. Current
Cloudflare documentation confirms that an Images binding accepts raw request
or R2 bytes, exposes image information, resizes and re-encodes output, and can
set `metadata: "none"`. The binding accepts up to 20 MB, while this product can
retain the stricter proposed 12 MiB input ceiling. R2 Worker bindings support
owner controlled `put`, `get`, and `delete` operations. These are platform
capabilities, not deployed project state.

- [Cloudflare Images Worker binding](https://developers.cloudflare.com/images/optimization/binding/)
- [Cloudflare image metadata controls](https://developers.cloudflare.com/images/optimization/features/#metadata)
- [Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/)
- [Cloudflare R2 Worker binding](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)

Before Phase 2 implementation, the owner must confirm Images plan and budget
acceptance, create or approve the isolated private bucket, and approve staging
bindings. The implementation must then prove actual output bytes, dimensions,
WebP encoding, `metadata: "none"`, private serving, replacement rollback,
orphan cleanup, pin and account deletion, export semantics, rate limits, and
quotas. No browser only compression result may be treated as trusted storage.

## Boundaries retained

- Exactly zero or one active photo is proposed per visited pin.
- Wishlist records and plan snapshots do not receive photos.
- A future photo defaults private and must not enter the current public Atlas
  projection.
- The pin ID is the only valid association key.
- The current editorial media bucket, public media domain, and upload Worker
  remain separate.

