import { emptyTravelSearchDraft } from "./travelSearch.mjs"

export function tripTravelContext(trip) {
  const start = trip?.routeEndpoints?.start
  const finish = trip?.routeEndpoints?.finish
  const stops = trip?.stops || []
  const first = stops[0],
    last = stops[stops.length - 1]
  return {
    start: start?.place.name || "",
    finish: finish?.place.name || "",
    firstDestination: first?.place.name || "",
    lastDestination: last?.place.name || "",
    departDate:
      start?.plannedDates.departure ||
      start?.plannedDates.arrival ||
      first?.plannedDates.arrival ||
      first?.plannedDates.departure ||
      "",
    returnDate:
      finish?.plannedDates.arrival ||
      finish?.plannedDates.departure ||
      last?.plannedDates.departure ||
      last?.plannedDates.arrival ||
      "",
  }
}

export function seedTravelDates(value, context, { replace = false } = {}) {
  const draft = JSON.parse(JSON.stringify(value || emptyTravelSearchDraft()))
  const flights = draft.flights
  const departure = replace
    ? context.departDate || flights.departDate || ""
    : flights.departDate || context.departDate || ""
  const returning = replace
    ? context.returnDate || flights.returnDate || ""
    : flights.returnDate || context.returnDate || ""
  if (departure && returning && returning < departure) return draft
  if (
    departure !== flights.departDate ||
    (flights.searchType !== "one-way" && returning !== flights.returnDate)
  )
    flights.confirmed = false
  flights.departDate = departure
  if (flights.searchType !== "one-way") flights.returnDate = returning
  return draft
}

export function tripTravelFingerprint(trip) {
  return JSON.stringify({
    stops: (trip?.stops || []).map(stop => [
      stop.stopId,
      stop.place.placeId,
      stop.plannedDates,
    ]),
    endpoints: trip?.routeEndpoints || null,
  })
}
