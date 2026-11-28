---
id: editorial-sheet-publishing-implementation
title: Single-Row Sheets and Drive Atlas Publishing Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-15
updated: 2026-11-27
related:
  - editorial-single-row-atlas-publishing
  - content-model
  - media-pipeline
  - journey-media-ingestion
  - stays-sheet-intake
supersedes: []
superseded_by: []
code_paths:
  - scripts/editorial-publish.mjs
  - scripts/lib/editorial-process.mjs
  - scripts/test-editorial-process.mjs
  - scripts/editorial-register-place.mjs
  - scripts/editorial-baseline.mjs
  - scripts/editorial-migrate-sheet.mjs
  - scripts/editorial-build-catalog.mjs
  - scripts/editorial-bind-places.mjs
  - scripts/editorial-bind-journeys.mjs
  - scripts/editorial-suggest-places.mjs
  - scripts/editorial-bind-reviewed-places.mjs
  - scripts/editorial-bind-visits.mjs
  - scripts/editorial-github-audit.mjs
  - scripts/editorial-github-configure.mjs
  - scripts/editorial-github-publish.mjs
  - scripts/lib/editorial-baseline.mjs
  - scripts/lib/editorial-content-compiler.mjs
  - scripts/lib/editorial-public-copy.mjs
  - scripts/lib/editorial-story-generator.mjs
  - scripts/lib/editorial-github.mjs
  - scripts/lib/editorial-github-publisher.mjs
  - scripts/lib/editorial-github-rules.mjs
  - scripts/lib/editorial-google-auth.mjs
  - scripts/lib/editorial-google-drive.mjs
  - scripts/lib/editorial-google-publication.mjs
  - scripts/lib/editorial-google-visits.mjs
  - scripts/lib/editorial-publication-plan.mjs
  - scripts/lib/editorial-place-registration.mjs
  - scripts/test-editorial-google.mjs
  - scripts/test-editorial-migration.mjs
  - scripts/test-editorial-place-registration.mjs
  - scripts/test-editorial-publication-writeback.mjs
  - scripts/test-editorial-story-generator.mjs
  - src/content/experiences/index.mjs
  - src/content/editorial/generated/records.json
  - src/content/geography/index.mjs
  - src/content/geography/generated/records.json
  - src/views/roam/RoamTripOverview.vue
  - .github/workflows/editorial-publication-ci.yml
  - package.json
verification:
  state: verified
  evidence:
    - npm run editorial:test
    - npm run media:test
    - npm run content:validate
    - npm run docs:audit
    - npm run build
    - real Windows npm invocation and literal-argument subprocess regression checks on 2026-11-23
    - dry-run receipt verification for six Bajos del Toro images and four videos on 2026-11-23
    - fixed shared Windows runner completed editorial tests and production build b923635c5ef71849 with 66 Worker runtime tests on 2026-11-23
    - real Git status regression and live pending generated-file scope checks passed on 2026-11-23
    - authenticated read-only Sheet baseline on 2026-11-15
    - creator-authorized live Sheet migration on 2026-11-15
    - verified live Atlas Catalog and 106 Journey and Place bindings on 2026-11-16
    - verified 82 live Visit bindings on 2026-11-16
    - creator-authorized Publish To and Atlas Place upgrade verified on 106 rows on 2026-11-16
    - guarded live migrations added Atlas Coordinates and Atlas Stop as separate schema-only changes and preserved all creator fields, unrelated rows, and 108 eligible Post IDs and bindings on 2026-11-27
    - visible protected Atlas Reference verified with 81 canonical choices on 2026-11-16
    - GitHub pull request 30 merged to develop as 4d88df2 on 2026-11-16
    - develop validate job 133078010450 succeeded on 2026-11-16
    - GitHub pull request 31 validated and merged to main as 63686ed on 2026-11-16
    - Pages workflow run 43800514937 succeeded on 2026-11-16
    - rendered production Journey title and media section verified on 2026-11-16
    - GitHub pull request 34 validated and merged to develop as 6db1e08 on 2026-11-16
    - develop workflow run 43812635732 succeeded on 2026-11-16
    - GitHub pull request 35 validated and merged to main as 0e60b31 on 2026-11-16
    - Pages workflow run 43813022343 succeeded on 2026-11-16
    - rendered production Journey markers verified after Atlas Reference deployment on 2026-11-16
    - active ruleset 27216249 verified merge-only with required validate check
    - GitHub pull request 42 merged to develop as 44a8fd1 on 2026-11-16
    - develop workflow run 43866268383 succeeded on 2026-11-16
    - GitHub pull request 43 merged to main as 17ace65 on 2026-11-16
    - Pages workflow run 43866785598 succeeded on 2026-11-16
    - GitHub pull request 44 merged the Sheets table compatibility correction to develop as 7551244 on 2026-11-16
    - develop workflow run 43867984954 succeeded on 2026-11-16
    - GitHub pull request 45 merged the correction to main as 5085ecc on 2026-11-16
    - Pages workflow run 43868555523 succeeded on 2026-11-16
    - live Catalog refresh verified 223 canonical references, 71 Visit choices, 106 exact bindings, and no Posts ID writes on 2026-11-16
    - live Posts table metadata readback verified the New Place dropdown choice on 2026-11-16
    - Bajos del Toro publication PRs 264 and 267 and successful Pages run 45277672821 verified on 2026-11-23
    - exact production generated records, unchanged Drive inventory and rendered media marker verified before Sheet recovery
    - Sheet row 22 readback verified 14 publication metadata fields including Experience/Moment IDs while retaining social Status Posted
    - Drake Bay publication PRs 277 and 278 and successful Pages run 45321807276 verified on 2026-11-23
    - Drake Bay exact rendered media, Catalog refresh, and guarded Sheet row 20 writeback verified in one resumed apply command
    - node scripts/test-editorial-publication-writeback.mjs
---

# Single-row Sheets and Drive Atlas publishing implementation

Separate accommodation intake is tracked in the
[Stays sheet checklist](stays-sheet-intake.md). The setup command adds new
tabs without changing Posts. The separate `editorial:stays` command now provides
matching-preview local compilation and optional protected publication for
approved stay rows. It does not access private My Atlas trip lodging. This
document's publisher continues to read Posts only.

The repository now contains the bounded one-row publication path described by
the [accepted proposal](../proposals/single-row-sheets-drive-atlas-publishing.md).
The creator continues to edit one Posts tab. Generated application state,
private checkpoints, Git branches, validation, deployment observation, and
guarded Sheet metadata remain automation concerns.

The code path is implemented and locally tested. The historical Sheet
migration, 106 Journey and Place bindings, 82 Visit relations, the visible
protected Atlas Reference, GitHub pull-request promotion, Actions build,
Pages deployment, rendered-page verification, and hardened branch rules are
live verified. A real Bajos del Toro post has now completed Drive/R2 ingestion,
production content deployment and verified Sheet write-back. Its original
production PR closed without merging and was replaced by a separate merge,
so final write-back required guarded recovery. Drake Bay subsequently completed
the resumable one-command path through both protected merges, Pages, rendered
media verification, Catalog refresh and guarded Sheet write-back. The broader
implementation remains partial because live Place registration, Journey
creation and optional polling are still open.

## One-command workflow

### Story generation restoration and branch audit

On 2026-11-23 a refreshed remote-branch and GitHub PR audit found no open PRs.
`feature-editorial-atlas-story` was the only remote feature branch with
non-equivalent commits absent from develop. Its story generator, commit
`38a6d5d`, was never integrated into the current publisher. This explains why
Preview on develop prepared media without generating `Atlas Story`.

The restoration carries only that generator integration onto current develop.
It retains the newer Windows process runner, Git status parser, guarded
publication recovery and lodging features. The old branch's generated Media
and editorial record changes are excluded, preserving current public records.
Other retained branch names are not evidence of missing features; their
commits are merged or patch-equivalent to develop. The generated Pages branch
has separate history and was excluded from the source-feature comparison.

Use the existing row arguments with `npm.cmd run editorial:publish -- --preview`.
For an Experience row, this requires `OPENAI_API_KEY` in the terminal environment
and writes a fresh draft to `Atlas Story`. Review that cell, set Atlas Mode to
Publish and run the same command with `--apply` instead of `--preview`.
Every Preview overwrites prior Story edits. Apply never generates copy or
falls back to private Notes. A blank Experience remains media-only and now
prints an explicit explanation that no story will be generated.

- [x] Restore Preview model call and guarded single-cell Sheet writeback.
- [x] Keep Notes private and require Story for Experience publication.
- [x] Preserve current publisher fixes, lodging and generated records.
- [x] Run editorial regression tests with mocked model and Google responses.
- [x] Verify a live model request and Sheet draft writeback after restoration.

The tests spend no credits and make no external model calls. The separate live
Drake Bay Preview completed the provider request and exact Sheet draft readback.

### Windows build launch and retry

`scripts/lib/editorial-process.mjs` resolves Windows npm calls to
`process.execPath` plus the installed `npm-cli.js`. It preserves argument arrays
and runs without a shell. It uses `EDITORIAL_NPM_CLI_PATH`, a valid inherited
`npm_execpath`, or npm beside the current Node installation. POSIX hosts use
`npm`. The local publisher, explicit Place-registration build and shared GitHub
worktree commands all use this boundary. This fixes `spawnSync npm.cmd EINVAL`
after successful media ingestion and avoids the same failure later in the
isolated publication worktree.

The reported Bajos del Toro attempt retained its private snapshot, six-image
and four-video packages and both upload receipts. Its failure handler restored
the generated Media/Editorial pair before GitHub promotion. Both packages
passed receipt-backed ingestion dry runs after the fix; no bytes were uploaded
and no records were changed by those checks. Retry the original approved
`editorial:publish` command with the same source row and private run state.
The existing source-freshness, immutable object, receipt and publication guards
remain in force. Real publication success is separate from this local repair.

### Git status scope verification and retry branches

The shared command runner preserves leading stdout whitespace. Git short
status uses the first two columns for index/worktree state, so trimming the
output's beginning turned the first ` M src/...` entry into `M src/...` and
made the fixed-column parser report `rc/...`. Only trailing output whitespace
is trimmed now; the generated-file allowlist remains unchanged. A real temporary
Git repository regression covers two modified generated files and still rejects
an unexpected source file.

Publication branch creation occurs after validation and both scope checks, so
an early build/scope failure does not reserve the deterministic retry branch.
Existing failed-attempt branches must be checked for unique commits before
cleanup. No existing branch with publication commits is discarded automatically.

PR validation must follow the submitted head commit, not GitHub's temporary
merge ref. Drake Bay PR 277 had a successful `validate` check on head
`4e0f485df105c46aa4ab94a9c85878c47547c9d5`, while the open PR reported the
different synthetic merge SHA
`06e4c45dd873d37c505eb48933ecbdd52090c075`. Polling that synthetic SHA left
the clean PR open even though its required check had passed. The waiter now
uses `pull.head.sha`; its regression gives each mock PR distinct head and merge
identities and requires both validation reads to use the two head identities.
The merge call retains its existing head-SHA guard, and later workflow waits
still use the real merge commits returned by GitHub.

The Bajos del Toro failed-attempt branch pointed at `7124d9c`, already the
current develop commit, with no unique commits. It was removed using guarded
non-forced local branch deletion. The pending generated Media/Editorial files
then passed the real command-runner scope check. No content or remote branch
was removed, and publication was not rerun during these checks.

### Replaced promotion PR and social-status recovery

Post `7c744fc5-b9d4-4c1e-8e6a-4f7adfd8b2e7` produced Experience
`experience-costa-rica-2025-jurassic-canyon` and Moment
`moment-7c744fc5-b9d4-4c1e-8e6a-4f7adfd8b2e7`. The automatic checkpoint
tracked main PR 266, which closed unmerged. PR 267 instead deployed its exact
generated records as `93898f8e5a64bd0146da05c96e7707e7ad027ed5`, with successful
Pages run 45277672821. As write-back follows deployment verification, the
interrupted automatic run never reached its Sheet update.

The row's social `Status` also changed from Ready to Posted. That field is part
of the existing full source hash, so ordinary stale-source protection correctly
blocked a blind write-back. Recovery proved that substituting the original
Ready value recreated the original complete source hash, that all public
authoring fields and the Drive fingerprint were unchanged, and that the exact
planned Moment/media existed in both main and the rendered public page.

`buildPublicationWriteback` now accepts an optional `publishedSheetSourceHash`
for this explicit verified-recovery case. `expectedSheetSourceHash` still
guards the actual current row; the stored `source_hash` and processed hash
retain the source that was truly deployed. Default behavior is unchanged and
does not silently ignore social edits. This is not permission to mark changed
public content as published.

Guarded recovery refreshed the canonical reference, wrote and read back all
14 metadata cells in row 22, kept social Status Posted, and recorded the actual
replacement PR/deployment in the private checkpoint and publication result.
No media upload, content change, GitHub push or new production deployment was
performed during recovery. Evidence is in the existing private run directory
under `publication-result.json` and `sheet-writeback-recovery-before.json`.
The repaired metadata helper and regression remain local until a code release.

The batch Chrome DOM-dump command timed out during recovery. An isolated CDP
browser rendered the exact live media marker successfully. Batch-renderer
reliability remains follow-up work; no weaker HTTP-only success was substituted.

### Streamed Drive intake and Story-safe Preview retry

On November 23, Preview for Post
`8c98fa71-8379-4b48-a314-39185b4085a1` completed model generation, wrote and
verified `Atlas Story`, then failed during the private Drive snapshot with
`data is too long`. Run `6926acaa9fbb` remained empty after staging cleanup,
which places the failure before package preparation and before any R2 upload.
The Drive client still requested each source file as one array buffer and then
created another whole-file Buffer for hashing. The separate R2 uploader's
existing MP4 multipart behavior was still present.

Drive intake now requests a stream, writes chunks directly to the private
staging file, and accumulates byte size and SHA-256 in the same pass. Existing
snapshot verification also hashes incrementally. Download failures identify
the source filename and remove the incomplete staging tree. Preview now accepts
the explicit `--reuse-story` recovery option so the already saved draft can
continue through local planning without another model call or Sheet write.

Local verification passed with `node scripts/test-editorial-google.mjs`, the
complete `npm.cmd run editorial:test` suite, and `git diff --check`. The live
`--reuse-story` retry then downloaded all 14 Drive files, including the
2,780,414,173 byte `Drake_Hike.mp4`, into a verified private snapshot without
repeating the model call or Sheet write. The 12-image package and ingestion dry
run passed. Preview remains incomplete because video preparation correctly
rejected that 2,651.6 MiB source against the configured 190 MiB per-video
delivery policy. The second 92,219,193 byte MP4 is within policy. Re-exporting
or deliberately replacing the oversized source is owner action; neither the
streaming repair nor multipart transport silently weakens the delivery limit.

After the oversized source was replaced with a 117,349,950 byte derivative,
the apply run verified both immutable R2 receipts and resumed from PR 277. The
head-SHA waiter merged that PR into `develop` as
`fa518ca086e4d786a568dd9dba8031b500055b79`, validated the push, created and
merged PR 278 into `main` as
`a4d63e5e984843d1c2da8f7d07189bbae599bd63`, and observed successful Pages run
45321807276. Exact media appeared at the Drake Bay Experience URL. The same
command refreshed 226 Catalog and 84 Atlas Reference records, then wrote and
read back deployment metadata on Sheet row 20. No manual metadata recovery was
required.

### Publication commands

Preview one selected row:

```bash
npm run editorial:publish -- --preview --oauth-client "C:\private\google-oauth-client.json" --spreadsheet-id "SPREADSHEET_ID" --posts-gid "TAB_GID" --post-id "POST_ID"
```

Resume local Preview work after the Story was saved but a later technical step
failed:

```bash
npm run editorial:publish -- --preview --reuse-story --oauth-client "C:\private\google-oauth-client.json" --spreadsheet-id "SPREADSHEET_ID" --posts-gid "TAB_GID" --post-id "POST_ID"
```

`--reuse-story` requires a nonblank existing `Atlas Story`. It does not call
the model and does not write to the Sheet. It is rejected in Apply mode.

Publish one approved row:

```bash
npm run editorial:publish -- --apply --oauth-client "C:\private\google-oauth-client.json" --spreadsheet-id "SPREADSHEET_ID" --posts-gid "TAB_GID" --post-id "POST_ID"
```

If `--post-id` is omitted, preview requires exactly one `Preview` or `Publish`
row and apply requires exactly one `Publish` row. This prevents an unattended
command from silently choosing among multiple approvals.

The narrow Drive mode is the default. Existing folders that were not created
or opened through the OAuth client may require the owner-approved broader
scope:

```bash
--drive-scope readonly --allow-restricted-drive-scope --reauthorize
```

The OAuth client and refresh token must remain outside the repository. Preview
story generation requires `OPENAI_API_KEY`; `EDITORIAL_STORY_MODEL` may
override the default `gpt-6-astra`. R2 apply also requires
`MEDIA_UPLOAD_WORKER_URL` and `MEDIA_UPLOAD_TOKEN` in the process environment.
GitHub authentication comes from an existing Git Credential Manager login or
a supported token environment variable.

## Sheet routing fields

`Publish To` separates social and Atlas intent:

- `Social` stays outside Atlas publication even if other Atlas cells contain
  historical values.
- `Atlas` publishes only to the Atlas workflow.
- `Both` keeps the social entry and makes the row Atlas-eligible.

`Atlas Journey` is required for Preview or Publish. `Atlas Place` is optional.
When it is blank, the row publishes at Journey scope. When selected, the
publisher resolves the canonical Place and matching Visit within the chosen
Journey. It rejects an unknown Place or a real Place that has no Visit in that
Journey. The friendly choices are authoritative at publication time; guarded
write-back stores the resolved hidden `journey_id`, `place_id`, and `visit_id`.
The `New Place` dropdown choice is an explicit registration request, not a
publication target. Its requested name comes from the row's existing
`Location` field. Normal preview and publication reject it until the separate
registration command succeeds.

`Atlas Experience` remains optional free text in the native Sheets table so an
existing label or `New: <title>` can be entered. The protected `Atlas
Reference` tab is for review only. `editorial:catalog -- --apply` rebuilds it
on demand, and every apply-mode publication refreshes it before selection and
again after successful generated content changes.

The two fields model separate layers. `Atlas Place` is a physical destination
and map target. It may be the Journey root or any descendant in an arbitrary
Place tree. `Atlas Experience` is a story within that selected Place and does
not create a pin. A physical subdestination must first use the explicit Place
registration flow with its parent Place. A private or intentionally broad
story should remain on its broader Place rather than creating precise public
geography.

A new Experience inherits the row's resolved Place and Visit. Once an
Experience exists, later publication requires the row to resolve to that same
Place and Visit. Editing the friendly Place cell is not a reparent operation.
Moving an existing Experience and its media is a separate reviewed migration,
which prevents a casual Sheet edit from splitting its Moments and placements
across different pins.

`Atlas Coordinates` supplies the pin for a new Place in `latitude, longitude`
order, for example `9.182, -83.763`. Registration validates both values,
converts them to the canonical `[longitude, latitude]` Place representation,
and writes the normalized value back after success. Existing Places always use
their canonical coordinates. A row cannot override their position.

`Atlas Stop` is a `No` or `Yes` dropdown that classifies the row separately
from its story. `Yes` is required before `editorial:register:place` may create a
Place and map pin. `No` means the row stays story content inside the selected
`Atlas Place`; it does not create another Place. The field does not remove the
pin of an existing selected Place.

`Atlas Notes` is private firsthand evidence. `Atlas Story` is reviewed public
copy. For a row with an Experience, an ordinary Preview command regenerates and
overwrites `Atlas Story`, including any manual edits to the prior draft. The
explicit `--reuse-story` recovery preserves and validates the existing draft
while resuming downstream local work. Review or edit the Story in Sheets, then
change the row to Publish. Publish never regenerates it and ingests the exact
current cell. Rows with a blank Experience remain media-only, do not call the
model, and leave `Atlas Story` untouched.

## Explicit Place and Visit registration

Adding a row never creates geography by inference. To request a missing Place,
put its name in `Location`, set the row to `Publish To = Atlas` or `Both`,
select an existing `Atlas Journey`, choose `New Place` in `Atlas Place`, set
`Atlas Stop = Yes`, and enter `latitude, longitude` in `Atlas Coordinates`.
Keep `Atlas Mode = Off`. The stable Post ID identifies the request even if the
Sheet is sorted.

Preview the exact registration first:

```bash
npm run editorial:register:place -- --preview --oauth-client "C:\\private\\google-oauth-client.json" --spreadsheet-id "SPREADSHEET_ID" --posts-gid "TAB_GID" --post-id "POST_ID" --parent-place "PARENT_PLACE" --summary "PUBLIC PLACE SUMMARY" --after-place "PRIOR_PLACE"
```

Replace `--preview` with `--apply` only after reviewing the output. A new Place
requires an existing parent Place, or the explicit value `none`, verified
`Atlas Coordinates`, and a short public summary. The paired `--longitude` and
`--latitude` options are an explicit recovery override. Category, coordinate
precision, country/region codes, official links, map links, camera settings,
and a stable ID override are optional. `--after-place` controls Journey order;
omitting it appends the Visit. The row date remains display evidence and is not
used to infer order.

The generated Atlas node uses the Atlas node for that parent Place, so country,
city, district, venue, and attraction nesting can continue to any depth. The
command rejects a parent that is not already represented in the selected
Journey.

Two guarded live migrations on November 27, 2026 added only `Atlas
Coordinates` and then `Atlas Stop`. The second migration added the `No` or
`Yes` dropdown without backfilling classifications. Both preserved all
original creator fields, unrelated rows, 108 eligible Post IDs, and existing
bindings. The final live baseline proposed no further changes.

If the requested name resolves to an existing canonical Place that lacks a
Visit in the selected Journey, the command reuses the Place and creates only
the Visit and Atlas pin. If that Journey already visits the Place, registration
stops and directs the creator to select the existing choice.

Apply updates only the generated geography shard, validates and builds it,
promotes it through the same protected develop and main pull-request path,
waits for Pages, checks the exact rendered Atlas Place, refreshes the hidden
Catalog and visible Atlas Reference, then replaces `New Place` with the
registered Place and writes its hidden IDs. The command is resumable and checks
the unchanged Sheet source before every guarded write. It never uploads media
or changes `Atlas Mode`; the creator chooses Preview or Publish afterward.

## Preview behavior

Preview performs local work plus one narrowly guarded Google Sheet write:

1. Resolve the designated Sheet gid and one stable Post ID.
2. Require `Publish To = Atlas` or `Both`, a canonical Journey, and a Drive
   folder. Blank `Atlas Place` means Journey scope. A chosen Atlas Place must
   resolve to a real Visit in that Journey.
3. Inventory the folder. If `Atlas Experience` is present, send `Atlas Notes`,
   the complete storytelling framework, the relevant Journey section from
   owner travel context, canonical target labels, and image/video counts to
   the OpenAI Responses API. Media bytes and filenames are not sent. Explicit
   `--reuse-story` recovery skips this request and uses the existing draft.
4. Validate the structured draft for length, public punctuation rules, and
   workflow language. Re-read the stable Post ID, reject any concurrent source
   change, overwrite only `Atlas Story`, and verify its exact readback.
5. Combine the refreshed Sheet source hash with the immutable Drive metadata
   fingerprint.
6. Stream every direct JPEG, PNG, and MP4 into a private hash-addressed
   snapshot below `.state/editorial/runs/`, computing byte size and SHA-256
   incrementally without buffering a complete source file.
7. Reuse `media:prepare` to build separate deterministic image and video
   packages. The linked Drive folder may freely mix all three supported file
   formats; this partition is internal and requires no folder management by
   the owner.
8. Run mandatory receipt-free `media:ingest --dry-run` validation.
9. Plan the combined generated Media, Experience, Moment, and placement diff.
10. Write a private `publication-plan.json` and stop.

Preview does not upload to R2, mutate generated application records, create a
Git branch, call GitHub, deploy Pages, or write publication status to Sheets.
An ordinary Experience Preview mutates only the exact `Atlas Story` cell;
`--reuse-story` makes no remote mutation. The API request uses structured
output, disables response storage, has a bounded timeout, and never logs the
API key. No fake upload receipt is accepted.

## Apply behavior

Apply requires the selected row to remain exactly `Atlas Mode = Publish`.
Before selection, apply refreshes the canonical Catalog and visible protected
Atlas Reference, then re-reads Posts so newly generated choices are current.
After the preview plan, it re-reads the row and Drive inventory before upload.
It then:

1. uploads each prepared package through the existing R2 Worker and records a
   checksum receipt;
2. applies the existing Media ingestor for each real receipt;
3. requires the reviewed `Atlas Story`, compiles one stable Moment per Post,
   and optionally resolves or creates an Experience, without calling a model;
4. updates only the generated Media and editorial JSON shards, with rollback
   on validation failure;
5. runs the production build;
6. rechecks the unchanged Sheet source and Drive inventory;
7. creates a deterministic per-post branch from `origin/develop` in an
   isolated private worktree;
8. commits only the two allowlisted generated JSON files;
9. opens a pull request to `develop`, waits for `validate`, and merges with a
   merge commit;
10. waits for the `develop` push validation, then promotes `develop` to `main`
    through a second merge-commit pull request;
11. waits for the Pages workflow and checks the rendered public URL for the
    exact newly published R2 media URL;
12. refreshes the hidden Catalog and visible protected Atlas Reference,
    including the newly generated Experience; and
13. re-finds the row by Post ID, rechecks its source hash and Publish mode,
    writes deployment metadata, then reads the values back.

Git publication checkpoints are private and resumable. Target branches reject
deletion and non-fast-forward updates. The hardened ruleset requires the
`validate` check and permits only merge commits, preserving branch and merge
history for reversal. The publisher refuses to start a new post when
`develop` and `main` have different source trees.

## Experience and Moment model

Generated editorial state lives in
`src/content/editorial/generated/records.json`. `src/content/experiences/`
validates and composes that shard. A published Experience appears within its
Journey page with a stable `#experience-<slug>` deep link. Moments are ordered
by append order inside an Experience. A travel date is display evidence only,
not an inferred ordering key.

`Atlas Experience` accepts:

- an existing Experience title in the selected Journey;
- `New: <title>` for a new Experience in that Journey; or
- blank, which keeps the contribution at Journey or Visit scope and does not
  invent an Experience.

The same Post ID revises its own Moment idempotently. A second Post assigned to
the same Experience appends a second Moment. `Atlas Notes` never enters the
generated record. Public title and `Atlas Story` validation rejects dash
punctuation and workflow labels and does not invent missing copy. Media
placements can now reference a validated Experience in the same Journey.

## Live baseline already verified

The owner-authorized migration retained all eight original columns, added the
workflow fields, hid and warning-protected the automation columns, and kept
six unrelated rows untouched. The 2026-11-16 upgrade normalized `Publish To`,
added `Atlas Place`, defaulted all 106 eligible rows to `Social`, backfilled 82
readable Visit-backed Place labels, and verified that every original creator
field remained unchanged.

The hidden Catalog contains the current canonical Journey, Place, Visit, Atlas
node, and generated Experience choices. The visible protected Atlas Reference
currently contains 81 rows: 10 Journeys and 71 Journey-to-Place Visit records.
The owner reviewed and applied all 106 Journey and Place bindings. Eighty-two
historical rows have Visit IDs; the remaining rows deliberately publish at
Journey scope while `Atlas Place` is blank rather than inventing a Visit.

The Posts range remains a native Google Sheets table. Its table metadata owns
the `Publish To`, `Atlas Journey`, `Atlas Place`, and `Atlas Mode` dropdowns.
This avoids invalid range-level validation writes to typed table columns. A
catalog sync rebuilds both lookup tabs and refreshes those table choices. The
live table now exposes `New Place` alongside 69 unique existing Place labels;
the catalog refresh preserved all Posts values and verified all 106 bindings.

## Supporting commands

The earlier bounded commands remain available for migration and diagnosis:

```bash
npm run editorial:baseline -- --dry-run
npm run editorial:migrate -- --apply ...
npm run editorial:catalog -- --apply ...
npm run editorial:register:place -- --preview ...
npm run editorial:suggest:places -- ...
npm run editorial:bind:reviewed-places -- --apply ...
npm run editorial:github:audit -- --json
npm run editorial:github:configure -- --dry-run
```

Run `editorial:catalog -- --apply` after adding a canonical Journey, Place, or
Visit outside the Sheet publisher. The explicit registration command performs
that refresh itself. Experiences created by an apply-mode publication appear
automatically in both lookup tabs during that same run.

`editorial:github:configure -- --apply` is allowed only after the validation
workflow exists on both remote branches. The live ruleset now protects
`develop` and `main` from deletion and non-fast-forward updates, permits only
merge-commit pull requests, and requires the strict `validate` context. The
configuration command semantically verifies those rules after applying them.

## Verified boundaries and remaining work

Implemented and test-covered:

- Google OAuth, Sheet reads and guarded writes, Drive inventory and streamed
  download with incremental snapshot hashing
- table-aware `Publish To`, Journey, Place, and Mode choices plus a visible
  protected canonical reference
- deterministic private snapshots, streamed retry verification, and
  image/video packages
- explicit Preview recovery that reuses a saved Story without a model call or
  Sheet write
- receipt-free preview planning and real-receipt apply plumbing
- generated Experience and Moment records, selectors, validation, and Journey
  presentation
- explicit row-backed Place and Visit registration with read-only preview,
  generated canonical geography, Atlas pin creation, protected promotion,
  Catalog refresh, and guarded row binding
- isolated generated-file branches, two-stage pull-request promotion, workflow
  observation, exact rendered-page verification, and guarded write-back
- deterministic retry identities for snapshots, media batches, Moments,
  branches, and GitHub checkpoints
- live feature promotion through pull requests 30 and 31, two successful
  validation jobs, Pages run 43800514937, and exact rendered production proof
- Atlas Reference routing promotion through pull requests 34 and 35, develop
  run 43812635732, Pages run 43813022343, and rendered production proof
- explicit Place registration promotion through pull requests 42 and 43,
  table compatibility correction through pull requests 44 and 45, successful
  develop and Pages workflows, and live `New Place` dropdown readback

Still owner-controlled or externally unverified:

- first live row-backed `New Place` registration and generated Atlas pin; the
  command and its Sheet request surface are implemented and verified, but no
  new Place record has been applied yet
- creating an entirely new Journey from a row
- an optional Utah 2026 Salt Lake City Airport transit Visit if that stop later
  needs Place-scoped presentation
- optional background polling or Windows Task Scheduler integration
- destructive unpublish, remote branch deletion, or R2 deletion, which are
  intentionally outside this command

## Phase checklist

- [x] Baseline the live Sheet and preserve the current social workflow.
- [x] Seed stable Post IDs and bind all historical Journey and Place choices.
- [x] Add friendly publication routing and an automatically refreshed Atlas
      Reference without creator-managed relational tabs.
- [x] Implement private Drive snapshots and mandatory local media planning.
- [x] Stream Drive intake and snapshot verification, and support Story-safe
      Preview recovery after a downstream technical failure.
- [x] Implement Experience and Moment generated records and public projection.
- [x] Implement real-receipt R2 apply and atomic generated-record compilation.
- [x] Implement isolated per-post branches and staged merge-commit promotion.
- [x] Implement workflow, Pages, rendered content, Catalog, and Sheet checks.
- [x] Implement an explicit `New Place` and Visit registration command.
- [x] Run the first owner-selected Preview row against a real Drive folder.
- [x] Publish the owner-approved Bajos del Toro row through R2 and production,
      with guarded Sheet metadata recovery documented above.
- [x] Complete an uninterrupted resumable Drake Bay publication without manual
      metadata recovery.
- [ ] Prove the two-Post, one-Experience regression with real content.
- [ ] Consider an opt-in local watcher only after field publication is stable.
