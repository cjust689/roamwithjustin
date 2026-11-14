---
id: gear-ingestion-cli
title: Gear Ingestion CLI
kind: reference
status: implemented
implementation_state: complete
updated: 2026-11-14
related:
  - gear-system
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

It does not upload files, scrape retailers, invent product identities, edit
Journey narratives, or publish example gear. The generated registry starts
empty because no gear item in the architecture brief was confirmed as real
input for this pipeline.

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
      "links": []
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
| `websiteVerified`                               | Must be explicitly `true` before the website link can appear publicly.                                          |
| `affiliateUrl`                                  | Optional creator-supplied affiliate URL. Never generated or scraped.                                            |
| `affiliateVerified`                             | Must be explicitly `true`; public links receive `rel="sponsored"`.                                              |
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

The public Journey selector merges canonical entries into the existing
`gearHighlights` presentation. The older free-text Journey arrays and the
hardcoded `/gear` page are compatibility data only; add all new trip-specific
gear through this ingestor. Migrate legacy products only after their exact
identity, usage, image rights, and outbound links have been reviewed.

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

- The repository does not yet have a canonical Experience registry, so a
  non-null `experienceId` is rejected rather than accepted without validation.
- Removal is intentionally not implemented. Unlinking must become an explicit,
  previewable operation that never deletes shared Gear.
- The CLI does not upload product images or other files to Cloudflare R2.
- Uploading an image to R2 does not register Gear or Media by itself.
- The CLI does not commit, push, or deploy. `--build` only validates the local
  production build.
- Retailer data, Amazon images, prices, ratings, affiliate tags, and product
  descriptions are never scraped or invented.
