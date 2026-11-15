const fs = require("fs")
const path = require("path")

const ADSENSE_KEYS = new Set([
  "VUE_APP_ADSENSE_ENABLED",
  "VUE_APP_ADSENSE_PRIVACY_READY",
  "VUE_APP_ADSENSE_AUTO_ADS_OFF_CONFIRMED",
  "VUE_APP_ADSENSE_CLIENT_ID",
  "VUE_APP_ADSENSE_STORY_SLOT_ID",
  "VUE_APP_ADSENSE_ATLAS_ENABLED",
  "VUE_APP_ADSENSE_ATLAS_SLOT_ID",
  "ADSENSE_GOOGLE_ADS_TXT_LINE",
])

function unquote(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function readAllowedValues(file) {
  if (!fs.existsSync(file)) return {}

  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match || !ADSENSE_KEYS.has(match[1])) return values
      values[match[1]] = unquote(match[2])
      return values
    }, {})
}

function loadAdSenseBuildEnvironment(projectRoot, processEnvironment) {
  const environment = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ].reduce(
    (values, filename) => ({
      ...values,
      ...readAllowedValues(path.join(projectRoot, filename)),
    }),
    {}
  )

  ADSENSE_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(processEnvironment, key)) {
      environment[key] = processEnvironment[key]
    }
  })

  return environment
}

module.exports = { loadAdSenseBuildEnvironment }
