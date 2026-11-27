import assert from "node:assert/strict"
import {
  buildAtlasMarkerGroups,
  buildAtlasRootMarkerOffsets,
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

const repeatedJourneyRoots = [
  { id: "utah-2025", parentId: null, coordinates: [-111.0937, 39.321] },
  { id: "utah-2026", parentId: null, coordinates: [-111.0937, 39.321] },
  { id: "puerto-rico", parentId: null, coordinates: [-66.5901, 18.2208] },
]
const rootProject = ([longitude, latitude]) => ({
  x: longitude * 4,
  y: latitude * 4,
})
const rootOffsets = buildAtlasRootMarkerOffsets(repeatedJourneyRoots, {
  project: rootProject,
  spacing: 160,
})
assert.deepEqual(rootOffsets, {
  "utah-2025": { x: -80, y: 0 },
  "utah-2026": { x: 80, y: 0 },
})

const edgeSafeRootOffsets = buildAtlasRootMarkerOffsets(
  repeatedJourneyRoots.slice(0, 2),
  {
    project: () => ({ x: 20, y: 120 }),
    spacing: 72,
    viewportWidth: 390,
  }
)
assert.deepEqual(edgeSafeRootOffsets, {
  "utah-2025": { x: 16, y: 0 },
  "utah-2026": { x: 88, y: 0 },
})

const separatedJourneyRoots = buildAtlasMarkerGroups(repeatedJourneyRoots, {
  zoom: 1.3,
  project: rootProject,
  clusterRadius: 112,
  unclusteredIds: Object.keys(rootOffsets),
})
assert.equal(
  separatedJourneyRoots.filter(group =>
    group.nodes.some(node => node.id.startsWith("utah-"))
  ).length,
  2
)
assert.equal(
  separatedJourneyRoots
    .filter(group => group.nodes.some(node => node.id.startsWith("utah-")))
    .every(group => !group.isCluster),
  true
)

const childOffsets = buildAtlasRootMarkerOffsets(
  [
    { id: "zion-1", parentId: "utah", coordinates: [-113, 37.3] },
    { id: "zion-2", parentId: "utah", coordinates: [-113, 37.3] },
  ],
  { project: rootProject }
)
assert.deepEqual(childOffsets, {})

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
