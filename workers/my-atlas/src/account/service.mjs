import { RegistrationConfigurationError } from "../registration/contracts.mjs"
import { publicInstagramHandle } from "../../../../shared/my-atlas-instagram.mjs"
import { normalizeImageLocation } from "../../../../shared/my-atlas-image-location.mjs"
import {
  hashOperatorOperation,
  hashQualifiedIdentity,
  sha256,
} from "../registration/hashing.mjs"
import { REGISTRY_OBJECT_NAME } from "../registration/service.mjs"
import { projectCatalogPlace } from "../catalog/projection.mjs"
import { WorkerPlaceCatalog, createCatalogResolver } from "../catalog/store.mjs"
import { isNormalizedPinMemory } from "./memory.mjs"
import { validStoredExperiences } from "../../../../shared/my-atlas-experiences.mjs"
import {
  CUSTOM_PLACE_ID_PATTERN,
  isNormalizedCustomPlace,
  projectCustomPlace,
} from "./custom-place.mjs"
import {
  AtlasImageServiceError,
  requireAtlasImageBucket,
  transformAtlasImage,
} from "./atlas-image.mjs"

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
    ...(publicInstagramHandle(profile.instagramHandle)
      ? { instagramHandle: profile.instagramHandle }
      : {}),
    public: profile.public,
    discoverable: profile.discoverable === true,
    status: profile.status,
    pinCount: profile.pinCount || 0,
    wishCount: profile.wishCount || 0,
    planCount: profile.planCount || 0,
    ...(profile.tripSchemaVersion
      ? {
          tripSchemaVersion: profile.tripSchemaVersion,
          tripCount: profile.tripCount || 0,
        }
      : {}),
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

function ownerExperiences(pin) {
  if (!validStoredExperiences(pin.experiences)) throw new AccountServiceError()
  return pin.experiences || []
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
    ...(pin.experiences === undefined
      ? {}
      : { experiences: ownerExperiences(pin) }),
  })
}

function ownerAtlasImageMetadata(atlasImage) {
  if (!atlasImage) return null
  return Object.freeze({
    imageId: atlasImage.imageId,
    ...(atlasImage.location ? { location: atlasImage.location } : {}),
    contentType: atlasImage.contentType,
    width: atlasImage.width,
    height: atlasImage.height,
    byteLength: atlasImage.byteLength,
    publicProfile: atlasImage.publicProfile === true,
    updatedAt: atlasImage.updatedAt,
  })
}

async function projectOwnerPins(pins, placeCatalog, environment) {
  const catalogPins = pins.filter(
    pin => !pin.placeSnapshot && !CUSTOM_PLACE_ID_PATTERN.test(pin.placeId)
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
    const place =
      pin.placeSnapshot ||
      (CUSTOM_PLACE_ID_PATTERN.test(pin.placeId)
        ? projectCustomPlace(pin.placeId, pin.customPlace)
        : projectCatalogPlace(recordsByPlaceId.get(pin.placeId)))
    return Object.freeze({
      pinId: pin.pinId,
      ...(pin.ungrouped !== undefined
        ? {
            ungrouped: pin.ungrouped,
            tripIds: pin.tripIds || [],
            ...(pin.ungroupedVisitIds
              ? { ungroupedVisitIds: pin.ungroupedVisitIds }
              : {}),
          }
        : {}),
      ...place,
      ...publicPinTiming(pin),
      memory: ownerPinMemory(pin),
      ...(pin.experiences === undefined
        ? {}
        : { experiences: ownerExperiences(pin) }),
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
    atlasImage: ownerAtlasImageMetadata(result.atlasImage),
  })
}

export async function getMyAtlasImage({ environment, identity }) {
  const owner = await ownerContext(environment, identity)
  const result = expectedResult(
    await owner.user.getOwnerAtlasImage(owner.identityDigest)
  )
  if (!result.atlasImage) {
    throw new AccountConflictError("atlas_image_not_found")
  }
  let object
  try {
    object = await requireAtlasImageBucket(environment).get(
      result.atlasImage.storageKey
    )
  } catch {
    throw new AtlasImageServiceError()
  }
  if (
    !object ||
    !object.body ||
    object.size !== result.atlasImage.byteLength ||
    object.httpMetadata?.contentType !== "image/webp"
  ) {
    throw new AtlasImageServiceError()
  }
  return Object.freeze({
    profile: publicProfile(result.profile),
    atlasImage: ownerAtlasImageMetadata(result.atlasImage),
    object,
  })
}

export async function replaceMyAtlasImage({
  environment,
  identity,
  input,
  upload,
  imageTransformer = transformAtlasImage,
  imageIdFactory = () => `image_${crypto.randomUUID().replaceAll("-", "")}`,
  now = new Date().toISOString(),
}) {
  const location = normalizeImageLocation(input.location)
  if (!location) throw new AccountConflictError("atlas_image_location_required")
  const owner = await ownerContext(environment, identity)
  const transformed = await imageTransformer({
    ...upload,
    images: environment.IMAGES,
  })
  const imageId = imageIdFactory()
  const storageKey = `private/atlas/${owner.userId}/${imageId}.webp`
  const atlasImage = Object.freeze({
    schemaVersion: 1,
    imageId,
    storageKey,
    sourceSha256: transformed.sourceSha256,
    contentType: transformed.contentType,
    width: transformed.width,
    height: transformed.height,
    byteLength: transformed.byteLength,
    publicProfile: false,
    location,
    createdAt: now,
    updatedAt: now,
  })
  const mutation = await mutationMetadata(owner, input, "replace-atlas-image", {
    sourceSha256: transformed.sourceSha256,
    location,
  })
  const bucket = requireAtlasImageBucket(environment)
  let stored = false
  try {
    const object = await bucket.put(storageKey, transformed.bytes, {
      onlyIf: { etagDoesNotMatch: "*" },
      httpMetadata: {
        contentType: "image/webp",
        contentDisposition: "inline",
        cacheControl: "private, no-store",
      },
      customMetadata: { mediaKind: "atlas-cover-v1" },
    })
    if (!object || object.size !== transformed.byteLength) {
      throw new AtlasImageServiceError()
    }
    stored = true
    const result = expectedResult(
      await owner.user.replaceOwnerAtlasImage({
        identityDigest: owner.identityDigest,
        expectedRevision: input.expectedRevision,
        image: atlasImage,
        now,
        ...mutation,
      })
    )
    if (result.idempotent) {
      await bucket.delete(storageKey)
    } else if (result.previousAtlasImage) {
      try {
        await bucket.delete(result.previousAtlasImage.storageKey)
      } catch {
        console.error(
          JSON.stringify({ event: "atlas_image_replacement_cleanup_failed" })
        )
      }
    }
    return Object.freeze({
      idempotent: result.idempotent,
      profile: publicProfile(result.profile),
      atlasImage: ownerAtlasImageMetadata(result.atlasImage),
    })
  } catch (error) {
    if (stored) {
      try {
        await bucket.delete(storageKey)
      } catch {
        console.error(JSON.stringify({ event: "atlas_image_rollback_failed" }))
      }
    }
    throw error
  }
}

export async function updateMyAtlasImageVisibility({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const owner = await ownerContext(environment, identity)
  const mutation = await mutationMetadata(
    owner,
    input,
    "update-atlas-image-visibility",
    {
      ...(input.publicProfile === undefined
        ? {}
        : { publicProfile: input.publicProfile }),
      ...(input.location === undefined ? {} : { location: input.location }),
    }
  )
  const result = expectedResult(
    await owner.user.updateOwnerAtlasImageVisibility({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      publicProfile: input.publicProfile,
      location: input.location,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    idempotent: result.idempotent,
    profile: publicProfile(result.profile),
    atlasImage: ownerAtlasImageMetadata(result.atlasImage),
  })
}

export async function removeMyAtlasImage({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const owner = await ownerContext(environment, identity)
  const mutation = await mutationMetadata(owner, input, "remove-atlas-image", {
    remove: true,
  })
  const result = expectedResult(
    await owner.user.removeOwnerAtlasImage({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      now,
      ...mutation,
    })
  )
  try {
    await requireAtlasImageBucket(environment).delete(
      result.removedAtlasImage.storageKey
    )
  } catch {
    console.error(
      JSON.stringify({ event: "atlas_image_removal_cleanup_failed" })
    )
  }
  return Object.freeze({
    idempotent: result.idempotent,
    profile: publicProfile(result.profile),
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
    schemaVersion: result.trips ? 3 : 2,
    exportedAt: new Date().toISOString(),
    profile: publicProfile(result.profile),
    pins: Object.freeze(result.pins.map(publicOwnerPin)),
    wishlist: Object.freeze(result.wishes || []),
    plans: Object.freeze(result.plans || []),
    ...(result.trips
      ? {
          trips: result.trips,
          ungroupedVisits: result.ungroupedVisits || [],
          destinations: (result.destinations || []).map(publicOwnerPin),
          tripUpgrade: {
            schemaVersion: result.tripUpgrade.schemaVersion,
            upgradedAt: result.tripUpgrade.upgradedAt,
            rollbackAvailable: Boolean(result.tripUpgrade.rollbackSnapshot),
          },
          ...(result.tripUpgrade.rollbackSnapshot
            ? {
                tripRollbackSnapshot: {
                  profile: publicProfile(
                    result.tripUpgrade.rollbackSnapshot.source.profile
                  ),
                  pins: result.tripUpgrade.rollbackSnapshot.source.pins,
                  wishlist: result.tripUpgrade.rollbackSnapshot.source.wishes,
                  plans: result.tripUpgrade.rollbackSnapshot.source.plans,
                },
              }
            : {}),
        }
      : {}),
    atlasImage: ownerAtlasImageMetadata(result.atlasImage),
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
      ...(input.accountId === undefined ? {} : { accountId: input.accountId }),
    })
  )
  const registry = requireNamespace(environment, "MY_ATLAS_REGISTRY").getByName(
    REGISTRY_OBJECT_NAME
  )

  let userId
  let registryDeleted = false
  const priorDeletion = await registry.getAccountDeletion(
    operationDigest,
    requestDigest
  )
  if (priorDeletion?.ok === true) {
    userId = priorDeletion.userId
    registryDeleted = true
  } else {
    if (priorDeletion?.error !== "account_deletion_not_found")
      expectedResult(priorDeletion)
    const registration = expectedResult(
      await registry.getRegistrationByIdentity(identityDigest)
    )
    if (registration.state !== "active")
      throw new AccountConflictError("account_not_active")
    userId = registration.userId
  }
  if (input.accountId && input.accountId !== userId)
    throw new AccountConflictError("account_changed")

  const user = requireNamespace(environment, "MY_ATLAS_USERS").getByName(userId)
  const mediaResult = await user.getOwnerAtlasImageForDeletion(identityDigest)
  const atlasImage = mediaResult?.ok
    ? mediaResult.atlasImage
    : registryDeleted && mediaResult?.error === "forbidden"
      ? null
      : expectedResult(mediaResult).atlasImage
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
  if (atlasImage) {
    try {
      await requireAtlasImageBucket(environment).delete(atlasImage.storageKey)
    } catch {
      throw new AtlasImageServiceError()
    }
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
