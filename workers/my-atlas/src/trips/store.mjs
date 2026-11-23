import {
  assertCanonicalTrip,
  transitionTripLifecycle,
  reorderTripStops,
  removeEmptyTripStop,
  TRIP_RETENTION_POLICY,
  tripPlaceProjection,
  normalizeTripStay,
  STAY_ID_PATTERN,
  MAX_TRIP_STAYS,
} from "../../../../shared/my-atlas-trips.mjs"
import { storedVisits, visitKey, visitPin } from "./visits.mjs"
import { applyExperienceChange } from "../../../../shared/my-atlas-experiences.mjs"

export const TRIP_MARKER = "trip-schema"
export const TRIP_BACKUP = "trip-upgrade-backup"
const key = id => `trip:${id}`
const fail = error => ({ ok: false, error })
const copy = value => JSON.parse(JSON.stringify(value))
// Keep individual SQLite KV values below 2 MiB and bound full-collection reads.
export function assertTripStorageBudget(trips, backup = null, visits = []) {
  const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length
  if (
    trips.some(trip => bytes(trip) > 1024 * 1024) ||
    bytes(trips) + bytes(visits) > 4 * 1024 * 1024 ||
    (backup && bytes(backup) > 1536 * 1024)
  )
    throw Error("trip_storage_limit")
}
export const storedTrips = storage =>
  Array.from(
    storage.kv.list({ prefix: "trip:", limit: 502 }),
    ([, value]) => value
  )

// Keep planned geography separate from the compatibility Visited Atlas.
export function publicTripGroups(storage) {
  const trips = [],
    plannedTrips = []
  for (const trip of storedTrips(storage)) {
    if (
      !trip.sharing?.publicAtlas ||
      trip.workflow === "archived" ||
      !trip.stops?.length
    )
      continue
    assertCanonicalTrip(trip)
    if (trip.lifecycle === "past")
      trips.push({
        id: `public-trip-${trips.length + 1}`,
        title: trip.title,
        stops: trip.stops.map(stop => ({ placeId: stop.place.placeId })),
      })
    else
      plannedTrips.push({
        id: `public-planned-trip-${plannedTrips.length + 1}`,
        title: trip.title,
        lifecycle: "planned",
        stops: trip.stops.map(stop => ({
          place: tripPlaceProjection(stop.place),
        })),
      })
  }
  return { trips, plannedTrips }
}

function validCollection(trips, storage, visits = []) {
  assertTripStorageBudget(trips, null, visits)
  if (trips.length > 501) throw Error("trip_limit_reached")
  const tripIds = new Set(),
    stopIds = new Set(),
    memoryIds = new Set()
  const pastPlaces = new Set(
    trips
      .filter(trip => trip.lifecycle === "past")
      .flatMap(trip => trip.stops.map(stop => stop.place.placeId))
  )
  if (storage)
    for (const [, pin] of storage.kv.list({ prefix: "pin:" }))
      pastPlaces.add(pin.placeId)
  for (const visit of visits) pastPlaces.add(visit.stop.place.placeId)
  if (pastPlaces.size > 300) throw Error("visited_place_limit")
  const standalone = visits.map(visit => ({
    schemaVersion: 1,
    tripId: "trip_" + visit.stop.stopId.slice(5, 29),
    title: "Ungrouped visit",
    description: "",
    lifecycle: "past",
    workflow: "saved",
    version: 1,
    stops: [visit.stop],
    memories: [],
    logistics: { flights: [], rentals: [] },
    sharing: visit.sharing,
    createdAt: visit.stop.createdAt,
    updatedAt: visit.stop.updatedAt,
    statusChangedAt: null,
  }))
  for (const trip of [...trips, ...standalone]) {
    assertCanonicalTrip(trip)
    if (trips.includes(trip) && tripIds.has(trip.tripId))
      throw Error("duplicate_trip")
    if (trips.includes(trip)) tripIds.add(trip.tripId)
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
  const byPlace = new Map(
    Array.from(storage.kv.list({ prefix: "pin:" }), ([, pin]) => [
      pin.placeId,
      { ...pin, ungrouped: true, tripIds: [] },
    ])
  )
  for (const visit of storedVisits(storage)) {
    if (publicOnly && !visit.sharing.publicAtlas) continue
    const pin = visitPin(visit, { publicOnly }),
      existing = byPlace.get(pin.placeId)
    if (existing) {
      if (!publicOnly)
        existing.ungroupedVisitIds = [
          ...(existing.ungroupedVisitIds || []),
          visit.stop.stopId,
        ]
      else {
        existing.visitedDates = [
          ...new Map(
            [...existing.visitedDates, ...pin.visitedDates].map(date => [
              JSON.stringify(date),
              date,
            ])
          ).values(),
        ]
        existing.visitedYears = [
          ...new Set(existing.visitedDates.map(date => date.year)),
        ]
      }
    } else
      byPlace.set(pin.placeId, {
        ...pin,
        ungroupedVisitIds: [visit.stop.stopId],
      })
  }
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
        if (!publicOnly) existing.tripIds.push(trip.tripId)
        if (!publicOnly && existing.ungrouped) continue
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
        ungrouped: false,
        tripIds: [trip.tripId],
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

export function replayTripOperation(storage, profile, command) {
  const receipt = storage.kv.get(`trip-operation:${command.operationDigest}`)
  if (!receipt) return { ok: true, found: false }
  if (receipt.requestDigest !== command.requestDigest)
    return fail("idempotency_conflict")
  return { ...resultFor(storage, profile, receipt, true), found: true }
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

function editVisit(stop, patch, memoryId, now) {
  const edited = { ...stop, updatedAt: now }
  if (patch.planNote !== undefined) edited.planNote = patch.planNote
  if (patch.memory !== undefined) {
    const index = stop.memories.findIndex(memory => memory.kind === "note")
    const memories = copy(stop.memories)
    if (index >= 0)
      memories[index] = {
        ...memories[index],
        text: patch.memory,
        updatedAt: now,
      }
    else if (patch.memory)
      memories.push({
        memoryId: memoryId,
        kind: "note",
        text: patch.memory,
        mediaId: null,
        publicAtlas: false,
        createdAt: now,
        updatedAt: now,
      })
    edited.memories = memories
  }
  for (const field of ["plannedDates", "actualDates"])
    if (patch[field] !== undefined) edited[field] = patch[field]
  if (patch.experienceChange) {
    const result = applyExperienceChange(
      stop.experiences,
      patch.experienceChange,
      now
    )
    if (result.error)
      throw Object.assign(Error(result.error), { code: result.error })
    edited.experiences = result.experiences
  }

  return edited
}

export function mutateTripStore(
  storage,
  profile,
  command,
  { source, alarm } = {}
) {
  const publicFootprint = () =>
    JSON.stringify({
      ...publicTripGroups(storage),
      pins: tripPins(storage, { publicOnly: true }).map(pin => ({
        place: pin.placeSnapshot,
        dates: pin.visitedDates,
        memory: pin.memory,
      })),
    })
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
  let visits = storedVisits(storage)
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
      command.preview.trips.length !== source.plans.length ||
      command.preview.destinations?.length !== source.pins.length
    )
      return fail("upgrade_source_changed")
    const originals = new Map([
      ...source.pins.map(record => [record.pinId, record]),
      ...source.plans.map(record => [record.planId, record]),
    ])
    if (
      command.preview.destinations.some(
        item =>
          JSON.stringify(item.snapshot) !==
          JSON.stringify(originals.get(item.pinId))
      ) ||
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
      validCollection(trips, storage, visits)
      assertTripStorageBudget(trips, backup)
    } catch (error) {
      return fail(
        error.message === "trip_storage_limit" ? error.message : "invalid_trip"
      )
    }
    storage.kv.put(TRIP_BACKUP, backup)
    storage.kv.put(TRIP_MARKER, {
      schemaVersion: 2,
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
    for (const prefix of ["plan:"])
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
    if (value.tripId && !current) return fail("trip_not_found")
    if (
      command.action !== "create" &&
      command.action !== "group-destinations" &&
      command.action !== "combine" &&
      command.action !== "transfer" &&
      command.action !== "visit-edit" &&
      !current
    )
      return fail("trip_not_found")
    let updated
    try {
      if (command.action === "transfer") {
        const source = value.fromTripId
          ? trips.find(trip => trip.tripId === value.fromTripId)
          : null
        let target = value.targetTripId
          ? trips.find(trip => trip.tripId === value.targetTripId)
          : null
        if ((value.fromTripId && !source) || (value.targetTripId && !target))
          return fail("trip_not_found")
        const lifecycle = source?.lifecycle || "past"
        if (value.newTrip) {
          target = { ...copy(value.newTrip), lifecycle, stops: [] }
          if (trips.some(trip => trip.tripId === target.tripId))
            return fail("duplicate_trip")
          trips.push(target)
        }
        if (
          (!target && lifecycle !== "past") ||
          (target &&
            (target.lifecycle !== lifecycle || target.workflow === "archived"))
        )
          return fail("visit_lifecycle_mismatch")
        const available = source
          ? source.stops
          : visits.map(visit => visit.stop)
        const stops = value.stopIds.map(id =>
          available.find(stop => stop.stopId === id)
        )
        if (stops.some(stop => !stop)) return fail("stop_not_found")
        if (source)
          trips = trips.map(trip =>
            trip.tripId === source.tripId
              ? {
                  ...trip,
                  stops: trip.stops.filter(
                    stop => !value.stopIds.includes(stop.stopId)
                  ),
                  workflow:
                    trip.stops.length === stops.length
                      ? "draft"
                      : trip.workflow,
                  version: trip.version + 1,
                  updatedAt: command.now,
                }
              : trip
          )
        else
          visits = visits.filter(
            visit => !value.stopIds.includes(visit.stop.stopId)
          )
        if (target)
          trips = trips.map(trip =>
            trip.tripId === target.tripId
              ? {
                  ...trip,
                  stops: [...trip.stops, ...stops],
                  workflow: trip.workflow === "draft" ? "saved" : trip.workflow,
                  version: trip.version + 1,
                  updatedAt: command.now,
                }
              : trip
          )
        else
          visits.push(
            ...stops.map(stop => ({
              stop: copy(stop),
              sharing: { publicAtlas: source.sharing.publicAtlas },
              releasedAt: command.now,
            }))
          )
        targetId = target?.tripId || source.tripId
      } else if (command.action === "visit-edit") {
        const visit = visits.find(item => item.stop.stopId === value.stopId)
        if (!visit) return fail("stop_not_found")
        visits = visits.map(item =>
          item === visit
            ? {
                ...item,
                stop: editVisit(
                  item.stop,
                  value.patch,
                  value.memoryId,
                  command.now
                ),
              }
            : item
        )
      } else if (
        ["stay-add", "stay-edit", "stay-remove"].includes(command.action)
      ) {
        const stays = copy(current.stays || [])
        const stay =
          command.action === "stay-remove"
            ? null
            : normalizeTripStay(value.stay)
        const id = stay?.id || value.stayId
        if (!STAY_ID_PATTERN.test(id || "")) return fail("invalid_stay")
        const index = stays.findIndex(item => item.id === id)
        if (command.action === "stay-add") {
          if (index >= 0) return fail("duplicate_stay")
          if (stays.length >= MAX_TRIP_STAYS) return fail("stay_limit_reached")
          stays.push(stay)
        } else {
          if (index < 0) return fail("stay_not_found")
          if (stay) stays.splice(index, 1, stay)
          else stays.splice(index, 1)
        }
        updated = {
          ...current,
          stays,
          version: current.version + 1,
          updatedAt: command.now,
        }
      } else if (command.action === "sharing") {
        updated = {
          ...current,
          sharing: { ...current.sharing, publicAtlas: value.publicAtlas },
          version: current.version + 1,
          updatedAt: command.now,
        }
      } else if (command.action === "logistics") {
        updated = {
          ...current,
          logistics: copy(value.logistics),
          version: current.version + 1,
          updatedAt: command.now,
        }
      } else if (command.action === "group-destinations") {
        const selected = value.destinations
        if (
          !selected?.length ||
          selected.some(
            item =>
              JSON.stringify(storage.kv.get(`pin:${item.pinId}`)) !==
              JSON.stringify(item.snapshot)
          )
        )
          return fail("destination_selection_changed")
        const stops = selected.map(item => ({
          ...copy(item.stop),
          memories: item.stop.memories.map(memory => ({
            ...memory,
            publicAtlas: profile.public === true,
          })),
        }))
        if (current) {
          if (
            current.lifecycle !== "past" ||
            current.sharing.publicAtlas !== (profile.public === true)
          )
            return fail("group_needs_review")
          updated = {
            ...current,
            stops: [...current.stops, ...stops],
            version: current.version + 1,
            updatedAt: command.now,
          }
          trips = trips.map(trip =>
            trip.tripId === current.tripId ? updated : trip
          )
        } else {
          updated = {
            ...copy(value.trip),
            stops,
            sharing: { publicAtlas: profile.public === true },
          }
          trips.push(updated)
        }
        targetId = updated.tripId
      } else if (command.action === "create") {
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
            field => !["title", "description", "routeEndpoints"].includes(field)
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
        const edited = editVisit(stop, value.patch, value.memoryId, command.now)
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
          workflow: current.workflow === "draft" ? "saved" : current.workflow,
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
              trip.logistics.rentals.length ||
              trip.stays?.length ||
              trip.routeEndpoints?.start ||
              trip.routeEndpoints?.finish
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
        command.action !== "group-destinations" &&
        command.action !== "combine" &&
        command.action !== "transfer" &&
        command.action !== "visit-edit"
      ) {
        targetId = current.tripId
        trips = trips.map(trip => (trip.tripId === targetId ? updated : trip))
      }
      validCollection(trips, storage, visits)
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
    if (command.action === "group-destinations") {
      for (const item of value.destinations) {
        storage.kv.delete(`pin:${item.pinId}`)
        storage.kv.delete(`pin-place:${item.snapshot.placeId}`)
      }
    }
    storage.kv.delete(TRIP_BACKUP)
  }
  for (const visit of storedVisits(storage))
    if (!visits.some(item => item.stop.stopId === visit.stop.stopId))
      storage.kv.delete(visitKey(visit.stop.stopId))
  for (const visit of visits) storage.kv.put(visitKey(visit.stop.stopId), visit)
  const old = storedTrips(storage)
  for (const trip of old)
    if (!trips.some(item => item.tripId === trip.tripId))
      storage.kv.delete(key(trip.tripId))
  for (const trip of trips) storage.kv.put(key(trip.tripId), trip)
  nextProfile = {
    ...profile,
    tripSchemaVersion:
      marker?.schemaVersion || (command.action === "upgrade" ? 2 : 1),
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
