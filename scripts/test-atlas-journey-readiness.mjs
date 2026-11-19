import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

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
