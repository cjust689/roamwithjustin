import { createRemoteJWKSet, jwtVerify } from "jose"

const MAX_TOKEN_LENGTH = 16_384
const CLOCK_TOLERANCE_SECONDS = 5
const MAX_SUBJECT_LENGTH = 512

export class WorkerConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "WorkerConfigurationError"
  }
}

export class InsufficientPermissionsError extends Error {
  constructor() {
    super("The access token does not contain every required permission.")
    this.name = "InsufficientPermissionsError"
  }
}

function cleanValue(value) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeIssuer(value) {
  let issuer

  try {
    issuer = new URL(cleanValue(value))
  } catch {
    throw new WorkerConfigurationError("AUTH0_ISSUER must be a valid URL.")
  }

  if (
    issuer.protocol !== "https:" ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash ||
    !["", "/"].includes(issuer.pathname)
  ) {
    throw new WorkerConfigurationError(
      "AUTH0_ISSUER must be an HTTPS origin without credentials, path, query, or fragment."
    )
  }

  return `${issuer.origin}/`
}

function normalizeAudience(value) {
  const audience = cleanValue(value)

  if (!audience || audience.length > 512 || /\s/.test(audience)) {
    throw new WorkerConfigurationError("AUTH0_AUDIENCE is invalid.")
  }

  return audience
}

function normalizeRequiredPermissions(value) {
  const permissions = cleanValue(value)
    .split(/[\s,]+/)
    .filter(Boolean)

  if (
    permissions.length === 0 ||
    permissions.some(
      permission =>
        permission.length > 128 || !/^[a-z0-9:_-]+$/i.test(permission)
    )
  ) {
    throw new WorkerConfigurationError(
      "AUTH0_REQUIRED_PERMISSIONS must list valid permission names."
    )
  }

  return Object.freeze([...new Set(permissions)])
}

export function readAuthConfiguration(environment = {}) {
  const issuer = normalizeIssuer(environment.AUTH0_ISSUER)
  const audience = normalizeAudience(environment.AUTH0_AUDIENCE)
  const requiredPermissions = normalizeRequiredPermissions(
    environment.AUTH0_REQUIRED_PERMISSIONS
  )

  return Object.freeze({
    issuer,
    audience,
    requiredPermissions,
    jwksUrl: new URL(".well-known/jwks.json", issuer),
  })
}

const remoteJwksCache = new Map()

export function getRemoteJwks(configuration) {
  const cacheKey = configuration.jwksUrl.href

  if (!remoteJwksCache.has(cacheKey)) {
    remoteJwksCache.set(
      cacheKey,
      createRemoteJWKSet(configuration.jwksUrl, {
        cacheMaxAge: 600_000,
        cooldownDuration: 30_000,
        timeoutDuration: 5_000,
      })
    )
  }

  return remoteJwksCache.get(cacheKey)
}

function assertTokenShape(token) {
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH ||
    token.split(".").length !== 3
  ) {
    throw new Error("Invalid access token shape.")
  }
}

function readPermissions(payload) {
  const permissions = new Set()

  if (typeof payload.scope === "string") {
    payload.scope
      .split(/\s+/)
      .filter(Boolean)
      .forEach(permission => permissions.add(permission))
  }

  if (Array.isArray(payload.permissions)) {
    payload.permissions
      .filter(permission => typeof permission === "string" && permission)
      .forEach(permission => permissions.add(permission))
  }

  return [...permissions].sort()
}

function containsControlCharacter(value) {
  return Array.from(value).some(character => {
    const codePoint = character.codePointAt(0)
    return codePoint <= 31 || codePoint === 127
  })
}

export async function verifyAccessToken(
  token,
  configuration,
  { jwks = getRemoteJwks(configuration), now = Date.now() } = {}
) {
  assertTokenShape(token)

  const { payload, protectedHeader } = await jwtVerify(token, jwks, {
    algorithms: ["RS256"],
    issuer: configuration.issuer,
    audience: configuration.audience,
    requiredClaims: ["sub", "iat", "exp"],
    clockTolerance: CLOCK_TOLERANCE_SECONDS,
  })

  if (protectedHeader.typ && !["JWT", "at+jwt"].includes(protectedHeader.typ)) {
    throw new Error("Invalid access token type.")
  }

  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    payload.sub.length > MAX_SUBJECT_LENGTH ||
    containsControlCharacter(payload.sub)
  ) {
    throw new Error("Invalid access token subject.")
  }

  const issuedAt = Number(payload.iat)
  if (
    !Number.isInteger(issuedAt) ||
    issuedAt > Math.floor(now / 1000) + CLOCK_TOLERANCE_SECONDS
  ) {
    throw new Error("Invalid access token issue time.")
  }

  const permissions = readPermissions(payload)
  if (
    configuration.requiredPermissions.some(
      requiredPermission => !permissions.includes(requiredPermission)
    )
  ) {
    throw new InsufficientPermissionsError()
  }

  return Object.freeze({
    issuer: payload.iss,
    subject: payload.sub,
    permissions,
  })
}

export function isJwksAvailabilityError(error) {
  return (
    error?.code === "ERR_JWKS_TIMEOUT" ||
    error?.cause?.code === "ECONNREFUSED" ||
    error?.cause?.code === "ENOTFOUND"
  )
}
