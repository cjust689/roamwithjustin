---
id: editorial-drive-to-atlas-publishing
title: Archived Google Sheets and Drive to Atlas Publishing Proposal v1
kind: historical
status: archived
implementation_state: none
created: 2026-11-15
updated: 2026-11-15
related:
  - media-pipeline
  - journey-media-ingestion
  - content-model
  - lightroom-publishing
  - docs-index
supersedes: []
superseded_by:
  - editorial-sheet-authored-atlas-publishing
code_paths: []
verification:
  state: not-applicable
  evidence: []
---

> **Archived:** This media-queue-first design was replaced by the normalized
> v2 proposal, which was then replaced by the accepted single-row authoring
> proposal. Preserve this file as design history, not implementation guidance.

# Proposal: Google Sheets + Google Drive → automated Atlas publication

**Project:** Roam With Justin  
**Audience:** VS Code / Codex coding agent and project maintainer  
**Status:** Design / implementation proposal; **not a description of code already shipped**  
**North star:** *Edit in Lightroom or DaVinci Resolve → export a reviewed post folder → put it in Google Drive for Instagram → paste its Drive folder link into the existing Google Sheet → local publishing automation does the repeatable Atlas work, reusing the existing media pipeline.*

> **Agent instruction:** Start with a read-only audit. Inspect the current repository, `AGENTS.md`, `docs/README.md`, current architecture and implementation documents, package scripts, canonical content models, R2 Worker, and their tests. Reconcile this proposal with the actual latest code **before** implementing. The attached `media-pipeline.md` snapshot is dated November 14, 2026 and may lag newly committed Worker and video changes. Do not mark this proposal implemented or change production content simply because a design is described below.

## 1. Product intent and the actual creator workflow

### What happens now

1. Creator selects media in **Lightroom Classic** or edits videos in **DaVinci Resolve**.
2. Creator exports a reviewed set of final files into a local folder for a particular social post.
3. Creator uploads that folder to **Google Drive** so it can be downloaded on a phone for Instagram.
4. Creator adds/updates a row in an existing **Google Sheet**, including the post idea, creative angle, current status, and a **Drive Folder** link.
5. Creator posts to Instagram when ready.
6. Separately, creator/coding agent currently has to locate files and orchestrate `media:prepare`, R2 upload, `media:ingest`, story updates, validations, commits and deployment.

**Desired change:** Steps 1–5 are retained. Step 6 is consolidated into a trustworthy local publishing workflow driven by the same existing Sheet row and Drive folder; do not require the creator to download the folder twice, manually resolve IDs, rename files, or individually invoke every media CLI.

### The normal happy path

```text
Lightroom / Resolve → final reviewed social export folder
                    ↓
             Google Drive folder
               ├─ Phone downloads → Instagram publish (existing behavior)
               └─ Folder URL pasted into existing Google Sheet row
                                  ↓
                   Local editorial sync (VS Code / Codex / Node)
                                  ↓
                   Match canonical Journey + Experience
                                  ↓
                   Download approved source files from Drive
                                  ↓
                   Existing media:prepare → manifest
                                  ↓
                   Existing media:upload → Cloudflare Worker → R2
                                  ↓
                   Verified receipt → existing media:ingest
                                  ↓
                   Media registered and linked to Journey/Experience/Moment
                                  ↓
                   Validate, commit/deploy using repository's approved policy
                                  ↓
                   Write Atlas status + deep link back to Google Sheet
```

The whole operation must be **idempotent, resumable, and non-destructive**. Run it again next week to add a new moment to the same experience, not to create a duplicate journey or overwrite prior storytelling.

## 2. Source files and facts to preserve

### Existing Google Sheet export — observed columns

The supplied `Instagram - Sheet1.csv` contains these columns:

`Location`, `Series/Post`, `Status`, `Account`, `Type`, `Caption`, `Drive Folder`, `Posted`.

- `Status` is an **Instagram/editorial** state (`Idea`, `Stage`, `Ready`, `Posted`). Keep it independent of Atlas state.
- `Drive Folder` already contains some usable folder URLs.
- Both **Raptor Experience** (posted, with a Drive folder) and **Family Raptor Experience** (staged, no folder in the supplied export) exist as *distinct post rows* under Croatia.
- The same Sheet also contains non-Roam content, so **filter on `Account`** or explicit project ownership; do not import WebWorks Media rows into the travel Atlas.
- Some `Caption` cells currently say `View Caption`, not the actual caption body. Do not treat this string as prose suitable for publication.
- The CSV export is a snapshot, not evidence of a live connected Sheets API or any deployed connector.

**Do not destroy or reorganize the existing post columns.** Extend them minimally, with clear user-managed versus automation-managed ownership.

### Existing media architecture — documented snapshot

The attached `media-pipeline.md` documents:

- `media:prepare` resolves a canonical Journey, creates a prepared package of optimized numbered image files, versioned R2 object keys, and a `publication-manifest.json` with measured file metadata and explicit rights.
- `media:ingest` validates manifest and local bytes, requires a receipt or explicitly acknowledged verification policy, performs idempotent asset/placement updates, preserves curated placements on republish, and atomically modifies `src/content/media/generated/records.json`.
- `src/content/media/index.mjs` combines curated Media `.mjs` records with generated JSON; `getJourneyPublishedMedia()` allows automatically ingested assets to appear in the root Journey's **All photography** area without replacing heroes.
- The snapshot did *not* record direct R2 upload or a production batch. **The user subsequently reported committing new R2 Worker/publishing code. Audit HEAD; never use the old snapshot to claim that upload is still absent.**

The separate Worker upload proposal describes `media:upload`, an authenticated R2 Worker, remote integrity verification and an upload receipt. Reuse what actually exists; do not implement a parallel R2 uploader or relax verification because this feature calls it.

## 3. Canonical conceptual model — avoid conflating posts with experiences

```text
Journey (Europe 2026)
  └─ Experience (Raptor Experience: Croatia boat day)
       ├─ Moment A (The vessel / design / onboard atmosphere)
       │    └─ Social post A: Raptor Experience
       │         └─ Drive folder A → approved media batch A
       └─ Moment B (The day through my son's eyes)
            └─ Social post B: Family Raptor Experience
                 └─ Drive folder B → approved media batch B
```

**Terminology:**

| Identity | Ownership / meaning | Cardinality / policy |
|---|---|---|
| `postId` | Persistent **Google Sheet editorial row identity** | One ID per social release, **never** spreadsheet row number |
| `journeyId` | Canonical trip identity | Many posts/experiences can belong to one journey |
| `experienceId` | Canonical shared outing or experience | Many posts/moments contribute to the same experience; optional for journey-only content |
| `momentId` / `contributionId` | Incremental narrative angle within an experience | Usually one per post in MVP; preserve distinct creative perspectives |
| `assetId` | Canonical Media asset identity | A media asset may be used in multiple surfaces; never derived from filename alone |
| placement / usage | Approved associations and presentation (journey/experience/moment, order, hero, visibility) | Additive; existing editorial choices take precedence |

A *journey* is a trip; the Raptor boat day is more naturally an *experience within that journey*. Keep these identities distinct even if older Markdown conversationally calls every entry a “journey.” Reconcile with the actual schema: if `Moment` is not implemented, use the smallest compatible additive contribution model; don't force a wholesale data migration.

**Hard rule:** Another Instagram post that targets an existing `experienceId` is an *incremental contribution*, **not** a new experience and **not** a replacement of the experience narrative. Its `postId` and `momentId` remain distinguishable even if both posts share parent IDs.

**Chronology:** The order of posts in the Sheet and their `Posted` dates is independent from trip/experience chronology. Itinerary order comes from canonical Journey/visit data; moments can have optional explicit story order or capture date when verified.

## 4. Extending the existing Sheet — minimum sustainable schema

Keep the existing eight columns as-is. Propose the following additional columns (actual names may be refined to fit existing Google Sheets UI):

| New column | Owner | Purpose |
|---|---|---|
| `Post ID` | **Automation** | Stable immutable ID, assigned once and repaired/reconciled when missing; do not use A1 row positions |
| `Atlas Journey` | Creator dropdown | Friendly existing trip choice, e.g. “Europe 2026” |
| `Journey ID` | Automation, optionally hidden | Actual canonical registry key behind friendly choice |
| `Atlas Experience` | Creator dropdown | Friendly existing experience, e.g. “Raptor Experience”; optional |
| `Experience ID` | Automation, optionally hidden | Canonical experience key; never guessed from plain text |
| `Moment / Angle` | Creator | Distinct point of view: “The vessel”, “Our son's day” |
| `Moment ID` | Automation, optionally hidden | Stable narrative contribution identifier |
| `Atlas Notes` | Creator | Firsthand context; inline notes or link to an existing trip/moment `.md`, not mandatory |
| `Atlas Mode` | Creator | `Off`, `Prepare only`, `Publish approved`; default **Off** for existing rows |
| `Atlas Status` | Automation | Short human-readable state; separate from Instagram `Status` |
| `Atlas URL` | Automation | URL to the published experience or particular moment, if supported |
| `Instagram URL` | Creator or automation with explicit authorization | Permalink after posting, optional |
| `Sync Details` | Automation | Last result, short actionable error, time of run |

Do **not** require all columns to be visible on a phone. Group or hide machine IDs and sync internals; preserve the simple editorial experience. If a destination already has a controlled picker in the repository, use it rather than adding redundant fields.

### Optional additional tab: `Atlas Catalog` (read-only mirror)

Export canonical Journey/Experience choices from the website repo to a Sheet tab. Map friendly labels to immutable IDs, update via the publishing tool, and protect/mark managed ranges. The **repository remains authoritative**; the Sheet is not allowed to independently create conflicting canonical IDs.

Do not make the creator type or look up slugs. If one friendly label matches multiple entities, raise a review item. If an experience is genuinely new, propose its creation in the repo and only write its ID after it is accepted.

### Trigger semantics: the “paste a link and voila” experience

For **new opted-in rows**, enable automatic processing when all are true:

- `Account` identifies Roam With Justin.
- The Drive folder URL is present and valid.
- The row has a stable Post ID and a confidently resolved/approved Journey; Experience is either resolved or intentionally left journey-only.
- Instagram editorial state is `Ready` or `Posted` (configurable; `Stage` should not silently publish partial folders).
- `Atlas Mode = Publish approved` (or a deliberate equivalent approval flag). This establishes authorization to publish **everything selected in that folder** to the public Atlas.

**Important migration protection:** Existing rows with historic Drive URLs must **not** all publish simply because the new automation was installed. On introduction, initialize their mode to `Off`; allow deliberate opt-in/backfill in batches.

**Minimal-friction choice:** After a one-time explicit approval of this policy, new *Roam* rows may default to `Atlas Mode = Publish approved`. In that mode, changing the existing social `Status` to `Ready` **and** pasting the finalized reviewed `Drive Folder` link is sufficient to queue the Atlas publication—no per-item CLI or extra checkbox. Existing rows remain `Off` until reviewed. Make this behavior configurable and conspicuous in the Sheet guide, not an undocumented surprise.

For creators who prefer to preview first, `Prepare only` downloads/validates and prepares a dry-run without making it publicly visible.

## 5. Practical synchronization architecture

### Recommended MVP: local Node orchestrator, Codex for semantic tasks

Avoid building a second publishing web app or an always-on cloud backend. The deterministic pipeline should be **regular Node scripts** that Codex can invoke and inspect; don't require an AI chat session to perform file transfers or retries.

Proposed modules, **only where the repo does not already provide them**:

```text
scripts/editorial/
  google-auth.mjs             # OAuth / credential loading
  sheets-sync.mjs            # Read rows; stable IDs; targeted write-back
  drive-source.mjs           # Resolve Drive folder ID; list/download media
  catalog-resolver.mjs       # Canonical Journey/Experience mapping
  reconcile.mjs              # Plan contribution and detect conflicts
  publish.mjs                # Orchestrate existing media commands
  status-sync.mjs            # Safe status updates to Sheet
  cli.mjs                    # One front door for developer/operator

local ignored state (example):
  .cache/editorial/<postId>/source/
  .cache/editorial/<postId>/prepared/
  .cache/editorial/<postId>/receipts/
  .state/editorial/runs.json
```

Actual filenames and language extension must match the repository. Existing JavaScript style: **double quotes, no semicolons**. Do not create redundant wrappers if the existing `media:*` code exposes reusable functions.

The local cache is for efficiency/recovery **not the sole source of canonical identity**. Reconstruct stable associations from committed Post IDs, Media provenance, manifests and generated content if a machine is replaced.

### Polling versus event-driven automation

A **VS Code/Codex instance is not inherently a running cloud service**. It cannot react to a Sheet edit while the publishing computer is off.

Offer two operating modes:

1. **Immediate MVP:** one command / one Codex instruction processes all approved queued rows:
   `npm run editorial:run -- --ready`
2. **Convenience later:** a local scheduled sync via Windows Task Scheduler, or an opt-in local watcher with bounded polling and a single-run lock. It runs while that computer is available; it should not require an open Codex chat. Avoid frequent API polling, parallel jobs and accidental publicity.

The creator's desired experience (“drop folder, paste link, done”) is achieved via mode 2 *after* initial validation, or by an easy one-click command in mode 1. Do not imply truly automatic unattended publishing if the PC is not executing the agent.

## 6. Google authentication, Sheets and Drive access

### Google Sheets

- Use the official Sheets API to read the existing spreadsheet by configured Spreadsheet ID, not a scraped web UI or periodically exported public CSV.
- Retrieve rows by header name; normalize whitespace in existing statuses but do not silently modify their text.
- Assign immutable `Post ID` values once. Handle row inserts, filters, sorting, blank rows and duplicate Post IDs.
- Write **only automation-owned columns** after re-reading the current row by Post ID and checking for edits since plan generation. Sheets is collaborative; don't overwrite concurrent creator changes.
- Batch updates efficiently and record exact outcomes. A Sheets write is not a transaction with an R2 upload or Git commit; maintain a recoverable state machine.

### Google Drive

- `Drive Folder` is a **folder link**, not a direct media download URL. Parse and validate the Drive folder ID using a strict allowlist of supported Google Drive URL forms.
- Authenticate to the Drive API, verify the folder exists and the authorized account may list/download its contents, then list child files (paginated).
- Support selected image formats and verified video formats recognized by the current media pipeline. Skip Google Docs, shortcuts, thumbnails, text files and unsupported MIME types unless explicitly designed for them.
- Download binary files via the Drive API using file IDs, streaming to local temporary paths, then verify file length and available Drive checksums plus local SHA-256 before atomic renaming. Use safe filename/path sanitization.
- Record Drive `fileId`, folder ID, file version/modified time/size where available, and local content digest as *provenance*; never expose download OAuth tokens or private share links in the published website.
- Decide explicitly whether nested folders are supported; MVP may require a flat final-media folder with a helpful warning for nested items.
- Check the actual final file count, extensions, sizes, rights/visibility and quality. Do not interpret all contents of a general trip archive as approved for public release.
- Files may be reuploaded to Drive with new IDs or re-exported with changed bytes: detect this and reconcile prior `assetId`/revision rather than blindly registering duplicates.

**Photo quality consideration:** The exported images are optimized for Instagram and may be cropped/compressed. They are acceptable as an MVP source *if the creator approves that quality*, but offer optional future support for a `web/` rendition or higher-quality file in the same folder. Do not add an obligatory second Drive upload for MVP.

### OAuth and secret safety

- Prefer **installed/desktop OAuth 2.0** authenticated as the creator, with locally secured refresh-token storage outside Git. Sheet read/write and Drive read/download need appropriate scopes.
- Choose the narrowest scope that actually works for existing manually shared folders. `drive.file` may not expose arbitrary pre-existing folders merely because a link is pasted; evaluate Google Picker-based grants versus `drive.readonly` and document the implications. The latter is a **restricted** scope and may have Google consent/verification consequences for external distribution.
- Consider `spreadsheets` scope for write-back and `drive.readonly` only if the scoped alternative cannot access creator-selected folders. Avoid full Drive write permissions and service-account keys unless there's a compelling validated need.
- Credentials/tokens go into the OS credential store or Git-ignored local files with restrictive permissions; provide `.env.example` with **variable names only**.
- No `VUE_APP_*` secrets, public frontend OAuth tokens, R2 keys, Git commit credentials, or Google client secrets in repository/source, JS bundles, manifests, logs, or the Google Sheet itself.
- The Cloudflare Worker upload token/R2 binding continue to serve the existing media upload path. Google OAuth and Worker auth are separate trust boundaries.

**Reference documentation:**

- Sheets reading: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
- Sheets targeted write-back: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate
- Drive listing/download: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list and https://developers.google.com/workspace/drive/api/guides/manage-downloads
- Drive OAuth scope selection: https://developers.google.com/workspace/drive/api/guides/api-specific-auth

## 7. One-row publication state machine

### Stages — kept in a local durable processing ledger

```text
UNMAPPED / OFF
  → QUEUED
  → RESOLVED (post → canonical Journey/Experience/Moment)
  → DOWNLOADED (Drive media snapshot verified)
  → PREPARED (manifest and local files verified)
  → UPLOADED (Worker/R2 verified receipt)
  → INGESTED (canonical Media/placements updated)
  → COMMITTED (only intended repo changes recorded)
  → DEPLOYED (deployment completion confirmed)
  → PUBLISHED (public URL/media verified, Sheet updated)

Error / Needs Review → retry from last verified stage; no fake success
```

For the Sheet, compress granular status into: `Off`, `Queued`, `Processing`, `Needs review`, `Published`, `Error`. Detailed stages, hashes and error codes live in the machine-readable ledger and logs.

**Critical:** The pipeline is not fully published merely because objects exist in R2, `media:ingest` returned success, or a commit was created. Mark `Published` only after the appropriate GitHub Pages/static site deployment and public content visibility are confirmed. If automatic Git push is not authorized, finish at `Ready to deploy` and clearly say so.

### Failure recovery requirements

- Drive expired login or inaccessible folder → `Needs review`, preserve row and previous experience.
- Empty/partially uploaded folder → stop; optionally require folder stability across two polls or creator's Ready status before import.
- R2 413 / big video → use verified multipart support if present, otherwise block cleanly; never silently drop video.
- One failed file in a batch → no false complete receipt or public Atlas publication; retain per-object retry state and report exact issue.
- Duplicate or conflicting canonical IDs → review before modifying content.
- Sheet write-back fails after successful deployment → retry only write-back, not uploads/ingestion.
- Git dirty tree contains unrelated user edits → do not run `git add -A`; commit only approved generated/content paths, or use a dedicated branch/worktree/PR strategy.
- Process crashes after upload → recover from upload receipts and canonical records on next run.
- Source folder changes after preparation → invalidate stale plan and require re-preparation/new revision decision.

## 8. Reuse `media:prepare`, `media:upload` and `media:ingest`

**Do not replace the media pipeline.** Add a coordinator which calls its existing APIs or CLI with explicit canonical values.

### A. Prepare the source batch

For each approved Post ID:

1. Resolve the destination from the canonical Journey registry, not by guessing from `Location` or a filename.
2. Download a **snapshot** of final reviewed Drive files into a local Post ID directory.
3. Verify supported formats, sizes, source digest, rights and visibility.
4. Call the existing `media:prepare` with the explicit validated `journeyId` (and any supported experience/placement parameters). Use a tag only as a *human-readable alias*, never as identity authority.
5. Produce its native `publication-manifest.json` using the **existing format**. Extend it in a versioned manner only if the current format cannot carry `postId`, `momentId`, `experienceId`, and Drive provenance through a trustworthy companion record.

**Do not manually rewrite generated filenames or bypass collision/revision logic.**

### B. Upload the prepared files

1. Invoke current `media:upload` and its authenticated Cloudflare Worker/R2 binding.
2. Use its existing upload receipt and checksum/byte verification contract; do not replace with “HTTP 200 = success.”
3. Preserve versioned immutable R2 keys and any already implemented multipart support for larger videos.
4. Do not upload the private local source folders, OAuth tokens or internal planning manifests into a public media namespace.

### C. Ingest and link context

1. Pass the verified manifest/receipt to existing `media:ingest`.
2. Update canonical Media records/associations via supported generated ingestion paths (documented snapshot: `src/content/media/generated/records.json`).
3. Add approved journey-level media to the existing fallback **All photography** collection.
4. Where a canonical `experienceId` and `momentId` are confirmed, create or update **only that contribution** and its context-specific placements. Keep the parent experience ID stable.
5. Preserve manually selected heroes, gallery order, place geographies, image rights and previously published narratives.
6. Never assert specific wildlife, people, equipment, place coordinates, creator experience, affiliate relationships or per-image EXIF without source evidence/review.

### D. Validate and deploy

- Run the repo's relevant tests and validators, including `npm run media:test`, `npm run content:validate`, `npm run build` if those commands still exist.
- Generate a preview/report for optional narrative edits before publication. **Media-only publication to an already approved canonical Journey may run automatically** when the creator opted in.
- Where new experience creation or AI-written narrative is required, stage a proposal and request review; do not publish speculative copy as fact.
- Use a controlled Git branch/commit/deploy strategy. On GitHub Pages, registering media in Git is not the same as making it visible to visitors; confirm deployment and a real deep link.
- Write back the resulting `Atlas URL`, short status and timestamp; do not mutate Instagram's `Posted`/caption fields.

## 9. Incremental storytelling — the feature that makes the pipeline valuable

**Example: Raptor Experience**

### Week 1 — The boat itself

- Sheet row: `postId = post-raptor-boat`; `journeyId = <resolved Europe ID>`; `experienceId = <resolved Raptor ID>`; `Moment / Angle = The vessel`.
- Approved Drive Folder A contains only the chosen vessel/onboard images and/or clip.
- Orchestrator prepares, uploads and ingests the assets.
- Atlas receives **Moment A** (or an equivalent contribution record), linked to the existing Raptor experience.
- The main experience's prior hero or narrative remains intact.

### Week 4 — A family perspective

- Sheet row: `postId = post-raptor-family`; **same** `journeyId` and `experienceId`; distinct `Moment / Angle = Through my son's eyes` and a distinct Post ID.
- Approved Drive Folder B contains a different selected set.
- Orchestrator contributes **Moment B** to the *same* canonical experience.
- Existing media and Moment A stay in place. The page may display a new section, richer gallery and a “recently enriched” timestamp as appropriate.

**No 1:1 assumption:** A post can become one moment, several posts can enrich one experience, a moment can reference previously ingested media, and a journey can contain multiple experiences. Any expansion beyond the MVP relationship should preserve stable IDs and explicit editorial approval.

### Narratives and Markdown

- Keep supplied travel `.md` briefs as **editorial input**, not duplicate canonical databases.
- If there's an existing approved narrative, add a clearly scoped contribution or propose a targeted revision; never append generic AI prose blindly.
- `Atlas Notes` may be short firsthand notes, or a link/path to a local tracked `.md` entry. Distinguish source-provided observations from inferred descriptions.
- Store social captions separately from Atlas long-form story paragraphs. A new Instagram caption should not overwrite the website's existing story.
- `Recently enriched` should be driven by verified meaningful content additions, not simply sync timestamp updates.
- For historical Posted entries, support reviewable incremental backfill with incomplete metadata: start with a Journey placement, then enrich Experience and Moment associations later.

## 10. Format contracts (illustrative, not a replacement of current schemas)

### Normalized Sheet row — internal representation

```json
{
  "postId": "post-raptor-family",
  "account": "Roam",
  "seriesPost": "Family Raptor Experience",
  "socialStatus": "Stage",
  "socialType": "Carousel",
  "driveFolderId": "<resolved-folder-id>",
  "journeyId": "<canonical-journey-id>",
  "experienceId": "<canonical-experience-id>",
  "momentId": "<stable-moment-id>",
  "momentAngle": "Through my son's eyes",
  "atlasMode": "Publish approved",
  "atlasNotes": null
}
```

Placeholders are deliberate. **Never store actual OAuth credentials, tokenized URLs, phone download links or unverified business IDs here.** The fact that the supplied historical Raptor Family row currently says `Stage` and has no Drive link means it would **not** qualify for automatic publication yet.

### Provenance / batch linkage — conceptual fields

```json
{
  "schemaVersion": 1,
  "postId": "post-raptor-family",
  "momentId": "<stable-moment-id>",
  "journeyId": "<canonical-journey-id>",
  "experienceId": "<canonical-experience-id>",
  "driveSource": {
    "folderId": "<google-drive-folder-id>",
    "files": [
      {
        "fileId": "<google-drive-file-id>",
        "version": "<observed-version>",
        "sha256": "<local-verified-content-digest>"
      }
    ]
  },
  "preparedManifestPath": "<existing-manifest-path>",
  "uploadReceiptPath": "<existing-receipt-path>"
}
```

In production, separate **public canonical content** from private source provenance/local paths as appropriate. Source file IDs, Drive folder IDs and machine-local paths are not visitor-facing data and should not appear in the deployed bundle by accident. The private run ledger may carry them; canonical Media may store only safe, stable origin references needed for reconciliation.

## 11. CLI and developer ergonomics

Proposed public-facing commands; **adapt to existing `package.json`**:

```bash
# Read the latest Sheet, hydrate its canonical choices, report queued rows
npm run editorial:sync -- --dry-run

# Process all approved rows using the existing media preparation/upload/ingest chain
npm run editorial:run -- --ready

# Process exactly one immutable Post ID and preview its impact
npm run editorial:run -- --post post-raptor-family --dry-run

# Retry a previously interrupted run, never duplicate its published assets
npm run editorial:run -- --post post-raptor-family --resume

# Optional: local polling while the creator's computer is running
npm run editorial:watch
```

A nice VS Code / Codex entry point:

> “Sync my Roam With Justin editorial sheet. Identify Ready/Posted rows that have an approved Drive folder and `Atlas Mode = Publish approved`. Reconcile the canonical Journey/Experience, download and validate selected media, reuse the current media:prepare → media:upload → media:ingest workflow, preserve existing stories and heroes, report any editorial decisions, and update the Sheet's automation-owned fields after verified deployment.”

**Do not rely on Codex remembering a conversation** to process a row correctly. Commands, typed schemas, idempotency and tests must determine behavior.

## 12. Tests and acceptance criteria

| Test | Expected result |
|---|---|
| Existing Raptor post + future Family Raptor post | Distinct Post IDs and Moment IDs, **same** canonical Experience ID, no duplicate journey or place |
| New approved Drive folder linked on Ready Roam row | Source fetched via authenticated Drive API, prepared/uploaded/ingested, intended Atlas target updated |
| No running local watcher/task | No false claim of automatic processing; next run picks up queue |
| `Stage` row or `Atlas Mode = Off` | No public upload even if a Drive URL exists |
| Existing 23 historical folder links on initial migration | None silently bulk-imported or publicly published |
| `Account = WebWorks Media` | Skipped for this Atlas workflow |
| Sheet is sorted or a row inserted | Stable Post IDs maintain correct associations and write-back |
| Source file name collision or repeated file | Existing asset/revision policies respected; no duplicate asset IDs |
| Folder contents change between sync and prepare | Reconciliation/preparation invalidated; never publish stale batch |
| Same post processed twice unchanged | No new R2 objects, duplicated moments, gallery placements or git commits |
| Same post with genuinely edited export | Explicit revision path/approval; previous media identity preserved |
| Folder includes unsupported/oversize video | Clear review/error unless current upload path supports verified multipart; no silent omission |
| Existing curated hero / story | Left unchanged unless expressly approved |
| Missing Journey or ambiguous Experience | `Needs review`; no speculative entity or geographic pin creation |
| R2 upload succeeds but Sheet update fails | Resume updates status only; never reupload unnecessarily |
| Invalid/missing OAuth credentials | Graceful auth error; no credentials printed or committed |
| Git tree contains unrelated work | No accidental commit of unrelated changes |
| R2 or ingest fails mid-batch | No false `Published` status; durable recovery from last verified stage |
| Deploy reports success but deep link is unavailable | Remains in deploy verification state; not prematurely marked Published |
| Optional Atlas media from Instagram-ready exports | Explicit quality acceptance; no unreviewed hidden/private family files |

Run/record actual repository test commands. Add automated Sheets/Drive API mocks, Worker uploader mocks, integration tests with prepared manifest and receipt fixtures, and a real one-row smoke test using a non-sensitive approved folder. CI must not need production OAuth or Worker secrets to run unit tests.

## 13. Implementation milestones (do not overbuild)

### Phase 0 — audit and contract alignment (read-only)

- Audit actual HEAD, `docs/README.md`, `AGENTS.md`, Google Sheet schema, canonical Journey/Experience/Media types, video behavior, `media:prepare` CLI flags, Worker upload/retry/receipt, `media:ingest`, site deployment, docs lifecycle.
- Write a discrepancy report: **existing / partial / missing**. If current code supports experience-level placement or moment contributions, reuse it. If not, propose the smallest additive capability and tests.
- Confirm Google OAuth model and Drive folder accessibility without exposing credentials.

### Phase 1 — one authenticated read-only sync

- Read current Sheet, identify rows by immutable Post IDs, safely parse Drive folder links.
- Resolve friendly Journey/Experience selections against the authoritative registry; report ambiguity and duplicates.
- Download one reviewed folder to an ignored local cache and emit a deterministic source inventory; no uploads/publication.

### Phase 2 — automated media transport and ingestion

- Wire one orchestrator to the existing media pipeline, including publication manifests, Worker upload verification/receipt, generated media registration and recovery.
- Make it idempotent with real source provenance and persistent associations.
- Initial vertical slice: one already approved Raptor Experience post.

### Phase 3 — incremental Experience/Moment model

- Ensure distinct posts can target the same Experience, each contributing new narrative/media without overwriting earlier contributions.
- Implement minimum experience page presentation/selector integration if not already present; keep the Atlas's visuals primary.
- Stage AI-generated editorial changes for review when creator notes are incomplete.

### Phase 4 — two-way Sheet sync and deployment reconciliation

- Add protected ID/canonical-name dropdowns or an `Atlas Catalog` mirror, targeted managed-column write-back and status reconciliation.
- Add controlled commit/deploy policy, public verification and Atlas deep-link recording.
- Handle prior Posted rows through explicit backfill opt-in.

### Phase 5 — optional truly hands-off local scheduling

- Windows Task Scheduler or a local watcher checks for approved rows periodically with a single-instance lock and graceful exit/retry.
- Do not introduce a public webhook/backend, cloud queue or Google Apps Script trigger unless local scheduling proves insufficient.
- Consider mobile-friendly success notifications only after the sync is reliable.

## 14. Agent acceptance report and documentation lifecycle

At the end of each phase, the coding agent must deliver:

1. What was already implemented versus created/changed, with exact verified source paths.
2. New or changed config/environment variable **names only**, Google Cloud setup and OAuth consent requirements, secrets storage and `.gitignore` rules.
3. Actual commands and sample non-secret invocation.
4. Tests run and results; label mocked versus production verification.
5. Which existing sheet columns and canonical registry files it reads/writes.
6. A clear reconciliation example of two Raptor posts → one Experience → two moments/media batches.
7. Any remaining manual steps, safety gates or unsupported source formats.
8. Updates to `docs/README.md`, relevant current architecture and proposal status in accordance with the repository's documentation lifecycle rules.

**Definition of done:** The creator can keep the familiar Lightroom/Resolve → Google Drive → Instagram workflow, paste the reviewed folder link into a row with a resolvable canonical Atlas target, and—with one approved local automation trigger—have the files securely downloaded, prepared, uploaded to R2, ingested, linked, validated and deployed without managing individual upload commands. Subsequent social posts grow the same experience safely and the Google Sheet reports the real publication state.

## 15. Things explicitly **not** in scope for the first pass

- Replacing Google Sheets with a custom admin website or building a new full CMS.
- Uploading unreviewed Lightroom catalogs, raw originals, private family collections or source movies by default.
- Replacing the existing R2 Worker or publication-manifest contracts.
- Using the Google Sheet row number, folder name, source filename or Instagram caption as canonical Media/Experience identity.
- Mass-importing all historical posted content without explicit opt-in.
- Automatically inventing trip dates, routes, experience histories, partner URLs, gear usage or narrative meaning.
- Declaring social content posted or Atlas content published based only on a file transfer.
- Publishing Google OAuth, Worker or Git credentials to GitHub, the frontend, R2 public media URLs or sheet cells.
- Assuming the creator's local VS Code/Codex session executes unattended while their computer is powered off.

---

**Design principle:** **Google Sheet = editorial queue. Google Drive = reviewed media handoff. Node orchestration = repeatable automation. Codex = semantic reconciliation and optional writing. Canonical Atlas content = published truth. Cloudflare R2 = media delivery. Instagram = independent social release.**
