---
id: sitewide-story-punctuation-2026-11-19
title: Sitewide Story Punctuation Audit 2026-11-19
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-19
updated: 2026-11-19
related:
  - storytelling-framework
  - content-model
  - atlas-integrated-story-reader
supersedes: []
superseded_by: []
code_paths:
  - docs/reference/storytelling-framework.md
  - scripts/validate-content.js
  - src/content/journeys
  - src/content/places
  - src/content/editorial/generated/records.json
  - src/features/atlas
verification:
  state: verified
  evidence:
    - npm run content:validate
---

# Sitewide story punctuation audit, 2026-11-19

The public storytelling rule now rejects dash punctuation, semicolons, and
colons unless a colon immediately follows a numeral. Numeric forms such as
`7:30` remain valid. Technical IDs, slugs, URLs, and private editorial notes
remain outside the public prose rule.

The audit covered every registered Journey, Place, Atlas projection, and
generated editorial entry checked by `scripts/validate-content.js`. Seventy two
existing colon or semicolon findings and four nonbreaking hyphen findings were
rewritten as natural sentences or comma phrases without adding facts.
Canonical IDs, relationships, dates, and media references were not changed.

The same validator now rejects known editorial workflow phrases in public Vue
components. Atlas cards and detail panels no longer expose internal sparse or
incomplete state to visitors. Missing content remains absent and every
available destination uses the established exploration language.

`npm run content:validate` passed with 280 Media records, 77 Places, 10
Journeys, 71 Visits, 10 trip views, 65 Atlas nodes, and 6 guided Journeys.
