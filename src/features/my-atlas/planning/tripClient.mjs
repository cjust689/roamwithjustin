import { authenticatedJsonRequest, MyAtlasApiError } from "../api/client.mjs"
import {
  assertCanonicalTrip,
  TRIP_ID_PATTERN,
  STOP_ID_PATTERN,
  STAY_ID_PATTERN,
} from "../../../../shared/my-atlas-trips.mjs"

export async function requestMyAtlasTrips({
  action = "list",
  tripId,
  stopId,
  stayId,
  body,
  revision,
  idempotencyKey,
  ...options
}) {
  if (
    ([
      "metadata",
      "sharing",
      "logistics",
      "lifecycle",
      "delete",
      "addStop",
      "reorder",
      "editStop",
      "removeStop",
      "addStay",
      "editStay",
      "removeStay",
    ].includes(action) &&
      !tripId) ||
    (["editStop", "removeStop", "editVisit"].includes(action) && !stopId) ||
    (["editStay", "removeStay"].includes(action) && !stayId)
  )
    throw new MyAtlasApiError("Trip selection is invalid.", {
      code: "invalid_trip",
    })
  if (
    (tripId && !TRIP_ID_PATTERN.test(tripId)) ||
    (stopId && !STOP_ID_PATTERN.test(stopId)) ||
    (stayId && !STAY_ID_PATTERN.test(stayId))
  )
    throw new MyAtlasApiError("Trip selection is invalid.", {
      code: "invalid_trip",
    })
  const base = "/v1/me/trips",
    trip = `${base}/${tripId}`
  const routes = {
    list: [base, "GET"],
    preview: [`${base}/upgrade-preview`, "GET"],
    upgrade: [`${base}/upgrade`, "POST"],
    rollback: [`${base}/rollback`, "POST"],
    create: [base, "POST"],
    combine: [`${base}/combine`, "POST"],
    transfer: [`${base}/visits/transfer`, "POST"],
    editVisit: [`${base}/visits/${stopId}`, "PATCH"],
    sharing: [`${trip}/sharing`, "PATCH"],
    logistics: [`${trip}/logistics`, "PATCH"],
    groupDestinations: [`${base}/group-destinations`, "POST"],
    metadata: [trip, "PATCH"],
    lifecycle: [`${trip}/lifecycle`, "PATCH"],
    delete: [trip, "DELETE"],
    addStop: [`${trip}/stops`, "POST"],
    reorder: [`${trip}/stops/order`, "PATCH"],
    editStop: [`${trip}/stops/${stopId}`, "PATCH"],
    removeStop: [`${trip}/stops/${stopId}`, "DELETE"],
    addStay: [`${trip}/stays`, "POST"],
    editStay: [`${trip}/stays/${stayId}`, "PATCH"],
    removeStay: [`${trip}/stays/${stayId}`, "DELETE"],
  }
  const route = Object.prototype.hasOwnProperty.call(routes, action)
    ? routes[action]
    : null
  if (!route)
    throw new MyAtlasApiError("Trip action is invalid.", {
      code: "invalid_trip",
    })
  const { payload, response } = await authenticatedJsonRequest({
    ...options,
    path: route[0],
    method: route[1],
    body: route[1] === "GET" ? undefined : body || {},
    revision: route[1] === "GET" ? undefined : revision,
    idempotencyKey,
  })
  try {
    if (action === "preview") {
      if (
        !/^[a-f0-9]{64}$/.test(payload.fingerprint || "") ||
        typeof payload.ready !== "boolean" ||
        !Array.isArray(payload.groups) ||
        !Array.isArray(payload.issues) ||
        !Number.isInteger(payload.revision)
      )
        throw Error()
    } else {
      if (
        !Number.isInteger(payload.profile?.revision) ||
        payload.profile.revision < 1 ||
        Number(
          response.headers.get("ETag")?.match(/^(?:W\/)?"rev-(\d+)"$/)?.[1]
        ) !== payload.profile.revision ||
        typeof payload.upgraded !== "boolean"
      )
        throw Error()
      if (payload.trip) assertCanonicalTrip(payload.trip)
      if (action === "list") {
        if (!Array.isArray(payload.trips) || payload.trips.length > 501)
          throw Error()
        payload.trips.forEach(assertCanonicalTrip)
      }
    }
  } catch {
    throw new MyAtlasApiError(
      "The trip response could not be confirmed. Refresh before making another change.",
      { code: "invalid_response" }
    )
  }
  return payload
}
