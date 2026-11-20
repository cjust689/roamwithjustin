import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import { Readable } from "node:stream"

import {
  downloadAuthorizedGearImage,
  isPublicRemoteAddress,
  validateAuthorizedImageUrl,
} from "./lib/gear-remote-image.mjs"

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x01])
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }]

assert.equal(isPublicRemoteAddress("93.184.216.34"), true)
assert.equal(isPublicRemoteAddress("2606:4700:4700::1111"), true)
for (const address of [
  "127.0.0.1",
  "10.0.0.4",
  "169.254.169.254",
  "192.168.1.2",
  "::1",
  "fc00::1",
  "fe80::1",
  "2001:db8::1",
  "::ffff:127.0.0.1",
]) {
  assert.equal(isPublicRemoteAddress(address), false, address)
}

assert.throws(
  () =>
    validateAuthorizedImageUrl(
      "http://images.example.com/a.jpg",
      "images.example.com"
    ),
  /must use HTTPS/
)
assert.throws(
  () =>
    validateAuthorizedImageUrl(
      "https://cdn.example.com/a.jpg",
      "images.example.com"
    ),
  /must exactly match/
)
assert.throws(
  () =>
    validateAuthorizedImageUrl(
      "https://user:pass@images.example.com/a.jpg",
      "images.example.com"
    ),
  /cannot contain credentials/
)
assert.throws(
  () => validateAuthorizedImageUrl("https://127.0.0.1/a.jpg", "127.0.0.1"),
  /public DNS hostname/
)
assert.throws(
  () =>
    validateAuthorizedImageUrl(
      "https://bad..example.com/a.jpg",
      "bad..example.com"
    ),
  /public DNS hostname/
)

const directRequests = []
const direct = await downloadAuthorizedGearImage(
  "https://images.example.com/products/camera.jpg?token=private#fragment",
  "images.example.com",
  1024,
  {
    lookup: publicLookup,
    request: fixtureRequest(
      [
        {
          body: jpeg,
          headers: {
            "content-length": String(jpeg.length),
            "content-type": "image/jpeg; charset=binary",
          },
          statusCode: 200,
        },
      ],
      directRequests
    ),
  }
)
assert.equal(direct.originalFilename, "camera.jpg")
assert.equal(direct.contract.format, "jpeg")
assert.deepEqual(direct.data, jpeg)
assert.equal(directRequests.length, 1)
assert.equal(directRequests[0].url.hash, "")
assert.equal(directRequests[0].options.servername, "images.example.com")
await assertPinnedLookup(directRequests[0].options.lookup)

const redirected = await downloadAuthorizedGearImage(
  "https://images.example.com/original",
  "images.example.com",
  1024,
  {
    lookup: publicLookup,
    request: fixtureRequest([
      {
        headers: { location: "/final/product" },
        statusCode: 302,
      },
      {
        body: png,
        headers: { "content-type": "image/png" },
        statusCode: 200,
      },
    ]),
  }
)
assert.equal(redirected.originalFilename, "remote-source.png")
assert.equal(redirected.contract.format, "png")

await assert.rejects(
  downloadAuthorizedGearImage(
    "https://images.example.com/a.jpg",
    "images.example.com",
    1024,
    {
      lookup: publicLookup,
      request: fixtureRequest([
        {
          headers: { location: "https://other.example.com/a.jpg" },
          statusCode: 302,
        },
      ]),
    }
  ),
  /must exactly match/
)

let unsafeRequestCalled = false
await assert.rejects(
  downloadAuthorizedGearImage(
    "https://images.example.com/a.jpg",
    "images.example.com",
    1024,
    {
      lookup: async () => [{ address: "169.254.169.254", family: 4 }],
      request: () => {
        unsafeRequestCalled = true
      },
    }
  ),
  /private, local, or reserved address/
)
assert.equal(unsafeRequestCalled, false)

await assert.rejects(
  downloadAuthorizedGearImage(
    "https://images.example.com/a.jpg",
    "images.example.com",
    1024,
    {
      lookup: publicLookup,
      request: fixtureRequest([
        {
          body: Buffer.from("<html></html>"),
          headers: { "content-type": "text/html" },
          statusCode: 200,
        },
      ]),
    }
  ),
  /must declare image\/jpeg or image\/png/
)

await assert.rejects(
  downloadAuthorizedGearImage(
    "https://images.example.com/a.jpg",
    "images.example.com",
    4,
    {
      lookup: publicLookup,
      request: fixtureRequest([
        {
          body: jpeg,
          headers: { "content-length": "6", "content-type": "image/jpeg" },
          statusCode: 200,
        },
      ]),
    }
  ),
  /exceeds the 50 MiB intake limit/
)

await assert.rejects(
  downloadAuthorizedGearImage(
    "https://images.example.com/a.jpg",
    "images.example.com",
    1024,
    {
      lookup: publicLookup,
      request: fixtureRequest([
        {
          body: Buffer.from("not a jpeg"),
          headers: { "content-type": "image/jpeg" },
          statusCode: 200,
        },
      ]),
    }
  ),
  /bytes do not match/
)

await assert.rejects(
  downloadAuthorizedGearImage(
    "https://images.example.com/a.jpg",
    "images.example.com",
    1024,
    {
      lookup: publicLookup,
      request: fixtureRequest([{ headers: {}, statusCode: 302 }]),
    }
  ),
  /did not provide a location/
)

await assert.rejects(
  downloadAuthorizedGearImage(
    "https://images.example.com/a.jpg",
    "images.example.com",
    1024,
    {
      lookup: publicLookup,
      request: fixtureRequest(
        Array.from({ length: 4 }, () => ({
          headers: { location: "/again.jpg" },
          statusCode: 302,
        }))
      ),
    }
  ),
  /three-redirect limit/
)

await assert.rejects(
  downloadAuthorizedGearImage(
    "https://images.example.com/a.jpg",
    "images.example.com",
    1024,
    {
      lookup: publicLookup,
      request: stalledRequest,
      timeoutMs: 5,
    }
  ),
  /request timed out/
)

console.log("Gear remote image intake tests passed.")

function fixtureRequest(fixtures, calls = []) {
  let index = 0
  return (url, options, callback) => {
    const outbound = new EventEmitter()
    calls.push({ options, url })
    outbound.end = () => {
      queueMicrotask(() => {
        const fixture = fixtures[index]
        index += 1
        if (!fixture) {
          outbound.emit("error", new Error("Missing request fixture"))
          return
        }
        const response = Readable.from(
          fixture.body === undefined ? [] : [fixture.body]
        )
        response.headers = fixture.headers || {}
        response.statusCode = fixture.statusCode
        callback(response)
      })
    }
    outbound.destroy = error => {
      if (error) queueMicrotask(() => outbound.emit("error", error))
    }
    return outbound
  }
}

function stalledRequest() {
  const outbound = new EventEmitter()
  outbound.end = () => {}
  outbound.destroy = error => {
    if (error) queueMicrotask(() => outbound.emit("error", error))
  }
  return outbound
}

function assertPinnedLookup(lookup) {
  return new Promise((resolve, reject) => {
    lookup("different.invalid", { all: true }, (error, addresses) => {
      if (error) {
        reject(error)
        return
      }
      try {
        assert.deepEqual(addresses, [{ address: "93.184.216.34", family: 4 }])
        resolve()
      } catch (assertionError) {
        reject(assertionError)
      }
    })
  })
}
