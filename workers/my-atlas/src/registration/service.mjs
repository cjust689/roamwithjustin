import {
  RegistrationConfigurationError,
  assertQualifiedIdentity,
  readRegistrationConfiguration,
} from "./contracts.mjs"
import {
  hashInviteCode,
  hashQualifiedIdentity,
  hashRegistrationOperation,
  hashRegistrationRequest,
} from "./hashing.mjs"
import { verifyTurnstile } from "./turnstile.mjs"

export const REGISTRY_OBJECT_NAME = "beta-registration-v1"

export class RegistrationUnavailableError extends Error {
  constructor(code = "registration_unavailable") {
    super("Registration could not be completed.")
    this.name = "RegistrationUnavailableError"
    this.code = code
  }
}

export class RegistrationServiceError extends Error {
  constructor(message = "Registration is temporarily unavailable.") {
    super(message)
    this.name = "RegistrationServiceError"
  }
}

function requireNamespace(environment, name) {
  const namespace = environment[name]
  if (!namespace || typeof namespace.getByName !== "function") {
    throw new RegistrationConfigurationError(`${name} is not bound.`)
  }
  return namespace
}

function publicProfile(profile) {
  return Object.freeze({
    schemaVersion: profile.schemaVersion,
    userId: profile.userId,
    handle: profile.handle,
    displayName: profile.displayName,
    public: profile.public,
    discoverable: profile.discoverable === true,
    pinCount: profile.pinCount || 0,
    wishCount: profile.wishCount || 0,
    planCount: profile.planCount || 0,
    status: profile.status,
    acceptedTermsVersion: profile.acceptedTermsVersion,
    acceptedPrivacyVersion: profile.acceptedPrivacyVersion,
    acceptedAt: profile.acceptedAt,
    revision: profile.revision,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  })
}

function assertExpectedResult(result) {
  if (!result || typeof result !== "object") {
    throw new RegistrationServiceError()
  }
  if (result.ok !== true) {
    throw new RegistrationUnavailableError(result.error)
  }
  return result
}

export async function registerBetaAccount({
  environment,
  identity,
  input,
  remoteIp = "",
  now = new Date().toISOString(),
  turnstileVerifier = verifyTurnstile,
  userIdFactory = () => `usr_${crypto.randomUUID()}`,
}) {
  const configuration = readRegistrationConfiguration(environment)
  const qualifiedIdentity = assertQualifiedIdentity(identity)
  const registryNamespace = requireNamespace(environment, "MY_ATLAS_REGISTRY")
  const userNamespace = requireNamespace(environment, "MY_ATLAS_USERS")

  const turnstileAccepted = await turnstileVerifier({
    token: input.turnstileToken,
    secret: configuration.turnstileSecret,
    idempotencyKey: input.idempotencyKey,
    remoteIp,
    expectedAction: configuration.turnstileAction,
    expectedHostnames: configuration.turnstileHostnames,
  })
  if (!turnstileAccepted) {
    throw new RegistrationUnavailableError("turnstile_rejected")
  }

  const [identityDigest, inviteDigest] = await Promise.all([
    hashQualifiedIdentity(qualifiedIdentity),
    hashInviteCode(input.inviteCode, configuration.inviteHashPepper),
  ])
  const operationDigest = await hashRegistrationOperation(
    identityDigest,
    input.idempotencyKey
  )
  const request = {
    identity: qualifiedIdentity,
    identityDigest,
    inviteDigest,
    operationDigest,
    userId: userIdFactory(),
    handle: input.handle,
    displayName: input.displayName,
    termsVersion: configuration.termsVersion,
    privacyVersion: configuration.privacyVersion,
    now,
  }
  request.requestDigest = await hashRegistrationRequest(request)

  const registry = registryNamespace.getByName(REGISTRY_OBJECT_NAME)
  const reservation = assertExpectedResult(
    await registry.reserveRegistration(request)
  )
  const user = userNamespace.getByName(reservation.userId)

  if (reservation.state === "active") {
    const existingProfile = assertExpectedResult(
      await user.getOwnerProfile(identityDigest)
    )
    return Object.freeze({
      created: false,
      profile: publicProfile(existingProfile.profile),
    })
  }

  const initialized = assertExpectedResult(
    await user.initializeProfile({
      userId: reservation.userId,
      identity: qualifiedIdentity,
      identityDigest,
      handle: input.handle,
      displayName: input.displayName,
      termsVersion: configuration.termsVersion,
      privacyVersion: configuration.privacyVersion,
      now,
    })
  )
  assertExpectedResult(
    await registry.finalizeRegistration({
      operationDigest,
      identityDigest,
      userId: reservation.userId,
      now,
    })
  )

  return Object.freeze({
    created: !initialized.idempotent,
    profile: publicProfile(initialized.profile),
  })
}
