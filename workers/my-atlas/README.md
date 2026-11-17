# My Atlas API, Phases 2A through local 2C

This is an isolated, local-only authentication and registration foundation for
My Atlas. It does not provision cloud resources, media, catalog storage, or a
production route.

Routes:

- `GET /health` reports the local service status without authentication.
- `GET /v1/places/search?q=...` reads one bounded versioned search shard.
- `GET /v1/places/{placeId}` resolves one current or deprecated canonical ID.
- `GET /v1/public/atlases/{handle}` returns the safe projection of one
  explicitly published Atlas without authentication. Private and absent handles
  both return 404.
- `GET /v1/auth/check` requires an Auth0 RS256 access token issued by the exact
  tenant for the exact My Atlas API audience and containing `read:my-atlas`.
- `POST /v1/beta/register` additionally requires `write:my-atlas`, a one-use
  invitation, an idempotency key, configured policy versions, and server-side
  Turnstile verification. It provisions a private profile through an
  idempotent registry-to-user Durable Object saga.
- `POST /v1/admin/invitations` requires `admin:my-atlas`, issues a policy-bounded
  invitation, and returns its recoverably idempotent code through that protected
  response only.
- `POST /v1/admin/invitations/revoke` revokes by nonsecret invitation ID.
- `GET /v1/admin/registrations/pending` returns bounded safe summaries.
- `POST /v1/admin/registrations/{userId}/reconcile` explicitly completes an
  initialized profile or releases an aged uninitialized reservation.
- `GET` and `PATCH /v1/me` read and update the active owner's private profile.
- `GET /v1/me/atlas` returns the owner profile and resolved pins for browser
  bootstrap.
- `GET` and `POST /v1/me/pins`, plus `PATCH` and `DELETE
  /v1/me/pins/{pinId}`, provide revisioned canonical pin CRUD.
- `GET /v1/me/export?format=json|csv` exports the owner's safe profile and pin
  state.

Owner routes never accept a target user ID. The Worker derives the qualified
issuer and subject from the verified bearer token, resolves that digest through
the registry, opens only the assigned per-user Durable Object, and supplies the
same digest to every object operation. The object rejects a mismatched digest.
Consequently, guessing another pin ID still queries only the caller's object.
Automated two-account tests cover isolated reads and exports plus rejected
cross-owner update and delete attempts.

Run it locally with `npm run my-atlas:worker:dev`. Validate the Worker bundle
without deploying it with `npm run my-atlas:worker:check`. Cryptographic token
acceptance and rejection tests run through `npm run my-atlas:worker:test`.
`npm run my-atlas:worker:check:staging` validates the declared staging bindings
without changing the live deployment.

The Wrangler configuration declares one SQLite-backed registration-registry
Durable Object class and one SQLite-backed per-user class. Those declarations
run locally, appear in dry-run output, and now back two provisioned staging
namespaces. The
configuration disables both `workers.dev` and preview URLs and contains no
route. A named staging environment runs at a temporary `workers.dev` target
with an isolated private catalog bucket binding and a 120-unit weighted
public-read limiter. There is intentionally no deploy script and no production
route.

Staging logs sanitized configuration failures with the request ID, error class,
and missing setting or binding name. It never logs a configured value, bearer
token, invitation code, identity, or request body. API responses remain generic.
All three staging secret names are also declared as required, so a future
Wrangler deployment must reject an absent binding before changing live code.

Tracked configuration deliberately omits secret values. The owner reports the
invitation hash pepper, invitation generation secret, and Turnstile secret
installed in staging. Staging uses technical-only policy labels, a one-use
invitation ceiling, 24-hour maximum invitation lifetime, and 15-minute pending
lease. These are not approved public-beta policy. The Auth0 API must grant
`admin:my-atlas` only to the owner before a live operator call. There is no
public invitation-check route.

Release reconciliation first tombstones the empty per-user object and then
releases registry claims. This prevents a delayed registration request from
initializing a ghost profile after its invitation slot has been reclaimed. No
real invitation code or beta identity is tracked in the repository.

Account mutations use a strong profile-revision ETag, `If-Match`, and an
identity-qualified idempotency key. Pin create and place replacement also
require an authoritative nondeprecated catalog match with usable coordinates.
`npm run my-atlas:catalog:worker` converts the ignored full catalog into
immutable gzip resolution and search shards plus `catalog/current.json`. The
staging bucket contains the active `geonames-2026-11-16` release, and live
searches verified R2 reads. No production catalog bucket is bound. Release
shards must be uploaded and verified before the current manifest is changed.
The authenticated browser can load saved state,
persist pin additions and removals, publish or unpublish its Atlas, and copy the
handle link. The public viewer is client rendered, uncached, and marked
`noindex, nofollow`; it never receives internal user or pin IDs, identity data,
invitations, policy records, or mutation history. Handle changes, account
deletion, abuse reporting, profile-specific server HTML, staging publication,
and production routing are not implemented.
