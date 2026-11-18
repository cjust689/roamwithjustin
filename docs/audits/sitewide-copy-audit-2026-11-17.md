---
id: sitewide-copy-audit-2026-11-17
title: Sitewide Copy Audit 2026-11-17
kind: reference
status: implemented
implementation_state: partial
created: 2026-11-17
updated: 2026-11-17
related:
  - editorial-voice
  - storytelling-framework
  - gear-system
  - monetization-analytics
  - my-atlas-private-beta
supersedes: []
superseded_by: []
code_paths:
  - src/views/roam/Home.vue
  - src/components/GearGrid.vue
  - src/views/roam/Affiliates.vue
  - src/features/atlas/views/AtlasView.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/components/MyAtlasPlanner.vue
verification:
  state: verified
  evidence:
    - npm run docs:audit
    - npm run lint
    - npm run build
---

# Sitewide copy audit, 2026-11-17

This is the first bounded audit pass, not a claim that every public string has
been rewritten. It distinguishes interface copy from creator storytelling,
user data, disclosures, and legal text. The older brief assumed three homepage
cards and unimplemented My Atlas planning. Current source has two homepage
cards, and private planning is implemented and test verified.

## High-visibility inventory

| Source | Surface and actual copy | Finding | Action and risk |
| --- | --- | --- | --- |
| `src/views/roam/Home.vue` | Homepage subtitle, `Adventure meets intention...` | Generic and does not say what the site contains. | Replaced with the owner-approved photography, films, and practical notes sentence. Low product risk. |
| `src/views/roam/Home.vue` | Homepage headline, Atlas helper, Atlas card, and My Atlas card | The headline is distinctive. The helper and actions accurately describe the two current entry points. | Preserved. The brief's assumed third Journey card is stale and was not restored. |
| `src/features/atlas/views/AtlasView.vue` | Journey explorer instructions and `First look` explanation | Current copy states what opens and distinguishes incomplete Journey depth without exposing internal workflow state. | Preserved. A broad rewrite would risk changing established Atlas behavior and Journey readiness language. |
| `src/features/my-atlas/views/MyAtlasGeographicProof.vue` | My Atlas introduction, privacy state, map controls, and empty states | Current copy uses second person, distinguishes private account storage from the local proof, and matches shipped controls. | Preserved. User-authored names and memories are outside editorial rewriting. |
| `src/features/my-atlas/components/MyAtlasPlanner.vue` | Bucket list, saved trip, retention, export, and Mark Visited system copy | Planning is implemented, contrary to the source brief's assumption. The copy is functional and privacy specific. | Preserved in this copy-only pass. Planner behavior remains owned by its active implementation document and tests. |
| `src/components/GearGrid.vue` | Gear subtitle and empty state | The previous text described review workflow more than visitor value. | Replaced with concrete first-person trip context and a concise empty state. Low product risk. |
| `src/views/roam/Affiliates.vue`, `src/data/affiliates.js` | Legacy affiliate page | This remains a separate legacy commerce source with third party images and relationships that require review. | No relationship or promotional claim was rewritten. Reconcile the underlying records before a copy polish, because wording cannot make unverified commerce canonical. |
| Journey, Place, Atlas story, caption, and generated editorial records | Firsthand public travel prose | These records require evidence reconciliation, the full storytelling framework, relevant travel context, and registered media. | No bulk rewrite. Any later edit must be handled per story, with no invented fact or dash punctuation. |
| Privacy, authentication, affiliate disclosure, and provider copy | Legal and service behavior | Meaning is functional and may depend on external service state. | Preserved unless a separately reviewed behavior or legal change requires it. |

## Implemented revision set

- Homepage subtitle replaced with the exact approved concrete description.
- Gear introduction now says what the page will contain rather than exposing
  internal review steps.
- Gear empty state now states the visible condition and future content plainly.
- A living editorial voice reference was added for future interface and
  commercial copy.

The production build and static validation pass. A complete route-by-route
responsive and assistive-technology copy review remains future work. No
functionality, travel claim, user data, legal meaning, affiliate URL, or
tracking destination was changed by this copy slice.
