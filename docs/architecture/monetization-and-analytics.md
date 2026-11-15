---
id: monetization-analytics
title: Monetization and Analytics
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-14
updated: 2026-11-15
related:
  - monetization-analytics-plan
  - gear-system
  - adsense-operations
supersedes: []
superseded_by: []
code_paths:
  - public/index.html
  - public/404.html
  - src/utils/tracking.js
  - src/components/GearGrid.vue
  - src/data/affiliates.js
  - src/views/roam/Affiliates.vue
  - src/config/adsense.mjs
  - src/services/adsense.mjs
  - src/components/AdSlot.vue
  - src/views/roam/RoamTripOverview.vue
  - src/features/atlas/config/atlasAdEligibility.mjs
  - src/features/atlas/views/AtlasView.vue
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/views/roam/Privacy.vue
  - scripts/validate-adsense-config.mjs
  - scripts/lib/adsense-build-env.js
  - scripts/prepare-pages.js
  - .github/workflows/deploy-pages.yml
verification:
  state: verified
  evidence:
    - npm run adsense:test
    - npm run adsense:validate
    - npm run docs:audit
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
- AdSense configuration is disabled by default and requires valid public
  account identifiers, privacy readiness, and an explicit acknowledgment that
  Auto ads is off before production code can initialize an ad.
- `AdSlot.vue` and the centralized loader support one responsive manual display
  unit after the itinerary on published Journey stories with at least three
  chapters.
- A separately disabled Atlas unit can appear inside a guided stop's editorial
  detail content after three distinct arrivals. Eligibility requires a
  published Journey with at least five mapped stops and a current stop with at
  least 180 characters of combined summary and personal notes plus one media
  item. A `sessionStorage` reservation limits the unit to one request per
  Journey and browser-tab session.
- The home page, map canvas, markers, heroes, galleries, videos, lightboxes,
  dialogs, navigation controls, incomplete Journeys, free map exploration, and
  thin Atlas stops contain no placements.
- The ad component displays a plain `Advertisement` label, does not emit
  analytics events, and collapses units Google marks as unfilled or optimized
  without a returned ad. It also collapses the placement when the external
  loader fails, including when a visitor intentionally blocks advertising.
- The production build validates AdSense configuration, and the postbuild step
  creates `/ads.txt` only from the exact owner supplied seller line.
- `/privacy` describes the site's current Analytics, local Atlas storage,
  advertising, external links, and visitor choices.
- `public/index.html` contains Google's publisher verification meta tag for
  `ca-pub-5275158408075125`. It does not contain the AdSense script loader.

## Important limitations

- No ad slot ID or ads.txt seller line is committed. The publisher verification
  meta tag cannot render an ad, so advertising remains off in repository builds
  and has not been externally verified against the live AdSense account. Atlas
  advertising also requires its independent enable flag and slot ID.
- Auto ads state, site approval, Brand safety settings, the certified consent
  management platform, and the final privacy review are owner dashboard or
  legal review steps. Source code cannot verify them.
- Tracking event names branch on destination hostnames (`amazon`, `dji`,
  `sony`) rather than a canonical partner/referral ID contract.
- `src/data/affiliates.js` contains manually maintained records, including a
  placeholder Booking.com affiliate identifier. Those entries require owner
  review and are not evidence of active agreements.
- Repository inspection cannot confirm GA4 admin configuration, received
  production events, AdSense approval, or affiliate account status.

Future work belongs in the
[monetization and analytics implementation document](../implementation/monetization-and-analytics.md),
not in this as-built description.
