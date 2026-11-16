---
id: editorial-sheet-authored-atlas-publishing
title: Archived Sheet-Authored Atlas Publishing Proposal v2
kind: historical
status: archived
implementation_state: none
created: 2026-11-15
updated: 2026-11-15
related:
  - content-model
  - media-pipeline
  - journey-media-ingestion
  - lightroom-publishing
  - docs-index
supersedes:
  - editorial-drive-to-atlas-publishing
superseded_by:
  - editorial-single-row-atlas-publishing
code_paths: []
verification:
  state: not-applicable
  evidence: []
---

> **Archived:** This normalized multi-tab authoring design was replaced by the
> accepted single-row Posts workflow. Preserve it as design history, not
> implementation guidance.

# Proposal v2: Google Sheets as the authoring interface for a living travel Atlas

**Project:** Roam With Justin  
**Audience:** VS Code / Codex implementation agent  
**Status:** Revised implementation proposal, not shipped functionality  
**Previous proposal:** `Roam_With_Justin_Sheets_Drive_to_Atlas_Automated_Publishing_Proposal.md`  
**Revision basis:** Repository review supplied by the creator on November 15, 2026 (`Pasted markdown(1).md`). The review's repository claims must be rechecked against HEAD before implementation.

> **Agent mandate:** Treat the existing application and its tests as the authority for *currently implemented behavior*. Adopt the creator's intended *future authoring model* described here. Do not present planned Experience/Moment entities, direct Sheet writes, deployment verification, or full automation as already implemented. Audit and preview before making changes. Never silently publish guessed facts, private family material, or new geography.

## 0. Executive decision - resolve the authority conflict

**Revised design principle:**

> **Google Sheets is the creator-facing authoring authority for newly Sheet-owned travel content. The repository contains a validated, generated, versioned publishing snapshot consumed by the static Atlas. Existing curated code remains the authoring authority for legacy code-owned records until intentionally migrated. R2 is the authority for published media bytes. A private durable ledger tracks synchronization, identity mapping, revisions, and deployment state.**

This replaces the narrower v1 notion that Sheets can only queue media into already-created Atlas records. It must now support **authoring new Journeys, Places, Visits, Experiences, and Moments**, as well as contributing media and story changes to existing ones. However, this is **not** permission to rewrite current curated `.mjs` files or assume generated files are safe to hand-edit.

**Critical non-goals:** No public Vue-to-Google API calls; no Google auth tokens in the website bundle; no second content database administered by hand; no forced re-authoring of 10 existing journeys; no new geo-pins based on unverified names; no dependence on Codex chat sessions for deterministic file transfer.

### Authority and conflict contract

| Object/layer | Authoritative write surface | Runtime/read behavior | Conflict rule |
|---|---|---|---|
| Existing curated Journey/Place/Visit/Atlas records | Existing repository source until migrated | Compose with generated content | Never overwrite curated sources from a Sheet row; request explicit ownership transfer |
| New Sheet-authored Journey/Place/Visit/Experience/Moment | Google Sheet + explicitly linked creator-approved Markdown input | Compile into machine-owned, validated Git records | Sheet is the editable source; generated Git is read-only to humans; detect ID/name collisions |
| Social releases and their scheduling | Existing `Posts` sheet tab | Only selected approved fields become Atlas contributions | Never rewrite captions/Instagram status from Atlas automation |
| Canonical Media identity and approved placements | Media registry + publication manifest and verified ingest | Site loads generated and curated Media | Source Drive filenames/rows are not asset IDs |
| Media object bytes and versions | Cloudflare R2 | Public URLs only after verified publication | Immutable or explicitly versioned uploads; no silent replacement |
| Local provenance/run state | Private durable ledger | Not served in public app | Reconstruct/reconcile from Sheet, repo, manifests and receipts; ledger alone must not be irreplaceable |
| Generated Git snapshot | Content compiler and Media ingestor | Static app imports published snapshot | No manual edits; regeneration must be deterministic and diffable |
| Deployment outcome | GitHub Actions + public verification | Status reported to Sheet | `Published` only after successful deployment AND actual expected public content validation |

**Ownership must be explicit per record, not inferred from its folder or creation date.** A curated Raptor location and a Sheet-generated Raptor Experience may coexist, but duplicate IDs or identical roles may not silently coexist. An owner change requires a reviewed migration, a content diff, and a rollback path.

## 1. The creator's actual workflow - preserve it

1. Select and edit original photos in Lightroom Classic; finish video in DaVinci Resolve.
2. Export an intentionally reviewed, public-safe batch to a local folder.
3. Upload that folder to Google Drive so the same files are accessible on the phone for Instagram.
4. Add or update a row in the existing Google Sheet, including social creative angle, status, caption, Drive Folder link, and Atlas destination/story notes.
5. Publish to Instagram on its independent schedule.
6. Local automation syncs the live Sheet and the approved Drive folder; compiles new approved editorial entities if necessary, invokes the existing media pipeline, validates and deploys the Atlas incrementally, and writes back a precise status and deep link.

The creator should **not** have to download Drive media a second time by hand, look up registry slugs, edit `.mjs` arrays, run separate `media:prepare`, `media:upload`, and `media:ingest` commands, or manually reconcile two social releases into one Atlas experience.

**Important:** Instagram posts are editorial releases, not Journeys. A Journey is a trip; an Experience is a particular outing/day/theme within that trip; a Moment is an optional perspective within an Experience; a Post is a scheduled social release. An Atlas entry can grow from many Posts over months. The Sheet controls these relationships using friendly choices plus immutable keys behind the scenes.

### End-to-end architecture

```text
                         GOOGLE SHEET
         Posts | Journeys | Places | Visits | Experiences | Moments
                  |                        |
        Social status/Drive URL     Approved firsthand content
                  |                        |
                  +------------+-----------+
                               |
                 Local Sheets sync + schema validator
                               |
                 Identity/ownership reconciliation
                   /                        \
                  v                          v
          CONTENT COMPILER             DRIVE IMPORTER
        Sheet/approved Markdown       List + snapshot files
          -> generated JSON           -> provenance + hashes
                  |                          |
                  |                 Existing media:prepare
                  |                          |
                  |                 Existing media:upload
                  |                      -> Worker -> R2
                  |                          |
                  |                 Receipt + media:ingest
                   \                        /
                    +------> VALIDATION <--+
                                 |
                     Controlled generated Git diff
                                 |
                    Approved commit / GitHub Actions
                                 |
                     Deployment and public verification
                                 |
                  Sheet status / Atlas link write-back

     Local private ledger: source identities, content hashes, receipts,
          retries, revision mappings and deployment reconciliation
```

**No automatic upload or publication merely because somebody pasted a Drive URL.** `Atlas Mode`, approval state, rights, and all required entity references must pass validation.

## 2. Repository baseline reported by the review (RECHECK ON HEAD)

The creator-supplied code review reports:

- Current content model separates **Media, Places, Journeys, Visits, Partners and Atlas presentation**, but does **not yet** have a canonical Experience or Moment registry.
- `media:prepare`, `media:upload`, and `media:ingest` are implemented as an R2-backed, check-summed publishing path; preserve and reuse them.
- The repository validator reportedly counted **10 Journeys, 77 Places, 71 Visits, 166 generated media placements, 65 Atlas nodes** at the time of review. These are a snapshot, not guaranteed current totals.
- Existing media can target Journey and supported Place/Visit associations. `scripts/lib/media-ingestion.js` reportedly **rejects a non-null Experience association** today. Never submit experience IDs to the existing ingestor until its model, validator and selectors explicitly support them.
- Journey and Atlas deep links exist, but **Experience and Moment deep links do not** yet exist.
- Pushing to `main` runs GitHub Pages Actions, but a controlled scoped Git publisher, deployment monitor, and public verifier are not yet implemented.
- Media preparation currently produces **new asset identities** and does not yet propagate `postId`, Drive source IDs, or durable republish mappings. Do not claim edited Drive exports can automatically republish prior assets without a new adapter.
- Source ordering currently may follow filesystem enumeration; that is insufficient to guarantee photo editorial order.

**Read/inspect at minimum:**

- `AGENTS.md`, `docs/README.md`, `docs/architecture/content-model.md`, `docs/architecture/media-pipeline.md` and related journey/media implementation docs.
- `package.json` scripts, `scripts/optimize-images.js`, `scripts/ingest-media.js`, `scripts/lib/media-ingestion.js` and current upload/Worker code.
- `src/content/media/index.mjs`, `src/content/media/generated/records.json`, Journey/Place/Visit indexes and selectors.
- `src/features/atlas/routes.js`, Journey/Atlas views, `.github/workflows/deploy-pages.yml`.
- Existing tests and validators. Review the actual image/video package and receipt schemas rather than copying an imagined one.

Return a short **existing / partial / missing** matrix with verified code paths and test results before changing files. If the supplied review is stale, the actual repo wins.

## 3. Canonical relationship model

```text
Journey: Europe, Summer 2026          [one trip]
  |-- Visit: Split, Croatia           [Journey <-> Place, chronological]
  |      |-- Experience: Raptor boat day       [one outing]
  |              |-- Moment: The vessel       [one perspective]
  |              |       `-- Post: Raptor Experience
  |              |-- Moment: Through my son's eyes
  |              |       `-- Post: Family Raptor Experience
  |              `-- Moment: Places along the route
  |                      `-- Post: future Croatia release
  `-- Other Visits / Experiences
```

**Cardinalities and boundaries:**

- Journey -> many Visits; a Place -> many Visits across trips. **Visit** represents the trip-specific stop, not the Place itself.
- One Experience may reference a primary Visit and optionally approved associated Place/Visit references (if genuinely multi-stop). Define those relationships explicitly; don't create fake geographic pins for boat-day concepts.
- One Experience -> many Moments; Moments can accumulate at different times and are ordered by explicit editorial/story order, **not by Sheet row number** or Instagram posting order.
- One Post -> normally one Moment in MVP, but allow a journey-only post with no Experience; preserve a path for multiple Post references per Moment later.
- One Media asset -> many approved placements; placements specify context and order independently. Importing an asset never automatically replaces a hero or rearranges curated order.
- A Post may use a **subset** of media for Instagram while the Atlas can include other separately approved images, but the importer must never assume a full private folder is public-safe.

**Cross-entity ID rule:** Store human-facing title separately from stable IDs. Rename titles freely without renaming canonical IDs. Use registry/export lookups; never derive an ID solely from display text, filename, Drive folder name, sheet row number, or map pin label.

### Concrete Raptor example

| Post row | Post ID | Experience ID | Moment ID | Different contribution |
|---|---|---|---|---|
| `Raptor Experience` | `post-raptor-vessel` (example) | `<existing-or-approved-raptor-experience-id>` | `moment-raptor-vessel` | Boat design, atmosphere, selected photography |
| `Family Raptor Experience` | `post-raptor-family` (example) | **same ID** | `moment-raptor-family` | Child's experience and different photography |

**Acceptance:** The second row adds a second Moment under exactly one Experience, keeps the first Moment and all old assets, and does not produce a second Journey or reset the narrative/hero. Raptor Experience IDs here are **examples**, not claims that those IDs exist.

## 4. Google Sheet: normalized authoring schema

**Keep the existing Posts columns unchanged:** `Location`, `Series/Post`, `Status`, `Account`, `Type`, `Caption`, `Drive Folder`, `Posted`. The supplied CSV includes rows beyond Roam; filter on `Account` (or explicit project ownership). Values like `View Caption` are placeholders, not usable approved content.

Create relational authoring tabs instead of bloating Posts into a database-like column wall. Use data validation for foreign keys and freeze/hide/protect ID/automation fields for mobile usability.

### 4.1 Posts - existing workflow plus Atlas linkage

| Column | Owner | Required? | Notes |
|---|---|---|---|
| Existing 8 columns | Creator | As today | Preserve social pipeline; `Status` never means Atlas publication status |
| `Post ID` | Automation | Yes | Stable immutable ID; assigned once; never row position |
| `Atlas Journey` | Creator-friendly picker | For Atlas processing | Friendly label linked to stable Journey ID |
| `Journey ID` | Automation | For Atlas processing | Hidden/protected resolved key; validated against blended catalog |
| `Atlas Experience` | Creator-friendly picker | Optional | Raptor day, Maho family day, etc.; parent Journey must be consistent |
| `Experience ID` | Automation | If selected | Resolved stable ID, not unreviewed generated slug |
| `Moment / Angle` | Creator | Recommended | `The vessel`, `Through my son's eyes`, etc. |
| `Moment ID` | Automation | When needed | Stable contribution identity |
| `Atlas Notes` | Creator | Optional | Firsthand notes, or a pointer to an approved Markdown brief; no AI-invented claims |
| `Atlas Media Order` | Creator or automation | Optional | Ordered Drive file IDs, separate Order tab, or explicit filename sequence; pick a clear contract |
| `Atlas Mode` | Creator | Yes | `Off`, `Prepare only`, `Publish approved` |
| `Rights Approval` | Creator | Required for publish | Explicit confirmation all selected media can be public |
| `Atlas Status` | Automation | Yes | Queue/processing/review/deployed states; independent of Instagram status |
| `Atlas URL` | Automation | After verified publish | Stable Experience/Moment URL if supported; otherwise Journey URL clearly labeled |
| `Instagram URL` | Creator | Optional | Real social permalink; do not infer from caption |
| `Sync Details` | Automation | Optional | Non-secret concise state/error/last completed time |

**Defaults:** Existing historical rows start with `Atlas Mode = Off` (or are left unmapped). Newly onboarded rows default to **`Prepare only` during rollout**. Change the new-row default to `Publish approved` only after credentials, permissions, rights, revisions, deployment recovery, and post-publication validation are field-proven and the creator explicitly opts in. `Ready`/`Posted` by itself is never public authorization.

### 4.2 Journeys - trip authoring

| Field | Meaning |
|---|---|
| `Journey ID` (protected) | Immutable generated canonical identity, or mapped existing curated ID |
| `Title` | Creator name, e.g. `Miami Winter Getaway` |
| `Start Date`, `End Date`, `Date Precision` | Dates can be unknown/approximate; don't invent dates from social Posted |
| `Summary`, `Story / Notes` | Approved first-person overview or reviewed source Markdown reference |
| `Cover Media ID` | Optional, only an already validated canonical asset |
| `Visibility`, `Content Approval` | Draft/approved/published state independent of media state |
| `Owner` | `sheet` for new, `code` for mapped legacy until migrated |
| `Source MD`, `Revision` | Optional linked narrative input + revision token |

### 4.3 Places - geography authoring

| Field | Meaning |
|---|---|
| `Place ID` (protected) | Stable identity with duplicate check against curated and generated Places |
| `Name`, `Parent Place ID`, `Category` | Verified geography / hierarchy |
| `Latitude`, `Longitude`, `Coordinate Status` | Optional; unresolved remains **not** a fabricated map pin |
| `Notes`, `Source / Verification` | Creator firsthand or verified citation; precise assertions need evidence |
| `Visibility`, `Approval`, `Owner`, `Revision` | Lifecycle and ownership |

### 4.4 Visits - journey-specific stops and chronology

| Field | Meaning |
|---|---|
| `Visit ID` (protected) | Stable stop identity |
| `Journey ID`, `Place ID` | Required validated foreign keys |
| `Visit Order` | Explicit itinerary order, independent of sheet rows or posting chronology |
| `Date / Precision`, `Notes` | Exact if known, otherwise null/approximate |
| `Approval`, `Owner`, `Revision` | Lifecycle and ownership |

### 4.5 Experiences - reusable outing/story within a journey

| Field | Meaning |
|---|---|
| `Experience ID` (protected) | Stable identity |
| `Journey ID`, `Primary Visit ID` | Existing validated parent references; allow intentional journey-level experiences if schema supports |
| `Title`, `Synopsis`, `Long-form Notes / Source MD` | Approved story framing |
| `Related Place/Visit IDs` | Optional explicit vetted multi-stop associations; do not infer from provider name |
| `Hero Media ID`, `Display Order` | Curated presentation controls, optional |
| `Approval`, `Visibility`, `Owner`, `Revision` | Independent lifecycle |

**Implementation note:** The current repo reportedly lacks an Experience registry. These fields become actionable **only after** the registry, selectors, validation, links and presentation are implemented. Until then, queue the proposal in a nonpublic draft state; safely publish Journey media only if specifically authorized, without writing a rejected `experienceId` to the old Media ingestor.

### 4.6 Moments - progressive first-person contributions

| Field | Meaning |
|---|---|
| `Moment ID` (protected) | Stable editorial contribution identity |
| `Experience ID` | The parent experience; optionally support Journey-level moments in an approved schema |
| `Post ID` | Associated social release, when applicable; allow no Post for Atlas-only writing |
| `Title / Angle`, `Notes / Story` | The boat; my son's perspective; an operator's personality; etc. |
| `Media IDs / Placement IDs` | Created from verified ingestor; not invented links |
| `Display Order`, `Captured Date / Precision` | Story or trip chronology, not social publishing sequence |
| `Approval`, `Visibility`, `Revision` | Incremental changes do not replace prior Moments |

### 4.7 Automation-managed auxiliary tabs

- **`Atlas Catalog`**: protected searchable/indexed mirror of **both** code-owned legacy and approved Sheet-owned generated entities; contains entity type, friendly label, stable ID, parent ID, owner, visibility, current Atlas URL, active/superseded marker. Refresh from compiled registry; do not hand-edit as a primary source.
- **`Sync Log`** (optional, hidden): per Post/entity sync outcome, non-secret error code, last build/deploy identifier, and timestamps. A readable convenience mirror, **not** the sole source of private run provenance.

### Identity provisioning and name lookup

1. Pull complete source tabs and the canonical content catalog.
2. Assign missing IDs in a **reviewable, conflict-checked** controlled step; use actual repository ID conventions, not examples above.
3. Write protected IDs back by stable row identity, re-read after write, and refuse duplicates/inconsistent parents.
4. Support friendly dropdown selection and human-readable disambiguation (`Raptor Experience - Split / Europe 2026`, for example).
5. If a creator selects `New experience`, stage a proposed new Experience record, allocate one ID, and obtain its own approval; never implicitly invent a Location/Place or claim media is published.
6. A deleted row is not an instruction to delete public content. Explicit `Archive` or `Unpublish` requires dependency checks, preview, approval, Git/deploy changes and measured status. Treat lost Sheet rows as a conflict, not deletion.

## 5. Two separate workflows: entity materialization and media transport

**Do not conflate editorial approval with R2 upload success.**

### Entity lifecycle

```text
DRAFT -> READY_FOR_REVIEW -> APPROVED -> MATERIALIZED
                                  -> VALIDATED -> DEPLOYED -> PUBLICLY_VERIFIED

NEEDS_REVIEW / BLOCKED / ERROR -> recover, never claim published
```

- Draft records can exist in Sheets without appearing on the public Atlas.
- Author approval is required before materializing new public locations, experiences, or unreviewed AI prose.
- `MATERIALIZED` means validated files were generated to the repo/worktree; **not live**.
- `DEPLOYED` means deployment completed; **not necessarily exposed at a checked deep link**.
- `PUBLICLY_VERIFIED` means the relevant content can be located as intended in the published site.
- A parent Journey may be published while some Experiences/Moments are draft; never display empty or unsupported story/pin cards.

### Media / Post lifecycle

```text
OFF -> QUEUED -> RESOLVED -> DOWNLOADED -> PREPARED
                                     -> UPLOADED -> INGESTED
                                     -> VALIDATED -> COMMITTED
                                     -> DEPLOYED -> PUBLICLY_VERIFIED
```

- A `Prepare only` run stops after source verification, schema checks, preview and **preparation without applied public ingestion**. Important: current preparation reportedly defaults placement status to `published`. Never invoke a committing ingestor on this mode.
- A `Publish approved` run requires approved parents, rights, complete/verified Drive snapshot, successful media receipts, and explicit deployment policy.
- If a new Experience is not yet supported or approved, hold its Moment/media placement and offer **explicit** Journey-only fallback when suitable. Do not quietly drop the Experience link while reporting success.
- If public deployment succeeds and Sheet write-back fails, **resume only the status update**. Avoid redundant uploads or extra Git commits.

### Transaction boundary

**Google Sheets, R2 and Git cannot participate in one distributed atomic transaction.** The orchestrator must use durable state, checkpoints, idempotency keys, prepared previews, and compensating/reconciliation behavior:

1. Snapshot approved Sheet rows / revisions and a consistent Drive folder inventory.
2. Compile planned content/entities and prepare media into a private working directory.
3. Validate **the entire planned publication** (entities, rights, references, associations, media existence, expected route and display).
4. Upload immutable/versioned R2 objects and obtain real receipts. Unreferenced uploaded objects on a later failure may remain as pending/orphaned; never destroy existing published assets during rollback.
5. Apply `media:ingest` and generated content in a staging worktree, run validators/build, inspect the diff.
6. Use an approved scoped commit/PR strategy; monitor deployment and verify public content.
7. Write back derived statuses/URLs to the specific Sheet Post/entity rows.

At every phase, if the source revision changes after the plan was created, **abort or resnapshot** before public publication. A lock file protects the local run; re-reading remote data guards against edits across devices.

## 6. Google access, scopes and local credential storage

### Desktop authentication

Use a **local installed-app OAuth 2.0** flow using an official supported Google client library, PKCE where supported, and loopback redirect on localhost. Reauthenticate when required. Store refresh tokens securely in OS credential storage or an explicitly ignored local config directory; no token files or client secrets in Git, frontend, R2 public bucket, generated manifests, or logs.

**Google APIs:** Google Sheets API (tab reads and controlled writes), Google Drive API (folder listing and binary download). Use configured spreadsheet ID, not public CSV scraping.

**Scopes are a real design choice - do not assume `drive.file` reads any pasted folder URL:**

- Try `drive.file` with an explicit user-grant/Picker or creator-owned app folder workflow. **Prove** that both the selected folder and its intended children can be listed/downloaded in the actual local app.
- A pasted arbitrary existing Drive folder alone does **not** guarantee `drive.file` has authorization for its contents.
- If the product strictly requires pasting any personally accessible Drive folder without Picker grants, discuss the broader `drive.readonly` scope and its **restricted-scope implications**, and obtain creator approval. Do not silently expand permissions.
- A separate Sheets read/write scope may be used to manage the designated workbook. Limit the workbook ID; the application should never iterate through unrelated sheets.
- Do not request broad Drive write/edit if Drive is only the read-only media handoff. Never make Drive media public merely to avoid OAuth.

### Concurrent Sheet editing

- Read columns by **header**, not index. Preserve existing eight columns and only mutate automation-owned cells or explicitly approved new authoring records.
- Re-read the row by immutable ID before write-back and compare a source revision/hash; if creator-edited fields changed, stop and reconcile.
- The Sheets API does not automatically provide compare-and-swap transactional protection for ordinary row updates. Implement best-effort optimistic checks, single-writer operational rules and conflict reporting; do not claim perfect remote transactions.
- Handle sorting, inserted rows, filtering, duplicate/missing IDs, and accidentally copied rows.
- Write new ID/owner/revision metadata carefully. Never use current row number as identity.

**Official reference checks (review API details at implementation time):**

- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/identity/protocols/oauth2/native-app
- https://developers.google.com/workspace/drive/api/reference/rest/v3/files
- https://developers.google.com/workspace/drive/api/guides/manage-downloads
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate

## 7. Drive download and source provenance

### One Post, one reviewed source folder (default)

- Parse only supported Google Drive folder link forms, validate the ID and actual MIME type, and use authorized Drive API calls to list children (pagination, permissions, rate limits).
- MVP: **flat media folder only**, or explicitly document a reviewed nested-folder mode. Never descend recursively through an entire trip archive by accident.
- Whitelist supported image and video formats against the existing media preparers. Skip Docs, shortcuts, hidden metadata, temporary exports, unknown types; report unsupported items by name.
- Stream downloads to an ignored temporary directory, sanitize paths, verify size and available Drive hashes against local SHA-256, then atomically move into a stable Post ID cache.
- Require source folder stability and creator Ready/approval status. A half-uploaded or modified batch must pause, not publish incomplete media.
- Record ordered source membership and file version metadata; re-query the folder before final publish to ensure the authorized source selection has not changed.
- If a parent folder contains both JPG/WebP and MP4, **partition it** into homogeneous image and video packages before invoking the current `media:prepare`/video preparation logic. Preserve **one parent Post ID** and the overall creator-approved order while keeping existing manifest schemas intact.
- Creator-owned exports for Instagram may be lower fidelity or stripped of EXIF; include an explicit source-quality acceptance. Don't promise original capture gear metadata from compressed social exports.

### Immutable provenance record - private ledger

Every ingested item should track:

```json
{
  "postId": "post-raptor-vessel",
  "driveFolderId": "<source-folder-id>",
  "driveFileId": "<source-file-id>",
  "driveVersion": "<observed-version-or-null>",
  "driveModifiedTime": "<observed-time-or-null>",
  "driveSha256": "<reported-when-available>",
  "localSha256": "<verified-local-digest>",
  "canonicalAssetId": "<stable-registered-asset-id>",
  "publishedRevision": 1,
  "sourceContentHash": "<normalized-source-hash>",
  "batchId": "<actual-media-batch-id>",
  "manifestRef": "<private-local-manifest-reference>",
  "receiptRef": "<private-local-receipt-reference>"
}
```

This JSON is **illustrative** and must not be checked into a public site bundle. If a private ledger is backed up, keep it secure; design enough safe, committed origin mapping for machine-loss recovery without leaking personal Drive IDs or other private data into public assets.

### Identity and republishing

- The first approved Drive media file creates or matches a canonical `assetId` using a persistent, explicit origin mapping after collision checks. File name is presentation, not identity.
- Same `driveFileId` and unchanged verified bytes -> noop; retries cannot create duplicate Media.
- Same `driveFileId` and changed bytes -> **propose a new explicit revision**, preserving prior asset ID if it is the same creative photo/video. Do not guess if the creator replaced the file with a different image.
- New Drive file ID, even with a similar filename -> **unknown identity** until source mapping or creator review. Source hashes can suggest candidates, not establish identity by themselves.
- Reprocessing with a new encoder version or export can generate new renditions/revisions; ensure the existing batch/versioning constraints are followed and prior published renditions remain resolvable.
- If two posts intentionally reuse one Media asset, use approved additional placements; no duplicate R2 upload if byte/identity policy permits reuse.

### Deterministic gallery ordering

Define a public order contract before implementing: explicit Sheet `Atlas Media Order`, a dedicated ordered media mapping tab, or a validated numeric filename convention if chosen by the creator. Sorting by Drive listing order, Node filesystem enumeration, upload time, alphabetic name for unnumbered files, or Instagram Posted date is **not** an acceptable default for curated presentation. Preserve order across Windows, CI and manual reruns. Never reset an existing curated hero/order on append.

## 8. Content compiler and generated record layer

### Compiler responsibilities

1. Validate exact normalized tab schemas, stable IDs, referential integrity, owner, approval/visibility and content provenance.
2. Resolve new Sheet-authored Journeys, Places, Visits, Experiences and Moments against **both** curated legacy and previously generated records.
3. Build an explicit dependency graph: Place + Journey before Visit, Journey + Visit before Experience, Experience before Moment, Media before related placements/hero references.
4. Materialize only **approved** records into machine-owned data files. Unsupported/unapproved entities remain in draft snapshots, never in published registries.
5. Compose generated and curated registries through the application's actual registration/selector APIs; do **not** introduce another hard-coded parallel list or edit retired `trips.js`/`atlasData.js` arrays.
6. Enforce unique ID and parent constraints across owner types; fail rather than silently replace curated content or create overlapping map markers.
7. Produce reproducible output: stable key order, deterministic ordering, no wall-clock noise in content hashes, and byte-identical generation for unchanged inputs.
8. Generate a human-readable **preview/diff** of new/updated routes, places and narratives before approval or deployment.
9. Preserve intent and voice: supplied trip Markdown is first-person source context, not automatically publication-ready fact. AI can propose copy, but actual published text must be creator-approved.

### Suggested boundaries (paths provisional)

```text
scripts/editorial/
  google-auth.mjs                # Google installed-app OAuth client
  sheets-client.mjs              # Normalize/read/targeted-write Sheets
  drive-client.mjs               # Authenticated source inventory/download
  content-catalog.mjs           # Curated + generated lookup/matching
  identity-ledger.mjs           # Stable source-to-ID / revision mapping
  content-compiler.mjs          # Approved new entity snapshots
  media-coordinator.mjs         # Reuses real media preparers/worker/ingestor
  publish-orchestrator.mjs      # States, locks, validation and scoped deploy
  cli.mjs                       # Operator front door

src/content/
  journeys/generated/records.json       # illustrative; inspect existing composition
  places/generated/records.json         # illustrative
  visits/generated/records.json         # illustrative
  experiences/generated/records.json    # illustrative, NEW model required
  moments/generated/records.json        # illustrative, NEW model required
  media/generated/records.json          # existing path, use current ingestor

local ignored working area:
  .cache/editorial/<postId>/...
  .state/editorial/ledger.json
```

**File paths are suggestions, not claims that these files exist.** Prefer reusing current content generators and app conventions. Only add new indexes and selectors if needed, with tests. Preserve existing double-quote/no-semicolon JS style.

### Data contract example - new Sheet-authored Experience (generated)

```json
{
  "schemaVersion": 1,
  "owner": "sheet",
  "source": {
    "tab": "Experiences",
    "recordId": "<approved-stable-experience-id>",
    "sourceRevision": "<approved-source-hash>"
  },
  "record": {
    "id": "<approved-stable-experience-id>",
    "journeyId": "<existing-canonical-journey-id>",
    "primaryVisitId": "<confirmed-visit-id-or-null>",
    "title": "Raptor Experience",
    "summary": "<creator-approved-copy>",
    "visibility": "published"
  }
}
```

**Privacy:** Don't copy OAuth credentials or confidential Drive folder/file URLs into generated public JSON. Public provenance needs at most an opaque safe source key; keep detailed Drive origin in private ledger. Normalize and sanitize external URLs in any public approved content.

### Content versus media approval

A new Experience might be editorially approved before any images are uploaded. Its public card must have meaningful approved content or remain hidden until minimum viable publication requirements are met. Conversely, media can be ready while the Experience is still a draft; those images remain staged or receive an expressly approved Journey-only placement. Don't invent an Experience association just to make the media ingestor accept a payload.

## 9. Routes and Atlas UI - implement before promising deep links

The review reports **no Experience or Moment routes today**. Decide stable public URL shapes after examining current router/Atlas link system. Proposed forms (illustrative, do not hardcode until reviewed):

```text
/journeys/<journey-slug>
/experiences/<experience-id>
/experiences/<experience-id>#moment-<moment-id>
```

- Support direct links from Instagram and the Sheet to the Experience or specific Moment when implemented; preserve current Journey/Atlas routes.
- For multi-stop outings, allow Experience to reference multiple real Places/Visits without duplicating geographic pins.
- The default Experience page should be a cohesive evolving story with optional Moment sections, not a flat wall of Post cards.
- Show a `Recently enriched` marker only when meaningful, approved media/story contributions were deployed; don't use sync timestamps as evidence of substantive content change.
- Implement desktop/mobile/keyboard behavior and deep link navigation with route tests.
- Until routes are real and verified, write a verified Journey/Atlas URL with a field describing its level; do not fabricate an Experience/Moment URL.
- Public route verification must test that the **specific expected record/asset** is visible, not just HTTP 200 on an SPA fallback HTML shell.

## 10. Publish orchestration, CLI and optional scheduling

### Commands (proposed; preserve current scripts)

```bash
# Pull metadata, validate authoring tabs, build planned content diff; no writes/uploads
npm run editorial:sync -- --dry-run

# Reconcile one row and downloaded media against existing app state
npm run editorial:plan -- --post <postId>

# Prepare one approved row to local artifacts only
npm run editorial:prepare -- --post <postId>

# After explicit authorization, run the entire validated publication workflow
npm run editorial:publish -- --post <postId>

# Inspect and retry last checkpoint; no re-upload if already verified
npm run editorial:status -- --post <postId>
npm run editorial:publish -- --post <postId> --resume

# Later: bounded single-instance polling while this Windows machine is online
npm run editorial:watch
```

The CLI, not a conversational AI session, performs deterministic networking, verification, checkpoints, and state transitions. Codex adds **review, reconciliation, narrative drafting and code maintenance**, not an implicit unreviewed permission to publish anything the Sheet contains.

### Automatic processing policy

- **MVP:** run a single easy command or VS Code task. New records default to `Prepare only`; no unattended public deployment.
- **Later:** Windows Task Scheduler polls approved rows periodically with a single-run lock and bounded API use. Computer must be on; no magical always-on sync from a closed local app.
- Only when proven reliable may creator opt in to `Publish approved` as a future new-row default. Existing rows are never bulk-opted in.
- If a row changes while a run is executing, invalidate or halt the affected plan. If folders change during download, resnapshot.
- Use a dedicated staging worktree/branch or scoped Git commit. Never `git add -A` against unrelated work; never push without explicit approved policy and conflict checks.

### Sheet write-back

After production confirmation, update only the matching immutable `Post ID` and automation-managed columns: `Atlas Status`, `Atlas URL`, `Sync Details`, timestamps and related derived identifiers. Do not modify `Status`, `Posted`, `Caption`, `Drive Folder`, or other creator fields. If write-back fails after deploy, the ledger should retry **write-back only**.

## 11. Testing, safety gates and acceptance criteria

| Case | Must pass |
|---|---|
| Existing Sheets and code-owned registry | Existing 8 post columns retained; existing curated records unchanged |
| Initial rollout with historical Drive URLs | All historical rows `Off`, no accidental public bulk publication |
| Mixed Drive folder | Supported images and videos partitioned and ingested with one Post ID and deterministic approved order |
| Drive folder mid-upload | Stable snapshot required, no partial public batch claimed complete |
| Scope with arbitrary pasted folder | Selected access demonstrated or explicit broader scope approval; no pretend success |
| New Miami Journey, Place, Visit from Sheet | Draft -> approval -> generated records -> verified valid Atlas visibility, without editing curated `.mjs` |
| Location missing coordinates | Remains unresolved/unpinned, never invented lat/long |
| Existing code-owned Place duplicate | Collision detected and mapped/reviewed; no second geographic marker |
| Raptor post 1 and post 2 | Same Experience ID, two distinct Post/Moment IDs, additive narrative and photo sets |
| Experience model not yet available | No rejected Experience placement to current `media:ingest`; safe staging/explicit fallback |
| Moment deep link | Only written to Sheet after route exists and public record can be verified |
| Sheet sorted/rows moved | Same stable Post IDs and correct targeted status write-back |
| Sheet concurrently edited | Re-read/revision comparison; conflict requires reconciliation |
| No approval / no rights confirmation | Cannot publish new entity or public media; prepare-only path available |
| Same row, unchanged source, repeated run | No duplicate Media, Moments, R2 versions, commits or URLs |
| Modified Drive bytes, same original source | Explicit revision handling, original asset identity preserved after review |
| New Drive file ID with same filename | No automatic identity substitution; review/match candidate |
| R2 multipart video/failed upload | Clean retry and receipt verification; no false complete state |
| Git dirty with unrelated edits | Publish affects only owned paths; no unrelated commits |
| Deployment succeeds but Sheet write-back fails | Retry Sheet write-back only |
| Deployment succeeds but content missing | Remain verification-pending, don't mark Published |
| Sheet row deleted | Detect disappearance, do not silently delete public Atlas content |
| OAuth or Worker credentials missing | Safe actionable error; no tokens printed or checked into Git |
| Family footage and rights | Explicit review/approval; no automatic publishing of private material |
| Build and docs lifecycle | Run actual content/media/build/docs tests; update architecture/index/status only when verified |

### Phase gates (implement one vertical slice at a time)

**Phase 0 - Read-only audit and authority schema**

Deliver a code-verified gap matrix, explicit entity ownership/migration policy, actual Sheet header validation and content schema changes. Document current package scripts, scope choice, safety requirements and route gaps. **No production publication.**

**Phase 1 - Read-only authenticated sync**

Connect to Google Sheets, validate `Posts` and proposed tabs, test access to one creator-approved Drive folder, produce a source file inventory and ID/collision report. No R2 uploads, generated public content, or Sheet mutation beyond expressly approved ID seeding.

**Phase 2 - Existing-record media vertical slice**

Use one approved Post targeting an existing Journey + Place/Visit. Download source, split media types, reuse prepare/upload/ingest, verify bytes and generated placement, then validate locally. Keep deploy/write-back behind explicit approval. Prove idempotence/retry. **Do not introduce Experience association prematurely.**

**Phase 3 - Sheet-authored Journey/Place/Visit compiler**

Generate one new approved Journey with real Place and Visit records into machine-owned files; compose with existing code-owned registries; preview and validate. Avoid duplicate pins, fabricated coordinates, and curated-source edits. Prove safe regenerated output and reversible ownership controls.

**Phase 4 - Experience + Moment data and routing**

Add minimal Experience/Moment model, schemas, validators, selectors, presentation and stable routes. Extend Media placement compatibility only with tests. Raptor: two Post IDs -> one Experience -> two Moments -> additive media, safe existing heroes. Support individual deep links after verifying actual behavior.

**Phase 5 - Scoped deploy, verification and write-back**

Implement controlled Git publication, Actions monitoring, actual content verification, and per-record Sheet sync results. Prove recovery when Git or Sheet is unavailable. Only `PUBLICLY_VERIFIED` becomes `Published`.

**Phase 6 - Optional local scheduler**

Add explicit opt-in Task Scheduler/single-instance watcher after production tests, quotas, security/recovery and rollout defaults have been accepted. No public webhook or cloud orchestration needed for MVP.

### Definition of done

A creator can author a **new** Journey/Place/Visit/Experience/Moment in Google Sheets, connect a reviewed Drive folder to a social Post, approve public content/rights, and trigger **one local publication workflow**. The system downloads and inventories the media, prepares/uploads/ingests through the **existing** Cloudflare R2 path, compiles approved sheet-authored content into generated source files, validates and deploys a coherent Atlas update, then writes the verified status/link to the correct Sheet row. A later Post contributes another Moment to the **same** Experience without manual IDs, duplicate records, lost heroes, or overwritten stories. Nothing assumes missing source facts or publishes on merely pasting a link.

## 12. Documentation and handoff instructions for Codex

1. Place the accepted proposal under `docs/proposals/` using the repository's metadata rules. Update `docs/README.md` and any index entry. Mark the v1 proposal superseded/archived **only after** this replacement is accepted and linked.
2. Read this proposal **together with the existing code, not instead of it**. Verify the review's reported counts/limitations; list concrete paths and line-level evidence for any discrepancy.
3. Produce a short phased plan with file list and rollback behavior. Prioritize Phase 0 and Phase 1 before attempting broader model changes.
4. Implement safe additive schemas and deterministic tools; use **double-quoted strings and no semicolons** in JavaScript, following existing project conventions.
5. Update architecture docs to reflect only completed, verified features. A proposal is not evidence that functionality is already live.
6. Do not fabricate OAuth clients, R2 configuration, commercial links, latitude/longitude, image rights, unpublished media or creator statements.
7. For each phase, report: changed source paths, user-facing operational steps, credentials needed (names only), test commands and actual outcomes, mocked vs production confirmation, unresolved approvals, rollback instructions, and documentation lifecycle updates.

## 13. Implementation briefing - copy to the coding agent

> **Inspect the actual Roam With Justin repository HEAD and this v2 proposal.** A previous review identified an authority gap: Google Sheets must support authoring new Journeys, Places, Visits, Experiences, and Moments, not merely queue Drive media into existing code-owned entities. Design Sheet-owned records that compile into versioned, validated Git snapshots while protecting curated `.mjs` records until explicitly migrated. Keep the public Vue application independent of Google APIs at runtime. Preserve the existing Posts columns, Instagram statuses, Lightroom/Resolve-to-Drive handoff, and current `media:prepare` -> `media:upload` -> `media:ingest` / Worker pipeline. First complete a read-only Sheets/Drive vertical slice and verify actual repository gaps. Then implement immutable Post/entity IDs, friendly catalog selectors, explicit media rights and content approval, mixed image/video partitioning, deterministic ordering, source provenance and republishing, and idempotent recovery. Create the Experience/Moment registry, validators, selectors, and links *before* accepting Experience-linked Media placements. Prove that two distinct Raptor Posts become two additive Moments within one canonical Experience. Add scoped deployment, public verification, and targeted Sheet write-back only after end-to-end validation. Stage all new public content for review; never silently invent locations, dates, claims, gear or commercial relationships. Update managed documentation as phases actually pass verification. Report file paths, test evidence, unresolved setup and decisions, and rollback instructions after each phase.

---

**North star:** *Export reviewed media once. Put it in Drive for Instagram. Author and link the story in Sheets. Run one safe local publication process. The Atlas grows as new approved Moments, Experiences, and Journeys are added; no duplicate trips, lost assets, or repeated manual ingestion commands.*
