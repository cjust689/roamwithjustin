const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/
const INVITE_PATTERN = /^[A-Za-z0-9_-]{20,128}$/
const VERSION_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "atlas",
  "callback",
  "edit",
  "help",
  "login",
  "logout",
  "me",
  "my-atlas",
  "privacy",
  "register",
  "settings",
  "support",
  "terms",
])

export class RegistrationConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "RegistrationConfigurationError"
  }
}

export class RegistrationValidationError extends Error {
  constructor(message, code = "invalid_registration") {
    super(message)
    this.name = "RegistrationValidationError"
    this.code = code
  }
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : ""
}

function containsControlCharacter(value) {
  return Array.from(value).some(character => {
    const codePoint = character.codePointAt(0)
    return codePoint <= 31 || codePoint === 127
  })
}

function readVersion(value, name) {
  const version = cleanString(value)
  if (!VERSION_PATTERN.test(version)) {
    throw new RegistrationConfigurationError(`${name} is not configured.`)
  }
  return version
}

export function readRegistrationConfiguration(environment = {}) {
  const inviteHashPepper = cleanString(environment.INVITE_HASH_PEPPER)
  const turnstileSecret = cleanString(environment.TURNSTILE_SECRET_KEY)
  const turnstileAction = cleanString(environment.TURNSTILE_ACTION)
  const turnstileHostnames = cleanString(environment.TURNSTILE_HOSTNAMES)
    .split(",")
    .map(hostname => hostname.trim().toLowerCase())
    .filter(Boolean)

  if (inviteHashPepper.length < 32) {
    throw new RegistrationConfigurationError(
      "INVITE_HASH_PEPPER must be supplied as a secret."
    )
  }
  if (turnstileSecret.length < 10) {
    throw new RegistrationConfigurationError(
      "TURNSTILE_SECRET_KEY must be supplied as a secret."
    )
  }
  if (!VERSION_PATTERN.test(turnstileAction)) {
    throw new RegistrationConfigurationError("TURNSTILE_ACTION is invalid.")
  }
  if (
    turnstileHostnames.length === 0 ||
    turnstileHostnames.some(
      hostname =>
        hostname.length > 253 ||
        !/^(?:localhost|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)$/i.test(hostname)
    )
  ) {
    throw new RegistrationConfigurationError("TURNSTILE_HOSTNAMES is invalid.")
  }

  return Object.freeze({
    termsVersion: readVersion(
      environment.BETA_TERMS_VERSION,
      "BETA_TERMS_VERSION"
    ),
    privacyVersion: readVersion(
      environment.BETA_PRIVACY_VERSION,
      "BETA_PRIVACY_VERSION"
    ),
    inviteHashPepper,
    turnstileSecret,
    turnstileAction,
    turnstileHostnames: Object.freeze([...new Set(turnstileHostnames)]),
  })
}

export function normalizeHandle(value) {
  const handle = cleanString(value).normalize("NFKC").toLowerCase()

  if (
    !HANDLE_PATTERN.test(handle) ||
    handle.includes("--") ||
    RESERVED_HANDLES.has(handle)
  ) {
    throw new RegistrationValidationError(
      "The requested handle is invalid.",
      "invalid_handle"
    )
  }

  return handle
}

export function normalizeDisplayName(value) {
  const displayName = cleanString(value).normalize("NFKC").replace(/\s+/g, " ")

  if (
    displayName.length < 2 ||
    displayName.length > 50 ||
    containsControlCharacter(displayName) ||
    /[<>]/.test(displayName)
  ) {
    throw new RegistrationValidationError(
      "The display name is invalid.",
      "invalid_display_name"
    )
  }

  return displayName
}

export function normalizeIdempotencyKey(value) {
  const idempotencyKey = cleanString(value)
  if (!UUID_PATTERN.test(idempotencyKey)) {
    throw new RegistrationValidationError(
      "A UUID Idempotency-Key header is required.",
      "invalid_idempotency_key"
    )
  }
  return idempotencyKey.toLowerCase()
}

export function normalizeRegistrationInput(value, idempotencyKey) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RegistrationValidationError("A registration object is required.")
  }

  const allowedKeys = new Set([
    "inviteCode",
    "handle",
    "displayName",
    "turnstileToken",
    "acceptTerms",
    "acceptPrivacy",
  ])
  if (Object.keys(value).some(key => !allowedKeys.has(key))) {
    throw new RegistrationValidationError(
      "Registration contains unknown fields."
    )
  }

  const inviteCode = cleanString(value.inviteCode)
  const turnstileToken = cleanString(value.turnstileToken)

  if (!INVITE_PATTERN.test(inviteCode)) {
    throw new RegistrationValidationError(
      "The invitation code format is invalid.",
      "invalid_invitation"
    )
  }
  if (!turnstileToken || turnstileToken.length > 2048) {
    throw new RegistrationValidationError(
      "A Turnstile verification token is required.",
      "invalid_turnstile_token"
    )
  }
  if (value.acceptTerms !== true || value.acceptPrivacy !== true) {
    throw new RegistrationValidationError(
      "Terms and privacy acceptance are required.",
      "acceptance_required"
    )
  }

  return Object.freeze({
    inviteCode,
    handle: normalizeHandle(value.handle),
    displayName: normalizeDisplayName(value.displayName),
    turnstileToken,
    idempotencyKey: normalizeIdempotencyKey(idempotencyKey),
  })
}

export function assertQualifiedIdentity(identity) {
  if (
    !identity ||
    typeof identity.issuer !== "string" ||
    !identity.issuer.startsWith("https://") ||
    identity.issuer.length > 512 ||
    typeof identity.subject !== "string" ||
    !identity.subject ||
    identity.subject.length > 512
  ) {
    throw new RegistrationValidationError("A verified identity is required.")
  }

  return Object.freeze({
    issuer: identity.issuer,
    subject: identity.subject,
  })
}
