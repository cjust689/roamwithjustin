import { sha256 } from "../registration/hashing.mjs"
import { projectCatalogPlace } from "../catalog/projection.mjs"
import { WorkerPlaceCatalog } from "../catalog/store.mjs"
import {
  CUSTOM_PLACE_ID_PATTERN,
  projectCustomPlace,
} from "../account/custom-place.mjs"
import {
  AccountConflictError,
  AccountServiceError,
  assertCatalogPlace,
  mutationMetadata,
  ownerContext,
  publicProfile,
} from "../account/service.mjs"

function expectedPlanningResult(result) {
  if (!result || typeof result !== "object") {
    throw new AccountServiceError()
  }
  if (result.ok !== true) {
    throw new AccountConflictError(result.error)
  }
  return result
}

function routeReadiness(place) {
  if (place.placeType === "custom") return "user-coordinate-review"
  if (place.placeType === "city") return "route-ready"
  return "needs-entrance-selection"
}

function projectWish(wish, record) {
  const place = CUSTOM_PLACE_ID_PATTERN.test(wish.placeId)
    ? projectCustomPlace(wish.placeId, wish.customPlace)
    : projectCatalogPlace(record)
  return Object.freeze({
    wishId: wish.wishId,
    ...place,
    note: wish.note,
    priority: wish.priority,
    desiredYear: wish.desiredYear,
    routeReadiness: routeReadiness(place),
    createdAt: wish.createdAt,
    updatedAt: wish.updatedAt,
  })
}

async function projectWishes(wishes, placeCatalog, environment) {
  const catalogWishes = wishes.filter(
    wish => !CUSTOM_PLACE_ID_PATTERN.test(wish.placeId)
  )
  let records = []
  if (catalogWishes.length) {
    const catalog = placeCatalog || new WorkerPlaceCatalog(environment)
    records = await catalog.resolveMany(catalogWishes.map(wish => wish.placeId))
  }
  const recordsByPlaceId = new Map(
    catalogWishes.map((wish, index) => [wish.placeId, records[index]])
  )
  return wishes.map(wish => projectWish(wish, recordsByPlaceId.get(wish.placeId)))
}

function planSnapshot(wish, catalogRevision) {
  return Object.freeze({
    placeId: wish.placeId,
    placeType: wish.placeType,
    name: wish.name,
    ...(wish.countryCode ? { countryCode: wish.countryCode } : {}),
    ...(wish.admin1Name ? { admin1Name: wish.admin1Name } : {}),
    ...(wish.countryName ? { countryName: wish.countryName } : {}),
    ...(wish.spotCategory ? { spotCategory: wish.spotCategory } : {}),
    ...(wish.spotKind ? { spotKind: wish.spotKind } : {}),
    coordinates: Object.freeze([...wish.coordinates]),
    routeReadiness: wish.routeReadiness,
    ...(wish.placeType === "custom" ? {} : { catalogRevision }),
    sourceWishId: wish.wishId,
  })
}

async function snapshotsForPlan(owner, input, placeCatalog, environment) {
  const uniqueWishIds = [...new Set([input.startWishId, ...input.stopWishIds])]
  const result = expectedPlanningResult(
    await owner.user.getOwnerWishesByIds({
      identityDigest: owner.identityDigest,
      wishIds: uniqueWishIds,
    })
  )
  const projected = await projectWishes(result.wishes, placeCatalog, environment)
  const byId = new Map(projected.map(wish => [wish.wishId, wish]))
  let catalogRevision = "custom-only"
  if (projected.some(wish => wish.placeType !== "custom")) {
    const catalog = placeCatalog || new WorkerPlaceCatalog(environment)
    const manifest = await catalog.manifest()
    catalogRevision = manifest.catalogRevision
  }
  return Object.freeze({
    start: planSnapshot(byId.get(input.startWishId), catalogRevision),
    stops: Object.freeze(
      input.stopWishIds.map(wishId => planSnapshot(byId.get(wishId), catalogRevision))
    ),
  })
}

export async function listMyWishes({ environment, identity, input, placeCatalog }) {
  const owner = await ownerContext(environment, identity)
  const result = expectedPlanningResult(
    await owner.user.listOwnerWishes({
      identityDigest: owner.identityDigest,
      ...input,
    })
  )
  const wishes = await projectWishes(result.wishes, placeCatalog, environment)
  return Object.freeze({
    profile: publicProfile(result.profile),
    wishes: Object.freeze(wishes),
    nextCursor: result.nextCursor,
  })
}

export async function createMyWish({
  environment,
  identity,
  input,
  catalogResolver,
  now = new Date().toISOString(),
}) {
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
  const wishId = `wish_${(
    await sha256(`${owner.userId}\u0000${placeId}\u0000wishlist`)
  ).slice(0, 24)}`
  const mutation = await mutationMetadata(owner, input, "create-wish", {
    placeId,
    note: input.note,
    priority: input.priority,
    desiredYear: input.desiredYear,
  })
  const result = expectedPlanningResult(
    await owner.user.createOwnerWish({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      wishId,
      placeId,
      ...(customPlace ? { customPlace } : {}),
      note: input.note,
      priority: input.priority,
      desiredYear: input.desiredYear,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    created: !result.idempotent,
    profile: publicProfile(result.profile),
    wish: projectWish(
      result.wish,
      customPlace ? undefined : place
    ),
  })
}

export async function updateMyWish({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const owner = await ownerContext(environment, identity)
  const mutation = await mutationMetadata(
    owner,
    input,
    `update-wish:${input.wishId}`,
    input.patch
  )
  const result = expectedPlanningResult(
    await owner.user.updateOwnerWish({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      wishId: input.wishId,
      patch: input.patch,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    idempotent: result.idempotent,
    profile: publicProfile(result.profile),
    wish: result.wish,
  })
}

export async function deleteMyWish({
  environment,
  identity,
  input,
  now = new Date().toISOString(),
}) {
  const owner = await ownerContext(environment, identity)
  const mutation = await mutationMetadata(
    owner,
    input,
    `delete-wish:${input.wishId}`,
    { wishId: input.wishId }
  )
  const result = expectedPlanningResult(
    await owner.user.deleteOwnerWish({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      wishId: input.wishId,
      now,
      ...mutation,
    })
  )
  return Object.freeze({ profile: publicProfile(result.profile) })
}

export async function listMyPlans({ environment, identity }) {
  const owner = await ownerContext(environment, identity)
  const result = expectedPlanningResult(
    await owner.user.listOwnerPlans(owner.identityDigest)
  )
  return Object.freeze({
    profile: publicProfile(result.profile),
    plans: Object.freeze(result.plans),
  })
}

async function writePlan({
  environment,
  identity,
  input,
  placeCatalog,
  now,
  replace,
}) {
  const owner = await ownerContext(environment, identity)
  const snapshots = await snapshotsForPlan(owner, input, placeCatalog, environment)
  const planId = replace
    ? input.planId
    : `plan_${(
        await sha256(`${owner.userId}\u0000first-private-plan`)
      ).slice(0, 24)}`
  const value = {
    planId,
    title: input.title,
    status: input.status,
    desiredYear: input.desiredYear,
    note: input.note,
    ...snapshots,
    endMode: input.endMode,
  }
  const mutation = await mutationMetadata(
    owner,
    input,
    `${replace ? "replace" : "create"}-plan:${planId}`,
    value
  )
  const method = replace ? "replaceOwnerPlan" : "createOwnerPlan"
  const result = expectedPlanningResult(
    await owner.user[method]({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      ...value,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    created: replace ? false : !result.idempotent,
    profile: publicProfile(result.profile),
    plan: result.plan,
  })
}

export async function createMyPlan(options) {
  return writePlan({ ...options, now: options.now || new Date().toISOString(), replace: false })
}

export async function replaceMyPlan(options) {
  return writePlan({ ...options, now: options.now || new Date().toISOString(), replace: true })
}

async function mutatePlan({ environment, identity, input, now, action }) {
  const owner = await ownerContext(environment, identity)
  const mutation = await mutationMetadata(
    owner,
    input,
    `${action}-plan:${input.planId}`,
    { planId: input.planId }
  )
  const method = action === "keep" ? "keepOwnerPlan" : "deleteOwnerPlan"
  const result = expectedPlanningResult(
    await owner.user[method]({
      identityDigest: owner.identityDigest,
      expectedRevision: input.expectedRevision,
      planId: input.planId,
      now,
      ...mutation,
    })
  )
  return Object.freeze({
    profile: publicProfile(result.profile),
    ...(result.plan ? { plan: result.plan } : {}),
  })
}

export async function keepMyPlan(options) {
  return mutatePlan({ ...options, now: options.now || new Date().toISOString(), action: "keep" })
}

export async function deleteMyPlan(options) {
  return mutatePlan({ ...options, now: options.now || new Date().toISOString(), action: "delete" })
}
