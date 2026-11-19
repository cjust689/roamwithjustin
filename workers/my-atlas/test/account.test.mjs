import { env } from "cloudflare:workers"
import { reset, runInDurableObject } from "cloudflare:test"
import { beforeEach, describe, expect, it } from "vitest"
import {
  createMyPin,
  deleteMyAccount,
  deleteMyPin,
  exportMyAtlas,
  getMyAtlasImage,
  getMyAtlasState,
  getMyProfile,
  listMyPins,
  removeMyAtlasImage,
  replaceMyAtlasImage,
  updateMyPin,
  updateMyProfile,
} from "../src/account/service.mjs"
import { normalizeDeleteAccount } from "../src/planning/contracts.mjs"
import { normalizeRegistrationInput } from "../src/registration/contracts.mjs"
import { hashInviteCode } from "../src/registration/hashing.mjs"
import {
  REGISTRY_OBJECT_NAME,
  registerBetaAccount,
} from "../src/registration/service.mjs"

const NOW = "2026-11-16T17:00:00.000Z"
const EXPIRES = "2026-11-17T17:00:00.000Z"
const PEPPER = "test-only-account-pepper-with-at-least-32-characters"
const IDENTITY = {
  issuer: "https://roamwithjustin.us.auth0.com/",
  subject: "google-oauth2|account-owner",
}
const USER_ID = "usr_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const SECOND_IDENTITY = {
  issuer: "https://roamwithjustin.us.auth0.com/",
  subject: "google-oauth2|second-account-owner",
}
const SECOND_USER_ID = "usr_cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function environment() {
  return {
    ...env,
    BETA_TERMS_VERSION: "test-terms-1",
    BETA_PRIVACY_VERSION: "test-privacy-1",
    INVITE_HASH_PEPPER: PEPPER,
    TURNSTILE_SECRET_KEY: "test-only-turnstile-secret",
    TURNSTILE_ACTION: "my-atlas-register",
    TURNSTILE_HOSTNAMES: "localhost",
  }
}

function registry() {
  return env.MY_ATLAS_REGISTRY.getByName(REGISTRY_OBJECT_NAME)
}

async function registerOwner() {
  const inviteCode = "account_test_invitation_1234567890"
  const digest = await hashInviteCode(inviteCode, PEPPER)
  await registry().issueInvitation({
    digest,
    maxUses: 1,
    createdAt: NOW,
    expiresAt: EXPIRES,
  })
  const input = normalizeRegistrationInput(
    {
      inviteCode,
      handle: "account-owner",
      displayName: "Account Owner",
      turnstileToken: "test-turnstile-token",
      acceptTerms: true,
      acceptPrivacy: true,
    },
    "11111111-1111-4111-8111-111111111111"
  )
  return registerBetaAccount({
    environment: environment(),
    identity: IDENTITY,
    input,
    now: NOW,
    turnstileVerifier: async () => true,
    userIdFactory: () => USER_ID,
  })
}

async function registerSecondOwner() {
  const inviteCode = "second_account_test_invitation_1234567890"
  const digest = await hashInviteCode(inviteCode, PEPPER)
  await registry().issueInvitation({
    digest,
    maxUses: 1,
    createdAt: NOW,
    expiresAt: EXPIRES,
  })
  const input = normalizeRegistrationInput(
    {
      inviteCode,
      handle: "second-owner",
      displayName: "Second Owner",
      turnstileToken: "test-turnstile-token",
      acceptTerms: true,
      acceptPrivacy: true,
    },
    "12121212-1212-4212-8212-121212121212"
  )
  return registerBetaAccount({
    environment: environment(),
    identity: SECOND_IDENTITY,
    input,
    now: NOW,
    turnstileVerifier: async () => true,
    userIdFactory: () => SECOND_USER_ID,
  })
}

function pinInput({
  placeId,
  customPlace,
  visitedYears = [],
  memory = "",
  expectedRevision,
  idempotencyKey,
}) {
  return {
    ...(customPlace ? { customPlace } : { placeId }),
    visitedYears,
    memory,
    expectedRevision,
    idempotencyKey,
  }
}

const catalogResolver = async placeId =>
  placeId === "geonames:5843642"
    ? {
        placeId,
        placeType: "spot",
        name: "Yellowstone National Park",
        spotCategory: "national-park",
        spotKind: "National park",
        countryCode: "US",
        countryName: "United States",
        deprecated: false,
        coordinates: [-110.58846, 44.42796],
      }
    : {
        placeId,
        placeType: placeId.startsWith("iso-country:") ? "country" : "city",
        name: placeId.startsWith("iso-country:") ? "Costa Rica" : "Uvita",
        countryCode: "CR",
        countryName: "Costa Rica",
        deprecated: false,
        coordinates: [-83.7395, 9.17039],
      }

beforeEach(async () => {
  await reset()
  await registerOwner()
})

describe("private owner profile and pin services", () => {
  it("stores one private Atlas image, replaces it atomically, and removes it", async () => {
    let imageSequence = 0
    const imageTransformer = async ({ bytes }) => {
      imageSequence += 1
      const output = new Uint8Array([82, 73, 70, 70, imageSequence])
      return {
        bytes: output.buffer,
        contentType: "image/webp",
        width: 1200,
        height: 1200,
        byteLength: output.byteLength,
        sourceSha256: String(imageSequence).padStart(64, "0"),
      }
    }
    const first = await replaceMyAtlasImage({
      environment: environment(),
      identity: IDENTITY,
      input: {
        expectedRevision: 1,
        idempotencyKey: "01010101-0101-4101-8101-010101010101",
      },
      upload: {
        bytes: new Uint8Array([1]).buffer,
        contentType: "image/jpeg",
      },
      imageTransformer,
      imageIdFactory: () => "image_11111111111111111111111111111111",
      now: NOW,
    })
    expect(first).toMatchObject({
      profile: { revision: 2 },
      atlasImage: {
        imageId: "image_11111111111111111111111111111111",
        width: 1200,
        height: 1200,
      },
    })
    const firstObject = await env.MY_ATLAS_MEDIA_R2.get(
      `private/atlas/${USER_ID}/image_11111111111111111111111111111111.webp`
    )
    expect(firstObject).not.toBeNull()

    const second = await replaceMyAtlasImage({
      environment: environment(),
      identity: IDENTITY,
      input: {
        expectedRevision: 2,
        idempotencyKey: "02020202-0202-4202-8202-020202020202",
      },
      upload: {
        bytes: new Uint8Array([2]).buffer,
        contentType: "image/png",
      },
      imageTransformer,
      imageIdFactory: () => "image_22222222222222222222222222222222",
      now: "2026-11-16T18:00:00.000Z",
    })
    expect(second).toMatchObject({
      profile: { revision: 3 },
      atlasImage: {
        imageId: "image_22222222222222222222222222222222",
      },
    })
    expect(
      await env.MY_ATLAS_MEDIA_R2.get(
        `private/atlas/${USER_ID}/image_11111111111111111111111111111111.webp`
      )
    ).toBeNull()
    const ownerImage = await getMyAtlasImage({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(ownerImage.atlasImage.imageId).toBe(
      "image_22222222222222222222222222222222"
    )
    expect(await ownerImage.object.arrayBuffer()).toEqual(
      new Uint8Array([82, 73, 70, 70, 2]).buffer
    )
    const state = await getMyAtlasState({
      environment: environment(),
      identity: IDENTITY,
      placeCatalog: { resolveMany: async () => [] },
    })
    expect(state.atlasImage).toEqual(second.atlasImage)
    expect(JSON.stringify(state)).not.toContain("storageKey")
    expect(JSON.stringify(state)).not.toContain("sourceSha256")

    const removed = await removeMyAtlasImage({
      environment: environment(),
      identity: IDENTITY,
      input: {
        expectedRevision: 3,
        idempotencyKey: "03030303-0303-4303-8303-030303030303",
      },
      now: "2026-11-16T19:00:00.000Z",
    })
    expect(removed.profile.revision).toBe(4)
    expect(
      await env.MY_ATLAS_MEDIA_R2.get(
        `private/atlas/${USER_ID}/image_22222222222222222222222222222222.webp`
      )
    ).toBeNull()
    await expect(
      getMyAtlasImage({ environment: environment(), identity: IDENTITY })
    ).rejects.toMatchObject({ code: "atlas_image_not_found" })
  })

  it("purges the private Atlas image before final account deletion", async () => {
    const key = `private/atlas/${USER_ID}/image_33333333333333333333333333333333.webp`
    await replaceMyAtlasImage({
      environment: environment(),
      identity: IDENTITY,
      input: {
        expectedRevision: 1,
        idempotencyKey: "04040404-0404-4404-8404-040404040404",
      },
      upload: {
        bytes: new Uint8Array([3]).buffer,
        contentType: "image/jpeg",
      },
      imageTransformer: async () => ({
        bytes: new Uint8Array([82, 73, 70, 70, 3]).buffer,
        contentType: "image/webp",
        width: 1200,
        height: 1200,
        byteLength: 5,
        sourceSha256: "3".repeat(64),
      }),
      imageIdFactory: () => "image_33333333333333333333333333333333",
      now: NOW,
    })
    expect(await env.MY_ATLAS_MEDIA_R2.get(key)).not.toBeNull()
    const input = normalizeDeleteAccount(
      { confirmation: "DELETE MY ATLAS" },
      new Headers({
        "If-Match": '"rev-2"',
        "Idempotency-Key": "05050505-0505-4505-8505-050505050505",
      })
    )
    await deleteMyAccount({
      environment: environment(),
      identity: IDENTITY,
      input,
      now: "2026-11-16T20:00:00.000Z",
    })
    expect(await env.MY_ATLAS_MEDIA_R2.get(key)).toBeNull()
  })

  it("reads a private revision-1 profile and refuses to publish it empty", async () => {
    expect(
      await getMyProfile({ environment: environment(), identity: IDENTITY })
    ).toMatchObject({
      profile: { public: false, pinCount: 0, revision: 1 },
    })

    await expect(
      updateMyProfile({
        environment: environment(),
        identity: IDENTITY,
        input: {
          patch: { public: true },
          expectedRevision: 1,
          idempotencyKey: "22222222-2222-4222-8222-222222222222",
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "profile_requires_pin" })
  })

  it("creates one canonical pin idempotently and rejects stale or duplicate writes", async () => {
    const input = pinInput({
      placeId: "geonames:3621138",
      visitedYears: [2024, 2026],
      expectedRevision: 1,
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
    })
    const created = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input,
      catalogResolver,
      now: NOW,
    })
    expect(created).toMatchObject({
      created: true,
      profile: { revision: 2, pinCount: 1 },
      pin: {
        placeId: "geonames:3621138",
        visitedYears: [2024, 2026],
      },
    })
    expect(
      await createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input,
        catalogResolver,
        now: NOW,
      })
    ).toMatchObject({
      created: false,
      profile: { revision: 2, pinCount: 1 },
      pin: { pinId: created.pin.pinId },
    })

    const state = await getMyAtlasState({
      environment: environment(),
      identity: IDENTITY,
      placeCatalog: {
        async resolveMany(placeIds) {
          expect(placeIds).toEqual(["geonames:3621138"])
          return [
            {
              placeId: "geonames:3621138",
              placeType: "city",
              name: "Uvita",
              countryName: "Costa Rica",
              coordinates: [-83.7395, 9.17039],
            },
          ]
        },
      },
    })
    expect(state).toMatchObject({
      profile: { revision: 2, public: false },
      pins: [
        {
          pinId: created.pin.pinId,
          placeId: "geonames:3621138",
          name: "Uvita",
          visitedYears: [2024, 2026],
        },
      ],
    })

    await expect(
      createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: pinInput({
          placeId: "iso-country:CR",
          expectedRevision: 1,
          idempotencyKey: "44444444-4444-4444-8444-444444444444",
        }),
        catalogResolver,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "revision_conflict" })

    await expect(
      createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: {
          ...input,
          expectedRevision: 2,
          idempotencyKey: "55555555-5555-4555-8555-555555555555",
        },
        catalogResolver,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "duplicate_place" })
  })

  it("persists and projects a curated spot through the standard pin flow", async () => {
    const created = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        placeId: "geonames:5843642",
        visitedYears: [2025],
        expectedRevision: 1,
        idempotencyKey: "12121212-3434-4567-8567-121212121212",
      }),
      catalogResolver,
      now: NOW,
    })
    expect(created).toMatchObject({
      created: true,
      profile: { revision: 2, pinCount: 1 },
      pin: {
        placeId: "geonames:5843642",
        placeType: "spot",
        name: "Yellowstone National Park",
        spotCategory: "national-park",
        spotKind: "National park",
        visitedYears: [2025],
      },
    })
  })

  it("stores a validated owner-created custom pin without catalog authority", async () => {
    const input = pinInput({
      customPlace: {
        name: "Krka National Park",
        coordinates: [15.97217, 43.80123],
      },
      visitedYears: [2025],
      memory: "Waterfalls threaded through the forest.",
      expectedRevision: 1,
      idempotencyKey: "17171717-1717-4717-8717-171717171717",
    })
    const created = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input,
      catalogResolver: async () => {
        throw new Error("Custom pins must not enter catalog resolution.")
      },
      now: NOW,
    })
    expect(created).toMatchObject({
      created: true,
      profile: { revision: 2, pinCount: 1 },
      pin: {
        placeId: expect.stringMatching(/^custom:[a-f0-9]{24}$/),
        placeType: "custom",
        name: "Krka National Park",
        coordinates: [15.97217, 43.80123],
        visitedYears: [2025],
        memory: "Waterfalls threaded through the forest.",
      },
    })
    expect(
      await createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input,
        now: NOW,
      })
    ).toMatchObject({
      created: false,
      pin: { pinId: created.pin.pinId, placeType: "custom" },
    })
    await expect(
      createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: {
          ...input,
          expectedRevision: 2,
          idempotencyKey: "17171717-1717-4717-8717-171717171718",
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "duplicate_place" })

    await registerSecondOwner()
    const secondOwnerPin = await createMyPin({
      environment: environment(),
      identity: SECOND_IDENTITY,
      input: {
        ...input,
        expectedRevision: 1,
        idempotencyKey: "17171717-1717-4717-8717-171717171719",
      },
      now: NOW,
    })
    expect(secondOwnerPin.pin.placeId).not.toBe(created.pin.placeId)

    const state = await getMyAtlasState({
      environment: environment(),
      identity: IDENTITY,
      placeCatalog: {
        async resolveMany() {
          throw new Error("Custom pins must not enter catalog resolution.")
        },
      },
    })
    expect(state.pins).toEqual([
      expect.objectContaining({
        placeId: created.pin.placeId,
        placeType: "custom",
        name: "Krka National Park",
      }),
    ])
    expect(
      (await exportMyAtlas({ environment: environment(), identity: IDENTITY }))
        .pins[0]
    ).toMatchObject({
      placeId: created.pin.placeId,
      customPlace: {
        name: "Krka National Park",
        coordinates: [15.97217, 43.80123],
      },
    })
  })

  it("stores one owner-scoped favorite memory per pin and rejects unsafe bypasses", async () => {
    const created = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        placeId: "geonames:3621138",
        memory: "Watching the tide reshape the whale tail.",
        expectedRevision: 1,
        idempotencyKey: "18181818-1818-4818-8818-181818181818",
      }),
      catalogResolver,
      now: NOW,
    })
    expect(created.pin.memory).toBe("Watching the tide reshape the whale tail.")

    const updated = await updateMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: created.pin.pinId,
        patch: { memory: "Horses crossing the beach at low tide." },
        expectedRevision: 2,
        idempotencyKey: "19191919-1919-4919-8919-191919191919",
      },
      catalogResolver,
      now: NOW,
    })
    expect(updated).toMatchObject({
      profile: { revision: 3 },
      pin: { memory: "Horses crossing the beach at low tide." },
    })
    expect(
      (await exportMyAtlas({ environment: environment(), identity: IDENTITY }))
        .pins[0].memory
    ).toBe("Horses crossing the beach at low tide.")

    await expect(
      updateMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: {
          pinId: created.pin.pinId,
          patch: { memory: "<img src=x onerror=alert(1)>" },
          expectedRevision: 3,
          idempotencyKey: "20202020-2020-4020-8020-202020202020",
        },
        catalogResolver,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "invalid_pin" })

    await expect(
      updateMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: {
          pinId: created.pin.pinId,
          patch: { memory: "a".repeat(256) },
          expectedRevision: 3,
          idempotencyKey: "21212121-2121-4121-8121-212121212121",
        },
        catalogResolver,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "invalid_pin" })
  })

  it("isolates reads, updates, exports, and deletes between two active owners", async () => {
    const ownerPin = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        placeId: "geonames:3621138",
        visitedYears: [2024],
        expectedRevision: 1,
        idempotencyKey: "13131313-1313-4313-8313-131313131313",
      }),
      catalogResolver,
      now: NOW,
    })
    await registerSecondOwner()
    const secondPin = await createMyPin({
      environment: environment(),
      identity: SECOND_IDENTITY,
      input: pinInput({
        placeId: "geonames:3621138",
        visitedYears: [2025],
        expectedRevision: 1,
        idempotencyKey: "14141414-1414-4414-8414-141414141414",
      }),
      catalogResolver,
      now: NOW,
    })

    expect(ownerPin.pin.pinId).not.toBe(secondPin.pin.pinId)
    expect(
      await listMyPins({
        environment: environment(),
        identity: IDENTITY,
        input: { limit: 50, cursor: "" },
      })
    ).toMatchObject({
      profile: { userId: USER_ID, pinCount: 1 },
      pins: [{ pinId: ownerPin.pin.pinId, visitedYears: [2024] }],
    })
    expect(
      await listMyPins({
        environment: environment(),
        identity: SECOND_IDENTITY,
        input: { limit: 50, cursor: "" },
      })
    ).toMatchObject({
      profile: { userId: SECOND_USER_ID, pinCount: 1 },
      pins: [{ pinId: secondPin.pin.pinId, visitedYears: [2025] }],
    })

    await expect(
      updateMyPin({
        environment: environment(),
        identity: SECOND_IDENTITY,
        input: {
          pinId: ownerPin.pin.pinId,
          patch: { memory: "Attempted cross-owner edit" },
          expectedRevision: 2,
          idempotencyKey: "15151515-1515-4515-8515-151515151515",
        },
        catalogResolver,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "pin_not_found" })
    await expect(
      deleteMyPin({
        environment: environment(),
        identity: SECOND_IDENTITY,
        input: {
          pinId: ownerPin.pin.pinId,
          expectedRevision: 2,
          idempotencyKey: "16161616-1616-4616-8616-161616161616",
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "pin_not_found" })

    expect(
      await exportMyAtlas({
        environment: environment(),
        identity: SECOND_IDENTITY,
      })
    ).toMatchObject({
      profile: { userId: SECOND_USER_ID, revision: 2 },
      pins: [{ pinId: secondPin.pin.pinId, visitedYears: [2025] }],
    })
    expect(
      await getMyProfile({
        environment: environment(),
        identity: IDENTITY,
      })
    ).toMatchObject({
      profile: { userId: USER_ID, pinCount: 1, revision: 2 },
    })
    await expect(
      getMyProfile({
        environment: environment(),
        identity: {
          issuer: IDENTITY.issuer,
          subject: "google-oauth2|unregistered-owner",
        },
      })
    ).rejects.toMatchObject({ code: "registration_not_found" })
  })

  it("serializes concurrent revision writes and enforces the 300-pin ceiling", async () => {
    const concurrent = await Promise.allSettled([
      createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: pinInput({
          placeId: "geonames:3621138",
          expectedRevision: 1,
          idempotencyKey: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        }),
        catalogResolver,
        now: NOW,
      }),
      createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: pinInput({
          placeId: "iso-country:CR",
          expectedRevision: 1,
          idempotencyKey: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        }),
        catalogResolver,
        now: NOW,
      }),
    ])
    expect(
      concurrent.filter(result => result.status === "fulfilled")
    ).toHaveLength(1)
    expect(
      concurrent.filter(result => result.status === "rejected")
    ).toHaveLength(1)
    expect(
      concurrent.find(result => result.status === "rejected").reason
    ).toMatchObject({ code: "revision_conflict" })

    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    await runInDurableObject(user, (_instance, state) => {
      const profile = state.storage.kv.get("profile")
      state.storage.kv.put("profile", {
        ...profile,
        pinCount: 300,
      })
    })
    const profile = await getMyProfile({
      environment: environment(),
      identity: IDENTITY,
    })
    await expect(
      createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: pinInput({
          placeId: "geonames:5780993",
          expectedRevision: profile.profile.revision,
          idempotencyKey: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        }),
        catalogResolver,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "pin_limit_reached" })
  })

  it("updates, paginates, exports, publishes, and makes an empty profile private", async () => {
    const first = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        placeId: "geonames:3621138",
        visitedYears: [2024],
        expectedRevision: 1,
        idempotencyKey: "66666666-6666-4666-8666-666666666666",
      }),
      catalogResolver,
      now: NOW,
    })
    const second = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        placeId: "iso-country:CR",
        expectedRevision: 2,
        idempotencyKey: "77777777-7777-4777-8777-777777777777",
      }),
      catalogResolver,
      now: NOW,
    })
    const updated = await updateMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: first.pin.pinId,
        patch: {
          visitedDates: [{ year: 2023, month: 5 }, { year: 2024 }],
        },
        expectedRevision: 3,
        idempotencyKey: "88888888-8888-4888-8888-888888888888",
      },
      catalogResolver,
      now: NOW,
    })
    expect(updated).toMatchObject({
      profile: { revision: 4 },
      pin: {
        visitedDates: [{ year: 2023, month: 5 }, { year: 2024 }],
        visitedYears: [2023, 2024],
      },
    })

    const page1 = await listMyPins({
      environment: environment(),
      identity: IDENTITY,
      input: { limit: 1, cursor: "" },
    })
    expect(page1.pins).toHaveLength(1)
    expect(page1.nextCursor).toBe(page1.pins[0].pinId)
    expect(
      (
        await listMyPins({
          environment: environment(),
          identity: IDENTITY,
          input: { limit: 1, cursor: page1.nextCursor },
        })
      ).pins
    ).toHaveLength(1)
    expect(
      (await exportMyAtlas({ environment: environment(), identity: IDENTITY }))
        .pins
    ).toHaveLength(2)

    const published = await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true },
        expectedRevision: 4,
        idempotencyKey: "99999999-9999-4999-8999-999999999999",
      },
      now: NOW,
    })
    expect(published.profile).toMatchObject({ public: true, revision: 5 })

    const afterFirstDelete = await deleteMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: first.pin.pinId,
        expectedRevision: 5,
        idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
      },
      now: NOW,
    })
    expect(afterFirstDelete.profile).toMatchObject({
      public: true,
      pinCount: 1,
      revision: 6,
    })
    const empty = await deleteMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: second.pin.pinId,
        expectedRevision: 6,
        idempotencyKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc",
      },
      now: NOW,
    })
    expect(empty.profile).toMatchObject({
      public: false,
      pinCount: 0,
      revision: 7,
    })
  })

  it("fails closed without authoritative catalog resolution", async () => {
    await expect(
      createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: pinInput({
          placeId: "geonames:3621138",
          expectedRevision: 1,
          idempotencyKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccd",
        }),
        now: NOW,
      })
    ).rejects.toThrow("MY_ATLAS_CATALOG_R2")

    await expect(
      createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: pinInput({
          placeId: "geonames:3621138",
          expectedRevision: 1,
          idempotencyKey: "dddddddd-dddd-4ddd-8ddd-ddddddddddde",
        }),
        catalogResolver: async placeId => ({
          placeId,
          deprecated: true,
          coordinates: [-83.7395, 9.17039],
        }),
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "place_unavailable" })
  })
})
