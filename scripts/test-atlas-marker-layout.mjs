import assert from "node:assert/strict"
import {
  buildAtlasMarkerGroups,
  getAtlasPinFocusCamera,
} from "../src/features/atlas/config/markerLayout.mjs"

const nodes = [
  {
    id: "alpha",
    coordinates: [0, 0],
    childIds: [],
    camera: { center: [0.2, 0.2], zoom: 13, pitch: 68, bearing: 10 },
  },
  {
    id: "bravo",
    coordinates: [0.5, 0],
    childIds: [],
    camera: { center: [0.5, 0], zoom: 16, pitch: 40, bearing: 0 },
  },
  {
    id: "charlie",
    coordinates: [5, 0],
    childIds: [],
    camera: { center: [5, 0], zoom: 14, pitch: 50, bearing: 0 },
  },
]
const project = ([longitude, latitude]) => ({
  x: longitude * 100,
  y: latitude * 100,
})

const clustered = buildAtlasMarkerGroups(nodes, {
  zoom: 10,
  project,
  clusterRadius: 75,
})
assert.equal(clustered.length, 2)
assert.equal(clustered[0].isCluster, true)
assert.deepEqual(
  clustered[0].nodes.map(node => node.id),
  ["alpha", "bravo"]
)
assert.deepEqual(clustered[0].coordinates, [0.25, 0])

const expanded = buildAtlasMarkerGroups(nodes, {
  zoom: 13,
  project,
  clusterRadius: 75,
})
assert.equal(expanded.length, 3)
assert.equal(expanded.every(group => !group.isCluster), true)

const selectedRemainsPrecise = buildAtlasMarkerGroups(nodes.slice(0, 2), {
  zoom: 10,
  project,
  selectedId: "bravo",
  clusterRadius: 75,
})
assert.equal(selectedRemainsPrecise.length, 2)
assert.equal(
  selectedRemainsPrecise.find(group => group.nodes[0].id === "bravo")
    .isCluster,
  false
)

assert.deepEqual(getAtlasPinFocusCamera(nodes[0]), {
  center: [0, 0],
  zoom: 15.5,
  pitch: 55,
  bearing: 10,
})
assert.deepEqual(getAtlasPinFocusCamera(nodes[1]), nodes[1].camera)

const destination = {
  ...nodes[0],
  childIds: ["bravo"],
}
assert.deepEqual(getAtlasPinFocusCamera(destination), {
  ...destination.camera,
  center: destination.coordinates,
})

console.log("Atlas marker layout tests passed.")
