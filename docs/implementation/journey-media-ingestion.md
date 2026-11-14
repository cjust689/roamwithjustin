---
id: journey-media-ingestion
title: Journey Media Ingestion
kind: implementation
status: in-progress
implementation_state: partial
updated: 2026-11-14
related:
  - media-pipeline
  - lightroom-publishing
supersedes:
  - journey-media-ingestion-architecture-brief
superseded_by: []
code_paths:
  - scripts/optimize-images.js
  - scripts/ingest-media.js
  - scripts/lib/media-ingestion.js
  - scripts/upload-media.js
  - scripts/test-media-ingestion.js
  - scripts/test-media-upload.js
  - workers/media-upload/src/index.mjs
  - workers/media-upload/wrangler.jsonc
  - src/content/media/generated/records.json
  - src/content/selectors/media.mjs
  - src/content/selectors/projections.mjs
  - src/views/roam/RoamTripOverview.vue
verification:
  state: verified
  evidence:
    - npm run media:test
    - npm run media:worker:check
    - npm run content:validate
    - npm run build
---

# Journey media preparation and ingestion

The media workflow has three deliberately separate stages:

1. `media:prepare` optimizes local exports, gives them deterministic names,
   validates a Journey or optional Place/Visit scope, and writes a provisional
   publication manifest.
2. `media:upload` revalidates the package, uploads its exact manifest-listed
   objects through the private Worker, and writes a verification receipt.
3. `media:ingest` verifies both the local package and the uploaded R2 objects,
   then adds generated canonical Media assets and publication placements.

Uploading files alone never publishes them. Ingestion never edits a curated
Journey cover, hero, story gallery, Visit, Place, or Atlas pin.

## Commands

```bash
npm run media:prepare -- --help
npm run media:upload -- --help
npm run media:ingest -- --help
npm run media:journeys
npm run media:places -- --journey usvi-st-john-2025
npm run media:test
npm run media:worker:check
npm run media:validate
```

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

## 1. Prepare a Journey package

Export JPEG or PNG images into one source directory. Subdirectories are not
scanned. Then run:

```bash
npm run media:prepare -- \
  --source "D:\Lightroom Exports\USVI" \
  --output "D:\R2 Ready" \
  --tag usvi \
  --rights-owner roam-with-justin \
  --rights-status owned
```

`--tag` is matched against canonical Journeys with deterministic text
similarity. The command continues only for a confident, unambiguous Journey
match. If the wording is unusual, provide the canonical ID explicitly while
retaining the input tag as a label:

```bash
npm run media:prepare -- \
  --source ./exports \
  --output ./ready \
  --tag "Virgin Islands summer" \
  --journey usvi-st-john-2025 \
  --rights-owner roam-with-justin \
  --rights-status owned
```

List accepted Journey IDs with `npm run media:journeys`. List canonical Place
and Visit IDs with
`npm run media:places -- --journey usvi-st-john-2025`. Unknown, weak, or
ambiguous matches fail closed; the tool does not guess a publication
association.

`media:prepare` already performs compression. Do not run
`images:optimize:copies` first unless you separately want same-directory copies
that are not part of a publication package.

### Prepare images for one Place/Visit

Use `--place` when the image set represents one social post, Atlas pin, or
location inside a Journey. Place scope is explicit: it requires `--journey`,
accepts only a canonical Place ID, and continues only when exactly one Visit
for that Place exists in the selected Journey. The free-form `--tag` remains an
operator label; it never creates the geographic association.

Git Bash, copy/paste as one line:

```bash
npm run media:prepare -- --source "O:/WebWorksMedia/Davinci Edits/USVI/edits/_2" --output "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready" --tag "waterlemon cay" --journey "usvi-st-john-2025" --place "waterlemon-cay" --rights-owner "roam-with-justin" --rights-status "owned"
```

For this repository, that resolves Place `waterlemon-cay` to Visit
`usvi-st-john-2025-waterlemon-cay`. A Place from a different Journey, an alias
instead of a canonical ID, a missing Visit, or multiple Visits for the same
Place fails without creating a package.

The example creates:

```text
D:\R2 Ready\usvi\
  usvi-001.jpg
  usvi-002.jpg
  ...
  publication-manifest.json
```

The Place example creates:

```text
O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/
  waterlemon-cay-001.jpg
  waterlemon-cay-002.jpg
  ...
  publication-manifest.json
```

Images are auto-oriented, bounded to 2560 pixels, encoded using the existing
optimizer policy, and measured after encoding. The manifest records the real
MIME type, width, height, byte size, SHA-256, intended R2 object key, explicit
rights, canonical Journey ID, and a gallery placement. Place packages also
record the validated canonical Place and Visit IDs. The default object prefix
is `images/<journey-slug>/<content-derived-batch-id>/` for Journey-only
packages and
`images/<journey-slug>/<place-id>/<content-derived-batch-id>/` for Place
packages; change the parent with `--r2-prefix <prefix>`. The versioned batch
segment prevents a later upload from silently replacing a previously
published object.

Preparation refuses to overwrite an existing `<output>/<journey-slug>` or
`<output>/<journey-slug>-<place-id>` package. Use a clean output parent or
deliberately move the reviewed package before preparing another batch.
`--dry-run` performs the transforms in memory and reports the plan without
writing anything.

The original in-place optimizer and same-directory numbered-copy mode remain
available and unchanged:

```bash
npm run images:optimize
npm run images:optimize:copies -- --source ./photos --tag usvi
```

Those modes do not create publication records.

## 2. Upload exactly what the manifest names

The implemented local uploader sends every prepared image to its manifest
asset's exact `output.objectKey` through the authenticated Cloudflare Worker.
It does not scan the directory or upload the manifest, receipt, source exports,
or unrelated files. Start with a local-only dry run:

```bash
npm run media:upload -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/publication-manifest.json" --dry-run
```

After configuring the private Worker URL and upload token as documented in
[R2 Worker media upload](r2-worker-media-upload.md), run:

```bash
npm run media:upload -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/publication-manifest.json"
```

For example, the mapping remains:

```text
local:      D:\R2 Ready\usvi\usvi-001.jpg
object key: images/usvi/media-usvi-0123456789abcdef/usvi-001.jpg
public URL: https://media.roamwithjustin.com/images/usvi/media-usvi-0123456789abcdef/usvi-001.jpg
```

The repository contains no credential values. `MEDIA_UPLOAD_TOKEN` is read
only from the private local environment and is never accepted as a command-line
argument. R2 credentials are not needed locally because the Worker uses its R2
binding.

## 3. Upload verification receipt

After every object is verified in R2, `media:upload` atomically writes
`r2-verification.json` beside the manifest. It uses the receipt contract
already accepted by `media:ingest`:

```json
{
  "schemaVersion": 1,
  "batchId": "media-usvi-0123456789abcdef",
  "objects": [
    {
      "objectKey": "images/usvi/media-usvi-0123456789abcdef/usvi-001.jpg",
      "byteSize": 245817,
      "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
  ]
}
```

The ingestor compares the receipt's batch, complete key set, sizes, and hashes
with the manifest. The Worker supplies R2-validated SHA-256 results; the local
uploader does not write a receipt after a partial, failed, conflicting, or
dry-run upload.

If no checksum-capable inventory is available, the ingestor can send public
`HEAD` requests and verify availability, byte size, and MIME type:

```bash
npm run media:ingest -- \
  --manifest "D:\R2 Ready\usvi\publication-manifest.json" \
  --verify-public \
  --accept-head-only
```

`--accept-head-only` is required because HTTP `HEAD` does not prove SHA-256.
Use `--base-url` only when verifying a different public media origin.

## 4. Dry-run, ingest, and build

First validate the package and planned canonical records without writing:

```bash
npm run media:ingest -- \
  --manifest "D:\R2 Ready\usvi\publication-manifest.json" \
  --verification-receipt "D:\R2 Ready\usvi\r2-verification.json" \
  --dry-run
```

For an early local planning pass, `--dry-run` may omit remote verification;
the output is explicitly marked `not-verified-dry-run` and cannot be applied.

Then apply:

```bash
npm run media:ingest -- \
  --manifest "D:\R2 Ready\usvi\publication-manifest.json" \
  --verification-receipt "D:\R2 Ready\usvi\r2-verification.json"
```

For the Waterlemon Place package in Git Bash, the copy/paste commands are:

```bash
npm run media:ingest -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/publication-manifest.json" --verification-receipt "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/r2-verification.json" --dry-run
npm run media:ingest -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/publication-manifest.json" --verification-receipt "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/r2-verification.json"
```

Add `--build` to run the production build after a successful apply. The apply
updates only `src/content/media/generated/records.json`, then runs full content
validation. A failed validation restores the prior generated file.

After a normal site deployment, all published placements appear in the
Journey page's lazy-loaded **All photography** / **Latest images** section.
A Place/Visit placement also appears in that Visit's location gallery and in
the media for an Atlas pin that already presents the Visit. If the Visit has
no curated hero, the first published image becomes its derived Trip-card and
Atlas display image. This does not write or overwrite curated hero state. A
Visit without verified photography has an intentional pending placeholder;
the Journey cover is not reused as if it were location-specific. Ingestion
still does not create a pin, Visit, Place, or curated story-gallery entry.

The collection displays newer ingested batches first while retaining each
batch's manifest order. This ordering uses a stored monotonic sequence rather
than filesystem dates or upload timestamps.

## Identity, retries, and revisions

- A manifest batch ID is derived from its Journey, optional Place/Visit scope,
  keys, and output hashes.
- Re-running an already applied identical batch is a no-op.
- Reusing a batch ID with different manifest bytes is rejected.
- New manifest entries with `assetId: null` receive deterministic generated
  Media IDs; filenames are not canonical identity.
- A future republish may set `assetId` to an existing generated Media ID and
  must set `revision` to exactly the next revision. The ingestor preserves the
  ID and existing placement/editorial state while advancing the rendition.
  Unknown IDs, skipped/stale revisions, unchanged rendition bytes, and curated
  asset IDs are rejected.
- Omitted records are never deleted.

## Manifest boundary and current scope

Schema version 1 accepts JPEG and PNG assets, explicit rights, one canonical
Journey association, an optional validated Place/Visit pair, and `gallery`
placements with `published` or `draft` visibility. Place and Visit must appear
together and the Visit must belong to both the manifest Journey and Place.
Paths must be safe and relative; R2 keys must remain inside the declared
prefix. Width, height, size, and checksum must match the local output.

The architecture leaves nullable capture fields for future Lightroom/EXIF
imports, but version 1 does not infer camera, lens, date, Place, Visit, or
Experience from filenames, tags, or folder names. Place/Visit publication
scope is accepted only through explicit validated flags. Experience scope,
direct S3-compatible credential upload, general R2 bucket listing, location
review tooling, renditions, and gear inference remain future integrations
rather than hidden behavior in the compressor.

### Lightroom publication-event compatibility

This provisional package is the bootstrap adapter into the same generated
Media and placement materialization intended for Lightroom publishing; it is
not a second public catalog. `batchId` provides the event deduplication role
for source files whose durable Lightroom identity is not yet available.

A later Lightroom publisher should adapt its `eventId`, stable `assetId`,
monotonic `revision`, immutable rendition key, and associations into this
single validation/planning boundary (or evolve its schema in place). It should
not create a parallel generated registry or make Vue consume raw Lightroom
events. Private catalog/source references and event history must remain
outside the public generated snapshot.

## Repository map

Place/Visit projection is implemented in
`src/content/selectors/projections.mjs`; the shared media selector exposes both
Journey-wide and Visit-specific generated placement views.

- `scripts/optimize-images.js` — existing optimizer plus package preparation
- `scripts/ingest-media.js` — verification and transactional apply CLI
- `scripts/lib/media-ingestion.js` — schema validation and idempotent planner
- `scripts/upload-media.js` — local package validation, Worker upload client,
  retry/resume behavior, and atomic receipt writer
- `workers/media-upload/` — authenticated upload-only Worker and R2 binding
- `src/content/media/generated/records.json` — generated assets, placements,
  and applied batch receipts
- `src/content/media/index.mjs` — canonical curated + generated composition
- `src/content/selectors/media.mjs` — public Journey-placement projection
- `src/views/roam/RoamTripOverview.vue` — All Photography presentation
