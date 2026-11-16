import { RegistrationConfigurationError } from "../registration/contracts.mjs"
import {
  hashOperatorOperation,
  hashQualifiedIdentity,
  sha256,
} from "../registration/hashing.mjs"
import { REGISTRY_OBJECT_NAME } from "../registration/service.mjs"
import { projectCatalogPlace } from "../catalog/projection.mjs"
import { WorkerPlaceCatalog, createCatalogResolver } from "../catalog/store.mjs"

export class AccountConflictError extends Error {
  constructor(code) {
    super("The account action could not be completed.")
    this.name = "AccountConflictError"
    this.code = code
  }
}

export class AccountServiceError extends Error {
  constructor() {
    super("The account service is temporarily unavailable.")
    this.name = "AccountServiceError"
  }
}

function requireNamespace(environment, name) {
  const namespace = environment[name]
  if (!namespace || typeof namespace.getByName !== "function") {
    throw new RegistrationConfigurationError(`${name} is not bound.`)
  }
  return namespace
}

function expectedResult(result) {
  if (!result || typeof result !== "object") throw new AccountServiceError()
  if (result.ok !== true) throw new AccountConflictError(result.error)
  return result
}

function publicProfile(profile) {
  return Object.freeze({
    schemaVersion: profile.schemaVersion,
    userId: profile.userId,
    handle: profile.handle,
    displayName: profile.displayName,
    public: profile.public,
    status: profile.status,
    pinCount: profile.pinCount || 0,
    acceptedTermsVersion: profile.acceptedTermsVersion,
    acceptedPrivacyVersion: profile.acceptedPrivacyVersion,
    acceptedAt: profile.acceptedAt,
    revision: profile.revision,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  })
}

async function ownerContext(environment, identity) {
  const identityDigest = await hashQualifiedIdentity(identity)
  const registry = requireNamespace(environment, "MY_ATLAS_REGISTRY").getByName(
    REGISTRY_OBJECT_NAME
  )
  const registration = expectedResult(
    await registry.getRegistrationByIdentity(identityDigest)
  )
  if (registration.state !== "active") {
    throw new AccountConflictError("account_not_active")
  }
  return Object.freeze({
    identityDigest,
    userId: registration.userId,
    user: requireNamespace(environment, "MY_ATLAS_USERS").getByName(
      registration.userId
    ),
  })
}

async function mutationMetadata(owner, input, action, value) {
  return Object.freeze({
    operationDigest: await hashOperatorOperation(
      owner.identityDigest,
      input.idempotencyKey,
      action
    ),
    requestDigest: await sha256(
      JSON.stringify({
        action,
        expectedRevision: input.expectedRevision,
        value,
      })
    ),
  })
}

async function assertCatalogPlace(placeId, catalogResolver, environment) {
  const resolver =
    typeof catalogResolver === "function"
      ? catalogResolver
      : createCatalogResolver(environment)
  const place = await resolver(placeId)
  if (
    !place ||
    place.placeId !== placeId ||
    place.deprecated === true ||
    !Array.isArray(place.coordinates) ||
    place.coordinates.length !== 2 ||
    place.coordinates.some(coordinate => !Number.isFinite(coordinate))
  ) {
    throw new AccountConflictError("place_unavailable")
  }
  return place
}

function publicPinTiming(pin) {
  const visitedDates = Array.isArray(pin.visitedDates)
    ? pin.visitedDates
    : (pin.visitedYears || []).map(year => ({ year }))
  return Object.freeze({
    visitedDates: Object.freeze(
      visitedDates.map(date =>
        Object.freeze({
          year: date.year,
          ...(date.month === undefined ? {} : { month: date.month }),
        })
      )
    ),
    visitedYears: Object.freeze([
      ...new Set(visitedDates.map(date => date.year)),
    ]),
  })
}

function publicOwnerPin(pin) {
  return Object.freeze({ ...pin, ...publicPinTiming(pin) })
}

export async function getMyProfile({ environment, identity }) {
  const owner = await ownerContext(environment, identity)
  const result = expectedResult(
    await owner.user.getOwnerProfile(owner.identityDigest)
  )
  return Object.freeze({ profile: publicProfile(result.profile) })
}

export async function getMyAtlasState({ environment, identity, placeCatalog }) {
  const owner = await ownerContext(environment, identity)
  const result = expectedResult(
    await owner.user.exportOwnerState(owner.identityDigest)
  )
  let records = []
  if (result.pins.length) {
    const catalog = placeCatalog || new WorkerPlaceCatalog(environment)
    records = await catalog.resolveMany(result.pins.map(pin => pin.placeId))
  }
  let pins
  try {
    pins = result.pins.map((pin, index) =>
      Object.freeze({
        pinId: pin.pinId,
        ...projectCatalogPlace(records[index]),
        ...publicPinTiming(pin),
      })
    )
  } catch {
    throw new AccountServiceError()
  }
  return Object.freeze({
    profile: publicProfile(result.profile),
    pins: Object.freeze(pins),
  })
}

export async function updateMyProfile({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const owner = await ownerContext(environment, identity)
  const mutation = await mutationMetadata(
    owner,
    input,
    "update-profile",
    input.patch
  )
  const result = expectedResult(
    await owner.user.updateOwnerProfile({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      patch: input.patch,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    idempotent: result.idempotent,
    profile: publicProfile(result.profile),
  })
}

export async function listMyPins({ environment, identity, input }) {
  const owner = await ownerContext(environment, identity)
  const result = expectedResult(
    await owner.user.listOwnerPins({
      identityDigest: owner.identityDigest,
      ...input,
    })
  )
  return Object.freeze({
    profile: publicProfile(result.profile),
    pins: Object.freeze(result.pins.map(publicOwnerPin)),
    nextCursor: result.nextCursor,
  })
}

export async function createMyPin({
  environment,
  identity,
  input,
  catalogResolver,
  now = new Date().toISOString(),
}) {
  const timing = publicPinTiming(input)
  const place = await assertCatalogPlace(
    input.placeId,
    catalogResolver,
    environment
  )
  const owner = await ownerContext(environment, identity)
  const mutation = await mutationMetadata(owner, input, "create-pin", {
    placeId: input.placeId,
    ...timing,
  })
  const pinId = `pin_${(
    await sha256(`${owner.userId}\u0000${input.placeId}`)
  ).slice(0, 24)}`
  const result = expectedResult(
    await owner.user.createOwnerPin({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      pinId,
      placeId: input.placeId,
      ...timing,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    created: !result.idempotent,
    profile: publicProfile(result.profile),
    pin: Object.freeze({
      pinId: result.pin.pinId,
      ...projectCatalogPlace(place),
      ...publicPinTiming(result.pin),
    }),
  })
}

export async function updateMyPin({
  environment,
  identity,
  input,
  catalogResolver,
  now = new Date().toISOString(),
}) {
  const patch =
    input.patch.visitedYears !== undefined ||
    input.patch.visitedDates !== undefined
      ? Object.freeze({ ...input.patch, ...publicPinTiming(input.patch) })
      : input.patch
  if (patch.placeId) {
    await assertCatalogPlace(patch.placeId, catalogResolver, environment)
  }
  const owner = await ownerContext(environment, identity)
  const mutation = await mutationMetadata(
    owner,
    input,
    `update-pin:${input.pinId}`,
    patch
  )
  const result = expectedResult(
    await owner.user.updateOwnerPin({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      pinId: input.pinId,
      patch,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    idempotent: result.idempotent,
    profile: publicProfile(result.profile),
    pin: publicOwnerPin(result.pin),
  })
}

export async function deleteMyPin({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const owner = await ownerContext(environment, identity)
  const mutation = await mutationMetadata(
    owner,
    input,
    `delete-pin:${input.pinId}`,
    { pinId: input.pinId }
  )
  const result = expectedResult(
    await owner.user.deleteOwnerPin({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      pinId: input.pinId,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    idempotent: result.idempotent,
    profile: publicProfile(result.profile),
  })
}

export async function exportMyAtlas({ environment, identity }) {
  const owner = await ownerContext(environment, identity)
  const result = expectedResult(
    await owner.user.exportOwnerState(owner.identityDigest)
  )
  return Object.freeze({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: publicProfile(result.profile),
    pins: Object.freeze(result.pins.map(publicOwnerPin)),
  })
}
