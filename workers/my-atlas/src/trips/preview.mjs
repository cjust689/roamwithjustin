import {
  assertCanonicalTrip,
  validTripPlace,
} from "../../../../shared/my-atlas-trips.mjs"
import { sha256 } from "../registration/hashing.mjs"
import {
  AccountConflictError,
  AccountServiceError,
  ownerContext,
} from "../account/service.mjs"
import { WorkerPlaceCatalog } from "../catalog/store.mjs"
import { projectCatalogPlace } from "../catalog/projection.mjs"

const clone = value => JSON.parse(JSON.stringify(value))
const emptyDates = () => ({ arrival: null, departure: null })

// Builds candidates only. This module has no persistence, alarm or write calls.
export async function previewTripUpgrade(
  source,
  { resolvePlace, digest = sha256 }
) {
  if (
    !source?.profile?.userId ||
    !Number.isInteger(source.profile.revision) ||
    !Array.isArray(source.pins) ||
    !Array.isArray(source.plans) ||
    !Array.isArray(source.wishes)
  )
    throw new AccountServiceError()
  if (
    source.pins.length > 300 ||
    source.plans.length > 1 ||
    source.wishes.length > 250 ||
    source.pins.length !== (source.profile.pinCount || 0) ||
    source.plans.length !== (source.profile.planCount || 0) ||
    source.wishes.length !== (source.profile.wishCount || 0)
  )
    throw new AccountServiceError()
  const sourceSnapshot = {
    userId: source.profile.userId,
    revision: source.profile.revision,
    pins: source.pins,
    plans: source.plans,
    wishes: source.wishes,
    atlasImage: source.atlasImage || null,
  }
  if (
    new Set(source.pins.map(pin => pin.pinId)).size !== source.pins.length ||
    new Set(source.plans.map(plan => plan.planId)).size !== source.plans.length
  )
    throw new AccountServiceError()
  const trips = [],
    mappings = [],
    issues = []
  const id = async (prefix, key, length = 32) =>
    `${prefix}_${(await digest(`${source.profile.userId}\0${key}`)).slice(0, length)}`
  const stop = async (key, place, sourceRecord) => {
    if (!validTripPlace(place)) throw new Error("place_unavailable")
    const memories = sourceRecord.memory
      ? [
          {
            memoryId: await id("memory", `${key}:memory`),
            kind: "note",
            text: sourceRecord.memory,
            mediaId: null,
            createdAt: sourceRecord.createdAt,
            updatedAt: sourceRecord.updatedAt,
          },
        ]
      : []
    return {
      stopId: await id("stop", key),
      place: clone(place),
      plannedDates: emptyDates(),
      actualDates: emptyDates(),
      visitedDates: clone(
        sourceRecord.visitedDates ||
          (sourceRecord.visitedYears || []).map(year => ({ year }))
      ),
      planNote: "",
      memories,
      experiences: clone(sourceRecord.experiences || []),
      createdAt: sourceRecord.createdAt,
      updatedAt: sourceRecord.updatedAt,
    }
  }
  const trip = (tripId, title, lifecycle, workflow, stops, record, kind) => ({
    schemaVersion: 1,
    tripId,
    title,
    lifecycle,
    workflow,
    description: kind === "plan" ? record.note || "" : "",
    stops,
    memories: [],
    logistics: { flights: [], rentals: [] },
    sharing: { publicAtlas: kind === "pin" && source.profile.public === true },
    version: 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    statusChangedAt: null,
    legacy: {
      source: kind,
      sourceId: kind === "pin" ? record.pinId : record.planId,
      snapshot: clone(record),
    },
  })
  for (const pin of [...source.pins].sort((a, b) =>
    a.pinId.localeCompare(b.pinId)
  )) {
    try {
      const place = pin.customPlace
        ? {
            placeId: pin.placeId,
            placeType: "custom",
            ...clone(pin.customPlace),
          }
        : await resolvePlace(pin.placeId)
      const occurrence = await stop(`pin:${pin.pinId}`, place, pin)
      const candidate = trip(
        await id("trip", `pin:${pin.pinId}`, 24),
        place.name,
        "past",
        "saved",
        [occurrence],
        pin,
        "pin"
      )
      assertCanonicalTrip(candidate)
      trips.push(candidate)
      mappings.push({
        source: "pin",
        sourceId: pin.pinId,
        tripId: candidate.tripId,
        stopIds: [occurrence.stopId],
      })
    } catch {
      issues.push({
        source: "pin",
        sourceId: pin.pinId,
        code: "source_needs_review",
      })
    }
  }
  for (const plan of source.plans) {
    try {
      // Origin/finish remain legacy route details, never fabricated visited stops.
      const stops = await Promise.all(
        plan.stops.map((place, index) =>
          stop(`plan:${plan.planId}:${index}`, place, {
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
          })
        )
      )
      const candidate = trip(
        plan.planId,
        plan.title,
        "planned",
        plan.status,
        stops,
        plan,
        "plan"
      )
      assertCanonicalTrip(candidate)
      trips.push(candidate)
      mappings.push({
        source: "plan",
        sourceId: plan.planId,
        tripId: plan.planId,
        stopIds: stops.map(stop => stop.stopId),
      })
    } catch {
      issues.push({
        source: "plan",
        sourceId: plan.planId,
        code: "source_needs_review",
      })
    }
  }
  const fingerprint = await digest(
    JSON.stringify({ sourceSnapshot, trips, issues })
  )
  return {
    schemaVersion: 1,
    revision: source.profile.revision,
    fingerprint,
    ready: !issues.length,
    trips,
    mappings,
    issues,
    counts: {
      sourcePins: source.pins.length,
      sourcePlans: source.plans.length,
      wishesPreserved: source.wishes.length,
      candidateTrips: trips.length,
      candidateStops: trips.reduce(
        (total, trip) => total + trip.stops.length,
        0
      ),
    },
  }
}

export async function getMyTripUpgradePreview({
  environment,
  identity,
  placeCatalog,
}) {
  const owner = await ownerContext(environment, identity)
  const source = await owner.user.exportOwnerState(owner.identityDigest)
  if (source?.ok !== true)
    throw new AccountConflictError(source?.error || "account_not_active")
  const ids = [
    ...new Set(
      source.pins.filter(pin => !pin.customPlace).map(pin => pin.placeId)
    ),
  ]
  const records = ids.length
    ? await (placeCatalog || new WorkerPlaceCatalog(environment)).resolveMany(
        ids
      )
    : []
  const places = new Map(ids.map((id, index) => [id, records[index]]))
  const result = await previewTripUpgrade(source, {
    resolvePlace: async id =>
      places.get(id) ? projectCatalogPlace(places.get(id)) : null,
  })
  // Return a review summary, not private memories, raw backups or image keys.
  return {
    schemaVersion: result.schemaVersion,
    revision: result.revision,
    fingerprint: result.fingerprint,
    ready: result.ready,
    counts: result.counts,
    issues: result.issues,
    groups: result.trips.map(trip => ({
      tripId: trip.tripId,
      title: trip.title,
      lifecycle: trip.lifecycle,
      source: trip.legacy.source,
      sourceId: trip.legacy.sourceId,
      stops: trip.stops.map(stop => ({
        stopId: stop.stopId,
        name: stop.place.name,
      })),
    })),
  }
}
