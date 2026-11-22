import assert from "node:assert/strict"
import fs from "node:fs/promises"
import compiler from "vue-template-compiler"
import {
  parseMapLinkCandidate,
  mapLinkUrl,
} from "../shared/my-atlas-map-links.mjs"
import { resolveShortMapLink } from "../workers/my-atlas/src/maps/resolve.mjs"
import {
  parseLocationInput,
  parsePlusCode,
  locationCoordinates,
} from "../shared/my-atlas-location-input.mjs"
import {
  resolveMyAtlasMapLink,
  updateMyAtlasPin,
} from "../src/features/my-atlas/api/client.mjs"

const cases = [
  [
    "https://www.google.com/maps/search/?api=1&query=38.123,-110.456",
    "explicit-coordinate",
    [-110.456, 38.123],
  ],
  [
    "https://maps.google.com/?q=38.123,-110.456",
    "explicit-coordinate",
    [-110.456, 38.123],
  ],
  [
    "https://www.google.com/maps/place/A+view/@38.123,-110.456,12z",
    "view-center",
    [-110.456, 38.123],
  ],
  [
    "https://www.google.com/maps/@?api=1&map_action=map&center=38.123,-110.456",
    "view-center",
    [-110.456, 38.123],
  ],
  [
    "https://www.google.com/maps/place/A+view/data=!3d38.123!4d-110.456",
    "explicit-coordinate",
    [-110.456, 38.123],
  ],
  [
    "https://www.google.com/maps/search/?api=1&query=Park&query_place_id=example",
    "unknown",
    null,
  ],
  [
    "https://maps.apple.com/?ll=38.123,-110.456&q=Custom%20Place",
    "explicit-coordinate",
    [-110.456, 38.123],
  ],
  [
    "https://maps.apple.com/?ll=38.123,-110.456",
    "view-center",
    [-110.456, 38.123],
  ],
  [
    "https://maps.apple.com/place?coordinate=38.123,-110.456&name=Custom%20Place",
    "explicit-coordinate",
    [-110.456, 38.123],
  ],
  ["https://maps.apple.com/place?place-id=example", "unknown", null],
  [
    "https://maps.apple.com/frame?center=38.123,-110.456",
    "view-center",
    [-110.456, 38.123],
  ],
  [
    "https://maps.apple.com/search?query=Park&center=38.123,-110.456",
    "view-center",
    [-110.456, 38.123],
  ],
  [
    "https://www.google.com/maps/dir/?origin=1,2&destination=3,4",
    "ambiguous",
    null,
  ],
  [
    "https://maps.apple.com/directions?source=1,2&destination=3,4",
    "ambiguous",
    null,
  ],
  ["https://maps.apple.com/?saddr=1,2&daddr=3,4", "ambiguous", null],
  ["https://maps.google.com/?q=1,2&q=3,4", "ambiguous", null],
  ["https://maps.google.com/?q=90,1", "invalid-coordinate", null],
  ["https://maps.apple.com/place?coordinate=1,181", "invalid-coordinate", null],
  ["https://maps.app.goo.gl/abc", "short-link", null],
  ["https://maps.apple/p/abc", "short-link", null],
  ["https://goo.gl/maps/abc", "short-link", null],
  [
    "https://maps.apple.com/?q=38.123,-110.456",
    "explicit-coordinate",
    [-110.456, 38.123],
  ],
]
for (const [url, kind, coordinates] of cases) {
  const actual = parseMapLinkCandidate(url)
  assert.equal(actual.kind, kind, url)
  assert.deepEqual(actual.coordinates, coordinates, url)
}
for (const url of [
  "http://maps.google.com/?q=1,2",
  "javascript:alert(1)",
  "https://maps.apple.com.evil.test/place?coordinate=1,2",
  "https://user:secret@maps.apple.com/place",
  "https://127.0.0.1/",
  "https://www.google.com/search?q=1,2",
  "https://maps.apple.com:8443/",
  "https://maps.apple.com/#command",
  "https://maps.apple.com/\\evil.test",
  "https://maps.apple.com/" + "x".repeat(4096),
])
  assert.equal(mapLinkUrl(url), null, url)
assert.equal(
  parseMapLinkCandidate("https://maps.apple.com/place?name=%3Cscript%3E").label,
  ""
)
assert.equal(
  parseMapLinkCandidate("https://maps.apple.com/place?name=My%20Place").label,
  "My Place"
)

for (const value of [
  "33.749, -84.38798",
  "(33.749, -84.38798)",
  "33.749 -84.38798",
  "33.749; -84.38798",
  "latitude: 33.749, longitude: -84.38798",
  "33.749° N, 84.38798° W",
  "33.749N 84.38798W",
  "33.749\n-84.38798",
]) {
  assert.deepEqual(
    parseLocationInput(value).coordinates,
    [-84.38798, 33.749],
    value
  )
}
const dms = parseLocationInput(`33°44'56.4"N 84°23'16.728"W`)
assert.ok(Math.abs(dms.coordinates[0] + 84.38798) < 1e-9)
assert.ok(Math.abs(dms.coordinates[1] - 33.749) < 1e-9)
for (const value of [
  "90,1",
  "1,181",
  "33°61'0\"N 84°0'0\"W",
  "33.1°1'0\"N 84°0'0\"W",
])
  assert.equal(parseLocationInput(value).kind, "invalid-coordinate", value)
for (const value of [
  "33,44,55",
  "(33,44",
  "33,44)",
  "1e2,4",
  "Latitude 1 longitude 2 extra 3",
  "<img src=x>",
  "CXX99999+XX",
  "33,44".repeat(1000),
])
  assert.equal(parseLocationInput(value).kind, "unsupported", value)
// Centers from Google's published decoding examples, including grid refinement.
for (const [code, lat, lng] of [
  ["8FVC9G8F+6W", 47.3655625, 8.5248125],
  ["7FG49Q00+", 20.375, 2.775],
  ["7FG49QCJ+2V", 20.3700625, 2.7821875],
  ["7FG49QCJ+2VX", 20.3701125, 2.782234375],
  ["4VCPPQGP+Q9", -41.2730625, 174.7859375],
]) {
  const point = parseLocationInput(code).coordinates
  assert.ok(Math.abs(point[1] - lat) < 1e-9, code)
  assert.ok(Math.abs(point[0] - lng) < 1e-9, code)
}
for (const value of ["8F+6W Zurich", "8f+6w Zurich"]) {
  const shortCode = parseLocationInput(value)
  assert.equal(shortCode.kind, "short-plus-code")
  assert.equal(shortCode.referenceQuery, "Zurich")
  assert.equal(shortCode.coordinates, null)
  const point = parseLocationInput(value, {
    reference: [8.537562, 47.373313],
  }).coordinates
  assert.ok(Math.abs(point[1] - 47.3655625) < 1e-9)
  assert.ok(Math.abs(point[0] - 8.5248125) < 1e-9)
}
for (const [shortCode, lat, lng] of [
  ["+2VX", 51.3701125, -1.217765625],
  ["CJ+2VX", 51.3708675, -1.217765625],
  ["9QCJ+2VX", 51.3852125, -1.217765625],
]) {
  const point = parsePlusCode(shortCode, [lng, lat]).coordinates
  assert.ok(Math.abs(point[1] - 51.3701125) < 1e-9)
  assert.ok(Math.abs(point[0] + 1.217765625) < 1e-9)
}
for (const value of [
  "https://plus.codes/8FVC9G8F%2B6W",
  "https://www.google.com/maps/search/?api=1&query=8FVC9G8F%2B6W",
  "https://www.google.com/maps/place/8FVC9G8F%2B6W",
])
  assert.equal(parseLocationInput(value).kind, "explicit-coordinate", value)
assert.equal(
  parseLocationInput("https://plus.codes/8F%2B6W%20Zurich").kind,
  "short-plus-code"
)
assert.equal(
  parseLocationInput("https://plus.codes.evil.test/8FVC9G8F%2B6W").kind,
  "unsupported"
)
assert.equal(
  parseLocationInput(
    "https://maps.google.com/?q=1,2 https://maps.apple.com/?q=3,4"
  ).kind,
  "ambiguous"
)
assert.deepEqual(
  parseLocationInput(
    "Shared place\nhttps://maps.apple.com/place?coordinate=33.749,-84.38798"
  ).coordinates,
  [-84.38798, 33.749]
)
assert.equal(
  parseLocationInput(
    "https://maps.google.com/maps/place/Test/@1,2,12z/data=!3d3!4d4"
  ).kind,
  "explicit-coordinate"
)
assert.deepEqual(
  parseLocationInput(
    "https://maps.google.com/maps/place/Test/@1,2,12z/data=!3d3!4d4"
  ).coordinates,
  [4, 3]
)
assert.equal(
  parseLocationInput(
    "https://maps.google.com/maps/place/Test/data=!3d3!4d4!3d5!4d6"
  ).kind,
  "ambiguous"
)
assert.equal(
  parseLocationInput("https://maps.google.com/?q=1,2&query=3,4").kind,
  "ambiguous"
)

const short = "https://maps.app.goo.gl/abc"
const final =
  "https://maps.apple.com/place?coordinate=38.123,-110.456&name=My%20Place"
let calls = []
const candidate = await resolveShortMapLink(short, {
  fetchImpl: async (url, options) => {
    calls.push(url)
    assert.equal(options.method, "HEAD")
    assert.equal(options.redirect, "manual")
    assert.equal(options.credentials, "omit")
    assert.equal(options.headers.Authorization, undefined)
    return new Response(null, { status: 301, headers: { Location: final } })
  },
})
assert.equal(candidate.kind, "explicit-coordinate")
assert.deepEqual(calls, [short], "Do not fetch final provider HTML")
for (const target of [
  "https://127.0.0.1/",
  "https://10.0.0.1/",
  "https://169.254.169.254/",
  "https://[::1]/",
  "https://evil.test/",
  "http://maps.apple.com/",
  "https://user@maps.apple.com/",
  "https://maps.apple.com:8080/",
  short,
]) {
  calls = []
  await assert.rejects(
    resolveShortMapLink(short, {
      fetchImpl: async url => {
        calls.push(url)
        return new Response(null, {
          status: 302,
          headers: { Location: target },
        })
      },
    })
  )
  assert.equal(calls.length, 1, "Never fetch an unsafe redirect or loop")
}
let hops = 0
await assert.rejects(
  resolveShortMapLink(short, {
    fetchImpl: async () =>
      new Response(null, {
        status: 302,
        headers: { Location: `https://maps.app.goo.gl/hop${++hops}` },
      }),
  })
)
assert.equal(hops, 3)
await assert.rejects(
  resolveShortMapLink(short, {
    timeoutMs: 5,
    fetchImpl: () => new Promise(() => {}),
  })
)
await assert.rejects(
  resolveShortMapLink(short, {
    fetchImpl: async () => new Response(null, { status: 200 }),
  })
)
await assert.rejects(
  resolveShortMapLink(final, {
    fetchImpl: () => {
      throw Error("Must not fetch full URLs")
    },
  })
)

const apiCandidate = await resolveMyAtlasMapLink({
  apiBaseUrl: "https://example.test",
  accessToken: "fixture",
  url: short,
  fetchImpl: async (url, options) => {
    assert.equal(url, "https://example.test/v1/me/map-links/resolve")
    assert.equal(options.headers.get("Authorization"), "Bearer fixture")
    assert.deepEqual(JSON.parse(options.body), { url: short })
    return Response.json({ candidate })
  },
})
assert.deepEqual(apiCandidate, candidate)
const customPlace = {
  name: "Corrected custom stop",
  coordinates: [16.45, 43.52],
}
const pinId = "pin_" + "1".repeat(24)
const edited = await updateMyAtlasPin({
  apiBaseUrl: "https://example.test",
  accessToken: "fixture",
  pinId,
  customPlace,
  revision: 2,
  fetchImpl: async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { customPlace })
    return Response.json(
      {
        pin: {
          pinId,
          placeId: "custom:" + "1".repeat(24),
          customPlace,
          visitedDates: [{ year: 2025 }],
          memory: "Keep memory",
        },
      },
      { headers: { ETag: '"rev-3"' } }
    )
  },
})
assert.equal(edited.pin.name, customPlace.name)
assert.deepEqual(edited.pin.coordinates, customPlace.coordinates)
assert.equal(edited.pin.memory, "Keep memory")

// Exercise the actual shared UI. Parsing never writes fields; confirmation
// preserves an already-entered name and changes only the coordinate draft.
const source = compiler
  .parseComponent(
    await fs.readFile(
      "src/features/my-atlas/components/MyAtlasLocationPicker.vue",
      "utf8"
    )
  )
  .script.content.replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
  .replace("export default", "return")
const component = new Function(
  "parseLocationInput",
  "parsePlusCode",
  "locationCoordinates",
  "MyAtlasInfo",
  "searchMyAtlasPlaces",
  "getMyAtlasPlaceSearchEndpoint",
  "placeCatalog",
  source
)(
  parseLocationInput,
  parsePlusCode,
  locationCoordinates,
  {},
  async () => [],
  () => "",
  {}
)
const events = []
const ui = {
  ...component.data(),
  name: "Keep my name",
  pending: false,
  resolveLink: null,
  $emit: (...event) => events.push(event),
  $nextTick: callback => callback(),
}
for (const [name, method] of Object.entries(component.methods))
  ui[name] = method.bind(ui)
let pastePrevented = false
ui.pasteLocation({
  clipboardData: { getData: () => "33.749\n-84.38798" },
  target: {
    value: "",
    selectionStart: 0,
    selectionEnd: 0,
    setSelectionRange() {},
  },
  preventDefault() {
    pastePrevented = true
  },
})
assert.equal(pastePrevented, true)
assert.equal(ui.link, "33.749 -84.38798")
await ui.readLink()
assert.deepEqual(ui.candidate.coordinates, [-84.38798, 33.749])
assert.equal(events.length, 0, "Pasting and previewing never writes fields")
ui.link = final
await ui.readLink()
assert.equal(events.length, 0)
ui.useCandidate()
assert.deepEqual(
  events.map(event => event[0]),
  ["update:longitude", "update:latitude", "coordinates-change", "choose-map"]
)
events.length = 0
ui.link = "https://maps.apple.com/frame?center=38.123,-110.456"
await ui.readLink()
ui.useCandidate()
assert.deepEqual(
  events,
  [["choose-map"]],
  "Never apply a viewport as a selected place"
)
events.length = 0
ui.link = "8F+6W Zurich"
await ui.readLink()
assert.equal(ui.candidate.kind, "short-plus-code")
assert.equal(ui.referenceQuery, "Zurich")
ui.useReference({ coordinates: [8.537562, 47.373313] })
assert.equal(ui.candidate.kind, "explicit-coordinate")
assert.equal(
  events.length,
  0,
  "Choosing a reference still requires confirmation"
)
ui.useCandidate()
assert.ok(Math.abs(Number(events[0][1]) - 8.5248125) < 1e-9)
assert.ok(Math.abs(Number(events[1][1]) - 47.3655625) < 1e-9)
assert.equal(
  events.some(event => event[0] === "update:name"),
  false,
  "A reference town is not the place name"
)
events.length = 0
ui.link = "invalid location"
await ui.readLink()
assert.equal(ui.candidate, null)
assert.equal(
  events.length,
  0,
  "Invalid input preserves the previous coordinate draft"
)
ui.resolveLink = async () => ({
  provider: "Google Maps",
  kind: "unknown",
  label: "8F+6W Zurich",
  coordinates: null,
})
ui.link = short
await ui.readLink()
assert.equal(ui.candidate.kind, "short-plus-code")
assert.equal(ui.referenceQuery, "Zurich")
let complete
ui.resolveLink = () =>
  new Promise(resolve => {
    complete = resolve
  })
ui.link = short
const request = ui.readLink()
ui.link = final
ui.clearCandidate()
complete(candidate)
await request
assert.equal(
  ui.candidate,
  null,
  "An old response must not replace a newer draft"
)
console.log(
  "Coordinate/DMS and Plus Code decoding, map links, reference confirmation, paste normalization, stale-response and redirect security checks passed."
)
