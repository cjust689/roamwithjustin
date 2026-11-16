---
id: media-pipeline
title: Media Pipeline
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-14
updated: 2026-11-16
related:
  - content-model
  - journey-media-ingestion
  - lightroom-publishing
supersedes:
  - atlas-asset-architecture-brief
  - journey-media-ingestion-architecture-brief
superseded_by: []
code_paths:
  - scripts/optimize-images.js
  - scripts/ingest-media.js
  - scripts/cull-media.js
  - scripts/lib/media-ingestion.js
  - scripts/lib/media-culling.js
  - scripts/upload-media.js
  - scripts/editorial-publish.mjs
  - scripts/lib/editorial-content-compiler.mjs
  - scripts/lib/editorial-github-publisher.mjs
  - workers/media-upload/src/index.mjs
  - workers/media-upload/wrangler.jsonc
  - src/content/media/index.mjs
  - src/content/media/generated/records.json
  - src/content/editorial/generated/records.json
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

# Media pipeline

## Current paths

The repository supports three local preparation modes and one upload boundary:

1. `images:optimize` recursively optimizes oversized JPEG/PNG files under
   `public/img` in place.
2. `images:optimize:copies` makes same-directory numbered copies from a
   user-supplied tag. Canonical tag matching is advisory unless explicitly
   adopted.
3. `media:prepare` resolves one canonical Journey and can optionally validate
   one explicitly named canonical Place and its single Visit in that Journey.
   An image-only source folder creates optimized numbered JPEG/PNG files. An
   MP4-only source folder creates byte-identical numbered copies without
   transcoding. Both produce versioned R2 object keys and a measured
   `publication-manifest.json` with explicit rights and validated scope.
4. `media:upload` revalidates a prepared local package, uploads only its
   manifest-listed media through an authenticated upload-only Worker, and
   atomically creates the checksum receipt already accepted by `media:ingest`.

Published generated media can be removed from public Journey, Place, and Atlas
views with `media:cull`. The command changes every published placement for one
generated asset to `draft`; it does not remove the canonical asset, batch
history, or R2 object. Dry run is an explicit mode, and apply is atomic,
validated, idempotent, and rolled back when canonical validation fails.

The full operator workflow and flags are in
[Journey media ingestion](../implementation/journey-media-ingestion.md).
Worker deployment, credentials, retry behavior, and recovery are in
[R2 Worker media upload](../implementation/r2-worker-media-upload.md).

## Publication and generated state

`media:ingest` validates the manifest and local output bytes, then requires
either a checksum receipt or an explicitly acknowledged public-HEAD policy.
It plans idempotent assets/placements, enforces monotonic explicit revisions,
preserves existing placement state on republish, and atomically updates only
`src/content/media/generated/records.json`. Failed canonical validation rolls
the generated file back.

An explicit `--reassociate-existing` correction path handles images that were
first published at Journey scope and later prepared and uploaded with the
correct Place/Visit scope. It accepts only a checksum-verified, newly prepared
Place package whose complete asset set resolves to identical existing
Journey-only assets. The planner preserves canonical Media IDs, adopts the new
Place-scoped object keys, advances revisions, replaces the single generic
placement for each asset, and records the corrected batch atomically. It does
not infer scope, alter curated media, or move already-specific placements.

Curated `.mjs` Media records and generated JSON image/video assets are composed by
`src/content/media/index.mjs`. `getJourneyPublishedMedia()` includes all
published placements for a Journey in the root Journey page's lazy-loaded
**Photography and video** collection. `getVisitPublishedMedia()` additionally
projects a validated Place/Visit placement into that Journey location's media
and into an existing Atlas presentation for the Visit. It never creates a
Place, Visit, or Atlas pin. Generated media do not overwrite curated heroes
or curated story galleries. When a Visit has no curated hero, its first
published image becomes the derived display image for the Trip card and Atlas
node. A Visit with no verified image stays image-free; selectors never use the
Journey cover as a location-specific fallback.

An Experience-scoped placement is valid only when the referenced Experience
exists and belongs to the same Journey. `getExperiencePublishedMedia()` and
the Experience selector project those placements into published Moments on the
Journey page. The Sheet compiler adds the Experience association only after
the receipt-backed Media batch exists; raw manifests continue to prepare at
Journey or Place/Visit scope.

The public selectors ignore draft placements. Culling a derived display image
therefore promotes the next published Visit image automatically. Culling does
not edit explicit curated Journey or Visit hero/gallery references; those
remain a separate editorial authority.

The generated registry is live production state and currently includes
R2-backed USVI Place/Visit batches. Its checked-in records, rather than this
document, determine which assets and placements exist.

## Delivery

R2 object keys are resolved against `https://media.roamwithjustin.com` unless
`VUE_APP_MEDIA_BASE_URL` overrides it at build time. New image package keys are
batch-versioned below `images/`; new MP4 package keys are batch-versioned below
`videos/`. Video preparation preserves the input bytes and checksum. It does
not transcode, compress, claim codec compatibility, or generate a poster.

The local uploader owns filesystem access, canonical manifest validation,
bounded concurrency/retries, transport selection, and receipt creation. It
uses one create-only PUT for images and smaller MP4s. MP4s above 64 MiB use R2
multipart upload automatically, with 16 MiB parts by default; no workflow or
manifest change is required. Failed multipart sessions are aborted, and a
normal rerun safely recognizes an already-completed immutable object.

The Worker owns bearer-token authentication, the `images/` and `videos/` key
boundaries, MIME/object-size checks, per-part size and SHA-256 validation, R2
multipart completion, and post-write object verification. The uploader also
checks each returned part ETag and the final multipart ETag before it writes a
receipt. The Worker exposes no object download, bucket-wide delete/list, or
canonical-publication API. Its upload bearer secret is distinct from
Wrangler/Cloudflare deployment authentication, and no R2 S3 access keys are
distributed to the local uploader.

Images default to a 25 MiB object limit and MP4 files to a 190 MiB object
limit. These are publication-policy limits, not per-request body sizes;
multipart parts remain below the request-body limit. The MP4 object limit and
maximum part size are configurable through `MAX_VIDEO_UPLOAD_BYTES` and
`MAX_MULTIPART_PART_BYTES`. Automatic quality-changing compression is
intentionally absent.

The Worker source and bundle are locally verified. Deployment state in the
owner's Cloudflare account and the credentials available to the new
single-command publisher remain externally unverified.

## Sheet and Git publication orchestration

`editorial:publish -- --preview` downloads a hash-addressed private Drive
snapshot, partitions images and MP4s, invokes `media:prepare`, runs mandatory
receipt-free ingestion planning, and composes the proposed Experience and
Moment diff. It never uploads or changes tracked content.

`editorial:publish -- --apply` rechecks the same Sheet row and Drive inventory,
then invokes `media:upload` and `media:ingest` with genuine checksum receipts.
It atomically validates the generated Media and editorial shards, builds the
site, and sends only those two allowlisted paths through an isolated post
branch, `develop`, and `main`. GitHub Actions and the rendered production page
must succeed before the Sheet receives Published metadata. R2 objects are
immutable and are not deleted as rollback for a later Git, Pages, or Sheet
failure.

## Not implemented

- Lightroom Classic plug-in or durable publisher outbox
- EXIF extraction, privacy filtering, or capture-Gear matching
- Multiple photo renditions (thumbnail/gallery/full) per generated asset
- Automatic video transcoding, codec inspection, posters, or adaptive bitrate
- Direct Experience-scoped manifest preparation; the compiler currently adds
  the Experience association after Journey or Place/Visit ingestion
- First live end-to-end Sheet, Drive, R2, GitHub, Pages, and write-back proof
