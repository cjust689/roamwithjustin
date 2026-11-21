import { tripPlaceProjection } from "../../../../shared/my-atlas-trips.mjs"

export const visitKey = id => `visit:${id}`
export const storedVisits = storage =>
  Array.from(storage.kv.list({ prefix: "visit:" }), ([, value]) => value)

export function visitPin(visit, { publicOnly = false } = {}) {
  const stop = visit.stop
  const memory = stop.memories.find(
    item => item.kind === "note" && (!publicOnly || item.publicAtlas === true)
  )
  return {
    schemaVersion: 4,
    pinId: `pin_${stop.stopId.slice(5, 29)}`,
    placeId: stop.place.placeId,
    placeSnapshot: tripPlaceProjection(stop.place),
    ungrouped: false,
    ungroupedVisitId: stop.stopId,
    tripIds: [],
    ...(stop.place.placeType === "custom"
      ? {
          customPlace: {
            name: stop.place.name,
            coordinates: [...stop.place.coordinates],
          },
        }
      : {}),
    visitedDates: stop.visitedDates,
    visitedYears: [...new Set(stop.visitedDates.map(date => date.year))],
    memory: memory?.text || "",
    experiences: publicOnly ? [] : stop.experiences,
    createdAt: stop.createdAt,
    updatedAt: stop.updatedAt,
  }
}
