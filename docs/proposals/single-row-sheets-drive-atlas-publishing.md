---
id: editorial-single-row-atlas-publishing
title: Single-Row Google Sheets to Living Atlas Publishing
kind: proposal
status: approved
implementation_state: partial
created: 2026-11-15
updated: 2026-11-16
related:
  - content-model
  - media-pipeline
  - journey-media-ingestion
  - lightroom-publishing
  - docs-index
supersedes:
  - editorial-sheet-authored-atlas-publishing
superseded_by: []
code_paths:
  - scripts/editorial-baseline.mjs
  - scripts/lib/editorial-baseline.mjs
  - scripts/lib/editorial-google-auth.mjs
  - scripts/lib/editorial-google-sheets.mjs
  - scripts/lib/editorial-google-drive.mjs
  - scripts/lib/editorial-google-migration.mjs
  - scripts/lib/editorial-google-catalog.mjs
  - scripts/lib/editorial-google-bindings.mjs
  - scripts/lib/editorial-place-suggestions.mjs
  - scripts/lib/editorial-place-decisions.mjs
  - scripts/editorial-migrate-sheet.mjs
  - scripts/editorial-build-catalog.mjs
  - scripts/editorial-bind-places.mjs
  - scripts/editorial-bind-journeys.mjs
  - scripts/editorial-suggest-places.mjs
  - scripts/editorial-bind-reviewed-places.mjs
  - scripts/editorial-publish.mjs
  - scripts/editorial-github-audit.mjs
  - scripts/editorial-github-configure.mjs
  - scripts/lib/editorial-content-compiler.mjs
  - scripts/lib/editorial-github-publisher.mjs
  - scripts/lib/editorial-google-publication.mjs
  - src/content/experiences/index.mjs
  - src/content/editorial/generated/records.json
  - .github/workflows/editorial-publication-ci.yml
  - scripts/test-editorial-baseline.mjs
  - scripts/test-editorial-google.mjs
  - scripts/test-editorial-migration.mjs
  - scripts/test-editorial-catalog.mjs
  - scripts/test-editorial-bindings.mjs
  - scripts/test-editorial-place-suggestions.mjs
  - scripts/test-editorial-place-decisions.mjs
  - docs/implementation/editorial-sheet-publishing.md
verification:
  state: unverified
  evidence: []
---

# Proposal v2.1 — One creator-managed Post row, an evolving Atlas

**Project:** Roam With Justin  
**Audience:** VS Code / Codex coding agent  
**Document status:** Accepted architecture, partially implemented. The live
baseline, table-aware schema and identity migration, Catalog, protected
Reference, 106 Journey and Place bindings, local Drive snapshot and preview
path, Experience and Moment layer,
real-receipt apply coordinator, guarded GitHub promotion, deployment checks,
and Sheet write-back code now exist. The first real Drive and R2 post remains
unverified. Creating a missing Journey, Place, or Visit and optional background
polling remain future work.
**Supersedes as the proposed direction:** `Roam_With_Justin_Sheets_Drive_Atlas_Publishing_Proposal_v2.md`  
**Revision objective:** Keep v2's normalized backend, publication safety, and validation while **removing the multi-tab creator workflow**. This corrected v2.1 also tightens baseline non-duplication, the `New:` creation example, Phase 2's dry-run/write boundary, and illustrative ID syntax.

> **Agent instruction:** Inspect the repository, existing Google Sheet, current docs, and real CLI flags before editing code. This brief specifies the **desired** workflow; do not claim its features already exist. Implement in small, verified phases. Do not invent journeys, chronology, coordinates, rights, photographs, business relationships, or personal memories. **Do not require the creator to maintain separate Journeys, Places, Visits, Experiences, or Moments tabs.**

## 0. Product decision and nonnegotiable outcome

**The creator manages exactly one editorial Google Sheets tab: the existing `Posts` tab.** A row is the authoring event: a proposed social release and, optionally, an incremental contribution to the Atlas.

The creator already exports reviewed photos/videos from Lightroom or DaVinci Resolve, puts them in a Google Drive folder to retrieve on a phone, and tracks the post in Google Sheets. Preserve those habits. Once the creator fills out the Atlas fields and selects `Atlas Mode: Publish`, one local orchestration workflow should safely do the rest when the inputs resolve without ambiguity.

```text
CREATOR — ONE TAB, ONE ROW

Lightroom / Resolve -> reviewed media folder -> Google Drive
                                              |
Google Sheets: Posts row ----------------------+  (Drive Folder URL)
  Location | Series/Post | Status | Account | Type | Caption | Drive Folder | Posted
  + Atlas Journey | Atlas Experience | Moment / Angle | Atlas Notes
  + Travel Date / Range | Atlas Mode: Off / Preview / Publish
                         |
                         v
             LOCAL EDITORIAL ORCHESTRATOR
       latest Sheet + protected canonical catalog
                         |
             resolve or stage related entities
                         |
       verified Drive download / snapshot / hashing
                         |
          existing media:prepare / media:upload
                         |                |
                         |             Worker -> R2
                         v
                    media:ingest
                         |
              generated canonical records
                         |
             validate + scoped Git publish
                         |
             GitHub Actions + public checks
                         |
                 Sheet write-back
             (hidden IDs/status + Atlas URL)

Internal records stay normalized:
  Journey -> Visit <-> Place -> Experience -> Moment -> Media placements
  Post is a separate social-release identity linked to the Moment/contribution.
```

**Important:** `Publish` is explicit creator authorization that the reviewed Drive folder and creator-supplied notes are intended for public use, **not** permission to fabricate prose, geography, asset identities, or approvals. Ambiguous/new high-impact claims receive **one combined preview**, rather than routine extra tabs and checkboxes. No automatic publishing from a mere Drive URL or social `Status = Ready`.

### What v2.1 retains from v2

- Sheets as the **creator-facing authoring authority** for new Sheet-origin content; Git as the validated generated snapshot consumed by the static site.
- Existing hand-curated records remain authoritative and untouched until explicitly migrated.
- Separate normalized canonical Journey, Place, Visit, Experience, Moment, Post and Media identities internally.
- Baseline reconciliation **before** automation; initial migration should be finite.
- Reusable media prepare/upload/ingest, R2 Worker, verification receipts, multipart video support where implemented.
- Stable IDs, Drive provenance, source changes/revisions, ordered media, idempotency, resumable publication.
- Controlled deployment, actual public content verification, guarded Google Sheets write-back.
- Experience/Moment support and deep links as prerequisites to promising those features publicly.

### What v2.1 explicitly removes

- **No creator-managed** `Journeys`, `Places`, `Visits`, `Experiences`, or `Moments` Sheets tabs.
- No extra routine `Rights Approval`, `Content Approval`, `Atlas Media Order`, or `Instagram URL` fields required in `Posts`.
- No obligation to choose or type canonical ID strings in daily authoring.
- No manual per-entity record creation or separate per-post CLI sequence.
- No requirement to retell the entire trip before publishing one approved moment.

## 1. Ownership: one row does not mean one flattened data model

| Surface                             | Owner / authority                     | Responsibility                                                                                                   |
| ----------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Posts tab**                       | Creator                               | Social queue, Drive handoff, Atlas-friendly labels, source notes, publish intent                                 |
| **Protected Atlas Reference**       | Automation                            | Visible read-only guide to Journeys, Journey-to-Place Visits, Experiences, URLs, and publication scope           |
| **Protected Atlas Catalog**         | Automation                            | Hidden machine lookup for names, IDs, parentage, owner, existence, URL and ambiguity hints                       |
| **Hidden Posts metadata**           | Automation                            | Post ID, resolved entity IDs, Moment ID, source/revision fingerprint, Atlas status, URL, optional concise error  |
| **Existing curated `.mjs` records** | Code-owned until deliberate migration | Trusted legacy Journey/Place/Visit/Atlas facts; must not be overwritten by Sheet compiler                        |
| **Generated Git content**           | Content compiler + media ingestor     | Deterministic, validated, machine-owned published entity/placement snapshot                                      |
| **Cloudflare R2**                   | Media publisher                       | Actual published media bytes and versioned object keys                                                           |
| **Private local ledger**            | Local publisher                       | Detailed Google Drive provenance, source hashes, run checkpoints, revisions, receipts, deployment reconciliation |
| **Public Atlas application**        | Compiled snapshot                     | Reads generated/curated data; **never authenticates directly to Google** at runtime                              |

One row is **an editorial change request**, not necessarily a brand-new Journey, Place, Visit, Experience or Moment. The compiler resolves existing records first, creates only missing validated records, and appends a new contribution when appropriate.

A Post is not an Experience. One Experience can have many Posts and many Moments over months. A Place can be visited on many Journeys. A Journey is not synonymous with the location label or with the social post date.

## 2. The sole creator-facing sheet schema

### 2.1 Preserve the existing eight columns verbatim

| Existing column | Existing use                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `Location`      | Human-readable geographic association; input to **Place** resolution (may be broad/ambiguous)                   |
| `Series/Post`   | Distinct Instagram post concept/title, not canonical Experience ID                                              |
| `Status`        | Instagram progression: Idea / Stage / Ready / Posted, not Atlas publication                                     |
| `Account`       | Distinguishes `Roam` from other creator/business content; Atlas automation only processes eligible account rows |
| `Type`          | Carousel, Reel, etc.                                                                                            |
| `Caption`       | Social caption or pointer; not automatically authoritative Atlas long-form copy                                 |
| `Drive Folder`  | Link to deliberately reviewed media exported for the post                                                       |
| `Posted`        | Social release date; **not the trip/visit date**                                                                |

Do not rename, reorder, erase, or reinterpret these eight existing columns just to accommodate the Atlas. Match columns by headers, not fixed numeric positions. The current CSV is only a snapshot; obtain the latest live Sheet during implementation.

### 2.2 Add eight routine Atlas authoring columns

| New visible column        | Creator input                                                                                | Rule                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **`Publish To`**          | `Social`, `Atlas`, or `Both`                                                                 | Separates the social queue from Atlas intent without overloading Instagram `Status`                |
| **`Atlas Journey`**       | Choose friendly existing title, or `New: <journey title>`                                    | Required when Atlas Mode is Preview/Publish; resolution against the blended catalog                |
| **`Atlas Place`**         | Choose a Place with a Visit in the selected Journey, or leave blank                          | Blank means Journey scope; a selected Place must resolve to that Journey's real Visit              |
| **`Atlas Experience`**    | Choose existing within the Journey, `New: <experience title>`, or leave blank                | Optional; no invented outing/pin if blank; a Journey-level contribution is allowed                 |
| **`Moment / Angle`**      | Short social/story perspective                                                               | Optional; defaults to `Series/Post` as a draft label, not invented narrative                       |
| **`Atlas Notes`**         | Creator's firsthand trip/experience/story observations; may reference an approved `.md` file | Optional; blanks must stay blanks, not be AI-filled with fiction                                   |
| **`Travel Date / Range`** | Date, approximate range or plain precision-bearing text                                      | Optional; never derive from `Posted`; do not silently convert an approximate month into exact days |
| **`Atlas Mode`**          | `Off`, `Preview`, `Publish`                                                                  | Only creator-controlled public-publishing gate                                                     |

**Defaults:** Historical rows use `Publish To = Social` and `Atlas Mode = Off`. During rollout, newly added rows also default to `Off` or `Preview`, with no silent change to `Publish`. Once verified, the creator may choose a deliberate new-row default; do not bulk-opt-in past content.

**Sheet ergonomics:** Freeze headers; keep the eight original columns visible in their current order; add the eight fields. Use friendly dropdowns where possible, but **allow `New:` values** for Experience rather than forcing a story into a stale dropdown. The protected `Atlas Reference` is an automation-owned guide, not a creator-maintained relational authoring tab.

### 2.3 Hidden / automation-owned fields (not routine human work)

Possible implementation: protected, hidden columns at the far right of the **same Posts tab** and/or Google Sheets developer metadata plus a private local ledger. Evaluate API ergonomics against the actual Sheet; no extra manual tabs are allowed.

- Immutable `post_id` (not the row number).
- Resolved `journey_id`, `place_id`, `visit_id`, `experience_id`, `moment_id` as applicable.
- `atlas_status`, `atlas_url`, `atlas_url_level` (moment/experience/journey; never mislabel fallback).
- `source_hash`, `source_revision`, `last_processed_hash`, `last_deployment`, `last_verified_at`, concise `sync_error`.
- Stable source ownership/ref marker for replay and matching.

**Protected/hidden is a usability feature, not a security boundary.** Do not store OAuth tokens, private Drive file inventories, secret URLs, Cloudflare credentials or full private audit logs inside the Sheet. If IDs are copied/duplicated, detect and reconcile; a hidden column does not make IDs immutable by itself.

### 2.4 Protected `Atlas Reference` and `Atlas Catalog`

The visible, warning-protected `Atlas Reference` is rebuilt from canonical records. It shows the Journey, Atlas Place, optional Experience, whether a Journey-to-Place Visit exists, publication scope, URL, and entity ID. It is a lookup guide only. The creator does **not** maintain it.

The hidden/protected `Atlas Catalog` is the corresponding machine lookup. Both tabs mirror existing curated entities and generated Sheet-origin entities.

Internally store: entity type, stable ID, friendly label, Journey/parent, whether code- or Sheet-owned, approved status and active URL; provide disambiguated picker text (e.g. `Raptor Boat Day — Split / Europe 2026`). Rebuild from actual canonical registries, not from guessed text. It must not become a parallel editable CMS.

**No creator-managed Sync Log:** Keep detailed logs in the local ledger; show a short status/error in automation-owned Posts fields only.

## 3. Concrete single-row behavior

### A. Existing Journey + existing Experience

```text
Atlas Journey:        Europe 2026
Location:             Split, Croatia
Atlas Experience:     Raptor Boat Day
Moment / Angle:       Through my son's eyes
Atlas Notes:          Creator's firsthand details about this perspective
Drive Folder:         <reviewed Drive folder URL>
Atlas Mode:           Publish
```

The engine resolves the existing Europe Journey, Split Place/Visit and Raptor Experience; allocates or reuses stable **Post** and **Moment** identities; appends new Moment story/media placements. It does **not** replace the parent Experience synopsis or curated hero. A later row with angle `The vessel` may refer to the **same Experience** but has its own Post/Moment/media, regardless of social publication order.

### B. Existing Journey + new Experience

```text
Atlas Journey:        Europe 2026
Location:             Split, Croatia
Atlas Experience:     New: Raptor Boat Day
Moment / Angle:       The boat itself
Atlas Notes:          Firsthand experience notes
Atlas Mode:           Preview
```

The compiler checks for existing equivalent Experiences **before** allocating a new ID, stages a candidate Experience (and Visit association if needed), and shows one **combined** preview. After the creator selects `Publish` and any genuinely ambiguous facts have been confirmed, it materializes the generated records. No dedicated Experience editing tab is required.

### C. New Journey (single authoring row)

```text
Atlas Journey:        New: Portugal 2027
Location:             Lisbon
Atlas Experience:     New: First Evening in Alfama
Moment / Angle:       Arrival and evening walk
Atlas Notes:          Firsthand observations supplied by the creator
Travel Date / Range:  June 2027
Atlas Mode:           Preview
```

Create a proposed Journey + matching/reused Place + valid Visit + Experience + first Moment **only where supported by actual evidence and schema**. Show one aggregate preview of the planned entities, maps, copy and media. If exact coordinates or a travel date are unknown, retain `unresolved`/approximate metadata; never fabricate a pin or day. Existing canonical Place `Lisbon` should be reused if present.

### D. Journey-only contribution

A row can supply `Atlas Journey` and `Location` with no `Atlas Experience`. In that case, attach a proposed Journey-level media/story contribution or pending association according to a deliberately defined schema. **Do not force a fake Experience just to satisfy a foreign key.**

### E. Multiple posts growing the same Experience

```text
Journey: Europe 2026
   Visit: Split
      Experience: Raptor Boat Day
        Moment A — The Vessel          <- social Post A + reviewed media
        Moment B — Through My Son's Eyes <- social Post B + reviewed media
        Moment C — Life on the Water    <- social Post C + reviewed media
```

- New row: **append** by default, never overwrite previous Moments, narrative summaries, heroes or photo placement order.
- Re-run of **same `post_id` with unchanged source**: no-op.
- Edit of **same `post_id`**: a scoped revision of **its own** Moment/placements after source comparison; not an extra Moment.
- Desired changes to parent Journey/Experience summaries: propose a **reviewable merge/diff**, not an automatic replacement. The source Notes remain intact.
- An editor may reorder Moments by an explicit internal story-order value, initially created deterministically; Instagram posting chronology and Sheet row order never become trip chronology.

## 4. Authority, conflicts and safety

1. **Existing curated sources remain protected.** Sheet rows may reference code-owned records; they may only add supported generated contributions. Migrating editorial ownership requires explicit, reviewed migration with rollback.
2. **New Sheet-origin records compile into machine-owned generated JSON** composed with curated registries. They are not hand-edited or maintained in multiple Sheets tabs.
3. **No invented relationships.** `Location` is a candidate Place label. If `Croatia` or `Miami` is too broad for a precise Visit, resolve to a known broad Place, leave Place pending, or request a disambiguation. An Experience can be non-geographic (e.g. Boat Day) and reference real visited locations rather than a fabricated pin.
4. **No invented claims.** `Atlas Notes` and an optional approved Markdown travel brief provide evidence. AI-drafted public prose must be reviewed in the combined preview for new or materially changed copy. Blank notes do not authorize colorful improvisation.
5. **One creator action for routine rights:** `Atlas Mode = Publish` asserts the supplied folder was intentionally reviewed for public publication and that creator-owned contents may be published. **Exceptions** (third-party music, copyrighted images, child/family privacy, uncertain releases, medical/sensitive info, unverified provider claims, etc.) block or request focused review; do not require a recurring second checkbox.
6. **No deletion by omission:** removing a Drive item or deleting a Sheet row does **not** silently delete public assets, Moments, Journeys or Places. A future explicit archive/unpublish workflow must be separately designed and approved.
7. **No implicit vendor partnerships:** ordinary venue use, affiliate link, paid sponsorship and referral relationships are distinct. Never create links, commissions or endorsements from name matching.
8. **No new public content from `Status = Posted`.** Social workflow and Atlas workflow are independent.

## 5. First deliverable: baseline the existing app and current Posts tab

**Baselining is Phase 1, not a cleanup task left until after the publishing automation.** Most manual matching should occur _once_, with long-term reductions in creator workload.

1. Read actual repository HEAD and run existing content/media/docs validators. Export an **authoritative canonical catalog** of Journeys, Places, Visits, existing Atlas routes, curated owner metadata, and any actual Experience/Moment records (if added since review).
2. Pull the current live `Posts` tab through an authenticated Google Sheets client. Preserve row data and original column names. Filter to Roam With Justin account entries; ignore WebWorks or unrelated rows.
3. Assign **stable `post_id`** values carefully. Sort/insert operations may change row numbers; do not key identity by row or title. Detect duplicated IDs on copied rows. Seed IDs only after a dry-run report and creator authorization.
4. Match historical rows against the canonical catalog by normalized names, parent context, and existing published links. **Auto-accept verified exact, unambiguous matches**. Use fuzzy matches for _suggestions_, not irreversible entity creation.
5. Show one small **ambiguity report** of only unresolved cases (e.g. two journeys named Utah; `Raptor Experience` vs boat-themed Atlas node; broad `Croatia` location). Resolve them once; record binding mappings.
6. Write resolved stable IDs and existing verified Atlas URLs to protected automation fields; do **not** imply an old social row's specific Moment is live if only a Journey URL exists.
7. Generate a **baseline catalog/bindings snapshot only**: Post-to-existing-canonical ID mappings, candidate matches, source-owner annotations, and verified URL references. **Do not generate duplicate Journey, Place, Visit, Experience, or Atlas entity records from existing code-owned content.** The public application and generated content registries must remain unchanged in this phase. Compare pre/post public content, and prove repeated baseline output is byte-stable and causes no unintended public changes.
8. Preserve `Atlas Mode = Off` for all historical posts unless individually enabled. No historical Drive batch is accidentally published.
9. Produce a report listing exact matches, manual resolutions, unmatched candidates, missing source/rights, duplicated Posts, and the remaining roadmap.

**Baseline acceptance:** Existing content is visually/functionally unchanged; generated baseline output consists of **bindings and catalog data, never cloned code-owned entity records**; one row resolves to the correct canonical Journey/Place/Visit; and Sheet sorting does not break the mapping. Historical posts need not all be filled in with complete personal stories; backfill can occur gradually.

## 6. From a Drive link to the existing media pipeline

**One Post -> one reviewed folder (default)**. The folder is the creator-approved _publishing selection_, not the private Lightroom archive. Files can be the same export set used on Instagram; note that social exports can lose EXIF or be compressed, and do not infer missing gear/capture metadata.

### Download and validation

- Parse supported Drive **folder** link forms and validate folder MIME type/access. Use authorized Drive API calls, not public scraping or unauthenticated link tricks. Prove the OAuth scope grants listing and downloading **all intended children**.
- Inventory supported image and video files, stable Drive file IDs, modified times/version where available, size and checksums; flat folder initially. Handle pagination and transient failures; ignore unsupported files with an explicit report.
- Download **all approved files** into a Git-ignored local cache keyed by stable Post ID; stream, sanitize filenames, verify sizes/hashes. Use a folder snapshot and recheck it before publication to avoid half-uploaded/changed batches.
- Mixed images and video: split into compatible packages before calling current image/video prepare functions. One parent Post can yield several media batches; every batch retains source provenance and Post/Moment association.
- Deterministic gallery order: prefer explicit numeric filename sequence `01-...`, `02-...` **when present and validated**; otherwise use a documented stable fallback in the preparation preview and allow creator review for important ordering. Do not use Drive API listing order or filesystem enumeration as the canonical sequence. Preserve already curated hero/order.
- Source files remain in Drive unchanged. Do not delete or modify the mobile social export folder.

### Reuse, don't rewrite, the published pipeline

```text
Reviewed Drive folder
      -> local snapshot/cache
      -> existing media:prepare (images/video as supported)
      -> existing media:upload (Cloudflare Worker -> R2, receipts)
      -> existing media:ingest (canonical generated Media/placements)
      -> validation/build
      -> controlled Git commit/deploy
```

Audit the **real** command flags/schemas and adapt them; don't invent a new compressor, uploader or publication manifest. The current review reported that non-null `experienceId` is rejected by the Media ingestor: add Experience/Moment schema and tests first, or stage content without falsely claiming it was linked at the Experience level. An **explicit** Journey-only fallback is allowed if creator-approved, never silently substituted.

### Provenance, identity and revisions

Maintain private, durable mappings:

```json
{
  "postId": "<immutable-post-id>",
  "driveFolderId": "<source-folder-id>",
  "driveFileId": "<source-file-id>",
  "driveVersion": "<if-available>",
  "localSha256": "<verified-digest>",
  "assetId": "<canonical-media-id>",
  "revision": 1,
  "batchId": "<real-batch-id>",
  "manifestRef": "<local-private-path>",
  "receiptRef": "<local-private-path>"
}
```

Illustration only; ensure the actual contract matches existing code. Same Drive file and unchanged bytes = no-op; same file with changed bytes = proposed new revision of same creative work after verification; different file ID but same filename = potential conflict, not automatic overwrite. If one photo is reused in two Posts, map approved additional placements rather than re-upload blindly. **Multipart ETags are not whole-file SHA-256 digests**; rely on an independent verified checksum/receipt contract.

### Publication boundaries

`Preview` can pull metadata, download/prepare local artifacts, and show a planned diff, but **must not** apply public Media ingestion, change live Git, or mark published. `Publish` can proceed through upload, ingest, deploy and verification only after identity, source snapshot, rights, parent-content and route requirements pass. Publishing partially complete bundles must never be reported as success.

## 7. Compile generated internal entities from the Posts row

**Do not create relational authoring tabs.** The content compiler accepts: (1) approved Posts row, (2) protected Atlas Catalog and code-owned + generated registries, (3) creator-supplied Notes/approved Markdown, and (4) the prior private ledger mappings. **Baseline bindings are references to existing code-owned records, not new generated copies.** Only later approved, genuinely new Sheet-origin entities are materialized into generated application data.

For each approved row, it should:

1. Resolve or propose the `Journey`. If `New:`, allocate a stable ID only after checking existing canonical names and parent geography; create a minimal Journey shell when enough information is supplied.
2. Resolve `Location` to an existing `Place`, or stage a new **unresolved/unpinned** Place if its geographic identity is not validated. Don't assert a precise GPS pin from mere text.
3. Reuse or create a `Visit` association between that Journey and the Place **only when the journey-specific visit is supported**. Avoid duplicate Visits across multiple Posts about the same outing.
4. Resolve or stage `Experience` using creator-friendly text within the parent Journey (and primary Visit if known). A `New:` prefix requests a new candidate, but still cross-checks collisions.
5. Create/reuse exactly one stable `Moment` for this `post_id` and experience/journey scope, unless the row is intentionally only Journey overview/context. Moment ID survives Sheet reordering and same-row edits.
6. Attach source Notes, approved narrative contribution and verified Media placements; keep Post/Instagram caption separate from public Atlas story. **Default to adding a new Moment instead of rewriting an Experience summary.**
7. Compose generated records with existing curated indexes. Enforce parent/reference uniqueness, safe visibility and absence of duplicate pins.
8. Produce a compact **single preview** of what changes: new entities, reused ones, new Moment, assets, ordering, page/anchor URL, factual uncertainties and one approvals summary.
9. For an accepted `Publish` row with no blockers, generate deterministic data only in machine-owned paths; validate/rebuild and route test before deployment.

### Example conceptual normalized output

```json
{
  "postId": "post-opaque-a1",
  "journeyId": "<resolved-europe-id>",
  "placeId": "<resolved-split-id>",
  "visitId": "<resolved-visit-id>",
  "experienceId": "<resolved-raptor-id>",
  "momentId": "moment-opaque-b2",
  "angle": "Through my son's eyes",
  "atlasNotesSource": "<creator-supplied-source-hash>",
  "mediaAssetIds": ["<canonical-media-id-1>"],
  "visibility": "published"
}
```

These illustrative IDs use lowercase hyphens to align with the existing media ID convention; confirm each future entity registry's actual validator rather than assuming Media validation automatically applies to Posts or Moments. This is an output concept, not an instruction to put IDs or JSON blobs in visible Sheet cells. Source Notes should remain the authoring material; generated copy, if any, must be traced and reviewed. If no Experience/Moment registry currently exists, build the minimum compatible records/selectors/routes as a separate verified phase first.

## 8. Linkable evolving experiences and the public UX

- The canonical Experience is one cohesive page/section that **accumulates Moments** and verified imagery over time. It should not become a set of duplicate map pins or a flat wall of Instagram cards.
- Preserve existing Journey/Atlas URLs. Add stable Experience routing and optionally Moment anchor/deep links only after inspecting current router conventions. Avoid moving existing canonical URLs gratuitously.
- Write a Moment/Experience URL to the Sheet **only after** real route, actual expected record/asset, and public deployment are verified. If the only verified URL is the Journey page, write it with `atlas_url_level=journey` and do not label it as a Moment deep link.
- Update a subtle `Recently enriched` indicator only after substantive new public media/story content lands (not mere re-sync timestamp churn).
- Ensure new Atlas content can exist in stages: Journey published, some Experiences draft; photo/video added later; gear metadata/affiliate links much later. Do not display broken empty cards or unfinished map pins.

## 9. State machine and single-operation publishing contract

### Creator-facing mode — deliberately simple

| `Atlas Mode` | Promise                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Off`        | Ignore for publication; still eligible for read-only baseline lookup                                                                                                            |
| `Preview`    | Resolve, inspect/download sources if authorized, prepare safely, show proposed diff, **no R2 writes or public Git publication**                                                 |
| `Publish`    | Creator authorizes reviewed folder/notes for publication; run checkpoints automatically **when requirements pass**, otherwise `Needs Review` with one combined targeted preview |

### Private/automation statuses — not additional creator work

`Queued -> Resolved -> Downloaded -> Prepared -> Uploaded -> Ingested -> Validated -> Committed -> Deployed -> Publicly Verified`

Errors use `Blocked`, `Needs Review`, `Failed`, `Retryable`; none are labeled Published. Persist checkpoints in a local ledger, with a compact Sheet status and non-secret error reason. Build support for `--resume` and dry-run. A `Publish` row whose content is unchanged and already publicly verified does nothing.

**No false distributed transaction:** Google Sheets, Drive, R2, Git and GitHub Actions cannot be committed atomically. Guard with immutable source snapshots, staged generation, hashes, locks, checkpointed uploads and resumable status write-back. If Git/deployment succeeds but Sheets write-back fails, retry only write-back; if Drive changes mid-run, replan before public publication. Never remove already-published R2 objects as rollback of unrelated work.

### One-command MVP / optional unattended polling

Commands are **proposals**; inspect existing scripts first:

```bash
npm run editorial:baseline -- --dry-run
npm run editorial:sync -- --dry-run
npm run editorial:preview -- --post <post-id>
npm run editorial:publish -- --post <post-id>
npm run editorial:status -- --post <post-id>
npm run editorial:publish -- --post <post-id> --resume

# Optional once dependable, Windows Task Scheduler/local watcher
npm run editorial:watch
```

The CLI orchestrates deterministic file/network operations. Codex helps reconcile ambiguity, draft creator-approved prose and implement tooling; it should **not** be the only process capable of replaying the publication pipeline. For the desired "paste Drive link, mark Publish, done" experience, offer opt-in local polling once the manual path is proven; the Windows computer must be on for that local watcher to run.

## 10. Google authorization and Sheets write-back

- Local installed-app OAuth 2.0 through browser; save refresh credentials only in a secure OS store or Git-ignored user profile location, never in the Vue bundle, repo, public manifest, R2 object, logs or generated content.
- Google Sheets API: read the designated workbook, update **only** automation-owned hidden columns and the internal lookup range; do not change `Caption`, `Status`, `Posted`, `Location`, Notes or other creator inputs.
- Google Drive API: read-only listing/downloading of the explicitly selected folder. `drive.file` may require an approved Picker/open-with grant and **does not guarantee access to arbitrary pasted folder links or all children**. If that experience cannot be proven, discuss `drive.readonly`'s restricted-scope implications or an alternate controlled folder workflow; no silent permission escalation.
- Do not make Drive folders public just to avoid OAuth. Avoid broad Drive write scopes when uploads are only **Drive -> local -> R2**.
- Read current rows by their headers and stable `post_id`, re-read before write-back, and compare a normalized source hash to avoid clobbering creator edits. Sheets does not provide a simple atomic per-row compare-and-swap; use best-effort optimistic checks and single local writer. A copied row with a duplicate Post ID is a conflict, not a license to overwrite another row.
- If the Sheet is re-sorted, writes must still target the correct Post ID, not the previous row index.

**Official implementation references** (validate when coding):

- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/identity/protocols/oauth2/native-app
- https://developers.google.com/workspace/drive/api/reference/rest/v3/files
- https://developers.google.com/workspace/drive/api/guides/manage-downloads
- https://developers.google.com/workspace/sheets/api/guides/values
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate
- https://developers.google.com/workspace/drive/api/guides/enable-shareddrives

## 11. Strict test and acceptance matrix

| Test                                         | Expected behavior                                                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Existing Sheet                               | All eight original columns and social workflow preserved; eight visible workflow fields include `Publish To` and `Atlas Place`                                                                                                             |
| No extra authoring tabs                      | Creator never edits separate Journey, Place, Visit, Experience or Moment tabs; `Atlas Reference` is protected and automation-owned                                                                                                         |
| Initial baseline                             | Only catalog bindings / Post-to-canonical mappings generated; **no duplicate code-owned entity records**; existing curated and generated public content unchanged; exact matches auto-linked; ambiguity report finite; historical rows Off |
| Sort/insert/copy rows                        | Stable Post ID survives sort/insert; copied duplicate IDs trigger safe review                                                                                                                                                              |
| Account filter                               | `Roam` rows eligible; unrelated WebWorks rows remain untouched                                                                                                                                                                             |
| Existing Raptor row                          | Correct existing Journey/Experience resolved without manually typing IDs                                                                                                                                                                   |
| Second Raptor post                           | One Experience, two additive Moments and media sets; previous hero/story/order preserved                                                                                                                                                   |
| New `New: Portugal 2027` row                 | Reviewable Journey + Place + Visit + Experience + Moment generated from **one row**                                                                                                                                                        |
| Ambiguous Place                              | No invented coordinates, fake visit or duplicate map pin; targeted review                                                                                                                                                                  |
| New experience unsupported in media ingestor | No invalid `experienceId` passed; content staged until schema/routing supported                                                                                                                                                            |
| `Atlas Mode = Off`                           | Never downloads/publishes that row as live content merely due to social Ready/Posted                                                                                                                                                       |
| `Atlas Mode = Preview`                       | Local prepare + planned/dry-run ingestion only; **no R2 writes, applied ingestion, Git public commits or Sheet Published status**                                                                                                          |
| `Atlas Mode = Publish`                       | Normal verified creator-owned content uses single approval; exceptional issues yield focused review                                                                                                                                        |
| No notes                                     | No invented firsthand paragraphs, dates, gear, or operator claims                                                                                                                                                                          |
| Mixed Drive folder                           | Deterministically ordered photo/video packages; existing media tools reused                                                                                                                                                                |
| Interrupted upload/retry                     | Correct resumed checkpoints, R2 receipts, no duplicated bytes/assets/Moments                                                                                                                                                               |
| Same row rerun                               | No changes to published snapshot, Git commit, R2 upload or URLs                                                                                                                                                                            |
| Changed source Drive file                    | Stable identity proposal and explicit revision handling; no silent new asset                                                                                                                                                               |
| Removed Sheet row / Drive item               | No destructive deletion without separate approved unpublish mechanism                                                                                                                                                                      |
| Deployed but Sheet offline                   | Status retry only; no second publication                                                                                                                                                                                                   |
| Public deep link                             | Verify actual expected content, not merely an SPA 200 response                                                                                                                                                                             |
| Family/private or uncertain rights           | Stop/request approval; no silent public exposure                                                                                                                                                                                           |
| Repository safety                            | Preserve unrelated dirty worktree; stage/commit only approved generated paths                                                                                                                                                              |
| Documentation                                | Update `docs/README.md`, architecture and implementation states only after tests verify changes                                                                                                                                            |

## 12. Implement in bounded phases

**Phase 0 — Code audit and authority contract (no publishing):** Inspect `AGENTS.md`, `docs/README.md`, `docs/architecture/content-model.md`, `docs/architecture/media-pipeline.md`, current registries/selectors, Drive/Sheet helpers, `package.json`, media preparers/uploaders/ingestor, routes and Pages workflow. Verify v2 review's prior claim that Experience/Moment records and routes are missing. Output existing/partial/missing table and exact source paths. Confirm old curated ownership and generated composition. **Do not add multi-tab authoring.**

**Phase 1 — Baseline first:** Authenticate to current `Posts`, build a protected catalog **referencing existing** code-owned and generated canonical records, exact-match/reconcile historical rows, report ambiguous cases, seed stable Post-to-canonical ID mappings under review, and preserve `Off`. Generate **only catalog bindings and mapping reports**, never cloned Journey/Place/Visit/entity records. Verify no public content changes and idempotent, byte-stable regeneration. This is the initial major migration step.

**Phase 2A — Existing-destination local dry run (mandatory):** Select one eligible row targeting an existing Journey/Place. Read Drive metadata, download a verified local snapshot, partition mixed images/videos, run the existing local `media:prepare`, and generate a **planned ingestion diff** against the current canonical registry. Validate identities, ordering, rights, provenance and expected keys. **No R2 upload, no applied `media:ingest`, no generated-content mutation, no Git commit or deployment, and no Published status.** If the existing ingestion CLI cannot plan without a remote receipt, add a non-mutating plan/validation path; **never fabricate a successful upload receipt** to make the preview pass.

**Phase 2B — Explicitly approved live upload and applied ingestion:** Only after Phase 2A succeeds, the reviewed row is in `Atlas Mode = Publish`, and all relevant validations pass, invoke the actual `media:upload` to R2, obtain and verify genuine upload receipts, and execute **applied** `media:ingest` into machine-owned content. Revalidate produced records and support retries/resumption. This phase proves transport plus applied ingestion; **public Git commit/deployment and Sheet Published write-back remain gated until Phase 5**. Keep generated changes isolated from unrelated work until the deployment phase.

**Phase 3 — One-row authoring compiler:** Using a `New:` Journey/Experience row, generate missing Journey, Place (if verified), Visit, Experience and first Moment records in **internal generated content only**, after checking for existing matches; display one preview, validate. Build minimal Experience/Moment registries/selectors/routes if absent before accepting linked media. Preserve curated files. Never treat Phase 1's baseline catalog bindings as permission to recreate existing code-owned entities.

**Phase 4 — End-to-end Raptor regression:** Two Posts feed one existing/canonical Raptor Experience, create two separate Moments, enrich the same live page, maintain hero/order, create verified deep links without duplicates. This is the critical product test.

**Phase 5 — Deployment and precise Sheet write-back:** Controlled scoped Git commit/PR, GitHub Actions verification and actual public record checks, then update hidden status/URL. Test failures at each checkpoint and resuming without replay.

**Phase 6 — Optional local watcher:** Once publication is field-proven, implement opt-in Windows Task Scheduler or single-instance polling so a new approved `Publish` row can be processed hands-off. The creator still controls what is public through the selected Drive folder and Atlas Mode.

## 13. Definition of done — creator experience, not tab count

The creator can continue the existing routine: **edit in Lightroom/Resolve -> upload reviewed selections to Drive for Instagram -> add or enrich one row in the familiar Posts Sheet -> choose `Publish To`, Journey, optional Place and optional Experience by friendly label -> write optional Moment/Notes -> set `Atlas Mode = Publish`.** The local publisher resolves the canonical target, creates or reuses the necessary Experience, downloads and validates reviewed media, reuses the installed R2 prepare/upload/ingest pipeline, compiles additive story contributions, validates and deploys a coherent Atlas update, then writes back the actual verified URL/status. A second row about the same outing adds a **second Moment**, not a duplicate Experience or an overwritten first Moment. No routine ID lookup, `.mjs` edit, manual media commands, or separate relational authoring tabs.

Until the optional local watcher runs, one command/VS Code task triggers publication. If the local machine is off, no background job is assumed. If something is ambiguous, the creator sees **one small actionable review**, not another authoring surface.

## 14. Coding-agent handoff — implement v2.1, not v2's authoring UI

> Inspect the actual repository HEAD, live `Posts` Sheet, current docs, and real CLI flags before changing behavior. Preserve the original eight social columns. Use `Publish To`, `Atlas Journey`, `Atlas Place`, `Atlas Experience`, `Moment / Angle`, `Atlas Notes`, `Travel Date / Range`, and `Atlas Mode` as the routine workflow fields. `Location` remains the social label. `Atlas Place` independently selects a canonical Place with a real Visit in the chosen Journey, while blank means Journey scope. Maintain a visible protected `Atlas Reference`, a hidden protected machine Catalog, hidden IDs/status/URL, and a private local ledger. **Do not build creator-managed Journeys, Places, Visits, Experiences, or Moments tabs.** Resolve existing records before staging missing ones, preserve stable Post and Moment identities, and never clone curated authority. Reuse the real media pipeline, real receipts, scoped Git changes, deployment verification, and cautious Sheet write-back. Preview must remain non-publishing. `Publish` is the creator-controlled gate, with focused review only for ambiguity, private material, rights, or unsupported claims.

---

**North star:** _One reviewed Google Drive folder and one familiar Google Sheet row. Instagram publishes the moment; the Atlas gains a richer, enduring experience. The backend may be relational and sophisticated, but the creator should not have to administer it._

### v2.1 correction notes (editorial clarifications; not implementation evidence)

- **Baseline:** Produce catalog references and Post mappings only; never duplicate curated entity records.
- **New Journey example:** Explicitly prefix the newly requested Experience with `New:`.
- **Phase 2:** Separate read-only/local plan and mandatory dry run from approved live R2 upload and applied ingestion; Phase 5 still owns deployment and verified Sheet write-back.
- **Illustrative IDs:** Use lowercase-hyphenated IDs; validate each registry against its own schema.

**Repository handoff:** This accepted proposal now lives in `docs/proposals/`.
The earlier designs are archived. Phase 0, the authenticated Sheet baseline,
the creator-authorized schema and identity migration, the visible protected
Reference, the hidden canonical Catalog, and all 106 Journey and Place
bindings are verified. Eighty-two rows also have canonical Visit bindings. The
private review ledger records the owner-confirmed Salt Lake City Airport
binding as lacking a Utah 2026 Visit. It remains Journey-scoped unless a real
transit Visit is deliberately added. The one-command preview and apply
implementation is locally verified. The Atlas Reference routing release was
promoted through pull requests 34 and 35 as develop merge `6db1e08` and main
merge `0e60b31`. Pages run 43813022343 and rendered production verification
succeeded. No real row has yet downloaded Drive source, uploaded new R2
objects, changed generated production content, or completed its final Sheet
Published write-back.
