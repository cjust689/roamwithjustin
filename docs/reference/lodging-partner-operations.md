---
id: lodging-partner-operations
title: Lodging Partner URL and Tracking Operations
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-17
updated: 2026-11-17
related:
  - content-model
  - monetization-analytics
  - affiliate-activation-public-editorial-first-slice
supersedes: []
superseded_by: []
code_paths:
  - src/content/partners/index.mjs
  - src/content/journeys/utah-winter-2025.mjs
  - src/content/journeys/puerto-rico-2024.mjs
  - src/content/journeys/usvi-st-john-2025.mjs
  - src/content/selectors/projections.mjs
  - scripts/audit-lodging-links.mjs
  - scripts/test-commercial-content.mjs
verification:
  state: verified
  evidence:
    - npm run lodging:audit
    - npm run commerce:test
    - npm run content:validate
---

# Lodging partner URL and tracking operations

Every lodging card references one canonical Partner through `partnerId`.
Property names, public URLs, relationship disclosure, and the stable analytics
slug live in `src/content/partners/index.mjs`. Journey records own the
firsthand stay context, nights, notes, and media, but do not duplicate the
outbound URL.

Run the readable inventory with:

```bash
npm run lodging:audit
```

For machine-readable review or spreadsheet preparation, run:

```bash
npm run lodging:audit -- --json
```

The report includes the Journey, property, stable tracking slug, preferred
link type, current URL, and readiness state. It also lists published
Experience titles that look like lodging but have not yet been promoted into a
structured stay. The command fails when a structured stay has no canonical
Partner, has no property website or reviewed directory, keeps a duplicate URL
inside a Journey, or uses an invalid tracking slug. A candidate remains an
owner review item because its exact identity and URL cannot be inferred from a
story title.

## Add or update a stay

1. Add or update one lodging Partner in `src/content/partners/index.mjs`.
   Keep its ID stable once published. Prefer the property's official website.
   Use a reviewed tourism directory only when no direct property URL has been
   confirmed.
2. Add `partnerId` to the Journey lodging record. Keep firsthand notes and
   creator-owned media on the Journey. Do not add a second `link` field.
3. Run `npm run lodging:audit`, `npm run commerce:test`, and
   `npm run content:validate`.
4. Check the public Journey card on mobile and desktop before publication.

The current candidate list contains `La Fortuna Airbnb` from Costa Rica 2025.
Its exact property or listing URL must come from the owner before it can become
a Partner and structured lodging record.

Public stay clicks use the Partner ID as `partner_id`, `trip_lodging` as the
placement, and the canonical Journey ID as public context. This supports an
aggregate referral report without sending the full property URL or visitor
travel data to GA4. A click is referral interest, not proof of a booking,
arrival, or sale.

## Affiliate links and Expedia banners

Do not append a general tracking query to a hotel, Airbnb, Expedia, or other
merchant URL. Store a program-issued affiliate URL exactly as generated, or
use a reviewed provider-specific rule.

The Expedia Utah banners use the owner-supplied campaign reference. Each has a
unique `publisherReference` such as `rwj-utah-winter-2025-stays`. Expedia calls
this a Pubref and uses it for publisher reporting from click through booking.
The public component does not load Expedia's script until a visitor explicitly
chooses to see the options.

When adding a new Expedia placement:

1. Generate the banner or link inside the owner's Expedia creator tools.
2. Add one commercial offer under the existing Expedia Partner. Do not create
   a second Expedia merchant identity.
3. Use a unique, descriptive Pubref with no visitor, account, date, or private
   plan data.
4. Restrict the offer to a substantive public editorial Journey. Do not place
   it in My Atlas, the immersive map, a gallery, or a lightbox.
5. Confirm the rendered destination and click attribution in the Expedia and
   GA4 dashboards after deployment. Repository tests cannot verify either
   external system.
