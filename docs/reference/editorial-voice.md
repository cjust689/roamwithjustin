---
id: editorial-voice
title: Sitewide Editorial Voice
kind: reference
status: implemented
implementation_state: partial
created: 2026-11-17
updated: 2026-11-17
related:
  - storytelling-framework
  - sitewide-copy-audit-2026-11-17
  - monetization-analytics
  - gear-system
  - my-atlas-private-beta
supersedes: []
superseded_by: []
code_paths:
  - src/views/roam/Home.vue
  - src/components/GearGrid.vue
  - src/features/atlas
  - src/features/my-atlas
verification:
  state: verified
  evidence:
    - npm run docs:audit
    - npm run lint
    - npm run build
---

# Sitewide editorial voice

Write like someone who went there, not like a tourism advertisement. Use real
nouns and verbs. Name photographs, short films, routes, notes, places, gear,
and hotels instead of relying on abstract claims about adventure or
transformation.

This reference governs interface and promotional copy. Public Journey, Place,
Atlas, caption, and media story prose remains governed by the more detailed
[experiential storytelling framework](storytelling-framework.md) and relevant
owner travel context.

## Shared rules

- Prefer one concrete sentence over a stack of slogans.
- Use first person only for supported creator experience.
- Let the imagery carry emotion. Keep supporting copy calm and useful.
- Do not invent visits, purchases, product testing, hotel stays, prices,
  availability, sponsorships, affiliate approval, or unshipped features.
- Preserve legal, privacy, accessibility, and affiliate meaning.
- Treat words such as immersive, cinematic, authentic, breathtaking, and
  seamless as prompts to check specificity, not as words to replace blindly.

## Surface rules

- Public editorial pages explain what a visitor can see or read.
- Atlas controls state what selecting a place opens. They do not imply every
  pin has the same depth of content.
- My Atlas speaks to the user as `you` and distinguishes private account state
  from public sharing.
- Gear copy distinguishes actual use from research. It favors `What I used`,
  `What worked`, and `What I would change` over retail marketing language.
- Booking links name the provider and action. They do not imply live inventory,
  price comparison, or a completed booking.
- Empty and error states state the condition and next useful action without
  exposing internal workflow labels.

## First audited revision

| Surface | Previous copy | Current copy | Reason |
| --- | --- | --- | --- |
| Homepage subtitle | `Adventure meets intention. It is told through visual stories, hard earned field notes, and journeys that leave a mark.` | `Original photography, short films, and practical notes from the places I've explored.` | Describes the actual site and its firsthand source. |
| Gear introduction | A sentence about product identity and review steps | `Camera and travel gear from my trips, with original photographs and firsthand notes.` | Leads with visitor value and stays within published actual-use rules. |
| Gear empty state | `Field notes are being prepared` plus a catalog workflow explanation | `No gear notes yet. Products will appear here with original photographs and firsthand trip notes.` | States the visitor-visible condition without internal production language. |

The homepage headline, Atlas CTA, two current entry cards, travel stories,
legal copy, and user-authored My Atlas data were intentionally left unchanged
in this slice. A complete route-by-route copy pass remains future work and
must use actual rendered behavior rather than the older brief's assumed three
homepage cards.
