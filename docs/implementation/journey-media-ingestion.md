---
id: journey-media-ingestion
title: Journey Media Ingestion
kind: implementation
status: in-progress
implementation_state: partial
updated: 2026-11-27
related:
  - media-pipeline
  - lightroom-publishing
supersedes:
  - journey-media-ingestion-architecture-brief
superseded_by: []
code_paths:
  - scripts/optimize-images.js
  - scripts/ingest-media.js
  - scripts/cull-media.js
  - scripts/lib/media-ingestion.js
  - scripts/lib/media-culling.js
  - scripts/upload-media.js
  - scripts/test-media-ingestion.js
  - scripts/test-media-culling.js
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
    - node scripts/test-media-ingestion.js
    - npm run media:test
    - npm run media:worker:check
    - npm run content:validate
    - npm run build
---

# Journey media preparation and ingestion

The media workflow has three deliberately separate stages:

1. `media:prepare` optimizes JPEG/PNG exports or byte-copies MP4 exports, gives
   them deterministic names, validates a Journey or optional Place/Visit
   scope, and writes a provisional publication manifest.
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
npm run media:cull -- --help
npm run media:journeys
npm run media:places -- --journey usvi-st-john-2025
npm run media:test
npm run media:worker:check
npm run media:validate
```

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

## 1. Prepare a Journey package

Export JPEG or PNG images into one source directory. MP4 videos use the same
command but must be in a separate video-only source directory. Subdirectories
are not scanned. Then run:

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

For images, `media:prepare` already performs compression. Do not run
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

### Prepare MP4 videos

Video uses the same Journey and optional Place/Visit binding as photography.
The preparer accepts an MP4-only source folder, verifies the MP4 file-type
header, renames each copy deterministically, preserves its bytes exactly, and
records the real byte size and SHA-256. It does not transcode, recompress,
change quality, inspect codecs, or generate posters.

Git Bash, one line for a Waterlemon Cay video package:

```bash
npm run media:prepare -- --source "O:/WebWorksMedia/Davinci Edits/USVI/waterlemon-video" --output "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready" --tag "waterlemon cay video" --journey "usvi-st-john-2025" --place "waterlemon-cay" --rights-owner "roam-with-justin" --rights-status "owned"
```

That creates a separate package so an existing image package is untouched:

```text
O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay-videos/
  waterlemon-cay-001.mp4
  waterlemon-cay-002.mp4
  publication-manifest.json
```

Video object keys default to
`videos/<journey-slug>/<place-id>/<content-derived-batch-id>/` for a Place
package or `videos/<journey-slug>/<content-derived-batch-id>/` for a
Journey-only package. The default maximum is 190 MiB per MP4. Uploads through
64 MiB use one request; larger MP4s automatically use R2 multipart upload with
16 MiB parts. The manifest, receipt, and ingestion commands are identical for
both transports. For example, a 124.5 MiB Cinnamon Bay MP4 needs no special
upload flag after the updated Worker is deployed.

If preparation rejects a file above 190 MiB, re-export a smaller web-delivery
MP4 or deliberately raise both `--max-video-mib <n>` and the Worker's
`MAX_VIDEO_UPLOAD_BYTES`. The tool will not silently trade quality for size.
The uploader's `--multipart-threshold-mib` and `--multipart-part-mib` options
exist for controlled tuning; their defaults should normally be retained.

After the updated Worker has been deployed, upload and ingest use the exact
same commands as an image package:

```bash
npm run media:upload -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay-videos/publication-manifest.json" --dry-run
npm run media:upload -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay-videos/publication-manifest.json"
npm run media:ingest -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay-videos/publication-manifest.json" --verification-receipt "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay-videos/r2-verification.json" --dry-run
npm run media:ingest -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay-videos/publication-manifest.json" --verification-receipt "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay-videos/r2-verification.json" --build
```

Ingested video appears in the Journey media collection and in the media for
its bound Visit/Atlas presentation. A video without a poster does not become a
still-image hero; publish a Place-scoped image separately when the card or pin
also needs photography.

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

The implemented local uploader sends every prepared image or MP4 to its manifest
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

### Correct a previously Journey-only batch

If images were first prepared without `--place`, they are published as
Journey-only placements. Preparing the same source later with the correct
Place produces the same full checksums, so ordinary ingestion rejects the
already-published bytes instead of silently moving existing content.

After preparing and uploading the corrected Place package, use the explicit
reassociation mode. Always dry-run first. For the Red Hook correction in Git
Bash:

```bash
npm run media:ingest -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-red-hook-ferry-terminal/publication-manifest.json" --verification-receipt "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-red-hook-ferry-terminal/r2-verification.json" --reassociate-existing --dry-run
npm run media:ingest -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-red-hook-ferry-terminal/publication-manifest.json" --verification-receipt "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-red-hook-ferry-terminal/r2-verification.json" --reassociate-existing --build
```

This is a narrow metadata and rendition-path correction, not a general move
command. It succeeds only when all of the following are true:

- the corrected manifest explicitly declares one valid Place and Visit;
- every manifest asset has null `assetId` and `revision`, as emitted by a new
  `media:prepare` package;
- every deterministic Media ID already exists with exactly matching SHA-256,
  byte size, dimensions, MIME type, and rights;
- every matched asset has exactly one placement and that placement is generic
  Journey-only state in the same Journey;
- the corrected objects use new Place-scoped keys and have a matching
  checksum-capable `r2-verification.json` receipt.

On success, canonical Media IDs stay stable, each asset revision advances, the
new Place-scoped object key becomes current, the Journey-only placement is
replaced by the manifest's Place/Visit placement, and the corrected batch is
recorded. All Photography still includes the images because Place placements
also retain their Journey association. Previously uploaded generic objects are
not deleted from R2; the upload-only Worker intentionally has no delete API.
Mixed batches, partial matches, public-HEAD-only verification, explicit
republish manifests, and assets already associated with a Place are rejected.

After a normal site deployment, the Journey page's lazy-loaded **Photography
and video** / **Latest media** section combines existing curated Journey and
Visit media with all generated published placements, deduplicated by resolved
source. This lets established Journeys display their already-canonical media
without repackaging or re-uploading it; ingestion remains the additive path
for new media. A Place/Visit placement also appears in that Visit's location
gallery and in the media for an Atlas pin that already presents the Visit. If
the Visit has no curated hero, the first published image becomes its derived
Trip-card and Atlas display image. This does not write or overwrite curated
hero state. A Visit without verified photography has an intentional pending
placeholder; the Journey cover is not reused as if it were location-specific.
Ingestion still does not create a pin, Visit, Place, or curated story-gallery
entry.

The collection displays newer ingested batches first while retaining each
batch's manifest order. This ordering uses a stored monotonic sequence rather
than filesystem dates or upload timestamps.

## 5. Cull an ingested asset without deleting it

Use the generated Media asset ID shown in `records.json`, an ingestion plan,
or the asset's publication manifest. Always preview the exact placements first:

```bash
npm run media:cull -- --asset-id "image-usvi-380d1e6f91eb-001" --dry-run
```

Apply the cull only after the reported Journey and Place/Visit scope is correct:

```bash
npm run media:cull -- --asset-id "image-usvi-380d1e6f91eb-001" --apply
```

`--apply` changes every published placement for that generated asset to `draft`.
The public selectors then omit it from the Journey-wide media collection, its
Place/Visit gallery, and any existing Atlas pin projection. The Media asset,
batch history, immutable R2 object, and rights/publication metadata remain
unchanged. Running apply again is a successful no-op.

The command validates the current and proposed generated registry before it
writes, replaces `records.json` atomically, runs canonical content validation,
and restores the original file if validation fails. It does not alter explicit
curated hero or gallery usages in Journey modules. Remove such an intentional
curated usage separately when one exists. Use `npm run media:validate` for a
quick local check; the GitHub Pages build runs the same content validation
again after the change is pushed to `main`.

## Identity, retries, and revisions

- A manifest batch ID is derived from its Journey, optional Place/Visit scope,
  keys, and output hashes.
- Re-running an already applied identical batch is a no-op.
- Reusing a batch ID with different manifest bytes is rejected.
- New manifest entries with `assetId: null` receive deterministic generated
  Media IDs; filenames are not canonical identity. Ordinary new entries are
  compared by full SHA-256 within the incoming manifest and against generated
  assets already published in the same Journey. Repeated bytes are rejected
  even when their manifest position changes.
- Normal generated IDs retain the established 12-character hash prefix. If
  different bytes ever occupy the same shortened candidate ID, the new ID uses
  a deterministic longer hash prefix. Existing IDs and in-flight manifests,
  receipts, placements, and R2 keys are not rewritten.
- A future republish may set `assetId` to an existing generated Media ID and
  must set `revision` to exactly the next revision. The ingestor preserves the
  ID and existing placement/editorial state while advancing the rendition.
  Unknown IDs, skipped/stale revisions, unchanged rendition bytes, and curated
  asset IDs are rejected.
- `--reassociate-existing` is the only supported way to replace a mistaken
  Journey-only placement using a newly prepared, checksum-verified Place/Visit
  package. Normal republishing continues to preserve placement scope.
- Omitted records are never deleted.

## Manifest boundary and current scope

Schema version 1 accepts homogeneous JPEG/PNG image packages or MP4 video
packages, explicit rights, one canonical
Journey association, an optional validated Place/Visit pair, and `gallery`
placements with `published` or `draft` visibility. Place and Visit must appear
together and the Visit must belong to both the manifest Journey and Place.
Paths must be safe and relative; R2 keys must remain inside the declared
prefix. Image width/height plus every asset's size and checksum must match the
local output. Video dimensions and duration remain null until the separate
metadata-inspection proposal is implemented.

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
