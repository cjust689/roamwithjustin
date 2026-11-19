---
id: gear-image-preparation
title: Gear Image Preparation
kind: reference
status: implemented
implementation_state: partial
created: 2026-11-18
updated: 2026-11-19
related:
  - gear-system
  - gear-publishing-implementation
  - gear-authoring-workflow
  - gear-ingestion-affiliate-analytics-ai
  - media-pipeline
supersedes: []
superseded_by: []
code_paths:
  - scripts/prepare-gear-image.mjs
  - scripts/publish-gear-image.mjs
  - scripts/upload-media.js
  - scripts/lib/gear-image-preparation.mjs
  - scripts/lib/gear-image-publication.mjs
  - scripts/lib/image-normalization.js
  - scripts/test-gear-image-preparation.mjs
  - scripts/test-gear-image-upload.mjs
  - scripts/test-gear-image-publication.mjs
  - workers/media-upload/src/index.mjs
  - src/content/gear/generated/images.json
  - src/content/selectors/media.mjs
  - src/components/GearGrid.vue
verification:
  state: verified
  evidence:
    - npm run gear:test
    - npm run media:worker:check
    - node scripts/test-media-ingestion.js
    - node scripts/test-media-upload.js
---

# Gear image preparation

`gear:prepare` creates a deterministic local product-image package without a
fake Journey, Visit, Place, or Media placement. It accepts one local JPEG or
PNG only after the operator explicitly confirms reviewed creator-owned rights.
It never downloads a remote image, edits the canonical Gear registry, commits,
pushes, or deploys. A separate `gear:upload` command can upload an applied
package after local review.

The root-level `gear-inbox/` and `gear-ready/` directories are ignored so
private source photographs and prepared local packages are not staged by
ordinary repository commands.

## Dry run

```bash
npm run gear:prepare -- --gear-id camera-accessory --source ./gear-inbox/camera-accessory.jpg --output ./gear-ready --rights-owner roam-with-justin --rights-status owned --rights-reviewed --alt "Camera accessory on a dark background" --dry-run
```

The dry run decodes the source and renders every derivative in memory. It
checks the extension against the decoded format, enforces a 50 MiB and 80
megapixel ceiling, rejects animated or multi-page input, verifies that private
EXIF, IPTC, and XMP metadata are absent from the outputs, and reports the exact
package path and future object-key prefix. It writes nothing.

## Apply

After reviewing the source identity, rights, alt text, and dry-run output:

```bash
npm run gear:prepare -- --gear-id camera-accessory --source ./gear-inbox/camera-accessory.jpg --output ./gear-ready --rights-owner roam-with-justin --rights-status owned --rights-reviewed --alt "Camera accessory on a dark background" --apply
```

Apply writes through a temporary sibling directory and renames the complete
package into place only after all derivatives and the manifest succeed. An
identical rerun verifies the manifest and every checksum, then reports the
package unchanged. A pre-existing package with different files, manifest
content, or bytes fails instead of being overwritten.

## Package contract

The preparer reuses the same Sharp orientation, bounded resize, and sRGB
normalization primitive as `media:prepare`. It emits metadata-stripped WebP
derivatives in 320, 640, and 960 pixel bounding boxes. Images are never
enlarged, so measured dimensions may be smaller than the target for a small
source.

The package directory is named from the stable Gear ID and a 24-character
content hash. It contains:

- `320.webp`, the card thumbnail;
- `640.webp`, the card display image;
- `960.webp`, the detail image; and
- `gear-image-manifest.json`, with source checksum and dimensions, reviewed
  rights, alt text, processing policy, derivative checksums, and future
  immutable object keys below `images/gear/<gear-id>/<content-hash>/`.

The manifest records only the source filename, never its absolute local path
or retained source metadata.

## Upload dry run

Validate the applied package and every local WebP without credentials or
network writes:

```bash
npm run gear:upload -- --manifest ./gear-ready/camera-accessory-<content-hash>/gear-image-manifest.json --dry-run
```

The Gear adapter requires the exact preparation contract. It rejects changed
keys, paths, dimensions, checksums, rights state, processing policy, or local
bytes before contacting the Worker.

## Upload and receipt

After configuring the private `MEDIA_UPLOAD_WORKER_URL` and
`MEDIA_UPLOAD_TOKEN` described in the R2 Worker runbook:

```bash
npm run gear:upload -- --manifest ./gear-ready/camera-accessory-<content-hash>/gear-image-manifest.json
```

The command reuses the existing authenticated upload transport. Worker source
accepts prepared WebP, requires the content hash embedded in each immutable
key, verifies byte size and SHA-256, and never overwrites a different object.
Only complete remote verification creates
`gear-r2-verification.json` beside the manifest. An exact rerun reports the
objects and receipt already verified.

The package and receipt are not canonical Gear or Media state. The external
Worker deployment and first real Gear upload remain unverified.

## Canonical publication dry run

The target Gear item must already exist. Image publication cannot invent its
product identity, use, notes, links, or verification state. Preview the exact
receipt-backed update and the public rendition URLs:

```bash
npm run gear:publish-image -- --gear-id camera-accessory --manifest ./gear-ready/camera-accessory-<content-hash>/gear-image-manifest.json --receipt ./gear-ready/camera-accessory-<content-hash>/gear-r2-verification.json --dry-run
```

The command rechecks the manifest, every local WebP, the manifest checksum
stored in the receipt, the complete receipt object set, and the existing
canonical records. Dry run writes nothing.

## Apply after card review

After reviewing the product image, alternative text, public rendition URLs,
and card context:

```bash
npm run gear:publish-image -- --gear-id camera-accessory --manifest ./gear-ready/camera-accessory-<content-hash>/gear-image-manifest.json --receipt ./gear-ready/camera-accessory-<content-hash>/gear-r2-verification.json --apply --approve-card --build
```

The transaction writes `src/content/gear/generated/images.json` and updates
only that existing Gear item's `imageAssetId`. The Gear image shard is composed
through the canonical Media registry. The 320, 640, and 960 pixel immutable
objects form a responsive image set, while one stable Media ID survives future
revisions. Repeating the same publication is unchanged.

Replacing an existing image additionally requires `--replace-image`. A
changed image advances the stable asset revision and retains its prior batch
evidence. Content validation or optional build failure restores both generated
files. The command never uploads, creates a product or usage claim, changes
links or notes, removes old objects, commits, pushes, or deploys.

The file-based [Gear authoring workflow](gear-authoring-workflow.md) can
coordinate these same preparation, upload, and publication functions. It
retains a mandatory local prepare checkpoint so a newly generated package
cannot be uploaded and published before review.
