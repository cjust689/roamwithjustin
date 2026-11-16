import {
  RegistrationConfigurationError,
  RegistrationValidationError,
  assertQualifiedIdentity,
  normalizeIdempotencyKey,
} from "./contracts.mjs"
import {
  deriveInvitationCode,
  hashInviteCode,
  hashOperatorOperation,
  hashQualifiedIdentity,
} from "./hashing.mjs"
import { REGISTRY_OBJECT_NAME } from "./service.mjs"

const INVITATION_ID_PATTERN = /^inv_[a-f0-9]{24}$/
const USER_ID_PATTERN = /^usr_[0-9a-f-]{36}$/

export class OperatorConflictError extends Error {
  constructor(code) {
    super("The operator action could not be completed.")
    this.name = "OperatorConflictError"
    this.code = code
  }
}

export class OperatorServiceError extends Error {
  constructor() {
    super("The operator service is temporarily unavailable.")
    this.name = "OperatorServiceError"
  }
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : ""
}

function exactIsoDate(value, name) {
  const text = cleanString(value)
  if (
    !text ||
    !Number.isFinite(Date.parse(text)) ||
    new Date(text).toISOString() !== text
  ) {
    throw new RegistrationValidationError(`${name} must be an ISO timestamp.`)
  }
  return text
}

function integerSetting(environment, name, minimum, maximum) {
  const value = Number(environment[name])
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RegistrationConfigurationError(`${name} is not configured.`)
  }
  return value
}

function requireNamespace(environment, name) {
  const namespace = environment[name]
  if (!namespace || typeof namespace.getByName !== "function") {
    throw new RegistrationConfigurationError(`${name} is not bound.`)
  }
  return namespace
}

function assertOnlyKeys(value, allowedKeys, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RegistrationValidationError(`${name} must be an object.`)
  }
  if (Object.keys(value).some(key => !allowedKeys.has(key))) {
    throw new RegistrationValidationError(`${name} contains unknown fields.`)
  }
}

function invitationConfiguration(environment) {
  const inviteHashPepper = cleanString(environment.INVITE_HASH_PEPPER)
  const inviteGenerationSecret = cleanString(
    environment.INVITE_GENERATION_SECRET
  )
  if (inviteHashPepper.length < 32) {
    throw new RegistrationConfigurationError(
      "INVITE_HASH_PEPPER must be supplied as a secret."
    )
  }
  if (inviteGenerationSecret.length < 32) {
    throw new RegistrationConfigurationError(
      "INVITE_GENERATION_SECRET must be supplied as a secret."
    )
  }
  return Object.freeze({
    inviteHashPepper,
    inviteGenerationSecret,
    useCeiling: integerSetting(environment, "BETA_INVITE_USE_CEILING", 1, 1000),
    maxTtlSeconds: integerSetting(
      environment,
      "BETA_INVITE_MAX_TTL_SECONDS",
      300,
      31_536_000
    ),
  })
}

function reconciliationConfiguration(environment) {
  return Object.freeze({
    leaseSeconds: integerSetting(
      environment,
      "REGISTRATION_PENDING_LEASE_SECONDS",
      300,
      2_592_000
    ),
  })
}

function expectedResult(result) {
  if (!result || typeof result !== "object") throw new OperatorServiceError()
  if (result.ok !== true) throw new OperatorConflictError(result.error)
  return result
}

export function normalizeIssueInvitationInput(value, idempotencyKey) {
  assertOnlyKeys(value, new Set(["maxUses", "expiresAt"]), "Invitation")
  if (!Number.isInteger(value.maxUses) || value.maxUses < 1) {
    throw new RegistrationValidationError(
      "Invitation maxUses must be a positive integer."
    )
  }
  return Object.freeze({
    maxUses: value.maxUses,
    expiresAt: exactIsoDate(value.expiresAt, "Invitation expiresAt"),
    idempotencyKey: normalizeIdempotencyKey(idempotencyKey),
  })
}

export function normalizeRevokeInvitationInput(value, idempotencyKey) {
  assertOnlyKeys(value, new Set(["invitationId"]), "Revocation")
  const invitationId = cleanString(value.invitationId)
  if (!INVITATION_ID_PATTERN.test(invitationId)) {
    throw new RegistrationValidationError("Invitation ID is invalid.")
  }
  return Object.freeze({
    invitationId,
    idempotencyKey: normalizeIdempotencyKey(idempotencyKey),
  })
}

export function normalizeReconciliationInput(value, userId, idempotencyKey) {
  assertOnlyKeys(value, new Set(["mode"]), "Reconciliation")
  const normalizedUserId = cleanString(userId)
  if (!USER_ID_PATTERN.test(normalizedUserId)) {
    throw new RegistrationValidationError("Registration user ID is invalid.")
  }
  if (!["complete", "release"].includes(value.mode)) {
    throw new RegistrationValidationError(
      "Reconciliation mode must be complete or release."
    )
  }
  return Object.freeze({
    userId: normalizedUserId,
    mode: value.mode,
    idempotencyKey: normalizeIdempotencyKey(idempotencyKey),
  })
}

export function normalizePendingQuery(url) {
  const limitText = url.searchParams.get("limit") || "25"
  const limit = Number(limitText)
  const cursor = cleanString(url.searchParams.get("cursor"))
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RegistrationValidationError(
      "Pending registration limit must be between 1 and 100."
    )
  }
  if (cursor && !USER_ID_PATTERN.test(cursor)) {
    throw new RegistrationValidationError(
      "Pending registration cursor is invalid."
    )
  }
  for (const key of url.searchParams.keys()) {
    if (!["limit", "cursor"].includes(key)) {
      throw new RegistrationValidationError(
        "Pending registration query contains unknown fields."
      )
    }
  }
  return Object.freeze({ limit, cursor })
}

async function operatorContext(identity, idempotencyKey, action) {
  const qualifiedIdentity = assertQualifiedIdentity(identity)
  const operatorIdentityDigest = await hashQualifiedIdentity(qualifiedIdentity)
  return Object.freeze({
    operatorIdentityDigest,
    operationDigest: await hashOperatorOperation(
      operatorIdentityDigest,
      idempotencyKey,
      action
    ),
  })
}

function registryFor(environment) {
  return requireNamespace(environment, "MY_ATLAS_REGISTRY").getByName(
    REGISTRY_OBJECT_NAME
  )
}

export async function issueBetaInvitation({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const configuration = invitationConfiguration(environment)
  const currentTime = Date.parse(now)
  const expiryTime = Date.parse(input.expiresAt)
  if (
    input.maxUses > configuration.useCeiling ||
    expiryTime <= currentTime ||
    expiryTime - currentTime > configuration.maxTtlSeconds * 1000
  ) {
    throw new OperatorConflictError("invitation_policy_rejected")
  }

  const operator = await operatorContext(
    identity,
    input.idempotencyKey,
    "issue-invitation"
  )
  const code = await deriveInvitationCode(
    configuration.inviteGenerationSecret,
    operator.operationDigest
  )
  const digest = await hashInviteCode(code, configuration.inviteHashPepper)
  const invitationId = `inv_${digest.slice(0, 24)}`
  const result = expectedResult(
    await registryFor(environment).issueInvitation({
      invitationId,
      digest,
      maxUses: input.maxUses,
      createdAt: now,
      expiresAt: input.expiresAt,
      operationDigest: operator.operationDigest,
      operatorIdentityDigest: operator.operatorIdentityDigest,
    })
  )

  return Object.freeze({
    created: !result.idempotent,
    invitation: Object.freeze({
      id: invitationId,
      code,
      status: result.status,
      maxUses: result.maxUses,
      used: result.used,
      reserved: result.reserved,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
    }),
  })
}

export async function revokeBetaInvitation({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const operator = await operatorContext(
    identity,
    input.idempotencyKey,
    "revoke-invitation"
  )
  const result = expectedResult(
    await registryFor(environment).revokeInvitationById({
      invitationId: input.invitationId,
      revokedAt: now,
      operationDigest: operator.operationDigest,
      operatorIdentityDigest: operator.operatorIdentityDigest,
    })
  )
  return Object.freeze({
    revoked: true,
    idempotent: result.idempotent,
    invitation: result.invitation,
  })
}

export async function listPendingRegistrations({ environment, input }) {
  return expectedResult(
    await registryFor(environment).listPendingRegistrations(input)
  )
}

export async function reconcilePendingRegistration({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const operator = await operatorContext(
    identity,
    input.idempotencyKey,
    `reconcile-${input.mode}`
  )
  const registry = registryFor(environment)
  const registration = expectedResult(
    await registry.getRegistrationForReconciliation(input.userId)
  ).registration

  if (registration.state === "active" && input.mode === "complete") {
    return Object.freeze({ state: "active", idempotent: true })
  }
  if (registration.state === "abandoned" && input.mode === "release") {
    return Object.freeze({ state: "abandoned", idempotent: true })
  }
  if (registration.state !== "pending") {
    throw new OperatorConflictError("registration_state_conflict")
  }

  const userNamespace = requireNamespace(environment, "MY_ATLAS_USERS")
  const user = userNamespace.getByName(registration.userId)
  const command = {
    userId: registration.userId,
    identity: registration.identity,
    identityDigest: registration.identityDigest,
    operationDigest: registration.operationDigest,
    handle: registration.handle,
    displayName: registration.displayName,
    termsVersion: registration.termsVersion,
    privacyVersion: registration.privacyVersion,
    now,
  }

  if (input.mode === "complete") {
    const inspection = expectedResult(await user.inspectProvisioning(command))
    if (inspection.state !== "initialized") {
      throw new OperatorConflictError("profile_not_initialized")
    }
    const finalized = expectedResult(
      await registry.finalizeRegistration({
        operationDigest: registration.operationDigest,
        identityDigest: registration.identityDigest,
        userId: registration.userId,
        now,
      })
    )
    return Object.freeze({
      state: finalized.state,
      idempotent: finalized.idempotent,
    })
  }

  const { leaseSeconds } = reconciliationConfiguration(environment)
  if (
    Date.parse(now) - Date.parse(registration.createdAt) <
    leaseSeconds * 1000
  ) {
    throw new OperatorConflictError("registration_lease_active")
  }
  expectedResult(
    await user.abandonUninitializedProfile({
      ...command,
      operatorIdentityDigest: operator.operatorIdentityDigest,
      reconciliationOperationDigest: operator.operationDigest,
    })
  )
  const abandoned = expectedResult(
    await registry.abandonRegistration({
      userId: registration.userId,
      identityDigest: registration.identityDigest,
      operationDigest: registration.operationDigest,
      operatorIdentityDigest: operator.operatorIdentityDigest,
      reconciliationOperationDigest: operator.operationDigest,
      leaseSeconds,
      now,
    })
  )
  return Object.freeze({
    state: abandoned.state,
    idempotent: abandoned.idempotent,
  })
}
