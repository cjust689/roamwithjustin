export const MY_ATLAS_AUTH_SCOPE =
  "openid profile email read:my-atlas write:my-atlas"

const AUTH_ENVIRONMENT_KEYS = Object.freeze({
  domain: "VUE_APP_MY_ATLAS_AUTH0_DOMAIN",
  clientId: "VUE_APP_MY_ATLAS_AUTH0_CLIENT_ID",
  audience: "VUE_APP_MY_ATLAS_AUTH0_AUDIENCE",
})

function cleanValue(value) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeOrigin(origin) {
  const parsed = new URL(cleanValue(origin))
  const localHttp =
    parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(parsed.hostname)

  if (parsed.protocol !== "https:" && !localHttp) {
    throw new Error("My Atlas authentication requires HTTPS outside localhost.")
  }

  return parsed.origin
}

function normalizeDomain(domain) {
  const value = cleanValue(domain)
    .replace(/^https:\/\//i, "")
    .replace(/\/+$/, "")

  if (!value || value.includes("/") || !/^[a-z0-9.-]+$/i.test(value)) {
    throw new Error("My Atlas Auth0 domain is invalid.")
  }

  return value.toLowerCase()
}

export function inspectMyAtlasAuthConfiguration(environment = {}) {
  const missing = Object.entries(AUTH_ENVIRONMENT_KEYS)
    .filter(([, key]) => !cleanValue(environment[key]))
    .map(([name]) => name)

  return {
    configured: missing.length === 0,
    missing,
  }
}

export function getMyAtlasAuthConfiguration(environment = {}, origin) {
  const inspection = inspectMyAtlasAuthConfiguration(environment)
  if (!inspection.configured) {
    throw new Error(
      `My Atlas Auth0 configuration is missing: ${inspection.missing.join(", ")}.`
    )
  }

  const normalizedOrigin = normalizeOrigin(origin)
  const clientId = cleanValue(environment[AUTH_ENVIRONMENT_KEYS.clientId])
  const audience = cleanValue(environment[AUTH_ENVIRONMENT_KEYS.audience])

  if (/\s/.test(clientId)) {
    throw new Error("My Atlas Auth0 client ID is invalid.")
  }
  if (/\s/.test(audience)) {
    throw new Error("My Atlas Auth0 audience is invalid.")
  }

  return Object.freeze({
    domain: normalizeDomain(environment[AUTH_ENVIRONMENT_KEYS.domain]),
    clientId,
    audience,
    scope: MY_ATLAS_AUTH_SCOPE,
    callbackUri: `${normalizedOrigin}/my-atlas/callback`,
    logoutUri: `${normalizedOrigin}/my-atlas`,
  })
}
