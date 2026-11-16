import { env } from "cloudflare:workers"
import { reset } from "cloudflare:test"
import { beforeEach, describe, expect, it } from "vitest"
import { createMyPin, updateMyProfile } from "../src/account/service.mjs"
import {
  PublicAtlasNotFoundError,
  getPublicAtlas,
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
})
