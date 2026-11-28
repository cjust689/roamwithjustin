import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getJourneyBySlug } from "../src/content/journeys/index.mjs"
import { buildTripViewModel } from "../src/content/selectors/projections.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const read = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8")

const atlasView = read("src/features/atlas/views/AtlasView.vue")
const atlasReader = read(
  "src/features/atlas/components/AtlasStoryReader.vue"
)
const atlasRoutes = read("src/features/atlas/routes.js")
const sharedBody = read("src/components/JourneyStoryBody.vue")
const publicStory = read("src/views/roam/RoamTripOverview.vue")
const projections = read("src/content/selectors/projections.mjs")

for (const slug of [
  "utah-2025",
  "puerto-rico-2024",
  "usvi-2025",
]) {
  const trip = buildTripViewModel(getJourneyBySlug(slug))
  assert.ok(trip, `${slug} should resolve through the canonical trip selector`)
  assert.ok(trip.hasItinerary)
  assert.ok(trip.allMedia.length)
}

const costaRicaTrip = buildTripViewModel(getJourneyBySlug("costa-rica-2025"))
assert.deepEqual(
  costaRicaTrip.experiences.map(experience => experience.title),
  [
    "La Fortuna Airbnb",
    "Jurassic Canyon",
    "Casa Jungla",
    "Drake Bay",
    "Uvita The Lost Lemon",
    "Uvita",
    "Rancho La Merced",
    "Manuel Antonio",
  ],
  "Experience stories should follow canonical Journey Visit order rather than publication order"
)
assert.ok(
  costaRicaTrip.experiences.every(
    experience => experience.summary && !experience.summary.includes("\n")
  ),
  "Journey Experience cards should use one first-paragraph preview"
)

assert.match(atlasRoutes, /storyMode: route\.query\.story === "1"/)
assert.match(atlasView, /<AtlasMap/)
assert.match(atlasView, /<AtlasStoryReader/)
assert.match(atlasView, /v-if="currentNode && storyMode && storyTrip"/)
assert.match(atlasView, /readerScrollPositions/)
assert.match(atlasView, /detailScrollPositions/)
assert.match(atlasView, /setStoryRobots\(this\.storyMode\)/)
assert.match(atlasView, /atlas_story_opened/)
assert.ok(
  atlasView.indexOf("<AtlasMap") < atlasView.indexOf("<AtlasStoryReader"),
  "The persistent Atlas map should remain outside the conditional reader"
)

assert.match(atlasReader, /JourneyStoryBody/)
assert.match(atlasReader, />\s*Back to journey\s*</)
assert.match(atlasReader, /Show map/)
assert.match(atlasReader, /Continue reading/)
assert.match(atlasReader, /getScrollPosition\(\)/)
assert.match(atlasReader, /cancelScrollRestore/)
assert.match(atlasReader, /completeInitialRestore/)
assert.match(atlasReader, /focusInitialSection/)
assert.match(atlasReader, /:focused-section-id="initialSectionId"/)
assert.match(atlasReader, /scrollToStorySection\(this\.initialSectionId, \{/)
assert.match(atlasReader, /focus: true/)
assert.match(atlasReader, /:role="readerRole"/)
assert.match(atlasReader, /:aria-modal="readerIsModal \? 'true' : null"/)
assert.match(atlasReader, /return this\.mobileLayout && !this\.mapPreviewOpen/)
assert.match(atlasReader, /return this\.readerIsModal \? "dialog" : "region"/)
assert.match(atlasReader, /event\.key === "Tab" &&\s*this\.readerIsModal/)
assert.match(atlasReader, /aria-modal="true"/)
assert.doesNotMatch(atlasReader, /AdSlot/)
assert.doesNotMatch(atlasReader, /TravelPlanningOffers/)
assert.doesNotMatch(atlasReader, /commercialLinks/)

assert.match(publicStory, /<JourneyStoryBody/)
assert.match(publicStory, /#between-content/)
assert.match(sharedBody, /trip\.hasItinerary/)
assert.match(sharedBody, /trip\.experiences\.length/)
assert.doesNotMatch(sharedBody, /trip\.allMedia\.length/)
assert.match(sharedBody, /class="journey-experience-grid"/)
assert.match(sharedBody, /show-image/)
assert.match(sharedBody, /isExperienceExpanded\(experience\)/)
assert.match(sharedBody, /class="journey-experience-details"/)
assert.match(sharedBody, /Close full experience/)
assert.match(sharedBody, /loading="lazy"/)
assert.match(sharedBody, /:preload="embedded \? 'none' : 'metadata'"/)
assert.match(sharedBody, /embedded && getLocation/)
assert.match(projections, /atlasNodeId: exactNode\?\.id \|\| ""/)

console.log("Atlas in-place story reader tests passed.")
