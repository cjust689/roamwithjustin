import { tripStayNights } from "../../../../shared/my-atlas-trips.mjs"

export function seedTripStayDates(trip) {
  const stops = trip?.stops || []
  const dates = stop =>
    trip?.lifecycle === "past" && stop?.actualDates?.arrival
      ? stop.actualDates
      : stop?.plannedDates
  const first = dates(stops[0]),
    last = dates(stops[stops.length - 1])
  const checkIn =
    first?.arrival || trip?.routeEndpoints?.start?.plannedDates.arrival || ""
  const checkOut =
    last?.departure ||
    trip?.routeEndpoints?.finish?.plannedDates.departure ||
    ""
  return {
    checkIn,
    checkOut: tripStayNights(checkIn, checkOut) === null ? "" : checkOut,
  }
}

export const sortedTripStays = trip =>
  [...(trip?.stays || [])].sort(
    (a, b) =>
      a.checkIn.localeCompare(b.checkIn) ||
      a.checkOut.localeCompare(b.checkOut) ||
      a.id.localeCompare(b.id)
  )

export function stayDateLabel(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T00:00:00.000Z"))
}
