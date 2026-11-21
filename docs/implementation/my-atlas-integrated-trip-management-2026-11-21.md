---
id: my-atlas-integrated-trip-management-2026-11-21
title: Integrated My Atlas Trip Management
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-21
updated: 2026-11-21
related:
  - docs-index
  - my-atlas-trip-centric-transition
  - my-atlas-account-state
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/components/MyAtlasVisitManager.vue
  - src/features/my-atlas/components/MyAtlasJourneyCards.vue
  - src/features/my-atlas/components/MyAtlasTrips.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/planning/journeyCards.mjs
  - src/features/my-atlas/planning/tripClient.mjs
  - shared/my-atlas-trip-logistics.mjs
  - workers/my-atlas/src/trips/service.mjs
  - workers/my-atlas/src/trips/store.mjs
  - workers/my-atlas/src/trips/visits.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/src/account/service.mjs
  - workers/my-atlas/src/index.mjs
  - workers/my-atlas/test/account.test.mjs
  - scripts/test-my-atlas-trip-workspace.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:test passed all script suites and 59 Workers runtime tests
    - node scripts/test-my-atlas-trip-workspace.mjs passed journey dates, canonical/legacy cards, saved logistics reload and private share exclusion checks
    - npm run build passed with existing asset-size warnings
    - Local Chrome fixture checks passed at 320, 390 and 1440 CSS pixels with three cards, View all, correct Past trip opening and no horizontal overflow
    - Local Chrome verified unchanged visibility cannot save and explicit visibility/logistics buttons emit the corresponding writes without touching a real account
    - node scripts/test-my-atlas-load-safety.mjs verifies initial Overview loading and rejects stale owner/revision responses
    - npm run my-atlas:worker:check:staging passed before deployment
    - Staging Worker deployed as 71692099-3991-455a-b9e9-a8a794433a38; all four new route shapes returned 401 without authentication
---

# Integrated trip management

The owner requested the four proposed improvements as one feature. This
implementation extends the explicit trip model. Adding an independent
destination still does not create a trip. This record describes local source;
frontend release and real owner acceptance remain separate work. The additive
API is deployed to staging as `71692099-3991-455a-b9e9-a8a794433a38`, which is the
configured API used by localhost. No user data was migrated or written during
deployment or remote route checks.

## Implementation checklist

- [x] Move selected visits between existing trips of the same lifecycle.
- [x] Return Past visits to Ungrouped and create a named trip from selected
      visits. Preserve stop IDs, every memory, experience and dates.
- [x] Keep an emptied trip as a draft, preserving its description and logistics.
- [x] Edit ungrouped canonical visit memories, dates and private experiences.
- [x] Save each trip's public Atlas visibility independently of read-only links.
      The whole account must also be public for public Atlas display.
- [x] Save and reload private flight and rental search details with stable
      logistics IDs. Keep provider handoff review and draft/error protections.
- [x] Show up to three actual trip cards on Overview, with lifecycle, destination
      count, known dates, Open, Share and View all. Include saved legacy plans
      without manufacturing trips from standalone destinations.
- [x] Include independent canonical visits in private account exports and
      deletion. Include only public projections in the public Atlas.
- [x] Exercise revision conflicts, idempotent retry, cross-owner isolation,
      repeated visits, full-record preservation and private share exclusion.
- [ ] Complete genuine signed-in owner acceptance against deployed new routes.
- [x] Deploy the additive backend to staging and check authentication boundaries.
- [ ] Release frontend changes through the normal develop/main release process.

## Interfaces and boundaries

The existing authenticated, revisioned, idempotent trip write boundary adds:

| Route | Purpose |
| --- | --- |
| `POST /v1/me/trips/visits/transfer` | Move selected stop IDs between trips, Ungrouped, or an explicitly named new trip |
| `PATCH /v1/me/trips/visits/{stopId}` | Edit an independent canonical visit |
| `PATCH /v1/me/trips/{tripId}/sharing` | Save `publicAtlas` |
| `PATCH /v1/me/trips/{tripId}/logistics` | Save normalized private flight/rental search drafts |

The owner collection includes `ungroupedVisits` and `legacyPlans`. Independent
canonical visits use `visit:{stopId}` storage, preserving the full stop rather
than collapsing repeated occurrences into a unique-place legacy pin. The
compatibility map deduplicates geography without merging the stored memories.
Collection storage limits include independent visits. A transfer validates the
whole result before writing and never silently changes a visit's lifecycle.
Planned visits must first use the explicit lifecycle action before ungrouping.

Trip public visibility controls public Atlas inclusion, not access to an
existing read-only snapshot link. Private memories, experiences and logistics
remain excluded from snapshot links and public projections. An ungrouped visit
keeps its prior public visibility; moving to a trip uses the target's setting.

Saved logistics are search intentions, not reservations. Strict field, size,
calendar and ordering validation rejects unexpected payload fields and provider
URLs. The old legacy planner continues using browser drafts until explicitly
upgraded; no background migration or auto-save is introduced.

Overview cards display established trip metadata. They do not invent trip dates,
cover photos, trip titles or trips for each destination. Sign-out and account
deletion clear private Overview state and invalidate outstanding requests.
