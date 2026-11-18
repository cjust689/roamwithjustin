---
id: gear-affiliate-readiness-2026-11-17
title: Gear and Affiliate Readiness Audit 2026-11-17
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-17
updated: 2026-11-17
related:
  - gear-system
  - gear-ingestion-cli
  - gear-ingestion-affiliate-analytics-ai
  - monetization-analytics
  - affiliate-activation-public-editorial-first-slice
supersedes: []
superseded_by: []
code_paths:
  - scripts/ingest-gear.js
  - scripts/lib/gear-ingestion.js
  - scripts/lib/media-ingestion.js
  - scripts/upload-media.js
  - workers/media-upload/src/index.mjs
  - src/content/commercial-links.js
  - src/content/gear
  - src/content/partners/index.mjs
  - src/content/selectors/gear.mjs
  - src/components/GearGrid.vue
  - src/utils/analytics.mjs
verification:
  state: verified
  evidence:
    - npm run gear:test
    - npm run commerce:test
    - npm run analytics:test
    - npm run content:validate
    - npm run docs:audit
---

# Gear and affiliate readiness audit, 2026-11-17

This audit reconciles the Gear ingestion, affiliate activation, and optional AI
proposals against current source. It records repository behavior only. It does
not establish approval in any affiliate program, ownership of a product,
rights to a product image, received GA4 events, or a production deployment.

## Repository decisions

| Question | Verified finding | Decision |
| --- | --- | --- |
| Can the media pipeline ingest product images without a Journey? | No. The current preparation and ingestion manifest requires a canonical Journey and publishes Journey media placements. The upload Worker can accept permitted immutable object keys, but the supported upload command validates the Journey manifest first. | A future product-image slice must use a Gear-specific prepare and receipt adapter that reuses the optimizer and upload primitives. It must not create a fake Journey. |
| How should Gear integrate with existing components and registries? | Canonical generated Gear and Gear Usage registries, selectors, Journey projection, and a registry-backed Gear page already exist. The generated registry is empty. | Extend those records in place. Gear merchant links now reference the canonical Partner identity and the shared commercial click helper. No second merchant registry or Gear-specific analytics event is allowed. |
| Which affiliate programs and tracking rules are approved? | The repository contains owner-supplied Expedia banner configuration and the owner reports using complete Amazon Associates URLs for Gear. It contains no evidence of approved SmallRig, PGYTECH, Tilta, Marriott, or Booking.com Gear tracking rules or credentials. | Complete Amazon URLs may be stored unchanged against the canonical `amazon-associates` Partner and its bounded host allowlist. Automatic rules fail closed unless a provider-specific adapter is configured and tested. No default Gear rule is enabled. |
| Should AI product research be part of the first slice? | No product record or source packet currently requires enrichment. The existing OpenAI use is editorial and does not establish a Gear research workflow. | Keep Gear AI off. A later local, manually triggered tool may create source-linked drafts with a fixed budget and human approval, but it is not required to publish the first product. |
| What is the image publishing workflow? | There is no Gear image prepare, preview, approval, upload, receipt, or publish command. `imageAssetId` can reference an existing canonical image, but creating a product image independently is unsupported. | The next image phase needs dry-run preparation, explicit rights review, deterministic derivatives, immutable upload, checksum receipt verification, and an atomic Gear record update. It remains unimplemented until a creator-owned product image is supplied. |

## Implemented in this reconciliation

- Added one shared commercial-link contract for Partner IDs, link types,
  tracking modes, permitted Gear surfaces, and privacy-safe
  `partner_click` parameters.
- Extended Gear link ingestion with `partnerId`, `linkType`, `trackingMode`,
  `allowedSurfaces`, and the creator-facing `isCustomTracked` compatibility
  input. Canonical output keeps only `trackingMode`.
- Preserved complete custom tracked URLs byte for byte after HTTPS, canonical
  Partner, affiliate relationship, and destination-host validation.
- Made automatic affiliate rules fail when no provider-specific rule has been
  configured. The pipeline never appends a universal tag.
- Added near-link Partner disclosure resolution and one reusable
  `partner_click` path for the Gear catalog and canonical Journey Gear links.
  Native anchors continue to work when analytics is unavailable.
- Added `gear_id` as an optional public identifier in the existing strict
  event contract. No URL, query string, user identifier, or private My Atlas
  state enters the event.
- Registered Amazon Associates as an owner-supplied affiliate Partner with
  `amazon.com`, `amzn.to`, and `a.co` as permitted hosts. The exact supplied URL
  remains unchanged and no automatic tag resolver is active.

## Remaining gates for the first real product

1. Exact product identity and confirmed Journey usage.
2. One creator-owned product photograph or an existing suitable canonical
   image with reviewed rights.
3. One official product URL.
4. The exact approved affiliate URL and canonical Partner metadata, or an
   explicitly noncommissionable ordinary link.
5. Firsthand notes written from actual use.
6. The Gear-specific image prepare, upload receipt, and publish adapter.

Optional AI research, automatic Amazon tagging, remote image download, Gear
detail routes, and additional merchant programs remain later phases. They are
not prerequisites for using the existing record ingestor with a previously
published canonical image.
