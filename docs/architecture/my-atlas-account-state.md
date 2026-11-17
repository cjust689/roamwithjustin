---
id: my-atlas-account-state
title: My Atlas Local Profile, Pin, and Sharing State
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-16
updated: 2026-11-17
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
  - src/features/my-atlas/catalog/memory.mjs
  - src/features/my-atlas/catalog/customPlace.mjs
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/components/MyAtlasPinEditor.vue
  - src/features/my-atlas/components/MyAtlasTutorial.vue
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
    - A two-account Workers-runtime test verified distinct pin IDs and isolated reads, exports, updates, and deletes even when both owners pin the same canonical Place
    - Workers-runtime tests verified private-by-default public lookup, safe-field projection, explicit publication, and immediate unpublication
    - Workers-runtime tests verified that a spot persists only through its authenticated owner's object and projects only its safe canonical spot fields
    - npm run my-atlas:test verified optional month and year dates, legacy year compatibility, session restoration, statistics, filtering, ordered destination playback, cumulative reveal, and curved connection generation
    - Headless Chrome verified exact desktop year-editor alignment and cinematic playback at 1248 by 598 and 390 by 844 without horizontal overflow
    - Headless Chrome verified that a selected search result opens its destination editor directly below the search control and before the result list at desktop and 390 pixel mobile widths
    - Headless Chrome verified the feature-gated My Atlas homepage card at desktop and 390 pixel mobile widths, with no horizontal overflow and navigation to /my-atlas
    - Headless Chrome verified collapsed owner and public map-control drawers, hidden MapLibre desktop controls, full-width native year selectors, and zero horizontal overflow at 390 pixels while preserving expanded desktop controls
    - Headless Chrome verified that My Atlas attribution begins as a compact info button and expands on activation without removing provider attribution
    - Headless Chrome verified the four-step pre-account walkthrough and first-account quick start at 390 pixel mobile and 1200 pixel desktop widths, including completion targets, persistent dismissal, and no horizontal overflow
    - Headless Chrome verified that overview pins use screen-distance clusters, cluster activation expands nearby destinations into standalone pins, and timeline marker anchors remain within one pixel of their projected coordinates at desktop and 390 pixel mobile widths
    - Pull requests 55 and 56, their required validation gates, develop workflow 43987307324, and Pages workflow 43987868552 succeeded
    - Live content-addressed production chunks returned 200 and contained the timeline copy, plane marker styles, Add year control, and exact 2.9rem alignment rule
    - Staging Worker c1923a3b-2a8f-47a8-acd0-cf033ea49790 returned 200 health and exposed ETag and X-Request-Id to the allowed localhost origin
    - Staging Worker e20404c5-0250-47f0-88af-2d0db14983ee returned 200 health and resolved a canonical spot after the verified manifest switch
    - Owner reported that the Uvita pin persisted through reload and a new sign in before the save-response correction was deployed
    - API client tests preserve the Worker request ID on rejected authenticated requests
    - Worker routing tests prove that owner state bootstrap bypasses the public catalog and shared Atlas limiter
    - Headless Chrome at 390 pixels verified in-place recovery from a simulated catalog 429 without reloading or losing the signed-in screen
    - Pull requests 77 and 78 passed their required validation gates; Pages workflow 44014283401 deployed main merge 7c2b1a9135ce45a834bf7aadda869460452e55de
    - Staging Worker f039455e-35bf-4c9d-bd15-c03716e63f72 returned 200 health after the owner-bypass and scoped-public-limiter deployment
    - The live content-addressed My Atlas chunk returned 200 and contained Retry saved Atlas, Retry search, rate-limit, and API-session-renewal messages
    - Favorite-memory contract tests passed Unicode normalization, whitespace folding, 255-code-point and 1,020-byte ceilings, markup and invisible-control rejection, unsafe-storage fail-closed behavior, owner isolation, public projection, and CSV formula neutralization
    - Twenty-two Workers-runtime tests passed after favorite-memory persistence, update, export, sharing, direct-object validation, and corrupt-public-state coverage were added
    - Headless Chrome at 390 pixels verified the 255-character editor boundary, blocked markup, normalized line breaks, escaped list and selected-place rendering, successful local save, and zero horizontal overflow
    - Pull requests 82 and 83 promoted the favorite-memory implementation through protected develop and main after validation runs 44018100141, 44018321716, 44018838662, and 44018845869 passed
    - History-only pull request 84 synchronized main into develop without file changes after validation run 44018666432 passed
    - Staging Worker 2fbce736-0799-4235-a7b5-018727e39b64 returned 200 health after the favorite-memory contract deployed
    - Pages workflow 44019105927 deployed main merge ea1af7cb5c66301d13bf206f084fbe135fa69097
    - Live content-addressed My Atlas chunks 239.39312812 and 229.528c3c46 returned 200 and contained the Favorite memory editor, Save destination action, and explicit public-sharing disclosure
    - Twenty-four Workers-runtime tests passed after custom-pin persistence, owner-state projection, public projection, catalog bypass, and corrupt-state coverage were added
    - Browser and Worker tests passed strict custom-name and coordinate validation, server-generated custom IDs, normalized API responses, and formula-safe custom CSV fields
    - Headless Chrome at 390 pixels verified the authenticated custom-pin form, map placement event, rendered placement marker, shared date and memory editor, and zero horizontal overflow
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
- `POST /v1/me/pins` creates one catalog pin or one owner-created custom pin;
- `PATCH /v1/me/pins/{pinId}` changes its place or optional visit dates;
- `DELETE /v1/me/pins/{pinId}` removes it;
- `GET /v1/me/export?format=json|csv` returns the owner's profile and pins.

No owner route accepts a user ID, handle, email, or subject. Even a guessed pin
ID is resolved only inside the Durable Object selected from the caller's own
registry assignment. A second active owner can pin the same Place but receives
a distinct owner-qualified pin ID and cannot read, update, export, or delete the
first owner's pin. An unregistered verified identity resolves to no account.

Owner routes do not pass through the public catalog and shared Atlas weighted
limiter. A public search 429 therefore cannot directly prevent
`GET /v1/me/atlas` from loading. The browser preserves a rejected API request's
request ID and distinguishes a session renewal problem, transient account or
identity service failure, and connectivity failure. A transient owner
bootstrap failure exposes `Retry saved Atlas` without requiring a page reload.

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
- either a canonical `iso-country:XX` or `geonames:N` place ID, or a
  server-generated owner custom-place ID;
- for a custom pin only, its normalized owner-supplied name and coordinates;
- a sorted, unique optional list of visit dates, each with a year and optional
  month;
- a derived visited-year list retained for compatibility with schema version 1
  clients and pins;
- one optional favorite memory stored directly on that owner's pin;
- creation and update timestamps.

Pins may remain undated. The object maintains a place index to reject duplicate
destinations and a profile pin count enforcing the 300-pin beta ceiling. A
profile cannot become public while empty. Deleting its last pin atomically
makes it private.

Favorite memory is one optional plain-text value per pin, not an independently
addressable child record. The request boundary normalizes Unicode to NFC,
folds whitespace to one line, and permits at most 255 Unicode code points and
1,020 UTF-8 bytes. It rejects markup delimiters, unpaired surrogates, control
characters, bidirectional overrides, selected invisible formatting characters,
and Unicode noncharacters. The Durable Object independently requires the
already normalized value so an internal caller cannot bypass the HTTP contract.
Legacy pins without the field project an empty memory and require no migration.

Pin IDs are deterministically derived from the internal user ID and stored
place ID at creation. A custom place ID is first deterministically derived from
that internal user ID plus the normalized custom name and coordinates. An
exact repeat is rejected by the owner's destination index, while another owner
receives a different ID for the same input. The client cannot choose either ID.
Replacing a catalog pin's place preserves its pin ID while moving the
uniqueness index.

The canonical place may be a country, city, or reviewed spot. A spot does not
create a second ownership model or mutation route. It is resolved through the
same authoritative catalog and stored inside the same caller-derived per-user
Durable Object as every other pin.

A custom pin uses that same owner-qualified object, revision, 300-pin ceiling,
date, memory, export, delete, and sharing lifecycle. It is not resolvable by
another user's object and never becomes a shared catalog choice. Version 1
does not update a stored custom name or position. The owner can edit its dates
and memory, or delete and recreate it to relocate or rename it.

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
`e20404c5-0250-47f0-88af-2d0db14983ee` retains the revision ETag behavior and
adds spot-aware catalog validation and projection. A second owner write after
the original ETag correction remains external verification.

Custom creation is the explicit exception to catalog authority. It requires a
strict owner-input object instead of a place ID. The HTTP contract and Durable
Object independently require the normalized name and coordinate shape. The
service projects custom pins without calling catalog resolution and fails
closed when stored custom fields do not match their `custom:` ID type. No
country, region, feature kind, or other geography is inferred from coordinates.

## Export, sharing, and privacy boundary

JSON export includes the safe profile projection and all pins. CSV export
contains pin ID, stored place ID, optional custom name and coordinates, visited
years, normalized optional visit dates, and favorite memory. Formula-leading
cells are apostrophe-neutralized before CSV quoting. Neither format
contains Auth0 subjects, qualified identity digests, access tokens, invitation
data, or Durable Object operation records.

The authenticated owner screen restores an existing Auth0 session with
`checkSession`, loads saved state, persists pin additions, date changes, and
removals through revisioned mutations, changes visibility, and exposes a
copyable `/my-atlas/{handle}` link only while the profile is public. Access
tokens remain memory only. The signed-out Vue
view reads `GET /v1/public/atlases/{handle}`. The registry resolves only active
handles, and the user object returns a deliberately smaller projection containing
the handle, display name, safe place projections, coordinates, optional visit dates,
derived visited years for compatibility, and nonempty favorite memories.
Memory is included only after the owner explicitly publishes the whole Atlas.
Vue renders it through text interpolation rather than HTML insertion. The
public service fails closed if stored memory no longer satisfies the contract.
It also fails closed when a stored custom name or position no longer satisfies
the custom-place contract. Custom fields enter this projection only after the
owner explicitly publishes the whole Atlas.
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

Before account creation, a visible `See how it works` button opens a four-step
walkthrough covering private-by-default account creation, place entry, optional
visit years, timeline playback, statistics, and sharing. Its final action moves
the visitor to Google sign in or the account form. A newly provisioned,
revision-1 account with no pins receives a separate quick start once per browser.
Dismissal is stored only in local browser storage, and a permanent quick start
button can reopen it. Its final action moves keyboard focus to place
search. Both walkthroughs use an accessible modal with a trapped focus cycle,
Escape dismissal, scroll locking, focus restoration, reduced-motion handling,
and a phone-width bottom sheet layout.

Owner and public views derive place, spot, country, continent, capital, date,
and map span statistics from the safe canonical place projection. They provide exact
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
visible place and year label, and emphasize the selected destination. Nearby
pins collapse into a count marker using the same screen-distance grouping model
as the primary Atlas, with smaller phone spacing. The selected destination
always remains precise. Activating a group frames its destinations, and zooming
past the My Atlas overview threshold releases them into standalone pins. Marker
elements retain MapLibre's absolute positioning so their bottom anchors remain
on the projected coordinates during playback. A compact year legend uses the
same colors. Undated destinations remain visible and filterable but do not
enter chronological playback. Curved map connections are a deterministic
visual treatment over the current pins and do not claim route history. They use
a dark underlay, soft gold glow, and high-opacity three-pixel dashed line so the
connections remain legible over satellite imagery.

The owner editor intentionally asks only for optional visit years. Users may
record multiple years for repeat visits or leave a destination undated. The API
continues to accept an optional month for backward compatibility, but the
current timeline and visitor presentation operate at year precision.
Selecting a catalog search result opens its Add destination editor immediately
below the search control. The result list remains below the active editor so
the selected action is visible before alternate matches.

An active account also sees `Can't find it? Add a custom pin` directly below
search. The form can seed its name from the current query, requires a valid
plain-text name, and activates a gold map marker. The owner clicks or taps the
map, then may drag the marker or use arrow keys before continuing into the same
date and favorite-memory editor. The form states that this owner-supplied name
and position become visible if the Atlas is made public.

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
staging binding. Catalog and public Atlas reads have isolated limiter keys, but
live exhaustion behavior is not yet verified.
Profile-specific share HTML, a verified public owner profile, and owner
verification of the corrected save feedback and silent session restoration
also remain. Planned destinations are a future feature, not an overload of the
visited pin state. A future planner needs an explicit planned lifecycle,
exclusion from visited statistics and playback by default, a deliberate
planned-to-visited transition, and a separate public-sharing decision.

Memory images are deliberately not part of the text-memory release. They need
a separately reviewed media boundary with an explicit per-pin count, raw-byte
and decoded-pixel ceilings, file-signature and decoder validation rather than
extension trust, metadata stripping, server-controlled re-encoding, owner-only
object keys, authenticated mutation and deletion, private-by-default delivery,
storage quotas, and abuse and retention procedures. Image bytes must not be
stored in the profile Durable Object.
