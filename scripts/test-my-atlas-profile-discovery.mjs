import assert from "node:assert/strict"
import fs from "node:fs/promises"
import compiler from "vue-template-compiler"
import {
  normalizeInstagramHandle,
  instagramProfileUrl,
} from "../shared/my-atlas-instagram.mjs"
import { normalizeProfilePatch } from "../workers/my-atlas/src/account/contracts.mjs"
import { updateMyAtlasInstagram } from "../src/features/my-atlas/api/client.mjs"
import {
  directoryImageVersion,
  mergeDirectoryCards,
  readDirectoryWindow,
} from "../src/features/my-atlas/discovery/directory.mjs"

assert.equal(normalizeInstagramHandle(" @My.Travel_1 "), "my.travel_1")
assert.equal(normalizeInstagramHandle(" "), "")
for (const value of [
  null,
  12,
  "@",
  "@@user",
  "https://instagram.com/user",
  "user/x",
  "user?x=1",
  "a..b",
  ".user",
  "user.",
  "a".repeat(31),
  "user name",
  "<script>",
])
  assert.equal(normalizeInstagramHandle(value), null)
assert.equal(
  instagramProfileUrl("my.travel_1"),
  "https://www.instagram.com/my.travel_1/"
)
assert.equal(instagramProfileUrl("https://evil.example"), "")
const headers = new Headers({
  "If-Match": '"rev-1"',
  "Idempotency-Key": "33333333-3333-4333-8333-333333333333",
})
assert.deepEqual(
  normalizeProfilePatch({ instagramHandle: "@My.Travel" }, headers).patch,
  { instagramHandle: "my.travel" }
)
assert.deepEqual(
  normalizeProfilePatch({ instagramHandle: "" }, headers).patch,
  { instagramHandle: "" }
)
assert.throws(() =>
  normalizeProfilePatch({ instagramHandle: "javascript:alert(1)" }, headers)
)
let requests = 0
const profile = await updateMyAtlasInstagram({
  apiBaseUrl: "https://api.example",
  accessToken: "fixture",
  instagramHandle: "@My.Travel",
  revision: 1,
  fetchImpl: async (_url, options) => {
    requests++
    assert.equal(options.method, "PATCH")
    assert.deepEqual(JSON.parse(options.body), { instagramHandle: "my.travel" })
    assert.equal(options.headers.get("If-Match"), '"rev-1"')
    assert.ok(options.headers.get("Idempotency-Key"))
    return Response.json(
      {
        profile: {
          handle: "atlas-owner",
          instagramHandle: "my.travel",
          public: false,
          discoverable: false,
        },
      },
      { headers: { ETag: '"rev-2"' } }
    )
  },
})
assert.equal(profile.instagramHandle, "my.travel")
assert.equal(profile.revision, 2)
await assert.rejects(() =>
  updateMyAtlasInstagram({
    apiBaseUrl: "https://api.example",
    accessToken: "fixture",
    instagramHandle: "https://evil.example",
    revision: 2,
    fetchImpl: () => {
      requests++
      throw Error("Unexpected")
    },
  })
)
assert.equal(requests, 1)

const ownerSource = compiler
  .parseComponent(
    await fs.readFile(
      new URL(
        "../src/features/my-atlas/views/MyAtlasGeographicProof.vue",
        import.meta.url
      ),
      "utf8"
    )
  )
  .script.content.replace(/^import[\s\S]*?from\s+["'][^"']+["']\s*$/gm, "")
  .replace("export default", "return")
let fail = false
const ownerDependencies = {
  formatVisitedDates: () => "",
  formatPlaceTypeLabel: () => "",
  MyAtlasActionFeedback: {},
  MyAtlasMap: {},
  MyAtlasLocationPicker: {},
  MyAtlasPinEditor: {},
  MyAtlasPlanner: {},
  MyAtlasTrips: {},
  MyAtlasJourneyCards: {},
  MyAtlasRegistrationForm: {},
  MyAtlasTutorial: {},
  normalizeInstagramHandle,
  instagramProfileUrl,
  getMyAtlasApiAccessToken: async () => "fixture-token",
  updateMyAtlasInstagram: options =>
    updateMyAtlasInstagram({
      ...options,
      fetchImpl: async (_url, request) => {
        if (fail)
          return Response.json({ error: "invalid_request" }, { status: 400 })
        const value = JSON.parse(request.body)
        return Response.json(
          {
            profile: {
              handle: "atlas-owner",
              public: false,
              discoverable: false,
              instagramHandle: value.instagramHandle,
            },
          },
          { headers: { ETag: '"rev-3"' } }
        )
      },
    }),
}
const ownerComponent = new Function(
  ...Object.keys(ownerDependencies),
  ownerSource
)(...Object.values(ownerDependencies))
const owner = {
  accountProfile: { handle: "atlas-owner", public: false, revision: 2 },
  instagramDraft: "@New.Owner",
  instagramError: "",
  accountPending: false,
  apiBaseUrl: "https://api.example",
  withAccountRevisionRetry: (_token, action) => action(2),
  showActionFeedback: value => {
    owner.feedback = value
  },
}
await ownerComponent.methods.saveInstagramHandle.call(owner)
assert.equal(owner.accountProfile.instagramHandle, "new.owner")
assert.equal(
  owner.accountProfile.public,
  false,
  "saving Instagram must not publish an Atlas"
)
assert.equal(owner.instagramDraft, "new.owner")
assert.equal(owner.accountPending, false)
owner.instagramDraft = ""
await ownerComponent.methods.saveInstagramHandle.call(owner)
assert.equal(owner.accountProfile.instagramHandle, "")
owner.instagramDraft = "another.owner"
fail = true
await ownerComponent.methods.saveInstagramHandle.call(owner)
assert.equal(
  owner.instagramDraft,
  "another.owner",
  "failed save retains the desired input"
)
assert.equal(owner.feedback.tone, "error")
assert.equal(owner.accountPending, false)

const original = { handle: "first", favoriteImage: null }
const revised = {
  handle: "first",
  favoriteImage: { imageId: "image_new", updatedAt: "new" },
}
assert.deepEqual(
  mergeDirectoryCards([original], [revised, { handle: "second" }]),
  [revised, { handle: "second" }]
)
assert.notEqual(directoryImageVersion(original), directoryImageVersion(revised))
assert.notEqual(
  directoryImageVersion(revised),
  directoryImageVersion({
    ...revised,
    favoriteImage: { ...revised.favoriteImage, updatedAt: "later" },
  })
)
const cursors = []
const refreshed = await readDirectoryWindow(async cursor => {
  cursors.push(cursor)
  return cursor
    ? {
        atlases: Array.from({ length: 12 }, (_, i) => ({
          handle: `next-${i}`,
        })),
        nextCursor: "more",
      }
    : {
        atlases: Array.from({ length: 12 }, (_, i) =>
          i ? { handle: `first-${i}` } : revised
        ),
        nextCursor: "second",
      }
}, 24)
assert.deepEqual(cursors, ["", "second"])
assert.equal(refreshed.atlases.length, 24)
assert.equal(refreshed.atlases[0].favoriteImage.imageId, "image_new")
assert.equal(refreshed.nextCursor, "more")
const removed = await readDirectoryWindow(
  async () => ({ atlases: [], nextCursor: null }),
  24
)
assert.deepEqual(
  removed.atlases,
  [],
  "fresh snapshot removes profiles no longer listed"
)
await assert.rejects(
  () =>
    readDirectoryWindow(async () => ({ atlases: [], nextCursor: "loop" }), 24),
  /Repeated/
)
console.log(
  "Instagram normalization, safe links, revisioned client writes and directory refresh reconciliation tests passed."
)
