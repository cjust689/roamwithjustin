import assert from "node:assert/strict"
import fs from "node:fs/promises"
import compiler from "vue-template-compiler"
import {
  parseMapLinkCandidate,
  mapLinkUrl,
} from "../shared/my-atlas-map-links.mjs"
import { resolveShortMapLink } from "../workers/my-atlas/src/maps/resolve.mjs"
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
    "unknown",
    null,
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
const component = new Function("parseMapLinkCandidate", source)(
  parseMapLinkCandidate
)
const events = []
const ui = {
  ...component.data(),
  name: "Keep my name",
  pending: false,
  resolveLink: null,
  $emit: (...event) => events.push(event),
}
for (const [name, method] of Object.entries(component.methods))
  ui[name] = method.bind(ui)
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
  "Map link parsing, confirmation, stale-response, redirect security and timeout checks passed."
)
