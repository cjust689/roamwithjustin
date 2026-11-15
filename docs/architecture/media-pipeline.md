---
id: media-pipeline
title: Media Pipeline
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-14
updated: 2026-11-14
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
  - scripts/lib/media-ingestion.js
  - scripts/upload-media.js
  - workers/media-upload/src/index.mjs
  - workers/media-upload/wrangler.jsonc
  - src/content/media/index.mjs
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
bounded concurrency/retries, and receipt creation. The Worker owns bearer-token
authentication, the `images/` and `videos/` key boundaries, MIME/size checks, atomic
create-only writes, and stored R2 SHA-256 verification. It exposes no object
download, delete, list, or canonical-publication API. The upload bearer secret
is distinct from Wrangler/Cloudflare deployment authentication, and no R2 S3
access keys are distributed to the local uploader.

Images default to a 25 MiB Worker limit. MP4 files default to 95 MiB so the
single-request upload remains below Cloudflare's 100 MB Free/Pro request-body
limit; both limits are configurable Worker variables. A larger video must be
re-exported below the active limit or use a future multipart/direct-upload
path. Automatic quality-changing compression is intentionally absent.

The Worker source and bundle are locally verified. Deployment into the
owner's Cloudflare account and the first production upload remain
externally unverified.

## Not implemented

- Lightroom Classic plug-in or durable publisher outbox
- EXIF extraction, privacy filtering, or capture-Gear matching
- Multiple photo renditions (thumbnail/gallery/full) per generated asset
- Automatic video transcoding, codec inspection, posters, or adaptive bitrate
- Multipart upload for MP4 files above the configured single-request limit
- Experience-scoped media preparation and placement
- Automated Git commit/push/deployment reporting after ingestion
