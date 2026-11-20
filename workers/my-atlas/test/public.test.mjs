import { env } from "cloudflare:workers"
import { reset, runInDurableObject } from "cloudflare:test"
import { beforeEach, describe, expect, it } from "vitest"
import {
  createMyPin,
  replaceMyAtlasImage,
  updateMyAtlasImageVisibility,
  updateMyProfile,
} from "../src/account/service.mjs"
import {
  PublicAtlasNotFoundError,
  PublicAtlasServiceError,
  getPublicAtlas,
  getPublicAtlasImage,
} from "../src/public/service.mjs"
import { normalizeRegistrationInput } from "../src/registration/contracts.mjs"
import { hashInviteCode } from "../src/registration/hashing.mjs"
import {
  REGISTRY_OBJECT_NAME,
  registerBetaAccount,
} from "../src/registration/service.mjs"

const NOW = "2026-11-16T18:00:00.000Z"
const EXPIRES = "2026-11-17T18:00:00.000Z"
const PEPPER = "test-only-public-pepper-with-at-least-32-characters"
const IDENTITY = {
  issuer: "https://roamwithjustin.us.auth0.com/",
  subject: "google-oauth2|public-owner",
}
const USER_ID = "usr_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

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

async function registerOwner() {
  const inviteCode = "public_test_invitation_1234567890"
  const digest = await hashInviteCode(inviteCode, PEPPER)
  const registry = env.MY_ATLAS_REGISTRY.getByName(REGISTRY_OBJECT_NAME)
  await registry.issueInvitation({
    digest,
    maxUses: 1,
    createdAt: NOW,
    expiresAt: EXPIRES,
  })
  return registerBetaAccount({
    environment: environment(),
    identity: IDENTITY,
    input: normalizeRegistrationInput(
      {
        inviteCode,
        handle: "public-owner",
        displayName: "Public Owner",
        turnstileToken: "test-turnstile-token",
        acceptTerms: true,
        acceptPrivacy: true,
      },
      "12121212-1212-4212-8212-121212121212"
    ),
    now: NOW,
    turnstileVerifier: async () => true,
    userIdFactory: () => USER_ID,
  })
}

const placeCatalog = {
  async resolveMany(placeIds) {
    expect(placeIds).toEqual(["geonames:3621138"])
    return [
      {
        placeId: "geonames:3621138",
        placeType: "city",
        name: "Uvita",
        admin1Name: "Puntarenas Province",
        countryName: "Costa Rica",
        coordinates: [-83.7395, 9.17039],
      },
    ]
  },
  async manifest() {
    return {
      catalogRevision: "fixture-2026-11-16",
      attribution: {
        provider: "GeoNames",
        url: "https://www.geonames.org/",
        license: "CC BY 4.0",
      },
    }
  },
}

beforeEach(async () => {
  await reset()
  await registerOwner()
})

describe("public Atlas projection", () => {
  it("is private by default and exposes only the safe published projection", async () => {
    await expect(
      getPublicAtlas({
        environment: environment(),
        handle: "public-owner",
        placeCatalog,
      })
    ).rejects.toBeInstanceOf(PublicAtlasNotFoundError)

    await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        placeId: "geonames:3621138",
        visitedYears: [2024, 2026],
        memory: "Watching the whale tail emerge as the tide went out.",
        expectedRevision: 1,
        idempotencyKey: "23232323-2323-4232-8232-232323232323",
      },
      catalogResolver: async placeId => ({
        placeId,
        placeType: "city",
        name: "Uvita",
        countryCode: "CR",
        countryName: "Costa Rica",
        deprecated: false,
        coordinates: [-83.7395, 9.17039],
      }),
      now: NOW,
    })
    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true },
        expectedRevision: 2,
        idempotencyKey: "34343434-3434-4434-8434-343434343434",
      },
      now: NOW,
    })

    const result = await getPublicAtlas({
      environment: environment(),
      handle: "public-owner",
      placeCatalog,
    })
    expect(result).toEqual({
      schemaVersion: 1,
      atlas: {
        handle: "public-owner",
        displayName: "Public Owner",
        favoriteImage: null,
        places: [
          {
            placeId: "geonames:3621138",
            placeType: "city",
            name: "Uvita",
            admin1Name: "Puntarenas Province",
            countryName: "Costa Rica",
            coordinates: [-83.7395, 9.17039],
            visitedDates: [{ year: 2024 }, { year: 2026 }],
            visitedYears: [2024, 2026],
            memory: "Watching the whale tail emerge as the tide went out.",
          },
        ],
      },
      catalog: {
        revision: "fixture-2026-11-16",
        attribution: {
          provider: "GeoNames",
          url: "https://www.geonames.org/",
          license: "CC BY 4.0",
        },
      },
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain(USER_ID)
    expect(serialized).not.toContain("google-oauth2")
    expect(serialized).not.toContain("pin_")

    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: false },
        expectedRevision: 3,
        idempotencyKey: "45454545-4545-4454-8454-454545454545",
      },
      now: NOW,
    })
    await expect(
      getPublicAtlas({
        environment: environment(),
        handle: "public-owner",
        placeCatalog,
      })
    ).rejects.toBeInstanceOf(PublicAtlasNotFoundError)
  })

  it("publishes the favorite image only while the Atlas is public", async () => {
    await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        placeId: "geonames:3621138",
        visitedYears: [2024],
        expectedRevision: 1,
        idempotencyKey: "73737373-7373-4373-8373-737373737373",
      },
      catalogResolver: async placeId => ({
        placeId,
        placeType: "city",
        name: "Uvita",
        countryCode: "CR",
        countryName: "Costa Rica",
        deprecated: false,
        coordinates: [-83.7395, 9.17039],
      }),
      now: NOW,
    })
    const imageBytes = new Uint8Array([82, 73, 70, 70, 1])
    await replaceMyAtlasImage({
      environment: environment(),
      identity: IDENTITY,
      input: {
        expectedRevision: 2,
        idempotencyKey: "74747474-7474-4474-8474-747474747474",
      },
      upload: {
        bytes: new Uint8Array([1]).buffer,
        contentType: "image/jpeg",
      },
      imageTransformer: async () => ({
        bytes: imageBytes.buffer,
        contentType: "image/webp",
        width: 1200,
        height: 1200,
        byteLength: imageBytes.byteLength,
        sourceSha256: "1".repeat(64),
      }),
      imageIdFactory: () => "image_33333333333333333333333333333333",
      now: NOW,
    })

    await expect(
      getPublicAtlasImage({
        environment: environment(),
        handle: "public-owner",
      })
    ).rejects.toBeInstanceOf(PublicAtlasNotFoundError)

    await updateMyAtlasImageVisibility({
      environment: environment(),
      identity: IDENTITY,
      input: {
        publicProfile: true,
        expectedRevision: 3,
        idempotencyKey: "79797979-7979-4979-8979-797979797979",
      },
      now: NOW,
    })

    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true },
        expectedRevision: 4,
        idempotencyKey: "75757575-7575-4575-8575-757575757575",
      },
      now: NOW,
    })

    const atlas = await getPublicAtlas({
      environment: environment(),
      handle: "public-owner",
      placeCatalog,
    })
    expect(atlas.atlas.favoriteImage).toMatchObject({
      imageId: "image_33333333333333333333333333333333",
      contentType: "image/webp",
      width: 1200,
      height: 1200,
      byteLength: imageBytes.byteLength,
    })
    expect(JSON.stringify(atlas)).not.toContain("storageKey")
    expect(JSON.stringify(atlas)).not.toContain("sourceSha256")

    const image = await getPublicAtlasImage({
      environment: environment(),
      handle: "public-owner",
    })
    expect(await image.object.arrayBuffer()).toEqual(imageBytes.buffer)

    await updateMyAtlasImageVisibility({
      environment: environment(),
      identity: IDENTITY,
      input: {
        publicProfile: false,
        expectedRevision: 5,
        idempotencyKey: "77777777-7777-4777-8777-777777777777",
      },
      now: NOW,
    })
    const atlasWithoutImage = await getPublicAtlas({
      environment: environment(),
      handle: "public-owner",
      placeCatalog,
    })
    expect(atlasWithoutImage.atlas.favoriteImage).toBeNull()
    await expect(
      getPublicAtlasImage({
        environment: environment(),
        handle: "public-owner",
      })
    ).rejects.toBeInstanceOf(PublicAtlasNotFoundError)

    await updateMyAtlasImageVisibility({
      environment: environment(),
      identity: IDENTITY,
      input: {
        publicProfile: true,
        expectedRevision: 6,
        idempotencyKey: "78787878-7878-4878-8878-787878787878",
      },
      now: NOW,
    })

    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: false },
        expectedRevision: 7,
        idempotencyKey: "76767676-7676-4676-8676-767676767676",
      },
      now: NOW,
    })
    await expect(
      getPublicAtlasImage({
        environment: environment(),
        handle: "public-owner",
      })
    ).rejects.toBeInstanceOf(PublicAtlasNotFoundError)
  })

  it("publishes a curated spot through the same safe projection", async () => {
    await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        placeId: "geonames:5843642",
        visitedYears: [2025],
        expectedRevision: 1,
        idempotencyKey: "56565656-5656-4656-8656-565656565656",
      },
      catalogResolver: async placeId => ({
        placeId,
        placeType: "spot",
        name: "Yellowstone National Park",
        spotCategory: "national-park",
        spotKind: "National park",
        countryCode: "US",
        countryName: "United States",
        deprecated: false,
        coordinates: [-110.58846, 44.42796],
      }),
      now: NOW,
    })
    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true },
        expectedRevision: 2,
        idempotencyKey: "57575757-5757-4757-8757-575757575757",
      },
      now: NOW,
    })

    const result = await getPublicAtlas({
      environment: environment(),
      handle: "public-owner",
      placeCatalog: {
        async resolveMany(placeIds) {
          expect(placeIds).toEqual(["geonames:5843642"])
          return [
            {
              placeId: "geonames:5843642",
              placeType: "spot",
              name: "Yellowstone National Park",
              spotCategory: "national-park",
              spotKind: "National park",
              countryCode: "US",
              countryName: "United States",
              coordinates: [-110.58846, 44.42796],
            },
          ]
        },
        async manifest() {
          return {
            catalogRevision: "fixture-spots-2026-11-17",
            attribution: {
              provider: "GeoNames",
              url: "https://www.geonames.org/",
              license: "CC BY 4.0",
            },
          }
        },
      },
    })
    expect(result.atlas.places[0]).toMatchObject({
      placeId: "geonames:5843642",
      placeType: "spot",
      name: "Yellowstone National Park",
      spotCategory: "national-park",
      spotKind: "National park",
      visitedYears: [2025],
    })
  })

  it("publishes owner-created custom pins without adding them to the catalog", async () => {
    const created = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        customPlace: {
          name: "New Forest",
          coordinates: [-1.59, 50.87],
        },
        visitedYears: [2023],
        memory: "A quiet walk beneath the old trees.",
        expectedRevision: 1,
        idempotencyKey: "58585858-5858-4858-8858-585858585858",
      },
      now: NOW,
    })
    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true },
        expectedRevision: 2,
        idempotencyKey: "59595959-5959-4959-8959-595959595959",
      },
      now: NOW,
    })
    const customCatalog = {
      async resolveMany() {
        throw new Error("Custom pins must not enter catalog resolution.")
      },
      async manifest() {
        return {
          catalogRevision: "fixture-custom-2026-11-17",
          attribution: {
            provider: "GeoNames",
            url: "https://www.geonames.org/",
            license: "CC BY 4.0",
          },
        }
      },
    }
    const result = await getPublicAtlas({
      environment: environment(),
      handle: "public-owner",
      placeCatalog: customCatalog,
    })
    expect(result.atlas.places).toEqual([
      {
        placeId: created.pin.placeId,
        placeType: "custom",
        name: "New Forest",
        coordinates: [-1.59, 50.87],
        visitedDates: [{ year: 2023 }],
        visitedYears: [2023],
        memory: "A quiet walk beneath the old trees.",
      },
    ])

    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    await runInDurableObject(user, (_instance, state) => {
      const key = `pin:${created.pin.pinId}`
      const pin = state.storage.kv.get(key)
      state.storage.kv.put(key, {
        ...pin,
        customPlace: { ...pin.customPlace, name: "<script>" },
      })
    })
    await expect(
      getPublicAtlas({
        environment: environment(),
        handle: "public-owner",
        placeCatalog: customCatalog,
      })
    ).rejects.toBeInstanceOf(PublicAtlasServiceError)
  })

  it("fails closed when stored public memory no longer satisfies the contract", async () => {
    const created = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        placeId: "geonames:3621138",
        visitedYears: [],
        memory: "A safe memory before simulated corruption.",
        expectedRevision: 1,
        idempotencyKey: "67676767-6767-4767-8767-676767676767",
      },
      catalogResolver: async placeId => ({
        placeId,
        placeType: "city",
        name: "Uvita",
        countryCode: "CR",
        countryName: "Costa Rica",
        deprecated: false,
        coordinates: [-83.7395, 9.17039],
      }),
      now: NOW,
    })
    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true },
        expectedRevision: 2,
        idempotencyKey: "68686868-6868-4868-8868-686868686868",
      },
      now: NOW,
    })

    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    await runInDurableObject(user, (_instance, state) => {
      const key = `pin:${created.pin.pinId}`
      const pin = state.storage.kv.get(key)
      state.storage.kv.put(key, {
        ...pin,
        memory: "<script>alert(1)</script>",
      })
    })

    await expect(
      getPublicAtlas({
        environment: environment(),
        handle: "public-owner",
        placeCatalog,
      })
    ).rejects.toBeInstanceOf(PublicAtlasServiceError)
  })
})
