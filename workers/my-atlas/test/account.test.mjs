import { env } from "cloudflare:workers"
import { reset, runInDurableObject } from "cloudflare:test"
import { beforeEach, describe, expect, it } from "vitest"
import {
  createMyPin,
  deleteMyPin,
  exportMyAtlas,
  getMyAtlasState,
  getMyProfile,
  listMyPins,
  updateMyPin,
  updateMyProfile,
} from "../src/account/service.mjs"
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

function pinInput({
  placeId,
  visitedYears = [],
  expectedRevision,
  idempotencyKey,
}) {
  return { placeId, visitedYears, expectedRevision, idempotencyKey }
}

const catalogResolver = async placeId => ({
  placeId,
  placeType: placeId.startsWith("iso-country:") ? "country" : "city",
  name: placeId.startsWith("iso-country:") ? "Costa Rica" : "Uvita",
  countryCode: "CR",
  countryName: "Costa Rica",
  deprecated: false,
  coordinates: [-83.7395, 9.17039],
})

beforeEach(async () => {
  await reset()
  await registerOwner()
})

describe("private owner profile and pin services", () => {
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
