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
  - my-atlas-trip-planning
  - my-atlas-trip-planning-implementation
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - package.json
  - workers/my-atlas/src/account
  - workers/my-atlas/src/planning
  - workers/my-atlas/src/public
  - workers/my-atlas/src/catalog/projection.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/src/index.mjs
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - src/features/my-atlas/components/MyAtlasRegistrationForm.vue
  - src/features/my-atlas/planning/handoffs.mjs
  - src/features/my-atlas/auth/session.mjs
  - src/features/my-atlas/catalog/atlasInsights.mjs
  - src/features/my-atlas/catalog/memory.mjs
  - src/features/my-atlas/catalog/mapMemory.mjs
  - src/features/my-atlas/catalog/customPlace.mjs
  - src/features/my-atlas/catalog/placeSearchClient.mjs
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/components/MyAtlasPinEditor.vue
  - src/features/my-atlas/components/MyAtlasTutorial.vue
  - src/features/my-atlas/export/storyExport.mjs
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/views/MyAtlasPublicView.vue
  - src/views/roam/Privacy.vue
  - src/views/roam/Home.vue
  - workers/my-atlas/test/account.test.mjs
  - workers/my-atlas/test/planning.test.mjs
  - scripts/test-my-atlas-worker.mjs
  - scripts/test-my-atlas-planning.mjs
  - scripts/test-my-atlas-place-catalog.mjs
verification:
  state: verified
  evidence:
    - npm run my-atlas:worker:test
    - npm run my-atlas:worker:durable:test
    - npm run my-atlas:test verified private planning contracts, direct catalog/custom endpoints, and client-only handoffs
    - npm run my-atlas:test verified that planner catalog search preserves canonical result coordinates and shared rate-limit error presentation
    - Protected pull requests 105 and 106 plus Pages run 44144353792 deployed the planner search, direct endpoint, and collapsible owner-flow release; live chunk 216.0c437c4d.js contained all release markers together
    - Workers-runtime planning tests verified private wishlist isolation, immutable wishlist/direct plan snapshots, controlled-clock retention and plan-only expiry, and permanent application-account deletion
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
    - Map-memory contract tests verified hidden-by-default, selected-pin, show-all, and empty-memory behavior
    - Headless Chrome verified selected-pin memory callouts and the optional all-memory map layer at desktop and 390 pixel mobile widths
    - Headless Chrome verified the compact two-column public profile identity header at 390 pixels with the place count occupying the former empty right side and no horizontal overflow
    - Pull requests 95 and 96 passed required validation, merged through protected develop and main, and Pages workflow 44043262797 deployed main merge 2dc4133eb63f98c702dd3cd0b6951952853006f8
    - Live content-addressed chunks 101.d8bb49a5.js and 101.8bcf6225.css returned 200 with the memory controls, pin callout rules, and compact mobile profile grid
    - Pull requests 82 and 83 promoted the favorite-memory implementation through protected develop and main after validation runs 44018100141, 44018321716, 44018838662, and 44018845869 passed
    - History-only pull request 84 synchronized main into develop without file changes after validation run 44018666432 passed
    - Staging Worker 2fbce736-0799-4235-a7b5-018727e39b64 returned 200 health after the favorite-memory contract deployed
    - Pages workflow 44019105927 deployed main merge ea1af7cb5c66301d13bf206f084fbe135fa69097
    - Live content-addressed My Atlas chunks 239.39312812 and 229.528c3c46 returned 200 and contained the Favorite memory editor, Save destination action, and explicit public-sharing disclosure
    - Twenty-four Workers-runtime tests passed after custom-pin persistence, owner-state projection, public projection, catalog bypass, and corrupt-state coverage were added
    - Browser and Worker tests passed strict custom-name and coordinate validation, server-generated custom IDs, normalized API responses, and formula-safe custom CSV fields
    - Headless Chrome at 390 pixels verified the authenticated custom-pin form, map placement event, rendered placement marker, shared date and memory editor, and zero horizontal overflow
    - Pull requests 87 and 88 passed required validation, merged through protected develop and main, and Pages workflow 44025229521 deployed main merge c54ea44490c05014698ffb2a0cfbcdd076ee12c4
    - Staging Worker version 9fa931b5-f32f-4df2-a84e-8a0516f83951 returned 200 health with the backward-compatible custom-pin API
    - Staging Worker version e7538fcf-b117-4905-9c0e-f8383f3f1bcd returned 200 health with the production origin, rejected unauthenticated owner reads and deletion with 401, and rejected a foreign origin with 403 after the planning, retention, and account-deletion API deployed
    - Thirty Workers-runtime tests passed after multi-destination planning, controlled-clock retention, and permanent application-account deletion coverage
    - Pull requests 101 and 102 passed required validation and promoted the planning frontend through protected develop and main; Pages run 44128602408 deployed main merge 8add555205dcd23314c0e11e1f0a2b4d1038fd54
    - Live content-addressed bundles contained the final My Atlas privacy and retention notice, ordered-plan UI, segmented Maps links, and account-deletion control
    - Direct /privacy and /my-atlas requests still return the GitHub Pages application fallback with HTTP 404, so a direct-route 200 response is not claimed
    - Live content-addressed chunks 102.9bc646f9.js, 850.f2e2b9be.js, and 102.fa12fe12.css returned 200 with the custom-pin prompt, map event, disclosure, and placement styles
---

# My Atlas local profile, pin, and sharing state

Phase 2B has an owner-state API on the same isolated Worker and per-user SQLite
Durable Object. Phase 2C adds an opt-in public projection, a signed-out handle
route, and browser owner controls. The planning slice adds application-account
deletion, private wishlist records, one future plan, retention alarms, and
browser-only external handoffs. Its backward-compatible API is deployed on the
isolated staging Worker, and its feature-gated frontend is deployed through
GitHub Pages. Authenticated owner and real-device acceptance still gate broader
invitations.

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
- `GET|POST /v1/me/bucket-list` pages or creates private wishlist entries;
- `PATCH|DELETE /v1/me/bucket-list/{wishId}` edits or removes one entry;
- `GET|POST /v1/me/trip-plans` reads or creates the single beta plan;
- `PATCH|DELETE /v1/me/trip-plans/{planId}` replaces or removes that plan;
- `POST /v1/me/trip-plans/{planId}/keep` explicitly refreshes retention;
- `GET /v1/me/export?format=json|csv` exports owner state; and
- `DELETE /v1/me` permanently removes application-owned account data after
  explicit confirmation.

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

Handle mutation and abuse reporting are not part of this slice. Permanent
application-account deletion is implemented, test verified, and deployed to
isolated staging. It has not been exercised against a real disposable staging
account and must not be tested by deleting the owner's existing account.

## Revisions and safe retries

The profile owns one monotonically increasing revision covering profile, pin,
wishlist, and plan state. Every client mutation requires a strong
`If-Match: "rev-N"` header and a UUID
`Idempotency-Key`. The user object serializes each mutation, checks the revision,
and increments it exactly once. A retry with the same qualified identity,
action, key, expected revision, and normalized payload returns the stored result.
A changed request under that operation conflicts. Competing writes against the
same revision produce one success and one revision conflict.

Retention alarms are internal object events rather than client requests. They
atomically recheck the stored deadline and advance this same revision when they
mark or delete a plan. Reads, exports, map handoffs, prompt copies, and passive
login do not advance retention.

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

## Private wishlist and plan state

Wishlist data uses `wish:` records and a separate uniqueness index inside the
same owner object. It does not reuse visited `pin:` records and does not enter
the public projection. Each record stores an owner-qualified ID, a canonical
place ID or existing normalized custom-place shape, optional normalized note,
priority, optional desired year, and timestamps. The beta ceiling is 250, and
list responses page at no more than 100 records.

Wishlist reads re-resolve canonical IDs for current display details. If one
stored ID is absent from the active catalog, the owner still receives that
private record as an explicitly unavailable destination with its editable
planning metadata. This keeps the record removable instead of failing the
whole planner. Unavailable records cannot be selected for a new or replaced
plan, so an unresolved place never becomes a route snapshot.

The planner owns an independent country, city, and reviewed-spot search control
that calls the same public My Atlas catalog endpoint as visited-place search.
Selecting a result can create a wishlist record from its canonical `placeId`,
or assign that catalog record directly as the plan start or selected finish.
The planner displays the catalog latitude and longitude before either action and
again on the saved wishlist entry. Manual name and coordinate entry remains a
separate custom-place fallback that supports the same save, start, and finish
choices.

One `plan:` record may exist in the first slice. It stores title, lifecycle
status, optional year and note, a start snapshot, an ordered destination list,
and last-stop, return-to-start, or selected-end completion. Start and selected
end accept exactly one saved-wish, canonical-place, or custom-place selector.
The service re-resolves canonical IDs, qualifies custom IDs to the owner, and
stores immutable snapshots without creating wishlist records. A defensive
ceiling of 50 destinations bounds request and storage abuse without presenting
a small product limit. A
snapshot copies the catalog/custom identity, product type, readable geography,
coordinates, route readiness, catalog revision when applicable, and optional
source wish ID. Rendering and export never require the source wishlist record,
so editing or removing a wish cannot rewrite or break an existing plan.

Plan status is `draft`, `saved`, or `archived`. None proves travel. The future
Mark Visited action remains a separate later owner-confirmed transition that
must reuse the existing pin lifecycle.

The plan stores `retentionConfirmedAt` and its six-calendar-month expiry. An
explicit create, replace, or Keep refreshes it. At expiry the per-owner alarm
marks the record `deletion-pending` and schedules its 30-day `deleteAfter`.
Grace expiry deletes the plan and its snapshots only. Wishlist entries and
visited pins remain. The alarm is scheduled when a plan is created, edited, or
kept, so abandoned accounts do not depend on a later login for cleanup.

The browser constructs external handoffs from saved snapshots. Google Maps
URLs use `api=1`, preserve order, use no API key, split longer plans into
continuous legs with no more than three intermediary waypoints per link, and
reject output over 2,048 characters. Country and
spot centroids require an entrance or custom coordinate before handoff. Custom
coordinates require explicit confirmation. AI prompt generation includes
readable geography only by default and adds coordinates only after a per-copy
opt-in. Neither handoff calls a platform-owned model or paid route API.

## Permanent application-account deletion

`DELETE /v1/me` requires the verified owner, write permission, a strong current
revision, a UUID idempotency key, and the exact confirmation phrase. The user
object first becomes private and `deleting`. The registry then removes its
active identity assignment, replaces the handle assignment with a nonactive
nonreusable handle tombstone, and the user object erases profile,
pins, wishlist, plans, indexes, mutation history, and policy acceptance state.
A minimal operation tombstone supports an exact retry after a cross-object
partial failure. It retains no handle, profile, content, or qualified identity.
The separate handle tombstone retains the formerly public handle and deletion
time, but no user ID or identity, and public lookup still returns the generic
404 response.
This operation does not delete the upstream Google or Auth0 identity.

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

JSON export schema 2 includes the safe profile projection, all pins, private
wishlist records, immutable plan snapshots, and plan retention fields. CSV export
contains pin ID, stored place ID, optional custom name and coordinates, visited
years, normalized optional visit dates, and favorite memory. Formula-leading
cells are apostrophe-neutralized before CSV quoting. Neither format
contains Auth0 subjects, qualified identity digests, access tokens, invitation
data, or Durable Object operation records. Export is passive and does not
refresh plan retention.

The authenticated owner screen restores an existing Auth0 session with
`checkSession`, loads saved state, persists pin additions, date changes, and
removals through revisioned mutations, changes visibility, and exposes a
copyable `/my-atlas/{handle}` link only while the profile is public. Access
tokens remain memory only. The signed-out Vue
view reads `GET /v1/public/atlases/{handle}`. The registry resolves only active
handles, and the user object returns a deliberately smaller projection containing
the handle, display name, safe visited-place projections, coordinates, optional visit dates,
derived visited years for compatibility, and nonempty favorite memories.
Memory is included only after the owner explicitly publishes the whole Atlas.
Vue renders it through text interpolation rather than HTML insertion. The
public service fails closed if stored memory no longer satisfies the contract.
It also fails closed when a stored custom name or position no longer satisfies
the custom-place contract. Custom fields enter this projection only after the
owner explicitly publishes the whole Atlas.
The public object scan is restricted to `pin:` keys. Wishlist entries, plan
snapshots, private notes, desired years, future dates, and retention metadata
cannot enter that response even when the visited Atlas is public.
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

My Atlas uses the site's existing Poppins family for interface copy, headings,
tutorials, authentication feedback, pin editing, public profiles, and locally
rendered Story text. The application does not request or declare Russo One.

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

The public phone header uses a compact two-column identity block. The handle
and display name remain together on the left, while the place count becomes a
small status badge on the right. This removes the unused half-row without
changing the desktop profile header or hiding any shared-profile detail.

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

When a standalone pin has a favorite memory, selecting it reveals the complete
memory inside that pin's map label. A `Show all memories` control in both owner
and public views exposes shortened previews for every visible standalone pin
with a memory, and changes to `Hide memories` while active. The control is
disabled when the filtered view contains no memories. It starts off on every
page load, remains inside the existing collapsed phone controls, and does not
expand memory text inside low-zoom cluster markers. Memory content is assigned
as DOM text rather than HTML.

The owner editor intentionally asks only for optional visit years. Users may
record multiple years for repeat visits or leave a destination undated. The API
continues to accept an optional month for backward compatibility, but the
current timeline and visitor presentation operate at year precision.
Selecting a catalog search result opens its Add destination editor immediately
below the search control. The result list remains below the active editor so
the selected action is visible before alternate matches.

The signed-in owner panel keeps its travel overview visible, then follows the
working sequence of Add destination, Visited destinations, Plan future travel,
and Share and export. Those four flows have independent accessible disclosure
controls. Existing accounts start with the disclosures closed so large saved
collections do not dominate the page; empty accounts open Add destination to
preserve onboarding. Adding a destination closes its entry flow and opens the
visited list, while editing a visited entry reopens and focuses its editor.
Visited and planner collections use bounded internal scrolling when expanded.
The Google account summary remains visible in a compact identity and action row.

The private planner has its own search field rather than depending on the
visited-place results above it. It uses the shared local or Worker-backed My
Atlas search client, presents country, city, and reviewed-spot type plus stored
latitude and longitude, and saves the canonical result into the private
wishlist. Saved wishlist cards repeat those coordinates so the owner can review
the plan input before using external directions. Custom coordinates remain
available through a secondary fallback disclosure.

The planner disclosure header uses the same full-width control geometry as the
other owner workflow sections. Its closed and open states retain the shared
vertical padding, centered alignment, and compact status pill at desktop and
phone widths. Planner failures preserve the Worker request ID in owner-facing
recovery copy when one is available.

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

The API still needs handle-change coordination with registry tombstones, abuse
reporting and moderation, and registration or operator rate-limit enforcement.
Permanent application-account deletion and the six-month plus 30-day plan
retention contract are implemented and staged, but authenticated deletion still
requires disposable-account acceptance. Public
catalog and Atlas reads have a tested weighted limiter boundary and a deployed
staging binding. Catalog and public Atlas reads have isolated limiter keys, but
live exhaustion behavior is not yet verified.
Profile-specific share HTML, a verified public owner profile, and owner
verification of the corrected save feedback and silent session restoration
also remain. Private planned destinations now use an explicit lifecycle and are
excluded from visited statistics, playback, and public sharing. The separate
owner-reviewed Mark Visited transition remains unimplemented.

Memory images are deliberately not part of the text-memory release. They need
a separately reviewed media boundary with an explicit per-pin count, raw-byte
and decoded-pixel ceilings, file-signature and decoder validation rather than
extension trust, metadata stripping, server-controlled re-encoding, owner-only
object keys, authenticated mutation and deletion, private-by-default delivery,
storage quotas, and abuse and retention procedures. Image bytes must not be
stored in the profile Durable Object.
