---
id: lightroom-publishing
title: Lightroom-to-Atlas Publishing
kind: proposal
status: proposed
implementation_state: none
updated: 2026-11-14
related:
  - media-pipeline
  - photo-exif-gear
  - video-metadata-pipeline
supersedes: []
superseded_by: []
code_paths: []
verification:
  state: unverified
  evidence: []
---

> **Proposal:** No Lightroom plug-in, local outbox, authenticated publisher,
> automated Git writer, or deployment-status integration exists in source.
> Adapt this design to the current media ingestor rather than creating a
> parallel registry or ingestion path.
>
> **Repository correction:** Later references to `trips.js`, `atlasData.js`, or
> a supplied legacy schema describe the pre-migration repository. Those files
> are retired; use the [current content model](../architecture/content-model.md)
> and selectors when implementing this proposal.

# Roam With Justin — Lightroom-to-Atlas Publishing Architecture

**Status:** Proposed architecture / implementation handoff  
**Priority:** Design the *ingestion contract and Atlas consumer* before writing the Lightroom plug-in.  
**Goal:** Stay creative in Lightroom Classic; eliminate manual renaming, R2 uploads, media registry editing, gallery arrays, Git commits, pull requests, deployment clicks, and repeat-publishing busywork.

---

## 1. Executive decision

**Lightroom Classic is the photography authoring and publishing UI.** A lightweight local processor does the heavy lifting. The publishing system emits validated, versioned **publication manifests**. The Roam With Justin application **ingests those manifests into canonical content records** and produces Atlas and trip views through selectors.

**Source-of-truth boundaries**

| Domain | Authority | Responsibilities |
|---|---|---|
| Original photo / develop settings | Lightroom Classic catalog + source file/backups | Select, edit, rate, keyword, republish |
| Publish intent | Lightroom Publish Service | Pick canonical journey, place, optional experience and collection; preserve remote identity |
| Asset identity and revision history | Canonical media registry (Git initially) | Stable `assetId`, provenance, renditions, metadata, revision pointer |
| Media bytes | Cloudflare R2 | Versioned web image/video renditions (not the Lightroom catalog) |
| Geography | Place registry | Canonical `placeId`, coordinates, parent hierarchy, aliases |
| Trip chronology | Journey registry | `journeyId`, visits, routes, lodging, narrative |
| Presentation / story curation | Experience records and explicit editorial overrides | Story text, selected hero, curated sequence, captions/crop/alt per usage |
| Website | Vue Atlas on GitHub Pages | Read normalized content; render places, visits, galleries, stories |

**Required end state: Zero routine Git interaction.** The ingestor must commit its generated output automatically and cause GitHub Actions to deploy the site. An optional review pull request is a temporary rollout/safety mode, not an ongoing required step. The only recurring creator decisions should be editing, selecting what to release, and assigning a destination when it cannot be inherited or inferred confidently.

**Non-goal:** A second always-open media CMS. Lightroom should remain the only regular photo-management interface. The processor, API, and build system should be largely invisible.

**Do not make the public Atlas parse image EXIF or query R2 directories at runtime.** Normalize publishing data ahead of time. GitHub Pages is static; the site should load a generated manifest or compiled JSON, not depend on a private Worker for ordinary viewing.

---

## 2. Working architecture

```text
                              CREATOR WORKFLOW
       Lightroom Classic (custom Publish Service, Lua)
       ├─ Publish Collections mapped to canonical IDs
       ├─ Edit → Lightroom flags Modified to Re-Publish
       ├─ Select images / order / optional editorial fields
       └─ Publish (new or updated photo)
                        |
                        v
             Local Publishing Agent (Node.js)
             ├─ Receive rendered files + Lightroom source references
             ├─ Reconcile existing asset identity / idempotency
             ├─ Extract EXIF/IPTC, resolve gear aliases
             ├─ Generate web renditions, posters if needed
             ├─ Upload versioned files to R2
             ├─ Verify objects and hashes
             └─ Write publication event/manifest to durable outbox
                        |
                        v
               Git-backed Content Ingestor
             ├─ Validate manifest/schema/foreign keys
             ├─ Upsert asset and revision
             ├─ Upsert asset ↔ place/journey/experience links
             ├─ Preserve user-curated heroes/order/alt
             ├─ Commit/push generated JSON automatically (bot identity)
             ├─ Retry safely on competing Git updates
             └─ Trigger normal GitHub Actions build/deploy
                        |
                        v
             GitHub Actions: validate → build → deploy
                        |
                        v
          GitHub Pages: Roam With Justin Atlas (Vue)
          ├─ Place page / pin: published media for place
          ├─ Journey page: media scoped to a visit/journey
          ├─ Experience: curated subset + narrative
          ├─ Technical panel: metadata + gear registry
          └─ Images/videos fetched directly from R2
                        |
                        v
       media.roamwithjustin.com → Cloudflare R2
```

**Simplest MVP:** The local agent can talk *directly* to R2 using machine-local credentials and write an import file into the website repo, then run a local validation/commit/push helper. A Worker is **optional**, not mandatory. Add a Worker later if uploads occur from multiple machines or if you need remote authentication and centralized reconciliation. Never put R2 or GitHub write credentials in the public Vue bundle.

---

## 3. Essential distinction: file, asset, association, usage

A **source photo** is the Lightroom catalog object. An **asset** is the stable published identity of that photo across revisions. An **association** connects the asset to a place, journey/visit, or experience. A **usage** specifies how one surface presents it (hero, gallery item, caption, order, crop, alt).

- The same photo may appear in a Zion location gallery, a Utah 2025 journey, and a dedicated cycling experience.
- Do **not** upload separate copies to satisfy those three contexts.
- Republish the photo with the **same `assetId`** but a **new revision**.
- Do **not** automatically change a manually selected hero or curated gallery order on republish.
- A published place association is not the same as asserting that the photo belongs to *every* visit to that place.
- A place may have multiple journeys and revisits; never infer `journeyId` from `placeId` alone.

Recommended identity policy:

- Generate opaque stable IDs such as `ast_01...` once; display descriptive names in Lightroom for humans.
- Store an **origin mapping** (`catalogInstanceId`, Lightroom-local photo reference, optional source fingerprint) for reconciliation. Do **not** assume an SDK-internal identifier is globally durable across reimports/catalog merges.
- Keep the remote mapping both inside Lightroom publish state and in the canonical registry. A restored catalog must be reconcilable without blindly creating duplicates.
- Store generated files at immutable revision keys: `assets/<assetId>/r0003/large.webp`, not under a filename that changes when you edit a title or move a collection.

---

## 4. What the Lightroom Publish Service should do

### 4.1 Creator-facing experience

Inside Lightroom Classic, a single **Roam With Justin** Publish Service. Collections can be named naturally, e.g.:

```text
Roam With Justin
  Utah 2025 [journeyId=utah-2025]
    Canyonlands [placeId=canyonlands-national-park]
      Changing Weather [experienceId=changing-weather, optional]
  Europe 2026
    Split
      Adriatic Boat Day
```

These are **presentation labels**, not IDs parsed from folder names. Store canonical IDs explicitly as Publish Collection settings or remote collection IDs. Renaming a collection must not change its identity. Fetch a read-only destination manifest from the website's generated content (or local synced copy) to power dropdowns; allow offline selections from last synchronized data.

**Default creator actions:** select collection → add photos → Publish. For later edits: edit Lightroom photo → Publish again. The existing photo-to-asset mapping remains stable.

### 4.2 Lightroom plug-in responsibilities

- Configure publish collections and their `journeyId`, `placeId`, optional `experienceId`/`visitId`.
- Export a standard high-quality intermediate JPEG (or TIFF where desirable) to a local temporary folder.
- Send photo source reference, publish destination IDs, rendition file path, and metadata to the processor.
- Remember `assetId`/remote publication ID once a job is durably acknowledged.
- Show **Queued**, **Processing**, **Published**, **Needs attention**, and **Modified to Re-Publish** appropriately. Check the SDK's publish bookkeeping semantics during implementation; asynchronous success must not be misrepresented as live deployment.
- Provide a **Reconcile / Retry** command for interrupted publishing and catalog restoration.
- Handle removed photos deliberately: **remove association** is not necessarily **delete asset**. No destructive remote deletion by default.

Lightroom Classic Publish Services and SDK hooks support this direction, but the specific catalog ID behavior and publish callbacks must be validated in a minimal SDK proof of concept before committing to one integration design. See references at end.

### 4.3 Manual metadata should be minimal

**Required, with inheritance:** destination `placeId`; `journeyId`/`visitId` if a trip context is intended. **Optional:** experience, title, tags, caption, preferred hero, sequence. Camera, lens, date, ISO, aperture, shutter and focal length should be extracted automatically when available. Missing fields remain unknown—never invent them.

Avoid making the photographer assign 40 photos individually: one Publish Collection mapping applies to the batch.

---

## 5. The key contract: publication manifest / event

**The manifest is the interface between Lightroom's publisher and the website's data model.** It describes a desired *upsert*, not a command to edit `trips.js` strings or create map pins by guessing names.

Example (illustrative IDs and technical values; not actual extracted data):

```json
{
  "schemaVersion": 1,
  "eventId": "evt_01JXYZ",
  "operation": "asset.upsert",
  "publishedAt": "2026-11-14T01:00:00Z",
  "origin": {
    "application": "lightroom-classic",
    "catalogInstanceId": "lr-cat-01",
    "sourcePhotoRef": "photo-4821",
    "sourceFingerprint": "sha256:..."
  },
  "asset": {
    "assetId": "ast_01JABC",
    "kind": "image",
    "revision": 3,
    "renditions": {
      "thumbnail": { "key": "assets/ast_01JABC/r0003/thumb.webp", "mimeType": "image/webp", "width": 480, "height": 320 },
      "gallery": { "key": "assets/ast_01JABC/r0003/gallery.webp", "mimeType": "image/webp", "width": 1600, "height": 1067 }
    },
    "metadata": {
      "capturedAt": "2025-02-15T15:00:00-07:00",
      "cameraRaw": "ILCE-7RM5",
      "cameraGearId": "sony-a7rv",
      "lensRaw": "35-150mm F/2-2.8 Di III VXD",
      "lensGearId": "tamron-35-150-f2-28",
      "iso": 200,
      "aperture": 5.6,
      "focalLengthMm": 70,
      "shutterSeconds": 0.004,
      "keywords": ["weather", "landscape"]
    }
  },
  "associations": [
    {
      "placeId": "canyonlands-national-park",
      "journeyId": "utah-2025",
      "visitId": "utah-2025-canyonlands",
      "experienceId": null,
      "collectionId": "lr-collection-77"
    }
  ]
}
```

**Production contract requirements:**

- `eventId` uniquely identifies a publish attempt for deduplication.
- `(assetId, revision)` identifies immutable media output and must not silently point to different bytes later.
- The content ingestor validates all `placeId`, `journeyId`, `visitId`, `experienceId` references against canonical registries.
- `sourcePhotoRef` is a publisher-scoped reference, **not** a global identifier by itself.
- A republish increments `revision`; it must not create a new `assetId`.
- Manifest only contains public-safe metadata. Strip sensitive GPS precision and private metadata unless intentionally published.
- The ingest operation is idempotent and monotonic: an old retry cannot roll back a newer revision.
- Preserve event history separately from materialized `media.json` state. That history is useful for audit/recovery; the site need not download it.

### 5.1 Three event types in v1

| Event | Meaning | Expected behavior |
|---|---|---|
| `asset.upsert` | New or republished image | Create/update media record; advance revision after object verification |
| `association.upsert` | Add/refresh destination membership | Makes asset available to selected place/visit/experience |
| `association.remove` | Remove from particular collection/destination | Remove membership without deleting shared asset |

Reserve `asset.archive` or `asset.delete` for explicit future workflows with confirmation and reference checks. Do not automatically delete media because a Lightroom collection changed.

### 5.2 Distinguish accepted, deployed, and visible

Use three distinct milestones:

1. **Accepted:** Processor durably stored the job and mapping; safe to stop Lightroom.
2. **Committed:** R2 files verified and canonical Git content updated.
3. **Deployed:** GitHub Actions succeeded and the published site can load the new content.

The plug-in may record remote ID after **Accepted** to prevent duplication, but must show publication as pending until **Deployed**, or offer an explicit resynchronization status. Never conflate background acceptance with successful live publication.

---

## 6. How the Vue Atlas consumes the output

**This is the piece to build first.** The Atlas should not consume raw publisher-specific events directly. A build-time **ingestor** folds validated events into normalized registries and relationships. Selectors project those records into UI-specific shapes.

```text
incoming events / manifests
     ↓ validate + deduplicate + reconcile
canonical media + association indexes
     ↓ selectors
Atlas markers / place cards / journey galleries / experience stories
```

### 6.1 Recommended normalized content layout

```text
src/content/
  media/
    utah.json                 # optional human-organized shards
    puerto-rico.json
    index.js                  # exports canonical lookup
  places/
    utah.js
    puerto-rico.js
    index.js
  journeys/
    utah-2025.js
    puerto-rico-2024.js
    index.js
  experiences/                # introduce once standalone stories exist
  gear/
    index.js
  associations/
    media-placements.json     # machine managed, or sharded by journey/place
  selectors/
    atlas.js
    trips.js
    media.js

publishing/                   # not bundled into public website
  schemas/
  events/                     # audit; potentially separate/private repo
  state/                      # imported event IDs, revisions; private if sensitive

scripts/
  ingest-publication.js
  validate-content.js
  build-public-content.js
```

**Important:** Avoid two authorities. If a machine-managed `media.json` and manually curated `trips.js` both specify the same gallery membership, drift returns. `trips.js` and `atlasData.js` should become temporary compatibility projections, not independent mutable content stores.

### 6.2 Media record vs placement record

```js
// Normalized media record: one per photo, current revision
const media = {
  id: "ast_01JABC",
  kind: "image",
  revision: 3,
  provider: "r2",
  renditions: {
    thumbnail: "assets/ast_01JABC/r0003/thumb.webp",
    gallery: "assets/ast_01JABC/r0003/gallery.webp"
  },
  capture: {
    cameraGearId: "sony-a7rv",
    lensGearId: "tamron-35-150-f2-28"
  }
}

// Relationship: one asset can have multiple placements
const placement = {
  id: "plc_01JDEF",
  assetId: "ast_01JABC",
  placeId: "canyonlands-national-park",
  journeyId: "utah-2025",
  visitId: "utah-2025-canyonlands",
  experienceId: null,
  published: true,
  editorial: {
    role: "gallery",
    sortOrder: 20,
    caption: "An incoming storm over Island in the Sky",
    alt: "Clouds over red rock canyons"
  }
}
```

`editorial` can be a deliberate override layered onto automatically generated default placements. **Do not overwrite editorial changes** when an image is republished; update the asset's rendition and capture metadata only. If the same asset is used twice in different contexts, keep distinct placement IDs.

### 6.3 Selector behavior

```js
// Pseudocode; assumes content is already normalized/validated
function getPlaceGallery(placeId) {
  return placements
    .filter(item => item.placeId === placeId && item.published)
    .sort((a, b) => (a.editorial?.sortOrder ?? 9999) - (b.editorial?.sortOrder ?? 9999))
    .map(item => ({
      ...item.editorial,
      asset: mediaById[item.assetId],
      src: resolveMediaUrl(mediaById[item.assetId], "gallery")
    }))
}

function getJourneyGallery(journeyId) {
  return placements
    .filter(item => item.journeyId === journeyId && item.published)
    .map(item => ({ ...item, asset: mediaById[item.assetId] }))
}
```

In production, deduplicate repeated asset placements where the particular view needs unique media. Make chronological ordering explicit for journey views; do not confuse geography's `parentId` with itinerary ordering. Keep selected heroes and manually pinned sort order stable; auto-add new assets to an *unfeatured* gallery section or append after curated items.

### 6.4 Existing-trip migration constraint

The supplied `trips.js` currently embeds direct paths at several levels (`cover`, `fullImage`, trip `gallery`, location `image`, location `gallery`, `featuredShots.img`, lodging `image`). Its `days[].locations[].ref` pattern already points to place-like IDs. The supplied `affiliates.js` mixes local and external logo URLs. **Don't break these readers in the first migration.**

Target transition:

```text
Existing:
  trips.js → raw images, places, itineraries
  atlasData.js → separate Atlas dataset (per code review supplied)

Intermediate:
  canonical media/place/journey + selectors
  compatibility exports returning legacy shapes
  old local and external URLs still supported

Final:
  canonical registries + associations → selectors → both UIs
  no duplicated editable media or place datasets
```

The separate `atlasData.js` file was identified in the earlier repository review but was **not provided with the uploaded files here**. Confirm its exact schema and component contracts from the repository before implementing adapters.

---

## 7. Discoverability and publication policy

Separate **asset existence**, **publication status**, **place availability**, and **editorial feature status**.

- An uploaded image does not automatically become a new map pin. Only a canonical place record can drive that.
- Publishing to an existing place adds the image to that place's available media.
- Publishing to a journey associates it with the correct visit; it must not pollute unrelated return visits.
- An experience may reference any already published media, with its own order, text, cover, and social links.
- Initial galleries can be auto-generated (e.g. recent published photos first); curated hero and intentional sequence take precedence.
- Optional safe defaults: derive alt text from a human title/place only as a placeholder flagged for review; do not fabricate a detailed visual description from EXIF.
- Social embeds are **references to external posts**, not owned media assets. Store these separately from R2 files.

**A robust first feature:** A place's media tab becomes populated automatically after publish, even if no story exists yet. Editorial stories can grow on top without blocking uploads.

---

## 8. Repository publishing: two viable options

### Option A — Git as canonical content store (recommended MVP)

1. Local processor completes upload and emits manifest to a private queue/outbox.
2. Ingestor validates manifest against current canonical places/journeys.
3. Ingestor writes normalized JSON files and association records.
4. Automatically commit **only machine-owned generated files** and push via scoped bot credentials. The routine production path requires **no human commit, PR merge, or deployment click**.
5. GitHub Actions runs validation, builds Vue, and deploys GitHub Pages on the bot push (verify workflow triggers and bot-token behavior).
6. Observe the workflow result; mark publication **Deployed** only after a successful deploy, ideally confirming the expected content version.
7. If validation fails, preserve the last good deployment and surface a concise actionable error in Lightroom. Do not silently force the change.

**Pros:** No database, minimal ops, content version history, fits existing GitHub Pages.  
**Cons:** Every new publication causes a build, Git write conflicts need retry/rebase, generated content must be changed deterministically.

**Suggested contract:** A single `scripts/ingest-publication.js <manifest>` command; no per-photo source edits. Import events serialized (one writer or queue) to prevent concurrent update races. Validation failures should leave the last known-good site intact. The ingestor (or a thin publishing runner) handles staging, committing, pushing, and deployment-status polling itself; Lightroom never needs Git credentials or a Git UI.

### 8.1 Automated Git publishing is part of the MVP, not an optional manual follow-up

**Normal production mode (unattended):** After accepting and validating a manifest, the publisher writes deterministic generated JSON, checks for an actual diff, commits with a dedicated bot identity, pushes to the deployment branch, and monitors GitHub Actions until the deployment succeeds or fails. If there is no content change, skip the commit/build. Maintain a durable job record linking `eventId` → Git commit SHA → workflow run → deployment result, so Lightroom can display the true status.

**Rollout mode (temporary):** During development, auto-create a PR from a publishing branch and optionally require review. This is a safety measure while schemas/selectors stabilize. It should be configurable to transition to unattended production commits once tests and rollback are proven. Avoid requiring routine PR reviews forever: they recreate the editorial overhead the system is intended to remove.

**Implementation safeguards:**

- Use a least-privilege GitHub App or fine-grained token stored only in the local publisher or trusted automation environment; never inside the public Vue bundle or manifest.
- Confirm that pushes made using the chosen identity actually trigger the existing Pages workflow. In particular, GitHub's default `GITHUB_TOKEN` has workflow-trigger restrictions; do not assume an automated commit starts another workflow.
- Serialize or rebase/retry concurrent publishes; never force-push over human changes. Prefer batch commits when one Lightroom Publish click yields many assets.
- Restrict automated writes to generated media/association files. Human-owned journeys, narratives, captions, curated heroes, and place records must not be overwritten.
- Gate deployment on schema validation, valid foreign keys, and successful R2 object verification; preserve the previous public site if a step fails.
- Use immutable asset revision keys and idempotent event IDs to make repeats safe. Report failure/pending status in Lightroom and support automatic retry with backoff.
- Do not treat a successful Git push as a successful website publish. Only the completed Pages deployment reaches **Deployed**.

**Minimal creator interaction after setup:** Lightroom publish collection inherits canonical journey/place mapping; artist edits photos and presses **Publish**. Everything from export, processing, R2 transfer, manifest ingestion, Git commit/push, Actions build, and deployment is automatic. When mapping is missing or ambiguous, ask once in Lightroom and remember the choice. Never invent a place/journey mapping just to keep the pipeline unattended.

### Option B — External catalog (later)

Store media/placement state in D1 with a public read API or generated snapshots. This enables immediate updates without building the site, but introduces schema migrations, API availability, caching, and more operational burden. **Avoid until Git-backed flow becomes a genuine bottleneck.**

**Do not confuse a manifest with the live database.** It is an event / handoff format; the normalized content registry remains the authoritative website-readable state.

---

## 9. Reliability, revisioning, and rollback

### 9.1 Publish state machine

```text
selected
  → exported
  → processed
  → uploaded
  → object-verified
  → manifest-accepted
  → content-committed
  → site-deployed
  → published
          ↘ failed / needs-attention / retryable
```

Persist per-job status in a durable local outbox (SQLite or filesystem journal). Jobs must survive process termination and internet loss. Retries reuse their `eventId`, `assetId`, revision and object keys. For a new revision of the same asset, serialize updates so an older completion cannot overwrite the current pointer.

### 9.2 Immutable output keys

Example:

```text
assets/ast_01JABC/r0001/gallery.webp
assets/ast_01JABC/r0002/gallery.webp
assets/ast_01JABC/r0003/gallery.webp
```

The public media record points at the current revision. This avoids stale CDN caches and makes rollback a registry-pointer change plus redeploy. Keep older renditions according to a retention policy; do not retain originals or private geolocation unless explicitly intended.

### 9.3 Failure matrix

| Failure | Required behavior |
|---|---|
| Lightroom export fails | No remote state change; show actionable error |
| R2 upload partially fails | Retry same job; no manifest points to incomplete revision |
| R2 upload succeeds; Git update fails | Keep uploaded immutable files, retry ingestion; previous website remains correct |
| Git commit succeeds; deploy fails | Retry deploy; preserve previous live version; show pending status |
| Lightroom crashes after remote accept | On restart reconcile by source mapping / event ID; do not mint a new asset |
| Photo removed from one collection | Remove only that association, never blindly delete shared media |
| Catalog restored / photo reimported | Offer match-and-relink workflow using canonical remote identity and source fingerprint |
| Destination ID no longer exists | Quarantine publication as needs-review; don't silently assign a different place |

### 9.4 Observability without a second app

Expose a lightweight **Publish Status** view inside Lightroom: last publish, queued, failed, retry, reconcile, view Atlas URL. Logs stay local; a summary is enough for day-to-day use. No standalone dashboard should be required to complete normal photography work.

---

## 10. Security / privacy / policy

- Public GitHub Pages app gets **read-only** media URLs and public-safe content; no upload credentials or GitHub tokens in frontend bundles.
- Prefer local R2 S3 uploads for the MVP. If adding a Worker, use strong authentication and scoped authorization; Workers can mint short-lived presigned URLs for direct R2 upload, but these work against the R2 S3 endpoint, not the `media.` custom domain.
- For large video, use multipart uploads; avoid passing large content through a single Worker request unnecessarily.
- Strip or round precise GPS, private notes, personal identities and unintended camera serial numbers before website publication.
- Keep a separate private archive in Google Drive / backups; public optimized R2 renditions are not a substitute for master-file backups.
- Preserve ownership, copyright and license metadata; don't copy third-party images to R2 unless permitted.
- Validate allowed file types and maximum sizes at the processing boundary. Hash files and verify successful uploads before changing public state.

---

## 11. Concrete implementation sequence

### Phase 0 — Audit + contractual decisions (no app behavior changes)

- Inspect actual `atlasData.js`, current Vue component consumers and selectors.
- Finalize canonical place/journey/visit/experience IDs; aliases for known mismatches.
- Confirm media registry versus editorial placement ownership.
- Define manifest JSON schema and build-time content validation.
- Decide how unpublished/removed Lightroom photos should affect placements.

**Exit criterion:** One written contract can represent a new photo, a revised photo, and a removed association without editing application source code.

### Phase 1 — Build the receiving side first (Canyonlands vertical slice)

- Create one sample publication manifest for a Canyonlands photograph.
- Implement `ingest-publication` idempotent upsert and schema validation.
- Register one canonical media record and place/journey association.
- Create `getPlaceGallery` and `getJourneyGallery` selectors.
- Adapt trip and Atlas views through backward-compatible exports; maintain current design.
- Validate that changing a rendition updates both interfaces, while a curated hero remains unchanged.

**Exit criterion:** Feeding one JSON manifest into the repository is enough to make the image appear in the right Atlas place and Utah journey after deploy. No hand-edited gallery array.

### Phase 2 — Local processor CLI

- Accept a rendered JPEG + metadata + destination IDs.
- Extract metadata and normalize gear references.
- Generate gallery/thumb variants and an immutable revision.
- Upload/verify R2 objects.
- Emit manifest to local durable outbox; invoke the ingestor, which automatically commits/pushes generated records and monitors the GitHub Actions deployment.
- Support retries, publish-status inspection, and restoration.

**Exit criterion:** One local command publishes an image end-to-end with the same stable asset on repeat publish, **without any manual Git commit, PR merge, or deployment step**.

### Phase 3 — Lightroom Classic Publish Service

- Implement a minimal Lua SDK publish integration.
- Map Publish Collections to canonical destination IDs (not parsed names).
- Record remote asset IDs and support Lightroom's modified-to-republish flow.
- Invoke local processor and show status/retry/reconcile inside Lightroom.
- Confirm re-edit / republish does not duplicate images or destroy curation.

**Exit criterion:** Edit → Publish in Lightroom → updated Atlas image under same `assetId` and place membership, with revision history, automatically committed and deployed to GitHub Pages.

### Phase 4 — Production polish

- Bulk publishing, Lightroom Smart Collections, optional editorial ordering.
- Catalog restore and multiple-computer reconciliation.
- Publish summaries and clear failures.
- Optional public photo technical panels / gear links.
- Add DaVinci/MP4 pipeline as a second producer of the **same manifest contract** (without forcing DaVinci to use Lightroom).

---

## 12. Acceptance tests for coding AI

1. **New photo:** Publish a Canyonlands photo into Utah 2025 → one media asset, one place association, one journey association; appears in both UIs.
2. **Republish:** Re-edit in Lightroom → same `assetId`, revision +1, new versioned R2 keys; all consuming views update automatically.
3. **Duplicate delivery:** Resend same manifest → no duplicate records or gallery entries.
4. **Out-of-order events:** Old revision arrives after newer → current rendition stays newer.
5. **Multiple journeys:** Same canonical place has two visits → image attached to the selected visit only, not both trips.
6. **Multiple placements:** Same photo in two stories → one R2 asset, two editorial usages; republishing updates both.
7. **Curated hero:** Automatic new image never silently overrides an editorially chosen cover.
8. **Missing/invalid reference:** Unknown place ID fails validation; site remains on last-good deployment.
9. **Removal:** Removing a collection association doesn't delete the underlying asset used elsewhere.
10. **Failed deploy:** Lightroom reports pending/error and provides retry; no false success message.
11. **Legacy content:** Existing `trips.js` image fields and affiliate logos continue rendering during migration.
12. **Privacy:** Public registry excludes source file paths, private location precision, serial numbers and credentials.
13. **Unattended deploy:** A valid Lightroom publication creates a bot-authored commit, triggers Actions, and updates Pages without a human touching Git.
14. **No-op publish:** Re-ingesting identical content creates no new commit or rebuild.
15. **Git conflict:** Concurrent publications are safely queued/retried and never overwrite human-authored changes.
16. **Deployment failure:** A pushed commit with failed Pages deployment stays pending/failed in Lightroom; it is not reported as live.
17. **Inherited mapping:** Photos in an already-mapped Publish Collection need no per-image assignment; unmapped destinations prompt in Lightroom, not another manager.

---

## 13. Suggested first instruction to coding AI

> First audit the actual application and create a **receiving-side vertical slice**, not the Lightroom plug-in. Treat Media, Places, and Journeys as canonical sources of truth, with Experiences optional for later story publication. Define a versioned, idempotent publication manifest. Implement an ingestion command that takes one manifest, validates canonical references, upserts one media asset plus its placements, and makes both the existing Atlas and trip UI consume the result through selectors. Preserve backward compatibility, the current visual design, and manually curated hero/order overrides. Start with Canyonlands. Do not add a database, new public backend, or standalone media manager. Demonstrate that republishing the same asset with a new revision updates both views automatically. The same vertical slice must include automated bot commit/push and GitHub Actions deployment monitoring, so there is no manual commit step. Use temporary PR review mode only while validating the automation, then switch to unattended publication. After that contract is proven, implement a local processing CLI, then the Lightroom Classic Publish Service as its frontend.

---

## 14. Technical references / implementation checks

- **Lightroom Classic SDK:** Publish Service callbacks, publish collections, remote photo IDs, and republish-trigger metadata. Validate the exact installed Lightroom SDK version and callback semantics before coding: https://developer.adobe.com/lightroom-classic/ ; SDK guide: https://ioconsolerykerprodcdn.azureedge.net/static/installers/lr/sdk/2022/cross_platform/v13/doc/Lightroom%20Classic%20SDK%20Guide_1655133965.pdf
- **Cloudflare R2:** Presigned upload URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/ ; uploads and multipart: https://developers.cloudflare.com/r2/objects/upload-objects/
- **Repository context:** Supplied `trips.js` and `affiliates.js`; a separate `atlasData.js` was described in the repository review but was not available for direct inspection in this document's preparation. All target schemas and examples are proposed designs, not existing project behavior.

**Design principle:** *Lightroom is where creative choices happen. The publisher moves bytes and records intent. The Atlas derives what to show from validated relationships. The creator never manages filenames, raw paths or hand-maintained gallery arrays.*
