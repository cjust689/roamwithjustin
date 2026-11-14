---
id: monetization-analytics
title: Monetization and Analytics
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-14
updated: 2026-11-14
related:
  - monetization-analytics-plan
  - gear-system
supersedes: []
superseded_by: []
code_paths:
  - public/index.html
  - public/404.html
  - src/utils/tracking.js
  - src/components/GearGrid.vue
  - src/data/affiliates.js
  - src/views/roam/Affiliates.vue
verification:
  state: verified
  evidence:
    - npm run lint
    - npm run build
---

# Monetization and analytics

This describes only what is present in source. Production account settings and
received event data require external owner verification.

## Implemented

- `public/index.html` and the checked-in `public/404.html` load GA4 measurement
  ID `G-1NKNN94JT3` through `gtag.js`.
- `src/utils/tracking.js` submits click events through `window.gtag`.
- `GearGrid.vue` adds `utm_source=roamwithjustin` to rendered gear links and
  attaches one click listener per link after mount.
- Affiliate-disclosure UI exists in the banner, Gear, About, Affiliates, and
  Journey gear presentation.
- A legacy affiliate page reads partner cards from
  `src/data/affiliates.js`.

## Important limitations

- No AdSense loader, publisher ID, ad slot, or ad component exists.
- Tracking event names branch on destination hostnames (`amazon`, `dji`,
  `sony`) rather than a canonical partner/referral ID contract.
- `src/data/affiliates.js` contains manually maintained records, including a
  placeholder Booking.com affiliate identifier. Those entries require owner
  review and are not evidence of active agreements.
- Repository inspection cannot confirm GA4 admin configuration, consent/legal
  requirements, received production events, AdSense approval, or affiliate
  account status.

Future work belongs in the
[monetization and analytics implementation document](../implementation/monetization-and-analytics.md),
not in this as-built description.
