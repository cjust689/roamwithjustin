import { normalizeExpectedRevision } from "../account/contracts.mjs"
import {
  normalizeIdempotencyKey,
  RegistrationValidationError,
} from "../registration/contracts.mjs"
import { normalizePinMemory } from "../account/memory.mjs"
import { normalizeCustomPlace } from "../account/custom-place.mjs"
import {
  ownerContext,
  mutationMetadata,
  publicProfile,
  assertCatalogPlace,
} from "../account/service.mjs"
import { projectCatalogPlace } from "../catalog/projection.mjs"
import { WorkerPlaceCatalog } from "../catalog/store.mjs"
import { sha256 } from "../registration/hashing.mjs"
import { previewTripUpgrade } from "./preview.mjs"
import { normalizeExperienceChange } from "../../../../shared/my-atlas-experiences.mjs"
import { normalizeTripTravelDraft } from "../../../../shared/my-atlas-trip-logistics.mjs"
import {
  validTripCalendarDate,
  TRIP_RETENTION_POLICY,
} from "../../../../shared/my-atlas-trips.mjs"

export { TRIP_RETENTION_POLICY }
export class TripApiError extends Error {
  constructor(code, status = 409) {
    super("The trip request could not be completed.")
    this.code = code
    this.status = status
  }
}
const bad = () => {
  throw new RegistrationValidationError("Trip details are invalid.")
}
const object = (value, fields) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(key => !fields.includes(key))
  )
    bad()
  return value
}
const text = (value, max, required = false) => {
  const normalized = normalizePinMemory(value === undefined ? "" : value)
  if (
    normalized === null ||
    normalized.length > max ||
    (required && !normalized)
  )
    bad()
  return normalized
}
const ids = (value, pattern) => {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 50 ||
    value.some(id => typeof id !== "string" || !pattern.test(id))
  )
    bad()
  return value
}
const tripId = /^(?:trip|plan)_[a-f0-9]{24}$/
const stopId = /^stop_[a-f0-9]{32}$/
const checked = result => {
  if (!result?.ok)
    throw new TripApiError(
      result?.error || "trip_unavailable",
      result?.error === "revision_conflict" ? 412 : 409
    )
  return result
}

export function matchTripRoute(path) {
  const base = "/v1/me/trips"
  if (path === `${base}/visits/transfer`)
    return { action: "transfer", methods: ["POST"] }
  const standalone = path.match(
    /^\/v1\/me\/trips\/visits\/(stop_[a-f0-9]{32})$/
  )
  if (standalone)
    return { action: "visit-edit", stopId: standalone[1], methods: ["PATCH"] }
  if (path === base) return { action: "collection", methods: ["GET", "POST"] }
  for (const action of ["upgrade", "rollback", "combine", "group-destinations"])
    if (path === `${base}/${action}`) return { action, methods: ["POST"] }
  const match = path.match(
    /^\/v1\/me\/trips\/((?:trip|plan)_[a-f0-9]{24})(?:\/(lifecycle|stops|sharing|logistics)(?:\/(order|stop_[a-f0-9]{32}))?)?$/
  )
  if (!match) return null
  if (!match[2])
    return { action: "trip", tripId: match[1], methods: ["PATCH", "DELETE"] }
  if (match[2] === "lifecycle" && !match[3])
    return { action: "lifecycle", tripId: match[1], methods: ["PATCH"] }
  if (["sharing", "logistics"].includes(match[2]) && !match[3])
    return { action: match[2], tripId: match[1], methods: ["PATCH"] }
  if (match[2] === "stops")
    return {
      action: match[3] === "order" ? "reorder" : match[3] ? "stop" : "stop-add",
      tripId: match[1],
      ...(stopId.test(match[3] || "") ? { stopId: match[3] } : {}),
      methods:
        match[3] === "order"
          ? ["PATCH"]
          : match[3]
            ? ["PATCH", "DELETE"]
            : ["POST"],
    }
  return null
}

export async function tripRequest({
  environment,
  identity,
  route,
  method,
  body,
  headers,
  placeCatalog,
  now = new Date().toISOString(),
}) {
  const owner = await ownerContext(environment, identity)
  if (route.action === "collection" && method === "GET") {
    const state = checked(await owner.user.getOwnerTrips(owner.identityDigest))
    return {
      profile: publicProfile(state.profile),
      upgraded: state.upgraded,
      writesEnabled: environment.MY_ATLAS_TRIP_WRITES_ENABLED === "true",
      trips: state.trips,
      destinations: state.destinations,
      ungroupedVisits: state.ungroupedVisits,
      legacyPlans: state.legacyPlans,
      rollbackAvailable: state.rollbackAvailable,
    }
  }
  if (environment.MY_ATLAS_TRIP_WRITES_ENABLED !== "true")
    throw new TripApiError("trip_writes_disabled", 503)
  const expectedRevision = normalizeExpectedRevision(headers.get("If-Match")),
    idempotencyKey = normalizeIdempotencyKey(headers.get("Idempotency-Key"))
  let action = route.action,
    input,
    value = {},
    preview
  const stable = async (prefix, label, length = 32) =>
    `${prefix}_${(await sha256(`${owner.userId}\0${idempotencyKey}\0${label}`)).slice(0, length)}`
  const selection = value => {
    object(value, ["placeId", "customPlace"])
    if (Boolean(value.placeId) === Boolean(value.customPlace)) bad()
    if (value.customPlace && !normalizeCustomPlace(value.customPlace)) bad()
    return value
  }
  const place = async input => {
    selection(input)
    if (input.customPlace) {
      const custom = normalizeCustomPlace(input.customPlace)
      return {
        placeId: `custom:${(await sha256(`${owner.userId}\0${custom.name}\0${custom.coordinates.join(",")}\0custom-place`)).slice(0, 24)}`,
        placeType: "custom",
        ...custom,
      }
    }
    const catalog = placeCatalog || new WorkerPlaceCatalog(environment)
    const resolver =
      typeof catalog.resolve === "function"
        ? id => catalog.resolve(id)
        : async id => (await catalog.resolveMany([id]))[0]
    return projectCatalogPlace(
      await assertCatalogPlace(input.placeId, resolver, environment)
    )
  }
  const stop = async (input, label) => ({
    stopId: await stable("stop", label),
    place: await place(input),
    plannedDates: { arrival: null, departure: null },
    actualDates: { arrival: null, departure: null },
    visitedDates: [],
    planNote: "",
    memories: [],
    experiences: [],
    createdAt: now,
    updatedAt: now,
  })
  if (action === "upgrade") {
    input = object(body, [
      "fingerprint",
      "confirmation",
      "retentionAcknowledged",
      "destinationModelVersion",
    ])
    if (
      !/^[a-f0-9]{64}$/.test(input.fingerprint || "") ||
      input.confirmation !== "ORGANIZE MY ATLAS" ||
      input.destinationModelVersion !== 2 ||
      input.retentionAcknowledged !== true
    )
      bad()
    const state = checked(await owner.user.getOwnerTrips(owner.identityDigest))
    if (!state.upgraded) {
      const source = checked(
        await owner.user.exportOwnerState(owner.identityDigest)
      )
      let catalog
      const resolvePlace = async id => {
        catalog ||= placeCatalog || new WorkerPlaceCatalog(environment)
        const record =
          typeof catalog.resolve === "function"
            ? await catalog.resolve(id)
            : (await catalog.resolveMany([id]))[0]
        return record ? projectCatalogPlace(record) : null
      }
      preview = await previewTripUpgrade(source, { resolvePlace })
      if (
        preview.fingerprint !== input.fingerprint ||
        preview.revision !== expectedRevision
      )
        throw new TripApiError("upgrade_source_changed", 412)
      if (!preview.ready) throw new TripApiError("upgrade_needs_review")
    }
    value = { retentionPolicy: TRIP_RETENTION_POLICY }
  } else if (action === "group-destinations") {
    input = object(body, ["pinIds", "title", "tripId"])
    const pinIds = ids(input.pinIds, /^pin_[a-f0-9]{24}$/)
    if (new Set(pinIds).size !== pinIds.length) bad()
    if (input.tripId && !tripId.test(input.tripId)) bad()
    const metadata = await mutationMetadata(
      owner,
      { expectedRevision, idempotencyKey },
      "trip:group-destinations::",
      input
    )
    const replay = checked(
      await owner.user.replayOwnerTripMutation({
        identityDigest: owner.identityDigest,
        expectedRevision,
        now,
        ...metadata,
      })
    )
    if (replay.found)
      return {
        profile: publicProfile(replay.profile),
        upgraded: replay.upgraded,
        trip: replay.trip,
        idempotent: true,
      }
    const state = checked(await owner.user.getOwnerTrips(owner.identityDigest))
    const selected = pinIds.map(id =>
      state.destinations.find(pin => pin.pinId === id)
    )
    if (selected.some(pin => !pin))
      throw new TripApiError("destination_selection_changed")
    const source = {
      profile: {
        ...state.profile,
        pinCount: selected.length,
        planCount: 0,
        wishCount: 0,
      },
      pins: selected,
      plans: [],
      wishes: [],
    }
    const candidates = await previewTripUpgrade(source, {
      resolvePlace: async id => {
        const catalog = placeCatalog || new WorkerPlaceCatalog(environment)
        const record =
          typeof catalog.resolve === "function"
            ? await catalog.resolve(id)
            : (await catalog.resolveMany([id]))[0]
        return record ? projectCatalogPlace(record) : null
      },
    })
    if (!candidates.ready) throw new TripApiError("destination_needs_review")
    const byId = new Map(
      candidates.destinations.map(item => [item.pinId, item])
    )
    for (const item of byId.values()) {
      item.stop.stopId = await stable("stop", `destination:${item.pinId}`)
      for (const [index, memory] of item.stop.memories.entries())
        memory.memoryId = await stable(
          "memory",
          `destination:${item.pinId}:${index}`
        )
    }
    value = {
      destinations: pinIds.map(id => byId.get(id)),
      ...(input.tripId ? { tripId: input.tripId } : {}),
      trip: {
        schemaVersion: 1,
        tripId: await stable("trip", "group", 24),
        title: text(input.title, 80, !input.tripId),
        description: "",
        lifecycle: "past",
        workflow: "saved",
        memories: [],
        logistics: { flights: [], rentals: [] },
        sharing: { publicAtlas: false },
        version: 1,
        createdAt: now,
        updatedAt: now,
        statusChangedAt: null,
      },
    }
  } else if (action === "transfer") {
    input = object(body, ["fromTripId", "targetTripId", "stopIds", "title"])
    if (
      !(input.fromTripId === null || tripId.test(input.fromTripId || "")) ||
      !(input.targetTripId === null || tripId.test(input.targetTripId || "")) ||
      (input.fromTripId === input.targetTripId &&
        !(input.fromTripId === null && input.title))
    )
      bad()
    const selected = ids(input.stopIds, stopId)
    if (new Set(selected).size !== selected.length) bad()
    value = {
      fromTripId: input.fromTripId,
      targetTripId: input.targetTripId,
      stopIds: selected,
    }
    if (input.title !== undefined) {
      if (input.targetTripId !== null) bad()
      value.newTrip = {
        schemaVersion: 1,
        tripId: await stable("trip", "moved-trip", 24),
        title: text(input.title, 80, true),
        description: "",
        lifecycle: "past",
        workflow: "saved",
        memories: [],
        logistics: { flights: [], rentals: [] },
        sharing: { publicAtlas: false },
        version: 1,
        createdAt: now,
        updatedAt: now,
        statusChangedAt: null,
      }
    }
  } else if (action === "sharing") {
    input = object(body, ["publicAtlas"])
    if (typeof input.publicAtlas !== "boolean") bad()
    value = { tripId: route.tripId, publicAtlas: input.publicAtlas }
  } else if (action === "logistics") {
    input = object(body, ["draft"])
    let draft
    try {
      draft = normalizeTripTravelDraft(input.draft)
    } catch {
      bad()
    }
    value = {
      tripId: route.tripId,
      logistics: {
        flights: [
          {
            flightId: `flight_${(await sha256(`${owner.userId}\0${route.tripId}\0main-flight`)).slice(0, 24)}`,
            searchDraft: draft.flights,
          },
        ],
        rentals: [
          {
            rentalId: `rental_${(await sha256(`${owner.userId}\0${route.tripId}\0main-rental`)).slice(0, 24)}`,
            searchDraft: draft.rental,
          },
        ],
      },
    }
  } else if (action === "rollback") input = object(body, [])
  else if (action === "collection") {
    action = "create"
    input = object(body, ["title", "description", "lifecycle", "stops"])
    if (
      !["planned", "past"].includes(input.lifecycle) ||
      !Array.isArray(input.stops) ||
      input.stops.length < 1 ||
      input.stops.length > 50
    )
      bad()
    const stops = await Promise.all(
      input.stops.map((entry, index) => stop(selection(entry), `stop:${index}`))
    )
    value = {
      trip: {
        schemaVersion: 1,
        tripId: await stable("trip", "trip", 24),
        title: text(input.title, 80, true),
        description: text(input.description, 500),
        lifecycle: input.lifecycle,
        workflow: "saved",
        stops,
        memories: [],
        logistics: { flights: [], rentals: [] },
        sharing: { publicAtlas: false },
        version: 1,
        createdAt: now,
        updatedAt: now,
        statusChangedAt: null,
      },
    }
  } else if (action === "trip") {
    if (method === "DELETE") {
      action = "delete"
      input = object(body, ["confirmation"])
      if (input.confirmation !== "DELETE TRIP") bad()
      value = { tripId: route.tripId }
    } else {
      action = "metadata"
      input = object(body, ["title", "description"])
      if (!Object.keys(input).length) bad()
      value = {
        tripId: route.tripId,
        patch: {
          ...(input.title === undefined
            ? {}
            : { title: text(input.title, 80, true) }),
          ...(input.description === undefined
            ? {}
            : { description: text(input.description, 500) }),
        },
      }
    }
  } else if (action === "lifecycle") {
    input = object(body, ["lifecycle"])
    if (!["planned", "past"].includes(input.lifecycle)) bad()
    value = { tripId: route.tripId, lifecycle: input.lifecycle }
  } else if (action === "reorder") {
    input = object(body, ["stopIds"])
    value = { tripId: route.tripId, stopIds: ids(input.stopIds, stopId) }
  } else if (action === "stop-add") {
    input = object(body, ["placeId", "customPlace", "afterStopId"])
    if (input.afterStopId !== undefined && !stopId.test(input.afterStopId))
      bad()
    const selectionInput = {
      ...(input.placeId ? { placeId: input.placeId } : {}),
      ...(input.customPlace ? { customPlace: input.customPlace } : {}),
    }
    value = {
      tripId: route.tripId,
      afterStopId: input.afterStopId || null,
      stop: await stop(selectionInput, "added-stop"),
    }
  } else if (action === "stop" || action === "visit-edit") {
    value = { tripId: route.tripId, stopId: route.stopId }
    if (method === "DELETE") {
      action = "stop-remove"
      input = object(body, ["discardContent"])
      if (
        input.discardContent !== undefined &&
        typeof input.discardContent !== "boolean"
      )
        bad()
      value.discardContent = input.discardContent === true
    } else {
      action = action === "visit-edit" ? "visit-edit" : "stop-edit"
      input = object(body, [
        "memory",
        "experienceChange",
        "plannedDates",
        "actualDates",
      ])
      if (!Object.keys(input).length) bad()
      const patch = {}
      if (input.memory !== undefined) patch.memory = text(input.memory, 500)
      if (input.experienceChange !== undefined) {
        patch.experienceChange = normalizeExperienceChange(
          input.experienceChange
        )
        if (!patch.experienceChange) bad()
      }
      for (const field of ["plannedDates", "actualDates"])
        if (input[field] !== undefined) {
          const dates = object(input[field], ["arrival", "departure"])
          if (
            !validTripCalendarDate(dates.arrival) ||
            !validTripCalendarDate(dates.departure) ||
            (dates.arrival &&
              dates.departure &&
              dates.arrival > dates.departure)
          )
            bad()
          patch[field] = dates
        }
      value = {
        ...value,
        patch,
        memoryId: await stable(
          "memory",
          `${route.tripId}:${route.stopId}:favorite`
        ),
      }
    }
  } else if (action === "combine") {
    input = object(body, ["tripIds", "title"])
    const selected = ids(input.tripIds, tripId)
    value = {
      tripIds: selected,
      title: text(input.title, 80, true),
      combinedId: await stable("trip", "combined", 24),
      descriptionIds: await Promise.all(
        selected.map(id => stable("memory", `description:${id}`))
      ),
    }
  } else bad()
  const metadata = await mutationMetadata(
    owner,
    { expectedRevision, idempotencyKey },
    `trip:${action}:${route.tripId || ""}:${route.stopId || ""}`,
    input
  )
  const result = checked(
    await owner.user.mutateOwnerTrip({
      identityDigest: owner.identityDigest,
      expectedRevision,
      now,
      action,
      value,
      preview,
      ...metadata,
    })
  )
  return {
    profile: publicProfile(result.profile),
    upgraded: result.upgraded,
    ...(result.trip ? { trip: result.trip } : {}),
    ...(result.tripCount === undefined ? {} : { tripCount: result.tripCount }),
    idempotent: result.idempotent,
  }
}
