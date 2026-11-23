export function journeyCardRecords(trips = [], legacyPlans = []) {
  return [
    ...trips.map(trip => ({ trip, legacy: false })),
    ...legacyPlans
      .filter(plan => !trips.some(trip => trip.tripId === plan.planId))
      .map(plan => ({ trip: plan, legacy: true })),
  ].sort(
    (a, b) =>
      (b.trip.updatedAt || "").localeCompare(a.trip.updatedAt || "") ||
      (a.trip.tripId || a.trip.planId).localeCompare(
        b.trip.tripId || b.trip.planId
      )
  )
}

export function journeyCardDate(record) {
  const { trip, legacy } = record
  if (legacy) return trip.desiredYear ? String(trip.desiredYear) : ""
  const endpointDates =
    trip.lifecycle === "planned"
      ? Object.values(trip.routeEndpoints || {})
          .flatMap(endpoint => [
            endpoint?.plannedDates?.arrival,
            endpoint?.plannedDates?.departure,
          ])
          .filter(Boolean)
      : []
  const values = [
    ...endpointDates,
    ...trip.stops.flatMap(stop => {
      const dates =
        trip.lifecycle === "past" ? stop.actualDates : stop.plannedDates
      return [dates?.arrival, dates?.departure].filter(Boolean)
    }),
  ].sort()
  if (values.length)
    return values[0] === values[values.length - 1]
      ? values[0]
      : `${values[0]} to ${values[values.length - 1]}`
  if (trip.lifecycle === "past") {
    const years = [
      ...new Set(
        trip.stops.flatMap(stop =>
          (stop.visitedDates || []).map(date => date.year)
        )
      ),
    ].sort()
    if (years.length)
      return years.length === 1
        ? String(years[0])
        : `${years[0]} to ${years[years.length - 1]}`
  }
  return ""
}
