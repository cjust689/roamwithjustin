import assert from "node:assert/strict"
import fs from "node:fs"
import {
  GOOGLE_MAPS_TRAVEL_MODES,
  MAX_PLAN_DESTINATIONS,
  MyAtlasHandoffError,
  buildAiPlanningPrompt,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrls,
  buildGoogleMapsRouteHandoffs,
  buildPlanRoutePairs,
  buildPlanRoutePoints,
  routePairKey,
} from "../src/features/my-atlas/planning/handoffs.mjs"
import {
  normalizeCreatePlan,
  normalizeMarkPlanVisited,
} from "../workers/my-atlas/src/planning/contracts.mjs"
import {
  formatMyAtlasPlanLoadError,
  formatMyAtlasPlannerConflictRecovered,
  formatMyAtlasPlannerError,
  formatMyAtlasPlannerRefreshError,
} from "../src/features/my-atlas/planning/errors.mjs"

assert.match(
  formatMyAtlasPlannerError({ code: "insufficient_permissions" }),
  /Sign out, then sign in again/
)
assert.match(
  formatMyAtlasPlannerError({
    code: "invalid_response",
    requestId: "request-123",
  }),
  /unexpected API response.*request-123/
)
assert.match(
  formatMyAtlasPlannerRefreshError({ requestId: "refresh-123" }),
  /change was saved.*Refresh.*refresh-123/
)
assert.match(
  formatMyAtlasPlannerConflictRecovered({ requestId: "conflict-123" }),
  /latest account version.*itinerary draft.*save again.*conflict-123/
)
assert.match(
  formatMyAtlasPlannerError({
    code: "duplicate_wish",
    requestId: "duplicate-123",
  }),
  /already in your private bucket list.*duplicate-123/
)
assert.match(
  formatMyAtlasPlannerError({ code: "wishlist_limit_reached" }),
  /reached its current limit/
)
assert.match(
  formatMyAtlasPlannerError({ code: "place_unavailable" }),
  /no longer available in the current catalog/
)
assert.match(
  formatMyAtlasPlanLoadError({ requestId: "plan-load-123" }),
  /bucket list loaded.*saved trip could not be loaded.*plan-load-123/
)

const plannerComponent = fs.readFileSync(
  new URL(
    "../src/features/my-atlas/components/MyAtlasPlanner.vue",
    import.meta.url
  ),
  "utf8"
)
assert.match(plannerComponent, /class="planner-itinerary-card"/)
assert.match(plannerComponent, /aria-label="Saved trip itinerary"/)
assert.match(plannerComponent, /aria-controls="planner-trip-editor"/)
assert.match(plannerComponent, /aria-controls="planner-directions-panel"/)
assert.match(plannerComponent, /aria-controls="planner-prompt-panel"/)
assert.match(plannerComponent, /planHasUnsavedChanges/)
assert.match(plannerComponent, /v-model="directionsIncludedPointKeys"/)
assert.match(plannerComponent, /v-model="directionsDefaultMode"/)
assert.match(plannerComponent, /buildGoogleMapsRouteHandoffs\(this\.plan/)
assert.match(
  plannerComponent,
  /if \(this\.planStateAvailable\) this\.plan = state\.plans\[0\] \|\| null/
)
assert.doesNotMatch(
  plannerComponent,
  /this\.plan = this\.planStateAvailable \? state\.plans\[0\] \|\| null : null/
)
assert.match(
  plannerComponent,
  /const refreshError = refresh\.ok \? refresh\.planError : refresh\.error/
)
assert.match(
  plannerComponent,
  /rememberSavedPlan\(result\) \{[\s\S]*?this\.plan = plan[\s\S]*?syncPlanForm\(\)/
)
assert.match(
  plannerComponent,
  /Your private trip was saved\.[\s\S]*?applyResult: result => this\.rememberSavedPlan\(result\)/
)
assert.match(
  plannerComponent,
  /The saved trip was deleted\.[\s\S]*?applyResult: \(\) => this\.forgetSavedPlan\(\)/
)
const localDirectionPreferenceMethods = plannerComponent.match(
  /clearPreparedDirections\(\) \{[\s\S]*?routePointLabel\(point\) \{/
)?.[0]
assert.ok(localDirectionPreferenceMethods)
assert.doesNotMatch(
  localDirectionPreferenceMethods,
  /client\.|mutate|loadPlanning|savePlan/
)
assert.match(
  plannerComponent,
  /error\?\.code === "revision_conflict"[\s\S]*preservePlanDraft: true/
)
assert.match(
  plannerComponent,
  /if \(preservePlanDraft\) this\.reconcilePlanDraft\(\)/
)
assert.doesNotMatch(plannerComponent, /Find flights|Find stays/)

const moab = {
  placeId: "geonames:5601615",
  placeType: "city",
  name: "Moab",
  admin1Name: "Utah",
  countryName: "United States",
  coordinates: [-109.54984, 38.57332],
  routeReadiness: "route-ready",
}
const routeStop = (placeId, name, longitude, latitude) => ({
  placeId,
  placeType: "custom",
  name,
  countryName: "United States",
  coordinates: [longitude, latitude],
  routeReadiness: "user-coordinate-review",
})
const plan = {
  title: "Moab parks",
  start: moab,
  stops: [
    routeStop(
      "custom:111111111111111111111111",
      "Arches entrance",
      -109.607,
      38.616
    ),
    routeStop(
      "custom:222222222222222222222222",
      "Dead Horse Point",
      -109.739,
      38.485
    ),
    routeStop(
      "custom:333333333333333333333333",
      "Island in the Sky",
      -109.866,
      38.459
    ),
  ],
  endMode: "return-to-start",
}
const confirmedCoordinatePlaceIds = plan.stops.map(stop => stop.placeId)
const url = new URL(
  buildGoogleMapsDirectionsUrl(plan, { confirmedCoordinatePlaceIds })
)
assert.equal(url.origin, "https://www.google.com")
assert.equal(url.searchParams.get("api"), "1")
assert.equal(url.searchParams.get("origin"), "38.57332,-109.54984")
assert.equal(url.searchParams.get("destination"), "38.57332,-109.54984")
assert.deepEqual(url.searchParams.get("waypoints").split("|"), [
  "38.616,-109.607",
  "38.485,-109.739",
  "38.459,-109.866",
])
assert.ok(url.toString().length <= 2048)

assert.throws(
  () => buildGoogleMapsDirectionsUrl(plan),
  error =>
    error instanceof MyAtlasHandoffError &&
    error.code === "user-coordinate-review"
)

const prompt = buildAiPlanningPrompt(plan)
assert.match(prompt, /Moab, Utah, United States/)
assert.match(prompt, /Arches entrance, United States/)
assert.doesNotMatch(prompt, /-109\.607|38\.616|custom:/)
const coordinatePrompt = buildAiPlanningPrompt(plan, {
  includeCoordinates: true,
})
assert.match(coordinatePrompt, /38\.616,-109\.607/)

const longerPlan = {
  ...plan,
  stops: Array.from({ length: 8 }, (_, index) =>
    routeStop(
      `custom:${String(index + 10).padStart(24, "0")}`,
      `Stop ${index + 1}`,
      -109.6 - index / 100,
      38.6 + index / 100
    )
  ),
  endMode: "last-stop",
}
const longerConfirmedIds = longerPlan.stops.map(stop => stop.placeId)
const legs = buildGoogleMapsDirectionsUrls(longerPlan, {
  confirmedCoordinatePlaceIds: longerConfirmedIds,
})
assert.equal(legs.length, 2)
assert.equal(legs[0].destination, legs[1].origin)
for (const leg of legs) {
  const legUrl = new URL(leg.url)
  const waypointValue = legUrl.searchParams.get("waypoints")
  assert.ok(!waypointValue || waypointValue.split("|").length <= 3)
  assert.ok(leg.url.length <= 2048)
}
assert.throws(
  () =>
    buildGoogleMapsDirectionsUrl(longerPlan, {
      confirmedCoordinatePlaceIds: longerConfirmedIds,
    }),
  error =>
    error instanceof MyAtlasHandoffError && error.code === "multiple_legs"
)
assert.match(buildAiPlanningPrompt(longerPlan), /8\. Stop 8/)

assert.deepEqual(GOOGLE_MAPS_TRAVEL_MODES, [
  "driving",
  "walking",
  "bicycling",
  "transit",
])

const routePoints = buildPlanRoutePoints(plan)
assert.deepEqual(
  routePoints.map(point => point.pointKey),
  [
    "start",
    "stop:custom:111111111111111111111111",
    "stop:custom:222222222222222222222222",
    "stop:custom:333333333333333333333333",
    "finish",
  ]
)
assert.equal(routePoints.at(-1).location, plan.start)

const stopsOnlyExport = buildGoogleMapsRouteHandoffs(plan, {
  includedPointKeys: routePoints
    .filter(point => point.kind === "stop")
    .map(point => point.pointKey),
  confirmedCoordinatePlaceIds,
})
assert.equal(stopsOnlyExport.actions.length, 1)
assert.equal(stopsOnlyExport.actions[0].kind, "directions")
assert.equal(stopsOnlyExport.actions[0].origin, "Arches entrance")
assert.equal(stopsOnlyExport.actions[0].destination, "Island in the Sky")
assert.equal(
  new URL(stopsOnlyExport.actions[0].url).searchParams.get("travelmode"),
  "driving"
)
assert.equal(
  new URL(stopsOnlyExport.actions[0].url).searchParams.get("waypoints"),
  "38.485,-109.739"
)

const transitExport = buildGoogleMapsRouteHandoffs(plan, {
  includedPointKeys: routePoints
    .filter(point => point.kind === "stop")
    .map(point => point.pointKey),
  defaultMode: "transit",
  confirmedCoordinatePlaceIds,
})
assert.equal(
  new URL(transitExport.actions[0].url).searchParams.get("travelmode"),
  "transit"
)

const bridgedPoints = [routePoints[0], routePoints[2], routePoints[4]]
const oldPairKey = routePairKey(routePoints[0], routePoints[1])
const bridgedPairs = buildPlanRoutePairs(bridgedPoints, {
  defaultMode: "transit",
  pairModes: { [oldPairKey]: "walking" },
})
assert.equal(bridgedPairs.pairs[0].mode, "transit")
assert.equal(bridgedPairs.pairs[0].explicit, false)

const onePointExport = buildGoogleMapsRouteHandoffs(plan, {
  includedPointKeys: ["start"],
})
assert.equal(onePointExport.actions.length, 1)
assert.equal(onePointExport.actions[0].kind, "search")
assert.equal(
  new URL(onePointExport.actions[0].url).searchParams.get("query"),
  "Moab, Utah, United States"
)
assert.deepEqual(
  buildGoogleMapsRouteHandoffs(plan, { includedPointKeys: [] }).actions,
  []
)

const samePlaceLoopExport = buildGoogleMapsRouteHandoffs(plan, {
  includedPointKeys: ["start", "finish"],
})
assert.equal(samePlaceLoopExport.routePoints.length, 1)
assert.equal(samePlaceLoopExport.actions[0].kind, "search")

const longRoutePoints = buildPlanRoutePoints(longerPlan)
const longRouteExport = buildGoogleMapsRouteHandoffs(longerPlan, {
  confirmedCoordinatePlaceIds: longerConfirmedIds,
})
assert.equal(longRouteExport.actions.length, 2)
assert.equal(longRouteExport.actions[0].kind, "directions")
assert.equal(longRouteExport.actions[1].kind, "directions")
assert.equal(
  longRouteExport.actions[0].pointKeys.at(-1),
  longRouteExport.actions[1].pointKeys[0]
)
assert.deepEqual(
  longRouteExport.routePoints.map(point => point.pointKey),
  longRoutePoints.map(point => point.pointKey)
)
for (const action of longRouteExport.actions) {
  const actionUrl = new URL(action.url)
  const waypoints = actionUrl.searchParams.get("waypoints")
  assert.ok(!waypoints || waypoints.split("|").length <= 3)
  assert.ok(action.url.length <= 2048)
}

const mixedModePairKeys = Object.fromEntries(
  routePoints
    .slice(0, -1)
    .map((point, index) => [
      routePairKey(point, routePoints[index + 1]),
      ["driving", "fly", "walking", "bicycling"][index],
    ])
)
const mixedModeExport = buildGoogleMapsRouteHandoffs(plan, {
  pairModes: mixedModePairKeys,
  confirmedCoordinatePlaceIds,
})
assert.deepEqual(
  mixedModeExport.actions.map(action => [action.kind, action.mode]),
  [
    ["directions", "driving"],
    ["boundary", "fly"],
    ["directions", "walking"],
    ["directions", "bicycling"],
  ]
)
assert.equal(
  new URL(mixedModeExport.actions[2].url).searchParams.get("travelmode"),
  "walking"
)
assert.equal(
  new URL(mixedModeExport.actions[3].url).searchParams.get("travelmode"),
  "bicycling"
)
for (const action of mixedModeExport.actions.filter(action => action.url)) {
  assert.doesNotMatch(action.url, /Moab parks|custom%3A|custom:/)
}

const ferryBoundary = buildGoogleMapsRouteHandoffs(plan, {
  includedPointKeys: [routePoints[0].pointKey, routePoints[1].pointKey],
  pairModes: {
    [routePairKey(routePoints[0], routePoints[1])]: "ferry",
  },
})
assert.deepEqual(
  ferryBoundary.actions.map(action => [action.kind, action.mode]),
  [["boundary", "ferry"]]
)

assert.throws(
  () =>
    buildGoogleMapsRouteHandoffs(plan, {
      defaultMode: "train",
      confirmedCoordinatePlaceIds,
    }),
  error =>
    error instanceof MyAtlasHandoffError && error.code === "invalid_travel_mode"
)
assert.throws(
  () =>
    buildGoogleMapsRouteHandoffs(plan, {
      includedPointKeys: [routePoints[1].pointKey],
    }),
  error =>
    error instanceof MyAtlasHandoffError &&
    error.code === "user-coordinate-review"
)

const directFinish = routeStop(
  "custom:444444444444444444444444",
  "Private finish",
  -111.891,
  40.7608
)
const selectedFinishPlan = {
  ...plan,
  stops: [plan.stops[0]],
  endMode: "selected-end",
  end: directFinish,
}
const selectedFinishUrl = new URL(
  buildGoogleMapsDirectionsUrl(selectedFinishPlan, {
    confirmedCoordinatePlaceIds: [plan.stops[0].placeId, directFinish.placeId],
  })
)
assert.equal(
  selectedFinishUrl.searchParams.get("origin"),
  "38.57332,-109.54984"
)
assert.equal(
  selectedFinishUrl.searchParams.get("destination"),
  "40.7608,-111.891"
)
assert.match(
  buildAiPlanningPrompt(selectedFinishPlan),
  /Finish at Private finish/
)

const wishId = index => `wish_${index.toString(16).padStart(24, "0")}`
const planHeaders = new Headers({
  "If-Match": '"rev-1"',
  "Idempotency-Key": "91919191-9191-4191-8191-919191919191",
})
const maximumPlanInput = {
  title: "Long trip",
  status: "saved",
  desiredYear: null,
  note: "",
  startWishId: wishId(999),
  stopWishIds: Array.from({ length: MAX_PLAN_DESTINATIONS }, (_, index) =>
    wishId(index + 1)
  ),
  endMode: "last-stop",
}
assert.equal(
  normalizeCreatePlan(maximumPlanInput, planHeaders, 2026).stopWishIds.length,
  MAX_PLAN_DESTINATIONS
)
const directPlanInput = normalizeCreatePlan(
  {
    ...maximumPlanInput,
    startWishId: undefined,
    start: { placeId: "geonames:5601615" },
    stopWishIds: [wishId(1)],
    endMode: "selected-end",
    end: {
      customPlace: {
        name: "Private finish",
        coordinates: [-111.891, 40.7608],
      },
    },
  },
  planHeaders,
  2026
)
assert.deepEqual(directPlanInput.start, { placeId: "geonames:5601615" })
assert.deepEqual(directPlanInput.end, {
  customPlace: {
    name: "Private finish",
    coordinates: [-111.891, 40.7608],
  },
})
assert.throws(() =>
  normalizeCreatePlan(
    {
      ...maximumPlanInput,
      endMode: "selected-end",
    },
    planHeaders,
    2026
  )
)
assert.throws(() =>
  normalizeCreatePlan(
    {
      ...maximumPlanInput,
      stopWishIds: [...maximumPlanInput.stopWishIds, wishId(1000)],
    },
    planHeaders,
    2026
  )
)

const markedVisits = normalizeMarkPlanVisited(
  {
    visits: [
      {
        stopIndex: 1,
        visitedDates: [{ year: 2025, month: 2 }],
        memory: "Snow over the red rock.",
      },
    ],
  },
  "plan_1234567890abcdef12345678",
  planHeaders,
  2026
)
assert.deepEqual(markedVisits.visits[0], {
  stopIndex: 1,
  visitedDates: [{ year: 2025, month: 2 }],
  visitedYears: [2025],
  memory: "Snow over the red rock.",
})
assert.throws(() =>
  normalizeMarkPlanVisited(
    {
      visits: [
        { stopIndex: 0, visitedDates: [], memory: "" },
        { stopIndex: 0, visitedDates: [], memory: "" },
      ],
    },
    "plan_1234567890abcdef12345678",
    planHeaders,
    2026
  )
)

console.log("My Atlas planning handoff tests passed.")
