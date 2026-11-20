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
  - src/features/my-atlas/views/MyAtlasPublicView.vue
  - src/views/roam/Privacy.vue
  - workers/my-atlas/src/account/atlas-image.mjs
  - workers/my-atlas/src/account/contracts.mjs
  - workers/my-atlas/src/account/service.mjs
  - workers/my-atlas/src/index.mjs
  - workers/my-atlas/src/public/service.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/wrangler.jsonc
  - workers/my-atlas/test/atlas-image.test.mjs
  - workers/my-atlas/test/account.test.mjs
  - workers/my-atlas/test/public.test.mjs
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
    - Local authenticated Chrome verification with zero visited places showed an explicit empty-state requirement and direct Add a visited place action instead of unexplained disabled sharing and export controls
    - Local browser export verification generated and downloaded a 1080 by 1920 PNG through the Blob URL path; the temporary file was 1,573,212 bytes and was removed after inspection
    - Pull request 184 passed validation run 44619801709 and merged to develop as 92f8cd9b75d69b8996ce12ad427b767e2f466d04; develop validation run 44620185226 then succeeded
    - Pull request 185 passed production validation run 44620479789 and merged to main as 11ff6c6ec5fc4d7c2fae0ea7826fcc7eeec717f0
    - Pages run 44620760737 deployed the production merge, and live chunk 22.5e12852a.js returned 200 with the favorite-image label, export-use explanation, and choose-image action together
    - Local 2026-11-19 verification passed `npm run my-atlas:test`, including 42 Durable Object tests and the public image visibility boundary
    - Local 2026-11-19 verification passed `npm run atlas:test`, `npm run lint`, `npm run docs:audit`, and `npm run build`
    - The local development server compiled the owner visibility control and public profile hero successfully
    - Staging Worker version 1113afaf-4600-4777-b92d-b2eb40e43826 deployed the public image route, explicit visibility mutation, and revised privacy version
    - Remote staging returned 200 health, 204 for the allowed PATCH preflight, and the closed 404 `atlas_image_not_found` response for an unknown public image handle
    - Authenticated visibility mutation and real public profile image acceptance remain externally unverified
---

# My Atlas favorite travel image implementation

The first traveler image release uses one optional favorite travel
image for the whole Atlas. It does not attach images to visited pins. The image
appears in the owner's downloaded Atlas Story image. When the owner explicitly
allows public profile use and publishes the Visited Atlas, it also appears as a
labeled public profile hero and in the signed out Story export.

This bounded account-level release replaces the earlier proposal for one photo
per visited destination. Destination memory editing remains implemented and is
not changed by this media scope.

## Implemented and test verified

- [x] Add authenticated owner-only `GET`, `POST`, `PATCH`, and `DELETE`
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
- [x] Keep the raw R2 key and source hash out of browser owner state and public
      sharing.
- [x] Serve owner bytes through the authenticated route with private,
      no-store response headers.
- [x] Expose an explicitly approved image through
      `GET /v1/public/atlases/{handle}/image` only while the profile is public
      and contains at least one visited place. Recheck those conditions before
      every private R2 read and return `no-store`.
- [x] Remove the active image during explicit image removal and before final
      application-account deletion.
- [x] Limit authenticated image transformations to six uploads per account per
      minute in staging.
- [x] Add Share Visited Atlas UI named `Your favorite travel image` that states
      the square crop, byte limits, export use, and public profile use.
- [x] Add an explicit owner control that can show the image on the public
      profile or keep it private. Legacy image records without that choice stay
      private.
- [x] Draw the processed image on the owner's 1080 by 1920 Atlas Story export.
- [x] Encode the Story canvas asynchronously to a PNG Blob, download it through
      a temporary object URL, and show creating, success, and failure status in
      the owner workflow.
- [x] Explain that at least one visited place is required before sharing or
      exporting, provide a direct Add a visited place action, and keep private
      Saved places and saved trips excluded.
- [x] Present the approved image as a clearly labeled public profile hero with
      a full image dialog.
- [x] Use the same approved image in signed out public Atlas Story export.

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
- [x] Deploy the public image route and explicit visibility mutation to staging
      and verify its health, allowed PATCH preflight, and closed unknown-handle
      response.
- [ ] Verify with a disposable authenticated account that private profiles,
      empty profiles, and images kept private all return the same public not
      found behavior.
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

The processed derivative remains in the private R2 bucket. Public delivery is
not a bucket URL. It is a Worker response that first confirms the active handle,
public profile, nonempty Visited Atlas, and explicit image visibility choice.
Making the profile or image private therefore closes public image delivery
without moving or duplicating the object.
