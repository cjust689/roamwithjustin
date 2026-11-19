import {
  InsufficientPermissionsError,
  WorkerConfigurationError,
  isJwksAvailabilityError,
  readAuthConfiguration,
  verifyAccessToken,
} from "./auth.mjs"
import {
  RegistrationConfigurationError,
  RegistrationValidationError,
  normalizeRegistrationInput,
} from "./registration/contracts.mjs"
import {
  RegistrationServiceError,
  RegistrationUnavailableError,
  registerBetaAccount,
} from "./registration/service.mjs"
import {
  OperatorConflictError,
  OperatorServiceError,
  issueBetaInvitation,
  listPendingRegistrations,
  normalizeIssueInvitationInput,
  normalizePendingQuery,
  normalizeReconciliationInput,
  normalizeRevokeInvitationInput,
  reconcilePendingRegistration,
  revokeBetaInvitation,
} from "./registration/operator.mjs"
import {
  formatRevisionEtag,
  normalizeCreatePin,
  normalizeDeletePin,
  normalizeExportQuery,
  normalizePatchPin,
  normalizePinQuery,
  normalizeProfilePatch,
} from "./account/contracts.mjs"
import {
  AccountConflictError,
  AccountServiceError,
  createMyPin,
  deleteMyAccount,
  deleteMyPin,
  exportMyAtlas,
  getMyAtlasState,
  getMyProfile,
  listMyPins,
  updateMyPin,
  updateMyProfile,
} from "./account/service.mjs"
import {
  normalizeCreatePlan,
  normalizeCreateWish,
  normalizeDeleteAccount,
  normalizeDeleteWish,
  normalizeMarkPlanVisited,
  normalizePatchWish,
  normalizePlanMutation,
  normalizeReplacePlan,
  normalizeWishQuery,
} from "./planning/contracts.mjs"
import {
  createMyPlan,
  createMyWish,
  deleteMyPlan,
  deleteMyWish,
  keepMyPlan,
  listMyPlans,
  listMyWishes,
  markMyPlanVisited,
  replaceMyPlan,
  updateMyWish,
} from "./planning/service.mjs"
import {
  CatalogConfigurationError,
  CatalogUnavailableError,
  CatalogValidationError,
  WorkerPlaceCatalog,
} from "./catalog/store.mjs"
import {
  PublicAtlasNotFoundError,
  PublicAtlasServiceError,
  getPublicAtlas,
} from "./public/service.mjs"

const SERVICE_NAME = "roamwithjustin-my-atlas-api"

function parseAllowedOrigins(value) {
  let allowedOrigins

  try {
    allowedOrigins = new Set(
      (typeof value === "string" ? value : "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean)
        .map(origin => {
          const parsed = new URL(origin)
          const localHttp =
            parsed.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(parsed.hostname)
          if (
            parsed.origin !== origin ||
            (parsed.protocol !== "https:" && !localHttp)
          ) {
            throw new WorkerConfigurationError(
              "ALLOWED_ORIGINS must contain exact HTTPS origins or local loopback HTTP origins."
            )
          }
          return origin
        })
    )
  } catch (error) {
    if (error instanceof WorkerConfigurationError) throw error
    throw new WorkerConfigurationError("ALLOWED_ORIGINS is invalid.")
  }

  if (allowedOrigins.size === 0) {
    throw new WorkerConfigurationError("ALLOWED_ORIGINS cannot be empty.")
  }

  return allowedOrigins
}

function requestOrigin(request) {
  return request.headers.get("Origin")?.trim() || ""
}

function responseHeaders({
  origin = "",
  allowedOrigins,
  requestId,
  authenticate,
}) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
    Vary: "Origin",
  })

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin)
    headers.set("Access-Control-Expose-Headers", "ETag, X-Request-Id")
  }
  if (authenticate) headers.set("WWW-Authenticate", authenticate)

  return headers
}

function jsonResponse(body, status, context, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders({ ...context, ...extra }),
  })
}

function accountJsonResponse(body, status, context, revision) {
  const response = jsonResponse(body, status, context)
  if (revision) response.headers.set("ETag", formatRevisionEtag(revision))
  return response
}

function csvCell(value) {
  const text = String(value ?? "")
  const safeText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safeText)
    ? `"${safeText.replaceAll('"', '""')}"`
    : safeText
}

function exportCsv(result, context) {
  const rows = [
    "pinId,placeId,customName,longitude,latitude,visitedYears,visitedDates,memory",
  ]
  for (const pin of result.pins) {
    const visitedDates = Array.isArray(pin.visitedDates)
      ? pin.visitedDates
      : pin.visitedYears.map(year => ({ year }))
    rows.push(
      [
        pin.pinId,
        pin.placeId,
        pin.customPlace?.name || "",
        pin.customPlace?.coordinates?.[0] ?? "",
        pin.customPlace?.coordinates?.[1] ?? "",
        pin.visitedYears.join("|"),
        visitedDates
          .map(date =>
            date.month
              ? `${date.year}-${String(date.month).padStart(2, "0")}`
              : String(date.year)
          )
          .join("|"),
        pin.memory || "",
      ]
        .map(csvCell)
        .join(",")
    )
  }
  const headers = responseHeaders(context)
  headers.set("Content-Type", "text/csv; charset=utf-8")
  headers.set(
    "Content-Disposition",
    'attachment; filename="my-atlas-export.csv"'
  )
  return new Response(`${rows.join("\r\n")}\r\n`, { status: 200, headers })
}

function errorResponse(status, code, context, authenticate) {
  return jsonResponse(
    { error: code, requestId: context.requestId },
    status,
    context,
    { authenticate }
  )
}

function logConfigurationError({
  error,
  requestId,
  environment,
  dependencies,
}) {
  if (environment.MY_ATLAS_LOG_CONFIGURATION_ERRORS !== "true") return
  const entry = Object.freeze({
    event: "service_configuration_error",
    requestId,
    errorName: error.name,
    message: error.message,
  })
  const logger =
    dependencies.configurationErrorLogger || (value => console.error(value))
  logger(JSON.stringify(entry))
}

async function publicReadRateLimit({
  request,
  environment,
  dependencies,
  context,
  scope,
  weight = 1,
}) {
  const limiter =
    dependencies.publicRateLimiter || environment.MY_ATLAS_PUBLIC_RATE_LIMITER
  if (!limiter) return null
  if (typeof limiter.limit !== "function") {
    return errorResponse(500, "service_configuration_error", context)
  }
  try {
    const clientAddress = request.headers.get("CF-Connecting-IP") || "unknown"
    const clientKey = `${scope}:${clientAddress}`
    const result = await limiter.limit({ key: clientKey, delta: weight })
    if (result?.success === true) return null
    const response = errorResponse(429, "rate_limited", context)
    response.headers.set("Retry-After", "60")
    return response
  } catch {
    return errorResponse(503, "rate_limit_unavailable", context)
  }
}

function extractBearerToken(request) {
  const authorization = request.headers.get("Authorization") || ""
  const match = authorization.match(/^Bearer ([^\s]+)$/i)
  return match ? match[1] : ""
}

function newRequestId() {
  return crypto.randomUUID()
}

function bearerChallenge(error, description = "") {
  const parts = [`Bearer realm="${SERVICE_NAME}"`, `error="${error}"`]
  if (description) parts.push(`error_description="${description}"`)
  return parts.join(", ")
}

async function readJsonBody(request) {
  const contentType = request.headers.get("Content-Type") || ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new RegistrationValidationError("The request must use JSON.")
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0)
  if (Number.isFinite(contentLength) && contentLength > 8192) {
    throw new RegistrationValidationError("Registration request is too large.")
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > 8192) {
    throw new RegistrationValidationError("Registration request is too large.")
  }

  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw new RegistrationValidationError("Registration JSON is invalid.")
  }

  return body
}

async function readRegistrationBody(request) {
  return normalizeRegistrationInput(
    await readJsonBody(request),
    request.headers.get("Idempotency-Key")
  )
}

async function catalogResponse({
  url,
  environment,
  dependencies,
  context,
  placeId,
}) {
  try {
    const catalog =
      dependencies.placeCatalog || new WorkerPlaceCatalog(environment)
    if (placeId) {
      const place = await catalog.resolve(placeId)
      if (!place) return errorResponse(404, "place_not_found", context)
      const manifest = await catalog.manifest()
      return jsonResponse(
        {
          catalogRevision: manifest.catalogRevision,
          attribution: manifest.attribution,
          place,
        },
        200,
        context
      )
    }

    for (const key of url.searchParams.keys()) {
      if (!["q", "limit"].includes(key)) {
        throw new CatalogValidationError(
          "Place search contains unknown fields."
        )
      }
    }
    const limit = Number(url.searchParams.get("limit") || 8)
    const result = await catalog.search(url.searchParams.get("q") || "", {
      limit,
    })
    return jsonResponse(result, 200, context)
  } catch (error) {
    if (error instanceof CatalogValidationError) {
      return errorResponse(400, "invalid_place_query", context)
    }
    if (error instanceof CatalogConfigurationError) {
      return errorResponse(500, "service_configuration_error", context)
    }
    if (error instanceof CatalogUnavailableError) {
      return errorResponse(503, "catalog_unavailable", context)
    }
    return errorResponse(503, "catalog_unavailable", context)
  }
}

export async function handleRequest(
  request,
  environment = {},
  dependencies = {}
) {
  const origin = requestOrigin(request)
  const requestId = newRequestId()
  let allowedOrigins

  try {
    allowedOrigins = parseAllowedOrigins(environment.ALLOWED_ORIGINS)
  } catch (error) {
    if (error instanceof WorkerConfigurationError) {
      logConfigurationError({
        error,
        requestId,
        environment,
        dependencies,
      })
      return errorResponse(500, "service_configuration_error", {
        origin: "",
        allowedOrigins: new Set(),
        requestId,
      })
    }
    throw error
  }

  const context = { origin, allowedOrigins, requestId }

  if (origin && !allowedOrigins.has(origin)) {
    return errorResponse(403, "origin_not_allowed", context)
  }

  const url = new URL(request.url)

  if (request.method === "OPTIONS") {
    const headers = responseHeaders(context)
    headers.delete("Content-Type")
    headers.set(
      "Access-Control-Allow-Headers",
      "authorization, content-type, idempotency-key, if-match"
    )
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS"
    )
    headers.set("Access-Control-Max-Age", "600")
    return new Response(null, { status: 204, headers })
  }

  if (url.pathname === "/health") {
    if (request.method !== "GET") {
      return errorResponse(405, "method_not_allowed", context)
    }
    return jsonResponse(
      { service: SERVICE_NAME, status: "ok", phase: "2c" },
      200,
      context
    )
  }

  const isPlaceSearch = url.pathname === "/v1/places/search"
  const placeResolveMatch = url.pathname.match(
    /^\/v1\/places\/((?:iso-country:[A-Z]{2})|(?:geonames:[1-9][0-9]{0,11})|(?:park:(?:us:nps|ca:pca|mx:conanp):[a-z0-9-]+))$/
  )
  if (isPlaceSearch || placeResolveMatch) {
    if (request.method !== "GET") {
      return errorResponse(405, "method_not_allowed", context)
    }
    const limited = await publicReadRateLimit({
      request,
      environment,
      dependencies,
      context,
      scope: "catalog",
      weight: isPlaceSearch ? 2 : 1,
    })
    if (limited) return limited
    return catalogResponse({
      url,
      environment,
      dependencies,
      context,
      placeId: placeResolveMatch?.[1] || "",
    })
  }

  const publicAtlasMatch = url.pathname.match(
    /^\/v1\/public\/atlases\/([a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9]))$/
  )
  if (publicAtlasMatch) {
    if (request.method !== "GET") {
      return errorResponse(405, "method_not_allowed", context)
    }
    if ([...url.searchParams.keys()].length > 0) {
      return errorResponse(400, "invalid_request", context)
    }
    const limited = await publicReadRateLimit({
      request,
      environment,
      dependencies,
      context,
      scope: "public-atlas",
    })
    if (limited) return limited
    try {
      const service = dependencies.getPublicAtlas || getPublicAtlas
      const result = await service({
        environment,
        handle: publicAtlasMatch[1],
        placeCatalog: dependencies.placeCatalog,
      })
      return jsonResponse(result, 200, context)
    } catch (error) {
      if (error instanceof PublicAtlasNotFoundError) {
        return errorResponse(404, "atlas_not_found", context)
      }
      if (error instanceof CatalogConfigurationError) {
        return errorResponse(500, "service_configuration_error", context)
      }
      if (
        error instanceof CatalogUnavailableError ||
        error instanceof CatalogValidationError ||
        error instanceof PublicAtlasServiceError
      ) {
        return errorResponse(503, "public_atlas_unavailable", context)
      }
      return errorResponse(503, "public_atlas_unavailable", context)
    }
  }

  const isAuthCheck = url.pathname === "/v1/auth/check"
  const isRegistration = url.pathname === "/v1/beta/register"
  const isInvitationIssue = url.pathname === "/v1/admin/invitations"
  const isInvitationRevoke = url.pathname === "/v1/admin/invitations/revoke"
  const isPendingRegistrations =
    url.pathname === "/v1/admin/registrations/pending"
  const reconciliationMatch = url.pathname.match(
    /^\/v1\/admin\/registrations\/(usr_[0-9a-f-]{36})\/reconcile$/
  )
  const isReconciliation = Boolean(reconciliationMatch)
  const isMyProfile = url.pathname === "/v1/me"
  const isMyAtlasState = url.pathname === "/v1/me/atlas"
  const isMyPins = url.pathname === "/v1/me/pins"
  const myPinMatch = url.pathname.match(/^\/v1\/me\/pins\/(pin_[a-f0-9]{24})$/)
  const isMyPin = Boolean(myPinMatch)
  const isMyWishes = url.pathname === "/v1/me/bucket-list"
  const myWishMatch = url.pathname.match(
    /^\/v1\/me\/bucket-list\/(wish_[a-f0-9]{24})$/
  )
  const isMyWish = Boolean(myWishMatch)
  const isMyPlans = url.pathname === "/v1/me/trip-plans"
  const myPlanMatch = url.pathname.match(
    /^\/v1\/me\/trip-plans\/(plan_[a-f0-9]{24})$/
  )
  const myPlanKeepMatch = url.pathname.match(
    /^\/v1\/me\/trip-plans\/(plan_[a-f0-9]{24})\/keep$/
  )
  const myPlanVisitedMatch = url.pathname.match(
    /^\/v1\/me\/trip-plans\/(plan_[a-f0-9]{24})\/visited$/
  )
  const isMyPlan = Boolean(myPlanMatch)
  const isMyPlanKeep = Boolean(myPlanKeepMatch)
  const isMyPlanVisited = Boolean(myPlanVisitedMatch)
  const isMyExport = url.pathname === "/v1/me/export"
  const isAccountRoute =
    isMyProfile ||
    isMyAtlasState ||
    isMyPins ||
    isMyPin ||
    isMyWishes ||
    isMyWish ||
    isMyPlans ||
    isMyPlan ||
    isMyPlanKeep ||
    isMyPlanVisited ||
    isMyExport
  const isAdminRoute =
    isInvitationIssue ||
    isInvitationRevoke ||
    isPendingRegistrations ||
    isReconciliation

  if (!isAuthCheck && !isRegistration && !isAdminRoute && !isAccountRoute) {
    return errorResponse(404, "not_found", context)
  }

  if (
    (isAuthCheck && request.method !== "GET") ||
    (isRegistration && request.method !== "POST") ||
    (isInvitationIssue && request.method !== "POST") ||
    (isInvitationRevoke && request.method !== "POST") ||
    (isPendingRegistrations && request.method !== "GET") ||
    (isReconciliation && request.method !== "POST") ||
    (isMyProfile && !["GET", "PATCH", "DELETE"].includes(request.method)) ||
    (isMyAtlasState && request.method !== "GET") ||
    (isMyPins && !["GET", "POST"].includes(request.method)) ||
    (isMyPin && !["PATCH", "DELETE"].includes(request.method)) ||
    (isMyWishes && !["GET", "POST"].includes(request.method)) ||
    (isMyWish && !["PATCH", "DELETE"].includes(request.method)) ||
    (isMyPlans && !["GET", "POST"].includes(request.method)) ||
    (isMyPlan && !["PATCH", "DELETE"].includes(request.method)) ||
    (isMyPlanKeep && request.method !== "POST") ||
    (isMyPlanVisited && request.method !== "POST") ||
    (isMyExport && request.method !== "GET")
  ) {
    return errorResponse(405, "method_not_allowed", context)
  }

  const token = extractBearerToken(request)
  if (!token) {
    return errorResponse(
      401,
      "unauthorized",
      context,
      bearerChallenge("invalid_token")
    )
  }

  let identityVerified = false
  try {
    const configuration = readAuthConfiguration(environment)
    const identity = await verifyAccessToken(token, configuration, dependencies)
    identityVerified = true

    if (isAuthCheck) {
      return jsonResponse(
        {
          authenticated: true,
          identity: {
            issuer: identity.issuer,
            subject: identity.subject,
          },
          permissions: identity.permissions,
        },
        200,
        context
      )
    }

    if (isAdminRoute) {
      if (!identity.permissions.includes("admin:my-atlas")) {
        throw new InsufficientPermissionsError()
      }
      const operatorIdentity = {
        issuer: identity.issuer,
        subject: identity.subject,
      }

      if (isPendingRegistrations) {
        const service =
          dependencies.listPendingRegistrations || listPendingRegistrations
        const result = await service({
          environment,
          identity: operatorIdentity,
          input: normalizePendingQuery(url),
        })
        return jsonResponse(
          {
            registrations: result.registrations,
            nextCursor: result.nextCursor,
          },
          200,
          context
        )
      }

      const body = await readJsonBody(request)
      if (isInvitationIssue) {
        const service = dependencies.issueBetaInvitation || issueBetaInvitation
        const result = await service({
          environment,
          identity: operatorIdentity,
          input: normalizeIssueInvitationInput(
            body,
            request.headers.get("Idempotency-Key")
          ),
        })
        return jsonResponse(
          { invitation: result.invitation },
          result.created ? 201 : 200,
          context
        )
      }
      if (isInvitationRevoke) {
        const service =
          dependencies.revokeBetaInvitation || revokeBetaInvitation
        const result = await service({
          environment,
          identity: operatorIdentity,
          input: normalizeRevokeInvitationInput(
            body,
            request.headers.get("Idempotency-Key")
          ),
        })
        return jsonResponse(result, 200, context)
      }

      const service =
        dependencies.reconcilePendingRegistration ||
        reconcilePendingRegistration
      const result = await service({
        environment,
        identity: operatorIdentity,
        input: normalizeReconciliationInput(
          body,
          reconciliationMatch[1],
          request.headers.get("Idempotency-Key")
        ),
      })
      return jsonResponse({ reconciled: true, ...result }, 200, context)
    }

    if (isAccountRoute) {
      const accountIdentity = {
        issuer: identity.issuer,
        subject: identity.subject,
      }
      const isMutation = ["POST", "PATCH", "DELETE"].includes(request.method)
      if (isMutation && !identity.permissions.includes("write:my-atlas")) {
        throw new InsufficientPermissionsError()
      }

      if (isMyAtlasState) {
        const service = dependencies.getMyAtlasState || getMyAtlasState
        const result = await service({
          environment,
          identity: accountIdentity,
          placeCatalog: dependencies.placeCatalog,
        })
        return accountJsonResponse(
          { profile: result.profile, pins: result.pins },
          200,
          context,
          result.profile.revision
        )
      }

      if (isMyProfile && request.method === "GET") {
        const service = dependencies.getMyProfile || getMyProfile
        const result = await service({
          environment,
          identity: accountIdentity,
        })
        return accountJsonResponse(
          { profile: result.profile },
          200,
          context,
          result.profile.revision
        )
      }
      if (isMyProfile && request.method === "DELETE") {
        const service = dependencies.deleteMyAccount || deleteMyAccount
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeDeleteAccount(
            await readJsonBody(request),
            request.headers
          ),
        })
        return jsonResponse(result, 200, context)
      }
      if (isMyProfile) {
        const service = dependencies.updateMyProfile || updateMyProfile
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeProfilePatch(
            await readJsonBody(request),
            request.headers
          ),
        })
        return accountJsonResponse(
          { profile: result.profile },
          200,
          context,
          result.profile.revision
        )
      }
      if (isMyPins && request.method === "GET") {
        const service = dependencies.listMyPins || listMyPins
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizePinQuery(url),
        })
        return accountJsonResponse(
          {
            pins: result.pins,
            nextCursor: result.nextCursor,
          },
          200,
          context,
          result.profile.revision
        )
      }
      if (isMyPins) {
        const service = dependencies.createMyPin || createMyPin
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeCreatePin(
            await readJsonBody(request),
            request.headers,
            new Date().getUTCFullYear()
          ),
          catalogResolver: dependencies.catalogResolver,
        })
        return accountJsonResponse(
          { pin: result.pin },
          result.created ? 201 : 200,
          context,
          result.profile.revision
        )
      }
      if (isMyPin && request.method === "PATCH") {
        const service = dependencies.updateMyPin || updateMyPin
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizePatchPin(
            await readJsonBody(request),
            myPinMatch[1],
            request.headers,
            new Date().getUTCFullYear()
          ),
          catalogResolver: dependencies.catalogResolver,
        })
        return accountJsonResponse(
          { pin: result.pin },
          200,
          context,
          result.profile.revision
        )
      }
      if (isMyPin) {
        const service = dependencies.deleteMyPin || deleteMyPin
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeDeletePin(myPinMatch[1], request.headers),
        })
        return accountJsonResponse(
          { deleted: true },
          200,
          context,
          result.profile.revision
        )
      }

      if (isMyWishes && request.method === "GET") {
        const service = dependencies.listMyWishes || listMyWishes
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeWishQuery(url),
          placeCatalog: dependencies.placeCatalog,
        })
        return accountJsonResponse(
          { wishes: result.wishes, nextCursor: result.nextCursor },
          200,
          context,
          result.profile.revision
        )
      }
      if (isMyWishes) {
        const service = dependencies.createMyWish || createMyWish
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeCreateWish(
            await readJsonBody(request),
            request.headers,
            new Date().getUTCFullYear()
          ),
          catalogResolver: dependencies.catalogResolver,
        })
        return accountJsonResponse(
          { wish: result.wish },
          result.created ? 201 : 200,
          context,
          result.profile.revision
        )
      }
      if (isMyWish && request.method === "PATCH") {
        const service = dependencies.updateMyWish || updateMyWish
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizePatchWish(
            await readJsonBody(request),
            myWishMatch[1],
            request.headers,
            new Date().getUTCFullYear()
          ),
        })
        return accountJsonResponse(
          { wish: result.wish },
          200,
          context,
          result.profile.revision
        )
      }
      if (isMyWish) {
        const service = dependencies.deleteMyWish || deleteMyWish
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeDeleteWish(myWishMatch[1], request.headers),
        })
        return accountJsonResponse(
          { deleted: true },
          200,
          context,
          result.profile.revision
        )
      }

      if (isMyPlans && request.method === "GET") {
        const service = dependencies.listMyPlans || listMyPlans
        const result = await service({ environment, identity: accountIdentity })
        return accountJsonResponse(
          { plans: result.plans },
          200,
          context,
          result.profile.revision
        )
      }
      if (isMyPlans) {
        const service = dependencies.createMyPlan || createMyPlan
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeCreatePlan(
            await readJsonBody(request),
            request.headers,
            new Date().getUTCFullYear()
          ),
          placeCatalog: dependencies.placeCatalog,
        })
        return accountJsonResponse(
          { plan: result.plan },
          result.created ? 201 : 200,
          context,
          result.profile.revision
        )
      }
      if (isMyPlanKeep) {
        const service = dependencies.keepMyPlan || keepMyPlan
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizePlanMutation(myPlanKeepMatch[1], request.headers),
        })
        return accountJsonResponse(
          { plan: result.plan },
          200,
          context,
          result.profile.revision
        )
      }
      if (isMyPlanVisited) {
        const service = dependencies.markMyPlanVisited || markMyPlanVisited
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeMarkPlanVisited(
            await readJsonBody(request),
            myPlanVisitedMatch[1],
            request.headers,
            new Date().getUTCFullYear()
          ),
          placeCatalog: dependencies.placeCatalog,
        })
        return accountJsonResponse(
          { pins: result.pins },
          result.created ? 201 : 200,
          context,
          result.profile.revision
        )
      }
      if (isMyPlan && request.method === "PATCH") {
        const service = dependencies.replaceMyPlan || replaceMyPlan
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizeReplacePlan(
            await readJsonBody(request),
            myPlanMatch[1],
            request.headers,
            new Date().getUTCFullYear()
          ),
          placeCatalog: dependencies.placeCatalog,
        })
        return accountJsonResponse(
          { plan: result.plan },
          200,
          context,
          result.profile.revision
        )
      }
      if (isMyPlan) {
        const service = dependencies.deleteMyPlan || deleteMyPlan
        const result = await service({
          environment,
          identity: accountIdentity,
          input: normalizePlanMutation(myPlanMatch[1], request.headers),
        })
        return accountJsonResponse(
          { deleted: true },
          200,
          context,
          result.profile.revision
        )
      }

      const format = normalizeExportQuery(url)
      const service = dependencies.exportMyAtlas || exportMyAtlas
      const result = await service({
        environment,
        identity: accountIdentity,
      })
      return format === "csv"
        ? exportCsv(result, context)
        : accountJsonResponse(result, 200, context, result.profile.revision)
    }

    if (!identity.permissions.includes("write:my-atlas")) {
      throw new InsufficientPermissionsError()
    }

    const input = await readRegistrationBody(request)
    const registrationService =
      dependencies.registrationService || registerBetaAccount
    const result = await registrationService({
      environment,
      identity: {
        issuer: identity.issuer,
        subject: identity.subject,
      },
      input,
      remoteIp: request.headers.get("CF-Connecting-IP") || "",
      turnstileVerifier: dependencies.turnstileVerifier,
    })

    return jsonResponse(
      { registered: true, profile: result.profile },
      result.created ? 201 : 200,
      context
    )
  } catch (error) {
    if (
      error instanceof WorkerConfigurationError ||
      error instanceof RegistrationConfigurationError
    ) {
      logConfigurationError({
        error,
        requestId: context.requestId,
        environment,
        dependencies,
      })
      return errorResponse(500, "service_configuration_error", context)
    }
    if (error instanceof RegistrationValidationError) {
      return errorResponse(400, "invalid_registration", context)
    }
    if (error instanceof RegistrationUnavailableError) {
      const code =
        error.code === "turnstile_rejected"
          ? "registration_verification_failed"
          : "registration_unavailable"
      const status = error.code === "turnstile_rejected" ? 400 : 409
      return errorResponse(status, code, context)
    }
    if (error instanceof RegistrationServiceError) {
      return errorResponse(503, "registration_temporarily_unavailable", context)
    }
    if (error instanceof OperatorConflictError) {
      return errorResponse(409, "operator_action_conflict", context)
    }
    if (error instanceof OperatorServiceError) {
      return errorResponse(503, "operator_service_unavailable", context)
    }
    if (error instanceof AccountConflictError) {
      if (error.code === "revision_conflict") {
        return errorResponse(412, "revision_conflict", context)
      }
      if (error.code === "duplicate_wish") {
        return errorResponse(409, "duplicate_wish", context)
      }
      if (error.code === "wish_limit_reached") {
        return errorResponse(409, "wishlist_limit_reached", context)
      }
      if (error.code === "place_unavailable") {
        return errorResponse(409, "place_unavailable", context)
      }
      if (error.code === "invalid_wish") {
        return errorResponse(400, "invalid_request", context)
      }
      if (
        [
          "registration_not_found",
          "profile_not_found",
          "account_not_active",
          "pin_not_found",
          "wish_not_found",
          "plan_not_found",
        ].includes(error.code)
      ) {
        return errorResponse(404, "not_found", context)
      }
      return errorResponse(409, "account_conflict", context)
    }
    if (error instanceof AccountServiceError) {
      return errorResponse(503, "account_service_unavailable", context)
    }
    if (error instanceof CatalogConfigurationError) {
      return errorResponse(500, "service_configuration_error", context)
    }
    if (
      error instanceof CatalogUnavailableError ||
      error instanceof CatalogValidationError
    ) {
      return errorResponse(503, "catalog_unavailable", context)
    }
    if (error instanceof InsufficientPermissionsError) {
      return errorResponse(
        403,
        "insufficient_permissions",
        context,
        bearerChallenge(
          "insufficient_scope",
          "The access token lacks a required permission."
        )
      )
    }
    if (isJwksAvailabilityError(error)) {
      return errorResponse(503, "identity_provider_unavailable", context)
    }
    if (isRegistration && identityVerified) {
      return errorResponse(503, "registration_temporarily_unavailable", context)
    }
    if (isAdminRoute && identityVerified) {
      return errorResponse(503, "operator_service_unavailable", context)
    }
    if (isAccountRoute && identityVerified) {
      return errorResponse(503, "account_service_unavailable", context)
    }

    return errorResponse(
      401,
      "unauthorized",
      context,
      bearerChallenge("invalid_token")
    )
  }
}

export default {
  fetch(request, environment) {
    return handleRequest(request, environment)
  },
}
