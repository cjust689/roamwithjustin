---
id: gear-ingestion-cli
title: Gear Ingestion CLI
kind: reference
status: implemented
implementation_state: complete
updated: 2026-11-14
related:
  - gear-system
  - gear-sheet-workflow
  - gear-affiliate-readiness-2026-11-17
supersedes:
  - gear-ingestion-architecture-brief
superseded_by: []
code_paths:
  - scripts/ingest-gear.js
  - scripts/lib/gear-ingestion.js
  - scripts/test-gear-ingestion.js
  - src/content/gear/generated/records.json
verification:
  state: verified
  evidence:
    - npm run gear:test
    - npm run content:validate
---

# Gear ingestion and journey linking

The Gear ingestor records a product once, links it to a canonical Journey or
visit, and lets selectors expose it to the existing trip view. It accepts a
small constrained Markdown document or strict JSON and performs deterministic,
idempotent upserts.

For spreadsheet authoring, use the generated workbook and Google Sheet path in
[Gear Sheet workflow](gear-sheet-workflow.md). Both entry points use the same
canonical validator and generated registry.

It does not upload files, scrape retailers, invent product identities, edit
Journey narratives, or publish example gear. The generated registry starts
empty because no gear item in the architecture brief was confirmed as real
input for this pipeline.

Merchant identity and analytics reuse the canonical Partner system. The
ingestor never generates a universal affiliate suffix. A complete custom
tracked URL is retained unchanged only after its Partner relationship and
destination host pass validation. Automatic rules fail closed unless a
provider-specific rule has been configured and tested.

## Quick start

Show the canonical Journey IDs accepted by `--journey`:

```bash
npm run gear:journeys
```

Inspect existing canonical Gear IDs before creating another product:

```bash
npm run gear:list
npm run gear:list -- --query cressi
```

Preview an input file without writing:

```bash
npm run gear:ingest -- --journey usvi-st-john-2025 --source ./gear-inbox/usvi.md --dry-run
```

Review the plan and warnings, then apply it:

```bash
npm run gear:ingest -- --journey usvi-st-john-2025 --source ./gear-inbox/usvi.md
```

Add `--build` when the command should also run the production build after the
upsert and canonical content validation:

```bash
npm run gear:ingest -- --journey usvi-st-john-2025 --source ./gear-inbox/usvi.md --build
```

Run validation or the ingestion tests independently:

```bash
npm run gear:validate
npm run gear:test
```

The full command reference is available from the script:

```bash
node scripts/ingest-gear.js --help
node scripts/ingest-gear.js --h
node scripts/ingest-gear.js -h
```

## Markdown input

Markdown uses a deliberately constrained format: YAML-like scalar frontmatter,
one `##` heading per product, and `- field: value` lines. This keeps creator
input friendly without loosely interpreting arbitrary prose as production
data.

The following is a template, not verified inventory. Replace every example
identity and statement with creator-confirmed information before applying it.

```md
---
schemaVersion: 1
journeyId: usvi-st-john-2025
mode: upsert
---

# Gear used on St. John

## Replace with the confirmed product name

- gearId: replace-with-stable-product-id
- category: bag
- brand: unknown
- model: unknown
- description: unknown
- usage: used
- evidence: needs-review
- verificationStatus: needs-review
- visibility: draft
- visitId: unknown
- mediaAssetIds: []
- website: unknown
- websiteVerified: false
- affiliateUrl: unknown
- affiliateVerified: false
- notes: Replace with a firsthand usage note.
```

`unknown`, `null`, `none`, `n/a`, `tbd`, `to confirm`, and blank values become
`null`. Unknown values are never rendered as public product copy.

## JSON input

JSON uses the same normalized fields:

```json
{
  "schemaVersion": 1,
  "journeyId": "usvi-st-john-2025",
  "mode": "upsert",
  "items": [
    {
      "gearId": "replace-with-stable-product-id",
      "name": "Replace with the confirmed product name",
      "category": "bag",
      "brand": null,
      "model": null,
      "usageType": "used",
      "evidence": "needs-review",
      "verificationStatus": "needs-review",
      "visibility": "draft",
      "visitId": null,
      "mediaAssetIds": [],
      "links": [
        {
          "kind": "manufacturer",
          "label": "Manufacturer website",
          "url": "https://example.com/product",
          "affiliate": false,
          "verified": true,
          "partnerId": null,
          "linkType": "website",
          "trackingMode": "none",
          "allowedSurfaces": ["public-gear", "public-journey"]
        }
      ]
    }
  ]
}
```

## Important fields

| Field                                           | Meaning                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `gearId`                                        | Required stable lowercase kebab-case product identity. Updates should reuse it.                                 |
| `category`                                      | Product category. Required for a new Gear item.                                                                 |
| `verificationStatus`                            | `verified` only after brand/model identity is confirmed; otherwise `needs-review`.                              |
| `usage` / `usageType`                           | `used`, `packed`, `borrowed`, `rented`, `considered`, or `recommended`. These meanings are not interchangeable. |
| `evidence`                                      | `creator-confirmed`, `metadata-confirmed`, `media-confirmed`, or `needs-review`.                                |
| `visibility`                                    | `draft` or `published`. Published usage requires verified Gear and reviewed evidence.                           |
| `visitId`                                       | Optional canonical visit ID belonging to the guarded Journey.                                                   |
| `mediaAssetIds`                                 | Optional canonical Media IDs that visibly depict the item. This is not camera/lens EXIF attribution.            |
| `imageAssetId`                                  | Optional creator-owned image from the canonical Media registry used as the product visual.                      |
| `website`                                       | Optional manufacturer URL. It must use HTTPS.                                                                   |
| `websitePartnerId`                              | Optional canonical Partner ID when the ordinary website action should use shared Partner analytics.            |
| `websiteVerified`                               | Must be explicitly `true` before the website link can appear publicly.                                          |
| `affiliateUrl`                                  | Optional creator-supplied affiliate URL. Never generated or scraped.                                            |
| `affiliatePartnerId`                            | Required canonical Partner ID for the convenience affiliate fields.                                             |
| `affiliateTrackingMode`                         | `custom` for an issued complete URL, or `approved-rule` only when a provider adapter exists.                     |
| `affiliateVerified`                             | Must be explicitly `true`; public links receive `rel="sponsored"`.                                              |
| `links[].partnerId`                             | Canonical Partner identity. Required for affiliate links and optional for ordinary commercial links.             |
| `links[].linkType`                              | Existing analytics vocabulary such as `website`, `booking`, or `affiliate`.                                     |
| `links[].trackingMode`                          | Canonical `custom`, `approved-rule`, or `none` state.                                                            |
| `links[].isCustomTracked`                       | Input-only compatibility flag. `true` maps to `custom`; `false` maps to `approved-rule`.                         |
| `links[].allowedSurfaces`                       | One or both of `public-gear` and `public-journey`.                                                               |
| `notes`                                         | Journey-specific firsthand context, not universal product copy.                                                 |
| `whyItWorked`, `limitations`, `wouldBringAgain` | Optional contextual editorial fields.                                                                           |

Supported categories are printed in validation errors and currently include
camera, lens, drone, action camera, bag, tripod, filter, audio, lighting,
power, storage, snorkeling, footwear, outerwear, apparel, luggage, travel
accessory, and other.

## Publication rules

A Gear item appears in a public Journey projection only when all of these are
true:

- the item has `verificationStatus: verified`;
- its usage has `visibility: published`;
- evidence is reviewed rather than `needs-review`; and
- the usage type represents actual use (`used`, `borrowed`, or `rented`).

Draft and review records remain available to selectors with
`{ includeDrafts: true }`, but they are not rendered on the trip page.
`packed`, `considered`, and `recommended` are stored distinctly and are not
silently presented as gear actually used.

The public Gear page and Journey selector both read canonical entries. Older
free-text Journey `gearHighlights` remain a compatibility fallback only; add
all new trip-specific gear through this ingestor. Migrate legacy product names
only after their exact identity, usage, image rights, Partner relationship,
and outbound links have been reviewed.

## Commercial link rules

- An affiliate link requires a canonical Partner whose relationship is
  `affiliate-program` and whose explicit `commercialHosts` allow the URL host.
- `trackingMode: custom` preserves the supplied URL, including its query
  string. The ingestor does not append, remove, or reorder tracking values.
- `trackingMode: approved-rule` is rejected until that Partner has an explicit
  tested resolver. There are currently no approved Gear resolvers.
- Nonaffiliate links must use `trackingMode: none`. They may remain ordinary
  official links and do not imply a commission.
- Public Gear and Journey clicks with a Partner ID reuse the existing strict
  `partner_click` event. The native link does not depend on analytics.

## Idempotence and generated output

The CLI is an upsert operation:

- an existing `gearId` updates the same product;
- a deterministic usage ID links that product to one Journey/visit scope;
- repeating identical input produces no generated diff;
- changing a note or verified link updates the existing record;
- the same Gear item can have distinct usage records on multiple Journeys;
- omitting a prior item never removes it.

The only writable canonical output is:

```text
src/content/gear/generated/records.json
```

Do not hand-edit this file. The CLI writes it atomically, runs canonical content
validation, and restores the previous version if validation or an optional
build fails.

## Selectors

Application code can use:

```js
getGearItemView(gearId)
getGearCatalog()
getJourneyGear(journeyId)
getVisitGear(visitId)
getExperienceGear(experienceId)
getMediaGear(assetId) // { captureGear, visibleGear }
```

`getMediaGear()` keeps two meanings separate:

- `captureGear`: verified camera/lens IDs stored in Media capture metadata;
- `visibleGear`: manually approved `mediaAssetIds` on Gear usage records.

Seeing a bag in a photograph does not prove journey-wide use. Conversely, EXIF
showing a camera does not mean that camera is visible in the photograph.

## Current boundaries

- The Gear ingestor does not yet integrate the canonical Experience registry,
  so a non-null `experienceId` is rejected rather than accepted without
  validation.
- Removal is intentionally not implemented. Unlinking must become an explicit,
  previewable operation that never deletes shared Gear.
- The CLI does not upload product images or other files to Cloudflare R2.
- `gear:prepare` can create a separate reviewed local Gear image package, but
  the ingestor does not consume that package until a receipt-backed publication
  adapter is implemented.
- Uploading an image to R2 does not register Gear or Media by itself.
- The CLI does not commit, push, or deploy. `--build` only validates the local
  production build.
- Retailer data, Amazon images, prices, ratings, affiliate tags, and product
  descriptions are never scraped or invented.
