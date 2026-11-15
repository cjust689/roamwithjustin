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
  - src/content/places/europe.mjs
  - src/content/places/costa-rica.mjs
  - src/content/places/miami.mjs
  - src/content/places/next-destinations.mjs
  - src/content/journeys/index.mjs
  - src/content/journeys/costa-rica-2025.mjs
  - src/content/journeys/miami.mjs
  - src/content/journeys/utah-2026.mjs
  - src/content/journeys/next-destinations.mjs
  - src/content/atlas/preview-presentation.mjs
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
Every Journey carries a numeric `year`; its canonical ID and public slug end in
that year so repeat trips to the same destination can coexist. Public routes
use `Journey.slug`, while `legacySlugs` keep older unyeared links resolvable.
Internal relationships use canonical IDs. A Place may appear in more than one
Journey through distinct Visits.

Incomplete but confirmed trips use bounded internal publication scaffolds. Europe,
Costa Rica, Utah 2026, Miami, North Georgia, Peoria, and the retained Hungary
preview have canonical Journey/Place identity and public Atlas presentation.
Europe remains one Journey with geographic stops beneath its Europe root;
Utah 2026 remains separate from Utah winter 2025 and reuses the shared Utah,
Zion, and Park City geography. Planned-only Hanksville is not registered as a
visited Place.

Miami's 2026 trip uses the repeat-safe `miami-south-beach-2026` Journey
identity, while `miami-south-beach` remains the stable geographic Place. Its
story expands through South Pointe Park, the broad Everglades region, Shark
Valley, and Oleta River State Park Visits. Its five ordered narrative sections use
`itineraryMode: "chapters"`: this preserves a useful story sequence without
claiming that every outing belongs to a known calendar day. The public story
labels these records as experience/story chapters, while the default remains a
day-by-day itinerary for other Journeys. A chapter may reuse a Visit when more
than one confirmed moment happened at the same Place. The broad Everglades
Place gives the confirmed airboat outing a truthful regional association while
the unresolved operator, launch, route, and park jurisdiction remain unpinned;
Shark Valley stays a separate, precise child Place.

The current generated Media registry places 84 images on the Miami Beach Visit,
18 on the Everglades Visit, and 9 on the Oleta Visit. Those placements do not
establish a more precise airboat route, prove that every Everglades frame
depicts the airboat, or identify Oleta's unnamed island. The Journey retains
its internal `coming-soon` status while South Pointe and Shark Valley media,
captions, editorial roles, and final curation are incomplete.

These previews may omit media, venues, external links, itinerary days, and
unsupported details. Their Atlas panels and story views present only the facts
that exist, without labels such as "coming soon," "unconfirmed," or
"unverified." Missing links stay absent instead of being replaced with guessed
tourism or map URLs.
Coordinates use verified public geographic points or area centroids, with the
precision and limitations recorded on each Place; they are not treated as
photo capture positions.

Media references use `{ assetId, ...usageOverrides }`. Presentation-specific
alt text, captions, focal points, and roles belong to the usage/placement, not
the physical asset. Legacy URL resolution remains isolated in the shared media
selector for compatibility.

## Selectors

`src/content/selectors/projections.mjs` builds public trip, location, Atlas,
and guided-journey shapes. Feature components consume those projections rather
than maintaining another content database.

An internally incomplete Journey may be media free. Story list/detail
components render a quiet decorative surface and the available date, place,
and story copy. Internal publication state, verification state, media counts,
missing-data labels, and canonical-record terminology are not exposed to
visitors. Published Journeys still require a resolved cover and complete
validated public content.

An internally incomplete Journey may also expose verified chapter copy before media is
available. When those chapters exist, the story view skips the redundant
generic destination preview and renders the chapters with chronology-safe
labels. Publication status remains `coming-soon` until its media and remaining
public content are ready.

Content validation requires every internally incomplete Journey to have an Atlas root
and every one of its Visits to resolve to an Atlas node. Confirmed broad route
order can power guided playback even while story/media content remains marked
coming soon.

Retired authorities `src/data/trips.js` and
`src/features/atlas/data/atlasData.js` are absent and explicitly rejected by
content validation. Compatibility exports under `src/content/selectors/` are
derived from canonical records.

## Validation

`scripts/validate-content.js` verifies registry identity, foreign keys, local
media existence/dimensions, R2-key uniqueness, journey/visit relationships,
Atlas presentation, generated Gear/Media records, projections, and the absence
of retired legacy authorities. It also rejects dash punctuation and editorial
workflow phrases in the Journey and Atlas copy that the selectors expose to
visitors. Technical IDs, slugs, URLs, and internal notes are outside that prose
rule. `npm run build` runs content validation first.

## Current limitations

- Experiences and standalone experience stories are not implemented.
- Some Journey gear remains in legacy `gearHighlights` as a selector fallback.
- Many images are still local static files rather than generated R2 records.
- Canonical content is Git-backed; there is no runtime CMS or database.
