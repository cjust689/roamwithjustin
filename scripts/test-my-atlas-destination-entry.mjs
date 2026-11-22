import assert from "node:assert/strict"
import fs from "node:fs/promises"
import compiler from "vue-template-compiler"
import {
  parseLocationInput,
  parsePlusCode,
} from "../shared/my-atlas-location-input.mjs"
import {
  emptyDestinationDraft,
  destinationSelection,
} from "../src/features/my-atlas/catalog/destinationDraft.mjs"

const file = compiler.parseComponent(
  await fs.readFile(
    "src/features/my-atlas/components/MyAtlasDestinationPicker.vue",
    "utf8"
  )
)
const dependencies = {
  parseLocationInput,
  parsePlusCode,
  destinationSelection,
  placeCatalog: {},
  getMyAtlasPlaceSearchEndpoint: () => "https://example.test/search",
  searchMyAtlasPlaces: async () => [],
}
const component = new Function(
  ...Object.keys(dependencies),
  file.script.content
    .replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
    .replace("export default", "return")
)(...Object.values(dependencies))
globalThis.window = { location: { origin: "http://localhost" } }
function fixture() {
  const events = []
  const ui = {
    ...component.data(),
    value: emptyDestinationDraft(),
    pending: false,
    resolveLink: null,
    $nextTick: callback => callback(),
    $emit(name, payload) {
      events.push({ name, payload })
      if (name === "input") ui.value = payload
    },
  }
  for (const [key, method] of Object.entries(component.methods))
    ui[key] = method.bind(ui)
  for (const [key, getter] of Object.entries(component.computed))
    Object.defineProperty(ui, key, { get: () => getter.call(ui) })
  return { ui, events }
}
const { ui, events } = fixture()
ui.value.query = "9.17039, -83.7395"
await ui.readInput()
assert.equal(ui.status.title, "Coordinates found")
assert.equal(
  ui.selection,
  null,
  "Finding coordinates never selects or persists a destination"
)
ui.patch({ name: "Trailhead" })
ui.review()
assert.deepEqual(events.at(-1), {
  name: "review",
  payload: {
    coordinates: [-83.7395, 9.17039],
    name: "Trailhead",
    kind: "explicit-coordinate",
  },
})
assert.equal(
  ui.value.reviewed,
  false,
  "Opening map review does not confirm the pin"
)
ui.patch({ coordinates: [-83.74, 9.17], reviewed: true })
assert.deepEqual(ui.selection, {
  customPlace: { name: "Trailhead", coordinates: [-83.74, 9.17] },
})
ui.changeQuery("91, 181")
clearTimeout(ui.timer)
assert.equal(
  ui.selection,
  null,
  "Changing input invalidates the last confirmed position"
)
await ui.readInput()
assert.match(ui.error, /outside.*range/)
assert.equal(ui.value.candidate, null)
for (const input of [
  "https://maps.google.com/?q=9.17,-83.74",
  "https://maps.apple.com/?ll=9.17,-83.74&q=Trail",
  "849VCWC8+R9",
]) {
  ui.changeQuery(input)
  clearTimeout(ui.timer)
  await ui.readInput()
  assert.equal(ui.value.candidate.kind, "explicit-coordinate")
  assert.equal(ui.selection, null)
}
ui.changeQuery("CWC8+R9 Mountain View")
clearTimeout(ui.timer)
await ui.readInput()
assert.equal(ui.value.candidate.kind, "short-plus-code")
ui.useReference({ placeType: "city", coordinates: [-122.08, 37.39] })
assert.equal(ui.value.candidate.kind, "explicit-coordinate")
assert.equal(ui.value.reviewed, false)
const catalogPlace = {
  placeId: "geonames:1",
  name: "Same name",
  countryName: "Country",
  placeType: "city",
  coordinates: [1, 2],
}
ui.selectPlace(catalogPlace)
assert.deepEqual(ui.selection, { placeId: "geonames:1" })
assert.equal(
  events.filter(event => event.name === "choose").length,
  0,
  "Search selection only updates the preview"
)
ui.selectPlace({ ...catalogPlace, placeType: "country", coordinates: null })
assert.deepEqual(
  ui.selection,
  { placeId: "geonames:1" },
  "Catalog identity survives null coordinate previews"
)
ui.changeQuery("a new place")
clearTimeout(ui.timer)
assert.equal(
  ui.value.name,
  "",
  "A catalog name must not label an unrelated new custom pin"
)
let finishSearch
ui.search = () =>
  new Promise(resolve => {
    finishSearch = resolve
  })
const oldSearch = ui.readInput()
ui.changeQuery("9.17, -83.74")
clearTimeout(ui.timer)
await ui.readInput()
finishSearch([catalogPlace])
await oldSearch
assert.equal(
  ui.results.length,
  0,
  "Late search results cannot replace a newer coordinate input"
)
let linkReads = 0,
  finishLink
ui.changeQuery("https://maps.app.goo.gl/fixture")
clearTimeout(ui.timer)
ui.resolveLink = () => {
  linkReads++
  return new Promise(resolve => {
    finishLink = resolve
  })
}
await ui.readInput(false)
assert.equal(linkReads, 0, "A short link is resolved only after explicit Find")
const oldLink = ui.readInput(true)
ui.changeQuery("10, 20")
clearTimeout(ui.timer)
await ui.readInput()
finishLink({
  kind: "explicit-coordinate",
  coordinates: [2, 1],
  label: "Old link",
})
await oldLink
assert.deepEqual(ui.value.candidate.coordinates, [20, 10])
assert.equal(ui.resolving, false)
ui.pending = true
const count = events.length
ui.selectPlace(catalogPlace)
ui.review()
ui.dropPin()
assert.equal(
  events.length,
  count,
  "A pending write must freeze selection and review"
)
console.log(
  "Unified destination parsing, explicit map confirmation, catalog preview, null coordinates and stale request tests passed."
)
