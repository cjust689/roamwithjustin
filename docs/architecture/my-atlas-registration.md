---
id: my-atlas-registration
title: My Atlas Registration and Operator Recovery
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-16
updated: 2026-11-20
related:
  - my-atlas-api-authentication
  - my-atlas-authentication
  - my-atlas-account-state
  - my-atlas-private-beta
  - my-atlas-private-beta-implementation
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - scripts/lib/my-atlas-local-registration.cjs
  - scripts/lib/my-atlas-local-runtime.cjs
  - workers/my-atlas/src/registration/local.mjs
  - scripts/test-my-atlas-load-safety.mjs
  - workers/my-atlas/src/registration
  - workers/my-atlas/src/index.mjs
  - workers/my-atlas/src/worker.mjs
  - workers/my-atlas/wrangler.jsonc
  - workers/my-atlas/test/registration.test.mjs
  - workers/my-atlas/vitest.config.mjs
  - scripts/test-my-atlas-worker.mjs
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/auth/turnstile.mjs
  - src/features/my-atlas/components/MyAtlasRegistrationForm.vue
  - src/features/my-atlas/config/turnstile.mjs
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - package.json
verification:
  state: verified
  evidence:
    - npm run my-atlas:worker:test
    - npm run my-atlas:worker:durable:test
    - npm run my-atlas:worker:check
    - Workers-runtime test accepted only one of twelve concurrent claims against a one-use invitation
    - Workers-runtime tests verified operator invitation retry and revocation, bounded pending pagination, safe completion, lease-gated release, and ghost-activation prevention
    - Workers-runtime test verified private profile initialization, idempotent retry, owner isolation, and persistence across Durable Object eviction
    - Local Wrangler GET /health returned 200 and unauthenticated POST /v1/beta/register returned 401
    - Staging deployment 037496ad-400a-4dda-b54f-41470cd3aa17 corrected never-registered account lookup from HTTP 409 to HTTP 404 so browser redemption can open
    - Owner reported successful protected invitation issuance, localhost Turnstile completion, redemption, and private account entry
    - npm run build
---

# My Atlas registration and operator recovery

Phase 2B began the secure application backend with registration and operator
recovery. It adds two SQLite-backed Durable Object classes and a
narrowly scoped administration API to the separate My Atlas Worker. The
declarations are testable locally and appear in Wrangler dry runs. The staging
deployment has now provisioned both namespaces in the owner's account. The
owner reported successful live invitation issuance, Turnstile redemption, and
private account creation. The stored identity remains owner-verified rather
than independently inspected.

## Object ownership

One deterministically named registration registry owns beta-wide uniqueness:

- keyed invitation digests, maximum uses, reserved uses, completed uses,
  expiration and revocation state;
- provider-qualified identity digest to immutable internal user ID;
- normalized handle to internal user ID;
- pending and active registration operations keyed by an identity-qualified
  idempotency digest;
- a bounded pending-registration index and abandoned-registration tombstones;
- operator action digests recording invitation issue, revocation, and recovery
  without storing a raw access token or provider subject in those records.

One separately named user object owns each user's profile. Phase 2B initializes
only the profile record. It does not implement pins or profile mutation.

Both classes use Cloudflare's current declarative class exports with SQLite
storage and synchronous transactional storage operations. The registry is the
single serialization point for invitation, identity and handle claims. The
per-user object remains the authoritative owner of private profile state.

## Registration contract

The safe registration profile projection includes `discoverable` with an
explicit false default and zero-default pin, wish, and plan counts, matching
the browser account contract. A successful create must not be reported as a
failed registration after durable provisioning. The delete/recreate regression
test passes the actual recreated service response through the browser client
validator; it proves the released handle can be accepted by both boundaries.
This correction passed the delete/recreate and browser-response contract
regressions and was deployed to the existing staging API as Worker version
`b5b3674c-6219-4053-b024-7cb65cd4e539` on 2026-11-20. Its health endpoint
returned HTTP 200 after deployment. A new live account was not created as
part of that verification; no account data migration or wipe was performed.

`POST /v1/beta/register` requires all of these controls before storage is
accessed:

- an access token already accepted by the Phase 2A verifier;
- the additional `write:my-atlas` permission;
- an exact allowlisted browser Origin when Origin is present;
- JSON no larger than 8 KiB with no unknown fields;
- a UUID `Idempotency-Key` header;
- a bounded high-entropy invitation format;
- a normalized nonreserved handle and bounded plain display name;
- explicit terms and privacy acceptance;
- a bounded Turnstile token validated server side for the configured action
  and hostname.

The server selects the configured policy versions. The browser cannot choose a
version or supply a user ID. The verified Auth0 issuer and subject are the only
identity input. Expected registration conflicts return generic responses and
do not reveal invitation state.

There is deliberately no unauthenticated invitation-check endpoint.

## Protected operator contract

The local Worker exposes four administration operations. Every operation first
requires the ordinary API access-token checks and the additional
`admin:my-atlas` permission:

- `POST /v1/admin/invitations` issues a bounded invitation;
- `POST /v1/admin/invitations/revoke` revokes it using a nonsecret invitation
  ID;
- `GET /v1/admin/registrations/pending` returns at most 100 safe pending
  summaries and an opaque-to-the-user cursor;
- `POST /v1/admin/registrations/{userId}/reconcile` explicitly completes or
  releases one pending registration.

Invitation issue, revocation, and reconciliation mutations require a UUID
`Idempotency-Key`. Issue derives a high-entropy code from a server-only
generation secret and the operator-qualified operation digest. This permits a
lost response to be retried with the same key and return the same code without
ever storing that raw code. Only the peppered code digest, nonsecret invitation
ID, limits, status, and audit digests are durable. A changed issue request under
the same key conflicts. The raw code is returned only by the issue response.

Server configuration caps invitation uses and lifetime. Tracked configuration
does not set those policy values or the generation and hashing secrets, so the
real issue route fails closed. There is no public invitation enumeration or
validity endpoint.

## Idempotent provisioning saga

Registration follows the accepted cross-object saga:

1. Hash the raw invitation with a server-only pepper. Hash the qualified
   identity and identity-qualified idempotency key.
2. Atomically reserve the invitation use, identity and normalized handle in the
   single registry object, producing a pending immutable user ID.
3. Initialize the user object only if absent. The first profile is active but
   private, has revision 1, and records the server-selected policy versions.
4. Atomically finalize the registry claim. The invitation moves from reserved
   to used exactly once.
5. A retry with the same identity, idempotency key and request returns the same
   user and profile. A changed request under that key is rejected.

Raw invitation codes, Auth0 tokens and Turnstile tokens are never sent to
Durable Object storage or returned by registration responses. The protected
issue response is the deliberate one-time invitation-code handoff. Public
profile responses also omit the stored qualified identity and its digest.

## Pending-registration recovery

Recovery has two explicit modes:

1. `complete` inspects the authoritative user object. It finalizes the registry
   only when an existing profile exactly matches the reserved identity, user,
   handle, display name, and accepted policy versions.
2. `release` is rejected until the configured pending lease has elapsed. The
   user object must first atomically prove that no profile exists and write a
   provisioning tombstone. Only then may the registry release the invitation
   reservation and identity and handle claims while retaining an abandoned
   operation tombstone.

Writing the user tombstone first closes the cross-object race: initialization
cannot succeed after release has started. If the process stops between the two
objects, the same operator action can safely retry and finish the registry
release. A release never deletes or overwrites an initialized profile.

## Verification boundary

The Workers Vitest integration runs the actual Worker module, RPC methods and
SQLite-backed Durable Object storage in `workerd`. Verified cases include:

- twelve concurrent identities racing for one invitation produce one pending
  claim and eleven rejections;
- identity and handle uniqueness;
- changed-payload idempotency conflict;
- finalization consumes the reserved invitation exactly once;
- retry returns the original user ID without duplicate state;
- a new profile is private, active and revision 1;
- another identity cannot read the profile;
- state survives Durable Object eviction;
- stored registry data contains the invitation digest but not its raw code;
- a repeated operator issue returns the same invitation without storing the
  code, and revocation uses only the nonsecret invitation ID;
- the pending index paginates with a hard limit;
- recovery refuses an active lease or initialized profile, completes a matching
  profile, releases an aged absent profile, and blocks late initialization.

The Node HTTP suite separately verifies authentication, write permission,
request normalization, request-size rejection, fail-closed missing
configuration, generic responses, and server-side Turnstile action and hostname
checking.

## Deliberately incomplete

Tracked configuration omits all real invitation secrets and beta identities.
Staging declares technical-only policy labels `staging-beta-1` and
`staging-privacy-1`, one use per invitation, a 24-hour maximum invitation
lifetime, and a 15-minute pending-registration lease. These values support
controlled owner testing and are not approved public-beta policy. The
owner reports the server-only invitation pepper, generation secret, and
Turnstile secret installed in staging. Their names were verified through
Wrangler, while their values correctly remain unreadable. A dedicated M2M
client has `read:my-atlas` and `admin:my-atlas`. The owner reported a successful
one-use invitation response and kept its raw code private. The browser has an
authenticated invitation form, explicit staging acceptance, and a real
Turnstile widget. The first live lookup exposed a missing
`registration_not_found` to HTTP 404 translation. That correction is covered by
the Node HTTP suite and deployed to staging. The owner then completed end-to-end
redemption and entered the private account. Persisted pin verification remains.

Phase 2B still needs an approved registration and operator rate-limit policy,
handle change, account deletion, reporting, and the production catalog API.
Revisioned display, visibility, pin CRUD, and export are documented in the
account-state architecture. The Auth0 API grants `admin:my-atlas` only to the
dedicated owner operator client. Opt-in public sharing and the staging backend
now exist, but profile-specific server HTML and production deployment remain
later slices.
