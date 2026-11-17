---
id: ga4-tracking-audit-2026-11-17
title: GA4 Tracking Audit 2026-11-17
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-17
updated: 2026-11-17
related:
  - monetization-analytics
  - monetization-analytics-plan
  - ga4-three-day-improvement-roadmap
  - analytics-event-dictionary
supersedes: []
superseded_by: []
code_paths:
  - public/index.html
  - public/404.html
  - scripts/prepare-pages.js
  - src/main.js
  - src/router/index.js
  - src/utils/analytics.mjs
  - src/components/GearGrid.vue
  - scripts/test-analytics.mjs
verification:
  state: verified
  evidence:
    - npm run analytics:test
    - npm run content:validate
    - npm run atlas:test
    - npm run lint
---

# GA4 tracking audit, 2026-11-17

This audit records repository behavior only. The GA4 property, Enhanced
Measurement settings, filters, timezone, received production events, and live
consent state remain externally unverified.

## Before this change

- `public/index.html` and the checked-in `public/404.html` each initialized
  measurement ID `G-1NKNN94JT3` with a default `gtag('config')` call.
- The build replaces `dist/404.html` with an exact copy of `dist/index.html`,
  so only one shell is returned for any individual request. There was no Vue
  Router hook to send page views on client-side navigation.
- Local development and the unrelated WebWorks hostname loaded the same GA4
  tag because the loader was unconditional.
- The default initial page view could include query parameters. That was
  especially inappropriate for the excluded My Atlas OAuth callback.
- `GearGrid.vue` attached manual DOM listeners, derived event names from
  destination hostnames, sent full outbound URLs and display labels, and added
  `utm_source=roamwithjustin` to third-party links.
- No repository consent manager exists. The privacy page describes Analytics,
  but source alone cannot establish regional consent compliance.

## Implemented correction

- The HTML-shell loaders were removed. `src/main.js` initializes one adapter.
- The adapter loads GA4 only on `roamwithjustin.com` and
  `www.roamwithjustin.com` by default. Its page location preserves only the
  five standard `utm_*` campaign fields and drops arbitrary query parameters
  and fragments.
- Automatic mode is the safe default and leaves page loads, forward
  navigation, Back, and Forward to GA4 Enhanced Measurement. A tested manual
  router mode is available only for the coordinated account migration
  described below.
- A direct `/my-atlas` route never initializes GA4. A route guard sets Google's
  measurement-disable property before an SPA navigation enters a private My
  Atlas route, and all custom events also reject private routes.
- A build-time opt-in supports controlled nonproduction QA, and a debug flag
  marks those events. Local development remains off by default.
- The public Atlas and canonical partner events use a strict allowlist. No pan,
  zoom, hover, map-provider attribution, own-media, or social-profile event was
  added.
- Legacy hostname-specific gear events and third-party UTM mutation were
  removed. Normal anchors remain available to GA4 Enhanced Measurement when it
  is enabled in the property.

## Expected reproducible trace

After the owner confirms that exactly one page-view mode is active, the target
trace for `homepage -> Atlas -> Journey -> Place -> Back -> different Place`
is:

1. one homepage `page_view`;
2. one `atlas_open_clicked`;
3. one Atlas-root `page_view` and one `atlas_loaded`;
4. one Journey-route `page_view` and one `atlas_journey_opened`;
5. one Place-route `page_view` and one `atlas_destination_opened`;
6. one page view for Back navigation; and
7. one page view plus one destination-open event for the next intentional
   Place choice.

Manual mode sets `send_page_view: false`, but Google documents that this does
not disable Enhanced Measurement's browser-history page views. The owner must
clear **Page changes based on browser history events** in the web data stream
before deploying `VUE_APP_GA4_PAGE_VIEW_MODE=manual`. Exact live network and
DebugView evidence still requires a deployed build and owner GA4 access.

## Separate routing issue

GitHub Pages serves the SPA fallback through `404.html`. A direct request to
`/atlas` can therefore carry HTTP 404 status even though the app hydrates the
correct client route. That affects HTTP semantics, crawlers, canonical preview
behavior, and some monitoring. It does not itself prove duplicate GA4 events.
A real 200 rewrite must be implemented in the production hosting or edge
routing layer and then tested independently.

## Remaining owner verification

- keep automatic mode and validate its title/path behavior, or disable the
  Enhanced Measurement history option and deploy manual mode, never both;
- when choosing manual mode, set the GitHub repository variable
  `GA4_PAGE_VIEW_MODE` to `manual`; leave it unset for automatic mode;
- confirm GA4 reporting timezone, Enhanced Measurement outbound clicks,
  hostname filters, and account-level internal or developer traffic filters;
- choose and configure a compliant consent platform where required;
- use explicit, consistent incoming UTMs for future Meta and Instagram ads;
- compare title and path reports only after the corrected build has collected a
  stable date range;
- verify the expected trace in browser network tools and GA4 DebugView;
- create a session-based Exploration for landing, Atlas entry, load,
  destination open, optional story or Maps action, and canonical partner click;
  and
- keep generic outbound `click` separate from `partner_click` in all reports.
