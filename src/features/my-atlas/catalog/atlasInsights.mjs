export const CONTINENT_NAMES = Object.freeze({
  AF: "Africa",
  AN: "Antarctica",
  AS: "Asia",
  EU: "Europe",
  NA: "North America",
  OC: "Oceania",
  SA: "South America",
})

export function visitedDatesForPlace(place) {
  if (Array.isArray(place?.visitedDates)) return place.visitedDates
  return Array.isArray(place?.visitedYears)
    ? place.visitedYears.map(year => ({ year }))
    : []
}

export function formatVisitedDate(date) {
  return String(date.year)
}

export function formatVisitedDates(place) {
  const dates = visitedDatesForPlace(place)
  return dates.length ? dates.map(formatVisitedDate).join(", ") : "Date open"
}

export function atlasYears(places) {
  return [
    ...new Set(
      places.flatMap(place =>
        visitedDatesForPlace(place).map(date => date.year)
      )
    ),
  ].sort((left, right) => left - right)
}

export function placesForYear(places, yearFilter) {
  if (yearFilter === "all") return places
  if (yearFilter === "undated") {
    return places.filter(place => visitedDatesForPlace(place).length === 0)
  }
  const year = Number(yearFilter)
  return places.filter(place =>
    visitedDatesForPlace(place).some(date => date.year === year)
  )
}

export function placesThroughYear(places, year) {
  return places.filter(place => {
    const dates = visitedDatesForPlace(place)
    return dates.length && dates.some(date => date.year <= year)
  })
}

function radians(value) {
  return (value * Math.PI) / 180
}

export function distanceKilometers(first, second) {
  const [firstLongitude, firstLatitude] = first
  const [secondLongitude, secondLatitude] = second
  const latitudeDelta = radians(secondLatitude - firstLatitude)
  const longitudeDelta = radians(secondLongitude - firstLongitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(firstLatitude)) *
      Math.cos(radians(secondLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function atlasStats(places) {
  const countryCodes = new Set()
  const continents = new Set()
  let capitals = 0
  let cities = 0
  let undated = 0
  const years = atlasYears(places)

  for (const place of places) {
    const countryCode =
      place.countryCode ||
      (place.placeType === "country"
        ? place.placeId.replace("iso-country:", "")
        : "")
    if (countryCode) countryCodes.add(countryCode)
    if (place.continent) continents.add(place.continent)
    if (place.placeType === "city") cities += 1
    if (place.featureCode === "PPLC") capitals += 1
    if (!visitedDatesForPlace(place).length) undated += 1
  }

  let spanKilometers = 0
  for (let first = 0; first < places.length; first += 1) {
    for (let second = first + 1; second < places.length; second += 1) {
      spanKilometers = Math.max(
        spanKilometers,
        distanceKilometers(
          places[first].coordinates,
          places[second].coordinates
        )
      )
    }
  }

  return Object.freeze({
    places: places.length,
    cities,
    countries: countryCodes.size,
    continents: continents.size,
    capitals,
    undated,
    firstYear: years[0] || null,
    latestYear: years[years.length - 1] || null,
    spanMiles: Math.round(spanKilometers * 0.621371),
  })
}

export function decorativeConnections(places) {
  if (places.length < 2) return []
  const connected = new Set([0])
  const edges = []

  while (connected.size < places.length) {
    let candidate = null
    for (const from of connected) {
      for (let to = 0; to < places.length; to += 1) {
        if (connected.has(to)) continue
        const distance = distanceKilometers(
          places[from].coordinates,
          places[to].coordinates
        )
        if (!candidate || distance < candidate.distance) {
          candidate = { from, to, distance }
        }
      }
    }
    if (!candidate) break
    connected.add(candidate.to)
    edges.push(
      Object.freeze({
        from: places[candidate.from],
        to: places[candidate.to],
      })
    )
  }

  return Object.freeze(edges)
}
