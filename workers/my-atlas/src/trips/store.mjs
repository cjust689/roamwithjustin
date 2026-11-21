import {
  assertCanonicalTrip,
  transitionTripLifecycle,
  reorderTripStops,
  removeEmptyTripStop,
  TRIP_RETENTION_POLICY,
  tripPlaceProjection,
} from "../../../../shared/my-atlas-trips.mjs"
import { applyExperienceChange } from "../../../../shared/my-atlas-experiences.mjs"

export const TRIP_MARKER = "trip-schema"
export const TRIP_BACKUP = "trip-upgrade-backup"
const key = id => `trip:${id}`
const fail = error => ({ ok: false, error })
const copy = value => JSON.parse(JSON.stringify(value))
// Keep individual SQLite KV values below 2 MiB and bound full-collection reads.
export function assertTripStorageBudget(trips, backup = null) {
  const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length
  if (
    trips.some(trip => bytes(trip) > 1024 * 1024) ||
    bytes(trips) > 4 * 1024 * 1024 ||
    (backup && bytes(backup) > 1536 * 1024)
  )
    throw Error("trip_storage_limit")
}
export const storedTrips = storage =>
  Array.from(
    storage.kv.list({ prefix: "trip:", limit: 502 }),
    ([, value]) => value
  )

function validCollection(trips) {
  assertTripStorageBudget(trips)
  if (trips.length > 501) throw Error("trip_limit_reached")
  const tripIds = new Set(),
    stopIds = new Set(),
    memoryIds = new Set()
  const pastPlaces = new Set(
    trips
      .filter(trip => trip.lifecycle === "past")
      .flatMap(trip => trip.stops.map(stop => stop.place.placeId))
  )
  if (pastPlaces.size > 300) throw Error("visited_place_limit")
  for (const trip of trips) {
    assertCanonicalTrip(trip)
    if (tripIds.has(trip.tripId)) throw Error("duplicate_trip")
    tripIds.add(trip.tripId)
    for (const stop of trip.stops) {
      if (stopIds.has(stop.stopId)) throw Error("duplicate_stop")
      stopIds.add(stop.stopId)
    }
    for (const memory of [
      ...trip.memories,
      ...trip.stops.flatMap(stop => stop.memories),
    ]) {
      if (memoryIds.has(memory.memoryId)) throw Error("duplicate_memory")
      memoryIds.add(memory.memoryId)
    }
  }
}

// Compatibility geography is derived, never maintained as another editable store.
export function tripPins(storage, { publicOnly = false } = {}) {
  const byPlace = new Map()
  for (const trip of storedTrips(storage).sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || a.tripId.localeCompare(b.tripId)
  )) {
    if (trip.lifecycle !== "past" || (publicOnly && !trip.sharing.publicAtlas))
      continue
    for (const stop of trip.stops) {
      const favorite = stop.memories.find(
        memory =>
          memory.kind === "note" && (!publicOnly || memory.publicAtlas === true)
      )
      const existing = byPlace.get(stop.place.placeId)
      if (existing) {
        existing.visitedDates = [
          ...new Map(
            [...existing.visitedDates, ...stop.visitedDates].map(date => [
              `${date.year}/${date.month || ""}`,
              date,
            ])
          ).values(),
        ]
        existing.visitedYears = [
          ...new Set(existing.visitedDates.map(date => date.year)),
        ]
        continue
      }
      const pin = {
        schemaVersion: 4,
        pinId: `pin_${stop.stopId.slice(5, 29)}`,
        placeId: stop.place.placeId,
        placeSnapshot: tripPlaceProjection(stop.place),
        visitedDates: copy(stop.visitedDates),
        visitedYears: [...new Set(stop.visitedDates.map(date => date.year))],
        memory: favorite?.text || "",
        experiences: [],
        createdAt: stop.createdAt,
        updatedAt: stop.updatedAt,
      }
      if (stop.place.placeType === "custom")
        pin.customPlace = {
          name: stop.place.name,
          coordinates: [...stop.place.coordinates],
        }
      byPlace.set(pin.placeId, pin)
    }
  }
  return [...byPlace.values()]
}

function resultFor(storage, profile, receipt, idempotent = false) {
  const marker = storage.kv.get(TRIP_MARKER)
  if (receipt.action === "rollback")
    return marker ||
      (receipt.revision !== undefined && receipt.revision !== profile.revision)
      ? fail("rollback_superseded")
      : { ok: true, idempotent, profile, upgraded: false }
  if (!marker) return fail("upgrade_rolled_back")
  const trip = receipt.tripId ? storage.kv.get(key(receipt.tripId)) : null
  if (receipt.tripId && !trip) return fail("trip_not_found")
  return {
    ok: true,
    idempotent,
    profile,
    upgraded: true,
    ...(trip ? { trip } : {}),
    ...(receipt.action === "upgrade"
      ? { tripCount: storedTrips(storage).length }
      : {}),
  }
}

function canonicalCandidate(trip, wasPublic) {
  const candidate = copy(trip)
  // Source backups are held in one explicit rollback snapshot, not duplicated
  // in active trips or mutation receipts after a private entry is removed.
  const original = candidate.legacy.snapshot
  candidate.legacy = {
    source: candidate.legacy.source,
    sourceId: candidate.legacy.sourceId,
  }
  if (candidate.legacy.source === "plan") {
    const details = { ...original }
    for (const field of [
      "schemaVersion",
      "planId",
      "title",
      "note",
      "stops",
      "createdAt",
      "updatedAt",
      "status",
    ])
      delete details[field]
    candidate.legacy.routeDetails = details
  } else
    for (const stop of candidate.stops)
      for (const memory of stop.memories) memory.publicAtlas = wasPublic
  return candidate
}

export function mutateTripStore(
  storage,
  profile,
  command,
  { source, alarm } = {}
) {
  const publicFootprint = () =>
    JSON.stringify(
      tripPins(storage, { publicOnly: true }).map(pin => ({
        place: pin.placeSnapshot,
        dates: pin.visitedDates,
        memory: pin.memory,
      }))
    )
  const beforePublic = publicFootprint()
  const receiptKey = `trip-operation:${command.operationDigest}`
  const receipt = storage.kv.get(receiptKey)
  if (receipt)
    return receipt.requestDigest !== command.requestDigest
      ? fail("idempotency_conflict")
      : {
          ...resultFor(storage, profile, receipt, true),
          ...(receipt.action === "rollback"
            ? { restoreAlarm: receipt.restoreAlarm }
            : {}),
        }
  if (profile.revision !== command.expectedRevision)
    return fail("revision_conflict")
  const marker = storage.kv.get(TRIP_MARKER)
  const value = command.value || {}
  let trips = storedTrips(storage),
    targetId = null,
    nextProfile,
    nextAlarm = null
  if (command.action === "upgrade") {
    if (value.retentionPolicy !== TRIP_RETENTION_POLICY)
      return fail("retention_acknowledgement_required")
    if (marker) return fail("already_upgraded")
    if (
      !source?.ok ||
      !command.preview?.ready ||
      command.preview.revision !== profile.revision ||
      command.preview.trips.length !== source.pins.length + source.plans.length
    )
      return fail("upgrade_source_changed")
    const originals = new Map([
      ...source.pins.map(record => [record.pinId, record]),
      ...source.plans.map(record => [record.planId, record]),
    ])
    if (
      command.preview.trips.some(
        trip =>
          JSON.stringify(trip.legacy?.snapshot) !==
          JSON.stringify(originals.get(trip.legacy?.sourceId))
      )
    )
      return fail("upgrade_source_changed")
    trips = command.preview.trips.map(trip =>
      canonicalCandidate(trip, profile.public === true)
    )
    const backup = {
      schemaVersion: 1,
      source: copy(source),
      alarm,
      upgradedAt: command.now,
    }
    try {
      validCollection(trips)
      assertTripStorageBudget(trips, backup)
    } catch (error) {
      return fail(
        error.message === "trip_storage_limit" ? error.message : "invalid_trip"
      )
    }
    storage.kv.put(TRIP_BACKUP, backup)
    storage.kv.put(TRIP_MARKER, {
      schemaVersion: 1,
      upgradedAt: command.now,
      upgradedRevision: profile.revision + 1,
      fingerprint: command.preview.fingerprint,
      retentionPolicy: value.retentionPolicy,
      retentionAcknowledgedAt: command.now,
    })
    for (const [receiptKey, receipt] of storage.kv.list({
      prefix: "mutation:",
    })) {
      const old = receipt.result
      const reference = old?.pin
        ? { pinReference: old.pin.pinId }
        : old?.plan
          ? { planReference: old.plan.planId }
          : old?.pins
            ? { pinReferences: old.pins.map(pin => pin.pinId) }
            : null
      if (reference)
        storage.kv.put(receiptKey, {
          requestDigest: receipt.requestDigest,
          ...reference,
          result: { ok: true, idempotent: false },
        })
    }
    for (const prefix of ["pin:", "pin-place:", "plan:"])
      for (const [legacyKey] of storage.kv.list({ prefix }))
        storage.kv.delete(legacyKey)
  } else if (command.action === "rollback") {
    const backup = storage.kv.get(TRIP_BACKUP)
    if (!marker || !backup) return fail("rollback_unavailable")
    if (profile.revision !== marker.upgradedRevision)
      return fail("rollback_has_changes")
    for (const trip of trips) storage.kv.delete(key(trip.tripId))
    for (const pin of backup.source.pins) {
      storage.kv.put(`pin:${pin.pinId}`, pin)
      storage.kv.put(`pin-place:${pin.placeId}`, { pinId: pin.pinId })
    }
    for (const plan of backup.source.plans)
      storage.kv.put(`plan:${plan.planId}`, plan)
    storage.kv.delete(TRIP_MARKER)
    storage.kv.delete(TRIP_BACKUP)
    nextProfile = {
      ...backup.source.profile,
      revision: profile.revision + 1,
      updatedAt: command.now,
    }
    storage.kv.put("profile", nextProfile)
    storage.kv.put(receiptKey, {
      action: command.action,
      requestDigest: command.requestDigest,
      restoreAlarm: backup.alarm,
      revision: nextProfile.revision,
    })
    return {
      ...resultFor(storage, nextProfile, { action: "rollback" }),
      restoreAlarm: backup.alarm,
    }
  } else {
    if (!marker) return fail("trip_upgrade_required")
    const current = value.tripId
      ? trips.find(trip => trip.tripId === value.tripId)
      : null
    if (command.action !== "create" && command.action !== "combine" && !current)
      return fail("trip_not_found")
    let updated
    try {
      if (command.action === "create") {
        updated = copy(value.trip)
        targetId = updated.tripId
        if (trips.some(trip => trip.tripId === targetId))
          return fail("duplicate_trip")
        trips.push(updated)
      } else if (command.action === "lifecycle") {
        updated = transitionTripLifecycle(current, value.lifecycle, {
          expectedVersion: current.version,
          now: command.now,
        })
      } else if (command.action === "metadata") {
        if (
          Object.keys(value.patch).some(
            field => !["title", "description"].includes(field)
          )
        )
          return fail("invalid_trip_patch")
        updated = {
          ...current,
          ...value.patch,
          version: current.version + 1,
          updatedAt: command.now,
        }
      } else if (command.action === "reorder")
        updated = reorderTripStops(current, value.stopIds, {
          expectedVersion: current.version,
          now: command.now,
        })
      else if (command.action === "stop-edit") {
        const stop = current.stops.find(stop => stop.stopId === value.stopId)
        if (!stop) return fail("stop_not_found")
        const patch = value.patch,
          edited = { ...stop, updatedAt: command.now }
        if (patch.memory !== undefined) {
          const index = stop.memories.findIndex(
            memory => memory.kind === "note"
          )
          const memories = copy(stop.memories)
          if (index >= 0)
            memories[index] = {
              ...memories[index],
              text: patch.memory,
              updatedAt: command.now,
            }
          else if (patch.memory)
            memories.push({
              memoryId: value.memoryId,
              kind: "note",
              text: patch.memory,
              mediaId: null,
              publicAtlas: false,
              createdAt: command.now,
              updatedAt: command.now,
            })
          edited.memories = memories
        }
        for (const field of ["plannedDates", "actualDates"])
          if (patch[field] !== undefined) edited[field] = patch[field]
        if (patch.experienceChange) {
          const result = applyExperienceChange(
            stop.experiences,
            patch.experienceChange,
            command.now
          )
          if (result.error) return fail(result.error)
          edited.experiences = result.experiences
        }
        updated = {
          ...current,
          stops: current.stops.map(item =>
            item.stopId === stop.stopId ? edited : item
          ),
          version: current.version + 1,
          updatedAt: command.now,
        }
      } else if (command.action === "stop-add") {
        const stops = [...current.stops],
          index = value.afterStopId
            ? stops.findIndex(stop => stop.stopId === value.afterStopId)
            : stops.length - 1
        if (value.afterStopId && index < 0) return fail("stop_not_found")
        stops.splice(index + 1, 0, copy(value.stop))
        updated = {
          ...current,
          stops,
          version: current.version + 1,
          updatedAt: command.now,
        }
      } else if (command.action === "stop-remove") {
        if (value.discardContent) {
          if (!current.stops.some(stop => stop.stopId === value.stopId))
            return fail("stop_not_found")
          updated = {
            ...current,
            stops: current.stops.filter(stop => stop.stopId !== value.stopId),
            version: current.version + 1,
            updatedAt: command.now,
          }
        } else
          updated = removeEmptyTripStop(current, value.stopId, {
            expectedVersion: current.version,
            now: command.now,
          })
      } else if (command.action === "combine") {
        const selected = value.tripIds.map(id =>
          trips.find(trip => trip.tripId === id)
        )
        if (
          selected.some(trip => !trip) ||
          selected.length < 2 ||
          new Set(value.tripIds).size !== selected.length
        )
          return fail("invalid_trip_selection")
        if (
          selected.some(
            trip =>
              trip.lifecycle !== "past" ||
              trip.workflow !== "saved" ||
              trip.sharing.publicAtlas !== selected[0].sharing.publicAtlas ||
              trip.logistics.flights.length ||
              trip.logistics.rentals.length
          )
        )
          return fail("combine_needs_review")
        updated = {
          ...copy(selected[0]),
          tripId: value.combinedId,
          title: value.title,
          stops: selected.flatMap(trip => trip.stops),
          memories: selected.flatMap((trip, index) => [
            ...trip.memories,
            ...(trip.description
              ? [
                  {
                    memoryId: value.descriptionIds[index],
                    kind: "note",
                    text: trip.description,
                    mediaId: null,
                    createdAt: trip.createdAt,
                    updatedAt: trip.updatedAt,
                  },
                ]
              : []),
          ]),
          description: "",
          legacy: { source: "combined", sourceIds: [...value.tripIds] },
          version: 1,
          createdAt: command.now,
          updatedAt: command.now,
          statusChangedAt: null,
        }
        trips = trips.filter(trip => !value.tripIds.includes(trip.tripId))
        trips.push(updated)
        targetId = updated.tripId
      } else if (command.action === "delete")
        trips = trips.filter(trip => trip.tripId !== current.tripId)
      else return fail("invalid_trip_action")
      if (
        updated &&
        command.action !== "create" &&
        command.action !== "combine"
      ) {
        targetId = current.tripId
        trips = trips.map(trip => (trip.tripId === targetId ? updated : trip))
      }
      validCollection(trips)
    } catch (error) {
      return fail(
        error.code ||
          ([
            "trip_limit_reached",
            "trip_storage_limit",
            "visited_place_limit",
            "duplicate_trip",
            "duplicate_stop",
            "duplicate_memory",
          ].includes(error.message)
            ? error.message
            : "invalid_trip")
      )
    }
    storage.kv.delete(TRIP_BACKUP)
  }
  const old = storedTrips(storage)
  for (const trip of old)
    if (!trips.some(item => item.tripId === trip.tripId))
      storage.kv.delete(key(trip.tripId))
  for (const trip of trips) storage.kv.put(key(trip.tripId), trip)
  nextProfile = {
    ...profile,
    tripSchemaVersion: 1,
    tripCount: trips.length,
    planCount: 0,
    pinCount: tripPins(storage).length,
    revision: profile.revision + 1,
    updatedAt: command.now,
    publicAtlasUpdatedAt:
      command.action !== "upgrade" &&
      profile.public &&
      beforePublic !== publicFootprint()
        ? command.now
        : profile.publicAtlasUpdatedAt,
  }
  storage.kv.put("profile", nextProfile)
  const saved = {
    action: command.action,
    requestDigest: command.requestDigest,
    ...(targetId ? { tripId: targetId } : {}),
  }
  storage.kv.put(receiptKey, saved)
  return { ...resultFor(storage, nextProfile, saved), nextAlarm }
}
