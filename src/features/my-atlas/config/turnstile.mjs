const SITEKEY_NAME = "VUE_APP_MY_ATLAS_TURNSTILE_SITEKEY"

function cleanValue(value) {
  return typeof value === "string" ? value.trim() : ""
}

export function getMyAtlasTurnstileSiteKey(environment = {}) {
  const siteKey = cleanValue(environment[SITEKEY_NAME])
  if (siteKey.length > 128 || /\s/.test(siteKey)) {
    throw new Error("My Atlas Turnstile sitekey is invalid.")
  }
  return siteKey
}

export const MY_ATLAS_TURNSTILE_ACTION = "my-atlas-register"
