---
id: my-atlas-authentication
title: My Atlas Auth0 Browser Authentication
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-16
updated: 2026-11-16
related:
  - my-atlas-api-authentication
  - my-atlas-geography
  - my-atlas-private-beta
  - my-atlas-private-beta-implementation
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - package.json
  - src/features/my-atlas/auth/auth0.js
  - src/features/my-atlas/auth/session.mjs
  - src/features/my-atlas/api/client.mjs
  - src/features/my-atlas/config/auth0.mjs
  - src/features/my-atlas/config/api.mjs
  - src/features/my-atlas/routes.js
  - src/features/my-atlas/views/MyAtlasAuthCallback.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - scripts/test-my-atlas-place-catalog.mjs
  - .env.example
  - .github/workflows/editorial-publication-ci.yml
  - .github/workflows/deploy-pages.yml
verification:
  state: verified
  evidence:
    - npm run my-atlas:test
    - npm run my-atlas:worker:test
    - npm run my-atlas:worker:check
    - npx eslint "src/features/my-atlas/**/*.{js,mjs,vue}" src/router/index.js "scripts/my-atlas/**/*.mjs" scripts/test-my-atlas-place-catalog.mjs
    - npm run build
    - Noninteractive Auth0 authorization checks accepted the configured local and production callbacks and returned login_required
    - A noninteractive Auth0 connection check redirected the configured SPA to accounts.google.com
    - Owner reported successful Google sign in, callback return, and audience-scoped API access verification in the local browser proof
    - npm run my-atlas:test verified checkSession restoration and login_required handling while retaining the memory-only token cache
    - Pull requests 51 and 52 passed validation and deployed the controlled frontend through Pages run 43969999089
    - Headless Chrome rendered the production My Atlas heading, Google sign-in section, and product branding
    - The staging Worker returned 200 health and Uvita search with Access-Control-Allow-Origin for https://roamwithjustin.com
---

# My Atlas Auth0 browser authentication

This document describes the implemented browser authentication slice and its
connection to the isolated Phase 2A token-validation API. Invitation-backed
membership, a persisted private owner profile, and one Uvita pin are verified
in staging by owner report. The Pages workflows now accept explicit repository
variables for a controlled production frontend release. The API remains on the
isolated staging Worker and no apex Worker route exists. The Worker boundary is
detailed in the linked My Atlas API authentication architecture.

## Runtime boundary

My Atlas uses the framework-neutral `@auth0/auth0-spa-js` SDK because the site
is on Vue 2. The SDK is instantiated only from the environment-gated My Atlas
route. The route stays absent when `MY_ATLAS_ENABLED` is unset or false. The
validation and Pages workflows map explicit repository variables into the
public browser build when a controlled beta release is authorized.

The browser configuration is supplied through these public build variables:

- `VUE_APP_MY_ATLAS_AUTH0_DOMAIN`
- `VUE_APP_MY_ATLAS_AUTH0_CLIENT_ID`
- `VUE_APP_MY_ATLAS_AUTH0_AUDIENCE`
- `VUE_APP_MY_ATLAS_API_URL`
- `VUE_APP_MY_ATLAS_PLACE_SEARCH_URL`
- `VUE_APP_MY_ATLAS_TURNSTILE_SITEKEY`

No client secret belongs in the browser or repository. The owner values are in
an ignored development-only environment file on the owner's workstation. The
tracked `.env.example` contains placeholders only.

## Login and callback flow

The client uses Authorization Code Flow with PKCE through Auth0 Universal Login
and selects the `google-oauth2` connection. The authorization request includes
the exact API audience and these scopes:

```text
openid profile email read:my-atlas write:my-atlas
```

The callback is derived from the current origin as `/my-atlas/callback`. The
callback component completes the SDK transaction, restricts `appState.returnTo`
to `/my-atlas`, removes the authorization response through router replacement,
and reports a generic user-facing failure without logging tokens.

The SDK cache is memory-only and rotating refresh tokens are not enabled in
this slice. On application initialization, `checkSession` restores the Auth0
browser session when the tenant cookie is still available. A normal
`login_required` response leaves the visitor signed out without surfacing an
error. This avoids persisting an access token while allowing a page reload to
restore the signed-in state. Logout returns to `/my-atlas` on the current
origin.

## Access-token boundary

`getMyAtlasApiAccessToken` calls `getTokenSilently` with the exact configured
API audience, scope and callback origin. The proof UI does not treat token
acquisition as API authorization. It sends the token to the local isolated
Worker and reports success only after the Worker cryptographically validates
the signature, issuer, exact audience, expiration, algorithm and
`read:my-atlas` permission.

The browser does not display, decode, log, or persist the token. The Worker
rejects ID-token and other audiences. Google login and a valid API token do not
create My Atlas membership by themselves. The separate registration boundary
requires one-use invitation redemption, Turnstile validation, and qualified
identity binding before owner state is available.

## External configuration evidence

The supplied Auth0 tenant discovery document returned HTTP 200 with issuer
`https://roamwithjustin.us.auth0.com/` and a JWKS endpoint. Noninteractive PKCE
authorization requests using the supplied SPA client and exact API audience
were accepted for both configured callbacks:

- `http://localhost:8080/my-atlas/callback`
- `https://roamwithjustin.com/my-atlas/callback`

Both returned the expected `login_required` response to their callback when
sent with `prompt=none`, which verifies the tenant, SPA client, audience,
scopes, and callback allowlist without authenticating a user. Interactive
Google routing was separately checked with the configured connection and
redirected to `accounts.google.com`. The owner then reported successful Google
sign in, return through the local callback, signed-in identity display, and the
audience-scoped token acquisition and protected Worker round trip. This is
owner-verified external evidence; no token was exposed to the implementation
process. Silent restoration after reload is implemented and test verified but
still needs owner verification against the live tenant session. The controlled
Pages route is deployed and rendered verified. Direct deep links still use the
GitHub Pages fallback and therefore retain the known HTTP 404 and crawler
limitation even though the browser application renders. The Worker remains the
separately deployed staging service.
