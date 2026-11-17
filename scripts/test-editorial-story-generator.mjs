import assert from "node:assert/strict"
import {
  buildStoryRequest,
  extractTravelContext,
  generateAtlasStory,
} from "./lib/editorial-story-generator.mjs"

const row = {
  "Series/Post": "La Fortuna arrival",
  "Atlas Experience": "New: La Fortuna arrival",
  "Moment / Angle": "First evening",
  "Atlas Notes": "We reach the rental after the drive from the airport.",
  "Atlas Story": "An old draft that must not be sent back as evidence.",
  "Travel Date / Range": "November 2025",
}
const journey = { id: "costa-rica-2025", title: "Costa Rica (2025)" }
const framework = "Use firsthand evidence and a clear story spine."
const travelContext = "The drive begins after arrival in Costa Rica."

assert.equal(
  extractTravelContext(
    "# 7. COSTA RICA — 2025\nCosta Rica facts\n# 8. UNITED STATES VIRGIN ISLANDS\nUSVI facts",
    "costa-rica-2025"
  ),
  "# 7. COSTA RICA — 2025\nCosta Rica facts"
)
assert.equal(extractTravelContext("anything", "hungary-2024"), "")

const payload = buildStoryRequest({
  model: "test-model",
  row,
  journey,
  place: { id: "la-fortuna-costa-rica", name: "La Fortuna" },
  visit: { id: "costa-rica-2025-la-fortuna-costa-rica", label: "La Fortuna" },
  mediaSummary: { images: 2, videos: 1 },
  framework,
  travelContext,
})
assert.equal(payload.store, false)
assert.equal(payload.text.format.type, "json_schema")
assert.equal(payload.text.format.strict, true)
assert.equal(payload.input.length, 1)
assert.doesNotMatch(payload.input[0].content, /old draft/i)
assert.match(payload.input[0].content, /rental after the drive/)

let observed
const generated = await generateAtlasStory({
  row,
  journey,
  mediaSummary: { images: 2, videos: 1 },
  framework,
  travelContext,
  environment: {
    OPENAI_API_KEY: "test-secret",
    EDITORIAL_STORY_MODEL: "test-model",
  },
  request: async (url, options) => {
    observed = { url, options, body: JSON.parse(options.body) }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: "completed",
        output_text: JSON.stringify({
          story: "We reach La Fortuna after the drive from the airport.",
        }),
      }),
    }
  },
})
assert.equal(
  generated.story,
  "We reach La Fortuna after the drive from the airport."
)
assert.equal(generated.model, "test-model")
assert.equal(observed.url, "https://api.openai.com/v1/responses")
assert.equal(observed.options.headers.Authorization, "Bearer test-secret")
assert.equal(observed.body.model, "test-model")
assert.equal(observed.body.store, false)

await assert.rejects(
  () =>
    generateAtlasStory({
      row,
      journey,
      framework,
      travelContext,
      environment: { OPENAI_API_KEY: "test-secret" },
      request: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          status: "completed",
          output_text: JSON.stringify({ story: "Morning - then the drive." }),
        }),
      }),
    }),
  /dash punctuation/
)
await assert.rejects(
  () =>
    generateAtlasStory({
      row,
      journey,
      framework,
      travelContext,
      environment: {},
      request: async () => {
        throw new Error("must not be called")
      },
    }),
  /OPENAI_API_KEY/
)
assert.throws(
  () =>
    buildStoryRequest({
      model: "test-model",
      row: { ...row, "Atlas Notes": "" },
      journey,
      framework,
      travelContext,
    }),
  /Atlas Notes is required/
)
assert.throws(
  () =>
    buildStoryRequest({
      model: "test-model",
      row: { ...row, "Atlas Notes": "a".repeat(12001) },
      journey,
      framework,
      travelContext,
    }),
  /Atlas Notes exceeds 12000 characters/
)

console.log("Editorial Atlas Story generator tests passed.")
