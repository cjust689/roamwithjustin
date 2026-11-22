---
id: my-atlas-account-state
title: My Atlas Local Profile, Pin, and Sharing State
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-16
updated: 2026-11-22
related:
  - my-atlas-integrated-trip-management-2026-11-21
  - my-atlas-registration
  - my-atlas-api-authentication
  - my-atlas-geography
  - my-atlas-private-beta
  - my-atlas-private-beta-implementation
  - my-atlas-trip-planning
  - my-atlas-trip-planning-implementation
  - my-atlas-trip-planner-ux-routes-flights-lodging
  - my-atlas-trip-planner-phase-0-2026-11-18
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - workers/my-atlas/src/trips/store.mjs
  - workers/my-atlas/src/trips/service.mjs
  - shared/my-atlas-trips.mjs
  - workers/my-atlas/src/trips/preview.mjs
  - src/features/my-atlas/auth/accountDeletion.mjs
  - scripts/test-my-atlas-load-safety.mjs
  - scripts/lib/my-atlas-local-runtime.cjs
  - shared/my-atlas-experiences.mjs
  - src/features/my-atlas/components/MyAtlasExperiences.vue
  - shared/my-atlas-image-location.mjs
  - scripts/test-my-atlas-image-location.mjs
  - shared/my-atlas-instagram.mjs
  - src/features/my-atlas/discovery/directory.mjs
  - src/features/my-atlas/views/MyAtlasExploreView.vue
  - scripts/test-my-atlas-profile-discovery.mjs
  - package.json
  - workers/my-atlas/src/account
  - workers/my-atlas/src/planning
  - workers/my-atlas/src/public
  - workers/my-atlas/src/catalog/projection.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/src/index.mjs
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - src/features/my-atlas/components/MyAtlasTripDestinations.vue
  - src/features/my-atlas/components/MyAtlasActionFeedback.vue
  - src/features/my-atlas/components/MyAtlasRegistrationForm.vue
  - src/features/my-atlas/planning/handoffs.mjs
  - src/features/my-atlas/planning/sharedTrip.mjs
  - src/features/my-atlas/planning/mapProjection.mjs
  - src/features/my-atlas/auth/session.mjs
  - src/features/my-atlas/catalog/atlasInsights.mjs
  - src/features/my-atlas/catalog/memory.mjs
  - src/features/my-atlas/catalog/mapMemory.mjs
  - src/features/my-atlas/catalog/customPlace.mjs
  - src/features/my-atlas/catalog/placeSearchClient.mjs
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/components/MyAtlasPinEditor.vue
  - src/features/my-atlas/components/MyAtlasTutorial.vue
  - src/features/my-atlas/export/storyExport.mjs
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/views/MyAtlasPublicView.vue
  - src/features/my-atlas/views/MyAtlasSharedTripView.vue
  - src/views/roam/Privacy.vue
  - src/features/atlas/views/AtlasView.vue
  - src/features/my-atlas/config/featureFlags.mjs
  - workers/my-atlas/test/account.test.mjs
  - workers/my-atlas/test/planning.test.mjs
  - scripts/test-my-atlas-worker.mjs
  - scripts/test-my-atlas-planning.mjs
  - scripts/test-my-atlas-place-catalog.mjs
verification:
  state: verified
  evidence:
    - Local private experience lifecycle test covers two entries, edit/remove, unchanged memory/dates, idempotent replay, stale revision, owner isolation, public exclusion, export, deletion and no private recap snapshots in mutation receipts
    - npm run build passed all 46 Worker runtime tests for Instagram, Explore freshness and required photo location; local compilation used an uncommitted parallel-false override
    - node scripts/test-my-atlas-profile-discovery.mjs
    - node scripts/test-my-atlas-action-feedback.mjs
    - Pull requests 208 and 209 passed validation runs 44736412417 and 44737017269, merged through protected develop and main as 05eb2a0d8bf42b428f297dded08e61cbf9f11ffa and afd771c5e63d53a24f1a2e234c7ed111f9dbf67c, and develop validation run 44736727554 succeeded
    - Pages run 44737312245 deployed the production merge; a live shared-trip render exposed the read only itinerary and map shell, and chunk 481.a92fe951.js contained the Route key and Saved trip order markers
    - Client planning tests verify that a shared snapshot mounts the existing semantic planner route projection in read only mode while retaining the compact itinerary summary
    - Local Chrome verified the settled shared route camera at desktop and a 390 by 844 CSS pixel recipient layout with a reachable Copy link and zero horizontal overflow
    - Authenticated local Chrome against the staging Worker observed an idempotent wishlist create return HTTP 200 with a complete Wish body and the exposed representation ETag W/"rev-9"; after browser normalization the write completed at revision 9 without an invalid-response state
    - npm run my-atlas:test verifies that browser reads accept strong and weak revision ETags while subsequent mutations continue sending the required strong If-Match value
    - npm run my-atlas:worker:test
    - Workers runtime deletion coverage verifies that completed deletion releases both the identity and handle assignments, preserves exact retry safety, and permits the same identity and handle to register again with a new invitation and user ID
    - Client deletion recovery coverage verifies stale DELETE, authoritative profile revision read, persisted revision replacement, and one retry with the original idempotency key across both the active planner and reload-resume paths
    - Pull request 192 passed validation run 44635828088 and merged to develop as 7ac63d1aeaf497ad144ce2eeec449171f04b3829; develop validation run 44636119731 then succeeded
    - Pull request 193 passed production validation run 44636436895 and merged to main as 08e5d6d2f1bac45a1dd8596ad87ba64581702668
    - Pages run 44636727908 deployed the recovery, and live chunk 129.fea5c713.js contained both the active-click and reload-resume revision callbacks
    - Client planning tests verify recovery from a successful plan mutation with an incomplete response by reading the authoritative revision and saved plan before reporting failure
    - npm run my-atlas:worker:durable:test
    - npm run my-atlas:test verified private planning contracts, direct catalog/custom endpoints, and client-only handoffs
    - npm run my-atlas:test verified favorite-image signature, animation, byte, pixel, square WebP, owner isolation, immutable replacement, private projection, removal, and account-deletion contracts
    - Staging Worker 8fbb0a9e-76bc-4be2-9a53-637be432db5c deployed the private R2, Images, image rate-limit, and November 19 privacy-version configuration; remote health, unauthenticated denial, foreign-origin denial, and allowed preflight checks passed
    - Staging Worker 1113afaf-4600-4777-b92d-b2eb40e43826 deployed explicit favorite-image visibility, gated public image delivery, and the revised privacy version; remote health, PATCH preflight, and closed unknown-handle image checks passed
    - Pull requests 196 and 197 passed validation runs 44657690886 and 44658215573, merged through protected develop and main as 03a188025480129e57156d75243bc70f3a67d229 and d0fba5c3da9d054b36ef6f9d7a070dcdd39f3246, and develop validation run 44657932409 succeeded
    - Pages run 44658409109 deployed the separate sharing workflows and public favorite image presentation; live chunks 371.07c466f0.js and 917.6e99172f.js contained their exact release markers
    - Staging Worker version 242ef647-283c-415d-99d5-493e4be38313 corrected the favorite-image PATCH route gate; a remote unauthenticated PATCH returned 401 instead of the prior 405
    - Pull request 204 passed validation run 44677439710 and merged to develop as 83adc5445d09c0a95128664a9d59e9c5bd31d6cc; develop validation run 44677681228 then succeeded
    - Pull request 205 passed validation run 44677908485 and merged to main as 84c546e078ce2b50097d20b16803ff5200f94182; Pages run 44678154430 succeeded
    - npm run my-atlas:test verified that planner catalog search preserves canonical result coordinates and shared rate-limit error presentation
    - npm run my-atlas:test verified the readable saved-itinerary source contract and revision-conflict recovery copy
    - Local Chrome fixture verification at 1280 and 390 CSS pixels confirmed the compact account menu, overview actions, route-first planner, readiness-gated trip-details dialog, and zero horizontal overflow
    - Local Chrome fixture verification on 2026-11-19 at 1280 and 390 CSS pixels confirmed direct account actions, the Share and export workflow, expanded planner width, natural-height scrolling, and zero horizontal overflow
    - Pull request 137 passed validation run 44347357469 and merged the planner redesign to develop as eecbc6590d47d526a376525c18e1e6399f95bbc2; develop validation run 44347715150 then succeeded
    - Pull request 138 reused that successful validation and merged to main as 61e5542885238c5816f5289a93c3bc20af2481ec
    - Pages run 44348107246 built and deployed the production merge successfully
    - Live content-addressed chunk 417.972f66bc.js returned 200 and contained the readable itinerary, ephemeral route-mode controls, and saved-plan refresh recovery markers together
    - Pull requests 153 and 154 passed validation runs 44401070493 and 44401842472, merged through protected develop and main, and develop validation run 44401457014 succeeded
    - Pages run 44402230386 deployed main merge 5f6c64d37074ea547c3dd75215dab6bb6fd63706; live chunk 571.b9f0d996.js returned 200 with the new stale-save recovery, unavailable-catalog, and Plan a trip markers together
    - Pull requests 141 and 142 passed validation runs 44358088143 and 44358862563, merged through protected develop and main, and Pages run 44359227708 deployed main merge 01c8a83e54b14f4cec3a47ac26b82b9804dad62f
    - Live content-addressed chunks 944.dfa848dd.js and 327.9488c543.js returned 200 and together contained the direct trip action, save-requirement, private map-overlay, and restored-trip heading markers
    - Pull request 113 passed validation run 44157428344 and merged the Poppins-only typography cleanup to develop as d12bf24b8b7e02a950811c9d91b3020948c5d0a8; develop validation run 44157761385 then succeeded
    - Pull request 114 passed production validation run 44158190178 and merged to main as d6af82bddfaf8bb4e0f4ac61caeade6697c46982
    - Pages run 44158579421 deployed the typography cleanup, and a live audit found Poppins plus zero Russo One matches across 32 discoverable content-addressed CSS and JavaScript assets
    - Protected pull requests 105 and 106 plus Pages run 44144353792 deployed the planner search, direct endpoint, and collapsible owner-flow release; live chunk 216.0c437c4d.js contained all release markers together
    - Workers-runtime planning tests verified private wishlist isolation, immutable wishlist/direct plan snapshots, controlled-clock retention and plan-only expiry, and permanent application-account deletion
    - Workers-runtime tests verified revision conflicts under concurrent writes, idempotent retries, duplicate prevention, and the 300-pin ceiling
    - Workers-runtime planning tests verified that deleting an already-absent owner Wish is an idempotent no-op that returns the current revision instead of a stale not-found failure
    - Staging Worker version 2b35b3f4-8c5e-42de-b37e-93b83aa1291d deployed the idempotent absent-Wish deletion behavior
    - Pull requests 145 and 146 promoted the absent-Wish and bounded-search release through protected develop and main as 3443d1a010830ab33d3e029eceafa7bd91a83f61 and 1758fea1681ff72ec0e9423f2a06f4fb07d5e13b
    - Pages run 44369566126 succeeded, and live chunk 885.9c3d6805.js returned 200 with the four-character browser search boundary
    - Workers-runtime tests verified pagination, pin update and deletion, JSON export, publication gating, and automatic privacy for an empty profile
    - A two-account Workers-runtime test verified distinct pin IDs and isolated reads, exports, updates, and deletes even when both owners pin the same canonical Place
    - Workers-runtime tests verified private-by-default public lookup, safe-field projection, explicit publication, and immediate unpublication
    - Workers-runtime tests verified that a spot persists only through its authenticated owner's object and projects only its safe canonical spot fields
    - npm run my-atlas:test verified optional month and year dates, legacy year compatibility, session restoration, statistics, filtering, ordered destination playback, cumulative reveal, and curved connection generation
    - Headless Chrome verified exact desktop year-editor alignment and cinematic playback at 1248 by 598 and 390 by 844 without horizontal overflow
    - Headless Chrome verified that a selected search result opens its destination editor directly below the search control and before the result list at desktop and 390 pixel mobile widths
    - Headless Chrome verified the feature-gated My Atlas Atlas-toolbar action at 320, 390, and 1280 pixel widths, with no horizontal overflow, navigation to /my-atlas, and Back navigation to the root Atlas
    - Headless Chrome verified collapsed owner and public map-control drawers, hidden MapLibre desktop controls, full-width native year selectors, and zero horizontal overflow at 390 pixels while preserving expanded desktop controls
    - Local headless Chrome on 2026-11-19 verified the official MapTiler SDK canvas and terrain control in Atlas and My Atlas, hidden desktop-only controls and zero horizontal overflow at 390 by 844, and one shared mtsid across all observed chargeable tile requests
    - Headless Chrome verified that My Atlas attribution begins as a compact info button and expands on activation without removing provider attribution
    - Headless Chrome verified the four-step pre-account walkthrough and first-account quick start at 390 pixel mobile and 1200 pixel desktop widths, including completion targets, persistent dismissal, and no horizontal overflow
    - Headless Chrome verified that overview pins use screen-distance clusters, cluster activation expands nearby destinations into standalone pins, and timeline marker anchors remain within one pixel of their projected coordinates at desktop and 390 pixel mobile widths
    - Pull requests 55 and 56, their required validation gates, develop workflow 43987307324, and Pages workflow 43987868552 succeeded
    - Live content-addressed production chunks returned 200 and contained the timeline copy, plane marker styles, Add year control, and exact 2.9rem alignment rule
    - Staging Worker c1923a3b-2a8f-47a8-acd0-cf033ea49790 returned 200 health and exposed ETag and X-Request-Id to the allowed localhost origin
    - Staging Worker e20404c5-0250-47f0-88af-2d0db14983ee returned 200 health and resolved a canonical spot after the verified manifest switch
    - Owner reported that the Uvita pin persisted through reload and a new sign in before the save-response correction was deployed
    - API client tests preserve the Worker request ID on rejected authenticated requests
    - API client tests retry an authenticated GET once after a browser network rejection and prove mutation requests still make only one attempt
    - Pull requests 133 and 134 passed their required validation checks, develop validation run 44316716233 passed, and Pages run 44317427615 deployed main merge d799e961b6aedcfd2e3dfbe4224446350ab482c9
    - Live chunk 894.461d6b6a.js returned 200 and its compiled API client used two attempts only for GET while retaining one attempt for every mutation
    - Worker routing tests prove that owner state bootstrap bypasses the public catalog and shared Atlas limiter
    - Headless Chrome at 390 pixels verified in-place recovery from a simulated catalog 429 without reloading or losing the signed-in screen
    - Pull requests 77 and 78 passed their required validation gates; Pages workflow 44014283401 deployed main merge 7c2b1a9135ce45a834bf7aadda869460452e55de
    - Staging Worker f039455e-35bf-4c9d-bd15-c03716e63f72 returned 200 health after the owner-bypass and scoped-public-limiter deployment
    - The live content-addressed My Atlas chunk returned 200 and contained Retry saved Atlas, Retry search, rate-limit, and API-session-renewal messages
    - Favorite-memory contract tests passed Unicode normalization, whitespace folding, 255-code-point and 1,020-byte ceilings, markup and invisible-control rejection, unsafe-storage fail-closed behavior, owner isolation, public projection, and CSV formula neutralization
    - Twenty-two Workers-runtime tests passed after favorite-memory persistence, update, export, sharing, direct-object validation, and corrupt-public-state coverage were added
    - Headless Chrome at 390 pixels verified the 255-character editor boundary, blocked markup, normalized line breaks, escaped list and selected-place rendering, successful local save, and zero horizontal overflow
    - Map-memory contract tests verified hidden-by-default, selected-pin, show-all, and empty-memory behavior
    - Headless Chrome verified selected-pin memory callouts and the optional all-memory map layer at desktop and 390 pixel mobile widths
    - Headless Chrome verified the compact two-column public profile identity header at 390 pixels with the place count occupying the former empty right side and no horizontal overflow
    - Pull requests 95 and 96 passed required validation, merged through protected develop and main, and Pages workflow 44043262797 deployed main merge 2dc4133eb63f98c702dd3cd0b6951952853006f8
    - Live content-addressed chunks 101.d8bb49a5.js and 101.8bcf6225.css returned 200 with the memory controls, pin callout rules, and compact mobile profile grid
    - Pull requests 82 and 83 promoted the favorite-memory implementation through protected develop and main after validation runs 44018100141, 44018321716, 44018838662, and 44018845869 passed
    - History-only pull request 84 synchronized main into develop without file changes after validation run 44018666432 passed
    - Staging Worker 2fbce736-0799-4235-a7b5-018727e39b64 returned 200 health after the favorite-memory contract deployed
    - Pages workflow 44019105927 deployed main merge ea1af7cb5c66301d13bf206f084fbe135fa69097
    - Live content-addressed My Atlas chunks 239.39312812 and 229.528c3c46 returned 200 and contained the Favorite memory editor, Save destination action, and explicit public-sharing disclosure
    - Twenty-four Workers-runtime tests passed after custom-pin persistence, owner-state projection, public projection, catalog bypass, and corrupt-state coverage were added
    - Browser and Worker tests passed strict custom-name and coordinate validation, server-generated custom IDs, normalized API responses, and formula-safe custom CSV fields
    - Headless Chrome at 390 pixels verified the authenticated custom-pin form, map placement event, rendered placement marker, shared date and memory editor, and zero horizontal overflow
    - Pull requests 87 and 88 passed required validation, merged through protected develop and main, and Pages workflow 44025229521 deployed main merge c54ea44490c05014698ffb2a0cfbcdd076ee12c4
    - Staging Worker version 9fa931b5-f32f-4df2-a84e-8a0516f83951 returned 200 health with the backward-compatible custom-pin API
    - Staging Worker version e7538fcf-b117-4905-9c0e-f8383f3f1bcd returned 200 health with the production origin, rejected unauthenticated owner reads and deletion with 401, and rejected a foreign origin with 403 after the planning, retention, and account-deletion API deployed
    - Thirty Workers-runtime tests passed after multi-destination planning, controlled-clock retention, and permanent application-account deletion coverage
    - Pull requests 101 and 102 passed required validation and promoted the planning frontend through protected develop and main; Pages run 44128602408 deployed main merge 8add555205dcd23314c0e11e1f0a2b4d1038fd54
    - Live content-addressed bundles contained the final My Atlas privacy and retention notice, ordered-plan UI, segmented Maps links, and account-deletion control
    - Direct /privacy and /my-atlas requests still return the GitHub Pages application fallback with HTTP 404, so a direct-route 200 response is not claimed
    - Live content-addressed chunks 102.9bc646f9.js, 850.f2e2b9be.js, and 102.fa12fe12.css returned 200 with the custom-pin prompt, map event, disclosure, and placement styles
---

# My Atlas local profile, pin, and sharing state

## Optional Instagram profile link

Owners can save `instagramHandle` through the existing revision-checked,
idempotent `PATCH /v1/me` profile endpoint. The shared local contract accepts
an optional leading @, lowercases the handle, bounds it to 30 ASCII letters,
numbers, underscores and periods, and rejects URLs, empty @ input and invalid
punctuation. Blank input removes the link. The Durable Object separately
requires canonical normalized input before storage. This is an optional
profile field, so existing profiles require no migration.

Owner profile responses and private account export retain the handle. A safe
public profile includes it only through the existing active/public/nonempty
Atlas gate. Making the Atlas private hides the whole public profile; removing
the Instagram handle removes the public link. Discovery cards do not gain
Instagram metadata. The URL builder uses only `https://www.instagram.com/`
plus a validated handle. Public links use a new tab, `noopener noreferrer`
and a no-referrer policy. No provider SDK, login, scraping, account verification,
tracking event or API integration is introduced. The owner edits the value
under Share/export's Profile links disclosure, with an explicit publication
notice. A handle is an owner-provided link, not proof of Instagram ownership.

## Explore image freshness

The directory reads live per-owner summaries on each request; there is no
separate discovery resync job. Favorite image replacement, removal and public
image permission changes already update the public activity timestamp.
Uploading or replacing an image still starts it private, even on a public
Atlas. Public profile use must be enabled explicitly for that image.

Explore offers Refresh Atlases and refreshes when a loaded page returns to a
visible/focused tab. The focus/visibility events are coalesced with a one-second
guard; there is no interval polling. A refresh rereads the current loaded
window from a fresh first page and replaces it atomically, reconciling changes
and removing profiles no longer present. Failed refreshes retain the current
cards and offer retry. Loading more also replaces duplicate handles with fresh
metadata instead of skipping updates.

Image elements are keyed by handle, image ID and image update time. This
recreates the element on replacement without adding query parameters to the
strict image endpoint. Error fallbacks are scoped to the image version, and a
successful refresh clears those failures to retry loading. Public directory
and image responses remain no-store. The beta directory still scans bounded
active registrations for each page; this change adds no background poller or
new discovery index.

Uploaded favorite photos disable native image context menus and dragging in
the owner preview, public profile hero/full-image dialog and Explore cards.
The handlers are attached directly to these four image elements, with no
sitewide or provider-image interception. This is a casual-saving deterrent,
not access control; image delivery gates, full-image viewing and explicit
Atlas Story exports retain their existing contracts.

Owner action feedback is presented by `MyAtlasActionFeedback.vue`, fixed to
the viewport outside the scrolling owner panel. Planner actions emit
`action-feedback` events to the owner view. Start/finish, stop order and
removal confirmations explicitly describe draft edits that require saving;
API acknowledgements appear only after the write response. Busy and failure
states are distinct, and a confirmed write with failed companion refresh
remains a saved-change warning. Visited-place saves use the same component.
This adds no persistence or automatic trip lifecycle transition. The
trip-centric transition document records the still-unimplemented canonical
trip, reversible Planned/Past, occurrence-memory and migration requirements.

Phase 2B has an owner-state API on the same isolated Worker and per-user SQLite
Durable Object. Phase 2C adds an opt-in public projection, a signed-out handle
route, and browser owner controls. The planning slice adds application-account
deletion, private wishlist records, one future plan, retention alarms, and
browser-only external handoffs. Its backward-compatible API is deployed on the
isolated staging Worker, and its feature-gated frontend is deployed through
GitHub Pages. Authenticated owner and real-device acceptance still gate broader
invitations.

## Owner authorization

Every account request begins with the Phase 2A access-token verifier. The
qualified issuer and subject are hashed, then resolved through the authoritative
registration registry to an active internal user ID. The browser cannot choose
a user ID. The per-user object checks the same qualified identity digest before
reading or changing state.

Read routes require `read:my-atlas`. Mutations additionally require
`write:my-atlas`:

- `GET /v1/me` reads the private owner profile;
- `GET /v1/me/atlas` returns the owner profile and resolved pins in one bounded
  browser bootstrap response;
- `GET|POST|PATCH|DELETE /v1/me/atlas-image` privately reads, replaces, changes
  public profile use, or removes the owner's single favorite travel image;
- `PATCH /v1/me` changes display name or visibility;
- `GET /v1/me/pins` returns at most 100 stored pins and a stable cursor;
- `POST /v1/me/pins` creates one catalog pin or one owner-created custom pin;
- `PATCH /v1/me/pins/{pinId}` changes its place or optional visit dates;
- `DELETE /v1/me/pins/{pinId}` removes it;
- `GET|POST /v1/me/bucket-list` pages or creates private wishlist entries;
- `PATCH|DELETE /v1/me/bucket-list/{wishId}` edits or removes one entry;
- `GET /v1/me/planning` returns wishlist and saved-plan state from one atomic
  owner snapshot;
- `GET|POST /v1/me/trip-plans` reads or creates the single beta plan;
- `PATCH|DELETE /v1/me/trip-plans/{planId}` replaces or removes that plan;
- `POST /v1/me/trip-plans/{planId}/keep` explicitly refreshes retention;
- `GET /v1/me/export?format=json|csv` exports owner state; and
- `DELETE /v1/me` permanently removes application-owned account data after
  explicit confirmation.

No owner route accepts a user ID, handle, email, or subject. Even a guessed pin
ID is resolved only inside the Durable Object selected from the caller's own
registry assignment. A second active owner can pin the same Place but receives
a distinct owner-qualified pin ID and cannot read, update, export, or delete the
first owner's pin. An unregistered verified identity resolves to no account.

The account-route method gate explicitly admits all four implemented
favorite-image methods. A boundary regression test sends an authenticated
`PATCH /v1/me/atlas-image`, proves it reaches the visibility service with the
normalized revision and idempotency key, and retains HTTP 405 for unsupported
methods.

Owner routes do not pass through the public catalog and shared Atlas weighted
limiter. A public search 429 therefore cannot directly prevent
`GET /v1/me/atlas` from loading. The browser preserves a rejected API request's
request ID and distinguishes a session renewal problem, transient account or
identity service failure, and connectivity failure. A transient owner
bootstrap failure exposes `Retry saved Atlas` without requiring a page reload.

Handle mutation and abuse reporting are not part of this slice. Permanent
application-account deletion is implemented, test verified, and deployed to
isolated staging. It has not been exercised against a real disposable staging
account and must not be tested by deleting the owner's existing account.

## Revisions and safe retries

The profile owns one monotonically increasing revision covering profile, pin,
wishlist, and plan state. Every client mutation requires a strong
`If-Match: "rev-N"` header and a UUID
`Idempotency-Key`. The user object serializes each mutation, checks the revision,
and increments it exactly once. A retry with the same qualified identity,
action, key, expected revision, and normalized payload returns the stored result.
A changed request under that operation conflicts. Competing writes against the
same revision produce one success and one revision conflict.

Retention alarms are internal object events rather than client requests. They
atomically recheck the stored deadline and advance this same revision when they
mark or delete a plan. Reads, exports, map handoffs, prompt copies, and passive
login do not advance retention.

The Worker emits the current revision as a strong ETag. An intermediary may
expose that representation validator to the browser as either `"rev-N"` or
`W/"rev-N"`. The browser accepts both forms only to recover the monotonic
revision number. Every mutation still sends the required strong
`If-Match: "rev-N"` value. Stale mutations return HTTP 412 without changing
state. Allowed browser origins can read `ETag` and `X-Request-Id` through
`Access-Control-Expose-Headers`. This is required for the browser to accept the
new revision after a successful cross-origin write. Browser revision state is
monotonic. A planning read that began before a pin or profile write cannot
replace a newer revision after it finishes. The primary planning read now
returns wishlist and plan records from the same Durable Object snapshot and one
ETag. The older two-request reader remains only as a temporary fallback while a
frontend and Worker deployment overlap. After an HTTP 412, the planner reads
the authoritative owner profile revision from `GET /v1/me` and retries the
intended mutation once. A second conflict is not replayed.

## Pin state

Pins store only:

- a stable internal pin ID;
- either a canonical `iso-country:XX` or `geonames:N` place ID, or a
  server-generated owner custom-place ID;
- for a custom pin only, its normalized owner-supplied name and coordinates;
- a sorted, unique optional list of visit dates, each with a year and optional
  month;
- a derived visited-year list retained for compatibility with schema version 1
  clients and pins;
- one optional favorite memory stored directly on that owner's pin;
- creation and update timestamps.

Pins may remain undated. The object maintains a place index to reject duplicate
destinations and a profile pin count enforcing the 300-pin beta ceiling. A
profile cannot become public while empty. Deleting its last pin atomically
makes it private.

Favorite memory is one optional plain-text value per pin, not an independently
addressable child record. The request boundary normalizes Unicode to NFC,
folds whitespace to one line, and permits at most 255 Unicode code points and
1,020 UTF-8 bytes. It rejects markup delimiters, unpaired surrogates, control
characters, bidirectional overrides, selected invisible formatting characters,
and Unicode noncharacters. The Durable Object independently requires the
already normalized value so an internal caller cannot bypass the HTTP contract.
Legacy pins without the field project an empty memory and require no migration.

The owner interface exposes Add memory or Edit memory from both the selected
destination card and each visited destination row. Memory mode reuses the
existing pin patch, preserves the stored visit dates, hides date editing, and
keeps explicit Close and Save memory actions. It does not add a second memory
record or mutation route.

Visited pins do not store image references. One optional account-level favorite
travel image is stored separately from pins, wishlist entries, and plans. Owner
state exposes only safe image metadata and whether public profile use was
approved. The raw R2 key and source digest remain inside the Worker and Durable
Object boundary.

The browser accepts JPEG, PNG, or WebP input up to 10 MiB. The Worker verifies
the encoded type and animation boundary, uses Cloudflare Images to enforce a
36 megapixel decoded ceiling, applies orientation, removes invisible metadata,
crops to 1200 by 1200, and writes only a WebP derivative no larger than 1 MiB.
The original upload is not stored. Staging limits image transformations to six
per authenticated account per minute.

Replacement uses a new immutable R2 key. The new derivative is durable before
the account-global revision and idempotency guarded image pointer commits. A
failed pointer commit removes the candidate and leaves the prior image active.
After a successful commit, the Worker removes the superseded object. Explicit
image removal clears the pointer before object cleanup. Account deletion removes
the active object before the Durable Object is finalized. The bucket has no
public route, development URL, or direct browser access.

New uploads begin private. An owner can explicitly allow public profile use
through the revision guarded image mutation. Legacy image records without the
field are also treated as private, so an image uploaded under the earlier
private wording is never exposed silently.

Pin IDs are deterministically derived from the internal user ID and stored
place ID at creation. A custom place ID is first deterministically derived from
that internal user ID plus the normalized custom name and coordinates. An
exact repeat is rejected by the owner's destination index, while another owner
receives a different ID for the same input. The client cannot choose either ID.
Replacing a catalog pin's place preserves its pin ID while moving the
uniqueness index.

The canonical place may be a country, city, or reviewed spot. A spot does not
create a second ownership model or mutation route. It is resolved through the
same authoritative catalog and stored inside the same caller-derived per-user
Durable Object as every other pin.

A custom pin uses that same owner-qualified object, revision, 300-pin ceiling,
date, memory, export, delete, and sharing lifecycle. It is not resolvable by
another user's object and never becomes a shared catalog choice. Version 1
does not update a stored custom name or position. The owner can edit its dates
and memory, or delete and recreate it to relocate or rename it.

## Private wishlist and plan state

The new [trip centric transition](../implementation/my-atlas-trip-centric-transition.md)
defines the next persistence target. The contracts below remain the deployed
legacy behavior, not evidence of a canonical planned/past trip implementation.
Flights and rental cars now have independent browser-only reviewed search
drafts. They do not modify endpoints or stored stops and are not saved yet.

Wishlist data uses `wish:` records and a separate uniqueness index inside the
same owner object. It does not reuse visited `pin:` records and does not enter
the public projection. Each record stores an owner-qualified ID, a canonical
place ID or existing normalized custom-place shape, optional normalized note,
priority, optional desired year, and timestamps. The beta ceiling is 250, and
list responses page at no more than 100 records.

Wishlist reads re-resolve canonical IDs for current display details. If one
stored ID is absent from the active catalog, the owner still receives that
private record as an explicitly unavailable destination with its editable
planning metadata. This keeps the record removable instead of failing the
whole planner. Unavailable records cannot be selected for a new or replaced
plan, so an unresolved place never becomes a route snapshot.

The planner owns an independent country, city, and reviewed-spot search control
that calls the same public My Atlas catalog endpoint as visited-place search.
Selecting a result can create a wishlist record from its canonical `placeId`,
assign that catalog record directly as the plan start or selected finish, or
add it to the ordered trip draft. Adding a trip stop creates or reuses the
private Wish required by the version 1 plan contract, then immediately appends
the returned Wish ID to the local ordered draft. Saving only to the wishlist
remains a separate action. The planner displays the catalog latitude and
longitude before any action and again on the saved wishlist entry. Manual name
and coordinate entry remains a separate custom-place fallback that supports the
same save, trip-stop, start, and finish choices.

Wishlist creation is idempotent by owner and Place as well as by an exact
operation retry. If a repeated create targets a Place already in that owner's
bucket list, the Durable Object returns the existing Wish without changing the
revision or count, even when the no-op retry carries the pre-save revision. It
never creates a second record. The browser incorporates
the returned Wish before requesting refreshed planning state, so a successful
write followed by a transient refresh failure still disables the repeated Save
action and accurately reports that the change was saved. Safe duplicate,
catalog availability, and wishlist-limit conflicts have specific public error
codes and recovery copy; internal consistency failures remain generic.

Wishlist deletion is also outcome-idempotent inside the authenticated owner's
Durable Object. If a refreshed or retried interface asks to remove a Wish that
is already absent, the object returns the current profile revision without
changing state. Existing Wishes still require the supplied account revision,
so this reconciliation path does not weaken concurrent-write protection.

The browser keeps an unsaved direct start or finish selection while the owner
saves the first wishlist destination, and it presents that selection immediately
even when the ordered-destination list is still empty. A mutation response and
the follow-up state refresh are treated as separate outcomes. Once a write has
returned a valid revision, a transient refresh failure is reported as a saved
change that needs Refresh, never as a rejected write. Auth scope, session,
configuration, catalog, revision, and invalid-response errors retain the safe
Worker request reference and present recovery guidance without exposing account
data.

The browser eagerly reads wishlist and saved-plan state when the authenticated
planner mounts. Its collapsed heading names the current saved plan when one
exists. Opening the planner switches the existing MapTiler SDK instance from the
visited Atlas projection to a private in-memory route projection. That
projection shows a distinct start, ordered stop numbers, and finish, combines
roles that share one coordinate, fits the camera to the draft, and draws
schematic connections only. The parent map projection receives only display
geography and coordinates, not private Wish notes, IDs, or timestamps. Closing
or destroying the planner restores the visited projection. Draft route data
never enters the public pin projection, analytics, or storage before an
explicit plan save.

A successful plan create, replacement, or Keep response immediately becomes
the browser's last confirmed plan snapshot before the atomic planning refresh
begins. If that refresh fails, the browser retains and displays the confirmed
snapshot. A successful delete response clears the local plan immediately, so a
failed refresh cannot resurrect a deleted snapshot. This fallback changes no
stored state and never substitutes for the Worker's revision checks.

The compatibility reader still presents wishlist and saved-trip reads as
separate availability domains when it is used against an older Worker. If its
bucket-list pages load but the companion saved-trip request fails, the browser
retains the destinations and safe request reference. The atomic endpoint is the
normal path and does not combine records from different revisions.

One `plan:` record may exist in the first slice. It stores title, lifecycle
status, optional year and note, a start snapshot, an ordered destination list,
and last-stop, return-to-start, or selected-end completion. Start and selected
end accept exactly one saved-wish, canonical-place, or custom-place selector.
The service re-resolves canonical IDs, qualifies custom IDs to the owner, and
stores immutable snapshots without creating wishlist records. A defensive
ceiling of 50 destinations bounds request and storage abuse without presenting
a small product limit. A
snapshot copies the catalog/custom identity, product type, readable geography,
coordinates, route readiness, catalog revision when applicable, and optional
source wish ID. Rendering and export never require the source wishlist record,
so editing or removing a wish cannot rewrite or break an existing plan.

Plan status is `draft`, `saved`, or `archived`. None proves travel. The separate
owner-confirmed Mark Visited action accepts selected stop indexes from the
current immutable plan snapshot. Each selection may add an optional year,
month, and favorite memory. `POST /v1/me/trip-plans/{planId}/visited` requires
write permission, the current strong revision, and a UUID idempotency key. The
service revalidates canonical places, derives owner-scoped deterministic pin
IDs, and sends one bounded batch to the owner's Durable Object. The object
rechecks the current plan and stop indexes, rejects duplicate places or pin ID
collisions, and creates every selected pin in one transaction with one profile
revision. It does not edit or remove the plan or wishlist. An exact retry is
idempotent. When sharing is already public, the new pins enter the existing
public projection only after the owner confirms the browser review action.

The plan stores `retentionConfirmedAt` and its six-calendar-month expiry. An
explicit create, replace, or Keep refreshes it. At expiry the per-owner alarm
marks the record `deletion-pending` and schedules its 30-day `deleteAfter`.
Grace expiry deletes the plan and its snapshots only. Wishlist entries and
visited pins remain. The alarm is scheduled when a plan is created, edited, or
kept, so abandoned accounts do not depend on a later login for cleanup.

The browser constructs external handoffs from saved snapshots. Google Maps
URLs use `api=1`, preserve order, use no API key, split longer plans into
continuous legs with no more than three intermediary waypoints per link, and
reject output over 2,048 characters. Country and
spot centroids require an entrance or custom coordinate before handoff. Custom
coordinates require explicit confirmation. AI prompt generation includes
readable geography only by default and adds coordinates only after a per-copy
opt-in. Neither handoff calls a platform-owned model or paid route API.

The directions presentation can include or exclude saved route points without
changing the saved plan. Drive, Transit, Walk, and Bike are supported as a
visible default and as adjacent-pair overrides. Consecutive pairs with the same
Maps-compatible mode form one route group before conservative segmentation.
Fly and Ferry end a Maps group and render as separate boundaries without a
provider link. One retained physical point creates a readable Maps place
search, while zero points create no action. Adjacent duplicate physical points
collapse so a start and finish at the same place do not create a zero-distance
route. Newly adjacent points use the visible default and cannot inherit an
unrelated old override. These preferences and generated actions are component
memory only: they produce no account write and do not refresh plan retention.

## Permanent application-account deletion

The owner sharing section now exposes Download private account data and an
expandable Delete My Atlas account control directly below the public/private
sharing actions. These account actions are no longer nested inside the trip
planner. Deletion retains the exact typed confirmation, final confirmation,
saved operation key, bounded revision recovery, and reload recovery behavior.

`DELETE /v1/me` requires the verified owner, write permission, a strong current
revision, a UUID idempotency key, and the exact confirmation phrase. The user
object first becomes private and `deleting`. The registry then removes its
active identity and handle assignments, and the user object erases profile,
pins, wishlist, plans, indexes, mutation history, and policy acceptance state.
A minimal operation tombstone supports an exact retry after a cross-object
partial failure. It retains no handle, profile, content, or qualified identity.
The local safety correction removes automatic deletion recovery from account
loading. Reload, HMR and sign-in only fetch the account. The old unscoped v1
browser operation is discarded without issuing a DELETE. A manually confirmed
deletion can retain its revision and idempotency key under a v2 session key
scoped to API origin, account ID and account creation time. Explicit retry can
recover a 412 once, provided the fetched account ID still matches. The browser
sends the selected account ID in the deletion body; the Worker rejects another
account generation. Server retry resolution checks an existing operation
tombstone before the identity's current registration, so replaying an old
deletion cannot target a newly registered account. Legacy callers without an
account ID remain compatible, with tombstone-first replay protection.
The released handle can be registered again through the ordinary invitation
flow. Public lookup returns the generic 404 response after deletion.
This operation does not delete the upstream Google or Auth0 identity.

Normal `npm run my-atlas:serve` and `npm run serve` preserve the configured API
and catalog endpoints. They do not select a separate local account store or
prepare local registration. The explicit `--my-atlas-local-api` launcher flag
selects the loopback API/search servers and prints their existing absolute
persistence path, `workers/my-atlas/.wrangler/state`. That isolated API still
requires local catalog provisioning before catalog-backed saves can work.
Local and staging accounts are separate. Cloudflare tests use an isolated runtime with development
registry discovery disabled; test reset/wipe fixtures do not call the running
local account API. A controlled 48-test run left a logical fingerprint of the
current local Durable Object database unchanged.

The repository command `npm run my-atlas:account:wipe` is a guarded local
development convenience around this same owner endpoint. It requires the owner's
access token, reads the current profile, verifies the exact `--handle`, and is
a dry run unless `--apply` plus the account specific confirmation are present.
Loopback is the default. A remote HTTPS API requires `--allow-remote`. The
command has no route, binding, or code path to the curated Roam With Justin
Atlas, repository travel records, Google account, or Auth0 identity.

Global mode uses `--all` and requires an `admin:my-atlas` access token. Its
protected `POST /v1/admin/accounts/wipe` endpoint previews all active handles
with `apply: false`. Applying requires `WIPE ALL USER MY ATLAS ACCOUNTS` and
deletes one account per request through the same permanent deletion service.
The CLI repeats until no active accounts remain in the selected environment.
Pause registration while resetting an environment because new accounts can
otherwise join the run. Pending registrations and invitation definitions are
not reset. The registry retains an internal task with the original identity,
revision, and operation key until that account is erased, permitting recovery
after cross-object interruption. Completing the task removes its identity.
Only a definitive revision conflict releases the task for a fresh revision.
The global endpoint and command are locally tested and not deployed.

## Catalog boundary

Format validation is not geographic validation. Before a create or place-change
mutation reaches the user object, the service requires the authoritative
versioned Worker catalog to return that exact nondeprecated place ID with usable
coordinates. The indexed resolver and public search API are implemented and
test verified. The default local Worker has no catalog R2 binding. The named
staging environment now resolves its provisioned private catalog, with live
Uvita and Salt Lake City searches confirm manifest and shard reads. The owner
reported that Uvita persisted even though the earlier browser build displayed a
false failure after the successful write. Staging Worker
`e20404c5-0250-47f0-88af-2d0db14983ee` retains the revision ETag behavior and
adds spot-aware catalog validation and projection. A second owner write after
the original ETag correction remains external verification.

Custom creation is the explicit exception to catalog authority. It requires a
strict owner-input object instead of a place ID. The HTTP contract and Durable
Object independently require the normalized name and coordinate shape. The
service projects custom pins without calling catalog resolution and fails
closed when stored custom fields do not match their `custom:` ID type. No
country, region, feature kind, or other geography is inferred from coordinates.

## Export, sharing, and privacy boundary

JSON export schema 2 includes the safe profile projection, all pins, private
wishlist records, immutable plan snapshots, and plan retention fields. CSV export
contains pin ID, stored place ID, optional custom name and coordinates, visited
years, normalized optional visit dates, and favorite memory. Formula-leading
cells are apostrophe-neutralized before CSV quoting. Neither format
contains Auth0 subjects, qualified identity digests, access tokens, invitation
data, or Durable Object operation records. Export is passive and does not
refresh plan retention.

The authenticated owner screen restores an existing Auth0 session with
`checkSession`, loads saved state, persists pin additions, date changes, and
removals through revisioned mutations, changes visibility, and exposes a
copyable `/my-atlas/{handle}` link only while the profile is public. Access
tokens remain memory only. Authenticated GET requests receive one immediate
retry when the browser rejects the network request before any HTTP response.
Mutation network failures are never automatically replayed. An explicit HTTP
412 is different because the Worker confirms that no write occurred. For that
response only, the browser refreshes authoritative account state and retries
the intended write once with the newer revision. The signed-out Vue
view reads `GET /v1/public/atlases/{handle}`. The registry resolves only active
handles, and the user object returns a deliberately smaller projection containing
the handle, display name, safe visited-place projections, coordinates, optional visit dates,
derived visited years for compatibility, and nonempty favorite memories.
Memory is included only after the owner explicitly publishes the whole Atlas.
Vue renders it through text interpolation rather than HTML insertion. The
public service fails closed if stored memory no longer satisfies the contract.
It also fails closed when a stored custom name or position no longer satisfies
the custom-place contract. Custom fields enter this projection only after the
owner explicitly publishes the whole Atlas.
The public object scan is restricted to `pin:` keys. Wishlist entries, plan
snapshots, private notes, desired years, future dates, and retention metadata
cannot enter that response even when the visited Atlas is public.
Internal user IDs, pin IDs, qualified identities, invitations, accepted-policy
records, timestamps, and mutation history do not enter that response.

The public Atlas projection includes safe favorite image metadata only when the
owner explicitly allows public profile use. The image bytes remain in private
R2 and are delivered through `GET /v1/public/atlases/{handle}/image`. That route
resolves the active handle and rechecks the public profile, nonempty pin set,
and image visibility choice before reading R2. It never exposes the storage key
or source digest. The profile hero identifies the image as `Favorite travel
image` and offers a full image dialog.

Public profile access and directory discovery remain separate backend fields.
A profile starts with both `public` and `discoverable` false. The current owner
UI updates both through one explicit Explore listing choice, while legacy
public-but-unlisted profiles are preserved until the owner changes them. The
Durable Object rejects discovery unless the resulting profile is public and
has publishable geography. Unpublishing or removing
the final pin atomically clears discovery.

`GET /v1/public/atlases` returns only active profiles that are both public and
discoverable. Its safe cards contain the handle, display name, visited place
count, a coarse recent activity flag, and favorite image metadata only when
public image use is also approved. The endpoint never returns user IDs, exact
activity timestamps, identities, private plans, wishlist entries, or image
storage keys. Public Atlas activity within the prior 24 hours ranks first.
Private wishlist and planning changes do not affect this signal. Older profiles
remain in a stable daily rotation. An opaque cursor appends up to 24 results at
a time, and the browser de-duplicates handles while loading more results.

The beta implementation scans at most 1,000 active registrations and asks each
user object for a safe discovery summary before ranking. It fails closed rather
than serving a partial directory if that ceiling is exceeded. A dedicated
privacy preserving discovery index is required before the account population
approaches that ceiling.

Private, absent, and inactive profiles share the same public 404 behavior.
Public responses are `no-store`, and the client adds `noindex, nofollow` while a
shared Atlas is mounted. This is public-link behavior, not a secret-link access
control. Removing the final pin still makes the profile private atomically.

The local public viewer and Explore Atlases directory are client rendered.
Profile-specific server HTML, Open Graph tags, crawler status behavior, and
production routing are not implemented.

## Browser presentation

The owner route shows an empty map before sign-in. It requires a restored
signed-in session and a loaded My Atlas profile before displaying private map
data or owner workflows. Signed-out visitors see the map and sign-in entry.
Signed-in visitors without a profile receive
registration, and account load failures retain the existing retry controls.
Search, local draft pin changes, and the preview walkthrough are unavailable
before account access. Public shared Atlases and shared trips remain readable.
This supersedes the earlier pre-account interactive proof and walkthrough.

My Atlas uses the site's existing Poppins family for interface copy, headings,
tutorials, authentication feedback, pin editing, public profiles, and locally
rendered Story text. The application does not request or declare Russo One.

Before account creation, a visible `See how it works` button opens a four-step
walkthrough covering private-by-default account creation, place entry, optional
visit years, timeline playback, statistics, and sharing. Its final action moves
the visitor to Google sign in or the account form. A newly provisioned,
revision-1 account with no pins receives a separate quick start once per browser.
Dismissal is stored only in local browser storage, and a permanent quick start
button can reopen it. Its final action moves keyboard focus to place
search. Both walkthroughs use an accessible modal with a trapped focus cycle,
Escape dismissal, scroll locking, focus restoration, reduced-motion handling,
and a phone-width bottom sheet layout.

Owner and public views derive place, spot, country, continent, capital, date,
and map span statistics from the safe canonical place projection. They provide exact
year and undated filters, chronological destination playback, keyboard and
button cycling, and mobile layouts. Playback reveals dated destinations
cumulatively, moves the camera between successive destinations, and animates a
plane over a curved connection before focusing the destination. Reduced motion
preferences suppress the plane animation. Places within the same year use a
stable name and ID order for presentation only. The interface states that this
is a visual sequence rather than a recorded travel route.

At phone widths, owner and public views keep the statistics visible but place
year filtering, playback, path visibility, and Story export inside an
accessible map-controls disclosure that is collapsed by default. The MapTiler
SDK navigation and terrain button stack is hidden at the same breakpoint,
because the map retains touch pan and zoom gestures. Desktop layouts keep those
controls expanded and retain the SDK button stack. The year selector is
explicitly restored from the site's legacy hidden-select rule in both layouts.
Map provider attribution remains available through the SDK's compact info
control, but My Atlas collapses its initially expanded attribution text as soon
as provider data is available. Activating the info button expands the original
SDK attribution control.

The public phone header uses a compact two-column identity block. The handle
and display name remain together on the left, while the place count becomes a
small status badge on the right. This removes the unused half-row without
changing the desktop profile header or hiding any shared-profile detail.

Map pins use a deterministic color for their earliest visit year, retain a
visible place and year label, and emphasize the selected destination. Nearby
pins collapse into a count marker using the same screen-distance grouping model
as the primary Atlas, with smaller phone spacing. The selected destination
always remains precise. Activating a group frames its destinations, and zooming
past the My Atlas overview threshold releases them into standalone pins. Marker
elements retain the SDK's absolute positioning so their bottom anchors remain
on the projected coordinates during playback. A compact year legend uses the
same colors. Undated destinations remain visible and filterable but do not
enter chronological playback. Curved map connections are a deterministic
visual treatment over the current pins and do not claim route history. They use
a dark underlay, soft gold glow, and high-opacity three-pixel dashed line so the
connections remain legible over satellite imagery.

The owner Show map memories control explicitly reveals favorite-note labels on
standalone and trip pins; Hide map memories suppresses all map memory labels,
including the selected destination. Sidebar memory detail is independent.
The toggle starts off and is disabled when the actual map scope has no memories.
Owner-only stop notes are projected locally into map locations for the navigator
and canonical trip workspace. They never enter public trip or share projections.
Memory content is assigned as DOM text rather than HTML; clusters stay compact
and never show memory text.

The owner editor intentionally asks only for optional visit years. Users may
record multiple years for repeat visits or leave a destination undated. The API
continues to accept an optional month for backward compatibility, but the
current timeline and visitor presentation operate at year precision.
Selecting a catalog search result opens its Add destination editor immediately
below the search control. The result list remains below the active editor so
the selected action is visible before alternate matches.

The signed-in owner panel keeps its travel overview visible, then follows the
working sequence of Add destination, Visited destinations, Plan future travel,
and Share Visited Atlas. Those four flows have independent accessible disclosure
controls. Existing accounts start with the disclosures closed so large saved
collections do not dominate the page; empty accounts open Add destination to
preserve onboarding. Adding a destination closes its entry flow and opens the
visited list, while editing a visited entry reopens and focuses its editor.
The overview also exposes a signed-in Plan a trip action. It closes competing
destination panels, opens the existing private planner, scrolls its disclosure
into the desktop panel viewport, and moves keyboard focus to its heading.
Visited and planner collections use bounded internal scrolling when expanded.
The Google account summary remains visible in a compact identity and action row.
At phone width the row uses a bounded rectangular profile control, resets the
desktop negative margin, and contains the legacy global navigation and button
rules. Its background, height, shadow, line height, radius, and focus color are
scoped explicitly so focus remains legible without covering the travel
overview.

The private planner has its own search field rather than depending on the
visited-place results above it. It uses the shared local or Worker-backed My
Atlas search client, presents country, city, and reviewed-spot type plus stored
latitude and longitude, and saves the canonical result into the private
wishlist. Saved wishlist cards repeat those coordinates so the owner can review
the plan input before using external directions. Custom coordinates remain
available through a secondary fallback disclosure.

When a saved plan exists, the private planner now presents that plan before its
editing forms. The readable itinerary distinguishes the start, every numbered
stop, and the effective finish, including return-to-start and final-stop
semantics. It shows the title, optional year and note, current wishlist-note
previews when their source wishes still exist, and a saved or unsaved state.
Large itineraries retain bounded scrolling. Destination management and the
complete editor begin collapsed for existing plans; empty planners open the
builder. Accessible Up and Down controls remain the canonical reorder path.

Directions and the privacy-filtered planning prompt are the only active
next-action panels, and only one is expanded at a time. Flights and stays are
not displayed as inactive promises. The Maps builder, storage contract,
retention behavior, API fields, and public projection are unchanged by this
presentation phase.

Within Directions, the owner can choose which saved points enter the export,
set a Drive, Transit, Walk, or Bike default, and review each resulting adjacent
pair. An explicit Fly or Ferry choice separates that pair from Google Maps
directions. The panel previews the retained order and any exact custom
coordinates before confirmation. It then shows only the generated Maps search
or direction links and nonlink flight or ferry boundaries. Reloading the view
discards these export choices.

If a mutation is rejected with `revision_conflict`, the browser reads the latest
account revision, preserves the local itinerary draft where its wishlist
references remain valid, and retries the same intended mutation once. A second
conflict is shown with recovery guidance and is not replayed. This recovery is
limited to an explicit Worker rejection that confirms no state change, so the
optimistic concurrency boundary remains intact.

The planner disclosure header uses the same full-width control geometry as the
other owner workflow sections. Its closed and open states retain the shared
vertical padding, centered alignment, and compact status pill at desktop and
phone widths. Planner failures preserve the Worker request ID in owner-facing
recovery copy when one is available.

The signed-in identity is now a circular control in the upper right of the
owner panel. It opens a compact popover with the display name, handle, recovery
action when needed, and direct Sign out action.
Public visibility, public-link copying, and Story image export live together in
a named collapsible Share Visited Atlas workflow with explanatory copy. Account
recovery remains adjacent to the identity only when it is needed. Opening any
large owner workflow closes the others. An account with no visited pins sees a
direct Add a visited place action and an explanation that saved trips and Saved
places stay private. Sharing and Story export remain unavailable until the
Visited Atlas contains at least one place.

A saved trip has a separate Share saved trip action. It remains available while
the planner is collapsed and does not depend on Visited Atlas pins. The action
copies a versioned read only route snapshot that excludes private notes, Wish
IDs, plan IDs, account identity, and live location. Its visible result message
remains outside the expanded planner so a collapsed share action cannot appear
unresponsive.

The recipient route mounts the same MapTiler route projection used by the
owner planner without mounting account or editing controls. It draws the saved
start, ordered stops, effective finish or return, and semantic route segments
from the URL snapshot. The prior itinerary remains available as a collapsible
summary over the map. The route performs no API read and still describes the
lines as saved order rather than turn by turn directions.

On desktop, an open planner widens the owner panel to a bounded 52 rem maximum.
Direct panel children do not flex-shrink, so planner and sharing sections retain
their controls and contribute to the panel's internal scroll height. Mobile
keeps the full-width panel and places itinerary-builder actions below their
heading.

An active account also sees `Can't find it? Add a custom pin` directly below
search. The form can seed its name from the current query, requires a valid
plain-text name, and activates a gold map marker. The owner clicks or taps the
map, then may drag the marker or use arrow keys before continuing into the same
date and favorite-memory editor. The form states that this owner-supplied name
and position become visible if the Atlas is made public.

The public root route now enters the Travel Atlas directly. When the My Atlas
route flag is enabled, the Atlas toolbar exposes one direct `My Atlas` action
that routes to `/my-atlas`. Disabled builds omit that action together with the
route, so the public shell cannot expose a dead My Atlas link. Journey guides
remain discoverable inside the Atlas rather than behind an intermediate
homepage.

The same flag enables one dismissible `Make your own Atlas` invitation in the
public Atlas per browser tab. It points to `/my-atlas`, never reads account
state, and remains absent from story-reader mode.

The browser can generate a 1080 by 1920 PNG Story card locally. It includes the
visible statistics, pins, decorative connections, a recognizable world land
silhouette, the optional favorite travel image, and the
label `My Atlas by RoamWithJustin.com`. The silhouette uses bundled Natural
Earth 1:110m land geometry from `world-atlas`, decoded by `topojson-client` and
projected into the canvas by `d3-geo`. Export asynchronously encodes the canvas
to a PNG Blob, downloads it through a temporary object URL, and reports
creating, success, or failure status in the open workflow. It makes no
tile-provider request and does not upload the generated Story image. Signed out
public Atlas exports use the same image only when its public profile use is
approved and the Visited Atlas is public.

## Deliberately incomplete

The API still needs handle-change coordination with active registry records, abuse
reporting and moderation, and registration or operator rate-limit enforcement.
Permanent application-account deletion and the six-month plus 30-day plan
retention contract are implemented and staged, but authenticated deletion still
requires disposable-account acceptance. Public discovery is locally test
verified and promoted through pull requests 218 and 219. Real-profile discovery
acceptance remains externally unverified. Public
catalog and Atlas reads have a tested weighted limiter boundary and a deployed
staging binding. Catalog and public Atlas reads have isolated limiter keys, but
live exhaustion behavior is not yet verified.
Profile-specific share HTML, a verified public owner profile, and owner
verification of the corrected save feedback and silent session restoration
also remain. Private planned destinations now use an explicit lifecycle and are
excluded from visited statistics, playback, and public sharing until the owner
selects and confirms stops through Mark Visited. The Mark Visited code and
durable-state behavior are locally test verified, but its Worker deployment and
authenticated owner acceptance are not yet claimed.

Favorite image uploads require a human-entered location label, limited to 120
Unicode characters. The browser percent-encodes it in
`X-Atlas-Image-Location`; the Worker validates it before transformation.
`PATCH /v1/me/atlas-image` accepts `location`, `publicProfile`, or both. A
location-only update preserves visibility and bytes, uses the existing revision
and idempotency guards, and advances public activity metadata. Safe owner and
public image projections carry the location into Explore, public image viewing,
and both Story exports. `shared/my-atlas-image-location.mjs` governs validation.
Legacy images without labels remain readable; new uploads and explicit image
publication require a label. No GPS data is inferred or required.

The local experience extension adds up to ten optional private recaps per owned
pin through `experienceChange` on the existing pin PATCH route. Each has a
stable ID, title, optional operator/HTTPS website and server timestamps. It
does not replace the public favorite memory or change trip/visit identity.
Owner JSON/CSV exports include recaps; public responses, discovery ranking,
analytics and affiliate parameters exclude them. New mutation receipts for pins
with recaps store a reference and replay current state, avoiding retained private
recap snapshots after removal. Existing records need no migration or read-time
writes. The browser retains the same operation key on an ambiguous retry and
requires a reviewed explicit retry after a revision conflict. See the active
location/experience implementation document for local verification and gates.

Per-destination memory images remain outside the release. The implemented media
scope is one favorite travel image for the account, public profile, and Atlas
Story export.
Remote staging transformation evidence, real-device acceptance, spend alerts,
and orphan reconciliation remain required before a broader invited beta. Image
bytes are stored only in private R2, never in the profile Durable Object.

## Local custom-pin editing follow-up

The existing pin PATCH route now accepts optional `customPlace: {name,
coordinates}`. Validation rejects malformed data and simultaneous `placeId`.
The owned Durable Object permits this change only on an existing custom pin;
its `pinId` and `placeId` remain unchanged. Memories, dates, nested experiences
and plan snapshots are preserved. Export reflects the new custom place, and
ordinary deletion removes it. No migration or canonical-trip lifecycle change
is introduced. Browser edits reuse the shared picker and mounted SDK map.
Ambiguous retries keep the same operation key and revision. Revision conflicts
refresh account state and retain the editor draft for explicit review, without
automatically applying it over the newer state. This follow-up is local only;
the preceding recap/deletion-safety foundations are deployed through PRs 222/223.

## Local trip-organization preview

`GET /v1/me/trips/upgrade-preview` is an authenticated owner-only read. It builds
canonical trip candidates from the legacy per-owner export without storing
anything or changing the account revision, current source records or retention
alarm. The API exposes only group/stop names and IDs, counts, fingerprint and
blocking issues. Private memories, experience entries, raw legacy metadata,
image keys and identity digests remain outside the response. Catalog resolution
is read-only and skipped for empty/custom-only sources. The subsequent write API is disabled by default; no automatic migration on account load is enabled.

The pure versioned model distinguishes trips from stop occurrences and Place
identity. It supports reversible explicit lifecycle and single-stop trips,
with content-preserving transitions and stop-removal safeguards. Local gated trip persistence, Combine into Trip, rollback and history-safe retention are now verified below. Creator/shared UI is locally fixture-tested with activation still disabled. The active trip-centric transition record
contains the implementation checklist and verified runtime boundary.

## Gated canonical trip repository

The local trip store uses `trip:{id}`, a `trip-schema` marker and one explicit
rollback snapshot inside the existing owner object. Default and staging config
set `MY_ATLAS_TRIP_WRITES_ENABLED=false`. The service cannot enable writes from
client input. The marker is set only through a fingerprint/revision-checked
upgrade with typed confirmation and retention acknowledgement. Planned and
Past trips use the same records and stable stop/memory identities. Legacy
geometry writes reject after upgrade, while profile, image and wishlist controls
continue to use the existing ownership boundary.

Organized trips are retained until explicitly deleted. Old plan alarms skip
these records. Before any subsequent saved account change, rollback can restore
legacy records and the prior alarm, advancing the revision. The next saved
change purges the backup, and complete account deletion erases all new keys.
Mutation receipts store references rather than memory snapshots. Owner export
includes canonical trips and the sanitized backup while available.

Compatibility visited geography derives from Past stops. Owner/public place
fields come from immutable canonical snapshots; public projections omit private
recaps, source Wish IDs, logistics and migration metadata. New trips default
private, and private experience edits do not advance discovery activity. The
legacy compatibility map still aggregates repeated places. The local creator
workspace selects individual trip occurrences on the existing map instance.
Its version 2 read-only link shares only title, lifecycle and ordered location
snapshots, preserving repeated places. Notes, recaps, dates, logistics and IDs
are excluded; legacy version 1 links still open.

The development preview is `/my-atlas?trips=1`; production ignores that query.
The Visited list also has an explicit Group destinations entry point for signed-in
owners. It opens the existing workspace on demand without enabling writes or
upgrading automatically. Selection order is retained through upgrade review.
Only unambiguous single-stop saved Past trips are preselected for combining;
already grouped places and repeated occurrences require explicit trip selection.
Already upgraded accounts always use the trip workspace. The server write gate
remains authoritative. JSON export uses schema 3 for upgraded accounts, including
canonical trips and the sanitized rollback snapshot when available. CSV uses
recordType/recordId/parentId/data rows with quoted JSON payloads. Legacy schema 2
JSON and flat-pin CSV remain unchanged.

Serialized UTF-8 limits are 1 MiB per trip, 4 MiB per collection and 1.5 MiB for
the rollback snapshot. An oversized upgrade fails before any source mutation.
These conservative limits bound whole-collection reads and SQLite KV values.
See the active transition checklist for endpoint paths, remaining limitations
and 56-test runtime evidence.

Staging Worker `fc6a784b-7e87-4850-b335-5f292771f276` deploys these backend
routes with `MY_ATLAS_TRIP_WRITES_ENABLED=false`. Remote health returned 200,
trip collection and upgrade-preview reads without credentials returned 401,
and the localhost trip GET preflight returned 204 with the expected origin.
Authenticated real-owner trip review remains externally unverified. This backend
deployment does not deploy the new frontend or migrate existing accounts.

## Local owner navigation tabs

`MyAtlasGeographicProof.vue` exposes Overview, Planning and Past for signed-in
owners. Overview contains statistics, map/timeline controls and Visited Atlas
sharing/export. Planning contains the existing planner for legacy accounts or
Planned canonical trips for organized accounts. Past contains visited places,
destination entry/grouping and Past canonical trips. Trip sharing stays on its
own trip card. The previous repeated Visited/Plan action row is removed.

Components stay mounted across tab changes to preserve planner drafts and
grouping selections. Map route visibility follows the active tab; the SDK map
is not recreated. The shared canonical workspace uses a lifecycle scope, sets
new-trip defaults from its tab and removes a selection from that tab when its
lifecycle changes. Arrow keys and Home/End activate/focus tabs, with a shared
labelled tabpanel. No automatic schema change or server write is introduced.
Trip load errors distinguish a missing server route from expired sign-in and
retryable load failures. The prior remote checks do not establish the cause of
the owner's later authenticated load error; that remains externally unverified.

## Independent destinations correction

The owner's newer direction supersedes the original pin-to-one-stop-trip
conversion. Destination-model version 2 leaves existing `pin:` records and
`pin-place:` indexes intact during upgrade; only existing saved plans become
canonical trips. Adding a destination remains a pin write and creates no trip.
The account marker/profile use trip schema version 2 to allow independent
destination CRUD alongside canonical trips. The original version 1 boundary
continues to reject legacy geometry writes for any already upgraded v1 object.

`GET /v1/me/trips` returns actual trips and separate ungrouped `destinations`.
The preview counts ungrouped destinations separately and lists existing plans
as trips. Upgrade requires `destinationModelVersion: 2` in addition to the
existing fingerprint/revision and retention controls. Older clients cannot
activate the changed model accidentally. The UI supplies the version and
confirmation value after an explicit checkbox; no typed phrase is requested.

`POST /v1/me/trips/group-destinations` accepts ordered `pinIds` and either a
new `title` or existing Past `tripId`. The service resolves owned source visits;
the transaction checks their snapshots, moves their memories/dates/experiences
into stable trip stop occurrences, then removes only those standalone pins and
indexes. Unselected destinations remain independent and editable. One selected
destination can form an explicit one-stop trip. Existing-trip attachment must
preserve the current publication scope. Stop/memory IDs are operation-qualified
so a later visit to the same place remains independent. An owner-scoped receipt
is checked before resolving already-moved pins on a retry.

Owner/public compatibility geography derives from standalone destinations plus
eligible Past trips, deduplicated by Place. Owner responses identify standalone
destinations with `ungrouped` and list trip references; public projections omit
those owner-only fields. Standalone editing never merges another trip's dates
or memories into that destination. Export and complete account deletion retain
the established boundaries. Upgrade rollback restores the original state before
any subsequent saved change; grouping purges that backup after success.

Default configuration still disables trip writes. The corrected staging
configuration enables explicit authenticated writes; deployment evidence is
recorded in the active transition checklist when performed. No upgrade runs on
account read, ordinary destination creation or deployment.

The corrected backend is deployed as staging Worker
`21912d9e-652a-4693-ab15-222d0e9eb6b8`, with explicit trip writes enabled.
The version-2 upgrade guard prevents older frontends from activating the new
model. The matching UI correction is local only until its next frontend release.
Anonymous route/CORS checks pass; genuine-owner save acceptance is not claimed.

## Local sharing, customization and profile navigation

The owner UI now uses these responsibilities. This follow-up remains local
until the next frontend promotion; no account API or permission change is added.

| Location | Functionality |
| --- | --- |
| Overview | Travel statistics, journey navigation, Share Your Atlas |
| Share Your Atlas | Direct trip-sharing guidance and Story image creation |
| Profile dialog | Explore profile visibility, profile link, settings, data export, account deletion |
| Customize My Atlas | Favorite travel image, image location, public image presentation |
| Explore Atlases | Discover other users' publicly shared Atlases |

Share Your Atlas is a compact Overview card with trip-sharing guidance and the
existing Story image export action. The redundant disclosure and separate
public-profile controls are removed. The favorite-image editor remains in Customize My Atlas on Overview,
also reachable from the profile dropdown. The November 22 local follow-up moves
the Explore listing preference into Profile settings, separate from that image
editor. This is now the single profile visibility control in the current UI.
Journey controls navigate to the existing Past/Planning tabs without fetching
or inventing journey records just to populate the summary.

The profile dialog opens from the existing profile icon beside the theme selector.
It includes Instagram links, private JSON data export, the existing guarded
account deletion flow, public-link display, Explore listing and Explore navigation. Image and
account deletion retain their existing safeguards. The native modal closes through
its Close button, Escape or backdrop click when no save is pending. Close restores
trigger focus. Its viewport height cap and internal scrolling keep long expanded
settings reachable on mobile. Customize navigation closes the dialog, opens
Overview's disclosure and focuses its summary. Draft values stay on the owner
component; moving the controls does not save them automatically.

## Local control feedback

`styles/interactions.css`, imported by the owner view, scopes shared feedback to
the owner panel and notification dismiss control. It leaves MapTiler controls
untouched. Enabled controls brighten/lift slightly on fine-pointer hover and
press inward immediately, with an inset shadow on pointer activation. Keyboard
focus has a visible ring. ARIA selected/pressed/expanded controls and open
disclosures keep a persistent selected edge. Disabled controls are visibly
dimmed and do not lift; coarse-pointer targets have 44 pixel minimum dimensions.
`touch-action: manipulation` retains scrolling and pinch zoom while avoiding
double-tap delay on these controls.

Story-image processing, image processing, visit saves and the main canonical
trip saves expose `aria-busy`; busy buttons show an indeterminate indicator and
progress cursor. The trip component tracks the actual mutation action and clears
it after success or failure. These cues acknowledge work in progress, not a
successful save. Existing success/error/refresh notifications remain authoritative.
Reduced-motion preferences remove transforms/transitions and spinner animation
while preserving static focus, selection and busy cues. This is visual feedback;
no device vibration, audio or extra requests are introduced.

The intro Explore Atlases link is styled as an outlined secondary pill beside
Sign in/Quick start, with matching padding, height and alignment. Its router
destination and the dropdown's simpler Explore link are unchanged.

Customize My Atlas now uses the same button-based section toggle as Share Your
Atlas, including heading/subtitle typography, padding and Open/Hide pill. Its
controlled content stays mounted while collapsed. `aria-expanded` and
`aria-controls` reflect the state; the profile shortcut opens the section and
focuses its toggle. The older native details triangle/header styling is removed.

## Integrated trip management, local source November 21

The [active implementation record](../implementation/my-atlas-integrated-trip-management-2026-11-21.md)
extends explicit canonical trips with owner-controlled visit reassignment and
Ungrouped storage. `visit:{stopId}` holds a complete independent canonical stop;
it is not a legacy unique-place pin. The collection response adds owner-only
`ungroupedVisits` and `legacyPlans`. Map projections deduplicate locations while
retaining occurrence references for the correct editor. Account export includes
these visits and raw standalone destinations; account deletion erases them with
the rest of the owner's Durable Object state.

Transfers preserve stop/memory identity and all visit data, validate the complete
result, and retain an emptied source trip as a draft. They require matching
lifecycles and the existing trip write gate, owner authorization, revision and
idempotency controls. New trips require an explicit title and begin private.
No destination addition implicitly creates a trip.

Trip visibility updates `sharing.publicAtlas` separately from whole-account
visibility and snapshot links. Public projections still exclude private notes,
experiences and logistics. Ungrouping retains prior public visibility; assignment
uses the target trip's setting. Full standalone visits count toward collection
storage limits and participate in duplicate-ID validation.

Canonical trips can persist normalized private flight/rental search drafts in
`logistics.flights[].searchDraft` and `logistics.rentals[].searchDraft`, with
stable logistics IDs. Saving is explicit and revisioned. These are travel search
intentions, not bookings or provider URLs. The legacy planner keeps its existing
browser drafts. Public read-only links continue using the allowlisted projection.

Overview independently loads actual canonical trips and legacy saved plans,
shows three cards initially, and displays only known dates. It does not turn
independent destinations into cards. Collection notifications refresh these cards;
revision and account-generation checks reject stale responses. Sign-out and
account deletion clear the private list and invalidate in-flight requests.

### Compact trip editor, local follow-up

Canonical trip controls share `MyAtlasSwitch`, `MyAtlasInfo` and
`MyAtlasDialog`. The summary stays compact; editing and long selection forms
occupy one native dialog with internal tabs. The parent workspace owns drafts,
revision checks and mutations. The dialog owns focus wrapping/restoration,
Escape/backdrop dismissal, background scroll locking and an independently
scrollable body. Dismissal is disabled during writes; failure and refresh status
remain available inside the dialog.

Public visibility is a single switch calling the existing revisioned mutation.
Its displayed value stays at server state until acknowledged; there is no
optimistic public-state change. Other switches retain their existing draft or
selection semantics. Help uses a nonmodal viewport-bounded popover, and opening
a dialog dismisses background help. Map placement temporarily removes the
dialog and restores it after selection without losing parent-owned fields.
This frontend follow-up is local and does not alter persistence or public data.

The refined summary uses the trip and destination names, with pen icons, as
editor triggers. A selected single trip does not need a duplicate picker.
Profile inclusion remains a revisioned switch in the journey editor's Settings
tab. Lifecycle uses an explicit Move to Planned or Mark as Traveled action in
that tab; the summary shows read-only status and visibility badges. These actions
retain server state until acknowledged. Deletion confirmation replaces the title editor's content
inside the same dialog. Shared hover rules are explicitly overridden in the
trip workspace to prevent movement and brightness effects on its controls.
Switches also exclude generic press transforms; their pending spinner overlays
the track without participating in flex layout, preserving its position while
the server acknowledges a change.

Destination search keeps confirmation in a non-scrolling dialog status slot,
while the form body and bounded result list scroll separately. Actions within a
dialog suppress duplicate background toasts. Canonical place IDs deduplicate
search hits; region, country, type and known coordinates distinguish same-name
places. The parent retains selected draft destinations and their display context;
only original selection references enter the save payload.
Search selections populate a separate read-only preview. Manual entry is an
explicit optional mode backed by the existing custom draft, so catalog identity
is preserved and switching modes does not silently replace or duplicate it.

The entire owner sidebar can be hidden while
remaining mounted, then restored from a bottom map control. The same SDK map
is resized rather than recreated. This draft adds navigation-control and gesture
help affordances without changing account permissions or persistence. Testing
was initially deferred, then authorized and completed as recorded in the active
implementation checklist.

This batch also adds a navigator rendered inside the map shell. Its
selection, stop index and collapsed state are local view state; it reads existing
owner trip metadata without modifying visits, dates or sharing. Canonical stop
order is preserved; the All destinations choice remains a geographic view.
Map movement uses the existing SDK instance. The mobile map shell is explicitly
sized and isolated, and pin selection scales only inner artwork so SDK marker
positioning transforms remain intact. Browser fixtures verified containment,
trip navigation and restoration; no real owner data was changed in those checks.

The local public-view follow-up uses the same navigator and full-overview
collapse without owner APIs. An optional `atlas.trips` public projection includes
only public nonarchived Past trip titles and ordered place references, using
presentation IDs instead of canonical trip/stop IDs. Private fields remain
excluded; clients resolve references against the already-public places and
reject references outside that set. Repeated references remain distinct stops.
Older public responses without trip grouping remain supported. Both map views
use shared touch-specific help. PRs 235 and 236 released this follow-up;
Pages run 44962250911 succeeded.

The mobile bottom-menu correction makes owner/public restore controls
edge-to-edge bottom bars with safe-area padding; the in-map navigator remains
above them. The SDK's existing attribution control moves to the upper control
area on mobile and retains its provider links. Desktop placement is unchanged.

### Public grouped browsing, local follow-up

`MyAtlasPublicView.vue` separates Planned, Past and Destinations view states.
It defaults to Past when published Past trips exist, otherwise Planned when
public plans exist, otherwise Destinations. Switching states clears navigation
and filters the cards, pins and route to that view. Empty lifecycle views show
no pins. A selected trip preserves shared stop order and repeated occurrences;
pins/statistics deduplicate places. The in-map selector can switch between
public trips of either lifecycle and visited destinations without owner APIs.

`atlas.places` and `atlas.trips` preserve the existing visited/Past contract.
An additive `atlas.plannedTrips` array contains opaque public presentation IDs,
titles, the Planned lifecycle and ordered `{ place }` geographic snapshots.
These snapshots include empty visit arrays, no memories and no canonical
trip/stop IDs, descriptions, logistics, experiences or intended travel dates.
The client validates the additive field and normalizes both lifecycles into
its read-only trip list. Older responses without the field remain supported;
older clients ignore it and retain their visited-only view.

Both whole-profile visibility and each trip's `sharing.publicAtlas` must be
true for publication. Archived trips are excluded. Public planned geometry
never enters `tripPins`, visited counts, date playback or the Destinations view.
A profile with a public planned trip can be made public with zero visited
places. Directory place counts deduplicate all publicly visible map locations,
including planned stops, while the owner's pin count remains visited-only.
Trip names, lifecycle, ordering and public geography participate in public
activity freshness; private content edits do not.

Public visitors cannot create or download another owner's Atlas Story. The
public view has no export action, export method or Story-export import; the
owner view retains its export path. Aggregate place dates are not presented
as dates of individual occurrences.
Owner visibility help, Share Your Atlas readiness and privacy copy explain
both lifecycles. The configured privacy version advances to
`my-atlas-privacy-2026-11-21-public-trips` in deployed Worker version
`abf6fa12-b4ca-4239-8cfb-a860fbdaf41a`. Frontend rollout is tracked in PR 239.
Live health/directory/profile reads passed, including a profile with both trip
lifecycles. No production account was changed by verification.

The November 22 simplification moves Planned/Past/Destinations selection into
one labeled View select inside the existing map shell. Empty lifecycle options
are disabled. Its responsive placement clears the desktop overview and SDK
controls and remains available with the overview hidden. The sidebar retains
profile information, trip cards and ordered stops. Public year playback and
its extra sidebar control drawer are removed; no alternate year filter silently
hides pins. Switching View still resets the selected stop and scopes the map.

### Memory labels, clustering and trip pin simplification, November 22, local

My Atlas reuses the primary Atlas cluster maximum zoom and desktop/mobile
screen-distance radii. `catalog/mapMarkers.mjs` first groups route occurrences
at the same physical coordinates, then applies that shared clustering model.
The selected location remains precise. Activating clusters frames the locations
with the primary Atlas close-focus zoom as its cap. Route data, occurrence keys
and connection order are unchanged by grouping or zooming.

Trip markers render plain dots rather than stop numbers. Explicit start/finish
roles and their colors remain; the map order legend is omitted for trips without
those endpoints. The separate navigator retains its stop progress and Next/
Previous controls. Owner map inputs are scoped by `mapVisiblePlaces`, so memory
readiness follows the map rather than an unrelated visited list. Stop memory
projection stays in owner code paths; no API or visibility permission changes.

The mobile endpoint route key anchors 12 pixels from the map's upper-left
corner, with border-box sizing and a width cap reserving 92 pixels on the right
for SDK controls/attribution. It clears gesture help and the lower navigation
controls with the owner menu either open or hidden. Desktop styling is unchanged.

### Header branding and menu motion, November 22, local

The owner header places the themed BrandMark/My Atlas lockup beside one aligned
44 pixel action row for appearance, profile/sign-in and the collapse chevron.
The collapse action no longer reserves a separate row above the header. The
bottom restore bar reuses BrandMark and the same My Atlas lockup.

Sidebar transitions preserve the mounted DOM and map instance. Before leaving,
the panel's viewport bounds are captured and held while it fades/slides out;
temporary positioning is cleared after completion or cancellation. Leaving
panels/menus are inert, and focus moves between the header and restore control.
Rapid reversals retain normal layout and focus. Profile and theme dropdowns
fade/slide, and expanding owner disclosures use brief content reveals.

MyAtlasDialog animates the native modal after showModal and delays requested
closure until its short exit completes. The dialog stays modal/inert while
closing, retains focus trapping/body scroll locking, cancels animations on
external destruction and restores opener focus. Escape is handled before its
native default so pending saves cannot dismiss the modal. Draft ownership and
mutation timing remain with the parent. Reduced-motion preferences disable
these transitions and dialog animations.

### Mobile navigator and gesture help, November 22, local

`MyAtlasMapNavigator.vue` embeds `MyAtlasMapHelp.vue` as a compact 44 pixel
info control in its mobile header. Owner and public views hide the separate
floating gesture control while their navigator is open, including its collapsed
state. Changing that visibility dismisses any existing floating help popover;
closing the navigator restores the floating control. Desktop help remains
separate.

The mobile navigator caps its height against its map container, reserving space
for the upper SDK controls and lower menu restore bar. Stop details can scroll
inside the flex column; Previous/Next sit in a separate fixed-size footer so
short maps do not hide those actions. This affects presentation only and retains
the mounted map, ordered trip stops and existing navigation events.

The closed navigator's Explore button explicitly centers its label and arrow
with `align-items: center` and a unitless line height. This avoids the anonymous
text flex item aligning above a stretched icon span. Owner and public openers
share the correction and retain their existing touch size and navigation events.

### Sharing and directory visibility, November 22, local

The owner interface separates direct sharing from publishing a discoverable profile:

| Control | Effect |
| --- | --- |
| Share trip in Planned or Past | Copies a read-only snapshot URL, independent of profile publication or Explore listing |
| Profile settings, List my profile in Explore Atlases on | Publishes the profile URL and lists it in the directory together |
| Profile settings, List my profile in Explore Atlases off | Removes the directory listing and makes the profile URL private together |

The switch lives only in Profile settings. It uses one authenticated, revisioned
`PATCH /v1/me` with `{public: listed, discoverable: listed}`, so there is no
intermediate published-only state or partial two-request save. The client helper
`updateMyAtlasDiscovery` accepts the optional public flag and validates both
returned flags when it is supplied. Existing discovery-only callers remain
compatible with the backend's independent fields. Busy, signed-out, unchanged
and empty-profile publication requests are guarded; failed writes keep the prior
state. Pending feedback is scoped to this save.

No saved profile changes on loading the new UI. Legacy public-but-unlisted
profiles retain their existing access and display a notice plus a Make profile
private action inside the same Explore settings group. They are never
automatically listed or forced through a listed state to become private.
Profile link copying/display is inside this group as well. New ordinary profiles
have one on/off choice, with no separate public-profile action or prerequisite.

Trip publication is labeled Include on my profile, still backed by
`sharing.publicAtlas`. Its help separates profile inclusion from direct snapshot
sharing and discovery. Turning off the current Explore switch also makes the
profile private. Copied trip snapshots retain their original content and are
not revoked by either profile preference; UI help and the tutorial explain this.
Favorite-image public use stays a separate explicit permission. The existing API
already accepts both flags atomically. No Worker, storage schema, directory
ranking or public projection changes accompany this UI update.

### Profile modal separation, November 22, local

`MyAtlasGeographicProof.vue` renders Profile settings inside the existing
`MyAtlasDialog.vue`, with a profile-specific 480 pixel width cap. Native
`showModal()` places it in the browser's top layer, independently of sidebar
stacking and clipping. The surface is opaque; the shared backdrop dims/blurs
the map and blocks its controls. The header/close action and operation status
remain outside the scrolling settings body.

The old absolute-positioned account menu, viewport-height calculation, global
outside-click listener and dropdown animation are removed. Nonmodal session and
account-load errors retain the inline account card and Retry action while the
profile dialog is closed. The dialog itself retains those recovery actions and
shows errors/status in its pinned status area. Existing native focus trapping,
scroll locking, reduced-motion animations, backdrop/Escape handling and
pending-save close guards are reused.

Drafts stay in the owner component. Customize closes Profile settings before
focusing the existing Overview disclosure. Info help uses a popover within the
single dialog; no nested modal is introduced. The map and account revision are
unchanged by opening/closing. Profile publication and account API contracts are
not changed by this presentation correction.

### Journey summary and destination recap, November 22, local

`MyAtlasTrips.vue` presents a journey before its management controls: editable
title, destination count, known dates from `journeyCardDate`, lifecycle and
effective-profile-visibility badges, optional existing overview, compact ordered
destinations and a map action. Dates are never inferred from creation timestamps.
`MyAtlasTripDestinations.vue` shows region/country, an existing note excerpt and
experience counts when available. It does not invent cover media or events.

Opening a destination starts on a read-only Recap tab. Memory, Dates,
Experiences and Actions remain tabs of the same native dialog. Actions contains
accessible earlier/later movement and permanent removal; removal replaces the
dialog content with an explicit confirmation. Moving or ungrouping preserves the
visit and uses the existing transfer API. No nested dialog is opened.

Edit journey has Details and Settings tabs. Lifecycle is an explicit action;
profile inclusion remains an acknowledged revisioned switch. Manage destinations
has Order, Move between journeys and, for Past journeys, Add existing tabs.
Standalone legacy pins resolve names from owner `pinnedPlaces` and retain their
original pin references. Their existing visibility-matching rule still applies.
Independent canonical visits use the existing transfer path. Neither destination
addition nor this presentation change creates a journey implicitly.

Management-only drag handles support pointer gestures and arrow keys. Drag order
is a local preview until release, then emits the existing full stop-ID reorder
payload. Repeated place visits remain distinct by stop ID. Cancellation, pending
writes and failed requests do not mutate prop-owned order. Pointer listeners are
removed on cancellation, release and destruction. Touch panning is disabled only
on the handle; the dialog body remains scrollable. Explicit earlier/later buttons
provide an alternative to dragging or arrow keys.

Share journey opens a separate read-only explanation and Copy action with pinned
confirmation. It retains the existing allowlisted snapshot, excludes private
memories/experiences/logistics, works independently of profile publication and
explains that previously copied snapshots do not change or revoke themselves.
View journey on map selects that canonical journey in the existing owner map
navigator and hides the sidebar without creating another map or changing data.
The initial summary was a frontend-only change. The expanded mockup pass below
also adds a compatible API extension. Both remain local.

### Overview and planning mockup flow, November 22, local

The owner tabs precede a context-specific heading. Overview contains three travel
statistics, an action card for the existing map, a compact selected destination,
journey summaries and sharing/customization cards. Opening a selected destination
replaces the Overview body with its known location, memory, visit dates and
related canonical journeys. It never guesses a trip relationship from proximity
or dates. Standalone memory/date editing reuses `MyAtlasPinEditor.vue` in the
shared native dialog. Grouped geography opens occurrence-aware journey tools
instead of writing to a merged compatibility pin. Custom-pin location editing
remains in its existing workflow, outside that memory/date dialog.

On mobile, a signed-in expanded menu fills the viewport and scrolls internally.
Its collapse action and map buttons reveal the same mounted SDK map and existing
trip/stop navigator. The signed-out map layout is unchanged. Map-help controls
are hidden while covered by the full menu. No extra map instance or illustrative
map asset is introduced.

Planning and Past have distinct list and selected-journey views, with a Back
action. New trip takes its lifecycle from the current tab and requires a name;
the first stop is optional when the server advertises support. Management and
sharing stay in the existing native dialog. Overview journey cards open these
views and do not duplicate editing or sharing controls.

`GET /v1/me/trips` adds optional `capabilities.emptyTripDrafts` and
`capabilities.planningNotes` booleans. Older responses omit them and remain valid.
The UI treats absent/nonboolean capabilities as false: saving an empty trip
requires a first destination on such servers, and planning-note saving is
disabled with an explanation. Normal local startup continues using its configured
API and does not replace, clear or switch the account store.

The collection POST accepts zero stops, storing an explicitly named private
`workflow: draft` trip. Adding its first stop changes the workflow to `saved`.
Neither changes the independent-destination model. Empty trips have no map route
or share snapshot and remain excluded from public trip projections.

Stop PATCH also accepts `planNote`, stored separately from `memories`. It accepts
up to 2,000 UTF-16 units of normalized plain text, preserves line breaks and
rejects markup, invisible formatting, invalid surrogates and control characters.
Planned stops open on Notes; Past stops open on Recap. Notes survive lifecycle
changes, remain in private exports and are excluded from public/share projections.
Existing authorization, revision, idempotency and storage limits remain in force.

Share Your Atlas distinguishes an Interactive Atlas card from a Travel story
image card. Profile publication/Explore listing still has one control in Profile
settings. Story Preview and save builds an owner-only PNG Blob, shows it in one
dialog, then offers Save. Closing, destruction, logout and account deletion revoke
the preview URL. A completed preview checks owner identity before presentation.
If another dialog opened during PNG generation, its form is retained and the
new Blob is revoked instead of opening a second modal.
It neither uploads an image nor changes visibility, and public visitors retain
no Story download action. Compatible Worker
`b84e61df-6755-4cbd-aed2-f4d1d794ffa4` is deployed. Health returned 200;
unauthenticated trip reads, creates and note writes returned 401; allowed PATCH
preflights returned 204; a foreign origin returned 403. Authenticated new behavior
is covered by isolated Worker tests, not real-account mutation acceptance.
The owner authorized frontend promotion through develop/main; release PRs record
protected checks, Pages deployment and live synthetic UI acceptance.
