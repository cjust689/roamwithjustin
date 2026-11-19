---
id: gear-sheet-workflow
title: Gear Sheet Workflow
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-17
updated: 2026-11-17
related:
  - gear-system
  - gear-ingestion-cli
  - gear-publishing-implementation
supersedes: []
superseded_by: []
code_paths:
  - templates/roam-with-justin-gear-tracker.xlsx
  - scripts/generate-gear-workbook.mjs
  - scripts/ingest-gear-sheet.mjs
  - scripts/lib/gear-tracking-sheet.js
  - scripts/lib/editorial-google-sheets.mjs
  - scripts/test-gear-sheet.mjs
verification:
  state: verified
  evidence:
    - npm run gear:workbook
    - npm run gear:test
    - npm run editorial:test
    - npm run content:validate
    - npm run docs:audit
---

# Gear Sheet workflow

The Gear workbook provides one simple authoring table for product identity,
Journey or Visit usage, firsthand notes, media references, and reviewed
merchant links. Each row represents one product used within one Journey or
Visit. Reusing a product on a later trip means reusing its stable Gear ID in a
new row with a different Journey or Visit.

The generated workbook is
[`templates/roam-with-justin-gear-tracker.xlsx`](../../templates/roam-with-justin-gear-tracker.xlsx).
It contains:

- `README`, with the owner workflow and safety boundaries;
- `Gear`, the only authoring table; and
- `Gear Library`, a reusable one-row-per-product template table whose columns
  align with the `Gear` table; and
- `Catalog`, a hidden snapshot of allowed values plus the current canonical
  Journey, Visit, and Partner IDs.

The `Gear` range is an actual table. Sorting and filtering the table moves the
complete row, including stable IDs and hidden automation fields. Do not format
only part of the authoring range as a second table.

## Create and store the Sheet

Regenerate the workbook from current repository catalogs whenever the
canonical Journey, Visit, Partner, or Gear contracts change:

```bash
npm run gear:workbook
```

Upload the resulting `.xlsx` file to Google Drive, open it with Google Sheets,
and save it as a Google Sheet. Copy the spreadsheet ID from its URL. The Gear
tab name is `Gear` unless deliberately changed.

The workbook is a safe empty baseline. It does not contain example products
that could be mistaken for confirmed inventory.

## Reuse a product

Maintain one identity row for each recurring product in `Gear Library`. The
workbook generator also snapshots any products already present in the
canonical Gear registry into this table.

When the product is used on another trip:

1. copy, rather than cut, its complete `Gear Library` row;
2. paste that row into the next row of the `Gear` table;
3. add the Journey ID;
4. normally leave Visit ID blank for trip-wide use;
5. add usage type, evidence, visibility, notes, and related Media Asset IDs;
6. change Workflow to `Preview`.

The reusable row deliberately excludes the hidden automation result columns.
The importer reads only `Gear`; it never processes `Gear Library`. Reusing the
same stable Gear ID links the new Journey usage to the existing product rather
than creating another product.

## Row workflow

Use the `Workflow` dropdown to control processing:

| Value       | Behavior                                                                 |
| ----------- | ------------------------------------------------------------------------ |
| `Off`       | Retained for tracking and ignored by both commands.                      |
| `Preview`   | Included by preview and ignored by apply.                                |
| `Publish`   | Included by preview and apply.                                           |
| `Published` | Written by a successful apply and ignored until deliberately republished. |

Begin a new product as `needs-review` verification, `needs-review` evidence,
and `draft` visibility. Publication still fails closed unless canonical Gear
identity is verified and the Journey usage has reviewed evidence.

`Gear ID` is the permanent product identity. Reuse it when the same product
appears on another Journey. `Usage ID` may stay blank because ingestion derives
it deterministically from Gear, Journey, and Visit scope. Never reuse a Gear ID
for a different product.

## Preview

Preview reads `Preview` and `Publish` rows with read-only Sheets access. It
does not change the repository or the Sheet:

```bash
npm run gear:sheet -- --oauth-client "C:\path\to\desktop-oauth-client.json" --spreadsheet-id "GOOGLE_SHEET_ID"
```

If the tab was renamed, add `--gear-range "New tab name"`.

## Apply

After reviewing a successful preview, change the intended rows to `Publish`
and apply them:

```bash
npm run gear:sheet -- --apply --oauth-client "C:\path\to\desktop-oauth-client.json" --spreadsheet-id "GOOGLE_SHEET_ID"
```

The first apply may need a deliberate authorization upgrade because it writes
verification metadata back to the Sheet:

```bash
npm run gear:sheet -- --apply --reauthorize --oauth-client "C:\path\to\desktop-oauth-client.json" --spreadsheet-id "GOOGLE_SHEET_ID"
```

Add `--build` only when the same command should run the full production build
after content validation.

A successful apply:

1. processes only `Publish` rows;
2. performs deterministic Gear and Usage upserts;
3. writes only `src/content/gear/generated/records.json`;
4. runs canonical content validation;
5. changes the row to `Published`; and
6. writes an `Applied` result, content hash, and UTC timestamp to the hidden
   automation columns.

If repository validation, the optional build, or Sheet writeback fails, the
previous generated Gear data is restored. Repeating an identical row is safe
and does not duplicate Gear or Usage records.

## Current boundaries

- The workbook Catalog is a generated snapshot, not a live protected mirror.
  Regenerate the workbook when canonical choices change.
- `Gear Library` is a convenience template and canonical-product snapshot. It
  is not automatically synchronized into an already uploaded Google Sheet.
- Product images referenced by a Sheet row must already be canonical Media
  IDs. Journey-independent local image preparation and a checksum upload
  receipt exist, but their output is not canonical until a later reviewed
  publication adapter is implemented.
- Affiliate URLs are never generated. They require an existing affiliate
  Partner, a complete owner-supplied URL, `custom` tracking mode, an allowed
  host, and explicit verification.
- Owner-generated Amazon links use Partner ID `amazon-associates`, tracking
  mode `custom`, and one of the permitted `amazon.com`, `amzn.to`, or `a.co`
  hosts. The exact URL remains the source of truth.
- Rows are upserts. Removal and unlinking remain deliberately unimplemented.
- The command does not commit, push, merge, or deploy.
