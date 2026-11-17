import { env } from "cloudflare:workers"
import { reset, runInDurableObject } from "cloudflare:test"
import { beforeEach, describe, expect, it } from "vitest"
import {
  createMyPin,
  deleteMyAccount,
  exportMyAtlas,
  getMyProfile,
  updateMyProfile,
} from "../src/account/service.mjs"
import {
  createMyPlan,
  createMyWish,
  deleteMyWish,
  keepMyPlan,
  listMyPlans,
  listMyWishes,
  updateMyWish,
} from "../src/planning/service.mjs"
import { normalizeRegistrationInput } from "../src/registration/contracts.mjs"
import { hashInviteCode } from "../src/registration/hashing.mjs"
import {
  REGISTRY_OBJECT_NAME,
  registerBetaAccount,
} from "../src/registration/service.mjs"

const NOW = "2026-11-17T15:00:00.000Z"
const PEPPER = "test-only-planning-pepper-with-at-least-32-characters"
const IDENTITY = {
  issuer: "https://roamwithjustin.us.auth0.com/",
  subject: "google-oauth2|planner-owner",
}
const USER_ID = "usr_dddddddd-dddd-4ddd-8ddd-dddddddddddd"

const records = new Map([
  [
    "geonames:3621138",
    {
      placeId: "geonames:3621138",
      placeType: "city",
      name: "Uvita",
      countryCode: "CR",
      countryName: "Costa Rica",
      coordinates: [-83.7395, 9.17039],
      catalogRevision: "fixture-2026-11-17",
      deprecated: false,
    },
  ],
  [
    "geonames:5601615",
    {
      placeId: "geonames:5601615",
      placeType: "city",
      name: "Moab",
      admin1Name: "Utah",
      countryCode: "US",
      countryName: "United States",
      coordinates: [-109.54984, 38.57332],
      catalogRevision: "fixture-2026-11-17",
      deprecated: false,
    },
  ],
  [
    "geonames:5556144",
    {
      placeId: "geonames:5556144",
      placeType: "spot",
      name: "Arches National Park",
      spotCategory: "national-park",
      spotKind: "National park",
      countryCode: "US",
      countryName: "United States",
      coordinates: [-109.5925, 38.7225],
      catalogRevision: "fixture-2026-11-17",
      deprecated: false,
    },
  ],
])

function environment() {
  return {
    ...env,
    BETA_TERMS_VERSION: "test-terms-1",
    BETA_PRIVACY_VERSION: "test-privacy-1",
    INVITE_HASH_PEPPER: PEPPER,
    TURNSTILE_SECRET_KEY: "test-turnstile-secret",
    TURNSTILE_ACTION: "my-atlas-register",
    TURNSTILE_HOSTNAMES: "localhost",
  }
}

function registry() {
  return env.MY_ATLAS_REGISTRY.getByName(REGISTRY_OBJECT_NAME)
}

const catalogResolver = async placeId => records.get(placeId)
const placeCatalog = {
  async resolveMany(placeIds) {
    return placeIds.map(placeId => records.get(placeId))
  },
  async manifest() {
    return { catalogRevision: "fixture-2026-11-17" }
  },
}

async function registerOwner() {
  const inviteCode = "planning_test_invitation_1234567890"
  const digest = await hashInviteCode(inviteCode, PEPPER)
  await registry().issueInvitation({
    digest,
    maxUses: 1,
    createdAt: NOW,
    expiresAt: "2026-11-18T15:00:00.000Z",
  })
  const input = normalizeRegistrationInput(
    {
      inviteCode,
      handle: "planner-owner",
      displayName: "Planner Owner",
      turnstileToken: "test-turnstile-token",
      acceptTerms: true,
      acceptPrivacy: true,
    },
    "41414141-4141-4141-8141-414141414141"
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

async function createWish(placeId, expectedRevision, key) {
  return createMyWish({
    environment: environment(),
    identity: IDENTITY,
    input: {
      placeId,
      note: "",
      priority: "normal",
      desiredYear: 2027,
      expectedRevision,
      idempotencyKey: key,
    },
    catalogResolver,
    now: NOW,
  })
}

async function createCustomWish(index, expectedRevision) {
  return createMyWish({
    environment: environment(),
    identity: IDENTITY,
    input: {
      customPlace: {
        name: `Private route stop ${index}`,
        coordinates: [-109.5 - index / 100, 38.5 + index / 100],
      },
      note: "",
      priority: "normal",
      desiredYear: 2027,
      expectedRevision,
      idempotencyKey: `9${index}999999-9999-4999-8999-99999999999${index}`,
    },
    now: NOW,
  })
}

beforeEach(async () => {
  await reset()
  await registerOwner()
})

describe("private wishlist and trip planning", () => {
  it("stores more than three ordered destinations without weakening snapshots", async () => {
    const wishes = []
    for (let index = 1; index <= 5; index += 1) {
      wishes.push(await createCustomWish(index, index))
    }
    const created = await createMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        title: "Long private route",
        status: "saved",
        desiredYear: 2027,
        note: "",
        startWishId: wishes[0].wish.wishId,
        stopWishIds: wishes.slice(1).map(result => result.wish.wishId),
        endMode: "last-stop",
        expectedRevision: 6,
        idempotencyKey: "96969696-9696-4696-8696-969696969696",
      },
      now: NOW,
    })
    expect(created.plan.stops).toHaveLength(4)
    expect(created.plan.stops.map(stop => stop.name)).toEqual([
      "Private route stop 2",
      "Private route stop 3",
      "Private route stop 4",
      "Private route stop 5",
    ])
  })

  it("uses the account revision, rejects duplicates, and isolates private wishlist state", async () => {
    const moab = await createWish(
      "geonames:5601615",
      1,
      "51515151-5151-4151-8151-515151515151"
    )
    expect(moab).toMatchObject({
      created: true,
      profile: { revision: 2, wishCount: 1 },
      wish: { name: "Moab", routeReadiness: "route-ready" },
    })
    await expect(
      createWish(
        "geonames:5601615",
        2,
        "52525252-5252-4252-8252-525252525252"
      )
    ).rejects.toMatchObject({ code: "duplicate_wish" })
    await expect(
      createWish(
        "geonames:5556144",
        1,
        "53535353-5353-4353-8353-535353535353"
      )
    ).rejects.toMatchObject({ code: "revision_conflict" })

    const list = await listMyWishes({
      environment: environment(),
      identity: IDENTITY,
      input: { limit: 50, cursor: "" },
      placeCatalog,
    })
    expect(list.wishes).toEqual([
      expect.objectContaining({ wishId: moab.wish.wishId, name: "Moab" }),
    ])

    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    const publicState = await user.getPublicAtlas()
    expect(publicState).toMatchObject({ ok: false, error: "public_atlas_not_found" })
    expect(JSON.stringify(publicState)).not.toContain("Moab")
  })

  it("never projects wishlist or plan data through a published visited Atlas", async () => {
    await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        placeId: "geonames:3621138",
        visitedYears: [2025],
        memory: "",
        expectedRevision: 1,
        idempotencyKey: "54545454-5454-4454-8454-545454545454",
      },
      catalogResolver,
      now: NOW,
    })
    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true },
        expectedRevision: 2,
        idempotencyKey: "55555555-5656-4565-8565-555555555555",
      },
      now: NOW,
    })
    const moab = await createWish(
      "geonames:5601615",
      3,
      "56565656-5656-4656-8656-565656565656"
    )
    const arches = await createWish(
      "geonames:5556144",
      4,
      "57575757-5757-4757-8757-575757575757"
    )
    await createMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        title: "Private Moab parks plan",
        status: "saved",
        desiredYear: 2027,
        note: "Private planning note",
        startWishId: moab.wish.wishId,
        stopWishIds: [arches.wish.wishId],
        endMode: "return-to-start",
        expectedRevision: 5,
        idempotencyKey: "58585858-5858-4858-8858-585858585858",
      },
      placeCatalog,
      now: NOW,
    })

    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    const publicState = await user.getPublicAtlas()
    expect(publicState).toMatchObject({
      ok: true,
      pins: [{ placeId: "geonames:3621138" }],
    })
    const serialized = JSON.stringify(publicState)
    expect(serialized).not.toContain("wish_")
    expect(serialized).not.toContain("Private Moab parks plan")
    expect(serialized).not.toContain("Private planning note")
    expect(serialized).not.toContain("geonames:5556144")
  })

  it("keeps immutable stop snapshots when source wishes change or are deleted", async () => {
    const moab = await createWish(
      "geonames:5601615",
      1,
      "61616161-6161-4161-8161-616161616161"
    )
    const arches = await createWish(
      "geonames:5556144",
      2,
      "62626262-6262-4262-8262-626262626262"
    )
    const created = await createMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        title: "Moab parks",
        status: "saved",
        desiredYear: 2027,
        note: "",
        startWishId: moab.wish.wishId,
        stopWishIds: [arches.wish.wishId],
        endMode: "return-to-start",
        expectedRevision: 3,
        idempotencyKey: "63636363-6363-4363-8363-636363636363",
      },
      placeCatalog,
      now: NOW,
    })
    expect(created).toMatchObject({
      profile: { revision: 4, planCount: 1 },
      plan: {
        start: {
          name: "Moab",
          catalogRevision: "fixture-2026-11-17",
          sourceWishId: moab.wish.wishId,
        },
        stops: [
          {
            name: "Arches National Park",
            routeReadiness: "needs-entrance-selection",
          },
        ],
        retentionState: "active",
        retentionExpiresAt: "2027-05-17T15:00:00.000Z",
      },
    })

    await updateMyWish({
      environment: environment(),
      identity: IDENTITY,
      input: {
        wishId: arches.wish.wishId,
        patch: { note: "Choose the entrance before navigation." },
        expectedRevision: 4,
        idempotencyKey: "64646464-6464-4464-8464-646464646464",
      },
      now: NOW,
    })
    await deleteMyWish({
      environment: environment(),
      identity: IDENTITY,
      input: {
        wishId: arches.wish.wishId,
        expectedRevision: 5,
        idempotencyKey: "65656565-6565-4565-8565-656565656565",
      },
      now: NOW,
    })

    const plans = await listMyPlans({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(plans).toMatchObject({
      profile: { revision: 6, wishCount: 1, planCount: 1 },
      plans: [
        {
          planId: created.plan.planId,
          stops: [{ name: "Arches National Park" }],
        },
      ],
    })
  })

  it("marks inactive plans pending, keeps explicitly, and expires without deleting wishes", async () => {
    const moab = await createWish(
      "geonames:5601615",
      1,
      "71717171-7171-4171-8171-717171717171"
    )
    const arches = await createWish(
      "geonames:5556144",
      2,
      "72727272-7272-4272-8272-727272727272"
    )
    const created = await createMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        title: "Moab parks",
        status: "saved",
        desiredYear: 2027,
        note: "",
        startWishId: moab.wish.wishId,
        stopWishIds: [arches.wish.wishId],
        endMode: "return-to-start",
        expectedRevision: 3,
        idempotencyKey: "73737373-7373-4373-8373-737373737373",
      },
      placeCatalog,
      now: NOW,
    })
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    expect(
      await user.expireOwnerPlans("2027-05-17T15:00:00.000Z")
    ).toMatchObject({ changed: true, deleted: false })

    let plans = await listMyPlans({ environment: environment(), identity: IDENTITY })
    expect(plans).toMatchObject({
      profile: { revision: 5 },
      plans: [
        {
          retentionState: "deletion-pending",
          deleteAfter: "2027-06-16T15:00:00.000Z",
        },
      ],
    })

    const kept = await keepMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        planId: created.plan.planId,
        expectedRevision: 5,
        idempotencyKey: "74747474-7474-4474-8474-747474747474",
      },
      now: "2027-05-20T15:00:00.000Z",
    })
    expect(kept).toMatchObject({
      profile: { revision: 6 },
      plan: {
        retentionState: "active",
        retentionExpiresAt: "2027-11-20T15:00:00.000Z",
      },
    })

    expect(
      await user.expireOwnerPlans("2027-12-21T15:00:00.000Z")
    ).toMatchObject({ changed: true, deleted: true })
    plans = await listMyPlans({ environment: environment(), identity: IDENTITY })
    expect(plans).toMatchObject({
      profile: { revision: 7, wishCount: 2, planCount: 0 },
      plans: [],
    })
    expect(
      (await exportMyAtlas({ environment: environment(), identity: IDENTITY }))
        .wishlist
    ).toHaveLength(2)
  })

  it("permanently erases app-owned state and makes exact retries safe", async () => {
    await createWish(
      "geonames:5601615",
      1,
      "81818181-8181-4181-8181-818181818181"
    )
    const input = {
      confirmation: "DELETE MY ATLAS",
      expectedRevision: 2,
      idempotencyKey: "82828282-8282-4282-8282-828282828282",
    }
    const deleted = await deleteMyAccount({
      environment: environment(),
      identity: IDENTITY,
      input,
      now: NOW,
    })
    expect(deleted).toMatchObject({ deleted: true, idempotent: false })
    await expect(
      getMyProfile({ environment: environment(), identity: IDENTITY })
    ).rejects.toMatchObject({ code: "registration_not_found" })
    expect(await registry().getActiveRegistrationByHandle("planner-owner")).toEqual({
      ok: false,
      error: "registration_not_found",
    })
    await runInDurableObject(registry(), (_instance, state) => {
      expect(state.storage.kv.get("handle:planner-owner")).toEqual({
        schemaVersion: 1,
        state: "deleted",
        deletedAt: NOW,
      })
    })

    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    await runInDurableObject(user, (_instance, state) => {
      const entries = Array.from(state.storage.kv.list())
      expect(entries.map(([key]) => key)).toEqual(["account-deleted"])
    })

    expect(
      await deleteMyAccount({
        environment: environment(),
        identity: IDENTITY,
        input,
        now: NOW,
      })
    ).toMatchObject({ deleted: true, idempotent: true })
  })
})
