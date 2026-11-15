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
  - scripts/test-editorial-baseline.mjs
  - scripts/test-editorial-google.mjs
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
---

# Single-row Sheets and Drive Atlas publishing implementation

The accepted target is documented in the
[single-row publishing proposal](../proposals/single-row-sheets-drive-atlas-publishing.md).
This implementation remains deliberately bounded. It establishes the verified
Phase 0 repository audit and a read-only Phase 1 baseline client. It can
authenticate locally and read a designated Posts tab plus an explicitly
supplied Drive folder, but the Google path has only mocked API verification so
far. It does not mutate the Posts sheet, upload media, alter canonical content,
commit generated publication state, or deploy the site.

## Implemented and tested

- `editorial:baseline -- --dry-run` builds a deterministic catalog from the
  current canonical Journey, Place, Visit, and Atlas presentation registries.
- The catalog references existing code-owned records. It does not clone or
  generate replacement Journey, Place, Visit, or Atlas records.
- An optional `--posts-csv <path>` input audits an offline Posts export. This
  is a migration and testing bridge, not the intended live source.
- `--live` uses an installed desktop-app OAuth client, a loopback callback with
  PKCE and state validation, and refresh-token storage outside the repository.
  It batch-reads only the designated Posts tab.
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
  Google reads and OAuth token refresh only. No Sheet, Drive, content, Git, R2,
  or deployment write is implemented.
- Local working paths under `.cache/editorial/` and `.state/editorial/` are
  ignored so future source snapshots, receipts, and private ledger data cannot
  be committed accidentally.

Current verified catalog totals are 10 Journeys, 77 Places, 71 Visits, and 65
Atlas nodes. These totals are evidence from the current repository, not a
promise that future runs will retain the same counts.

## Phase 0 authority audit

| Capability                                       | State    | Current authority or gap                                                                                                                                                            |
| ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journey, Place, and Visit records                | Existing | `src/content/journeys/index.mjs` and `src/content/places/index.mjs` compose code-owned canonical records.                                                                           |
| Atlas identity and public projections            | Existing | `src/content/atlas/presentation.mjs`, `src/content/selectors/projections.mjs`, `src/features/atlas/routes.js`, and `src/router/index.js` own presentation, projections, and routes. |
| Media preparation, R2 upload, and ingestion      | Existing | `scripts/optimize-images.js`, `scripts/upload-media.js`, and `scripts/ingest-media.js` implement separate reviewed commands. The editorial baseline does not invoke them.           |
| Sheets and Drive source reads                    | Partial  | The new read-only adapters and planner exist and are mock-tested. Owner authentication, real headers, folder coverage, and historical reconciliation are externally unverified.     |
| Experience and Moment records                    | Missing  | The media contract has an optional `experienceId` hook, but there is no canonical Experience/Moment registry, selector, or route.                                                   |
| Sheet catalog, stable ID seeding, and write-back | Missing  | No protected catalog range, targeted hidden-column writer, or approved migration exists.                                                                                            |
| Publication orchestrator                         | Missing  | No command compiles a row, downloads Drive media, calls the media pipeline, creates a scoped Git change, observes Pages, or verifies a public URL.                                  |

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

Read the designated live Posts tab without writing it:

```bash
npm run editorial:baseline -- --dry-run --live --oauth-client "C:\\private\\google-oauth-client.json" --spreadsheet-id "SPREADSHEET_ID"
```

Add `--drive-folder "https://drive.google.com/drive/folders/FOLDER_ID"` only
when the OAuth grant is expected to cover that folder. The first run opens the
Google consent page. The refresh token defaults to the current user's
`.roam-with-justin/editorial-google-token.json` path, outside this repository.
These equivalent environment variable names are supported:

- `EDITORIAL_GOOGLE_OAUTH_CLIENT_PATH`
- `EDITORIAL_GOOGLE_TOKEN_PATH`
- `EDITORIAL_GOOGLE_SPREADSHEET_ID`
- `EDITORIAL_GOOGLE_POSTS_RANGE`
- `EDITORIAL_GOOGLE_DRIVE_SCOPE`
- `EDITORIAL_GOOGLE_ALLOW_RESTRICTED_DRIVE_SCOPE`

Do not put credential or token values in a repository `.env` file.

## Phase checklist

- [x] Verify current registries, selectors, routes, media tooling, and
      deployment boundaries.
- [x] Adopt the single-row authoring proposal and archive superseded designs.
- [x] Build a deterministic read-only canonical catalog.
- [x] Validate the original and proposed Posts header contracts offline.
- [x] Add exact, non-destructive Journey and Place matching for audit reports.
- [x] Implement read-only Sheets and Drive adapters with mocked API tests.
- [ ] Authenticate to the live designated Google Sheet.
- [ ] Build and protect the automation-owned Atlas Catalog range.
- [ ] Dry-run stable Post ID seeding and targeted hidden-column writes.
- [ ] Reconcile the real historical Posts and record creator-reviewed
      ambiguous mappings.
- [ ] Prove the live baseline produces no public content change.
- [ ] Implement the mandatory local Drive and media ingestion planning pass.
- [ ] Implement later approved upload, applied ingestion, entity compilation,
      Experience/Moment presentation, deployment, and write-back phases.

## Missing setup and external verification

The first authenticated Phase 1 verification requires owner-controlled Google
configuration:

- a Google Cloud project with Sheets and Drive APIs enabled;
- an installed-app OAuth client;
- the designated spreadsheet ID and actual Posts tab name;
- a decision between a narrow selected-file/folder grant and any broader Drive
  read scope after testing the real folder workflow;
- secure local refresh-token storage outside the repository.

No real Google OAuth grant, live Sheet schema, Drive folder access, Cloudflare
upload, Git push, GitHub Actions run, or public Atlas change was verified or
performed by this implementation slice. The Sheets and Drive API tests use
mock clients and do not claim external access.

## Next safe implementation step

Run the authenticated, read-only baseline against the owner-designated Posts
tab. Confirm the real header contract, eligible row counts, missing stable IDs,
exact mappings, and ambiguities, and separately prove whether the narrow Drive
grant can list every intended child. ID seeding and protected catalog
write-back remain a later reviewed write step.
