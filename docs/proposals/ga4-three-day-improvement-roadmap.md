---
id: ga4-three-day-improvement-roadmap
title: Three-Day GA4 Improvement Roadmap
kind: proposal
status: approved
implementation_state: partial
created: 2026-11-17
updated: 2026-11-18
related:
  - monetization-analytics
  - monetization-analytics-plan
  - ga4-tracking-audit-2026-11-17
  - analytics-event-dictionary
supersedes: []
superseded_by: []
code_paths:
  - src/utils/analytics.mjs
  - src/router/index.js
  - src/features/atlas/views/AtlasView.vue
  - src/views/roam/RoamTripOverview.vue
verification:
  state: unverified
  evidence: []
---

# Three-day GA4 improvement roadmap

This is the accepted, bounded product target promoted from the owner's
three-day analytics review. The supplied metrics remain a small, owner-reported
sample. They do not prove advertising return, traffic quality, conversion,
product market fit, or bot activity.

## Decision

The immediate order is:

1. make public SPA page views reproducible and privacy bounded;
2. make the public Atlas the direct root experience;
3. measure only meaningful public Atlas and canonical partner actions;
4. establish a stable baseline before changing acquisition or monetization;
5. keep private My Atlas plans, future dates, notes, identities, and locations
   out of GA4.

## First implementation slice

The linked implementation record owns delivery. The first slice includes:

- one adapter that defaults to GA4 Enhanced Measurement history page views and
  supports a tested manual Vue Router mode after the automatic history option
  is disabled in the GA4 data stream;
- a production-host-only loader with local development disabled by default;
- no GA4 page views or product events on `/my-atlas` routes;
- direct root entry into Atlas without an intermediate landing page;
- a small public event contract for Atlas entry, load, destination, Journey,
  story, Maps handoff, and canonical partner clicks;
- canonical partner IDs instead of hostname-derived event names; and
- removal of outbound `utm_source` mutation from third-party gear links.

## Later decision gates

The owner must verify GA4 account state, consent requirements, live events,
internal-traffic filters, and campaign UTMs. Meta campaign geography, spend,
landing-page views, and cost metrics remain external inputs. Dashboard work and
My Atlas activation measurement remain later work and must not expose private
travel data.

The public Atlas CTA should be evaluated against a fixed session-based funnel
after the corrected implementation has collected enough traffic. No additional
ads, telemetry backend, high-volume map movement events, or private planner
events are part of this proposal.
