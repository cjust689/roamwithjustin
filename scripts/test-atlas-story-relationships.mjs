import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { getJourneyBySlug } from "../src/content/journeys/index.mjs"
import {
  addTripAtlasNavigation,
  buildAtlasNodeView,
  buildTripViewModel,
} from "../src/content/selectors/projections.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const read = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8")

const nodes = atlasPresentation.map(buildAtlasNodeView).filter(Boolean)
const nodeById = new Map(nodes.map(node => [node.id, node]))

assert.equal(
  nodes.length,
  atlasPresentation.length,
  "Story relationships must not create duplicate Atlas pins"
)

const bonneville = nodeById.get("bonneville-salt-flats")
assert.deepEqual(
  bonneville.storyChapters.map(chapter => chapter.id),
  ["utah-winter-2025-chapter-2"]
)
assert.equal(
  bonneville.storyChapters[0].label,
  "Day 1: Sunrise at Salt Flats, Drive to Moab"
)

const cruzBay = nodeById.get("cruz-bay")
assert.deepEqual(
  cruzBay.storyChapters.map(chapter => chapter.position),
  [1, 3],
  "A Visit reused by two Journey days should keep both relationships"
)

const laFortuna = nodeById.get("la-fortuna-costa-rica")
assert.ok(
  laFortuna.storyExperiences.some(
    experience =>
      experience.id === "experience-la-fortuna-airbnb" && experience.card
  ),
  "A published Experience should appear at its exact stop before the full Journey is complete"
)

for (const id of ["utah", "moab", "europe"]) {
  assert.deepEqual(
    nodeById.get(id).storyChapters,
    [],
    `${id} must not infer a chapter relationship from geography alone`
  )
}

const utahTrip = buildTripViewModel(getJourneyBySlug("utah-2025"))
assert.equal(utahTrip.days[0].id, "utah-winter-2025-chapter-1")
assert.equal(
  utahTrip.days[0].locations.length,
  0,
  "An arrival chapter without Visit references remains Journey-only"
)

const navigableUtahTrip = addTripAtlasNavigation(utahTrip, nodes)
const firstPotashVisit = navigableUtahTrip.locations.find(
  location => location.visitId === "utah-winter-2025-potash-road"
)
const soloPotashVisit = navigableUtahTrip.locations.find(
  location => location.visitId === "utah-winter-2025-potash-road-solo"
)
assert.equal(firstPotashVisit.atlasNodeId, soloPotashVisit.atlasNodeId)
assert.deepEqual(
  firstPotashVisit.storyChapters.map(chapter => chapter.position),
  [2]
)
assert.deepEqual(
  soloPotashVisit.storyChapters.map(chapter => chapter.position),
  [4],
  "Distinct Visits at one Place must retain their own chapter edges"
)

const detailPanel = read(
  "src/features/atlas/components/AtlasDetailPanel.vue"
)
const atlasView = read("src/features/atlas/views/AtlasView.vue")
const storyReader = read(
  "src/features/atlas/components/AtlasStoryReader.vue"
)
const storyBody = read("src/components/JourneyStoryBody.vue")
const projections = read("src/content/selectors/projections.mjs")

assert.match(detailPanel, /class="atlas-stop-story"/)
assert.match(detailPanel, /actionLabel: "Read this chapter"/)
assert.match(detailPanel, /open-story-section/)
assert.match(detailPanel, />Journey sequence</)
assert.match(atlasView, /initial-section-id="readerSectionId"/)
assert.match(atlasView, /query\.section/)
assert.match(atlasView, /adjacentStops\(\)/)
assert.match(atlasView, /location\.atlasNodeId === this\.currentNode\?\.id/)
assert.match(storyReader, /scrollToStorySection/)
assert.match(storyBody, /data-story-section/)
assert.match(projections, /chapter\.visitIds\.includes\(visit\.id\)/)
assert.match(projections, /experience\.visitId === visit\.id/)
assert.match(projections, /experience\.placeId === visit\.placeId/)

console.log("Atlas stop and story relationship tests passed.")
