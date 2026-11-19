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
  getMyPlanning,
  keepMyPlan,
  listMyPlans,
  listMyWishes,
  markMyPlanVisited,
  replaceMyPlan,
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

  it("snapshots direct catalog and custom start or finish locations without creating wishes", async () => {
    const arches = await createWish(
      "geonames:5556144",
      1,
      "97979797-9797-4797-8797-979797979797"
    )
    const created = await createMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        title: "Direct endpoints",
        status: "saved",
        desiredYear: 2027,
        note: "",
        start: { placeId: "geonames:5601615" },
        stopWishIds: [arches.wish.wishId],
        endMode: "selected-end",
        end: {
          customPlace: {
            name: "Private Salt Lake City finish",
            coordinates: [-111.891, 40.7608],
          },
        },
        expectedRevision: 2,
        idempotencyKey: "98989898-9898-4898-8898-989898989898",
      },
      placeCatalog,
      now: NOW,
    })

    expect(created).toMatchObject({
      profile: { revision: 3, wishCount: 1, planCount: 1 },
      plan: {
        start: {
          placeId: "geonames:5601615",
          name: "Moab",
          catalogRevision: "fixture-2026-11-17",
        },
        stops: [{ sourceWishId: arches.wish.wishId }],
        endMode: "selected-end",
        end: {
          placeType: "custom",
          name: "Private Salt Lake City finish",
          coordinates: [-111.891, 40.7608],
          routeReadiness: "user-coordinate-review",
        },
      },
    })
    expect(created.plan.start).not.toHaveProperty("sourceWishId")
    expect(created.plan.end).not.toHaveProperty("sourceWishId")
  })

  it("uses the account revision, reuses duplicate places, and isolates private wishlist state", async () => {
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
    const duplicate = await createWish(
      "geonames:5601615",
      1,
      "52525252-5252-4252-8252-525252525252"
    )
    expect(duplicate).toMatchObject({
      created: false,
      profile: { revision: 2, wishCount: 1 },
      wish: { wishId: moab.wish.wishId, name: "Moab" },
    })
    await expect(
      createWish("geonames:5556144", 1, "53535353-5353-4353-8353-535353535353")
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
    expect(publicState).toMatchObject({
      ok: false,
      error: "public_atlas_not_found",
    })
    expect(JSON.stringify(publicState)).not.toContain("Moab")
  })

  it("adds a destination and replaces an existing route at the atomic snapshot revision", async () => {
    const arches = await createWish(
      "geonames:5556144",
      1,
      "50505050-5050-4050-8050-505050505050"
    )
    const created = await createMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        title: "Driving loop",
        status: "saved",
        desiredYear: null,
        note: "",
        start: { placeId: "geonames:5601615" },
        stopWishIds: [arches.wish.wishId],
        endMode: "selected-end",
        end: { placeId: "geonames:5601615" },
        expectedRevision: 2,
        idempotencyKey: "51505050-5050-4050-8050-505050505050",
      },
      placeCatalog,
      now: NOW,
    })
    const uvita = await createWish(
      "geonames:3621138",
      3,
      "52505050-5050-4050-8050-505050505050"
    )
    const planning = await getMyPlanning({
      environment: environment(),
      identity: IDENTITY,
      placeCatalog,
    })
    expect(planning.profile.revision).toBe(4)

    const replaced = await replaceMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        planId: created.plan.planId,
        title: "Driving loop",
        status: "saved",
        desiredYear: null,
        note: "",
        start: { placeId: "geonames:5601615" },
        stopWishIds: [arches.wish.wishId, uvita.wish.wishId],
        endMode: "selected-end",
        end: { placeId: "geonames:5601615" },
        expectedRevision: planning.profile.revision,
        idempotencyKey: "53505050-5050-4050-8050-505050505050",
      },
      placeCatalog,
      now: NOW,
    })
    expect(replaced).toMatchObject({
      profile: { revision: 5 },
      plan: {
        stops: [
          { sourceWishId: arches.wish.wishId },
          { sourceWishId: uvita.wish.wishId },
        ],
      },
    })
  })

  it("keeps an unresolved catalog wish removable without accepting it into a plan", async () => {
    const moab = await createWish(
      "geonames:5601615",
      1,
      "53535353-5454-4555-8565-575757575757"
    )
    const unavailableCatalog = {
      async resolveMany(placeIds) {
        return placeIds.map(() => null)
      },
      async manifest() {
        return { catalogRevision: "fixture-missing-record" }
      },
    }

    const list = await listMyWishes({
      environment: environment(),
      identity: IDENTITY,
      input: { limit: 50, cursor: "" },
      placeCatalog: unavailableCatalog,
    })
    expect(list.wishes).toEqual([
      expect.objectContaining({
        wishId: moab.wish.wishId,
        placeId: "geonames:5601615",
        placeType: "unavailable",
        name: "Saved destination unavailable",
        unavailable: true,
        routeReadiness: "unavailable",
      }),
    ])

    await expect(
      createMyPlan({
        environment: environment(),
        identity: IDENTITY,
        input: {
          title: "Unavailable route",
          status: "saved",
          desiredYear: 2027,
          note: "",
          startWishId: moab.wish.wishId,
          stopWishIds: [moab.wish.wishId],
          endMode: "last-stop",
          expectedRevision: 2,
          idempotencyKey: "54545454-5555-4666-8777-585858585858",
        },
        placeCatalog: unavailableCatalog,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "place_unavailable" })
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
    const alreadyRemoved = await deleteMyWish({
      environment: environment(),
      identity: IDENTITY,
      input: {
        wishId: arches.wish.wishId,
        expectedRevision: 5,
        idempotencyKey: "65656565-6565-4565-8565-656565656566",
      },
      now: NOW,
    })
    expect(alreadyRemoved).toMatchObject({
      profile: { revision: 6, wishCount: 1 },
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

    const planning = await getMyPlanning({
      environment: environment(),
      identity: IDENTITY,
      placeCatalog,
    })
    expect(planning).toMatchObject({
      profile: { revision: 6, wishCount: 1, planCount: 1 },
      wishes: [{ wishId: moab.wish.wishId, name: "Moab" }],
      plans: [
        {
          planId: created.plan.planId,
          stops: [{ name: "Arches National Park" }],
        },
      ],
    })
  })

  it("atomically marks only selected plan stops visited and preserves planning state", async () => {
    const moab = await createWish(
      "geonames:5601615",
      1,
      "66666666-6666-4666-8666-666666666666"
    )
    const uvita = await createWish(
      "geonames:3621138",
      2,
      "67676767-6767-4676-8676-676767676767"
    )
    const arches = await createWish(
      "geonames:5556144",
      3,
      "68686868-6868-4686-8686-686868686868"
    )
    const created = await createMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        title: "Costa Rica and Utah review",
        status: "saved",
        desiredYear: 2027,
        note: "",
        startWishId: moab.wish.wishId,
        stopWishIds: [uvita.wish.wishId, arches.wish.wishId],
        endMode: "last-stop",
        expectedRevision: 4,
        idempotencyKey: "69696969-6969-4696-8696-696969696969",
      },
      placeCatalog,
      now: NOW,
    })
    const input = {
      planId: created.plan.planId,
      visits: [
        {
          stopIndex: 1,
          visitedDates: [{ year: 2025, month: 2 }],
          visitedYears: [2025],
          memory: "Snow over the red rock.",
        },
      ],
      expectedRevision: 5,
      idempotencyKey: "70707070-7070-4070-8070-707070707070",
    }
    const marked = await markMyPlanVisited({
      environment: environment(),
      identity: IDENTITY,
      input,
      placeCatalog,
      now: NOW,
    })
    expect(marked).toMatchObject({
      created: true,
      profile: { revision: 6, pinCount: 1, wishCount: 3, planCount: 1 },
      pins: [
        {
          placeId: "geonames:5556144",
          name: "Arches National Park",
          visitedDates: [{ year: 2025, month: 2 }],
          memory: "Snow over the red rock.",
        },
      ],
    })
    expect(
      await markMyPlanVisited({
        environment: environment(),
        identity: IDENTITY,
        input,
        placeCatalog,
        now: NOW,
      })
    ).toMatchObject({ created: false, profile: { revision: 6, pinCount: 1 } })

    const exported = await exportMyAtlas({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(exported.pins).toEqual([
      expect.objectContaining({ placeId: "geonames:5556144" }),
    ])
    expect(exported.wishlist).toHaveLength(3)
    expect(exported.plans).toEqual([
      expect.objectContaining({
        planId: created.plan.planId,
        stops: [
          expect.objectContaining({ placeId: "geonames:3621138" }),
          expect.objectContaining({ placeId: "geonames:5556144" }),
        ],
      }),
    ])

    await expect(
      markMyPlanVisited({
        environment: environment(),
        identity: IDENTITY,
        input: {
          ...input,
          expectedRevision: 6,
          idempotencyKey: "70707070-7171-4171-8171-717171717171",
        },
        placeCatalog,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "duplicate_place" })
    expect(
      await listMyPlans({ environment: environment(), identity: IDENTITY })
    ).toMatchObject({
      profile: { revision: 6 },
      plans: [{ planId: created.plan.planId }],
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

    let plans = await listMyPlans({
      environment: environment(),
      identity: IDENTITY,
    })
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
    plans = await listMyPlans({
      environment: environment(),
      identity: IDENTITY,
    })
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
    expect(
      await registry().getActiveRegistrationByHandle("planner-owner")
    ).toEqual({
      ok: false,
      error: "registration_not_found",
    })
    await runInDurableObject(registry(), (_instance, state) => {
      expect(state.storage.kv.get("handle:planner-owner")).toBeUndefined()
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

    const replacementInvite = "replacement_invitation_1234567890"
    await registry().issueInvitation({
      digest: await hashInviteCode(replacementInvite, PEPPER),
      maxUses: 1,
      createdAt: NOW,
      expiresAt: "2026-11-18T15:00:00.000Z",
    })
    const replacement = await registerBetaAccount({
      environment: environment(),
      identity: IDENTITY,
      input: normalizeRegistrationInput(
        {
          inviteCode: replacementInvite,
          handle: "planner-owner",
          displayName: "Planner Owner Again",
          turnstileToken: "test-turnstile-token",
          acceptTerms: true,
          acceptPrivacy: true,
        },
        "83838383-8383-4383-8383-838383838383"
      ),
      now: NOW,
      turnstileVerifier: async () => true,
      userIdFactory: () => "usr_eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    })
    expect(replacement).toMatchObject({
      profile: {
        userId: "usr_eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        handle: "planner-owner",
      },
    })
  })
})
