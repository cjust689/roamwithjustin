const fs = require("node:fs")
const path = require("node:path")
const { randomBytes } = require("node:crypto")
const dotenv = require("dotenv")

const TEST_SITE_KEY = "1x00000000000000000000AA"
const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA"

function prepareLocalRegistration(projectRoot) {
  const file = path.resolve(projectRoot, "workers/my-atlas/.dev.vars")
  const original = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
  const values = dotenv.parse(original)
  // A manually configured real Turnstile secret keeps its existing setup.
  if (
    values.TURNSTILE_SECRET_KEY &&
    values.TURNSTILE_SECRET_KEY !== TEST_SECRET_KEY
  )
    return null
  const next = {
    ...values,
    INVITE_HASH_PEPPER:
      values.INVITE_HASH_PEPPER || randomBytes(48).toString("base64url"),
    TURNSTILE_SECRET_KEY: TEST_SECRET_KEY,
    BETA_TERMS_VERSION: values.BETA_TERMS_VERSION || "local-beta-1",
    BETA_PRIVACY_VERSION: values.BETA_PRIVACY_VERSION || "local-privacy-1",
    MY_ATLAS_LOCAL_REGISTRATION: "true",
    MY_ATLAS_LOG_CONFIGURATION_ERRORS: "true",
  }
  if (
    !values.LOCAL_REGISTRATION_INVITE_CODE ||
    !Number.isFinite(Date.parse(values.LOCAL_REGISTRATION_INVITE_EXPIRES)) ||
    Date.parse(values.LOCAL_REGISTRATION_INVITE_EXPIRES) <= Date.now()
  ) {
    next.LOCAL_REGISTRATION_INVITE_CODE =
      "local_" + randomBytes(24).toString("base64url")
    next.LOCAL_REGISTRATION_INVITE_CREATED = new Date().toISOString()
    next.LOCAL_REGISTRATION_INVITE_EXPIRES = new Date(
      Date.now() + 86400000
    ).toISOString()
  }
  let contents = original
  for (const [key, value] of Object.entries(next)) {
    if (values[key] === value) continue
    const line = `${key}=${JSON.stringify(value)}`
    if (Object.prototype.hasOwnProperty.call(values, key))
      contents = contents.replace(new RegExp("^" + key + "=.*$", "m"), line)
    else
      contents +=
        (contents.endsWith("\n") || !contents ? "" : "\n") + line + "\n"
  }
  if (contents !== original) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, contents)
  }
  return {
    siteKey: TEST_SITE_KEY,
    inviteCode: next.LOCAL_REGISTRATION_INVITE_CODE,
  }
}
module.exports = { prepareLocalRegistration }
