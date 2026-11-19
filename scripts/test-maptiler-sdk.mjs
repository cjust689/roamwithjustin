import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const packageJson = JSON.parse(await readFile("package.json", "utf8"))
const mapConfig = await readFile(
  "src/features/atlas/config/mapConfig.js",
  "utf8"
)
const componentPaths = [
  "src/features/atlas/components/AtlasMap.vue",
  "src/features/my-atlas/components/MyAtlasMap.vue",
]

assert.equal(
  packageJson.dependencies["@maptiler/sdk"],
  "^4.2.1",
  "The official MapTiler SDK JS dependency must stay pinned to the accepted major version."
)
assert.equal(
  packageJson.dependencies["maplibre-gl"],
  undefined,
  "The application must not depend directly on MapLibre GL."
)
assert.match(mapConfig, /config\.session\s*=\s*true/)
assert.match(mapConfig, /config\.caching\s*=\s*true/)
assert.match(mapConfig, /MapStyle\.HYBRID/)
assert.doesNotMatch(mapConfig, /demotiles\.maplibre\.org/)
assert.doesNotMatch(mapConfig, /VUE_APP_MAPTILER_STYLE_URL/)

for (const componentPath of componentPaths) {
  const source = await readFile(componentPath, "utf8")
  assert.match(source, /new mapTilerSdk\.Map\(/)
  assert.doesNotMatch(source, /from ["']maplibre-gl["']/)
  assert.doesNotMatch(source, /setWorkerUrl\(/)
  assert.doesNotMatch(source, /terrainSource/)
}

console.log("MapTiler SDK runtime boundary tests passed.")
