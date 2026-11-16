---
id: my-atlas-api-authentication
title: My Atlas Local API Authentication Boundary
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-16
updated: 2026-11-16
related:
  - my-atlas-authentication
  - my-atlas-registration
  - my-atlas-account-state
  - my-atlas-private-beta
  - my-atlas-private-beta-implementation
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - workers/my-atlas/src/auth.mjs
  - workers/my-atlas/src/index.mjs
  - workers/my-atlas/wrangler.jsonc
  - workers/my-atlas/README.md
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/views/MyAtlasPublicView.vue
  - src/features/my-atlas/config/api.mjs
  - scripts/test-my-atlas-worker.mjs
  - scripts/serve.js
  - package.json
verification:
  state: verified
  evidence:
    - npm run my-atlas:worker:test
    - npm run my-atlas:worker:check
    - npm run my-atlas:worker:check:staging
    - npm run my-atlas:test
    - Local Wrangler GET /health returned 200 and GET /v1/auth/check without a token returned 401
    - npm run my-atlas:serve exposed the Vue proof, authentication Worker, and full catalog search on loopback ports 8080, 8787, and 8788
    - Owner verified the genuine Auth0 API-audience access token through the deployed staging Worker
---

# My Atlas local API authentication boundary

Phase 2A added a separate My Atlas Worker solely to prove the protected API
authentication boundary. Phase 2B reuses that verifier before its local
registration and operator routes. The Phase 2C local slice adds a public Atlas
projection without weakening the protected routes. A staging Worker now runs at
the account's `workers.dev` hostname with the isolated R2 binding, two Durable
Object namespaces, and public-read limiter. Live checks verified Phase 2C
health, R2-backed search, unauthenticated rejection, exact-origin CORS, and
unrelated-origin rejection. The default environment remains undeployed and no
production route exists.

Staging-only configuration diagnostics write the request ID, error class, and
missing setting or binding name to Worker logs. They do not log configured
values, bearer tokens, invitation codes, identities, or request bodies. Client
responses remain generic.

The staging configuration declares the invitation pepper, invitation-generation
secret, and Turnstile secret as required bindings. Wrangler must reject a future
deployment when any of those secret bindings is absent.

## Accepted identity

`GET /v1/auth/check` accepts only a bearer token that passes all of these
checks:

- a compact, bounded, three-part JWT;
- an RS256 signature resolved through the configured Auth0 tenant JWKS;
- exact issuer `https://roamwithjustin.us.auth0.com/`;
- exact audience `https://api.roamwithjustin.com`;
- required `sub`, `iat`, and `exp` claims with expiration and future issue-time
  enforcement;
- a JWT access-token header type when a type is present;
- the `read:my-atlas` permission in either OAuth `scope` or the Auth0
  `permissions` claim.

Successful responses return only the verified issuer and subject plus the
token permissions. The Worker does not accept a browser-supplied user ID,
email, role, or administrator flag. It does not decode a token as a substitute
for signature verification. Failures are generic and never return or log the
token.

Route authorization is additive. Registration requires `write:my-atlas` after
the base `read:my-atlas` check. Invitation administration and reconciliation
require `admin:my-atlas`; a client-supplied role or UI state cannot substitute
for that API permission.

The automated suite creates an ephemeral RSA key pair and verifies acceptance
of a correctly signed API token. It verifies rejection of a SPA ID-token
audience, another API audience, another issuer, expired tokens, unsigned
tokens, HS256 tokens, an invalid token type, malformed authorization, and a
token without the required permission. It separately checks identity-provider
unavailability and invalid Worker configuration.

## HTTP and browser boundary

`GET /health` is public and reports only the service name, health state, and
phase. Bounded place search and exact canonical place resolution are also
public data routes and do not expose user state. A signed-out
`GET /v1/public/atlases/{handle}` returns only an explicitly published safe
projection. Private and nonexistent handles both return the same 404.
`GET /v1/auth/check` and every owner or operator route remain protected.
Responses are `no-store`, include a request ID, and use generic error codes.
Authentication failures include a standards-compatible Bearer challenge.

Cross-origin browser access uses an exact-origin allowlist. It accepts HTTPS
origins and permits HTTP only for `localhost` or `127.0.0.1`. The default local
environment contains only the two loopback origins. The staging declaration
also names the exact Roam With Justin HTTPS origins. Credentials are not
enabled. Preflight permits GET, POST, PATCH, DELETE and OPTIONS with
authorization, content type, idempotency key and If-Match headers. Requests
carrying another Origin are rejected before token processing.

The staging declaration binds a 120-unit-per-minute Cloudflare limiter. Place
search consumes two units, while exact-place and public-Atlas reads consume one,
yielding a nominal 60 searches or 120 other reads per client key in one period.
The runtime returns 429 with `Retry-After: 60` when denied and fails closed if a
configured limiter errors. Cloudflare's limiter is approximate and location
scoped, so invitation correctness remains in Durable Object transactions.

The proof UI first obtains the audience-scoped access token through the Auth0
SPA SDK, then sends it to the local Worker. The UI reports API access as
verified only after the Worker validates the token and returns an authenticated
response. The token remains memory only and is not displayed or persisted.

## Local operation and deployment boundary

`npm run my-atlas:serve` starts all three loopback services:

- Vue proof on port 8080;
- My Atlas authentication and registration Worker on port 8787;
- full local GeoNames search on port 8788.

`npm run my-atlas:worker:check` performs a Wrangler dry-run bundle check. The
tracked Wrangler file disables `workers.dev` and preview URLs and defines no
route. It declares local SQLite-backed registration and user-object bindings,
but a dry run and local development do not provision them in the owner's
account. The repository intentionally has no My Atlas deploy script. No
Cloudflare resource or production route was created or verified by Phase 2A or
the later local slices.

`npm run my-atlas:worker:check:staging` dry-runs the named staging environment.
That environment is also deployed at a temporary `workers.dev` URL with the two
Durable Objects, `roamwithjustin-my-atlas-catalog-staging` R2 binding, and public
rate limiter. Live checks verified the hostname, catalog binding, public and
protected boundaries, and genuine Auth0 access token. Limiter exhaustion is not
yet verified.

## Remaining boundary

This authentication check alone is not My Atlas membership. Phase 2B implements
browser invitation redemption and protected operator recovery. Staging has a
dedicated M2M operator grant, required secrets, technical policy versions, and
one live owner invitation, but no owner beta account has yet been verified.
Profile display and visibility mutation, revisioned pin CRUD, export, owner
state bootstrap, and opt-in public projection reuse this boundary. Canonical
pin writes validate against the separately published authoritative catalog.
Handle change, deletion, moderation, and profile-specific server HTML remain
unimplemented. A genuine owner token has
already been acquired through the browser client, but the owner must still
click the updated verification action once against a running Worker to
externally verify the complete Auth0-to-Worker round trip.
