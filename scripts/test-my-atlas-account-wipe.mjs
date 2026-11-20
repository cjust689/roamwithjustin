import assert from "node:assert/strict"
import {
  parseWipeArguments,
  runWipeAccount,
  validateWipeOptions,
} from "./my-atlas/wipe-account.mjs"

const handle = "test-traveler"

{
  const options = validateWipeOptions(parseWipeArguments(["--handle", handle]))
  assert.equal(options.apiBaseUrl, "http://127.0.0.1:8787")
  assert.equal(options.apply, false)
}

assert.throws(
  () =>
    validateWipeOptions(
      parseWipeArguments([
        "--handle",
        handle,
        "--api-base",
        "https://api.example.com",
      ])
    ),
  /requires --allow-remote/
)

assert.throws(
  () =>
    validateWipeOptions(parseWipeArguments(["--handle", handle, "--apply"])),
  /Deletion requires/
)

{
  const options = validateWipeOptions(
    parseWipeArguments([
      "--handle",
      handle,
      "--apply",
      "--confirm",
      `WIPE USER MY ATLAS @${handle}`,
    ])
  )
  const requests = []
  const messages = []
  const result = await runWipeAccount({
    options,
    accessToken: "private-test-token",
    log: message => messages.push(message),
    fetchImpl: async (url, request) => {
      requests.push({ url, request })
      if (request.method === "GET") {
        return new Response(
          JSON.stringify({
            profile: {
              handle,
              displayName: "Test Traveler",
              public: false,
              discoverable: false,
              revision: 7,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ETag: '"rev-7"',
            },
          }
        )
      }
      return new Response(
        JSON.stringify({
          deleted: true,
          deletedAt: "2026-11-20T15:00:00.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    },
  })
  assert.equal(result.deleted, true)
  assert.equal(requests.length, 2)
  assert.equal(requests[1].url, "http://127.0.0.1:8787/v1/me")
  assert.equal(requests[1].request.method, "DELETE")
  assert.equal(requests[1].request.headers.get("If-Match"), '"rev-7"')
  assert.deepEqual(JSON.parse(requests[1].request.body), {
    confirmation: "DELETE MY ATLAS",
  })
  assert.equal(
    messages.some(message =>
      message.includes("curated Roam With Justin Atlas")
    ),
    true
  )
  assert.equal(
    messages.some(message => message.includes("private-test-token")),
    false
  )
}

console.log("My Atlas account wipe tests passed.")
