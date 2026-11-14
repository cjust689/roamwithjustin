---
id: gear-system
title: Gear Registry and Journey Usage
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-14
updated: 2026-11-14
related:
  - content-model
  - gear-ingestion-cli
  - photo-exif-gear
supersedes:
  - gear-ingestion-architecture-brief
superseded_by: []
code_paths:
  - scripts/ingest-gear.js
  - scripts/lib/gear-ingestion.js
  - src/content/gear/index.mjs
  - src/content/gear/generated/records.json
  - src/content/selectors/gear.mjs
  - src/content/selectors/projections.mjs
verification:
  state: verified
  evidence:
    - npm run gear:test
    - npm run content:validate
---

# Gear registry and Journey usage

Gear identity and contextual usage are separate generated registries. The
ingestor accepts constrained Markdown or strict JSON, requires an explicit
canonical Journey, validates references and links, and performs deterministic
upserts without editing Journey narrative modules.

The Journey gear selector joins published usage to canonical items, selects a
verified primary link, applies safe `rel` behavior, and exposes disclosure
metadata. Trip projection retains legacy Journey `gearHighlights` only as a
compatibility fallback while records migrate.

The generated Gear and Usage arrays are currently empty. The CLI and selector
path are implemented and tested, but no example product from a planning brief
was treated as confirmed production input.

See [Gear ingestion CLI](../reference/gear-ingestion-cli.md) for the exact input
contract and commands.

## Boundaries

- Capture equipment, visible products, and packed/used Journey gear are
  distinct relationships.
- EXIF extraction and automatic camera/lens resolution are not implemented.
- An affiliate URL must be explicitly supplied and verified; ingestion does
  not invent product ownership, usage, retailers, or commercial relationships.
- The older `src/data/affiliates.js` page data is a separate legacy commerce
  source and is not canonical Gear identity.
