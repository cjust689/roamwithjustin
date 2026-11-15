---
id: content-model
title: Canonical Content Model
kind: architecture
status: implemented
implementation_state: complete
created: 2026-11-14
updated: 2026-11-14
related:
  - media-pipeline
  - gear-system
supersedes:
  - atlas-asset-architecture-brief
superseded_by: []
code_paths:
  - src/content/contracts.mjs
  - src/content/media/index.mjs
  - src/content/places/index.mjs
  - src/content/places/next-destinations.mjs
  - src/content/journeys/index.mjs
  - src/content/journeys/next-destinations.mjs
  - src/content/partners/index.mjs
  - src/content/selectors/projections.mjs
  - scripts/validate-content.js
verification:
  state: verified
  evidence:
    - npm run content:validate
    - npm run build
---

# Canonical content model

This document describes the model verified in current source. The historical
design and migration narrative is preserved in the
[archived asset architecture brief](../archive/atlas-asset-architecture-brief.md).

## Authorities

- **Media** owns reusable image/video identity, provider and delivery location,
  intrinsic media facts, rights, capture facts, and generated publication
  metadata.
- **Places** own stable geographic identity, coordinates, hierarchy, category,
  description, and destination links.
- **Journeys** own a particular trip, ordered Visits, itinerary chapters,
  lodging, narrative, and contextual Media usages.
- **Partners** own reusable provider/operator identities and disclosure-safe
  external links.
- **Atlas presentation** owns map-only grouping, camera, root, and relationship
  choices. It does not replace Place or Journey identity.

There is no implemented canonical Experience registry. Older proposals that
describe Experiences are future design, not current application behavior.

## Identity and composition

Each registry composes records in one `index.mjs` and uses
`createIdRegistry()` to reject missing or duplicate IDs at import time.
Journey public routes use `Journey.slug`; internal relationships use canonical
IDs. A Place may appear in more than one Journey through distinct Visits.

Top-level scaffolds may deliberately omit coordinates, media, external links,
and child records. Miami currently has one bounded Place and Journey. Europe
is one multi-country Journey scaffold with no registered Place or Visit
children; its named stops remain reference context until that lower level is
implemented intentionally. Both support stable coming-soon Journey URLs
without creating Atlas pins or implying unsupported venue and itinerary
detail. Missing external links stay absent instead of being replaced with
guessed tourism or map URLs.

Media references use `{ assetId, ...usageOverrides }`. Presentation-specific
alt text, captions, focal points, and roles belong to the usage/placement, not
the physical asset. Legacy URL resolution remains isolated in the shared media
selector for compatibility.

## Selectors

`src/content/selectors/projections.mjs` builds public trip, location, Atlas,
and guided-journey shapes. Feature components consume those projections rather
than maintaining another content database.

A coming-soon Journey may be media-free. Story list/detail components render a
quiet decorative surface and concise public-facing coming-soon copy; internal
verification state, media counts, missing-data labels, and canonical-record
terminology are not exposed to visitors. Published Journeys still require a
resolved cover and complete validated public content.

Retired authorities `src/data/trips.js` and
`src/features/atlas/data/atlasData.js` are absent and explicitly rejected by
content validation. Compatibility exports under `src/content/selectors/` are
derived from canonical records.

## Validation

`scripts/validate-content.js` verifies registry identity, foreign keys, local
media existence/dimensions, R2-key uniqueness, journey/visit relationships,
Atlas presentation, generated Gear/Media records, projections, and the absence
of retired legacy authorities. `npm run build` runs content validation first.

## Current limitations

- Experiences and standalone experience stories are not implemented.
- Some Journey gear remains in legacy `gearHighlights` as a selector fallback.
- Many images are still local static files rather than generated R2 records.
- Canonical content is Git-backed; there is no runtime CMS or database.
