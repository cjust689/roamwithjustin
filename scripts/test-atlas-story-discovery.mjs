import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { getJourney } from "../src/content/journeys/index.mjs"
import { resolveMediaReference } from "../src/content/selectors/media.mjs"
import { buildAtlasNodeView } from "../src/content/selectors/projections.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const detailPanel = fs.readFileSync(
  path.join(projectRoot, "src/features/atlas/components/AtlasDetailPanel.vue"),
  "utf8"
)
const journeyPlayer = fs.readFileSync(
  path.join(projectRoot, "src/features/atlas/components/AtlasJourneyPlayer.vue"),
  "utf8"
)
const atlasView = fs.readFileSync(
  path.join(projectRoot, "src/features/atlas/views/AtlasView.vue"),
  "utf8"
)
const atlasRoutes = fs.readFileSync(
  path.join(projectRoot, "src/features/atlas/routes.js"),
  "utf8"
)
const appRouter = fs.readFileSync(
  path.join(projectRoot, "src/router/index.js"),
  "utf8"
)

const nodes = atlasPresentation.map(buildAtlasNodeView).filter(Boolean)
const roots = nodes.filter(node => !node.parentId)
const completedStoryJourneys = new Set([
  "utah-winter-2025",
  "puerto-rico-2024",
  "usvi-st-john-2025",
])

for (const root of roots) {
  const presentation = atlasPresentation.find(item => item.id === root.id)
  const journey = getJourney(root.journeyId)
  const storyAction = root.actions.find(
    action => action.analyticsType === "story"
  )

  assert.ok(root.storyLead, `${root.journeyId} should expose a story lead`)
  assert.equal(root.storyLead.title, root.title)
  assert.equal(root.storyLead.href, storyAction?.href)

  if (journey?.hero && !presentation?.hero) {
    assert.equal(root.image, resolveMediaReference(journey.hero)?.src)
  }
  assert.equal(storyAction?.label, "Explore the story")

  if (completedStoryJourneys.has(root.journeyId)) {
    assert.ok(root.storyLead.image)
    assert.ok(root.storyLead.excerpt)
    assert.equal(root.storyLead.progressNote, "")
  } else {
    assert.match(root.storyLead.progressNote, /Check back for updates\./)
  }
}

const costaRicaPresentation = atlasPresentation.find(
  item => item.id === "costa-rica"
)
const explicitRootOverride = "/test/atlas-root-override.jpg"
assert.equal(
  buildAtlasNodeView({
    ...costaRicaPresentation,
    hero: { src: explicitRootOverride, kind: "image" },
  }).image,
  explicitRootOverride
)

assert.match(detailPanel, /class="atlas-story-lead"/)
assert.match(detailPanel, />\s*Explore the story\s*</)
assert.match(detailPanel, /class="atlas-story-progress-note"/)
assert.match(detailPanel, />Journey stops</)
assert.match(detailPanel, />Useful links</)
assert.match(detailPanel, /usefulActions\.length/)
assert.doesNotMatch(detailPanel, /Read the trip story/)
assert.doesNotMatch(detailPanel, /Scroll for story, photos/)
assert.doesNotMatch(detailPanel, /<p>\{\{ node\.category \}\}<\/p>/)
assert.doesNotMatch(detailPanel, /In \{\{ node\.storyTitle \}\}/)
assert.doesNotMatch(detailPanel, /From the trip/)
assert.match(detailPanel, /class="atlas-scroll-fade"/)
assert.match(detailPanel, /class="atlas-dock-count"/)
assert.match(detailPanel, /\{\{ savedCount \}\}/)
assert.match(journeyPlayer, /class="atlas-guided-expand"/)
assert.match(journeyPlayer, /class="atlas-guided-collapse-icon"/)
assert.doesNotMatch(journeyPlayer, /&#8964;/)
assert.match(atlasView, /:saved-count="favoriteNodes\.length"/)
assert.match(atlasView, /\.atlas-page\.has-detail \.atlas-saved-trigger/)
assert.match(atlasView, /isMyAtlasGeographicProofEnabled/)
assert.match(atlasView, /v-if="myAtlasEnabled"/)
assert.match(atlasView, /class="atlas-my-atlas-link"/)
assert.match(atlasView, /to="\/my-atlas"/)
assert.match(atlasView, /class="atlas-my-atlas-toast"/)
assert.match(atlasView, />\s*Make your own Atlas\.\s*</)
assert.match(atlasView, /MY_ATLAS_INVITE_STORAGE_KEY/)
assert.match(atlasView, /dismissMyAtlasInvite/)
assert.match(
  atlasView,
  /welcomeExpanded:\s*false/,
  "The homepage journey explorer should start collapsed so the map is immediately interactive"
)
assert.match(
  atlasView,
  /if \(!nodeId\) this\.welcomeExpanded = false/,
  "Returning to the Atlas root should restore the map-first collapsed state"
)
assert.match(atlasRoutes, /path: "\/",\s*name: "Home"/)
assert.match(atlasRoutes, /component: atlasView/)
assert.doesNotMatch(appRouter, /views\/roam\/Home\.vue/)
assert.equal(
  fs.existsSync(path.join(projectRoot, "src/views/roam/Home.vue")),
  false,
  "The standalone marketing homepage should remain removed"
)
assert.ok(
  detailPanel.indexOf('class="atlas-story-lead"') <
    detailPanel.indexOf('class="atlas-discoveries"'),
  "The story lead should appear before Journey stops"
)
assert.ok(
  detailPanel.indexOf('class="atlas-mini-gallery"') <
    detailPanel.indexOf('class="atlas-actions"'),
  "Useful links should follow editorial media"
)

console.log("Atlas story discovery tests passed.")
