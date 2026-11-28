import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { atlasPresentation } from "../src/content/atlas/presentation.mjs"
import { getJourney } from "../src/content/journeys/index.mjs"
import {
  firstImageMedia,
  resolveMediaReference,
} from "../src/content/selectors/media.mjs"
import {
  buildAtlasNodeView,
  journeyDisplayTitle,
  orderAtlasNodesByJourney,
} from "../src/content/selectors/projections.mjs"

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
const atlasMap = fs.readFileSync(
  path.join(projectRoot, "src/features/atlas/components/AtlasMap.vue"),
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
  assert.equal(root.title, journeyDisplayTitle(journey))
  assert.equal(root.storyLead.title, root.title)
  assert.equal(root.storyLead.href, storyAction?.href)
  assert.equal(root.eyebrow, journey.dateRange?.label)
  assert.equal(root.dateLabel, journey.dateRange?.label)

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
const costaRicaNode = nodes.find(item => item.id === "costa-rica")
const costaRicaJourney = getJourney("costa-rica-2025")
const costaRicaHero = resolveMediaReference(costaRicaJourney.hero)?.src
assert.ok(costaRicaHero)
assert.equal(costaRicaNode.image, costaRicaHero)
assert.equal(costaRicaNode.storyLead.image, costaRicaHero)
assert.deepEqual(
  orderAtlasNodesByJourney(
    nodes.filter(node => node.parentId === "costa-rica")
  ).map(node => node.id),
  [
    "la-fortuna-costa-rica",
    "bajos-del-toro",
    "san-jose-costa-rica",
    "drake-bay",
    "uvita-costa-rica",
    "manuel-antonio-area",
  ]
)
const uvitaNode = nodes.find(node => node.id === "uvita-costa-rica")
assert.equal(
  uvitaNode.image,
  resolveMediaReference({
    assetId: "image-costa-rica-2025-5452162a6717-001",
  })?.src
)
assert.deepEqual(
  orderAtlasNodesByJourney(
    nodes.filter(node => node.parentId === "uvita-costa-rica")
  ).map(node => node.id),
  ["uvita-whale-tail", "rancho-la-merced", "nauyaca-waterfalls"]
)
assert.deepEqual(
  uvitaNode.storyExperiences.map(experience => experience.card.title),
  ["Uvita House"]
)
const uvitaHouse = uvitaNode.storyExperiences[0]
assert.equal(
  uvitaHouse.card.summary,
  "Our Airbnb in Uvita feels secluded without putting us far from everything. The shoulder season brings a mix of good weather and rain, and I’m glad we have a private pool for time in the water. I also appreciate something less glamorous, laundry on the property. Between hikes and traveling, we haven’t had much time to catch up on it."
)
assert.doesNotMatch(uvitaHouse.card.summary, /\n/)
assert.equal(
  uvitaHouse.card.image?.id,
  "image-costa-rica-2025-fd4e32d92375-001"
)
assert.deepEqual(
  uvitaHouse.moments[0]?.media.map(media => media.kind),
  ["image", "image", "image", "video"]
)
const ranchoNode = nodes.find(node => node.id === "rancho-la-merced")
assert.equal(ranchoNode.parentId, "uvita-costa-rica")
assert.deepEqual(
  ranchoNode.storyExperiences.map(experience => experience.card.title),
  ["Uvita Horses"]
)
assert.equal(ranchoNode.storyExperiences[0]?.moments[0]?.media.length, 1)
assert.equal(
  ranchoNode.storyExperiences[0]?.moments[0]?.media[0]?.id,
  "video-costa-rica-2025-2568e61dfd18-001"
)
assert.equal(
  ranchoNode.storyExperiences[0]?.moments[0]?.media[0]?.kind,
  "video"
)
const whaleTailNode = nodes.find(node => node.id === "uvita-whale-tail")
assert.equal(whaleTailNode.parentId, "uvita-costa-rica")
assert.equal(whaleTailNode.storyExperiences[0]?.moments[0]?.title, "High Tide Whale Tail")
assert.equal(whaleTailNode.storyExperiences[0]?.moments[0]?.media.length, 7)
const explicitRootOverride = "/test/atlas-root-override.jpg"
assert.equal(
  buildAtlasNodeView({
    ...costaRicaPresentation,
    hero: { src: explicitRootOverride, kind: "image" },
  }).image,
  explicitRootOverride
)
assert.equal(
  buildAtlasNodeView({
    ...costaRicaPresentation,
    hero: { src: "/test/atlas-root-override.mp4", kind: "video" },
  }).image,
  costaRicaHero
)
assert.equal(
  firstImageMedia([
    { src: "/test/first.mp4", kind: "video" },
    { src: "/test/cover.jpg", kind: "image" },
  ])?.src,
  "/test/cover.jpg"
)

assert.match(detailPanel, /class="atlas-story-lead"/)
assert.match(detailPanel, />\s*Explore the story\s*</)
assert.match(detailPanel, /class="atlas-detail-date"/)
assert.match(detailPanel, /class="atlas-story-lead-date"/)
assert.doesNotMatch(
  detailPanel,
  /\.atlas-story-lead-media\s*\{\s*display:\s*none;/
)
assert.match(detailPanel, /class="atlas-story-progress-note"/)
assert.match(detailPanel, /Inside \{\{ node\.title \}\}/)
assert.match(detailPanel, /destinationIndexItems/)
assert.match(detailPanel, /openDestinationItem\(item\)/)
assert.match(detailPanel, /item\.kindLabel/)
assert.match(detailPanel, /experience\.card\?\.summary \|\| experience\.summary/)
assert.match(detailPanel, /experience\.card\?\.image\?\.src \|\| ""/)
assert.match(detailPanel, /actionLabel: "Read this experience"/)
assert.match(detailPanel, /v-if="storySections\.length && !hasDestinationIndex"/)
assert.doesNotMatch(detailPanel, /class="atlas-experience-stories"/)
assert.doesNotMatch(detailPanel, /class="atlas-experience-moment-media"/)
assert.doesNotMatch(detailPanel, /Continue in the full journey/)
assert.match(
  detailPanel,
  /openDestinationItem\(item\)\s*\{[\s\S]*?this\.\$emit\("open-story-section", item\.id\)/
)
assert.match(
  atlasView,
  /<small v-if="node\.dateLabel">\{\{ node\.dateLabel \}\}<\/small>/
)
assert.match(atlasMap, /labelMeta\.className = "atlas-marker-meta"/)
assert.match(atlasMap, /\[node\.image, \.\.\.node\.media\]/)
assert.match(
  atlasMap,
  /item\.kind === "video" \? item\.poster \|\| "" : item\.src/
)
assert.match(detailPanel, /image: experience\.card\.image\?\.src \|\| ""/)
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
