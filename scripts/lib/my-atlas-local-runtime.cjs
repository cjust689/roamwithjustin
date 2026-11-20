const path = require("node:path")

function myAtlasLocalRuntime(projectRoot, environment, registration = null) {
  const persistencePath = path.resolve(
    projectRoot,
    "workers/my-atlas/.wrangler/state"
  )
  return {
    persistencePath,
    environment: {
      ...environment,
      VUE_APP_MY_ATLAS_API_URL: "http://127.0.0.1:8787",
      VUE_APP_MY_ATLAS_PLACE_SEARCH_URL:
        "http://127.0.0.1:8788/v1/places/search",
      ...(registration
        ? {
            VUE_APP_MY_ATLAS_LOCAL_REGISTRATION: "true",
            VUE_APP_MY_ATLAS_LOCAL_INVITE_CODE: registration.inviteCode,
            VUE_APP_MY_ATLAS_TURNSTILE_SITEKEY: registration.siteKey,
          }
        : {}),
    },
  }
}
function selectMyAtlasRuntime(
  projectRoot,
  environment,
  args,
  prepareRegistration
) {
  if (!args.includes("--my-atlas-local-api")) return null
  return myAtlasLocalRuntime(projectRoot, environment, prepareRegistration())
}
module.exports = { myAtlasLocalRuntime, selectMyAtlasRuntime }
