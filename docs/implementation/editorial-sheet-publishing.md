---
id: editorial-sheet-publishing-implementation
title: Single-Row Sheets and Drive Atlas Publishing Implementation
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-15
updated: 2026-11-15
related:
  - editorial-single-row-atlas-publishing
  - content-model
  - media-pipeline
  - journey-media-ingestion
supersedes: []
superseded_by: []
code_paths:
  - scripts/editorial-baseline.mjs
  - scripts/lib/editorial-baseline.mjs
  - scripts/lib/editorial-google-auth.mjs
  - scripts/lib/editorial-google-sheets.mjs
  - scripts/lib/editorial-google-drive.mjs
  - scripts/lib/editorial-google-migration.mjs
  - scripts/editorial-migrate-sheet.mjs
  - scripts/test-editorial-baseline.mjs
  - scripts/test-editorial-google.mjs
  - scripts/test-editorial-migration.mjs
  - package.json
  - package-lock.json
  - .gitignore
verification:
  state: verified
  evidence:
    - npm run editorial:test
    - npm run editorial:baseline -- --dry-run
    - npm run content:validate
    - npm run docs:audit
    - npm run build
    - authenticated read-only Sheet baseline on 2026-11-15
    - creator-authorized live Sheet migration on 2026-11-15
---

# Single-row Sheets and Drive Atlas publishing implementation

The accepted target is documented in the
[single-row publishing proposal](../proposals/single-row-sheets-drive-atlas-publishing.md).
This implementation remains deliberately bounded. It establishes the verified
Phase 0 repository audit and the bounded Phase 1 baseline migration. It can
authenticate locally, read a designated Posts tab plus an explicitly supplied
Drive folder, and run the separately gated Posts schema/identity migration.
The Sheet reader has both mocked API coverage and successful owner-authenticated
reads. The creator-authorized migration is complete. No command here uploads
media, alters canonical application content, commits generated publication
state, or deploys the site.

## Implemented and tested

- `editorial:baseline -- --dry-run` builds a deterministic catalog from the
  current canonical Journey, Place, Visit, and Atlas presentation registries.
- The catalog references existing code-owned records. It does not clone or
  generate replacement Journey, Place, Visit, or Atlas records.
- An optional `--posts-csv <path>` input audits an offline Posts export. This
  is a migration and testing bridge, not the intended live source.
- `--live` uses an installed desktop-app OAuth client, a loopback callback with
  PKCE and state validation, an explicit Google account chooser, and
  refresh-token storage outside the repository. It batch-reads only the
  designated Posts tab.
- An optional `--drive-folder <url>` validates the Drive folder, lists every
  direct child through pagination, and reports supported JPEG, PNG, and MP4
  inventory without downloading anything.
- The default Drive scope is `drive.file`. That narrow scope does not make an
  arbitrary pasted folder accessible. The real folder workflow must first
  prove an approved Picker/open-with grant. The broader `drive.readonly` scope
  is rejected unless the owner explicitly enables it after reviewing Google's
  restricted-scope implications.
- The audit validates the original eight Posts headers, reports the six Atlas
  headers that need to be added, filters by an exact account label, calculates
  stable source hashes, and reports exact Journey/Place matches, new Journey
  requests, missing Post IDs, and rows that need review.
- The command is read-only by construction. It rejects execution without
  `--dry-run`; normal mode performs no remote calls, while `--live` performs
  Google reads and OAuth token refresh only.
- `editorial:migrate -- --apply` is the separate Sheets-write boundary. It
  requires the Sheets write scope, re-reads the source before one atomic batch,
  rejects missing original headers or duplicate Post IDs, and verifies the
  original creator-owned fields afterward.
- The authorized live migration appended the six visible Atlas columns,
  appended and hid 16 warning-protected automation columns, froze the header,
  installed the `Off`/`Preview`/`Publish` validation, assigned 104 UUID Post
  IDs, and defaulted the same 104 historical Roam rows to `Off`. It left all
  original fields and six unrelated rows unchanged.
- Local working paths under `.cache/editorial/` and `.state/editorial/` are
  ignored so future source snapshots, receipts, and private ledger data cannot
  be committed accidentally.

Current verified catalog totals are 10 Journeys, 77 Places, 71 Visits, and 65
Atlas nodes. These totals are evidence from the current repository, not a
promise that future runs will retain the same counts.

The first authenticated live baseline on November 15, 2026 resolved the shared
tab gid to `Sheet1`. It found 104 eligible `Roam` rows and ignored 6 unrelated
rows. All eight original headers remain present. The six visible Atlas headers
and the automation-owned metadata headers are absent, all 104 eligible rows
need stable Post IDs, and 33 Location values resolve to exact unambiguous Place
records. No remote write occurred.

The subsequent creator-authorized migration completed on November 15, 2026.
An independent post-migration read found no missing visible or automation
headers and no missing Post IDs. It retained the same 104 eligible rows, 6
ignored rows, and 33 exact Place candidates. No Atlas publication was enabled.

## Phase 0 authority audit

| Capability                                  | State    | Current authority or gap                                                                                                                                                            |
| ------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journey, Place, and Visit records           | Existing | `src/content/journeys/index.mjs` and `src/content/places/index.mjs` compose code-owned canonical records.                                                                           |
| Atlas identity and public projections       | Existing | `src/content/atlas/presentation.mjs`, `src/content/selectors/projections.mjs`, `src/features/atlas/routes.js`, and `src/router/index.js` own presentation, projections, and routes. |
| Media preparation, R2 upload, and ingestion | Existing | `scripts/optimize-images.js`, `scripts/upload-media.js`, and `scripts/ingest-media.js` implement separate reviewed commands. The editorial baseline does not invoke them.           |
| Sheets and Drive source reads               | Partial  | Owner-authenticated Sheet reading and gid resolution are verified. Drive folder coverage remains externally unverified.                                                             |
| Experience and Moment records               | Missing  | The media contract has an optional `experienceId` hook, but there is no canonical Experience/Moment registry, selector, or route.                                                   |
| Sheet schema, identity, and catalog         | Partial  | The authorized schema/identity migration and guarded writer are verified. The protected Atlas Catalog and canonical binding write-back remain.                                      |
| Publication orchestrator                    | Missing  | No command compiles a row, downloads Drive media, calls the media pipeline, creates a scoped Git change, observes Pages, or verifies a public URL.                                  |

Canonical Git-backed records remain authoritative. The Sheet is the intended
creator source for future authoring events, but it does not replace or clone
current canonical entities during baseline reconciliation.

## Commands

Build the current catalog without reading Posts:

```bash
npm run editorial:baseline -- --dry-run
```

Audit a private local CSV export without writing anything:

```bash
npm run editorial:baseline -- --dry-run --posts-csv ".cache/editorial/Posts.csv"
```

Use a different exact account label when the live Sheet does not use `Roam`:

```bash
npm run editorial:baseline -- --dry-run --posts-csv ".cache/editorial/Posts.csv" --account "Roam With Justin"
```

Run the deterministic catalog, CSV, schema, filter, and matching tests:

```bash
npm run editorial:test
```

Run the separately authorized, guarded Sheet migration:

```bash
npm run editorial:migrate -- --apply --oauth-client "C:\\private\\google-oauth-client.json" --spreadsheet-id "SPREADSHEET_ID" --posts-gid "TAB_GID"
```

Read the designated live Posts tab without writing it:

```bash
npm run editorial:baseline -- --dry-run --live --oauth-client "C:\\private\\google-oauth-client.json" --spreadsheet-id "SPREADSHEET_ID"
```

When the shared URL supplies a numeric `gid`, use `--posts-gid <gid>` to
resolve the current tab title through spreadsheet metadata rather than assuming
the tab is literally named `Posts`.

Add `--drive-folder "https://drive.google.com/drive/folders/FOLDER_ID"` only
when the OAuth grant is expected to cover that folder. The first run opens the
Google consent page. The refresh token defaults to the current user's
`.roam-with-justin/editorial-google-token.json` path, outside this repository.
These equivalent environment variable names are supported:

- `EDITORIAL_GOOGLE_OAUTH_CLIENT_PATH`
- `EDITORIAL_GOOGLE_TOKEN_PATH`
- `EDITORIAL_GOOGLE_SPREADSHEET_ID`
- `EDITORIAL_GOOGLE_POSTS_RANGE`
- `EDITORIAL_GOOGLE_SHEETS_ACCESS`
- `EDITORIAL_GOOGLE_DRIVE_SCOPE`
- `EDITORIAL_GOOGLE_ALLOW_RESTRICTED_DRIVE_SCOPE`

Do not put credential or token values in a repository `.env` file.

If Google authorized the wrong signed-in account, rerun the live command with
`--reauthorize`. The prior token is moved to a timestamped backup beside the
active token, and Google must show the account chooser before issuing a
replacement. Use an OAuth desktop client from the intended Cloud project; an
unrelated project's client can leave API enablement under the wrong owner.

## Phase checklist

- [x] Verify current registries, selectors, routes, media tooling, and
      deployment boundaries.
- [x] Adopt the single-row authoring proposal and archive superseded designs.
- [x] Build a deterministic read-only canonical catalog.
- [x] Validate the original and proposed Posts header contracts offline.
- [x] Add exact, non-destructive Journey and Place matching for audit reports.
- [x] Implement read-only Sheets and Drive adapters with mocked API tests.
- [x] Authenticate to and baseline the live designated Google Sheet without
      writing it.
- [ ] Build and protect the automation-owned Atlas Catalog range.
- [x] Dry-run, authorize, apply, and independently verify stable Post ID
      seeding plus targeted hidden-column writes.
- [ ] Reconcile the real historical Posts and record creator-reviewed
      ambiguous mappings.
- [x] Prove the baseline and schema/identity migration produce no canonical or
      public application content change.
- [ ] Implement the mandatory local Drive and media ingestion planning pass.
- [ ] Implement later approved upload, applied ingestion, entity compilation,
      Experience/Moment presentation, deployment, and write-back phases.

## Missing setup and external verification

The owner-controlled Internal OAuth client, read-only Sheets access, shared
workbook, gid resolution, and secure refresh-token storage outside the
repository are now verified. The remaining external setup decision is whether
the narrow `drive.file` grant can cover the real reviewed folder workflow or a
different owner-approved approach is required.

No Drive folder access, Cloudflare upload, Git push, GitHub Actions run, or
public Atlas change was verified or performed by this implementation slice.
Drive API behavior remains mock-tested only.

## Next safe implementation step

Build the automation-owned Atlas Catalog from canonical references, then
produce a reviewable binding report for the 33 exact Place candidates before
writing any `place_id`, Journey, Visit, or URL fields. Separately prove that the
narrow Drive grant can inventory every intended child in one real reviewed
folder. Neither step may publish content.
