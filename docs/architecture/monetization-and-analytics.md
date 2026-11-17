---
id: monetization-analytics
title: Monetization and Analytics
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-14
updated: 2026-11-17
related:
  - monetization-analytics-plan
  - ga4-three-day-improvement-roadmap
  - ga4-tracking-audit-2026-11-17
  - analytics-event-dictionary
  - gear-system
  - adsense-operations
supersedes: []
superseded_by: []
code_paths:
  - public/index.html
  - public/404.html
  - src/main.js
  - src/router/index.js
  - src/utils/analytics.mjs
  - src/views/roam/Home.vue
  - src/components/GearGrid.vue
  - src/data/affiliates.js
  - src/views/roam/Affiliates.vue
  - src/config/adsense.mjs
  - src/services/adsense.mjs
  - src/components/AdSlot.vue
  - src/views/roam/RoamTripOverview.vue
  - src/features/atlas/config/atlasAdEligibility.mjs
  - src/features/atlas/views/AtlasView.vue
  - src/features/atlas/components/AtlasMap.vue
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/content/selectors/projections.mjs
  - src/views/roam/Privacy.vue
  - scripts/validate-adsense-config.mjs
  - scripts/test-atlas-ad-eligibility.mjs
  - scripts/test-analytics.mjs
  - scripts/lib/adsense-build-env.js
  - scripts/prepare-pages.js
  - .github/workflows/deploy-pages.yml
verification:
  state: verified
  evidence:
    - npm run adsense:test
    - npm run adsense:validate
    - npm run analytics:test
    - npm run content:validate
    - npm run atlas:test
    - npm run docs:audit
    - npm run lint
    - npm run build
---

# Monetization and analytics

This describes only what is present in source. Production account settings and
received event data require external owner verification.

## Implemented

- `src/utils/analytics.mjs` owns GA4 measurement ID `G-1NKNN94JT3` and loads it
  only on the Roam production hostnames by default. Automatic mode preserves
  GA4 Enhanced Measurement as the page-view owner. A tested manual Vue Router
  mode is available only after the owner disables Enhanced Measurement's
  browser-history page views in the web data stream.
- Local development, Global Privacy Control, Do Not Track, and the documented
  browser opt-out suppress the loader. Controlled QA can explicitly enable the
  loader and DebugView flag through build environment values.
- Direct `/my-atlas` routes do not initialize GA4. A router guard disables the
  measurement ID before an SPA transition enters My Atlas, and the custom
  event allowlist also rejects private routes. Adapter-supplied initial and
  manual page locations preserve only allowlisted `utm_*` campaign fields and
  omit arbitrary queries and fragments. The OAuth callback never initializes
  the tag.
- The homepage has an above-the-fold Interactive Atlas CTA plus the existing
  Atlas card. Both emit one bounded `atlas_open_clicked` event.
- The public Atlas emits allowlisted load, Journey, Place, story, and Maps
  handoff events only for meaningful user actions. It does not track map pans,
  zooms, hovers, technical attribution, or own-media navigation.
- Published Journey partner cards emit one reusable `partner_click` with a
  canonical Partner ID, controlled link type, and placement. The legacy
  hostname-derived gear events, full-URL parameters, and third-party UTM
  mutation were removed; ordinary outbound anchors remain available to GA4
  Enhanced Measurement when enabled in the property.
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
- The GA4 property configuration, Enhanced Measurement state, timezone,
  received production events, custom dimensions, internal-traffic filters,
  and consent state require owner verification outside the repository.
- No consent manager is implemented. The local opt-out and browser privacy
  signals do not substitute for a policy and jurisdiction appropriate consent
  platform.
- GitHub Pages still serves direct SPA routes through a `404.html` fallback. A
  direct `/atlas` request may therefore retain HTTP 404 status even though the
  client app hydrates. A production 200 rewrite remains a separate hosting
  task.
- Exactly one page-view owner must be active. Manual mode is not production
  ready until the GA4 data stream's automatic browser-history page views are
  disabled and the expected trace is externally verified.
- `src/data/affiliates.js` contains manually maintained records, including a
  placeholder Booking.com affiliate identifier. Those entries require owner
  review and are not evidence of active agreements.
- Repository inspection cannot confirm GA4 admin configuration, received
  production events, AdSense approval, or affiliate account status.

Future work belongs in the
[monetization and analytics implementation document](../implementation/monetization-and-analytics.md),
not in this as-built description.
