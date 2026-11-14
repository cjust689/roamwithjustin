---
id: master-plan-ai-context
title: Historical Master Plan and AI Context
kind: historical
status: archived
implementation_state: unknown
updated: 2026-11-14
related: []
supersedes: []
superseded_by:
  - docs-index
code_paths: []
verification:
  state: unverified
  evidence: []
---

> **Archived:** Its AI-routing role is replaced by the
> [documentation index](../README.md). Preserve this file for product rationale,
> but verify every implementation claim against current architecture/source.

# Roam With Justin — Master Plan & AI Context

**Document type:** High-level orientation, decision hierarchy, and implementation roadmap for coding agents  
**Status:** Planning only — **do not modify application code or any existing reference documents based solely on this file**  
**Review basis:** Eight supplied Markdown documents, including the updated canonical architecture and Lightroom-to-Atlas publishing proposal.  
**Primary objective:** Make Roam With Justin an evolving, cinematic travel Atlas, while keeping the creator's routine effort focused on making and selecting work rather than file naming, uploads, content registration, Git operations, or site maintenance.

> **AI START HERE.** Read this document first. It explains how the narrower briefs relate, which guidance is current, what is already reported as complete, and which older instructions must *not* be interpreted as fresh implementation work. Examine the **actual current repository** before writing code: uploaded documents are design/context snapshots and do not prove the deployed state. For this planning request, make no changes beyond this newly created master document.

## 1. North-star product and workflow

The product is **not** a complete travel-guide database published all at once. It is a **living visual Atlas** whose geography, stories, images, videos, practical information, and relationships expand incrementally. A social post can introduce an Atlas story; the Atlas provides greater context, nearby discoveries, and lasting value. One social post does **not** imply one new map pin.

The creator's desired workflow:

1. Edit and curate in **Lightroom Classic** (photos) or **DaVinci Resolve** (video).
2. In Lightroom, add photos to an existing **Roam With Justin Publish Collection** with a saved place/journey/optional experience association; decide where to publish only when that cannot be inherited or matched confidently.
3. Click **Publish**. New photos create stable asset IDs. Previously published photos retain their ID and receive a new immutable revision when edited and republished.
4. A local processor exports/inspects media, extracts safe metadata, builds renditions, uploads to R2, and issues an authenticated, validated publication event/manifest.
5. The Atlas ingestor validates the event, applies it to **machine-owned generated** media/placement state, and automatically commits, pushes, builds, and deploys via GitHub Actions.
6. The public site uses selectors to present the new or updated media automatically. No routine gallery-path editing, R2 dashboard uploading, Git commits, PR merges, or deployment clicks.

**A second always-open media management app is a non-goal for photo publishing.** Progress, errors, reconciliation, and needed mapping decisions should be visible within Lightroom where feasible. The service/CLI can be headless. Video may use a local export + sidecar/CLI until a comparable Resolve integration is justified.

## 2. Decisions and system boundaries

| Concern | Authority | Key rule |
| --- | --- | --- |
| Photo source and develop settings | Lightroom catalog, source files, and backups | Lightroom is the creative authoring tool, not the website database. |
| Photo publish intent and local linkage | Lightroom Publish Service | Collection settings carry canonical IDs; titles/folder names are not database keys. |
| Canonical media ID, revision pointer, safe metadata, provenance | Git-backed canonical **Media** registry initially | A photo has one stable identity even when reused or republished. |
| Media byte delivery | Cloudflare R2, `media.roamwithjustin.com` | R2 is storage/CDN delivery, not an editorial database. Use immutable revision keys. |
| Geographic identity | Canonical **Places** registry | Coordinates and parent hierarchy live here, not in journeys or map rendering code. |
| Trip chronology, visits, routes and personal notes | Canonical **Journeys** registry | The same place can appear in multiple visits/journeys. |
| Published story/chapter and its own lifecycle | **Experiences**, when implemented | A social release may map to an experience or enrich an existing one; not necessarily a new pin. |
| Placement and presentation | Asset-to-place/visit/experience associations plus editorial overrides | Auto-discovered galleries and deliberately chosen hero/order/crop/caption must coexist. |
| Cameras, lenses, drones and equipment | Canonical **Gear** catalog | Match EXIF to trusted gear IDs; affiliate links live with gear/commercial records, not each photo. |
| Lodging, tours, venues, referral relationships | Partners/listings | Do not confuse a visited venue with a paid sponsor or affiliate. |
| Atlas and trip pages | Derived selectors/view models | **Neither** is an independent content source. |
| Public deployment | GitHub Pages / GitHub Actions | Static site reads generated data; no private Worker needed for ordinary page views. |
| Publishing API | Local processor + ingestor; Worker optional | Add a Cloudflare Worker only for a demonstrated remote-auth/multi-device need. |

**Current architecture note:** The uploaded *Atlas Asset Architecture* document explicitly describes the canonical Media/Places/Journeys migration as **complete**, including removal of legacy `trips.js` and `atlasData.js` authorities and a completed Canyonlands slice. The older review and EXIF documents describe those files as still present. **Do not rerun the migration by following an older checklist.** Verify the repository first; treat this newer architecture's completion report as the best available documentary account, not a direct code audit.

**Canonical naming note:** The architecture document uses `utah-winter-2025` as the journey ID. Some older publishing examples use `utah-2025`. Preserve the live canonical ID, and treat these examples as placeholders, not a reason to create a second Utah journey. Similarly preserve canonical place IDs and existing migration aliases.

## 3. Target publishing and ingestion flow

```text
Lightroom Classic (custom Lua Publish Service)
  |   export image + metadata + canonical collection mapping
  v
Local Publisher (Node; durable job/outbox)
  |-- reconcile Lightroom source <-> stable assetId
  |-- EXIF/IPTC inspection; allowlisted public metadata; trusted gear lookup
  |-- optimized image renditions (Sharp/etc.)
  |-- immutable versioned R2 upload + integrity verification
  `-- publication manifest/event after files are verified
              |
              v
        Atlas Ingestor (build/publish-side, NOT Vue runtime)
          validate schema, IDs, revision monotonicity, deduplication
          upsert canonical media + generated placements
          preserve manual story, hero, alt, crop and sequence overrides
          deterministic JSON generation; no-op if unchanged
              |
              v
        Git bot push -> GitHub Actions validate/build/deploy
              |
              v
        Vue selectors -> Atlas / trips / later experiences
              |
              `--> visitor fetches images and video from Cloudflare R2
```

### Contract between publisher and application

A **publication event/manifest** is a handoff contract, not the public database. At minimum, it needs:

- `schemaVersion`, unique `eventId`, operation type (`asset.upsert`, `association.upsert`, `association.remove`), and publication timestamp.
- Stable `assetId`, monotonic `revision`, kind, verified R2 object keys, rendition MIME/dimensions/checksums.
- Origin references sufficient to reconcile Lightroom catalog/photo identity; do **not** assume a Lightroom-local identifier remains globally stable through catalog merges/reimports.
- Safe metadata: camera/lens details and EXIF values when present, source attribution/confidence, rights and tags; do not leak serial numbers, private file paths or raw precise GPS.
- Verified `placeId`, optional explicit `journeyId`/`visitId`, optional `experienceId` and publication collection ID.
- Clear association **intent**; do not infer a journey solely from a place or automatically create a new map pin from an arbitrary filename.

**Ingestor outputs:** canonical machine-owned media records and asset-placement/association indexes (prefer generated JSON and a stable schema). View selectors join these to human-authored place/journey/experience data. **Do not generate a second canonical Atlas or Trip database.** Keep event history/outbox private; only expose a sanitized public snapshot.

### Publication lifecycle and trust

Use separate milestones: **Accepted** (job durably queued, safe to close Lightroom), **Committed** (R2 and Git state updated), **Deployed** (GitHub Pages deployment succeeded). Do not tell Lightroom an image is live merely because an upload, queue acknowledgment, or Git commit succeeded. Background jobs should support restart/retry, deduplicate `eventId`, serialize conflicting revisions, and avoid old retries overwriting newer content.

For republishing, preserve the asset ID; write `assets/<assetId>/r000N/...` and update only the current rendition pointer and appropriate source metadata. Existing usage relationships and editorial choices remain intact. For removing an image from one Publish Collection, remove that **association**, not the shared asset or its R2 bytes by default. Retain revisions under an explicit pruning policy.

Automated Git commit/push/deploy is a **required end-state**, not a permanent manual checklist. A PR review mode is permitted during rollout only. Use narrowly scoped credentials, deterministic generated files, build-time validation, concurrent-writer conflict handling, deployment verification, and a last-known-good rollback path. Confirm the chosen bot authentication actually triggers the Pages workflow; default GitHub Actions token pushes can have trigger limitations.

## 4. Automatic discovery versus editorial curation

The goal is **zero routine hand-edited gallery arrays**, not zero creative choices.

- An accepted association makes the asset eligible for its mapped place and, where explicitly assigned, a journey visit or experience.
- Auto-generated place galleries can enumerate published assets from the placement index.
- Journey views must use visit-scoped associations when available; a repeat visit to Zion should not automatically inherit every photograph ever taken there.
- The Atlas can show automatically available content without fabricating a story, pin, journey, hero, coordinates, or business partnership.
- A manually selected hero, ordered gallery, caption, crop/focal point, and alt-text override are **protected editorial state**. Republish must not overwrite them.
- Missing/ambiguous mapping should produce a concise Lightroom review item, not guessed geographic facts.
- Publishing media and publishing narrative are separate operations. An Experience may be progressively written/enriched later, while the already published assets remain available.

**Future improvement to evaluate, not a requirement now:** a lightweight generated **destination manifest** exposed read-only by the website so Lightroom can list the current canonical places, visits, journeys and experiences. Renaming a Lightroom collection must not change the stored IDs.

## 5. Media, R2, and metadata strategy

**Photo:** Export from Lightroom with retained EXIF into a private intermediate file; inspect it once using ExifTool, resolve recognized camera/lens models to canonical Gear IDs, generate public optimized renditions, strip unapproved private metadata, and record the normalized technical fields in Media. No browser-side EXIF parsing.

**Video:** Resolve exports commonly provide *delivery* properties (codec, dimensions, fps, duration/bitrate) but not reliable per-camera *capture* settings. Use `ffprobe` + ExifTool at ingestion and an optional sidecar or confirmed production notes. For multiple camera sources, label gear as **Equipment used** unless verified per-shot mapping exists. Use the **same canonical Media and Gear records**, not a separate video catalog. The video workflow can initially be CLI-driven; no requirement to build a Resolve plug-in just to match Lightroom's UI.

**R2:** The production media domain and bucket are already described as configured, and a Zion MP4 was reported working. Don't repeat bucket/DNS setup or silently rename that public object. Avoid uploading camera masters to public storage. Versioned media paths take precedence over older location-based filenames for *new* publisher-managed assets; existing public URLs can remain until deliberately migrated. For short videos use native poster-first MP4 playback, lazy loading, mobile testing and proper `Content-Type`/byte ranges. Longer videos may use YouTube; Instagram links/embeds are external social references, **not** owned R2 media assets.

**Uploads:** Keep R2 upload and Git write secrets outside Vue and public manifests. A local machine can initially upload directly to R2. An authenticated Worker + presigned uploads is an **optional future** simplification for multi-device access; do not require it for MVP.

## 6. Ordered delivery roadmap — avoid redoing finished work

The following are **decision gates**, not an instruction to implement every phase at once.

| Phase | Outcome | Dependencies / acceptance gate |
| --- | --- | --- |
| **0. Repository verification (next)** | Inspect deployed/current code and canonical registries, validators, selectors, GitHub Pages workflow, live R2 paths, existing gear/experience state. | Confirm which items in the completed architecture are actually present. **No edits during this planning request.** |
| **1. Ingestion contract and receiving-side prototype** | Define the manifest schema, generated placement layer, validator and Atlas selectors; ingest a synthetic/real Canyonlands event in dry-run mode. | A single event updates the intended gallery projection with no hand-edited image array; rejects bad IDs and preserves manual overrides. Do not repeat the already completed foundational migration. |
| **2. Durable local media publisher** | Node CLI/outbox for image inspection, asset ID reconciliation, rendition generation, R2 upload, manifest emission, retry/dry-run. | New photo and edited republish succeed idempotently; corrupted/incomplete media never enters public generated state. |
| **3. Automated Git publisher** | Ingestor writes only generated files, commits via bot, triggers existing Actions, waits for successful deployment, reports status. | Zero manual commit/PR/deploy on the routine happy path; safe retry and last-known-good behavior. Initial review-only rollout acceptable. |
| **4. Lightroom Classic Publish Service** | Lua plug-in with canonical Publish Collection mapping, republish detection, source-link reconciliation and clear statuses. | Lightroom edit -> Publish -> new R2 revision -> Atlas reflects it; no duplicate asset or repeated mapping. Validate SDK callbacks and catalog-ID semantics in a proof of concept. |
| **5. Technical enrichment** | Reusable Gear registry/alias resolver, photo Behind the Shot, optional video inspection/sidecars, privacy checks. | Only confirmed capture details appear; equipment links update centrally. Some work can be built into Phase 2's processor. |
| **6. Experiences and progressive release** | Standalone stories, direct links, latest discoveries, social-post relations and publication timestamps. | One Instagram post can enrich one existing place/experience without adding a new pin; stories remain optional when publishing photos. |
| **7. Optimization and commerce** | Automated batching, cache/performance, selective editorial gear/venue referrals, tasteful AdSense placements, analytics. | Maintain the photographic visual experience and verified sponsorship/affiliate disclosures. |

**Order nuance:** Implement the *Atlas receiving contract first* before spending substantial time on a Lightroom SDK plug-in. Automating Git deployment can be developed alongside local CLI proof-of-concept. Do not require a database, D1, Cloudflare Worker, or separate management UI as MVP prerequisites.

## 7. Documentation audit — what to read, what is superseded

All eight supplied documents retain **some unique value**. Based on the content reviewed, **none is fully obsolete as an entire reference file**. However, significant *implementation instructions within older files are superseded*. Do not delete or edit those originals yet. Treat this master plan as the reconciliation/priority layer.

| Reference document | Role / current value | Status for AI implementation |
| --- | --- | --- |
| `Roam_With_Justin_Atlas_Asset_Architecture_README.md` | **Canonical existing content architecture**; latest uploaded version reports full migration, current `.mjs` registries, selectors/validation, canonical ID `utah-winter-2025`. | **Primary structural authority.** Completed migration phases are historical context, not new tasks. |
| `Roam_With_Justin_Lightroom_to_Atlas_Publishing_Architecture.md` | Manifest-driven Lightroom Publish Service, local agent, event processing, Git automation, revisions, reconciliation, statuses. | **Primary future publishing architecture.** Interpret its sample IDs/file paths against the live canonical registries. |
| `Roam_With_Justin_Atlas_Content_Strategy.md` | Living-Atlas vision, Instagram-to-experience release, discovery UX, editorial narrative, retention. | **Keep.** Conceptually relevant; sample schema and media-URL examples are not competing authorities. |
| `Roam_With_Justin_Photo_EXIF_Gear_Integration_README.md` | Reliable EXIF ingestion, equipment alias mapping, private metadata safeguards, Behind the Shot. | **Keep as technical specialist reference.** Its older notes about `trips.js`/`atlasData.js` and manual CLI-first workflow are superseded when conflicting with completed migration/Lightroom orchestration. |
| `Roam_With_Justin_Video_Metadata_Pipeline_README.md` | Resolve/MP4 technical metadata boundaries, `ffprobe`, ExifTool, optional sidecar, gear attribution. | **Keep as video-specific reference.** Manual registry paste and manual R2 upload are fallback/early test methods, not desired permanent publication flow. |
| `Roam_With_Justin_Atlas_R2_Video_README.md` | R2 hosting, optimized MP4/posters, `playsinline`, lazy loading, range/seek, caching, delivery caveats. | **Keep as delivery reference; setup and hand-upload walkthroughs are largely historical** now that R2 and custom DNS are configured. Its location-based key convention is superseded for *new publisher-owned revisions* by immutable asset-ID paths. |
| `roam_with_justin_monetization_adsense_codex_brief.md` | Premium editorial commerce, accurate affiliate/partner claims, ad placement limits and trust rules. | **Keep; separate later workstream.** Do not let monetization control the ingest schema or clutter map/media UI. |
| `roam_with_justin_travel_context.md` | Firsthand travel history, confirmed vs planned distinctions, candidate places and stories, verification notes. | **Keep as evidentiary/editorial context, not a machine-verified trip database.** Canonical repository IDs win over suggested IDs when they conflict; do not publish unverified travel facts. |

### Fully obsolete files?

**None of the eight uploaded files is demonstrably fully obsolete** because each contains at least one substantive nonduplicated concern. They should not all be fed to an AI as *equal-priority directives*. The main redundant material is *procedural*: repeated manual-upload steps, earlier content-migration instructions, and schema examples predating the canonical architecture.

If a future cleanup is desired, retire or archive individual *sections* after the code and master plan have been verified. Do not silently delete the R2, EXIF, video or travel documents simply because their implementation phases changed. Duplicate `(1)` filename suffixes are upload artifacts, not separate versions to maintain.

### Conflicts explicitly resolved here

1. **Already migrated vs. still to migrate:** Follow the newer completed canonical-architecture account, subject to repository verification; do not recreate `trips.js`/`atlasData.js` as sources of truth.
2. **`utah-2025` vs. `utah-winter-2025`:** Use the actual canonical ID (`utah-winter-2025` in the latest architecture); examples are not authority.
3. **Location-based storage vs. immutable revisions:** Preserve old URLs; new publisher-owned assets should use stable asset ID + revision paths.
4. **Manual R2 uploads vs. fully automated publishing:** Hand upload is a bootstrap/diagnostic step only; Lightroom -> processor -> ingestor -> automated Git deploy is the desired recurring workflow.
5. **Gallery arrays vs. generated associations:** Canonical media/placement indexes drive default galleries; manual hero and curated usage remain protected overrides.
6. **Camera technical metadata vs. delivered MP4 specs:** Do not present final encode details as original capture settings.
7. **Git state vs. publisher manifests:** Manifest is a validated operation/event, not a replacement public database or direct Vue runtime dependency.
8. **The experience model:** A future domain, introduced when needed; avoid forcing a full story before each photograph can be published.
9. **Publication status:** A queued job, verified R2 object, Git commit, and deployed public page are distinct states.
10. **Commercial claims:** Verified first-person trips and gear usage only; no automatically invented sponsorships, affiliate URLs, or coordinates.

## 8. Open architecture decisions — resolve by prototype, not speculation

- **Publisher state and identity:** Which Lightroom SDK identifiers/custom metadata and publish callbacks are durable, and what restoration/reimport reconciliation actually requires. Create an early minimal plug-in spike, without turning it into the primary build track.
- **Generated output location:** Decide the precise `src/content/...` machine-owned file layout that fits the *existing* `.mjs` registries and validator. Consider generated JSON shards referenced by canonical registry composition rather than directly rewriting human-owned `.mjs` files. Prevent duplicate authorities.
- **Association semantics:** Define behavior when one Lightroom photo belongs to multiple Publish Collections, when moving/removing collections, or when visit-scoped vs place-wide publications collide.
- **Publication boundaries:** Agree on whether a place-only image becomes publicly visible immediately or waits for editorial approval, and whether pending drafts need a separate private R2 bucket. Public R2 files are accessible even if not linked from the site.
- **Commit orchestration:** Prefer one serialized writer/batched commits; choose scoped GitHub App/token; confirm Actions trigger and deploy-status polling; avoid CI feedback loops.
- **Fallback / outage UX:** Lightroom publish status should remain truthful when R2 uploads succeed but Git validation or deploy fails; retries should need no re-export when rendition bytes are already verified.
- **Data provenance:** Store camera/source identity privately; expose only allowlisted public metadata. Use verified alias matching, not automatic fuzzy ownership claims.
- **Rendition and revision retention:** Image variant sizes, original-storage policy, caching headers and old revision cleanup remain to be measured on real assets.
- **Video workflows:** Determine whether exported Resolve sidecar + local CLI provides enough automation; avoid a bespoke Resolve plug-in until needed.
- **Experiences and SEO:** Determine direct URL/story page/prerendering needs when Experience publishing is introduced; map navigation must not be the only path to an experience.

## 9. Non-negotiable quality and security gates

- One authoritative record per fact; no parallel Atlas/Trip/media stores.
- No silent new IDs or place/gear/visit assignments on weak evidence.
- Validation before each build; meaningful failures for missing references, duplicate IDs/keys, invalid coordinates, cycles, missing local files and bad object metadata.
- Stable asset identities; immutable revision keys; idempotent retry and monotonic revision selection.
- No automatic destructive delete of shared media; no editing of human-authored notes/hero selections from a routine media republish.
- Least-privilege R2/Git credentials only in trusted environments, never frontend JavaScript, generated public JSON, or uploaded EXIF.
- Separate private origin mappings/serials/GPS from public sanitized media metadata.
- Media optimized for mobile, poster-first video, reduced motion considerations, and native/direct navigation to stories.
- No made-up trip stops, visit dates, camera equipment, commercial relationships, product prices or affiliate entitlements.
- A failed ingest/deploy leaves the last known-good public Atlas functioning; job is traceable and safely retryable.
- Automated happy path must require **no routine app source edits, no Git step, and no second CMS**.

## 10. Instructions for the next coding AI session

> **Planning/audit instruction (first action):** Read `Roam_With_Justin_Master_Plan_AI_Context.md`, then the latest `Roam_With_Justin_Atlas_Asset_Architecture_README.md` and `Roam_With_Justin_Lightroom_to_Atlas_Publishing_Architecture.md`. Inspect the real current repository to confirm its canonical media/place/journey registries, validators, selectors and GitHub Actions configuration. Report discrepancies and propose the smallest manifest-ingestion vertical slice. Do not undo completed migrations, create a competing data store or perform unrelated UI changes. When given a planning-only instruction, make no code changes.

> **First later implementation task (only after authorization):** In dry-run mode, ingest one validated publication event for an already-registered Canyonlands place/journey using the live canonical IDs. Produce/resolve machine-owned media and placement records; demonstrate that the existing Atlas and trip selectors pick up the asset while a manually curated hero remains unchanged. Add tests for duplicate event, invalid ID, older revision, missing R2 object, and no-op repeat. No Lightroom plug-in, Cloudflare Worker, D1 or full UI required for this first slice.

> **Subsequent implementation task:** Add a local processing/publishing CLI with a durable outbox and then a minimal Lightroom Publish Service. Prove the key promise: *publish once, edit later, republish the same photo, automatically update the Atlas with the new revision, and complete deployment without manual Git operations*.

---

**Success measure:** The creator spends time selecting, editing and telling stories. The tooling quietly maintains identity, metadata, storage, relationships, publication history and deployment. The Atlas grows with each release without becoming a second job.
