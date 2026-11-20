import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  atlasRootIds,
  getAtlasNodes,
} from "../src/content/selectors/atlas.js"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const readSource = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8")

const atlasView = readSource("src/features/atlas/views/AtlasView.vue")
const detailPanel = readSource(
  "src/features/atlas/components/AtlasDetailPanel.vue"
)

const storyRootIds = getAtlasNodes(atlasRootIds)
  .filter(node => Boolean(node.storyLead))
  .map(node => node.id)

assert.deepEqual(storyRootIds, ["utah", "puerto-rico", "st-john"])
assert.match(atlasView, /v-for="node in storyRootNodes"/)
assert.match(atlasView, /storyRootNodes\(\)[\s\S]*node\.storyLead/)
assert.doesNotMatch(atlasView, /v-for="node in rootNodes"/)
assert.match(atlasView, />\s*Explore\s*</)
assert.doesNotMatch(atlasView, /First look|still taking shape|will be added/)
assert.doesNotMatch(atlasView, />Journey preview</)

assert.doesNotMatch(
  detailPanel,
  /First look|still taking shape|will be added over time/
)
assert.doesNotMatch(detailPanel, /displayEyebrow/)
assert.doesNotMatch(detailPanel, /child\.eyebrow/)

console.log("Atlas Journey readiness copy tests passed.")
