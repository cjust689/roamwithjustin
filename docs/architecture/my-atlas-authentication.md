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
---

# My Atlas Auth0 browser authentication

This document describes the implemented browser authentication slice and its
connection to the local Phase 2A token-validation API. It does not claim that
My Atlas membership, invitations, persisted profiles, or a production route
exists. The Worker boundary is detailed in the linked My Atlas local API
authentication architecture.

## Runtime boundary

My Atlas uses the framework-neutral `@auth0/auth0-spa-js` SDK because the site
is on Vue 2. The SDK is instantiated only from the environment-gated My Atlas
route. The normal repository and GitHub Pages production build does not enable
that route.

The browser configuration is supplied through these public build variables:

- `VUE_APP_MY_ATLAS_AUTH0_DOMAIN`
- `VUE_APP_MY_ATLAS_AUTH0_CLIENT_ID`
- `VUE_APP_MY_ATLAS_AUTH0_AUDIENCE`
- `VUE_APP_MY_ATLAS_API_URL`

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
this slice. Logout returns to `/my-atlas` on the current origin.

## Access-token boundary

`getMyAtlasApiAccessToken` calls `getTokenSilently` with the exact configured
API audience, scope and callback origin. The proof UI does not treat token
acquisition as API authorization. It sends the token to the local isolated
Worker and reports success only after the Worker cryptographically validates
the signature, issuer, exact audience, expiration, algorithm and
`read:my-atlas` permission.

The browser does not display, decode, log, or persist the token. The Worker
rejects ID-token and other audiences. Google login and a valid API token still
do not create My Atlas membership; invite redemption and identity binding
remain future server responsibilities.

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
audience-scoped token acquisition. This is owner-verified external evidence;
no token was exposed to the implementation process. The updated verification
button now performs the protected Worker request. Its complete round trip with
the owner's genuine token remains owner verification. The production
application does not enable or deploy the My Atlas route or Worker.
