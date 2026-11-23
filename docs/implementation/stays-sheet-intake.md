---
id: stays-sheet-intake
title: Main Atlas Stays Sheet Intake
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-23
updated: 2026-11-23
related:
  - editorial-sheet-publishing-implementation
  - lodging-partner-operations
  - content-model
  - my-atlas-trip-lodging
supersedes: []
superseded_by: []
code_paths:
  - scripts/editorial-setup-stays.mjs
  - scripts/lib/editorial-stays-sheet.mjs
  - scripts/test-editorial-stays-sheet.mjs
  - scripts/editorial-ingest-stays.mjs
  - scripts/lib/editorial-lodging.mjs
  - scripts/test-editorial-lodging.mjs
  - src/content/lodging/index.mjs
  - src/content/lodging/generated/records.json
  - src/content/journeys/index.mjs
  - src/content/partners/index.mjs
  - scripts/lib/editorial-github.mjs
  - package.json
verification:
  state: verified
  evidence:
    - npm run editorial:stays:test
    - npm run editorial:test
    - npm run docs:audit
    - authenticated setup preview against the RoamWithJustin - Atlas workbook on 2026-11-23
    - authenticated atomic creation and readback of Stays gid 1000 and Stays Instructions gid 1001 on 2026-11-23
    - all 31 headers, 200 safe default rows, validation rules and hidden automation columns verified from Google Sheets on 2026-11-23
    - original four tabs metadata and formula values unchanged after setup on 2026-11-23
    - node scripts/test-editorial-lodging.mjs
    - npm run content:validate
    - npm run commerce:test
    - live read-only importer check found zero Preview/Publish rows and made no content changes on 2026-11-23
    - live header-note and instructions refresh preserved every stay value and all other tab values on 2026-11-23
    - npm run build passed with existing asset-size warnings
---

# Main Atlas Stays intake

The owner requested a Stays tab in the existing trips/Journeys editorial
workbook, with rough public coordinates for private properties and the same
Off/Preview/Publish intent controls as Posts. This is main Atlas editorial
intake, separate from private My Atlas trip planning.

## Implemented scope

`scripts/editorial-setup-stays.mjs` defaults to a read-only preview. Explicit
`--apply` creates only `Stays` and `Stays Instructions` in one Sheets batch.
It uses existing Google authorization, snapshots existing tab metadata and
formula values privately under `.state/editorial`, checks for changes before
writing, and compares the existing tabs again after creating the new ones.
Existing Stays tabs are never overwritten. A partial name collision requires
inspection, rather than an automatic repair.

```powershell
npm.cmd run editorial:stays:setup -- --spreadsheet-id SPREADSHEET_ID
npm.cmd run editorial:stays:setup -- --spreadsheet-id SPREADSHEET_ID --apply
npm.cmd run editorial:stays:test
```

The two tabs contain header guidance, frozen headings, canonical Journey
choices from the existing Atlas Reference, dropdowns, date validation and
warning-protected managed columns. Two hundred prepared rows default to
`Atlas Mode = Off`, `Review Status = Draft`, `Location Precision = Town / area`
and `Show on Map = No`. There are no seeded stay records, IDs or publication
receipts. Setup is not an ongoing Journey dropdown refresher.

One row represents one stay occurrence. Property identity and URL are reusable
across stays. Fields capture accommodation type, public location, optional
public coordinates, actual dates/nights, firsthand source notes, reviewed
public copy, registered Media references, Drive source folder, actual
commercial relationship and disclosure. Hidden identity/status columns belong
to automation and remain blank until the first approved apply.

## Location boundary

For a private rental the owner supplies a nearby town or rough public position,
using WGS84 decimal latitude, longitude. The sheet does not automatically blur
coordinates or convert arbitrary grid systems. Exact private addresses,
reservation details and access codes are unnecessary and should not be stored.
Property URL can be blank when it would reveal a private property. Public
copy and a precise property URL can identify a location even when its map pin
is approximate, so these need review together.

Coordinates and `Show on Map = Yes` record a request for explicit geography
review. Neither adding a stay nor approving it may silently create a canonical
Place, Journey Visit or Atlas presentation node. Existing geography ownership
is preserved.

## Setup boundary and implementation checklist

The existing `editorial:publish` command reads Posts only. At initial tab setup,
Stays flags recorded intent without an importer. The follow-up below implements
`editorial:stays` and replaces that limitation. The original curated lodging
remains intact and composes with the approved generated records.

- [x] Inspect the actual workbook and current publishing flags.
- [x] Implement non-destructive tab setup, safe defaults and instructions.
- [x] Test request isolation, privacy defaults, dropdowns and repeat protection.
- [x] Preview setup against the actual workbook.
- [x] Apply setup and verify new tabs, rules, defaults and unchanged original tabs.
- [x] Implement stay validation and deterministic property reuse/stay identity.
- [x] Implement a nonpublishing preview of the actual generated lodging diff.
- [x] Require explicit reviewed geography bindings with public precision.
- [x] Implement guarded publication, registered media checks and verified write-back plumbing.
- [ ] Prove one owner-supplied stay through preview and publication.

No lodging content or website release is part of this sheet setup.

## Implemented importer follow-up

The owner subsequently requested both main Atlas ingestion and private My Atlas
trip lodging as separate features. `editorial:stays` now reads this workbook or
a local JSON row export. It does not access My Atlas APIs or user storage.
This section supersedes the original intent-only publication boundary above;
the dated setup evidence remains historical evidence of tab creation.

```powershell
npm.cmd run editorial:stays -- --spreadsheet-id SPREADSHEET_ID --row 2 --preview
# Review the output, then set Atlas Mode to Publish.
npm.cmd run editorial:stays -- --spreadsheet-id SPREADSHEET_ID --row 2 --apply
# Explicit protected publication, after the feature code is released.
npm.cmd run editorial:stays -- --spreadsheet-id SPREADSHEET_ID --row 2 --apply --deploy
```

`Review Status = Ready for preview` is required. Default execution previews.
Only one explicitly selected row is processed. `Off` cannot preview/apply and
`Preview` cannot apply. Preview writes a private receipt with the actual public
stay/property diff, source digest and before/after generated-record digests.
It does not change generated content, Sheet cells or the website. Apply requires
the source and candidate to match the saved preview, rechecks the source before
writing and rolls back generated content on failed validation. Retries accept
the already compiled candidate without adding another stay.

The importer creates/reuses canonical lodging Partners and adds or updates one
Journey-owned stay occurrence in `src/content/lodging/generated/records.json`.
It does not rewrite curated Journey files or Partner identities. Existing
identities with conflicting names/URLs require separate review. Repeated stays
reuse property identity and keep separate stay IDs. Stable IDs written back to
the Sheet must be retained when moving or editing rows.

Only reviewed public fields enter generated records. Private source notes,
follow-up notes and Drive folder locations stay out. Media IDs must already be
registered with owned/licensed rights; cover media must be an image. Drive
download/upload is a separate existing workflow. Actual commercial relationships
require explicit selection and non-independent stays require approved disclosure.
Exact supplied URLs retain their parameters, without appended tracking.

Dates are either both supplied or both omitted. Nights are derived when dates
exist, and any supplied count must agree. A private property's URL may be omitted
with an intentionally broad location; its generated Partner carries the explicit
`omitted-for-privacy` link policy. Existing lodging link requirements remain for
other Partners.

Ordinary ingestion never creates geography. `Show on Map = Yes` requires an
existing reviewed Place and matching Journey Visit supplied by `--place-id` and
`--visit-id`, plus exactly matching public coordinates. New geography still uses
the separate explicit Place-registration workflow before stay ingestion. Rough
coordinates are the position supplied by the owner, never automatic blurring.

Apply validates content and the lodging audit, then writes stable bindings and
`Compiled locally` to the unchanged source row with readback. It clears live URL
and verification-time receipts for local-only compilation. This does not claim
deployment. Explicit `--deploy` reuses `publishGeneratedPost`, its generated-path
allowlist, protected develop/main validation, Pages observation and exact
rendered `data-stay-id` verification. Only that success writes `Published`, the
live URL and verification time. Deployment failure does not write a Published
receipt. No background polling is enabled by a Sheet flag.

### Follow-up checklist

- [x] Validate source, exact property reuse, independent stay IDs and safe public fields.
- [x] Save and require a matching nonpublishing preview before apply.
- [x] Compile only an automation-owned generated shard, preserving curated records.
- [x] Require registered owned/licensed media and explicit public map bindings.
- [x] Add generated-path protected publication and guarded readback plumbing.
- [x] Verify real workbook reads without importing or inventing a stay.
- [ ] Complete a real owner-supplied stay's preview/apply acceptance.
- [ ] Release feature code, then verify its first real protected deployment and Published readback.

The generated shard is intentionally empty. No real lodging has been imported
or deployed during implementation. Source and publisher tests do not substitute
for the final real-content external-service acceptance.

## Live workbook evidence

Created and read back on 2026-11-23 in `RoamWithJustin - Atlas`:

- [Stays](https://docs.google.com/spreadsheets/d/1Y7pCkcS0mnnKRHSeP0aE6lj3su4UY8gPAYlQmCX4YA8/edit#gid=1000)
- [Stays Instructions](https://docs.google.com/spreadsheets/d/1Y7pCkcS0mnnKRHSeP0aE6lj3su4UY8gPAYlQmCX4YA8/edit#gid=1001)

The apply command verified all headers, all prepared-row defaults, all validation
rules, hidden managed columns, frozen headings and exact instructions. Existing
`Sheet1`, `Sheet2`, `Atlas Catalog` and `Atlas Reference` metadata and formula
values matched their pre-apply snapshot. The private snapshot is
`.state/editorial/stays-setup-2026-11-23T14-40-40-913Z-before.json`.
