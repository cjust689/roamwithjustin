import path from "node:path"
import { fileURLToPath } from "node:url"
import { createAdSenseConfig } from "../src/config/adsense.mjs"
import buildEnvironment from "./lib/adsense-build-env.js"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const environment = buildEnvironment.loadAdSenseBuildEnvironment(
  projectRoot,
  process.env
)

const config = createAdSenseConfig({
  enabledFlag: environment.VUE_APP_ADSENSE_ENABLED,
  privacyReadyFlag: environment.VUE_APP_ADSENSE_PRIVACY_READY,
  autoAdsOffFlag: environment.VUE_APP_ADSENSE_AUTO_ADS_OFF_CONFIRMED,
  clientId: environment.VUE_APP_ADSENSE_CLIENT_ID,
  storySlotId: environment.VUE_APP_ADSENSE_STORY_SLOT_ID,
  nodeEnv: "production",
})

const adsTextLine = String(
  environment.ADSENSE_GOOGLE_ADS_TXT_LINE || ""
).trim()
const issues = [...config.issues]
const adsTextMatch = adsTextLine
  ? adsTextLine.match(
      /^google\.com,\s*pub-(\d+),\s*DIRECT,\s*[a-f0-9]+$/i
    )
  : null

if (adsTextLine && !adsTextMatch) {
  issues.push("ADSENSE_GOOGLE_ADS_TXT_LINE is not a valid Google seller line")
} else if (
  adsTextMatch &&
  config.clientId &&
  `ca-pub-${adsTextMatch[1]}` !== config.clientId
) {
  issues.push("The ads.txt publisher ID does not match the AdSense client ID")
}
if (config.requested && !adsTextLine) {
  issues.push("ADSENSE_GOOGLE_ADS_TXT_LINE must contain Google's exact line")
}

if (issues.length) {
  console.error("AdSense configuration failed:")
  issues.forEach(issue => console.error(`- ${issue}`))
  process.exit(1)
}

if (!config.requested) {
  console.log("AdSense configuration passed: advertising is disabled.")
  process.exit(0)
}

console.log(
  "AdSense configuration passed: one manual travel story slot is enabled."
)
