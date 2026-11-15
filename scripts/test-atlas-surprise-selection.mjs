import assert from "node:assert/strict"
import { selectAtlasSurprisePlace } from "../src/features/atlas/config/surpriseSelection.mjs"

const completedPlaces = [
  { id: "one", comingSoon: false },
  { id: "two", comingSoon: false },
  { id: "three", comingSoon: false },
]

assert.equal(
  selectAtlasSurprisePlace({
    nodes: [{ id: "preview", comingSoon: true }, ...completedPlaces],
    random: () => 0,
  }).id,
  "one",
  "unfinished journey places must not be surprise destinations"
)

assert.equal(
  selectAtlasSurprisePlace({
    nodes: completedPlaces,
    currentNodeId: "one",
    previousNodeId: "two",
    random: () => 0,
  }).id,
  "three",
  "the current and immediately previous surprise should be avoided"
)

assert.equal(
  selectAtlasSurprisePlace({
    nodes: completedPlaces,
    currentNodeId: "one",
    random: () => 0.999,
  }).id,
  "three",
  "the full completed candidate pool should be selectable"
)

assert.equal(
  selectAtlasSurprisePlace({
    nodes: [{ id: "only", comingSoon: false }],
    currentNodeId: "only",
    previousNodeId: "only",
  }).id,
  "only",
  "a single completed place should remain usable"
)

assert.equal(
  selectAtlasSurprisePlace({
    nodes: [{ id: "preview", comingSoon: true }],
  }),
  null,
  "an Atlas with no completed places should not return a destination"
)

console.log("Atlas surprise selection tests passed.")
