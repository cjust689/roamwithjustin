import assert from "node:assert/strict"
import fs from "node:fs/promises"
import compiler from "vue-template-compiler"
import { MAX_PLAN_DESTINATIONS } from "../src/features/my-atlas/planning/handoffs.mjs"
import {
  normalizeMyAtlasCustomPlaceName,
  normalizeMyAtlasCustomCoordinates,
} from "../src/features/my-atlas/catalog/customPlace.mjs"
import {
  formatMyAtlasPlannerError,
  formatMyAtlasPlannerRefreshError,
} from "../src/features/my-atlas/planning/errors.mjs"

// Exercise the actual component methods with controlled async write/read
// outcomes. No account, browser credential or server mutation is involved.
const source = await fs.readFile(
  new URL(
    "../src/features/my-atlas/components/MyAtlasPlanner.vue",
    import.meta.url
  ),
  "utf8"
)
const script = compiler
  .parseComponent(source)
  .script.content.replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
  .replace("export default", "return")
let apiCalls = 0
const dependencies = {
  normalizeMyAtlasCustomPlaceName,
  normalizeMyAtlasCustomCoordinates,
  MyAtlasTravelSearch: {},
  MAX_PLAN_DESTINATIONS,
  formatMyAtlasPlannerError,
  formatMyAtlasPlannerRefreshError,
  createMyAtlasWish: () => {
    apiCalls++
    throw Error("Unexpected write")
  },
}
const component = new Function(...Object.keys(dependencies), script)(
  ...Object.values(dependencies)
)
function fixture() {
  const events = []
  const wishes = ["Atlanta", "Madrid", "Seville"].map((name, i) => ({
    wishId: `wish_${String(i + 1).repeat(24)}`,
    placeId: `geonames:${400000 + i}`,
    name,
    coordinates: [-84 + i, 33 + i],
    placeType: "city",
  }))
  const context = {
    wishes,
    wishDrafts: {},
    plan: null,
    error: "",
    pending: false,
    announcement: "",
    plannerRevision: 1,
    routeHandoffs: [],
    planForm: {
      startWishId: "",
      startDirect: null,
      endMode: "last-stop",
      endDirect: null,
      stopWishIds: [],
    },
    $emit: (name, payload) => events.push({ name, ...payload }),
  }
  for (const [name, method] of Object.entries(component.methods))
    context[name] = method.bind(context)
  for (const [name, getter] of Object.entries(component.computed))
    if (typeof getter === "function")
      Object.defineProperty(context, name, { get: () => getter.call(context) })
  context.token = async () => "fixture"
  context.loadPlanning = async () => ({ ok: true })
  const feedback = () => events.filter(e => e.name === "action-feedback")
  return { context, wishes, events, feedback }
}

const draft = fixture()
const customMap = fixture()
Object.assign(customMap.context, {
  wishQuery: "Remote fixture place",
  customName: "",
  customLongitude: "",
  customLatitude: "",
  customMapPlacementActive: false,
})
customMap.context.beginCustomMapPlacement()
assert.equal(customMap.context.customName, "Remote fixture place")
assert.equal(
  customMap.events.find(event => event.name === "location-placement-change")
    .coordinates,
  null
)
assert.equal(
  customMap.context.customPlanLocation(),
  null,
  "blank coordinate fields must not create a zero coordinate"
)
customMap.context.setCustomMapCoordinates([16.44, 43.51])
assert.deepEqual(
  customMap.context.customPlanLocation().coordinates,
  [16.44, 43.51]
)
customMap.context.useCustomPlanLocation("start")
assert.deepEqual(
  customMap.context.planForm.startDirect.coordinates,
  [16.44, 43.51]
)
assert.equal(customMap.context.customMapPlacementActive, false)
assert.equal(apiCalls, 0)
draft.context.usePlanLocation("start", draft.wishes[0])
assert.equal(draft.context.isPlanLocation("start", draft.wishes[0]), true)
assert.equal(draft.feedback().at(-1).tone, "draft")
assert.match(draft.feedback().at(-1).message, /Save the trip/)
const count = draft.feedback().length
draft.context.usePlanLocation("start", draft.wishes[0])
assert.equal(
  draft.feedback().length,
  count + 1,
  "repeat selections must notify again"
)
draft.context.useSavedPlanLocation("end", draft.wishes[1])
assert.equal(draft.context.isPlanLocation("end", draft.wishes[1]), true)
draft.context.appendPlanStop(draft.wishes[1])
draft.context.appendPlanStop(draft.wishes[2])
draft.context.moveStop(1, -1)
assert.deepEqual(draft.context.planForm.stopWishIds, [
  draft.wishes[2].wishId,
  draft.wishes[1].wishId,
])
assert.match(draft.feedback().at(-1).message, /moved to stop 1/)
draft.context.togglePlanStop(draft.wishes[2].wishId)
assert.match(draft.feedback().at(-1).message, /removed from the trip draft/)
assert.deepEqual(draft.context.planForm.stopWishIds, [draft.wishes[1].wishId])
assert.equal(
  draft.context.plan,
  null,
  "draft confirmations must not create a saved plan"
)
draft.context.planForm.endMode = "return-to-start"
draft.context.confirmFinishMode()
assert.equal(draft.context.isPlanLocation("end", draft.wishes[1]), false)
assert.match(draft.feedback().at(-1).message, /return to its start/)
assert.equal(apiCalls, 0)

const full = fixture()
full.context.planForm.stopWishIds = Array.from(
  { length: MAX_PLAN_DESTINATIONS },
  (_, i) => `wish_${i}`
)
full.context.addCatalogPlaceToPlan({
  placeId: "geonames:999999",
  name: "Extra",
})
assert.equal(
  apiCalls,
  0,
  "a full route must not save a Wish then falsely claim the stop was added"
)
assert.equal(full.feedback().at(-1).tone, "error")

const saving = fixture()
let resolveWrite
const write = new Promise(resolve => {
  resolveWrite = resolve
})
const outcome = saving.context.mutate(() => write, "The trip was saved.", {
  applyResult: result => {
    saving.context.confirmed = result
  },
})
assert.equal(saving.context.pending, true)
assert.equal(saving.feedback().at(-1).tone, "busy")
assert.equal(
  saving.feedback().some(e => e.tone === "success"),
  false
)
resolveWrite({ revision: 2, stored: true })
assert.equal((await outcome).saved, true)
assert.equal(saving.context.confirmed.stored, true)
assert.equal(saving.context.pending, false)
assert.equal(saving.feedback().at(-1).tone, "success")

const failure = fixture()
const failed = await failure.context.mutate(async () => {
  throw Object.assign(Error("Unavailable"), { code: "network_error" })
}, "Saved.")
assert.equal(failed.saved, false)
assert.equal(failure.feedback().at(-1).tone, "error")
assert.equal(
  failure.feedback().some(e => e.tone === "success"),
  false
)

const refreshFailure = fixture()
refreshFailure.context.loadPlanning = async () => ({
  ok: false,
  error: Error("Read failed"),
})
const confirmed = await refreshFailure.context.mutate(
  async () => ({ revision: 3 }),
  "Saved.",
  {
    applyResult: () => {
      refreshFailure.context.saved = true
    },
  }
)
assert.equal(confirmed.saved, true)
assert.equal(confirmed.refreshed, false)
assert.equal(refreshFailure.context.saved, true)
assert.equal(refreshFailure.feedback().at(-1).tone, "warning")
assert.match(refreshFailure.feedback().at(-1).message, /saved/)
assert.equal(refreshFailure.context.pending, false)
const feedbackSource = await fs.readFile(
  new URL(
    "../src/features/my-atlas/components/MyAtlasActionFeedback.vue",
    import.meta.url
  ),
  "utf8"
)
const timers = []
const cleared = []
const clock = {
  setTimeout: (callback, delay) => {
    timers.push({ callback, delay })
    return timers.length
  },
  clearTimeout: id => cleared.push(id),
}
const notification = new Function(
  "window",
  compiler
    .parseComponent(feedbackSource)
    .script.content.replace("export default", "return")
)(clock)
const dismissed = []
const view = {
  timer: null,
  feedback: { id: 1, tone: "draft" },
  $emit: (_event, id) => dismissed.push(id),
}
for (const [name, method] of Object.entries(notification.methods))
  view[name] = method.bind(view)
view.startTimer()
assert.equal(timers.at(-1).delay, 8000)
view.clearTimer()
assert.equal(cleared.at(-1), 1, "hover/focus pauses the dismissal timer")
view.pauseForFocus()
view.pauseForPointer()
const paused = timers.length
view.resumeFromPointer()
assert.equal(
  timers.length,
  paused,
  "leaving with the pointer must not expire keyboard-focused content"
)
view.resumeFromFocus()
assert.equal(timers.length, paused + 1)
view.feedback = { id: 2, tone: "success" }
view.startTimer()
timers.at(-1).callback()
assert.equal(
  dismissed.at(-1),
  2,
  "dismissal identifies the notification that scheduled it"
)
for (const tone of ["busy", "error", "warning"]) {
  const before = timers.length
  view.feedback = { id: 3, tone }
  view.startTimer()
  assert.equal(
    timers.length,
    before,
    `${tone} must remain until replaced or dismissed`
  )
}
console.log(
  "My Atlas draft, repeated action, destination limit, mutation outcome and notification lifetime tests passed."
)
