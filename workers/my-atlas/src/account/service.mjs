import { RegistrationConfigurationError } from "../registration/contracts.mjs"
import {
  hashOperatorOperation,
  hashQualifiedIdentity,
  sha256,
} from "../registration/hashing.mjs"
import { REGISTRY_OBJECT_NAME } from "../registration/service.mjs"
import { projectCatalogPlace } from "../catalog/projection.mjs"
import { WorkerPlaceCatalog, createCatalogResolver } from "../catalog/store.mjs"
import { isNormalizedPinMemory } from "./memory.mjs"
import {
  CUSTOM_PLACE_ID_PATTERN,
  isNormalizedCustomPlace,
  projectCustomPlace,
} from "./custom-place.mjs"

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

export function publicProfile(profile) {
  return Object.freeze({
    schemaVersion: profile.schemaVersion,
    userId: profile.userId,
    handle: profile.handle,
    displayName: profile.displayName,
    public: profile.public,
    status: profile.status,
    pinCount: profile.pinCount || 0,
    wishCount: profile.wishCount || 0,
    planCount: profile.planCount || 0,
    acceptedTermsVersion: profile.acceptedTermsVersion,
    acceptedPrivacyVersion: profile.acceptedPrivacyVersion,
    acceptedAt: profile.acceptedAt,
    revision: profile.revision,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  })
}

export async function ownerContext(environment, identity) {
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

export async function mutationMetadata(owner, input, action, value) {
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

export async function assertCatalogPlace(
  placeId,
  catalogResolver,
  environment
) {
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

function ownerPinMemory(pin) {
  if (pin.memory === undefined) return ""
  if (!isNormalizedPinMemory(pin.memory)) throw new AccountServiceError()
  return pin.memory
}

function ownerPinPlaceFields(pin) {
  if (CUSTOM_PLACE_ID_PATTERN.test(pin.placeId)) {
    if (!isNormalizedCustomPlace(pin.customPlace)) {
      throw new AccountServiceError()
    }
    return Object.freeze({ customPlace: pin.customPlace })
  }
  if (pin.customPlace !== undefined && pin.customPlace !== null) {
    throw new AccountServiceError()
  }
  return Object.freeze({})
}

function publicOwnerPin(pin) {
  return Object.freeze({
    ...pin,
    ...ownerPinPlaceFields(pin),
    ...publicPinTiming(pin),
    memory: ownerPinMemory(pin),
  })
}

async function projectOwnerPins(pins, placeCatalog, environment) {
  const catalogPins = pins.filter(
    pin => !CUSTOM_PLACE_ID_PATTERN.test(pin.placeId)
  )
  let records = []
  if (catalogPins.length) {
    const catalog = placeCatalog || new WorkerPlaceCatalog(environment)
    records = await catalog.resolveMany(catalogPins.map(pin => pin.placeId))
  }
  const recordsByPlaceId = new Map(
    catalogPins.map((pin, index) => [pin.placeId, records[index]])
  )
  return pins.map(pin => {
    const place = CUSTOM_PLACE_ID_PATTERN.test(pin.placeId)
      ? projectCustomPlace(pin.placeId, pin.customPlace)
      : projectCatalogPlace(recordsByPlaceId.get(pin.placeId))
    return Object.freeze({
      pinId: pin.pinId,
      ...place,
      ...publicPinTiming(pin),
      memory: ownerPinMemory(pin),
    })
  })
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
  let pins
  try {
    pins = await projectOwnerPins(result.pins, placeCatalog, environment)
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
  const memory = input.memory === undefined ? "" : input.memory
  const owner = await ownerContext(environment, identity)
  const customPlace = input.customPlace
  const placeId = customPlace
    ? `custom:${(
        await sha256(
          `${owner.userId}\u0000${customPlace.name}\u0000${customPlace.coordinates.join(",")}\u0000custom-place`
        )
      ).slice(0, 24)}`
    : input.placeId
  const place = customPlace
    ? projectCustomPlace(placeId, customPlace)
    : await assertCatalogPlace(placeId, catalogResolver, environment)
  const mutation = await mutationMetadata(owner, input, "create-pin", {
    placeId,
    ...(customPlace ? { customPlace } : {}),
    ...timing,
    memory,
  })
  const pinId = `pin_${(await sha256(`${owner.userId}\u0000${placeId}`)).slice(
    0,
    24
  )}`
  const result = expectedResult(
    await owner.user.createOwnerPin({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      pinId,
      placeId,
      ...(customPlace ? { customPlace } : {}),
      ...timing,
      memory,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    created: !result.idempotent,
    profile: publicProfile(result.profile),
    pin: Object.freeze({
      pinId: result.pin.pinId,
      ...(customPlace ? place : projectCatalogPlace(place)),
      ...publicPinTiming(result.pin),
      memory: ownerPinMemory(result.pin),
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
  let patch =
    input.patch.visitedYears !== undefined ||
    input.patch.visitedDates !== undefined
      ? Object.freeze({ ...input.patch, ...publicPinTiming(input.patch) })
      : input.patch
  if (patch.placeId) {
    await assertCatalogPlace(patch.placeId, catalogResolver, environment)
    patch = Object.freeze({ ...patch, customPlace: null })
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
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    profile: publicProfile(result.profile),
    pins: Object.freeze(result.pins.map(publicOwnerPin)),
    wishlist: Object.freeze(result.wishes || []),
    plans: Object.freeze(result.plans || []),
  })
}

export async function deleteMyAccount({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const identityDigest = await hashQualifiedIdentity(identity)
  const operationDigest = await hashOperatorOperation(
    identityDigest,
    input.idempotencyKey,
    "delete-account"
  )
  const requestDigest = await sha256(
    JSON.stringify({
      action: "delete-account",
      expectedRevision: input.expectedRevision,
      confirmation: input.confirmation,
    })
  )
  const registry = requireNamespace(
    environment,
    "MY_ATLAS_REGISTRY"
  ).getByName(REGISTRY_OBJECT_NAME)

  let userId
  let registryDeleted = false
  const registration = await registry.getRegistrationByIdentity(identityDigest)
  if (registration?.ok === true && registration.state === "active") {
    userId = registration.userId
  } else {
    const deletion = expectedResult(
      await registry.getAccountDeletion(operationDigest, requestDigest)
    )
    userId = deletion.userId
    registryDeleted = true
  }

  const user = requireNamespace(environment, "MY_ATLAS_USERS").getByName(userId)
  if (!registryDeleted) {
    expectedResult(
      await user.prepareOwnerDeletion({
        identityDigest,
        operationDigest,
        requestDigest,
        expectedRevision: input.expectedRevision,
        now,
      })
    )
    expectedResult(
      await registry.deleteActiveRegistration({
        userId,
        identityDigest,
        operationDigest,
        requestDigest,
        now,
      })
    )
  }
  const completed = expectedResult(
    await user.finalizeOwnerDeletion({ operationDigest, requestDigest, now })
  )
  return Object.freeze({
    deleted: true,
    idempotent: registryDeleted || completed.idempotent === true,
    deletedAt: completed.deletedAt,
  })
}
