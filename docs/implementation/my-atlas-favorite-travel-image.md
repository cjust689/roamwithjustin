---
id: my-atlas-favorite-travel-image-implementation
title: My Atlas Favorite Travel Image Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-19
updated: 2026-11-19
related:
  - my-atlas-account-state
  - my-atlas-private-beta-implementation
  - my-atlas-destination-memory-photo-phase-0-2026-11-19
  - media-pipeline
  - docs-index
supersedes:
  - my-atlas-destination-memory-photo-implementation
superseded_by: []
code_paths:
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/export/storyExport.mjs
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/views/roam/Privacy.vue
  - workers/my-atlas/src/account/atlas-image.mjs
  - workers/my-atlas/src/account/contracts.mjs
  - workers/my-atlas/src/account/service.mjs
  - workers/my-atlas/src/index.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/wrangler.jsonc
  - workers/my-atlas/test/atlas-image.test.mjs
  - workers/my-atlas/test/account.test.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run lint
    - npm run build
    - npm run my-atlas:worker:check
    - npm run my-atlas:worker:check:staging
    - R2 bucket info on 2026-11-19 reported Standard storage in ENAM, zero objects, disabled r2.dev access, and no custom domains
    - Staging Worker version 8fbb0a9e-76bc-4be2-9a53-637be432db5c deployed with MY_ATLAS_MEDIA_R2, IMAGES, MY_ATLAS_IMAGE_RATE_LIMITER, and the November 19 privacy version
    - Remote staging returned 200 health, 401 for an unauthenticated owner image read, 403 for a foreign origin, and 204 for the allowed upload preflight
    - Local responsive fixture review showed the complete saved-image card and actions, while simulated 390 pixel metrics reported zero document and panel overflow
    - Pull request 184 passed validation run 44619801709 and merged to develop as 92f8cd9b75d69b8996ce12ad427b767e2f466d04; develop validation run 44620185226 then succeeded
    - Pull request 185 passed production validation run 44620479789 and merged to main as 11ff6c6ec5fc4d7c2fae0ea7826fcc7eeec717f0
    - Pages run 44620760737 deployed the production merge, and live chunk 22.5e12852a.js returned 200 with the favorite-image label, export-use explanation, and choose-image action together
---

# My Atlas favorite travel image implementation

The first private traveler image release uses one optional favorite travel
image for the whole Atlas. It does not attach images to visited pins. The image
appears in the owner's downloaded Atlas Story image and remains absent from
the public Atlas projection.

This bounded account-level release replaces the earlier proposal for one photo
per visited destination. Destination memory editing remains implemented and is
not changed by this media scope.

## Implemented and test verified

- [x] Add an authenticated owner-only `GET`, `POST`, and `DELETE`
      `/v1/me/atlas-image` boundary.
- [x] Accept JPEG, PNG, and WebP inputs up to 10 MiB, reject encoded type
      mismatches and animation, and cap decoded source images at 36 megapixels.
- [x] Use the Cloudflare Images binding to apply orientation, crop to 1200 by
      1200, remove invisible metadata, disable animation, and produce WebP at
      quality 80.
- [x] Reject processed output above 1 MiB or output that is not an exact 1200
      by 1200 WebP.
- [x] Store only the processed derivative in an isolated private R2 binding.
      The original upload is never stored.
- [x] Keep one logical account image. A replacement writes a new immutable R2
      object before a revision guarded Durable Object pointer commit, then
      removes the prior object.
- [x] Roll back the new object when the pointer commit loses a revision race.
- [x] Keep the raw R2 key and source hash out of browser owner state, public
      Atlas state, and public sharing.
- [x] Serve bytes only through the authenticated owner route with private,
      no-store response headers.
- [x] Remove the active image during explicit image removal and before final
      application-account deletion.
- [x] Limit authenticated image transformations to six uploads per account per
      minute in staging.
- [x] Add Share and export UI named `Your favorite travel image` that states
      the square crop, byte limits, export use, and private visibility.
- [x] Draw the processed image on the owner's 1080 by 1920 Atlas Story export.
- [x] Keep signed-out public Atlas Story export unchanged and image free.

## External staging gate

- [x] Create the private
      `roamwithjustin-my-atlas-user-media-staging` R2 bucket with no public
      development URL and no custom domain.
- [x] Deploy the staging Worker with `MY_ATLAS_MEDIA_R2`, `IMAGES`, and
      `MY_ATLAS_IMAGE_RATE_LIMITER` bindings.
- [x] Promote the owner UI through protected develop and main pull requests,
      deploy it through Pages, and verify its exact live bundle markers.
- [ ] Use a disposable authenticated beta account to upload representative
      portrait, landscape, PNG, and WebP samples. Record source dimensions,
      source bytes, output dimensions, output bytes, and metadata inspection.
- [ ] Repeat replacement, stale revision, removal, sign out, public sharing,
      and application-account deletion checks against remote staging.
- [ ] Confirm the Images transformation budget alert and R2 spend alert before
      inviting additional accounts.
- [ ] Complete mobile, keyboard, screen reader, and real-device acceptance.

## Failure behavior

The prior active image remains attached until a transformed replacement is
durable and the account pointer commits. Failed transforms and failed pointer
commits do not replace it. R2 cleanup is attempted after a successful pointer
change. A cleanup failure is logged without exposing an object key or making
the unreferenced private object addressable. A later orphan reconciliation job
remains operational hardening before a broader beta.
