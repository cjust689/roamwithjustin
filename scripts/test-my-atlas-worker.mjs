import assert from "node:assert/strict"
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose"
import {
  createMyAtlasPin,
  createMyAtlasWish,
  deleteMyAtlasAccount,
  deleteMyAtlasPin,
  fetchMyAtlasAccountExport,
  fetchMyAtlasPlanning,
  fetchPublicAtlas,
  fetchMyAtlasState,
  markMyAtlasPlanVisited,
  registerMyAtlasAccount,
  updateMyAtlasPin,
  updateMyAtlasSharing,
  verifyMyAtlasApiAccess,
} from "../src/features/my-atlas/api/client.mjs"
import { getMyAtlasApiBaseUrl } from "../src/features/my-atlas/config/api.mjs"
import { getMyAtlasTurnstileSiteKey } from "../src/features/my-atlas/config/turnstile.mjs"
import {
  atlasTimelineSequence,
  atlasStats,
  curvedConnectionCoordinates,
  decorativeConnections,
  formatVisitedDate,
  placesForYear,
  placesThroughTimelineStep,
  placesThroughYear,
} from "../src/features/my-atlas/catalog/atlasInsights.mjs"
import { restoreAuth0Session } from "../src/features/my-atlas/auth/session.mjs"
import { AccountConflictError } from "../workers/my-atlas/src/account/service.mjs"
import { handleRequest } from "../workers/my-atlas/src/index.mjs"
import { verifyTurnstile } from "../workers/my-atlas/src/registration/turnstile.mjs"
import { PublicAtlasNotFoundError } from "../workers/my-atlas/src/public/service.mjs"

const ISSUER = "https://roamwithjustin.us.auth0.com/"
const AUDIENCE = "https://api.roamwithjustin.com"
const CLIENT_ID = "test-spa-client-id"
const SUBJECT = "google-oauth2|owner-test"
const ALLOWED_ORIGIN = "http://localhost:8080"

const environment = Object.freeze({
  AUTH0_ISSUER: ISSUER,
  AUTH0_AUDIENCE: AUDIENCE,
  AUTH0_REQUIRED_PERMISSIONS: "read:my-atlas",
  ALLOWED_ORIGINS: `${ALLOWED_ORIGIN},http://127.0.0.1:8080`,
})

const now = Math.floor(Date.now() / 1000)
const { publicKey, privateKey } = await generateKeyPair("RS256", {
  extractable: true,
})
const publicJwk = await exportJWK(publicKey)
publicJwk.alg = "RS256"
publicJwk.kid = "phase-2a-test-key"
publicJwk.use = "sig"
const localJwks = createLocalJWKSet({ keys: [publicJwk] })

async function signToken({
  issuer = ISSUER,
  audience = AUDIENCE,
  subject = SUBJECT,
  scope = "read:my-atlas write:my-atlas",
  permissions,
  issuedAt = now,
  expirationTime = now + 300,
  type = "at+jwt",
} = {}) {
  const payload = {}
  if (scope !== undefined) payload.scope = scope
  if (permissions !== undefined) payload.permissions = permissions

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid, typ: type })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expirationTime)
    .sign(privateKey)
}

function workerRequest(
  path,
  {
    method = "GET",
    origin,
    token,
    json,
    idempotencyKey,
    ifMatch,
    cfConnectingIp,
  } = {}
) {
  const headers = new Headers()
  if (origin) headers.set("Origin", origin)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey)
  if (ifMatch) headers.set("If-Match", ifMatch)
  if (cfConnectingIp) headers.set("CF-Connecting-IP", cfConnectingIp)
  if (json !== undefined) headers.set("Content-Type", "application/json")
  return new Request(`http://worker.test${path}`, {
    method,
    headers,
    body: json === undefined ? undefined : JSON.stringify(json),
  })
}

async function workerResponse(
  path,
  options = {},
  overrides = {},
  dependencyOverrides = {}
) {
  return handleRequest(
    workerRequest(path, options),
    {
      ...environment,
      ...overrides,
    },
    { jwks: localJwks, ...dependencyOverrides }
  )
}

async function readJson(response) {
  return JSON.parse(await response.text())
}

{
  const response = await workerResponse("/health")
  assert.equal(response.status, 200)
  assert.deepEqual(await readJson(response), {
    service: "roamwithjustin-my-atlas-api",
    status: "ok",
    phase: "2c",
  })
  assert.equal(response.headers.get("Cache-Control"), "no-store")
}

{
  const publicAtlas = {
    schemaVersion: 1,
    atlas: {
      handle: "justin-travels",
      displayName: "Justin Traveler",
      places: [
        {
          placeId: "geonames:3621138",
          placeType: "city",
          name: "Uvita",
          countryName: "Costa Rica",
          coordinates: [-83.7395, 9.17039],
          visitedYears: [2024],
          memory: "The tide revealed the whale tail.",
        },
        {
          placeId: "geonames:5843642",
          placeType: "spot",
          name: "Yellowstone National Park",
          spotCategory: "national-park",
          spotKind: "National park",
          countryCode: "US",
          countryName: "United States",
          coordinates: [-110.58846, 44.42796],
          visitedYears: [2025],
        },
        {
          placeId: "custom:abcdef1234567890abcdef12",
          placeType: "custom",
          name: "York Minster",
          coordinates: [-1.0819, 53.9623],
          visitedYears: [2022],
        },
      ],
    },
    catalog: {
      revision: "fixture-2026-11-16",
      attribution: { provider: "GeoNames", license: "CC BY 4.0" },
    },
  }
  const response = await workerResponse(
    "/v1/public/atlases/justin-travels",
    {},
    {},
    {
      getPublicAtlas: async options => {
        assert.equal(options.handle, "justin-travels")
        return publicAtlas
      },
    }
  )
  assert.equal(response.status, 200)
  assert.deepEqual(await readJson(response), publicAtlas)
  assert.equal(response.headers.get("Cache-Control"), "no-store")

  const missing = await workerResponse(
    "/v1/public/atlases/private-owner",
    {},
    {},
    {
      getPublicAtlas: async () => {
        throw new PublicAtlasNotFoundError()
      },
    }
  )
  assert.equal(missing.status, 404)
  assert.equal((await readJson(missing)).error, "atlas_not_found")
}

{
  const response = await workerResponse(
    "/v1/public/atlases/justin-travels",
    { cfConnectingIp: "192.0.2.10" },
    {},
    {
      publicRateLimiter: {
        async limit(input) {
          assert.deepEqual(input, {
            key: "public-atlas:192.0.2.10",
            delta: 1,
          })
          return { success: false }
        },
      },
    }
  )
  assert.equal(response.status, 429)
  assert.equal(response.headers.get("Retry-After"), "60")
  assert.equal((await readJson(response)).error, "rate_limited")
}

{
  const placeCatalog = {
    async search(query, options) {
      assert.equal(query, "Uvita")
      assert.equal(options.limit, 5)
      return {
        catalogRevision: "fixture-2026-11-16",
        attribution: { provider: "GeoNames", license: "CC BY 4.0" },
        results: [{ placeId: "geonames:3621138", name: "Uvita" }],
      }
    },
  }
  const response = await workerResponse(
    "/v1/places/search?q=Uvita&limit=5",
    { cfConnectingIp: "192.0.2.10" },
    {},
    {
      placeCatalog,
      publicRateLimiter: {
        async limit(input) {
          assert.deepEqual(input, { key: "catalog:192.0.2.10", delta: 2 })
          return { success: true }
        },
      },
    }
  )
  assert.equal(response.status, 200)
  assert.equal((await readJson(response)).results[0].name, "Uvita")
}

{
  const place = {
    placeId: "geonames:3621138",
    name: "Uvita",
    deprecated: false,
  }
  const placeCatalog = {
    async resolve(placeId) {
      assert.equal(placeId, place.placeId)
      return place
    },
    async manifest() {
      return {
        catalogRevision: "fixture-2026-11-16",
        attribution: { provider: "GeoNames", license: "CC BY 4.0" },
      }
    },
  }
  const response = await workerResponse(
    `/v1/places/${place.placeId}`,
    {},
    {},
    { placeCatalog }
  )
  assert.equal(response.status, 200)
  assert.deepEqual((await readJson(response)).place, place)
}

{
  const response = await workerResponse("/v1/places/search?q=Uvita")
  assert.equal(response.status, 500)
  assert.equal((await readJson(response)).error, "service_configuration_error")
}

{
  const response = await workerResponse("/v1/auth/check", {
    method: "OPTIONS",
    origin: ALLOWED_ORIGIN,
  })
  assert.equal(response.status, 204)
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    ALLOWED_ORIGIN
  )
  assert.match(
    response.headers.get("Access-Control-Allow-Headers"),
    /authorization/
  )
  assert.match(
    response.headers.get("Access-Control-Allow-Headers"),
    /idempotency-key/
  )
  assert.match(response.headers.get("Access-Control-Allow-Headers"), /if-match/)
  assert.match(response.headers.get("Access-Control-Allow-Methods"), /POST/)
  assert.match(response.headers.get("Access-Control-Allow-Methods"), /PATCH/)
}

{
  const response = await workerResponse("/health", {
    origin: "https://attacker.example",
  })
  assert.equal(response.status, 403)
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null)
}

{
  const response = await workerResponse("/v1/auth/check", {
    origin: ALLOWED_ORIGIN,
  })
  assert.equal(response.status, 401)
  assert.match(response.headers.get("WWW-Authenticate"), /invalid_token/)
}

{
  const token = await signToken()
  const response = await workerResponse("/v1/auth/check", {
    origin: ALLOWED_ORIGIN,
    token,
  })
  assert.equal(response.status, 200)
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    ALLOWED_ORIGIN
  )
  const rawBody = await response.text()
  const body = JSON.parse(rawBody)
  assert.equal(body.authenticated, true)
  assert.deepEqual(body.identity, { issuer: ISSUER, subject: SUBJECT })
  assert.deepEqual(body.permissions, ["read:my-atlas", "write:my-atlas"])
  assert.equal(rawBody.includes(token), false)
}

{
  const token = await signToken({
    scope: undefined,
    permissions: ["read:my-atlas"],
  })
  const response = await workerResponse("/v1/auth/check", { token })
  assert.equal(response.status, 200)
}

for (const token of [
  await signToken({ audience: CLIENT_ID }),
  await signToken({ audience: "https://other-api.example" }),
  await signToken({ issuer: "https://other-tenant.example/" }),
  await signToken({ issuedAt: now - 600, expirationTime: now - 300 }),
  await signToken({ type: "ID" }),
]) {
  const response = await workerResponse("/v1/auth/check", { token })
  assert.equal(response.status, 401)
}

{
  const unsignedHeader = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" })
  ).toString("base64url")
  const unsignedPayload = Buffer.from(
    JSON.stringify({
      iss: ISSUER,
      aud: AUDIENCE,
      sub: SUBJECT,
      iat: now,
      exp: now + 300,
      scope: "read:my-atlas",
    })
  ).toString("base64url")
  const response = await workerResponse("/v1/auth/check", {
    token: `${unsignedHeader}.${unsignedPayload}.`,
  })
  assert.equal(response.status, 401)
}

{
  const secret = new TextEncoder().encode(
    "a-test-secret-that-is-at-least-32-bytes"
  )
  const token = await new SignJWT({ scope: "read:my-atlas" })
    .setProtectedHeader({ alg: "HS256", typ: "at+jwt" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(SUBJECT)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(secret)
  const response = await workerResponse("/v1/auth/check", { token })
  assert.equal(response.status, 401)
}

{
  const token = await signToken({ scope: "write:my-atlas" })
  const response = await workerResponse("/v1/auth/check", { token })
  assert.equal(response.status, 403)
  assert.match(response.headers.get("WWW-Authenticate"), /insufficient_scope/)
}

{
  const response = await workerResponse("/v1/beta/register", {
    method: "POST",
    origin: ALLOWED_ORIGIN,
  })
  assert.equal(response.status, 401)
}

{
  const invalidToken = await signToken({ audience: "https://wrong.example" })
  assert.equal(
    (
      await workerResponse("/v1/beta/register", {
        method: "POST",
        token: invalidToken,
      })
    ).status,
    401
  )
  assert.equal(
    (
      await workerResponse("/v1/admin/invitations", {
        method: "POST",
        token: invalidToken,
      })
    ).status,
    401
  )
  assert.equal(
    (await workerResponse("/v1/me", { token: invalidToken })).status,
    401
  )
}

{
  const token = await signToken()
  const response = await workerResponse("/v1/admin/invitations", {
    method: "POST",
    token,
    idempotencyKey: "77777777-7777-4777-8777-777777777777",
    json: {
      maxUses: 1,
      expiresAt: "2026-11-17T16:30:00.000Z",
    },
  })
  assert.equal(response.status, 403)
}

{
  const token = await signToken({
    scope: "read:my-atlas admin:my-atlas",
  })
  const entries = []
  const response = await workerResponse(
    "/v1/admin/invitations",
    {
      method: "POST",
      token,
      idempotencyKey: "88888888-8888-4888-8888-888888888888",
      json: {
        maxUses: 1,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    },
    { MY_ATLAS_LOG_CONFIGURATION_ERRORS: "true" },
    { configurationErrorLogger: entry => entries.push(JSON.parse(entry)) }
  )
  assert.equal(response.status, 500)
  assert.equal(entries.length, 1)
  assert.deepEqual(entries[0], {
    event: "service_configuration_error",
    requestId: response.headers.get("X-Request-Id"),
    errorName: "RegistrationConfigurationError",
    message: "INVITE_HASH_PEPPER must be supplied as a secret.",
  })
}

{
  const token = await signToken({
    scope: "read:my-atlas admin:my-atlas",
  })
  let captured
  const response = await workerResponse(
    "/v1/admin/invitations",
    {
      method: "POST",
      token,
      idempotencyKey: "77777777-7777-4777-8777-777777777777",
      json: {
        maxUses: 1,
        expiresAt: "2026-11-17T16:30:00.000Z",
      },
    },
    {},
    {
      issueBetaInvitation: async options => {
        captured = options
        return {
          created: true,
          invitation: {
            id: "inv_1234567890abcdef12345678",
            code: "beta_operator_generated_secret_code_1234567890",
            status: "active",
            maxUses: 1,
            used: 0,
            reserved: 0,
            createdAt: "2026-11-16T16:30:00.000Z",
            expiresAt: "2026-11-17T16:30:00.000Z",
          },
        }
      },
    }
  )
  assert.equal(response.status, 201)
  assert.deepEqual(captured.identity, { issuer: ISSUER, subject: SUBJECT })
  assert.equal(captured.input.maxUses, 1)
  assert.equal(
    captured.input.idempotencyKey,
    "77777777-7777-4777-8777-777777777777"
  )
  assert.equal((await readJson(response)).invitation.status, "active")
}

{
  const token = await signToken({
    scope: "read:my-atlas admin:my-atlas",
  })
  const response = await workerResponse(
    "/v1/admin/registrations/pending?limit=10",
    { token },
    {},
    {
      listPendingRegistrations: async options => {
        assert.deepEqual(options.input, { limit: 10, cursor: "" })
        return {
          registrations: [
            {
              userId: "usr_88888888-8888-4888-8888-888888888888",
              handle: "pending-traveler",
              displayName: "Pending Traveler",
              createdAt: "2026-11-16T16:30:00.000Z",
              updatedAt: "2026-11-16T16:30:00.000Z",
            },
          ],
          nextCursor: null,
        }
      },
    }
  )
  assert.equal(response.status, 200)
  assert.equal((await readJson(response)).registrations.length, 1)
}

{
  const token = await signToken({
    scope: "read:my-atlas admin:my-atlas",
  })
  const userId = "usr_88888888-8888-4888-8888-888888888888"
  let captured
  const response = await workerResponse(
    `/v1/admin/registrations/${userId}/reconcile`,
    {
      method: "POST",
      token,
      idempotencyKey: "99999999-9999-4999-8999-999999999999",
      json: { mode: "complete" },
    },
    {},
    {
      reconcilePendingRegistration: async options => {
        captured = options
        return { state: "active", idempotent: false }
      },
    }
  )
  assert.equal(response.status, 200)
  assert.equal(captured.input.userId, userId)
  assert.equal(captured.input.mode, "complete")
  assert.deepEqual(await readJson(response), {
    reconciled: true,
    state: "active",
    idempotent: false,
  })
}

{
  const token = await signToken({ scope: "read:my-atlas" })
  const response = await workerResponse(
    "/v1/me",
    { token },
    {},
    {
      getMyProfile: async options => {
        assert.deepEqual(options.identity, {
          issuer: ISSUER,
          subject: SUBJECT,
        })
        return {
          profile: {
            userId: "usr_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            handle: "owner",
            displayName: "Owner",
            public: false,
            status: "active",
            pinCount: 0,
            revision: 1,
          },
        }
      },
    }
  )
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("ETag"), '"rev-1"')
  assert.equal((await readJson(response)).profile.public, false)
}

{
  const token = await signToken({ scope: "read:my-atlas" })
  const response = await workerResponse(
    "/v1/me/atlas",
    { token },
    {},
    {
      publicRateLimiter: {
        async limit() {
          throw new Error("Owner state must not use the public limiter")
        },
      },
      getMyAtlasState: async options => {
        assert.deepEqual(options.identity, {
          issuer: ISSUER,
          subject: SUBJECT,
        })
        return {
          profile: {
            handle: "owner",
            displayName: "Owner",
            public: false,
            pinCount: 1,
            revision: 2,
          },
          pins: [
            {
              pinId: "pin_1234567890abcdef12345678",
              placeId: "geonames:3621138",
              placeType: "city",
              name: "Uvita",
              countryName: "Costa Rica",
              coordinates: [-83.7395, 9.17039],
              visitedYears: [2024],
            },
          ],
        }
      },
    }
  )
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("ETag"), '"rev-2"')
  assert.equal((await readJson(response)).pins[0].name, "Uvita")
}

{
  const token = await signToken({ scope: "read:my-atlas" })
  const response = await workerResponse(
    "/v1/me/atlas",
    { token },
    {},
    {
      getMyAtlasState: async () => {
        throw new AccountConflictError("registration_not_found")
      },
    }
  )
  assert.equal(response.status, 404)
  assert.equal((await readJson(response)).error, "not_found")
}

for (const [internalCode, status, publicCode] of [
  ["duplicate_wish", 409, "duplicate_wish"],
  ["wish_limit_reached", 409, "wishlist_limit_reached"],
  ["place_unavailable", 409, "place_unavailable"],
  ["invalid_wish", 400, "invalid_request"],
]) {
  const token = await signToken()
  const response = await workerResponse(
    "/v1/me/bucket-list",
    {
      method: "POST",
      token,
      idempotencyKey: "edededed-eded-4ded-8ded-edededededed",
      ifMatch: '"rev-1"',
      json: { placeId: "geonames:3621138", priority: "normal" },
    },
    {},
    {
      createMyWish: async () => {
        throw new AccountConflictError(internalCode)
      },
    }
  )
  assert.equal(response.status, status)
  assert.equal((await readJson(response)).error, publicCode)
}

{
  const token = await signToken({ scope: "read:my-atlas" })
  const response = await workerResponse("/v1/me", {
    method: "PATCH",
    token,
    idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ifMatch: '"rev-1"',
    json: { public: true },
  })
  assert.equal(response.status, 403)
}

{
  const token = await signToken()
  let captured
  const pinId = "pin_1234567890abcdef12345678"
  const response = await workerResponse(
    `/v1/me/pins/${pinId}`,
    {
      method: "DELETE",
      token,
      idempotencyKey: "abababab-abab-4bab-8bab-abababababab",
      ifMatch: '"rev-2"',
    },
    {},
    {
      deleteMyPin: async options => {
        captured = options
        return { profile: { revision: 3 } }
      },
    }
  )
  assert.equal(response.status, 200)
  assert.deepEqual(captured.identity, { issuer: ISSUER, subject: SUBJECT })
  assert.deepEqual(captured.input, {
    pinId,
    expectedRevision: 2,
    idempotencyKey: "abababab-abab-4bab-8bab-abababababab",
  })
  assert.equal(Object.hasOwn(captured, "userId"), false)
}

{
  const token = await signToken({ scope: "read:my-atlas" })
  const response = await workerResponse(
    "/v1/me/pins/pin_1234567890abcdef12345678",
    {
      method: "DELETE",
      token,
      idempotencyKey: "acacacac-acac-4cac-8cac-acacacacacac",
      ifMatch: '"rev-2"',
    },
    {},
    {
      deleteMyPin: async () => {
        throw new Error("Read-only tokens must not reach deletion.")
      },
    }
  )
  assert.equal(response.status, 403)
}

{
  const token = await signToken()
  const userId = "usr_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  assert.equal(
    (await workerResponse(`/v1/users/${userId}/pins`, { token })).status,
    404
  )
  const response = await workerResponse(
    "/v1/me/pins",
    {
      method: "POST",
      token,
      idempotencyKey: "adadadad-adad-4dad-8dad-adadadadadad",
      ifMatch: '"rev-1"',
      json: {
        userId,
        placeId: "geonames:3621138",
        visitedDates: [],
      },
    },
    {},
    {
      createMyPin: async () => {
        throw new Error("User-selected ownership must be rejected.")
      },
    }
  )
  assert.equal(response.status, 400)
}

{
  const token = await signToken()
  let captured
  const response = await workerResponse(
    "/v1/me/pins",
    {
      method: "POST",
      token,
      origin: ALLOWED_ORIGIN,
      idempotencyKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ifMatch: '"rev-1"',
      json: {
        placeId: "geonames:3621138",
        visitedDates: [{ year: 2024, month: 3 }, { year: 2026 }],
        memory: "  Watching the tide\nreshape the whale tail.  ",
      },
    },
    {},
    {
      createMyPin: async options => {
        captured = options
        return {
          created: true,
          profile: { revision: 2 },
          pin: {
            pinId: "pin_1234567890abcdef12345678",
            placeId: "geonames:3621138",
            visitedDates: [{ year: 2024, month: 3 }, { year: 2026 }],
            visitedYears: [2024, 2026],
            memory: "Watching the tide reshape the whale tail.",
          },
        }
      },
      catalogResolver: async placeId => ({ placeId }),
    }
  )
  assert.equal(response.status, 201)
  assert.equal(response.headers.get("ETag"), '"rev-2"')
  assert.match(response.headers.get("Access-Control-Expose-Headers"), /ETag/)
  assert.equal(captured.input.expectedRevision, 1)
  assert.deepEqual(captured.input.visitedYears, [2024, 2026])
  assert.deepEqual(captured.input.visitedDates, [
    { year: 2024, month: 3 },
    { year: 2026 },
  ])
  assert.equal(
    captured.input.memory,
    "Watching the tide reshape the whale tail."
  )
}

{
  const token = await signToken()
  let captured
  const response = await workerResponse(
    "/v1/me/pins",
    {
      method: "POST",
      token,
      origin: ALLOWED_ORIGIN,
      idempotencyKey: "bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc",
      ifMatch: '"rev-4"',
      json: {
        customPlace: {
          name: "  Krka   National Park  ",
          coordinates: [15.9721704, 43.8012304],
        },
        visitedDates: [{ year: 2025 }],
      },
    },
    {},
    {
      createMyPin: async options => {
        captured = options
        return {
          created: true,
          profile: { revision: 5 },
          pin: {
            pinId: "pin_abcdef1234567890abcdef12",
            placeId: "custom:abcdef1234567890abcdef12",
            placeType: "custom",
            name: "Krka National Park",
            coordinates: [15.97217, 43.80123],
            visitedDates: [{ year: 2025 }],
            visitedYears: [2025],
            memory: "",
          },
        }
      },
    }
  )
  assert.equal(response.status, 201)
  assert.deepEqual(captured.input.customPlace, {
    name: "Krka National Park",
    coordinates: [15.97217, 43.80123],
  })
  assert.equal(Object.hasOwn(captured.input, "placeId"), false)
}

{
  const token = await signToken()
  let called = false
  const response = await workerResponse(
    "/v1/me/pins",
    {
      method: "POST",
      token,
      idempotencyKey: "bdbdbdbd-bdbd-4bdb-8bdb-bdbdbdbdbdbd",
      ifMatch: '"rev-1"',
      json: {
        placeId: "geonames:3621138",
        customPlace: { name: "Uvita", coordinates: [-83.7395, 9.17039] },
      },
    },
    {},
    {
      createMyPin: async () => {
        called = true
      },
    }
  )
  assert.equal(response.status, 400)
  assert.equal(called, false)
}

for (const memory of [
  "a".repeat(256),
  "<img src=x onerror=alert(1)>",
  "direction\u202Eoverride",
]) {
  const token = await signToken()
  let called = false
  const response = await workerResponse(
    "/v1/me/pins",
    {
      method: "POST",
      token,
      idempotencyKey: crypto.randomUUID(),
      ifMatch: '"rev-1"',
      json: {
        placeId: "geonames:3621138",
        visitedDates: [],
        memory,
      },
    },
    {},
    {
      createMyPin: async () => {
        called = true
        throw new Error("Invalid memory must not reach the account service.")
      },
    }
  )
  assert.equal(response.status, 400)
  assert.equal(called, false)
}

{
  const token = await signToken({ scope: "read:my-atlas" })
  const response = await workerResponse(
    "/v1/me/export?format=csv",
    { token },
    {},
    {
      exportMyAtlas: async () => ({
        schemaVersion: 1,
        exportedAt: "2026-11-16T17:00:00.000Z",
        profile: { revision: 3 },
        pins: [
          {
            pinId: "pin_1234567890abcdef12345678",
            placeId: "geonames:3621138",
            visitedYears: [2024, 2026],
            memory: '=HYPERLINK("https://example.invalid","open")',
          },
          {
            pinId: "pin_abcdef1234567890abcdef12",
            placeId: "custom:abcdef1234567890abcdef12",
            customPlace: {
              name: "=Unsafe custom title",
              coordinates: [-109.88016, 38.32687],
            },
            visitedYears: [2025],
            memory: "",
          },
        ],
      }),
    }
  )
  assert.equal(response.status, 200)
  assert.match(response.headers.get("Content-Type"), /text\/csv/)
  const csv = await response.text()
  assert.match(
    csv,
    /pinId,placeId,customName,longitude,latitude,visitedYears,visitedDates,memory/
  )
  assert.match(csv, /geonames:3621138/)
  assert.match(csv, /custom:abcdef1234567890abcdef12/)
  assert.match(csv, /,'=Unsafe custom title,/)
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.invalid""/)
}

{
  const token = await signToken({ scope: "read:my-atlas" })
  const response = await workerResponse("/v1/beta/register", {
    method: "POST",
    token,
  })
  assert.equal(response.status, 403)
}

{
  const token = await signToken()
  const idempotencyKey = "11111111-1111-4111-8111-111111111111"
  let captured
  const registrationService = async options => {
    captured = options
    return {
      created: true,
      profile: {
        schemaVersion: 1,
        userId: "usr_22222222-2222-4222-8222-222222222222",
        handle: "justin-travels",
        displayName: "Justin Traveler",
        public: false,
        status: "active",
        revision: 1,
      },
    }
  }
  const response = await workerResponse(
    "/v1/beta/register",
    {
      method: "POST",
      origin: ALLOWED_ORIGIN,
      token,
      idempotencyKey,
      json: {
        inviteCode: "test_invitation_code_1234567890",
        handle: "Justin-Travels",
        displayName: "  Justin   Traveler ",
        turnstileToken: "opaque-turnstile-token",
        acceptTerms: true,
        acceptPrivacy: true,
      },
    },
    {},
    { registrationService }
  )
  assert.equal(response.status, 201)
  assert.deepEqual(captured.identity, { issuer: ISSUER, subject: SUBJECT })
  assert.equal(captured.input.handle, "justin-travels")
  assert.equal(captured.input.displayName, "Justin Traveler")
  assert.equal(captured.input.idempotencyKey, idempotencyKey)
  const rawBody = await response.text()
  assert.equal(rawBody.includes(token), false)
  assert.equal(rawBody.includes("test_invitation_code"), false)
  assert.equal(JSON.parse(rawBody).profile.public, false)
}

{
  const token = await signToken()
  const response = await workerResponse(
    "/v1/beta/register",
    {
      method: "POST",
      token,
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      json: { handle: "missing-required-fields" },
    },
    {},
    {
      registrationService: async () => {
        throw new Error("The service must not be called for invalid input.")
      },
    }
  )
  assert.equal(response.status, 400)
}

{
  const token = await signToken()
  const response = await workerResponse("/v1/beta/register", {
    method: "POST",
    token,
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    json: {
      inviteCode: "test_invitation_code_1234567890",
      handle: "justin-travels",
      displayName: "Justin Traveler",
      turnstileToken: "opaque-turnstile-token",
      acceptTerms: true,
      acceptPrivacy: true,
    },
  })
  assert.equal(response.status, 500)
  assert.deepEqual(await readJson(response), {
    error: "service_configuration_error",
    requestId: response.headers.get("X-Request-Id"),
  })
}

{
  const token = await signToken()
  const response = await handleRequest(
    new Request("http://worker.test/v1/beta/register", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "11111111-1111-4111-8111-111111111111",
      },
      body: JSON.stringify({
        inviteCode: "a".repeat(9000),
        handle: "justin-travels",
        displayName: "Justin Traveler",
        turnstileToken: "opaque-turnstile-token",
        acceptTerms: true,
        acceptPrivacy: true,
      }),
    }),
    environment,
    {
      jwks: localJwks,
      registrationService: async () => {
        throw new Error("Oversized input reached the registration service.")
      },
    }
  )
  assert.equal(response.status, 400)
}

{
  const token = await signToken()
  const response = await handleRequest(
    workerRequest("/v1/auth/check", { token }),
    { ...environment, AUTH0_AUDIENCE: "" },
    { jwks: localJwks }
  )
  assert.equal(response.status, 500)
}

{
  const response = await handleRequest(
    workerRequest("/health", { origin: "https://public.example" }),
    {
      ...environment,
      ALLOWED_ORIGINS: "https://public.example",
    }
  )
  assert.equal(response.status, 200)
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://public.example"
  )

  const invalid = await handleRequest(workerRequest("/health"), {
    ...environment,
    ALLOWED_ORIGINS: "http://public.example",
  })
  assert.equal(invalid.status, 500)
}

{
  const token = await signToken()
  const unavailableJwks = async () => {
    const error = new Error("JWKS timed out")
    error.code = "ERR_JWKS_TIMEOUT"
    throw error
  }
  const response = await handleRequest(
    workerRequest("/v1/auth/check", { token }),
    environment,
    { jwks: unavailableJwks }
  )
  assert.equal(response.status, 503)
}

assert.equal((await workerResponse("/missing")).status, 404)
assert.equal((await workerResponse("/health", { method: "POST" })).status, 405)
assert.equal(
  (await workerResponse("/v1/places/search?q=Uvita", { method: "POST" }))
    .status,
  405
)
assert.equal(
  (await workerResponse("/v1/auth/check", { method: "POST" })).status,
  405
)
assert.equal(
  (await workerResponse("/v1/beta/register", { method: "GET" })).status,
  405
)
assert.equal(
  (await workerResponse("/v1/admin/invitations", { method: "GET" })).status,
  405
)

assert.equal(getMyAtlasApiBaseUrl({}, ALLOWED_ORIGIN), "")
assert.equal(
  getMyAtlasApiBaseUrl(
    { VUE_APP_MY_ATLAS_API_URL: "http://127.0.0.1:8787/" },
    ALLOWED_ORIGIN
  ),
  "http://127.0.0.1:8787"
)
assert.throws(
  () =>
    getMyAtlasApiBaseUrl(
      { VUE_APP_MY_ATLAS_API_URL: "http://api.example.com" },
      ALLOWED_ORIGIN
    ),
  /HTTPS/
)
assert.equal(getMyAtlasTurnstileSiteKey({}), "")
assert.equal(
  getMyAtlasTurnstileSiteKey({
    VUE_APP_MY_ATLAS_TURNSTILE_SITEKEY: "public-site-key",
  }),
  "public-site-key"
)
assert.throws(
  () =>
    getMyAtlasTurnstileSiteKey({
      VUE_APP_MY_ATLAS_TURNSTILE_SITEKEY: "invalid site key",
    }),
  /invalid/
)

{
  let capturedUrl = ""
  let capturedOptions
  const identity = await verifyMyAtlasApiAccess({
    apiBaseUrl: "http://127.0.0.1:8787",
    accessToken: "opaque-access-token",
    fetchImpl: async (url, options) => {
      capturedUrl = url
      capturedOptions = options
      return new Response(
        JSON.stringify({
          authenticated: true,
          identity: { issuer: ISSUER, subject: SUBJECT },
          permissions: ["read:my-atlas"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    },
  })

  assert.equal(capturedUrl, "http://127.0.0.1:8787/v1/auth/check")
  assert.equal(
    capturedOptions.headers.Authorization,
    "Bearer opaque-access-token"
  )
  assert.equal(identity.subject, SUBJECT)
}

await assert.rejects(
  verifyMyAtlasApiAccess({
    apiBaseUrl: "http://127.0.0.1:8787",
    accessToken: "rejected-token",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          error: "unauthorized",
          requestId: "request-auth-rejected",
        }),
        { status: 401 }
      ),
  }),
  error =>
    error.status === 401 &&
    error.code === "unauthorized" &&
    error.requestId === "request-auth-rejected"
)

{
  let capturedUrl = ""
  let capturedOptions
  const registration = {
    inviteCode: "one_use_invitation_code_1234567890",
    handle: "justin-travels",
    displayName: "Justin Traveler",
    turnstileToken: "opaque-turnstile-token",
    acceptTerms: true,
    acceptPrivacy: true,
  }
  const profile = await registerMyAtlasAccount({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    registration,
    fetchImpl: async (url, options) => {
      capturedUrl = url
      capturedOptions = options
      return new Response(
        JSON.stringify({
          registered: true,
          profile: {
            handle: "justin-travels",
            displayName: "Justin Traveler",
            public: false,
            status: "active",
            revision: 1,
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    },
  })
  assert.equal(capturedUrl, "https://api.example.com/v1/beta/register")
  assert.equal(capturedOptions.method, "POST")
  assert.equal(
    capturedOptions.headers.get("Authorization"),
    "Bearer owner-token"
  )
  assert.match(
    capturedOptions.headers.get("Idempotency-Key"),
    /^[0-9a-f-]{36}$/
  )
  assert.deepEqual(JSON.parse(capturedOptions.body), registration)
  assert.equal(profile.revision, 1)
}

{
  const responseBody = {
    schemaVersion: 1,
    atlas: {
      handle: "justin-travels",
      displayName: "Justin Traveler",
      places: [
        {
          placeId: "geonames:3621138",
          placeType: "city",
          name: "Uvita",
          countryName: "Costa Rica",
          coordinates: [-83.7395, 9.17039],
          visitedYears: [2024],
          memory: "The tide revealed the whale tail.",
        },
        {
          placeId: "geonames:5843642",
          placeType: "spot",
          name: "Yellowstone National Park",
          spotCategory: "national-park",
          spotKind: "National park",
          countryCode: "US",
          countryName: "United States",
          coordinates: [-110.58846, 44.42796],
          visitedYears: [2025],
        },
        {
          placeId: "custom:abcdef1234567890abcdef12",
          placeType: "custom",
          name: "York Minster",
          coordinates: [-1.0819, 53.9623],
          visitedYears: [2022],
        },
      ],
    },
    catalog: {
      revision: "fixture-2026-11-16",
      attribution: { provider: "GeoNames", license: "CC BY 4.0" },
    },
  }
  let capturedUrl = ""
  const atlas = await fetchPublicAtlas({
    apiBaseUrl: "https://api.example.com",
    handle: "justin-travels",
    fetchImpl: async url => {
      capturedUrl = url
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    },
  })
  assert.equal(
    capturedUrl,
    "https://api.example.com/v1/public/atlases/justin-travels"
  )
  assert.equal(atlas.places[0].name, "Uvita")
  assert.equal(atlas.places[0].memory, "The tide revealed the whale tail.")
  assert.equal(atlas.places[1].spotKind, "National park")
  assert.equal(atlas.places[2].placeType, "custom")
}

{
  const pin = {
    pinId: "pin_1234567890abcdef12345678",
    placeId: "geonames:3621138",
    placeType: "city",
    name: "Uvita",
    countryName: "Costa Rica",
    coordinates: [-83.7395, 9.17039],
    visitedYears: [2024],
    memory: "The tide revealed the whale tail.",
  }
  const state = await fetchMyAtlasState({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.example.com/v1/me/atlas")
      assert.equal(options.headers.get("Authorization"), "Bearer owner-token")
      return new Response(
        JSON.stringify({
          profile: {
            handle: "justin-travels",
            displayName: "Justin Traveler",
            public: false,
            pinCount: 1,
            revision: 2,
          },
          pins: [pin],
        }),
        { status: 200, headers: { ETag: '"rev-2"' } }
      )
    },
  })
  assert.equal(state.profile.revision, 2)
  assert.equal(state.pins[0].name, "Uvita")
  assert.equal(state.pins[0].memory, "The tide revealed the whale tail.")

  const created = await createMyAtlasPin({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    placeId: "geonames:3621138",
    memory: "A sunrise over the whale tail.",
    revision: 2,
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers.get("If-Match"), '"rev-2"')
      assert.match(options.headers.get("Idempotency-Key"), /^[0-9a-f-]{36}$/)
      assert.deepEqual(JSON.parse(options.body), {
        placeId: "geonames:3621138",
        visitedDates: [],
        memory: "A sunrise over the whale tail.",
      })
      return new Response(
        JSON.stringify({
          pin: {
            ...pin,
            visitedYears: [],
            visitedDates: [],
            memory: "A sunrise over the whale tail.",
          },
        }),
        { status: 201, headers: { ETag: '"rev-3"' } }
      )
    },
  })
  assert.equal(created.revision, 3)

  const customCreated = await createMyAtlasPin({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    customPlace: {
      name: "  Canyonlands   National Park ",
      coordinates: [-109.8801604, 38.3268704],
    },
    visitedDates: [{ year: 2025 }],
    revision: 3,
    fetchImpl: async (_url, options) => {
      assert.deepEqual(JSON.parse(options.body), {
        customPlace: {
          name: "Canyonlands National Park",
          coordinates: [-109.88016, 38.32687],
        },
        visitedDates: [{ year: 2025 }],
        memory: "",
      })
      return new Response(
        JSON.stringify({
          pin: {
            pinId: "pin_abcdef1234567890abcdef12",
            placeId: "custom:abcdef1234567890abcdef12",
            placeType: "custom",
            name: "Canyonlands National Park",
            coordinates: [-109.88016, 38.32687],
            visitedDates: [{ year: 2025 }],
            visitedYears: [2025],
            memory: "",
          },
        }),
        { status: 201, headers: { ETag: '"rev-4"' } }
      )
    },
  })
  assert.equal(customCreated.revision, 4)
  assert.equal(customCreated.pin.placeType, "custom")

  const updated = await updateMyAtlasPin({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    pinId: pin.pinId,
    visitedDates: [{ year: 2024, month: 6 }],
    memory: "Horses crossing the beach at low tide.",
    revision: 3,
    fetchImpl: async (_url, options) => {
      assert.equal(options.method, "PATCH")
      assert.equal(options.headers.get("If-Match"), '"rev-3"')
      assert.deepEqual(JSON.parse(options.body), {
        visitedDates: [{ year: 2024, month: 6 }],
        memory: "Horses crossing the beach at low tide.",
      })
      return new Response(
        JSON.stringify({
          pin: {
            pinId: pin.pinId,
            placeId: pin.placeId,
            visitedYears: [2024],
            visitedDates: [{ year: 2024, month: 6 }],
            memory: "Horses crossing the beach at low tide.",
          },
        }),
        { status: 200, headers: { ETag: '"rev-4"' } }
      )
    },
  })
  assert.equal(updated.revision, 4)
  assert.equal(updated.pin.visitedDates[0].month, 6)
  assert.equal(updated.pin.memory, "Horses crossing the beach at low tide.")

  const published = await updateMyAtlasSharing({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    public: true,
    revision: 4,
    fetchImpl: async (_url, options) => {
      assert.deepEqual(JSON.parse(options.body), { public: true })
      return new Response(
        JSON.stringify({
          profile: {
            handle: "justin-travels",
            displayName: "Justin Traveler",
            public: true,
            revision: 5,
          },
        }),
        { status: 200, headers: { ETag: '"rev-5"' } }
      )
    },
  })
  assert.equal(published.public, true)
  assert.equal(published.revision, 5)

  const deletedRevision = await deleteMyAtlasPin({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    pinId: pin.pinId,
    revision: 5,
    fetchImpl: async (_url, options) => {
      assert.equal(options.method, "DELETE")
      return new Response(JSON.stringify({ deleted: true }), {
        status: 200,
        headers: { ETag: '"rev-6"' },
      })
    },
  })
  assert.equal(deletedRevision, 6)
}

{
  let called = false
  await assert.rejects(
    () =>
      createMyAtlasPin({
        apiBaseUrl: "https://api.example.com",
        accessToken: "owner-token",
        placeId: "geonames:3621138",
        memory: "<script>alert(1)</script>",
        revision: 1,
        fetchImpl: async () => {
          called = true
          throw new Error("Unsafe memory must not be sent.")
        },
      }),
    error => error.code === "invalid_memory"
  )
  assert.equal(called, false)
}

for (const customPlace of [
  { name: "York <Minster>", coordinates: [-1.0827, 53.9619] },
  { name: "Arches National Park", coordinates: [-109.6, 91] },
]) {
  let called = false
  await assert.rejects(
    () =>
      createMyAtlasPin({
        apiBaseUrl: "https://api.example.com",
        accessToken: "owner-token",
        customPlace,
        revision: 1,
        fetchImpl: async () => {
          called = true
          throw new Error("Unsafe custom place must not be sent.")
        },
      }),
    error => error.code === "invalid_custom_place"
  )
  assert.equal(called, false)
}

{
  const accepted = await verifyTurnstile({
    token: "opaque-turnstile-token",
    secret: "server-only-secret",
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    remoteIp: "192.0.2.1",
    expectedAction: "my-atlas-register",
    expectedHostnames: ["localhost"],
    fetchImpl: async (url, options) => {
      assert.equal(
        url,
        "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      )
      assert.equal(options.body.get("secret"), "server-only-secret")
      assert.equal(options.body.get("response"), "opaque-turnstile-token")
      assert.equal(options.body.get("remoteip"), "192.0.2.1")
      return new Response(
        JSON.stringify({
          success: true,
          action: "my-atlas-register",
          hostname: "localhost",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    },
  })
  assert.equal(accepted, true)
}

assert.equal(
  await verifyTurnstile({
    token: "opaque-turnstile-token",
    secret: "server-only-secret",
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    expectedAction: "my-atlas-register",
    expectedHostnames: ["localhost"],
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          success: true,
          action: "wrong-action",
          hostname: "localhost",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ),
  }),
  false
)

{
  let checked = 0
  await restoreAuth0Session({
    async checkSession() {
      checked += 1
    },
  })
  assert.equal(checked, 1)
  await restoreAuth0Session({
    async checkSession() {
      throw Object.assign(new Error("login required"), {
        error: "login_required",
      })
    },
  })
  await assert.rejects(
    restoreAuth0Session({
      async checkSession() {
        throw new Error("network failure")
      },
    }),
    /network failure/
  )
}

{
  const places = [
    {
      placeId: "geonames:3621138",
      placeType: "city",
      name: "Uvita",
      countryCode: "CR",
      continent: "NA",
      coordinates: [-83.7395, 9.17039],
      visitedDates: [{ year: 2024, month: 3 }],
    },
    {
      placeId: "geonames:2988507",
      placeType: "city",
      name: "Paris",
      countryCode: "FR",
      continent: "EU",
      featureCode: "PPLC",
      coordinates: [2.3488, 48.85341],
      visitedDates: [{ year: 2026 }],
    },
    {
      placeId: "iso-country:US",
      placeType: "country",
      name: "United States",
      countryCode: "US",
      continent: "NA",
      coordinates: [-77.03637, 38.89511],
      visitedDates: [],
    },
  ]
  assert.deepEqual(atlasStats(places), {
    places: 3,
    cities: 2,
    spots: 0,
    countries: 3,
    continents: 2,
    capitals: 1,
    undated: 1,
    firstYear: 2024,
    latestYear: 2026,
    spanMiles: atlasStats(places).spanMiles,
  })
  assert.equal(
    atlasStats([
      ...places,
      {
        placeId: "geonames:5843642",
        placeType: "spot",
        name: "Yellowstone National Park",
        countryCode: "US",
        continent: "NA",
        coordinates: [-110.58846, 44.42796],
        visitedDates: [{ year: 2025 }],
      },
    ]).spots,
    1
  )
  assert.equal(placesForYear(places, "2024")[0].name, "Uvita")
  assert.equal(formatVisitedDate({ year: 2024, month: 3 }), "2024")
  assert.equal(placesForYear(places, "undated")[0].name, "United States")
  assert.equal(placesThroughYear(places, 2025).length, 1)
  assert.equal(decorativeConnections(places).length, 2)
  const sequence = atlasTimelineSequence(places)
  assert.deepEqual(
    sequence.map(entry => [entry.place.name, entry.year]),
    [
      ["Uvita", 2024],
      ["Paris", 2026],
    ]
  )
  assert.deepEqual(
    placesThroughTimelineStep(sequence, 1).map(place => place.name),
    ["Uvita", "Paris"]
  )
  const flight = curvedConnectionCoordinates(
    places[0].coordinates,
    places[1].coordinates,
    25
  )
  assert.equal(flight.length, 25)
  assert.deepEqual(flight[0], places[0].coordinates)
  assert.ok(
    Math.abs(flight[flight.length - 1][0] - places[1].coordinates[0]) < 1e-9
  )
  assert.ok(
    Math.abs(flight[flight.length - 1][1] - places[1].coordinates[1]) < 1e-9
  )
}

{
  const token = await signToken()
  let captured
  const response = await workerResponse(
    "/v1/me/bucket-list",
    {
      method: "POST",
      token,
      idempotencyKey: "30303030-3030-4030-8030-303030303030",
      ifMatch: '"rev-4"',
      json: {
        placeId: "geonames:3621138",
        note: "Return for the whale tail.",
        priority: "high",
        desiredYear: new Date().getUTCFullYear() + 1,
      },
    },
    {},
    {
      createMyWish: async options => {
        captured = options
        return {
          created: true,
          profile: { revision: 5 },
          wish: {
            wishId: "wish_1234567890abcdef12345678",
            placeId: "geonames:3621138",
          },
        }
      },
    }
  )
  assert.equal(response.status, 201)
  assert.equal(response.headers.get("ETag"), '"rev-5"')
  assert.equal(captured.input.expectedRevision, 4)
  assert.equal(captured.input.priority, "high")
  assert.deepEqual(captured.identity, { issuer: ISSUER, subject: SUBJECT })
}

{
  const token = await signToken()
  let captured
  const response = await workerResponse(
    "/v1/me/trip-plans/plan_1234567890abcdef12345678/visited",
    {
      method: "POST",
      token,
      idempotencyKey: "33333333-3434-4343-8343-343434343434",
      ifMatch: '"rev-5"',
      json: {
        visits: [
          {
            stopIndex: 1,
            visitedDates: [{ year: 2025, month: 2 }],
            memory: "Snow over the red rock.",
          },
        ],
      },
    },
    {},
    {
      markMyPlanVisited: async options => {
        captured = options
        return {
          created: true,
          profile: { revision: 6 },
          pins: [
            {
              pinId: "pin_1234567890abcdef12345678",
              placeId: "geonames:5556144",
              placeType: "spot",
              name: "Arches National Park",
              countryCode: "US",
              countryName: "United States",
              coordinates: [-109.5925, 38.7225],
              visitedDates: [{ year: 2025, month: 2 }],
              visitedYears: [2025],
              memory: "Snow over the red rock.",
            },
          ],
        }
      },
    }
  )
  assert.equal(response.status, 201)
  assert.equal(response.headers.get("ETag"), '"rev-6"')
  assert.equal(captured.input.planId, "plan_1234567890abcdef12345678")
  assert.deepEqual(captured.input.visits[0], {
    stopIndex: 1,
    visitedDates: [{ year: 2025, month: 2 }],
    visitedYears: [2025],
    memory: "Snow over the red rock.",
  })
}

{
  const token = await signToken()
  let captured
  const response = await workerResponse(
    "/v1/me",
    {
      method: "DELETE",
      token,
      idempotencyKey: "31313131-3131-4131-8131-313131313131",
      ifMatch: '"rev-7"',
      json: { confirmation: "DELETE MY ATLAS" },
    },
    {},
    {
      deleteMyAccount: async options => {
        captured = options
        return {
          deleted: true,
          idempotent: false,
          deletedAt: "2026-11-17T15:00:00.000Z",
        }
      },
    }
  )
  assert.equal(response.status, 200)
  assert.equal((await readJson(response)).deleted, true)
  assert.deepEqual(captured.input, {
    confirmation: "DELETE MY ATLAS",
    expectedRevision: 7,
    idempotencyKey: "31313131-3131-4131-8131-313131313131",
  })
}

{
  const token = await signToken({ scope: "read:my-atlas" })
  const response = await workerResponse(
    "/v1/me",
    {
      method: "DELETE",
      token,
      idempotencyKey: "32323232-3232-4232-8232-323232323232",
      ifMatch: '"rev-1"',
      json: { confirmation: "DELETE MY ATLAS" },
    },
    {},
    {
      deleteMyAccount: async () => {
        throw new Error("Read-only access must not reach account deletion.")
      },
    }
  )
  assert.equal(response.status, 403)
}

{
  const calls = []
  const state = await fetchMyAtlasPlanning({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    fetchImpl: async url => {
      calls.push(url)
      return url.includes("bucket-list")
        ? new Response(
            JSON.stringify({
              wishes: [
                {
                  wishId: "wish_1234567890abcdef12345678",
                  placeId: "geonames:3621138",
                  name: "Uvita",
                },
              ],
              nextCursor: null,
            }),
            { status: 200, headers: { ETag: '"rev-4"' } }
          )
        : new Response(JSON.stringify({ plans: [] }), {
            status: 200,
            headers: { ETag: '"rev-4"' },
          })
    },
  })
  assert.equal(state.revision, 4)
  assert.equal(state.wishes[0].name, "Uvita")
  assert.equal(calls.length, 2)

  const partialState = await fetchMyAtlasPlanning({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    allowPartial: true,
    fetchImpl: async url =>
      url.includes("bucket-list")
        ? new Response(
            JSON.stringify({
              wishes: [
                {
                  wishId: "wish_1234567890abcdef12345678",
                  placeId: "geonames:3621138",
                  name: "Uvita",
                },
              ],
            }),
            { status: 200, headers: { ETag: '"rev-4"' } }
          )
        : new Response(
            JSON.stringify({
              error: "account_conflict",
              requestId: "plan-load-123",
            }),
            {
              status: 409,
              headers: { "X-Request-Id": "plan-load-123" },
            }
          ),
  })
  assert.equal(partialState.revision, 4)
  assert.equal(partialState.wishes[0].name, "Uvita")
  assert.deepEqual(partialState.plans, [])
  assert.equal(partialState.planError.code, "account_conflict")
  assert.equal(partialState.planError.requestId, "plan-load-123")

  const created = await createMyAtlasWish({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    value: { placeId: "geonames:3621138", priority: "normal" },
    revision: 4,
    fetchImpl: async (_url, options) => {
      assert.equal(options.method, "POST")
      assert.equal(options.headers.get("If-Match"), '"rev-4"')
      return new Response(
        JSON.stringify({
          wish: {
            wishId: "wish_1234567890abcdef12345678",
            placeId: "geonames:3621138",
          },
        }),
        { status: 201, headers: { ETag: '"rev-5"' } }
      )
    },
  })
  assert.equal(created.revision, 5)

  const marked = await markMyAtlasPlanVisited({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    planId: "plan_1234567890abcdef12345678",
    visits: [{ stopIndex: 0, visitedDates: [{ year: 2025 }], memory: "" }],
    revision: 5,
    fetchImpl: async (url, options) => {
      assert.equal(
        url,
        "https://api.example.com/v1/me/trip-plans/plan_1234567890abcdef12345678/visited"
      )
      assert.equal(options.headers.get("If-Match"), '"rev-5"')
      assert.equal(options.method, "POST")
      return new Response(
        JSON.stringify({
          pins: [
            {
              pinId: "pin_1234567890abcdef12345678",
              placeId: "geonames:5556144",
              placeType: "spot",
              name: "Arches National Park",
              countryCode: "US",
              countryName: "United States",
              coordinates: [-109.5925, 38.7225],
              visitedDates: [{ year: 2025 }],
              visitedYears: [2025],
              memory: "",
            },
          ],
        }),
        { status: 201, headers: { ETag: '"rev-6"' } }
      )
    },
  })
  assert.equal(marked.revision, 6)
  assert.equal(marked.pins[0].name, "Arches National Park")

  const exported = await fetchMyAtlasAccountExport({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          schemaVersion: 2,
          profile: {},
          pins: [],
          wishlist: [],
          plans: [],
        }),
        { status: 200, headers: { ETag: '"rev-5"' } }
      ),
  })
  assert.equal(exported.schemaVersion, 2)

  let deletionHeaders
  await deleteMyAtlasAccount({
    apiBaseUrl: "https://api.example.com",
    accessToken: "owner-token",
    revision: 5,
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
    fetchImpl: async (_url, options) => {
      deletionHeaders = options.headers
      return new Response(
        JSON.stringify({
          deleted: true,
          deletedAt: "2026-11-17T15:00:00.000Z",
        }),
        { status: 200 }
      )
    },
  })
  assert.equal(deletionHeaders.get("If-Match"), '"rev-5"')
  assert.equal(
    deletionHeaders.get("Idempotency-Key"),
    "33333333-3333-4333-8333-333333333333"
  )
}

console.log("My Atlas Worker, sharing, and planning boundary tests passed.")
