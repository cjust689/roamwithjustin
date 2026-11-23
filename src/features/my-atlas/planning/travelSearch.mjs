import {
  buildExpediaFlightSearchUrl,
  MyAtlasHandoffError,
  normalizedFlightAirportCode,
} from "./handoffs.mjs"

export const TRAVEL_SEARCH_PROVIDERS = Object.freeze({
  expedia: Object.freeze({
    name: "Expedia",
    url: "https://www.expedia.com/go/flight/launch",
  }),
  avis: Object.freeze({ name: "Avis", url: "https://www.avis.com/en/home" }),
})

export function emptyTravelSearchDraft() {
  return {
    flights: {
      searchType: "round-trip",
      outboundFrom: "",
      outboundTo: "",
      returnFrom: "",
      returnTo: "",
      departDate: "",
      returnDate: "",
      confirmed: false,
      conflictChoice: "",
    },
    rental: {
      need: "unsure",
      pickup: "",
      dropoffMode: "same-as-pickup",
      dropoff: "",
      pickupAt: "",
      dropoffAt: "",
      confirmed: false,
    },
  }
}

function text(value, name) {
  if (
    typeof value !== "string" ||
    value.trim().length > 160 ||
    [...value].some(
      character => character.codePointAt(0) < 32 || "<>".includes(character)
    )
  ) {
    throw new MyAtlasHandoffError(
      `${name} is invalid.`,
      "invalid_travel_details"
    )
  }
  return value.trim()
}

function date(value, kind = "flight") {
  if (!value) return ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new MyAtlasHandoffError(
      `Choose a valid ${kind} date.`,
      "invalid_flight_date"
    )
  const parsed = new Date(`${value}T00:00:00Z`)
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new MyAtlasHandoffError(
      `Choose a valid ${kind} date.`,
      "invalid_flight_date"
    )
  }
  return value
}

export function reviewFlightSearch(flight, explicitFlyPairs = []) {
  if (
    !["round-trip", "open-jaw", "one-way", "individual-legs"].includes(
      flight?.searchType
    )
  ) {
    throw new MyAtlasHandoffError(
      "Choose your flight search type.",
      "invalid_flight_search"
    )
  }
  if (flight.searchType === "individual-legs") {
    return {
      searchType: flight.searchType,
      legs: [],
      links: [],
      conflicts: [],
      details: "Use the individually selected Fly legs below.",
    }
  }
  const fromText = text(flight.outboundFrom, "Departure gateway")
  const toText = text(flight.outboundTo, "Arrival gateway")
  const from = normalizedFlightAirportCode(fromText) || fromText
  const to = normalizedFlightAirportCode(toText) || toText
  if (!from || !to || from.toLowerCase() === to.toLowerCase()) {
    throw new MyAtlasHandoffError(
      "Choose distinct departure and arrival gateways.",
      "flight_gateway_required"
    )
  }
  const departDate = date(flight.departDate)
  const returnDate =
    flight.searchType === "one-way" ? "" : date(flight.returnDate)
  const legs = [{ origin: from, destination: to, departureDate: departDate }]
  if (flight.searchType !== "one-way") {
    const returnFrom =
      flight.searchType === "round-trip"
        ? to
        : normalizedFlightAirportCode(
            text(flight.returnFrom, "Return departure gateway")
          ) || flight.returnFrom.trim()
    const returnTo =
      flight.searchType === "round-trip"
        ? from
        : normalizedFlightAirportCode(
            text(flight.returnTo, "Return arrival gateway")
          ) || flight.returnTo.trim()
    if (
      !returnFrom ||
      !returnTo ||
      returnFrom.toLowerCase() === returnTo.toLowerCase()
    ) {
      throw new MyAtlasHandoffError(
        "Choose the return flight gateways.",
        "flight_gateway_required"
      )
    }
    if (departDate && returnDate && returnDate < departDate) {
      throw new MyAtlasHandoffError(
        "The return date must follow the departure date.",
        "invalid_flight_date"
      )
    }
    legs.push({
      origin: returnFrom,
      destination: returnTo,
      departureDate: returnDate,
    })
  }
  const conflicts =
    flight.searchType === "round-trip"
      ? explicitFlyPairs.filter(
          pair =>
            pair.to.isFinish &&
            (pair.from.location.name.toLowerCase() !== to.toLowerCase() ||
              pair.to.location.name.toLowerCase() !== from.toLowerCase())
        )
      : []
  const codes = /^[A-Z]{3}$/
  const confirmed =
    flight.confirmed === true &&
    legs.every(leg => codes.test(leg.origin) && codes.test(leg.destination))
  const links = []
  if (
    confirmed &&
    (!conflicts.length || flight.conflictChoice === "main") &&
    legs.every(
      leg =>
        codes.test(leg.origin) &&
        codes.test(leg.destination) &&
        leg.departureDate
    )
  ) {
    if (flight.searchType === "round-trip") {
      links.push({
        label: "Search round trip on Expedia",
        url: buildExpediaFlightSearchUrl({
          origin: from,
          destination: to,
          departureDate: departDate,
          returnDate,
        }),
      })
    } else {
      legs.forEach((leg, index) =>
        links.push({
          label:
            legs.length > 1
              ? `Search flight ${index + 1} on Expedia`
              : "Search one way on Expedia",
          url: buildExpediaFlightSearchUrl(leg),
        })
      )
    }
  }
  return {
    searchType: flight.searchType,
    readiness: [
      ...(!legs.every(
        leg => codes.test(leg.origin) && codes.test(leg.destination)
      )
        ? [
            "Enter three letter airport codes, such as ATL or SJO. City names do not select an airport.",
          ]
        : []),
      ...(!legs.every(leg => leg.departureDate)
        ? ["Choose the flight dates to prepare a dated Expedia search."]
        : []),
      ...(flight.confirmed !== true
        ? ["Confirm the airports before opening a prepared search."]
        : []),
    ],
    legs,
    links,
    conflicts,
    details: [
      flight.searchType === "round-trip" && !confirmed
        ? "Round trip intention, review airports"
        : {
            "round-trip": "Round trip",
            "open-jaw": "Different return airports, separate one way searches",
            "one-way": "One way",
          }[flight.searchType],
      ...legs.map(
        leg =>
          `${leg.origin} to ${leg.destination}${leg.departureDate ? ` on ${leg.departureDate}` : ""}`
      ),
    ].join("\n"),
  }
}

export function reviewRentalSearch(rental) {
  if (!["yes", "unsure", "no"].includes(rental?.need))
    throw new MyAtlasHandoffError(
      "Choose whether you need a car.",
      "invalid_rental"
    )
  if (rental.need === "no")
    return { details: "No rental car requested.", url: null }
  const pickup = text(rental.pickup, "Pickup location")
  if (!["same-as-pickup", "different-location"].includes(rental.dropoffMode))
    throw new MyAtlasHandoffError("Choose a drop off option.", "invalid_rental")
  const dropoff =
    rental.dropoffMode === "same-as-pickup"
      ? pickup
      : text(rental.dropoff, "Drop off location")
  if (!pickup || !dropoff)
    throw new MyAtlasHandoffError(
      "Choose pickup and drop off locations.",
      "rental_location_required"
    )
  for (const value of [rental.pickupAt, rental.dropoffAt]) {
    if (value) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
        throw new MyAtlasHandoffError(
          "Choose a valid rental time.",
          "invalid_rental_date"
        )
      date(value.slice(0, 10), "rental")
      if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59)
        throw new MyAtlasHandoffError(
          "Choose a valid rental time.",
          "invalid_rental_date"
        )
    }
  }
  if (
    rental.pickupAt &&
    rental.dropoffAt &&
    rental.dropoffAt <= rental.pickupAt
  ) {
    throw new MyAtlasHandoffError(
      "Drop off must be after pickup.",
      "invalid_rental_date"
    )
  }
  return {
    url: rental.confirmed === true ? TRAVEL_SEARCH_PROVIDERS.avis.url : null,
    details: [
      `Pick up at ${pickup}${rental.pickupAt ? ` on ${rental.pickupAt}` : ""}`,
      `Drop off at ${dropoff}${rental.dropoffAt ? ` on ${rental.dropoffAt}` : ""}`,
      "Confirm the rental station, local times, availability, and terms with the provider.",
    ].join("\n"),
  }
}
