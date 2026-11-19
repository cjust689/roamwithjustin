import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
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
const publishedStoryJourneys = new Set([
  "utah-winter-2025",
  "puerto-rico-2024",
  "usvi-st-john-2025",
])

for (const root of roots) {
  const storyAction = root.actions.find(
    action => action.analyticsType === "story"
  )

  if (publishedStoryJourneys.has(root.journeyId)) {
    assert.ok(root.storyLead, `${root.journeyId} should expose a story lead`)
    assert.equal(root.storyLead.title, root.title)
    assert.ok(root.storyLead.image)
    assert.ok(root.storyLead.excerpt)
    assert.equal(root.storyLead.href, storyAction?.href)
    assert.equal(storyAction?.label, "Explore the story")
  } else {
    assert.equal(
      root.storyLead,
      null,
      `${root.journeyId} should not imply a published story`
    )
    assert.equal(
      storyAction,
      undefined,
      `${root.journeyId} should not expose a story action`
    )
  }
}

assert.match(detailPanel, /class="atlas-story-lead"/)
assert.match(detailPanel, />\s*Explore the story\s*</)
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
