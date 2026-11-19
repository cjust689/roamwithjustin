---
id: gear-image-preparation
title: Gear Image Preparation
kind: reference
status: implemented
implementation_state: partial
created: 2026-11-18
updated: 2026-11-18
related:
  - gear-system
  - gear-publishing-implementation
  - gear-ingestion-affiliate-analytics-ai
  - media-pipeline
supersedes: []
superseded_by: []
code_paths:
  - scripts/prepare-gear-image.mjs
  - scripts/lib/gear-image-preparation.mjs
  - scripts/lib/image-normalization.js
  - scripts/test-gear-image-preparation.mjs
verification:
  state: verified
  evidence:
    - npm run gear:test
    - node scripts/test-media-ingestion.js
    - node scripts/test-media-upload.js
---

# Gear image preparation

`gear:prepare` creates a deterministic local product-image package without a
fake Journey, Visit, Place, or Media placement. It accepts one local JPEG or
PNG only after the operator explicitly confirms reviewed creator-owned rights.
It never downloads a remote image, uploads to R2, edits the canonical Gear
registry, commits, pushes, or deploys.

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

## Remaining publication boundary

This package is not a receipt and is not canonical Gear or Media state. The
existing `media:upload` command accepts Journey media manifests, not this Gear
manifest. A later Gear-specific adapter must revalidate this package, use the
authenticated immutable upload boundary, verify checksums in an upload
receipt, and update only the intended Gear image reference after review.
