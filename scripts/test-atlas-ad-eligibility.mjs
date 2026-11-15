import assert from "node:assert/strict"
import {
  atlasAdSessionKey,
  isAtlasAdEligible,
  isAtlasStopContentRich,
  reserveAtlasAdRequest,
} from "../src/features/atlas/config/atlasAdEligibility.mjs"

const richStop = {
  id: "rich-stop",
  summary: "A".repeat(120),
  personalNote: "B".repeat(70),
  media: [{ id: "image-1" }],
  comingSoon: false,
}
const eligible = {
  atlasReady: true,
  journey: { id: "journey-1", stopCount: 6 },
  currentStop: richStop,
  guidedStatus: "at-stop",
  visitedStopIds: ["stop-1", "stop-2", "rich-stop"],
}

assert.equal(isAtlasStopContentRich(richStop), true)
assert.equal(isAtlasStopContentRich({ ...richStop, media: [] }), false)
assert.equal(isAtlasStopContentRich({ ...richStop, comingSoon: true }), false)
assert.equal(isAtlasAdEligible(eligible), true)
assert.equal(isAtlasAdEligible({ ...eligible, atlasReady: false }), false)
assert.equal(
  isAtlasAdEligible({
    ...eligible,
    journey: { id: "journey-1", stopCount: 4 },
  }),
  false
)
assert.equal(
  isAtlasAdEligible({ ...eligible, guidedStatus: "traveling" }),
  false
)
assert.equal(
  isAtlasAdEligible({ ...eligible, visitedStopIds: ["stop-1", "stop-2"] }),
  false
)
assert.equal(
  isAtlasAdEligible({ ...eligible, currentStop: { ...richStop, media: [] } }),
  false
)

const values = new Map()
const storage = {
  getItem: key => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
}

assert.equal(
  atlasAdSessionKey("journey-1"),
  "roamwithjustin.adsense.atlas.v1.journey-1"
)
assert.equal(reserveAtlasAdRequest(storage, "journey-1"), true)
assert.equal(reserveAtlasAdRequest(storage, "journey-1"), false)
assert.equal(reserveAtlasAdRequest(null, "journey-2"), false)
assert.equal(
  reserveAtlasAdRequest(
    {
      getItem() {
        throw new Error("storage disabled")
      },
    },
    "journey-2"
  ),
  false
)

console.log("Atlas advertising eligibility tests passed.")
