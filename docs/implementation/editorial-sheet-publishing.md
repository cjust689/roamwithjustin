---
id: editorial-sheet-publishing-implementation
title: Single-Row Sheets and Drive Atlas Publishing Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-15
updated: 2026-11-17
related:
  - editorial-single-row-atlas-publishing
  - content-model
  - media-pipeline
  - journey-media-ingestion
supersedes: []
superseded_by: []
code_paths:
  - scripts/editorial-publish.mjs
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
  - scripts/lib/editorial-command.mjs
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
  - scripts/test-editorial-command.mjs
  - scripts/test-editorial-place-registration.mjs
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
    - authenticated read-only Sheet baseline on 2026-11-15
    - creator-authorized live Sheet migration on 2026-11-15
    - verified live Atlas Catalog and 106 Journey and Place bindings on 2026-11-16
    - verified 82 live Visit bindings on 2026-11-16
    - creator-authorized Publish To and Atlas Place upgrade verified on 106 rows on 2026-11-16
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
    - owner-authenticated Drive video snapshot and Worker R2 integrity receipt on 2026-11-17
---

# Single-row Sheets and Drive Atlas publishing implementation

The repository now contains the bounded one-row publication path described by
the [accepted proposal](../proposals/single-row-sheets-drive-atlas-publishing.md).
The creator continues to edit one Posts tab. Generated application state,
private checkpoints, Git branches, validation, deployment observation, and
guarded Sheet metadata remain automation concerns.

The code path is implemented and locally tested. The historical Sheet
migration, 106 Journey and Place bindings, 82 Visit relations, the visible
protected Atlas Reference, GitHub pull-request promotion, Actions build,
Pages deployment, rendered-page verification, and hardened branch rules are
live verified. One real Costa Rica row produced an authenticated Drive video
snapshot and a Worker R2 integrity receipt. Its publication stopped before Git
promotion when the former direct `Atlas Notes` projection failed public-copy
validation. The new reviewed `Atlas Story` boundary addresses that failure,
but the first complete end-to-end publication is still outstanding.

## One-command workflow

Preview one selected row:

```bash
npm run editorial:publish -- --preview --oauth-client "C:\private\google-oauth-client.json" --spreadsheet-id "SPREADSHEET_ID" --posts-gid "TAB_GID" --post-id "POST_ID"
```

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

`Atlas Notes` is private firsthand evidence. `Atlas Story` is reviewed public
copy. For a row with an Experience, every Preview command regenerates and
overwrites `Atlas Story`, including any manual edits to the prior draft. Review
or edit the new Story in Sheets, then change the row to Publish. Publish never
regenerates it and ingests the exact current cell. Rows with a blank Experience
remain media-only, do not call the model, and leave `Atlas Story` untouched.

## Explicit Place and Visit registration

Adding a row never creates geography by inference. To request a missing Place,
put its name in `Location`, set the row to `Publish To = Atlas` or `Both`,
select an existing `Atlas Journey`, choose `New Place` in `Atlas Place`, and
keep `Atlas Mode = Off`. The stable Post ID identifies the request even if the
Sheet is sorted.

Preview the exact registration first:

```bash
npm run editorial:register:place -- --preview --oauth-client "C:\\private\\google-oauth-client.json" --spreadsheet-id "SPREADSHEET_ID" --posts-gid "TAB_GID" --post-id "POST_ID" --parent-place "PARENT_PLACE" --longitude "LONGITUDE" --latitude "LATITUDE" --summary "PUBLIC PLACE SUMMARY" --after-place "PRIOR_PLACE"
```

Replace `--preview` with `--apply` only after reviewing the output. A new Place
requires an existing parent Place, or the explicit value `none`, verified
longitude and latitude, and a short public summary. Category, coordinate
precision, country/region codes, official links, map links, camera settings,
and a stable ID override are optional. `--after-place` controls Journey order;
omitting it appends the Visit. The row date remains display evidence and is not
used to infer order.

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
   the OpenAI Responses API. Media bytes and filenames are not sent.
4. Validate the structured draft for length, public dash punctuation, and
   workflow language. Re-read the stable Post ID, reject any concurrent source
   change, overwrite only `Atlas Story`, and verify its exact readback.
5. Combine the refreshed Sheet source hash with the immutable Drive metadata
   fingerprint.
6. Download every direct JPEG, PNG, and MP4 into a private hash-addressed
   snapshot below `.state/editorial/runs/`.
7. Reuse `media:prepare` to build separate deterministic image and video
   packages. The linked Drive folder may freely mix all three supported file
   formats; this partition is internal and requires no folder management by
   the owner.
8. Run mandatory receipt-free `media:ingest --dry-run` validation.
9. Plan the combined generated Media, Experience, Moment, and placement diff.
10. Write a private `publication-plan.json` and stop.

Preview does not upload to R2, mutate generated application records, create a
Git branch, call GitHub, deploy Pages, or write publication status to Sheets.
Its only remote mutation is the exact `Atlas Story` cell. The API request uses
structured output, disables response storage, has a bounded timeout, and never
logs the API key. No fake upload receipt is accepted.

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

On Windows, local validation and isolated-worktree validation invoke the real
`npm-cli.js` through the active Node executable. They do not ask `spawnSync` to
launch the `npm.cmd` shell shim, which avoids the platform `EINVAL` failure
encountered after a successful generated-content validation. A retry remains
safe because generated JSON is rolled back on local build failure and existing
immutable R2 objects and receipts are reused.

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

- Google OAuth, Sheet reads and guarded writes, Drive inventory and download
- table-aware `Publish To`, Journey, Place, and Mode choices plus a visible
  protected canonical reference
- deterministic private snapshots and image/video packages
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

- first real Drive download through the chosen OAuth scope
- first row-backed end-to-end post publication and Sheet Published readback
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
- [x] Implement Experience and Moment generated records and public projection.
- [x] Implement real-receipt R2 apply and atomic generated-record compilation.
- [x] Implement isolated per-post branches and staged merge-commit promotion.
- [x] Implement workflow, Pages, rendered content, Catalog, and Sheet checks.
- [x] Implement an explicit `New Place` and Visit registration command.
- [x] Run the first owner-selected Preview row against a real Drive folder.
- [ ] Run the first owner-approved Publish row through R2 and production.
- [ ] Prove the two-Post, one-Experience regression with real content.
- [ ] Consider an opt-in local watcher only after field publication is stable.
