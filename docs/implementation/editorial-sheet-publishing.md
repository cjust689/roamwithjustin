---
id: editorial-sheet-publishing-implementation
title: Single-Row Sheets and Drive Atlas Publishing Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-15
updated: 2026-11-16
related:
  - editorial-single-row-atlas-publishing
  - content-model
  - media-pipeline
  - journey-media-ingestion
supersedes: []
superseded_by: []
code_paths:
  - scripts/editorial-publish.mjs
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
  - scripts/lib/editorial-github.mjs
  - scripts/lib/editorial-github-publisher.mjs
  - scripts/lib/editorial-github-rules.mjs
  - scripts/lib/editorial-google-auth.mjs
  - scripts/lib/editorial-google-drive.mjs
  - scripts/lib/editorial-google-publication.mjs
  - scripts/lib/editorial-google-visits.mjs
  - scripts/lib/editorial-publication-plan.mjs
  - src/content/experiences/index.mjs
  - src/content/editorial/generated/records.json
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
    - verified live Atlas Catalog and 104 Journey and Place bindings on 2026-11-15
    - verified 82 live Visit bindings on 2026-11-16
---

# Single-row Sheets and Drive Atlas publishing implementation

The repository now contains the bounded one-row publication path described by
the [accepted proposal](../proposals/single-row-sheets-drive-atlas-publishing.md).
The creator continues to edit one Posts tab. Generated application state,
private checkpoints, Git branches, validation, deployment observation, and
guarded Sheet metadata remain automation concerns.

The code path is implemented and locally tested. The historical Sheet
migration and bindings are live verified. A real post has not yet supplied the
combination of `Atlas Mode`, Drive media, and credentials needed to prove the
first end-to-end R2 publication, so the implementation remains partial.

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

The OAuth client and refresh token must remain outside the repository. R2 apply
also requires `MEDIA_UPLOAD_WORKER_URL` and `MEDIA_UPLOAD_TOKEN` in the process
environment. GitHub authentication comes from an existing Git Credential
Manager login or a supported token environment variable.

## Preview behavior

Preview performs only local and Google read operations:

1. Resolve the designated Sheet gid and select one stable Post ID.
2. Require a canonical Journey and Drive folder. A Visit must carry its Place;
   a broad Place with no Visit deliberately publishes at Journey scope.
3. Inventory the folder and combine the Sheet source hash with the immutable
   Drive metadata fingerprint.
4. Download every direct JPEG, PNG, and MP4 into a private hash-addressed
   snapshot below `.state/editorial/runs/`.
5. Reuse `media:prepare` to build separate deterministic image and video
   packages.
6. Run mandatory receipt-free `media:ingest --dry-run` validation.
7. Plan the combined generated Media, Experience, Moment, and placement diff.
8. Write a private `publication-plan.json` and stop.

Preview does not upload to R2, mutate generated application records, create a
Git branch, call GitHub, deploy Pages, or write publication status to Sheets.
No fake upload receipt is accepted.

## Apply behavior

Apply requires the selected row to remain exactly `Atlas Mode = Publish`.
After the preview plan, it re-reads the row and Drive inventory before upload.
It then:

1. uploads each prepared package through the existing R2 Worker and records a
   checksum receipt;
2. applies the existing Media ingestor for each real receipt;
3. compiles one stable Moment per Post and optionally resolves or creates an
   Experience;
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
12. refreshes the hidden Catalog, including Experience choices; and
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
the same Experience appends a second Moment. Public title and notes validation
rejects dash punctuation and does not invent missing copy. Media placements
can now reference a validated Experience in the same Journey.

## Live baseline already verified

The owner-authorized migration retained all eight original columns, added only
the six visible Atlas columns, hid and warning-protected the automation
columns, seeded 104 UUID Post IDs, and kept every historical row `Off`. Six
unrelated rows were untouched.

The hidden Catalog contains the current canonical Journey, Place, Visit, Atlas
node, and generated Experience choices. The owner reviewed and applied all 104
Journey and Place bindings. A guarded relation pass then wrote and verified 82
unique Visit IDs. Twenty-one broad Utah or Costa Rica root rows and the Salt
Lake City Airport arrival and departure row have no artificial Visit. They
publish at Journey scope unless a real Visit is deliberately added later.

## Supporting commands

The earlier bounded commands remain available for migration and diagnosis:

```bash
npm run editorial:baseline -- --dry-run
npm run editorial:migrate -- --apply ...
npm run editorial:catalog -- --apply ...
npm run editorial:suggest:places -- ...
npm run editorial:bind:reviewed-places -- --apply ...
npm run editorial:github:audit -- --json
npm run editorial:github:configure -- --dry-run
```

`editorial:github:configure -- --apply` is allowed only after the validation
workflow exists on both remote branches. It updates the existing exact
`develop` and `main` ruleset, then semantically verifies merge-only pull
requests, strict current-base checks, and the required `validate` context.

## Verified boundaries and remaining work

Implemented and test-covered:

- Google OAuth, Sheet reads and guarded writes, Drive inventory and download
- deterministic private snapshots and image/video packages
- receipt-free preview planning and real-receipt apply plumbing
- generated Experience and Moment records, selectors, validation, and Journey
  presentation
- isolated generated-file branches, two-stage pull-request promotion, workflow
  observation, exact rendered-page verification, and guarded write-back
- deterministic retry identities for snapshots, media batches, Moments,
  branches, and GitHub checkpoints

Still owner-controlled or externally unverified:

- first real Drive download through the chosen OAuth scope
- production R2 Worker endpoint and token availability in this environment
- first end-to-end post publication and Sheet Published readback
- creating a missing Journey, Place, or Visit from a row; the current compiler
  targets existing canonical Journeys and Visits and can create Experiences
- an optional Utah 2026 Salt Lake City Airport transit Visit if that stop later
  needs Place-scoped presentation
- optional background polling or Windows Task Scheduler integration
- destructive unpublish, remote branch deletion, or R2 deletion, which are
  intentionally outside this command

## Phase checklist

- [x] Baseline the live Sheet and preserve the current social workflow.
- [x] Seed stable Post IDs and bind all historical Journey and Place choices.
- [x] Implement private Drive snapshots and mandatory local media planning.
- [x] Implement Experience and Moment generated records and public projection.
- [x] Implement real-receipt R2 apply and atomic generated-record compilation.
- [x] Implement isolated per-post branches and staged merge-commit promotion.
- [x] Implement workflow, Pages, rendered content, Catalog, and Sheet checks.
- [ ] Run the first owner-selected Preview row against a real Drive folder.
- [ ] Run the first owner-approved Publish row through R2 and production.
- [ ] Prove the two-Post, one-Experience regression with real content.
- [ ] Consider an opt-in local watcher only after field publication is stable.
