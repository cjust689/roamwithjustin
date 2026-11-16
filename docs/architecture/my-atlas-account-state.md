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
  - workers/my-atlas/src/account
  - workers/my-atlas/src/public
  - workers/my-atlas/src/catalog/projection.mjs
  - workers/my-atlas/src/registration/objects.mjs
  - workers/my-atlas/src/index.mjs
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/views/MyAtlasPublicView.vue
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
---

# My Atlas local profile, pin, and sharing state

Phase 2B has a local owner-state API on the same isolated Worker and per-user
SQLite Durable Object. The Phase 2C local slice adds an opt-in public projection,
a signed-out handle route, and browser owner controls. The backend is deployed
to isolated staging, but no real user account, stored pin, or public profile has
been verified.

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
- `PATCH /v1/me/pins/{pinId}` changes its place or visited years;
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
HTTP 412 without changing state.

## Pin state

Pins store only:

- a stable internal pin ID;
- the canonical `iso-country:XX` or `geonames:N` place ID;
- a sorted, unique optional list of visited years;
- creation and update timestamps.

The object maintains a place index to reject duplicate destinations and a
profile pin count enforcing the 300-pin beta ceiling. A profile cannot become
public while empty. Deleting its last pin atomically makes it private.

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
Uvita and Salt Lake City searches confirming manifest and shard reads. Pin
writes remain unverified until a genuine registered owner performs them.

## Export, sharing, and privacy boundary

JSON export includes the safe profile projection and all pins. CSV export
contains only pin ID, canonical place ID, and visited years. Neither format
contains Auth0 subjects, qualified identity digests, access tokens, invitation
data, or Durable Object operation records.

The authenticated owner screen loads saved state, persists pin additions and
removals through revisioned mutations, changes visibility, and exposes a copyable
`/my-atlas/{handle}` link only while the profile is public. The signed-out Vue
view reads `GET /v1/public/atlases/{handle}`. The registry resolves only active
handles, and the user object returns a deliberately smaller projection containing
the handle, display name, canonical places, coordinates, and visited years.
Internal user IDs, pin IDs, qualified identities, invitations, accepted-policy
records, timestamps, and mutation history do not enter that response.

Private, absent, and inactive profiles share the same public 404 behavior.
Public responses are `no-store`, and the client adds `noindex, nofollow` while a
shared Atlas is mounted. This is public-link behavior, not a secret-link access
control. Removing the final pin still makes the profile private atomically.

The local public viewer is client rendered. Profile-specific server HTML, Open
Graph tags, crawler status behavior, public-directory discovery, and production
routing are not implemented.

## Deliberately incomplete

The local API still needs handle-change coordination with registry tombstones,
permanent account deletion and its approved retention contract, abuse reporting
and moderation, and registration or operator rate-limit enforcement. Public
catalog and Atlas reads have a tested weighted limiter boundary and a deployed
staging binding, but live exhaustion behavior is not yet verified.
Profile-specific share HTML and real user verification also remain.
