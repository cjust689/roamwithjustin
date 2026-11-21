import { validTripCalendarDate } from "./my-atlas-trips.mjs"

const fail = () => {
  throw Error("invalid_trip_logistics")
}
const object = (value, keys) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(key => !keys.includes(key)) ||
    keys.some(key => !(key in value))
  )
    fail()
  return value
}
const text = value => {
  if (
    typeof value !== "string" ||
    value.length > 160 ||
    /[<>\p{C}]/u.test(value)
  )
    fail()
  return value.trim()
}
const choice = (value, allowed) => {
  if (!allowed.includes(value)) fail()
  return value
}
const bool = value => {
  if (typeof value !== "boolean") fail()
  return value
}
const date = value => {
  if (value !== "" && !validTripCalendarDate(value)) fail()
  return value
}
const time = value => {
  if (
    value !== "" &&
    (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ||
      !validTripCalendarDate(value.slice(0, 10)))
  )
    fail()
  return value
}

// Private search intentions, never reservation records or provider URLs.
export function normalizeTripTravelDraft(value) {
  object(value, ["flights", "rental"])
  const f = object(value.flights, [
    "searchType",
    "outboundFrom",
    "outboundTo",
    "returnFrom",
    "returnTo",
    "departDate",
    "returnDate",
    "confirmed",
    "conflictChoice",
  ])
  const r = object(value.rental, [
    "need",
    "pickup",
    "dropoffMode",
    "dropoff",
    "pickupAt",
    "dropoffAt",
    "confirmed",
  ])
  const result = {
    flights: {
      searchType: choice(f.searchType, [
        "round-trip",
        "open-jaw",
        "one-way",
        "individual-legs",
      ]),
      outboundFrom: text(f.outboundFrom),
      outboundTo: text(f.outboundTo),
      returnFrom: text(f.returnFrom),
      returnTo: text(f.returnTo),
      departDate: date(f.departDate),
      returnDate: date(f.returnDate),
      confirmed: bool(f.confirmed),
      conflictChoice: choice(f.conflictChoice, ["", "main"]),
    },
    rental: {
      need: choice(r.need, ["yes", "unsure", "no"]),
      pickup: text(r.pickup),
      dropoffMode: choice(r.dropoffMode, [
        "same-as-pickup",
        "different-location",
      ]),
      dropoff: text(r.dropoff),
      pickupAt: time(r.pickupAt),
      dropoffAt: time(r.dropoffAt),
      confirmed: bool(r.confirmed),
    },
  }
  if (
    f.searchType !== "one-way" &&
    f.departDate &&
    f.returnDate &&
    f.returnDate < f.departDate
  )
    fail()
  if (r.pickupAt && r.dropoffAt && r.dropoffAt <= r.pickupAt) fail()
  return result
}

export function savedTripTravelDraft(trip) {
  const flights = trip?.logistics?.flights?.[0]?.searchDraft
  const rental = trip?.logistics?.rentals?.[0]?.searchDraft
  if (!flights || !rental) return null
  return normalizeTripTravelDraft({ flights, rental })
}
