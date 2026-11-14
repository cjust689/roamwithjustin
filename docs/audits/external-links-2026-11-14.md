---
id: external-link-audit-2026-11-14
title: External Link Audit — 2026-11-14
kind: reference
status: implemented
implementation_state: complete
updated: 2026-11-14
related:
  - content-model
supersedes: []
superseded_by: []
code_paths:
  - src/content/places
  - src/content/journeys
  - src/content/partners/index.mjs
  - scripts/validate-content.js
verification:
  state: verified
  evidence:
    - npm run content:validate
---

> **Dated audit:** Repository relationships and validation were rechecked; the
> continued availability or ownership of external websites was not re-tested.

# Roam With Justin — External Link Audit

**Last reviewed:** November 14, 2026  
**Scope:** Canonical Places, Journey lodging, named restaurants, rental providers, and trip operators currently represented in `src/content/`

## Source-of-truth policy

External links stay with the record that owns the identity:

- geographic destinations and tourism spots use `Place.externalLinks`;
- hotels, villas, and vacation rentals use the Journey lodging record's `link`;
- restaurants, rental providers, and trip operators use canonical Partner records and Journey-day `partnerIds`;
- prose-only references remain unlinked until the business or place can be identified without guessing.

Link preference is: official website first, verified tourism or booking platform second, and Google Maps as the fallback. External links are informational and do not imply sponsorship, endorsement, or an affiliate relationship.

## Implemented coverage

| Domain | Coverage | Notes |
|---|---:|---|
| Canonical Places | 43 of 44 linked | Every resolved Place has an official, tourism-platform, or Maps link. The one exception is documented below. |
| Journey lodging | 6 of 6 linked | Montego Bay Resort, Hyatt Place Moab, Hyatt Centric Park City, Don Rafa Boutique Hotel, Hacienda Florecer, and Oceana Villa all expose a stay link. |
| Commercial trip resources | 4 of 4 linked | Nate's Custom Charters, High Tide, Reef2Peak, and Mercado La Carreta resolve through canonical Partner records. |

Notable corrections and additions:

- Don Rafa Boutique Hotel already used its official `https://donrafapr.com/` link and remains linked from the Puerto Rico lodging card.
- Hyatt Place Moab now uses Hyatt's official property page instead of a date-specific Expedia search URL.
- Oceana Villa now links to `https://oceanastjohn.com/`.
- Hacienda Florecer's former Airbnb room URL returned `410 Gone`; its lodging card now uses the creator-approved public Atlas map point until a current listing is supplied.
- High Tide and Reef2Peak appear beside the relevant St. John day chapters.
- Mercado La Carreta appears beside the Old San Juan chapter using a stable Maps search because no reliable first-party site was identified.
- ARTe Aguadilla, Fairmont El San Juan nightlife, Playuelas Horse Rides, Hacienda Florecer, and all mapped destination records now have an external path.

## Intentionally unresolved or missing

| Reference | Why no direct link is published | What would resolve it |
|---|---|---|
| Hermit Crab Island | This is Justin's nickname for a confirmed charter stop, not a verified formal place identity. Linking a guessed island would create false geography. | Charter itinerary, GPS/media metadata, or creator confirmation of the formal name. |
| Puerto Rico Day 1 taco spot | The story identifies only a lively taco place across from Don Rafa. | Restaurant name, receipt, photo metadata, or creator confirmation. |
| Lovango lunch venue | Lovango Cay and lunch are confirmed, but the specific restaurant or beach club is not. | Booking record, receipt, or creator confirmation. |
| Cinnamon Bay restaurant and gift shop | The amenities are creator-confirmed but the individual operating businesses were not named. | Business names or a creator-approved umbrella venue link. |
| Utah cross-country ski rental shop | The story mentions a local rental shop without naming it. Wasatch Adventure Guides is linked for the organized outing, not asserted as the rental shop. | Shop name, receipt, or creator confirmation. |
| Calle C. Canals nightlife venues | The visited nightlife district is confirmed, but individual bars and clubs are not named. | Venue names or creator-confirmed stops; until then the Place links only to the district in Maps. |

## Validation contract

`scripts/validate-content.js` now fails when:

- a resolved canonical Place has no HTTPS external link;
- a Journey lodging record has no valid HTTPS link;
- a Partner has no label, relationship metadata, disclosure, or HTTPS external link; or
- a Journey day references an unknown Partner.

`hermit-crab-island` is the only explicit Place exception. Remove that exception when its formal identity is verified and linked.

