---
id: analytics-event-dictionary
title: Public Analytics Event Dictionary
kind: reference
status: implemented
implementation_state: partial
created: 2026-11-17
updated: 2026-11-17
related:
  - monetization-analytics
  - monetization-analytics-plan
  - ga4-three-day-improvement-roadmap
  - ga4-tracking-audit-2026-11-17
supersedes: []
superseded_by: []
code_paths:
  - src/utils/analytics.mjs
  - src/views/roam/Home.vue
  - src/features/atlas/views/AtlasView.vue
  - src/features/atlas/components/AtlasMap.vue
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/views/roam/RoamTripOverview.vue
  - src/content/selectors/projections.mjs
  - scripts/test-analytics.mjs
verification:
  state: verified
  evidence:
    - npm run analytics:test
    - npm run lint
---

# Public analytics event dictionary

The browser adapter accepts only the event names and parameter keys below. It
rejects unknown fields, unsafe identifiers, display names, and free-form text.
GA4's automatic outbound `click` event remains a separate report and must not
be summed with the custom events.

| Event | Intentional trigger | Parameters |
| --- | --- | --- |
| `page_view` | One public page load or history navigation. Enhanced Measurement owns this by default; the tested manual router mode can own it only after the account's history option is disabled | automatic GA4 fields, or manual `page_path`, sanitized `page_location`, and `page_title` |
| `atlas_open_clicked` | A visitor activates a tracked public Atlas entry link | `entry_surface`, coarse `campaign_context` |
| `atlas_loaded` | MapLibre reports the public Atlas map ready | `entry_surface`, `device_category` |
| `atlas_destination_opened` | A visitor intentionally opens a public child Place | `content_type`, `public_destination_id`, `surface` |
| `atlas_journey_opened` | A visitor intentionally opens a public top-level Journey | `public_journey_id`, `surface` |
| `atlas_story_opened` | A visitor opens a public Journey story from the Atlas | `public_story_id`, `surface` |
| `maps_handoff_clicked` | A visitor explicitly chooses a public Google Maps route or Place action | `content_type`, `surface` |
| `partner_click` | A visitor activates a canonical partner action in published editorial content | `partner_id`, `link_type`, `placement`; optional public context IDs |

## Controlled values

- Atlas entry surfaces: `homepage_primary`, `homepage_atlas_card`,
  `trip_story`, `atlas_direct`.
- Device categories: `mobile`, `desktop`.
- Content types: `journey`, `place`, `story`.
- Link types: `website`, `booking`, `maps`, `phone`, `affiliate`.
- Campaign context is reduced to `paid_social`, `organic_social`,
  `paid_search`, `organic_search`, `email`, `referral`, or `unattributed`.
- Interaction surfaces are a bounded vocabulary owned by the adapter.

## Privacy boundary

No event may contain Auth0 subjects, email, precise visitor location, full
outbound URLs, arbitrary or tokenized URL query strings, private pin IDs,
private destinations,
memories, bucket-list entries, plans, future travel dates, or free-form notes.
All `/my-atlas` routes are excluded from GA4 collection in this phase,
including the OAuth callback.

Adapter-supplied initial and manual page locations retain only `utm_source`,
`utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` so explicit
campaign attribution survives without forwarding unrelated query data.
Automatic Enhanced Measurement owns its own generated event fields and must be
verified in the live data stream before its behavior is treated as equivalent.

The adapter does not load on localhost or non-Roam hostnames unless
`VUE_APP_GA4_ENABLED=true` is explicitly supplied for controlled QA. Set
`VUE_APP_GA4_DEBUG=true` in that controlled build to mark emitted events for
DebugView. A developer can suppress collection in a production browser with:

```js
localStorage.setItem("rwj.analytics.disabled", "true")
```

Remove that key to restore the normal production-host decision. The adapter
also respects browser Global Privacy Control and Do Not Track signals. These
controls do not replace a legally and technically appropriate consent
management platform.

Page-view ownership must use exactly one mode:

- `automatic` is the safe migration default and keeps GA4 Enhanced
  Measurement responsible for page loads and browser-history changes;
- `manual` is enabled with `VUE_APP_GA4_PAGE_VIEW_MODE=manual` and sends the
  tested Vue Router page view after the route has rendered; and
- before deploying manual mode, the owner must clear **Page changes based on
  browser history events** under the web stream's Enhanced Measurement page
  view settings. Google documents that `send_page_view: false` alone does not
  stop those history events, so enabling both modes would duplicate views.

See Google's [current page-view guidance](https://developers.google.com/analytics/devguides/collection/ga4/views)
and [SPA measurement guide](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications).

The Pages workflow maps repository variables `GA4_ENABLED`, `GA4_DEBUG`, and
`GA4_PAGE_VIEW_MODE` to the build. Leave all three unset for the safe production
default. `GA4_ENABLED=false` is the emergency collection kill switch.
`GA4_DEBUG=true` should be used only for a controlled QA build, not for all
production visitors.

## GA4 account actions

Where reporting requires them, create event-scoped custom dimensions only for
the stable parameter names, not for each value. The initial useful set is
`entry_surface`, `public_destination_id`, `public_journey_id`, `public_story_id`,
`surface`, `partner_id`, `link_type`, and `placement`. Register only dimensions
that will be used, because GA4 limits and cardinality still apply.

Use Realtime or DebugView for live verification, then allow normal report
processing time. A partner click is referral intent, not a booking, sale, or
verified arrival.
