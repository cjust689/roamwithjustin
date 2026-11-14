---
id: journey-media-ingestion-architecture-brief
title: Historical Journey Media Ingestion Architecture Brief
kind: historical
status: archived
implementation_state: partial
updated: 2026-11-14
related:
  - lightroom-publishing
supersedes: []
superseded_by:
  - media-pipeline
  - journey-media-ingestion
code_paths: []
verification:
  state: unverified
  evidence: []
---

> **Archived:** See [Media Pipeline](../architecture/media-pipeline.md) for
> verified behavior and [Journey Media Ingestion](../implementation/journey-media-ingestion.md)
> for the current workflow and remaining gaps.

# Roam With Justin — Journey-First Media Optimization, Ingestion & Progressive Publishing

**Status:** Proposed implementation brief for a coding agent. **Do not assume the examples are existing commands, files, or schemas.**  
**Goal:** Extend the *existing* image optimizer (which already takes a tag, matches a journey, and increments a numeric filename suffix) so its output can be uploaded to Cloudflare R2 and **automatically integrated into the matching journey's media collection**. Preserve the ability to enrich that same asset later with Lightroom identity, EXIF, gear, place, experience, and editorial choices.

## 1. Non-negotiable product outcome

The creator's initial workflow should be as close as possible to:

```text
Choose edited images → run existing optimizer with journey tag
→ optimizer writes images to a journey-slug folder + machine-readable manifest
→ upload that folder to the intended R2 image prefix
→ ingest manifest (eventually automatic)
→ images appear in the correct journey's All Photography section
```

**Minimum successful publication:** An image is visible and usable in its matched Journey **without** first assigning a Place, Visit, Experience, caption, hero, gear, or custom gallery position. A later editorial pass can add any of those relationships. Do not make the creator maintain image lists in `.mjs` or Vue components.

The tag is a *lookup key*; the resolved **canonical `journeyId`** is the authoritative relationship. A filename or an R2 directory is **not** sufficient evidence to register or publish an asset.

## 2. Existing-state audit — do this before code changes

Inspect the actual repository; do not recreate working infrastructure. Locate and report:

- The current optimizer's filename, runtime, CLI arguments, tag extraction/resolution, image processing settings, naming counter, and overwrite behavior.
- How tags map to canonical journeys and whether short aliases (`usvi`) already exist.
- Current canonical Media/Places/Journeys `.mjs` registries, validators, URL resolver, media usages, and Atlas/Trip selectors. The architecture README states the old duplicated `trips.js` and `atlasData.js` authorities were removed; **verify in this checkout**.
- Existing R2 bucket, media hostname, image-key convention, upload scripts/credentials (never print secrets), and GitHub deployment mechanism.
- Any publication-manifest ingestor, Lightroom publisher, EXIF/gear extractor, or existing journey photo gallery. Extend these rather than building competing models.

**First deliverable from the coding agent:** concise audit and minimal-change plan, naming exact repo files. If something is absent, identify it as new work.

## 3. Responsibility boundaries

| Component | Owns | Does not own |
|---|---|---|
| Existing optimizer | Read input, resolve tag, compress/transcode, produce organized output and **provisional manifest** | Canonical asset registration, deciding where a photo is displayed beyond its journey, editing narrative |
| Upload step | Copy verified renditions to R2 at the agreed keys | Guessing associations from paths |
| Publication ingestor | Validate uploaded objects; create/upsert stable asset identity, revisions and Journey placement; generate registries | Change a manually curated hero, invent Places or gear |
| Canonical Media registry | Unique asset IDs, rendition keys, intrinsic metadata, rights, provenance, current revision | Trip chronology or contextual presentation |
| Canonical Journey registry | Journey identity and chronology | Repeated physical-file definitions |
| Placement/association records | `assetId` → `journeyId` and optional `visitId`/`placeId`/`experienceId` | Duplicate physical assets |
| Atlas selectors | Merge registered assets + associations into journey/gallery views | Runtime EXIF processing, scanning R2 folders |
| Future Lightroom Publish Service | Durable photo-origin identity; edit/republish workflow | A second media catalog |

**Reconcile this brief with existing source models rather than replacing them.** The Media/Places/Journeys architecture remains authoritative for data ownership; the Lightroom-to-Atlas document remains authoritative for long-term publishing/provenance behavior.

## 4. Expected optimizer behavior

Keep all existing compression options and outputs working. Add only the minimum necessary configuration to create **journey-scoped, directly uploadable output**.

Conceptual command (adapt to actual CLI; don't break its current flags):

```bash
npm run media:optimize -- --tag usvi --source ./exports --out ./optimized
```

Example output if the uploader is configured to upload `./optimized/usvi/` contents under the R2 prefix `images/usvi/`:

```text
optimized/
  usvi/
    usvi-001.webp
    usvi-002.webp
    usvi-003.webp
    publication-manifest.json
```

- Resolve `usvi` to the **actual canonical journey ID** from the live registry (shown below as `usvi-st-john-2025` only for illustration). The short folder name is an upload slug; do not derive `journeyId` from it during ingest.
- Create missing output directories. Keep existing compression quality, dimensions, orientation, and format unless explicitly changing them.
- Make the R2 upload **prefix contract** explicit. If uploading the whole `usvi` folder under `images/`, its children must resolve to `images/usvi/<filename>`. Avoid accidentally producing `images/usvi/usvi/...` or putting a local manifest into the public bucket if not required.
- Support batch runs. Do not mix different journeys into one manifest unless the manifest schema deliberately supports per-asset journey IDs.
- Reject ambiguous/unknown journey tags with actionable errors, rather than guessing.
- Do not silently overwrite an already published rendition or reset a filename counter. Identify collisions before writing.
- Preserve mapping between the source input, chosen display filename, stable asset identity and future revisions.

### Filename numbering is a presentation detail, not identity

Existing numeric suffixes (`usvi-001.webp`, `usvi-002.webp`) may stay for compatibility, but they are not reliable identifiers: an edited export can change bytes and a rerun can produce `usvi-021.webp`. Introduce a durable private mapping when possible:

```text
(source identity or established publish mapping)
    ↕ stable assetId
    ↕ current revision and R2 rendition key
```

Prefer an existing Lightroom-origin ID / recorded source association if available. **A file hash alone cannot distinguish a revised export from a different photograph** and must not be the sole republish identity mechanism. If an input's identity is not provable, do not silently replace a prior asset; treat it as new or request reconciliation.

Long-term preferred keys are revision-safe, such as `assets/<assetId>/r0002/gallery.webp`. If the initial MVP uses `images/usvi/usvi-001.webp` for straightforward folder uploads, document that as a compatibility/storage choice and retain a clear migration strategy. Existing public R2 URLs must not be broken during migration.

## 5. Optimizer → ingestor contract: publication manifest

The optimizer emits structured metadata **in addition to files**. It does not directly mutate canonical `.mjs` content. An example *provisional* manifest:

```json
{
  "schemaVersion": 1,
  "batchId": "batch_example_001",
  "uploadSlug": "usvi",
  "journeyId": "usvi-st-john-2025",
  "r2Prefix": "images/usvi/",
  "assets": [
    {
      "provisionalId": "local_item_001",
      "assetId": null,
      "source": {
        "name": "A670001.jpg",
        "sourceRef": null
      },
      "output": {
        "relativePath": "usvi-001.webp",
        "r2ObjectKey": "images/usvi/usvi-001.webp",
        "mimeType": "image/webp",
        "width": null,
        "height": null,
        "byteSize": null,
        "sha256": null
      },
      "capture": {
        "capturedAt": null,
        "cameraModelRaw": null,
        "lensModelRaw": null
      },
      "associations": {
        "journeyId": "usvi-st-john-2025",
        "placeId": null,
        "visitId": null,
        "experienceId": null
      },
      "rights": {
        "owner": "roam-with-justin",
        "status": "owned"
      }
    }
  ]
}
```

**Example values are placeholders, not real data.** The implementation must populate actual dimensions/bytes/checksums by inspecting the final outputs. `assetId` is populated by identity reconciliation, either at optimization time if already known or by the ingestor. `sourceRef` is private provenance, not a public file path. Only claim owned rights if the publishing system has an appropriate explicit default/confirmation; otherwise require confirmation rather than assume all inputs are owned.

### Manifest rules

- Validate schema version, required fields, canonical journey, relative paths, allowed MIME types, checksums, and unique object keys.
- Ensure paths cannot escape the staging folder; never accept untrusted paths with `../`.
- Separate **provisional optimization output** from a **committed publication event**. No public content update until R2 object presence and uploaded content integrity have been verified.
- Preserve the source-to-asset mapping and a durable ingestion log/outbox, privately; don't publish raw local paths, private EXIF, GPS precision, serial numbers, or credentials.
- Manifest format should be compatible with—or intentionally adapted by a thin adapter to—the existing Lightroom-to-Atlas publication-event contract. **Do not design two independent ingestors.**
- The `publication-manifest.json` is for ingestion, not a substitute for a static website content record or a guarantee that R2 uploading registered the asset.

## 6. Upload & registration flows

### MVP: folder upload, one ingest command

```text
Optimize → optimized/usvi/ + manifest
         ↓
Manually upload compressed image files to R2 images/usvi/
         ↓
Run ingest --manifest optimized/usvi/publication-manifest.json
         ↓
Validate every referenced object exists in R2 (and compare checksum/size when supported)
         ↓
Upsert canonical Media assets and journey placements
         ↓
Validate generated content; commit/deploy using existing site workflow
         ↓
New photos appear in USVI journey's All Photography
```

Potential CLI (adapt to repo conventions):

```bash
npm run media:ingest -- --manifest ./optimized/usvi/publication-manifest.json --dry-run
npm run media:ingest -- --manifest ./optimized/usvi/publication-manifest.json
```

R2 `HEAD` confirms existence and metadata but **does not by itself prove byte-for-byte equality**. Prefer uploaded checksum metadata or an upload receipt when available; fail or warn according to a documented validation policy. Do not accidentally ingest the manifest as a visitor-facing media asset.

### Future: fully automated

One publish command can optimize, upload, verify, ingest, automatically commit generated registries with a bot identity, and wait/report deployment state. No routine manual Git changes or source-code edits. Preserve idempotent retries and durable jobs; do not claim the site is live when the file is only queued or uploaded.

## 7. Journey-first display: the required receiving-side change

**Design rule: A published image with only `journeyId` must have somewhere intentional to appear.** Build or reuse a generic **All Photography / Latest Images** collection on the matching root journey page.

A conceptual selector:

```js
function getJourneyMedia(journeyId) {
  return publishedPlacements
    .filter(item => item.journeyId === journeyId)
    .map(item => resolveMediaUsage(item, mediaById))
}
```

This is illustrative, not a drop-in implementation. Adapt to the canonical Journey/Media and placement schema, preserve ordering rules and public URL resolution, deduplicate where the same asset belongs to multiple visits, and return only verified/public media. Use lazy images and existing performance patterns; do not render a huge full-size library into one page eagerly.

- Journey-only placements are valid in v1.
- A later Place/Visit/Experience assignment **adds specificity** without removing the asset from the journey-level library.
- Preserve curated hero selections, curated story sequences, captions, and crop/focal choices. Automatically ingested photos should never displace manually selected content.
- Do not equate one geographic Place with one Journey; a Place can be visited on multiple journeys.
- Don't create bogus map pins from an upload tag alone.
- Existing Journey content should remain functional when no new assets exist.

## 8. Progressive enrichment (without republishing the whole trip)

A single asset can progress through:

1. **Registered:** stable `assetId`, verified R2 image, dimensions, rights, `journeyId` placement; visible in journey gallery.
2. **Technical enrichment:** EXIF-derived camera/lens/date/settings from real source/export, normalized against canonical Gear registry; unknown values stay null.
3. **Geographic enrichment:** explicit `placeId` or `visitId` association (never inferred only from a journey slug).
4. **Editorial enrichment:** title, meaningful alt, captions, experience membership, order/hero, story text—all usage-specific where applicable.
5. **Republish:** improved Lightroom edit results in a new image revision on **the same `assetId`**, leaving associations/curated usages intact.

Capture gear (`shot with`), journey gear (`packed/used`), and visible gear (`pictured in`) remain separate relationship types. Any future gear/affiliate links come from canonical gear records; never guess equipment from filename, ISO, or broad journey membership.

## 9. Generated content and deployment

- Machine-generated media/placement records should live in a distinct generated area or a clearly bounded write path; do not rewrite hand-authored journey/experience narrative modules by string manipulation.
- The ingestor is **idempotent**: rerunning the same manifest does not duplicate assets, placements, numbers, or commits. Use batch/event IDs, stable source mapping, object keys, and revision guards.
- An older retry cannot roll back a newer asset revision.
- Validate the complete content model, then commit generated data using the project’s existing GitHub Actions deployment pipeline. Use atomic file writes/transactions as appropriate; maintain previous deployed state if validation fails.
- Never put R2/GitHub write credentials in Vue's client bundle. Follow the current repository architecture; a Cloudflare Worker is optional, not a required new service.
- Log useful outcomes: `created`, `updated`, `already ingested`, `unmapped journey`, `missing R2 object`, `needs source reconciliation`, `deployment pending`, `deployed`.

## 10. Required safeguards and edge cases

1. Unknown tag, tag-to-journey ambiguity, or journey ID not found → reject and explain available valid mappings.
2. Existing filename/key reused for different bytes → reject or deliberately publish a new revision; never overwrite silently.
3. Same manifest reprocessed → no duplicate media/placements or Git noise.
4. Partial R2 batch upload → no partially committed, broken gallery; report missing items and permit retry.
5. Existing photo re-edited → reuse known stable asset ID; retain history, gallery memberships and curated usage.
6. Image uploaded without manifest → no automatic registration via filename/folder scanning.
7. Image belongs to multiple galleries or journeys → one physical asset with distinct validated placements.
8. No Place assignment → visible at Journey level; no invented geographic pin.
9. EXIF absent or conflicting → blank or review-needed gear metadata; do not invent values.
10. Original filename, local paths, private EXIF or secrets → not leaked to public registry.
11. Different storage prefixes for images versus videos → preserve media-type routing and never assume `usvi` is universally the root prefix.
12. Different output dimensions/formats for the same asset → model as renditions, not automatically as unrelated photographs.

## 11. Incremental implementation plan

**Phase 0 — Audit (read-only):** Locate the optimizer/tag mapper, authoritative Journey IDs, current Media and placement schemas, R2 conventions, and deployed selectors. Report exact files and any conflicts with this brief.

**Phase 1 — Optimizer output contract:** Preserve existing CLI/compression/numbering behavior; add journey-slug output folders and verified provisional manifest generation. Include CLI tests and `--dry-run` if consistent with existing tooling.

**Phase 2 — One vertical slice (USVI):** Use a few non-sensitive test images, resolve `usvi` to the real Journey ID, stage optimized outputs, upload images to R2, run validated ingestion, and demonstrate a new image appearing in **All Photography** on the St. John journey—without modifying a hand-authored gallery array.

**Phase 3 — Durable identity / revisions:** Add source mapping, collision handling, revision-safe storage and reliable replay/reconciliation. Integrate with Lightroom-oriented identity contract if its publisher exists.

**Phase 4 — Enrichment:** Extract safe EXIF and resolve Gear IDs; add optional explicit place/visit/experience associations through the same manifest/placement model.

**Phase 5 — Unattended publishing:** Automate upload verification, manifest submission, generated-content commit, GitHub Actions build/deploy, and status reporting. Use a safe review mode initially.

Do **not** build a second CMS, database, image catalog, mapping engine, or Vue component hierarchy for this feature.

## 12. Acceptance tests / definition of done

- Existing optimizer command still works with prior arguments and preserves output quality.
- `--tag usvi` selects the **real canonical** USVI Journey and writes compressed images into the desired journey-slug folder.
- A machine-readable manifest lists only actual outputs with correct dimensions, relative paths, checksums where required, and exact intended R2 object keys.
- Uploading files alone does not publish anything; ingestion only proceeds after verified R2 delivery.
- An image with only Journey membership appears in its root Journey's generic photo collection after successful ingestion/deployment.
- No manual edits to journey `.mjs` gallery lists, Atlas components, or other code are needed for the next image/batch.
- Rerun/retry is idempotent; collisions and missing objects produce explicit failures, not duplicate or broken assets.
- A modified version of a known image preserves the existing asset identity and all established placements.
- All previously selected heroes and curated editorial sequences remain unchanged.
- Existing Atlas/Trip views, builds, R2 video delivery, and responsive/mobile behavior pass regression tests.
- Future EXIF/gear enrichment can update the same canonical asset without forcing a new ingestion identity.

## 13. Coding-agent handoff — implementation instruction

> Read this brief alongside the latest Master Plan, canonical Atlas Asset Architecture, Lightroom-to-Atlas Publishing Architecture, Photo EXIF/Gear Integration, and R2 delivery docs. Inspect the **actual current repository** before changing anything. The image optimizer already understands a tag, maps it to a Journey, compresses images, and increments human-readable filename suffixes: **extend it, do not replace it**. Implement journey-specific optimized output folders and a validated publication manifest aligned to the existing ingestion contract. On the app side, an ingestor should register uploaded assets into canonical Media and placement records and make Journey-only media available automatically in a root-Journey All Photography view. Start with a USVI vertical slice, preserve hand-curated content, ensure R2 verification and idempotency, and demonstrate a second ingest that updates the app without editing source arrays. Plan for later Lightroom republishing, EXIF and gear association without creating parallel registries. Report exact files changed, tests run, actual command syntax, and remaining gaps.

**North star:** **Tag → Optimize → Upload → Ingest → Appears in Journey.** Eventually: **Edit → Publish → Appears in Journey.**
