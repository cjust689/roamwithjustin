import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createAdSenseConfig } from "../src/config/adsense.mjs"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)

const valid = {
  enabledFlag: "true",
  privacyReadyFlag: "true",
  autoAdsOffFlag: "true",
  clientId: "ca-pub-1234567890123456",
  storySlotId: "1234567890",
  nodeEnv: "production",
}

assert.equal(createAdSenseConfig().ready, false)
assert.equal(createAdSenseConfig(valid).ready, true)
assert.equal(
  createAdSenseConfig({ ...valid, nodeEnv: "development" }).ready,
  false
)
assert.equal(
  createAdSenseConfig({ ...valid, privacyReadyFlag: "false" }).ready,
  false
)
assert.equal(
  createAdSenseConfig({ ...valid, autoAdsOffFlag: "false" }).ready,
  false
)
assert.equal(
  createAdSenseConfig({ ...valid, clientId: "ca-pub-example" }).ready,
  false
)
assert.equal(
  createAdSenseConfig({ ...valid, storySlotId: "story-slot" }).ready,
  false
)

const documentTemplate = fs.readFileSync(
  path.join(projectRoot, "public", "index.html"),
  "utf8"
)
assert.doesNotMatch(documentTemplate, /adsbygoogle|pagead2/i)
assert.match(
  documentTemplate,
  /<meta name="google-adsense-account" content="ca-pub-5275158408075125">/
)

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(target)
    return /\.(?:vue|js|mjs)$/.test(entry.name) ? [target] : []
  })
}

const placementOwners = listSourceFiles(path.join(projectRoot, "src"))
  .filter(file => fs.readFileSync(file, "utf8").includes("<AdSlot"))
  .map(file => path.relative(projectRoot, file).replace(/\\/g, "/"))

assert.deepEqual(placementOwners, ["src/views/roam/RoamTripOverview.vue"])

console.log("AdSense configuration tests passed.")
