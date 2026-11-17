---
id: my-atlas-trip-planning
title: My Atlas Bucket List and Trip Planning
kind: proposal
status: approved
implementation_state: partial
created: 2026-11-17
updated: 2026-11-17
related:
  - my-atlas-private-beta
  - my-atlas-account-state
  - my-atlas-trip-planning-implementation
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - src/features/my-atlas/planning
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - workers/my-atlas/src/planning
  - workers/my-atlas/src/registration/objects.mjs
verification:
  state: unverified
  evidence: []
---

# My Atlas bucket list and trip planning

This is the accepted low-cost product target promoted from the owner's revised
proposal. The linked implementation record is the authority for current
delivery. Source and tests remain the authority for actual behavior.

## First beta slice

A signed-in owner can privately:

- save, edit, list, and remove wishlist entries for canonical countries,
  cities, reviewed spots, and owner-supplied custom coordinates;
- search those canonical choices directly inside the planner, review their
  catalog latitude and longitude, and either save the selected canonical ID or
  use it directly as the plan start or finish;
- save one plan containing a start plus an ordered list of immutable destination
  snapshots;
- finish at the last destination, return to the start, or finish at a directly
  selected catalog/custom location;
- reopen, reorder, edit, explicitly keep, and delete that plan;
- open a client-built Google Maps directions URL and copy a client-built AI
  planning prompt;
- export the private account state; and
- permanently delete all application-owned account data.

The first UI intentionally supports one plan even though the eventual account
model may support more. Destinations do not have a small product limit; the API
uses a defensive ceiling of 50 to bound request and storage abuse. The feature
does not claim to optimize a route. It performs no paid Routes request and no
platform LLM request.

## Resolved contracts

Wishlist entries use the existing account-global revision, strong `If-Match`,
and UUID idempotency protocol. Exact duplicates are rejected. Notes are plain
text with the existing 255-code-point and 1,020-byte normalized-text boundary.
Custom names and coordinates reuse the existing custom-place validation.
Priority is `low | normal | high`; optional desired year is bounded from the
current year through 20 years ahead. Lists page at no more than 100 records,
with a 250-entry account cap.

Canonical wishlist records may be `country`, `city`, or reviewed `spot`; custom
records use the owner-authored `custom` type. Plan snapshots preserve the place
ID, product type, readable geography, coordinates, route-readiness result,
catalog revision for catalog records, and optional `sourceWishId`. A later
wishlist edit or deletion cannot mutate or remove a saved snapshot.

The first plan lifecycle is `draft | saved | archived`. Archiving does not prove
travel and does not bypass retention. Ordered destinations are selected from
the owner's wishlist. A start or selected finish may reference a wishlist
record, a canonical catalog place, or owner-supplied custom coordinates. End is
`last-stop`, `return-to-start`, or `selected-end`. Direct catalog/custom
endpoints are snapshotted without implicitly adding them to the wishlist.
Multiple plans, plan duplication, and the explicit Mark Visited review remain
later work.

Route readiness is `route-ready`, `needs-entrance-selection`, or
`user-coordinate-review`. Countries and reviewed spots conservatively require
a useful entrance or custom location before a directions handoff. Owner custom
coordinates require explicit confirmation per handoff. Google Maps URLs are
built in the browser, preserve owner order, split long plans into continuous
links with at most three intermediary waypoints per link, and reject any link
above 2,048 characters. AI prompts include readable place context only by
default. Coordinates require a per-export opt-in.

## Retention and deletion

Plan retention uses a separate `retentionConfirmedAt`, not generic update or
read activity. Create, substantive save, and explicit Keep refresh the clock.
Reads, login, export, maps handoff, and prompt copy do not. Six UTC calendar
months after confirmation, an internal Durable Object alarm atomically rechecks
the record, marks it `deletion-pending`, advances the account revision, and sets
a 30-day deadline. Grace expiry deletes only the plan and snapshots. If an
alarm runs after the entire grace window, it may delete directly because the
30-day opportunity already elapsed. Internal alarm mutations do not present a
client `If-Match` header, but they perform the same owner-object consistency
check and advance the one global revision exactly once.

Permanent account deletion requires the verified owner token, write permission,
strong revision, explicit `DELETE MY ATLAS` confirmation, and an idempotency
key. It first makes the profile private and nonactive, removes the active
registry identity assignment, replaces the public handle assignment with a
nonactive nonreusable tombstone, then erases the per-user object. A separate
minimal operation tombstone remains for exact safe retries. It contains no
profile, pins, wishlist, plan, handle, or qualified identity. The retained
handle tombstone contains the formerly public handle and deletion timestamp,
but no user ID or identity. Public reads return the same 404 as an absent or
private Atlas. The flow deletes application membership, not the upstream
Google or Auth0 identity.

## Privacy and deferred monetization

Wishlist and plan keys never enter the existing public Atlas projection.
Future whereabouts, private notes, exact custom coordinates, and plan dates are
not public. There is no public plan link, collaboration, telemetry endpoint,
advertising, affiliate integration, sponsored card, or marketing pixel in this
slice. Revenue experiments require a later explicit decision and separate
privacy and policy review.

## Remaining acceptance work

- Promote the frontend after branch validation. The backward-compatible Worker
  is deployed to isolated staging.
- Run authenticated owner acceptance checks, including deletion only with a
  disposable account.
- Verify Google Maps handoff behavior on Android, iOS, and desktop.
- Perform browser accessibility and responsive checks for the new planner.
- Keep the implemented privacy and retention notice synchronized with behavior
  before inviting additional users.
- Decide whether precise dates are needed; the current slice collects only an
  optional year.
- Add the owner-reviewed Mark Visited conversion without inferring travel.
