---
id: my-atlas-account-state
title: My Atlas Local Profile, Pin, and Sharing State
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-16
updated: 2026-11-16
related:
  - my-atlas-registration
  - my-atlas-api-authentication
  - my-atlas-geography
  - my-atlas-private-beta
  - my-atlas-private-beta-implementation
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - package.json
  - workers/my-atlas/src/account
  - workers/my-atlas/src/public
  - workers/my-atlas/src/catalog/projection.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/src/index.mjs
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/auth/session.mjs
  - src/features/my-atlas/catalog/atlasInsights.mjs
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/components/MyAtlasPinEditor.vue
  - src/features/my-atlas/export/storyExport.mjs
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/views/MyAtlasPublicView.vue
  - src/views/roam/Home.vue
  - workers/my-atlas/test/account.test.mjs
  - scripts/test-my-atlas-worker.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:worker:test
    - npm run my-atlas:worker:durable:test
    - Workers-runtime tests verified revision conflicts under concurrent writes, idempotent retries, duplicate prevention, and the 300-pin ceiling
    - Workers-runtime tests verified pagination, pin update and deletion, JSON export, publication gating, and automatic privacy for an empty profile
    - Workers-runtime tests verified private-by-default public lookup, safe-field projection, explicit publication, and immediate unpublication
    - npm run my-atlas:test verified optional month and year dates, legacy year compatibility, session restoration, statistics, filtering, ordered destination playback, cumulative reveal, and curved connection generation
    - Headless Chrome verified exact desktop year-editor alignment and cinematic playback at 1248 by 598 and 390 by 844 without horizontal overflow
    - Headless Chrome verified that a selected search result opens its destination editor directly below the search control and before the result list at desktop and 390 pixel mobile widths
    - Headless Chrome verified the feature-gated My Atlas homepage card at desktop and 390 pixel mobile widths, with no horizontal overflow and navigation to /my-atlas
    - Headless Chrome verified collapsed owner and public map-control drawers, hidden MapLibre desktop controls, full-width native year selectors, and zero horizontal overflow at 390 pixels while preserving expanded desktop controls
    - Headless Chrome verified that My Atlas attribution begins as a compact info button and expands on activation without removing provider attribution
    - Pull requests 55 and 56, their required validation gates, develop workflow 43987307324, and Pages workflow 43987868552 succeeded
    - Live content-addressed production chunks returned 200 and contained the timeline copy, plane marker styles, Add year control, and exact 2.9rem alignment rule
    - Staging Worker c1923a3b-2a8f-47a8-acd0-cf033ea49790 returned 200 health and exposed ETag and X-Request-Id to the allowed localhost origin
    - Owner reported that the Uvita pin persisted through reload and a new sign in before the save-response correction was deployed
---

# My Atlas local profile, pin, and sharing state

Phase 2B has an owner-state API on the same isolated Worker and per-user SQLite
Durable Object. The Phase 2C slice adds an opt-in public projection, a
signed-out handle route, and browser owner controls. The backend is deployed to
isolated staging. The owner verified a real private account and a persisted
Uvita pin. A public profile has not been verified.

## Owner authorization

Every account request begins with the Phase 2A access-token verifier. The
qualified issuer and subject are hashed, then resolved through the authoritative
registration registry to an active internal user ID. The browser cannot choose
a user ID. The per-user object checks the same qualified identity digest before
reading or changing state.

Read routes require `read:my-atlas`. Mutations additionally require
`write:my-atlas`:

- `GET /v1/me` reads the private owner profile;
- `GET /v1/me/atlas` returns the owner profile and resolved pins in one bounded
  browser bootstrap response;
- `PATCH /v1/me` changes display name or visibility;
- `GET /v1/me/pins` returns at most 100 stored pins and a stable cursor;
- `POST /v1/me/pins` creates one canonical pin;
- `PATCH /v1/me/pins/{pinId}` changes its place or optional visit dates;
- `DELETE /v1/me/pins/{pinId}` removes it;
- `GET /v1/me/export?format=json|csv` returns the owner's profile and pins.

Handle mutation, account deletion, and abuse reporting are not part of this
slice.

## Revisions and safe retries

The profile owns one monotonically increasing revision covering profile and pin
state. Every mutation requires a strong `If-Match: "rev-N"` header and a UUID
`Idempotency-Key`. The user object serializes each mutation, checks the revision,
and increments it exactly once. A retry with the same qualified identity,
action, key, expected revision, and normalized payload returns the stored result.
A changed request under that operation conflicts. Competing writes against the
same revision produce one success and one revision conflict.

Responses expose the current revision as a strong ETag. Stale mutations return
HTTP 412 without changing state. Allowed browser origins can read `ETag` and
`X-Request-Id` through `Access-Control-Expose-Headers`. This is required for
the browser to accept the new revision after a successful cross-origin write.

## Pin state

Pins store only:

- a stable internal pin ID;
- the canonical `iso-country:XX` or `geonames:N` place ID;
- a sorted, unique optional list of visit dates, each with a year and optional
  month;
- a derived visited-year list retained for compatibility with schema version 1
  clients and pins;
- creation and update timestamps.

Pins may remain undated. The object maintains a place index to reject duplicate
destinations and a profile pin count enforcing the 300-pin beta ceiling. A
profile cannot become public while empty. Deleting its last pin atomically
makes it private.

Pin IDs are deterministically derived from the internal user ID and canonical
place ID at creation. Replacing a pin's place preserves its pin ID while moving
the uniqueness index.

## Catalog boundary

Format validation is not geographic validation. Before a create or place-change
mutation reaches the user object, the service requires the authoritative
versioned Worker catalog to return that exact nondeprecated place ID with usable
coordinates. The indexed resolver and public search API are implemented and
test verified. The default local Worker has no catalog R2 binding. The named
staging environment now resolves its provisioned private catalog, with live
Uvita and Salt Lake City searches confirm manifest and shard reads. The owner
reported that Uvita persisted even though the earlier browser build displayed a
false failure after the successful write. Staging Worker
`c1923a3b-2a8f-47a8-acd0-cf033ea49790` exposes the revision ETag needed to
remove that false failure. A second owner write after this deployment remains
external verification.

## Export, sharing, and privacy boundary

JSON export includes the safe profile projection and all pins. CSV export
contains pin ID, canonical place ID, visited years, and normalized optional
visit dates. Neither format
contains Auth0 subjects, qualified identity digests, access tokens, invitation
data, or Durable Object operation records.

The authenticated owner screen restores an existing Auth0 session with
`checkSession`, loads saved state, persists pin additions, date changes, and
removals through revisioned mutations, changes visibility, and exposes a
copyable `/my-atlas/{handle}` link only while the profile is public. Access
tokens remain memory only. The signed-out Vue
view reads `GET /v1/public/atlases/{handle}`. The registry resolves only active
handles, and the user object returns a deliberately smaller projection containing
the handle, display name, canonical places, coordinates, and optional visit
dates, plus derived visited years for compatibility.
Internal user IDs, pin IDs, qualified identities, invitations, accepted-policy
records, timestamps, and mutation history do not enter that response.

Private, absent, and inactive profiles share the same public 404 behavior.
Public responses are `no-store`, and the client adds `noindex, nofollow` while a
shared Atlas is mounted. This is public-link behavior, not a secret-link access
control. Removing the final pin still makes the profile private atomically.

The local public viewer is client rendered. Profile-specific server HTML, Open
Graph tags, crawler status behavior, public-directory discovery, and production
routing are not implemented.

## Browser presentation

Owner and public views derive place, country, continent, capital, date, and map
span statistics from the safe canonical place projection. They provide exact
year and undated filters, chronological destination playback, keyboard and
button cycling, and mobile layouts. Playback reveals dated destinations
cumulatively, moves the camera between successive destinations, and animates a
plane over a curved connection before focusing the destination. Reduced motion
preferences suppress the plane animation. Places within the same year use a
stable name and ID order for presentation only. The interface states that this
is a visual sequence rather than a recorded travel route.

At phone widths, owner and public views keep the statistics visible but place
year filtering, playback, path visibility, and Story export inside an
accessible map-controls disclosure that is collapsed by default. MapLibre's
desktop navigation and terrain button stack is hidden at the same breakpoint,
because the map retains touch pan and zoom gestures. Desktop layouts keep those
controls expanded and retain the MapLibre button stack. The year selector is
explicitly restored from the site's legacy hidden-select rule in both layouts.
Map provider attribution remains available through MapLibre's compact info
control, but My Atlas collapses its initially expanded attribution text as soon
as provider data is available. Activating the info button expands the original
MapLibre attribution control.

Map pins use a deterministic color for their earliest visit year, retain a
visible place and year label, and emphasize the selected destination. A compact
year legend uses the same colors. Undated destinations remain visible and
filterable but do not enter chronological playback. Curved map connections are
a deterministic visual treatment over the current pins and do not claim route
history.

The owner editor intentionally asks only for optional visit years. Users may
record multiple years for repeat visits or leave a destination undated. The API
continues to accept an optional month for backward compatibility, but the
current timeline and visitor presentation operate at year precision.
Selecting a catalog search result opens its Add destination editor immediately
below the search control. The result list remains below the active editor so
the selected action is visible before alternate matches.

When the My Atlas route flag is enabled, the public homepage includes a peer My
Atlas discovery card alongside the Travel Atlas and travel guides. Its call to
action routes directly to `/my-atlas`. Disabled builds omit the card together
with the route, so the homepage cannot expose a dead My Atlas link.

The browser can generate a 1080 by 1920 PNG Story card locally. It includes the
visible statistics, pins, decorative connections, a recognizable world land
silhouette, and the label `My Atlas by RoamWithJustin.com`. The silhouette uses
bundled Natural Earth 1:110m land geometry from `world-atlas`, decoded by
`topojson-client` and projected into the canvas by `d3-geo`. Export makes no
tile-provider or other external request. It does not upload the image or expose
private account fields.

## Deliberately incomplete

The local API still needs handle-change coordination with registry tombstones,
permanent account deletion and its approved retention contract, abuse reporting
and moderation, and registration or operator rate-limit enforcement. Public
catalog and Atlas reads have a tested weighted limiter boundary and a deployed
staging binding, but live exhaustion behavior is not yet verified.
Profile-specific share HTML, a verified public owner profile, and owner
verification of the corrected save feedback and silent session restoration
also remain. Planned destinations are a future feature, not an overload of the
visited pin state. A future planner needs an explicit planned lifecycle,
exclusion from visited statistics and playback by default, a deliberate
planned-to-visited transition, and a separate public-sharing decision.
