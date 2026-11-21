import { env } from "cloudflare:workers"
import { getMyTripUpgradePreview } from "../src/trips/preview.mjs"
import { matchTripRoute, tripRequest } from "../src/trips/service.mjs"
import { emptyTravelSearchDraft } from "../../../src/features/my-atlas/planning/travelSearch.mjs"
import {
  encodeSharedTrip,
  decodeSharedTrip,
} from "../../../src/features/my-atlas/planning/sharedTrip.mjs"
import { createMyPlan, createMyWish } from "../src/planning/service.mjs"
import { getPublicAtlas } from "../src/public/service.mjs"
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
  updateMyAtlasImageVisibility,
  updateMyPin,
  updateMyProfile,
} from "../src/account/service.mjs"
import { normalizeDeleteAccount } from "../src/planning/contracts.mjs"
import { wipeMyAtlasAccounts } from "../src/registration/wipe.mjs"
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

async function registerOwner({
  userId = USER_ID,
  inviteCode = "account_test_invitation_1234567890",
  registrationKey = "11111111-1111-4111-8111-111111111111",
} = {}) {
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
    registrationKey
  )
  return registerBetaAccount({
    environment: environment(),
    identity: IDENTITY,
    input,
    now: NOW,
    turnstileVerifier: async () => true,
    userIdFactory: () => userId,
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
  let tripSequence = 8000
  const tripKey = () =>
    `${String(++tripSequence).padStart(8, "0")}-1111-4111-8111-111111111111`
  async function tripCall(path, body, options = {}) {
    const identity = options.identity || IDENTITY
    const profile = (
      await getMyProfile({ environment: environment(), identity })
    ).profile
    return tripRequest({
      environment: {
        ...environment(),
        MY_ATLAS_TRIP_WRITES_ENABLED: options.disabled ? "false" : "true",
      },
      identity,
      route: matchTripRoute(path),
      method: options.method || "POST",
      body,
      headers: new Headers({
        "If-Match": `"rev-${options.revision ?? profile.revision}"`,
        "Idempotency-Key": options.key || tripKey(),
      }),
      now: options.now || NOW,
    })
  }
  async function upgradeTrips(options = {}) {
    const preview = await getMyTripUpgradePreview({
      environment: environment(),
      identity: options.identity || IDENTITY,
    })
    return tripCall(
      "/v1/me/trips/upgrade",
      {
        fingerprint: preview.fingerprint,
        confirmation: "ORGANIZE MY ATLAS",
        destinationModelVersion: 2,
        retentionAcknowledged: true,
      },
      options
    )
  }
  it("keeps destinations independent until explicitly grouped, including one-stop trips and repeated visits", async () => {
    const addDestination = async (name, coordinates, memory = "") => {
      const profile = (
        await getMyProfile({ environment: environment(), identity: IDENTITY })
      ).profile
      return createMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: pinInput({
          customPlace: { name, coordinates },
          memory,
          visitedYears: [2025],
          expectedRevision: profile.revision,
          idempotencyKey: tripKey(),
        }),
        now: NOW,
      })
    }
    const first = await addDestination("Uvita", [1, 2], "Original Uvita memory")
    const second = await addDestination(
      "Atlanta",
      [3, 4],
      "Original Atlanta memory"
    )
    const preview = await getMyTripUpgradePreview({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(preview.counts).toMatchObject({
      ungroupedDestinations: 2,
      candidateTrips: 0,
    })
    await expect(
      tripCall("/v1/me/trips/upgrade", {
        fingerprint: preview.fingerprint,
        confirmation: "ORGANIZE MY ATLAS",
        retentionAcknowledged: true,
      })
    ).rejects.toThrow("Trip details are invalid.")
    await upgradeTrips()
    let state = await tripCall("/v1/me/trips", undefined, { method: "GET" })
    expect(state.trips).toEqual([])
    expect(state.destinations).toHaveLength(2)
    const third = await addDestination("Another destination", [5, 6])
    expect(
      (await tripCall("/v1/me/trips", undefined, { method: "GET" })).trips
    ).toEqual([])
    const key = tripKey(),
      revision = third.profile.revision
    const body = {
      title: "A deliberate trip",
      pinIds: [second.pin.pinId, first.pin.pinId],
    }
    const grouped = await tripCall("/v1/me/trips/group-destinations", body, {
      key,
      revision,
    })
    expect(grouped.trip.stops.map(stop => stop.place.name)).toEqual([
      "Atlanta",
      "Uvita",
    ])
    expect(grouped.trip.stops.map(stop => stop.memories[0].text)).toEqual([
      "Original Atlanta memory",
      "Original Uvita memory",
    ])
    expect(grouped.trip.stops[0].visitedDates).toEqual([{ year: 2025 }])
    expect(
      (
        await tripCall("/v1/me/trips/group-destinations", body, {
          key,
          revision,
        })
      ).idempotent
    ).toBe(true)
    state = await tripCall("/v1/me/trips", undefined, { method: "GET" })
    expect(state.trips).toHaveLength(1)
    expect(state.destinations.map(pin => pin.pinId)).toEqual([third.pin.pinId])
    expect(state.profile.pinCount).toBe(3)
    const pins = (
      await getMyAtlasState({ environment: environment(), identity: IDENTITY })
    ).pins
    expect(pins.find(pin => pin.pinId === third.pin.pinId).ungrouped).toBe(true)
    expect(pins.filter(pin => pin.ungrouped === false)).toHaveLength(2)
    const appended = await tripCall("/v1/me/trips/group-destinations", {
      tripId: grouped.trip.tripId,
      pinIds: [third.pin.pinId],
    })
    expect(appended.trip.stops).toHaveLength(3)
    await expect(
      tripCall("/v1/me/trips/group-destinations", {
        title: "Cannot reuse",
        pinIds: [first.pin.pinId],
      })
    ).rejects.toMatchObject({ code: "destination_selection_changed" })
    const repeat = await addDestination("Uvita", [1, 2], "A different visit")
    expect(repeat.profile.pinCount).toBe(3)
    const single = await tripCall("/v1/me/trips/group-destinations", {
      title: "One-stop trip",
      pinIds: [repeat.pin.pinId],
    })
    expect(single.trip.stops).toHaveLength(1)
    expect(single.trip.stops[0].stopId).not.toBe(grouped.trip.stops[1].stopId)
    expect(single.trip.stops[0].memories[0].text).toBe("A different visit")
    const remaining = await addDestination("Keep ungrouped", [7, 8])
    const changed = await updateMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: remaining.pin.pinId,
        patch: { memory: "Still editable outside trips" },
        expectedRevision: remaining.profile.revision,
        idempotencyKey: tripKey(),
      },
      now: NOW,
    })
    await deleteMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: remaining.pin.pinId,
        expectedRevision: changed.profile.revision,
        idempotencyKey: tripKey(),
      },
      now: NOW,
    })
    state = await tripCall("/v1/me/trips", undefined, { method: "GET" })
    expect(state.destinations).toEqual([])
    expect(state.trips).toHaveLength(2)
    expect(state.profile.pinCount).toBe(3)
    await expect(
      tripCall(
        "/v1/me/trips/group-destinations",
        { title: "No write", pinIds: [first.pin.pinId] },
        { disabled: true }
      )
    ).rejects.toMatchObject({ code: "trip_writes_disabled" })
  })
  it("publishes only ordered geography for explicitly public Past trips", async () => {
    await upgradeTrips()
    const visible = await tripCall("/v1/me/trips", {
      title: "Public journey",
      description: "Private overview",
      lifecycle: "past",
      stops: [
        { customPlace: { name: "Repeated place", coordinates: [1, 2] } },
        { customPlace: { name: "Repeated place", coordinates: [1, 2] } },
      ],
    })
    await tripCall(
      `/v1/me/trips/${visible.trip.tripId}/stops/${visible.trip.stops[0].stopId}`,
      { memory: "Private memory" },
      { method: "PATCH" }
    )
    const hidden = await tripCall("/v1/me/trips", {
      title: "Private journey",
      lifecycle: "past",
      stops: [{ customPlace: { name: "Private place", coordinates: [3, 4] } }],
    })
    const planned = await tripCall("/v1/me/trips", {
      title: "Future journey",
      lifecycle: "planned",
      stops: [{ customPlace: { name: "Future place", coordinates: [5, 6] } }],
    })
    for (const trip of [visible.trip, planned.trip])
      await tripCall(
        `/v1/me/trips/${trip.tripId}/sharing`,
        { publicAtlas: true },
        { method: "PATCH" }
      )
    const profile = (
      await getMyProfile({ environment: environment(), identity: IDENTITY })
    ).profile
    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true },
        expectedRevision: profile.revision,
        idempotencyKey: tripKey(),
      },
      now: NOW,
    })
    const result = await getPublicAtlas({
      environment: environment(),
      handle: "account-owner",
      placeCatalog: {
        manifest: async () => ({
          catalogRevision: "fixture",
          attribution: { provider: "GeoNames", license: "CC BY 4.0" },
        }),
      },
    })
    expect(result.atlas.trips).toEqual([
      {
        id: "public-trip-1",
        title: "Public journey",
        lifecycle: "past",
        stops: visible.trip.stops.map(stop => ({
          placeId: stop.place.placeId,
        })),
      },
    ])
    for (const secret of [
      "Private overview",
      "Private memory",
      "Private journey",
      "Future journey",
      "Future place",
      visible.trip.tripId,
      hidden.trip.tripId,
      visible.trip.stops[0].stopId,
      "logistics",
      "experiences",
    ])
      expect(JSON.stringify(result)).not.toContain(secret)
  })
  it("moves complete visits between trips and Ungrouped without deleting memories or empty-trip data", async () => {
    await upgradeTrips()
    const source = await tripCall("/v1/me/trips", {
      title: "Source trip",
      description: "Keep the empty trip overview",
      lifecycle: "past",
      stops: [
        { customPlace: { name: "Repeated visit", coordinates: [1, 2] } },
        { customPlace: { name: "Repeated visit", coordinates: [1, 2] } },
      ],
    })
    const first = source.trip.stops[0]
    const edited = await tripCall(
      `/v1/me/trips/${source.trip.tripId}/stops/${first.stopId}`,
      {
        memory: "Keep every memory",
        actualDates: { arrival: "2026-01-01", departure: "2026-01-03" },
        experienceChange: {
          action: "add",
          id: "exp_" + "b".repeat(32),
          title: "Private boat trip",
          operatorName: "",
          operatorWebsite: "",
        },
      },
      { method: "PATCH" }
    )
    const originalVisit = edited.trip.stops[0]
    const target = await tripCall("/v1/me/trips", {
      title: "Target trip",
      lifecycle: "past",
      stops: [{ customPlace: { name: "Another place", coordinates: [3, 4] } }],
    })
    const revision = target.profile.revision,
      key = tripKey(),
      transfer = {
        fromTripId: source.trip.tripId,
        targetTripId: target.trip.tripId,
        stopIds: [first.stopId],
      }
    const moved = await tripCall("/v1/me/trips/visits/transfer", transfer, {
      key,
      revision,
    })
    expect(moved.trip.stops[1]).toEqual(originalVisit)
    expect(
      (
        await tripCall("/v1/me/trips/visits/transfer", transfer, {
          key,
          revision,
        })
      ).idempotent
    ).toBe(true)
    await expect(
      tripCall(
        "/v1/me/trips/visits/transfer",
        { ...transfer, stopIds: [source.trip.stops[1].stopId] },
        { revision }
      )
    ).rejects.toMatchObject({ code: "revision_conflict" })
    await tripCall("/v1/me/trips/visits/transfer", {
      fromTripId: target.trip.tripId,
      targetTripId: null,
      stopIds: [first.stopId],
    })
    let state = await tripCall("/v1/me/trips", undefined, { method: "GET" })
    expect(state.ungroupedVisits[0].stop).toEqual(originalVisit)
    expect(state.profile.pinCount).toBe(2)
    await tripCall(
      `/v1/me/trips/visits/${first.stopId}`,
      { memory: "Edited while ungrouped" },
      { method: "PATCH" }
    )
    const restored = await tripCall("/v1/me/trips/visits/transfer", {
      fromTripId: null,
      targetTripId: source.trip.tripId,
      stopIds: [first.stopId],
    })
    expect(restored.trip.stops[1].stopId).toBe(first.stopId)
    expect(restored.trip.stops[1].memories[0].memoryId).toBe(
      originalVisit.memories[0].memoryId
    )
    expect(restored.trip.stops[1].memories[0].text).toBe(
      "Edited while ungrouped"
    )
    expect(restored.trip.stops[1].experiences).toEqual(
      originalVisit.experiences
    )
    await tripCall("/v1/me/trips/visits/transfer", {
      fromTripId: source.trip.tripId,
      targetTripId: null,
      stopIds: restored.trip.stops.map(stop => stop.stopId),
    })
    state = await tripCall("/v1/me/trips", undefined, { method: "GET" })
    expect(state.ungroupedVisits).toHaveLength(2)
    expect(
      state.trips.find(trip => trip.tripId === source.trip.tripId)
    ).toMatchObject({
      workflow: "draft",
      stops: [],
      description: "Keep the empty trip overview",
    })
    const exported = await exportMyAtlas({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(exported.ungroupedVisits).toHaveLength(2)
    expect(JSON.stringify(exported)).toContain("Private boat trip")
    const regrouped = await tripCall("/v1/me/trips/visits/transfer", {
      fromTripId: null,
      targetTripId: null,
      title: "Explicit regrouped trip",
      stopIds: [first.stopId],
    })
    expect(regrouped.trip.title).toBe("Explicit regrouped trip")
    expect(regrouped.trip.sharing.publicAtlas).toBe(false)
    expect(regrouped.trip.stops[0]).toEqual(
      state.ungroupedVisits.find(visit => visit.stop.stopId === first.stopId)
        .stop
    )
    const split = await tripCall("/v1/me/trips/visits/transfer", {
      fromTripId: regrouped.trip.tripId,
      targetTripId: null,
      title: "Explicit split trip",
      stopIds: [first.stopId],
    })
    expect(split.trip.stops).toEqual(regrouped.trip.stops)
    const afterSplit = await tripCall("/v1/me/trips", undefined, {
      method: "GET",
    })
    expect(afterSplit.ungroupedVisits).toHaveLength(1)
    expect(
      afterSplit.trips.find(trip => trip.tripId === regrouped.trip.tripId).stops
    ).toEqual([])
    await registerSecondOwner()
    await upgradeTrips({ identity: SECOND_IDENTITY })
    await expect(
      tripCall(
        "/v1/me/trips/visits/transfer",
        {
          fromTripId: null,
          targetTripId: target.trip.tripId,
          stopIds: [first.stopId],
        },
        { identity: SECOND_IDENTITY }
      )
    ).rejects.toMatchObject({ code: "trip_not_found" })
    const before = (
      await getMyProfile({ environment: environment(), identity: IDENTITY })
    ).profile
    await deleteMyAccount({
      environment: environment(),
      identity: IDENTITY,
      input: {
        confirmation: "DELETE MY ATLAS",
        expectedRevision: before.revision,
        idempotencyKey: tripKey(),
      },
      now: NOW,
    })
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    expect(
      await runInDurableObject(user, (_instance, state) => [
        ...state.storage.kv.list({ prefix: "visit:" }),
      ])
    ).toEqual([])
  })
  it("saves private flight/rental intentions and explicit per-trip Atlas visibility", async () => {
    await upgradeTrips()
    const created = await tripCall("/v1/me/trips", {
      title: "Trip tools",
      lifecycle: "past",
      stops: [{ customPlace: { name: "Destination", coordinates: [1, 2] } }],
    })
    const path = `/v1/me/trips/${created.trip.tripId}`
    const draft = emptyTravelSearchDraft()
    Object.assign(draft.flights, {
      outboundFrom: "ATL",
      outboundTo: "MAD",
      departDate: "2026-12-01",
      returnDate: "2026-12-10",
      confirmed: true,
    })
    Object.assign(draft.rental, {
      need: "yes",
      pickup: "Private rental pickup",
      pickupAt: "2026-12-02T10:00",
      dropoffAt: "2026-12-08T10:00",
    })
    const saved = await tripCall(
      path + "/logistics",
      { draft },
      { method: "PATCH" }
    )
    expect(saved.trip.logistics.flights[0].searchDraft).toEqual(draft.flights)
    expect(saved.trip.logistics.rentals[0].searchDraft).toEqual(draft.rental)
    expect(
      (await tripCall(path + "/logistics", { draft }, { method: "PATCH" })).trip
        .logistics
    ).toEqual(saved.trip.logistics)
    const planned = await tripCall(
      path + "/lifecycle",
      { lifecycle: "planned" },
      { method: "PATCH" }
    )
    expect(planned.trip.logistics).toEqual(saved.trip.logistics)
    await expect(
      tripCall("/v1/me/trips/visits/transfer", {
        fromTripId: created.trip.tripId,
        targetTripId: null,
        stopIds: [created.trip.stops[0].stopId],
      })
    ).rejects.toMatchObject({ code: "visit_lifecycle_mismatch" })
    await expect(
      tripCall(
        path + "/logistics",
        { draft: { ...draft, secretUrl: "https://example.invalid" } },
        { method: "PATCH" }
      )
    ).rejects.toThrow()
    await expect(
      tripCall(
        path + "/logistics",
        {
          draft: {
            ...draft,
            rental: { ...draft.rental, dropoffAt: "2026-12-01T10:00" },
          },
        },
        { method: "PATCH" }
      )
    ).rejects.toThrow()
    await tripCall(
      path + "/lifecycle",
      { lifecycle: "past" },
      { method: "PATCH" }
    )
    let profile = (
      await getMyProfile({ environment: environment(), identity: IDENTITY })
    ).profile
    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true, discoverable: true },
        expectedRevision: profile.revision,
        idempotencyKey: tripKey(),
      },
      now: NOW,
    })
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    expect((await user.getPublicAtlas()).ok).toBe(false)
    const published = await tripCall(
      path + "/sharing",
      { publicAtlas: true },
      { method: "PATCH" }
    )
    expect((await user.getPublicAtlas()).pins).toHaveLength(1)
    expect((await user.getPublicAtlas()).trips).toEqual([
      {
        id: "public-trip-1",
        title: published.trip.title,
        stops: [{ placeId: published.trip.stops[0].place.placeId }],
      },
    ])
    expect(JSON.stringify(await user.getPublicAtlas())).not.toContain(
      "Private rental pickup"
    )
    expect(
      JSON.stringify(decodeSharedTrip(encodeSharedTrip(published.trip)))
    ).not.toContain("Private rental pickup")
    await tripCall("/v1/me/trips/visits/transfer", {
      fromTripId: created.trip.tripId,
      targetTripId: null,
      stopIds: [created.trip.stops[0].stopId],
    })
    expect((await user.getPublicAtlas()).pins).toHaveLength(1)
    await tripCall("/v1/me/trips/visits/transfer", {
      fromTripId: null,
      targetTripId: created.trip.tripId,
      stopIds: [created.trip.stops[0].stopId],
    })
    await tripCall(
      path + "/sharing",
      { publicAtlas: false },
      { method: "PATCH" }
    )
    expect((await user.getPublicAtlas()).ok).toBe(false)
    expect(
      (await exportMyAtlas({ environment: environment(), identity: IDENTITY }))
        .trips[0].logistics
    ).toEqual(saved.trip.logistics)
  })
  it("keeps trip writes disabled by default and rejects unreviewed or stale upgrades", async () => {
    await expect(
      tripCall(
        "/v1/me/trips",
        {
          title: "A trip",
          lifecycle: "past",
          stops: [{ customPlace: { name: "One place", coordinates: [1, 2] } }],
        },
        { disabled: true }
      )
    ).rejects.toMatchObject({ code: "trip_writes_disabled" })
    const preview = await getMyTripUpgradePreview({
      environment: environment(),
      identity: IDENTITY,
    })
    await expect(
      tripCall("/v1/me/trips/upgrade", {
        fingerprint: preview.fingerprint,
        confirmation: "ORGANIZE MY ATLAS",
        destinationModelVersion: 2,
        retentionAcknowledged: false,
      })
    ).rejects.toThrow()
    await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        customPlace: { name: "After preview", coordinates: [1, 2] },
        expectedRevision: 1,
        idempotencyKey: tripKey(),
      }),
      now: NOW,
    })
    await expect(
      tripCall("/v1/me/trips/upgrade", {
        fingerprint: preview.fingerprint,
        confirmation: "ORGANIZE MY ATLAS",
        destinationModelVersion: 2,
        retentionAcknowledged: true,
      })
    ).rejects.toMatchObject({ code: "upgrade_source_changed" })
    expect(
      (await exportMyAtlas({ environment: environment(), identity: IDENTITY }))
        .pins
    ).toHaveLength(1)
  })
  it("keeps private stop entries out of public views and removes obsolete rollback and receipt snapshots", async () => {
    const created = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        customPlace: { name: "Published place", coordinates: [1, 2] },
        visitedYears: [2025],
        memory: "Published favorite",
        expectedRevision: 1,
        idempotencyKey: tripKey(),
      }),
      now: NOW,
    })
    await updateMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: created.pin.pinId,
        patch: {
          experienceChange: {
            action: "add",
            id: "exp_" + "c".repeat(32),
            title: "Remove this private activity",
            operatorName: "",
            operatorWebsite: "",
          },
        },
        expectedRevision: 2,
        idempotencyKey: tripKey(),
      },
      now: NOW,
    })
    await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true, discoverable: true },
        expectedRevision: 3,
        idempotencyKey: tripKey(),
      },
      now: NOW,
    })
    await upgradeTrips()
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    await tripCall("/v1/me/trips/group-destinations", {
      title: "Published journey",
      pinIds: [created.pin.pinId],
    })
    const listed = await tripCall("/v1/me/trips", undefined, { method: "GET" })
    const trip = listed.trips[0],
      path = `/v1/me/trips/${trip.tripId}/stops/${trip.stops[0].stopId}`
    const publicBefore = await user.getPublicAtlas()
    expect(publicBefore.pins[0].memory).toBe("Published favorite")
    expect(JSON.stringify(publicBefore)).not.toContain(
      "Remove this private activity"
    )
    await tripCall(
      path,
      { experienceChange: { action: "remove", id: "exp_" + "c".repeat(32) } },
      { method: "PATCH", now: "2026-11-20T12:00:00.000Z" }
    )
    expect((await user.getPublicAtlasDiscovery()).profile.updatedAt).toBe(NOW)
    const serialized = await runInDurableObject(user, (_instance, state) =>
      JSON.stringify([...state.storage.kv.list()])
    )
    expect(serialized).not.toContain("Remove this private activity")
    expect(serialized).not.toContain("trip-upgrade-backup")
    const publicView = await getPublicAtlas({
      environment: environment(),
      handle: "account-owner",
      placeCatalog: {
        manifest: async () => ({
          catalogRevision: "fixture",
          attribution: { provider: "GeoNames", license: "CC BY 4.0" },
        }),
      },
    })
    expect(publicView.atlas.places[0].name).toBe("Published place")
    expect(publicView.atlas.places[0].memory).toBe("Published favorite")
    expect(JSON.stringify(publicView)).not.toContain("experiences")
    expect(JSON.stringify(publicView)).not.toContain("sourceWishId")
    expect(
      (
        await getMyAtlasState({
          environment: environment(),
          identity: IDENTITY,
        })
      ).pins[0].name
    ).toBe("Published place")
  })
  it("atomically upgrades plans and visits, supports safe rollback and protects history from old alarms", async () => {
    const pin = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        customPlace: { name: "Historical visit", coordinates: [1, 2] },
        visitedYears: [2025],
        memory: "Original memory",
        expectedRevision: 1,
        idempotencyKey: tripKey(),
      }),
      now: NOW,
    })
    const wish = await createMyWish({
      environment: environment(),
      identity: IDENTITY,
      input: {
        customPlace: { name: "A planned stop", coordinates: [3, 4] },
        note: "Wish note",
        priority: "normal",
        desiredYear: null,
        expectedRevision: 2,
        idempotencyKey: tripKey(),
      },
      now: NOW,
    })
    const plan = await createMyPlan({
      environment: environment(),
      identity: IDENTITY,
      input: {
        title: "Existing route",
        status: "saved",
        desiredYear: 2027,
        note: "Private plan note",
        start: {
          customPlace: { name: "Original origin", coordinates: [5, 6] },
        },
        stopWishIds: [wish.wish.wishId],
        endMode: "return-to-start",
        expectedRevision: 3,
        idempotencyKey: tripKey(),
      },
      now: NOW,
    })
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    const before = await exportMyAtlas({
      environment: environment(),
      identity: IDENTITY,
    })
    const alarmBefore = await runInDurableObject(user, (_instance, state) =>
      state.storage.getAlarm()
    )
    expect(alarmBefore).not.toBeNull()
    const preview = await getMyTripUpgradePreview({
      environment: environment(),
      identity: IDENTITY,
    })
    const key = tripKey(),
      body = {
        fingerprint: preview.fingerprint,
        confirmation: "ORGANIZE MY ATLAS",
        destinationModelVersion: 2,
        retentionAcknowledged: true,
      }
    const upgraded = await tripCall("/v1/me/trips/upgrade", body, {
      key,
      revision: 4,
    })
    expect(upgraded.profile).toMatchObject({
      revision: 5,
      tripSchemaVersion: 2,
      tripCount: 1,
      planCount: 0,
    })
    const replay = await tripCall("/v1/me/trips/upgrade", body, {
      key,
      revision: 4,
    })
    expect(replay.idempotent).toBe(true)
    expect(replay.profile.revision).toBe(5)
    const listed = await tripCall("/v1/me/trips", undefined, { method: "GET" })
    expect(listed.rollbackAvailable).toBe(true)
    expect(listed.destinations[0].memory).toBe("Original memory")
    expect(
      listed.trips.find(trip => trip.lifecycle === "planned")
    ).toMatchObject({
      tripId: plan.plan.planId,
      description: "Private plan note",
      legacy: {
        routeDetails: {
          endMode: "return-to-start",
          start: { name: "Original origin" },
        },
      },
    })
    expect(
      await runInDurableObject(user, (_instance, state) =>
        state.storage.getAlarm()
      )
    ).toBeNull()
    await user.expireOwnerPlans("2035-01-01T00:00:00.000Z")
    expect(
      (await tripCall("/v1/me/trips", undefined, { method: "GET" })).trips
    ).toHaveLength(1)
    await expect(
      updateMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: {
          pinId: pin.pin.pinId,
          patch: { memory: "Legacy overwrite" },
          expectedRevision: 4,
          idempotencyKey: tripKey(),
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "revision_conflict" })
    const exported = await exportMyAtlas({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(exported.trips).toHaveLength(1)
    expect(exported.tripRollbackSnapshot.pins).toEqual(before.pins)
    expect(JSON.stringify(exported)).not.toContain("identityDigest")
    const rollbackKey = tripKey()
    const rolled = await tripCall(
      "/v1/me/trips/rollback",
      {},
      { key: rollbackKey, revision: 5 }
    )
    expect(rolled.upgraded).toBe(false)
    expect(rolled.profile.revision).toBe(6)
    const restored = await exportMyAtlas({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(restored.pins).toEqual(before.pins)
    expect(restored.plans).toEqual(before.plans)
    expect(restored.wishlist).toEqual(before.wishlist)
    expect(
      await runInDurableObject(user, (_instance, state) =>
        state.storage.getAlarm()
      )
    ).toBe(alarmBefore)
    expect(
      (
        await tripCall(
          "/v1/me/trips/rollback",
          {},
          { key: rollbackKey, revision: 5 }
        )
      ).idempotent
    ).toBe(true)
    await expect(
      tripCall("/v1/me/trips/upgrade", body, { key, revision: 4 })
    ).rejects.toMatchObject({ code: "upgrade_source_changed" })
  })
  it("persists repeated occurrences, reversible lifecycle, stop memories and Combine into Trip", async () => {
    await upgradeTrips()
    const input = {
      title: "First visit",
      lifecycle: "past",
      stops: [{ customPlace: { name: "Repeated place", coordinates: [1, 2] } }],
    }
    const key = tripKey(),
      first = await tripCall("/v1/me/trips", input, { key, revision: 2 })
    const replay = await tripCall("/v1/me/trips", input, { key, revision: 2 })
    expect(replay.idempotent).toBe(true)
    expect(replay.trip.tripId).toBe(first.trip.tripId)
    const second = await tripCall("/v1/me/trips", {
      ...input,
      title: "Second visit",
    })
    expect(second.trip.stops[0].place.placeId).toBe(
      first.trip.stops[0].place.placeId
    )
    expect(second.trip.stops[0].stopId).not.toBe(first.trip.stops[0].stopId)
    const path = `/v1/me/trips/${first.trip.tripId}`,
      stopPath = `${path}/stops/${first.trip.stops[0].stopId}`
    const noted = await tripCall(
      stopPath,
      {
        memory: "Only the first visit",
        experienceChange: {
          action: "add",
          id: "exp_" + "a".repeat(32),
          title: "Private activity",
          operatorName: "",
          operatorWebsite: "",
        },
      },
      { method: "PATCH" }
    )
    expect(
      (await tripCall("/v1/me/trips", undefined, { method: "GET" })).trips.find(
        trip => trip.tripId === second.trip.tripId
      ).stops[0].memories
    ).toEqual([])
    const back = await tripCall(
      `${path}/lifecycle`,
      { lifecycle: "planned" },
      { method: "PATCH" }
    )
    const again = await tripCall(
      `${path}/lifecycle`,
      { lifecycle: "past" },
      { method: "PATCH" }
    )
    expect(back.trip.stops).toEqual(noted.trip.stops)
    expect(again.trip.stops).toEqual(noted.trip.stops)
    await expect(
      tripCall(stopPath, {}, { method: "DELETE" })
    ).rejects.toMatchObject({ code: "stop_has_content" })
    await expect(tripCall("/v1/me/trips/rollback", {})).rejects.toMatchObject({
      code: "rollback_unavailable",
    })
    const combined = await tripCall("/v1/me/trips/combine", {
      tripIds: [first.trip.tripId, second.trip.tripId],
      title: "Combined journey",
    })
    expect(combined.trip.stops.map(stop => stop.stopId)).toEqual([
      first.trip.stops[0].stopId,
      second.trip.stops[0].stopId,
    ])
    expect(combined.trip.stops[0].memories[0].text).toBe("Only the first visit")
    expect(
      (await tripCall("/v1/me/trips", undefined, { method: "GET" })).trips
    ).toHaveLength(1)
    await expect(
      tripCall(`${path}/lifecycle`, { lifecycle: "past" }, { method: "PATCH" })
    ).rejects.toMatchObject({ code: "trip_not_found" })
    const exported = await exportMyAtlas({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(exported.trips[0].stops).toHaveLength(2)
    expect(exported.tripRollbackSnapshot).toBeUndefined()
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    expect(
      (
        await runInDurableObject(user, (_instance, state) =>
          Array.from(
            state.storage.kv.list({ prefix: "trip-operation:" }),
            ([, value]) => value
          )
        )
      ).every(
        receipt => !JSON.stringify(receipt).includes("Only the first visit")
      )
    ).toBe(true)
    await registerSecondOwner()
    await upgradeTrips({ identity: SECOND_IDENTITY })
    await expect(
      tripCall(
        `/v1/me/trips/${combined.trip.tripId}/lifecycle`,
        { lifecycle: "past" },
        { identity: SECOND_IDENTITY, method: "PATCH" }
      )
    ).rejects.toMatchObject({ code: "trip_not_found" })
    const profile = (
      await getMyProfile({ environment: environment(), identity: IDENTITY })
    ).profile
    await deleteMyAccount({
      environment: environment(),
      identity: IDENTITY,
      input: {
        expectedRevision: profile.revision,
        idempotencyKey: tripKey(),
        confirmation: "DELETE MY ATLAS",
        accountId: USER_ID,
      },
      now: NOW,
    })
    expect(
      await runInDurableObject(user, (_instance, state) =>
        Array.from(state.storage.kv.list(), ([key]) => key)
      )
    ).toEqual(["account-deleted"])
  })
  it("edits stop order and dates with revision guards and explicit content deletion", async () => {
    await upgradeTrips()
    const created = await tripCall("/v1/me/trips", {
      title: "Ordered stops",
      lifecycle: "planned",
      stops: [
        { customPlace: { name: "First", coordinates: [1, 2] } },
        { customPlace: { name: "Second", coordinates: [3, 4] } },
      ],
    })
    const path = `/v1/me/trips/${created.trip.tripId}`
    await expect(
      tripCall(
        `${path}/lifecycle`,
        { lifecycle: "past" },
        { method: "PATCH", revision: 2 }
      )
    ).rejects.toMatchObject({ code: "revision_conflict", status: 412 })
    await expect(
      tripCall(path, { sharing: { publicAtlas: true } }, { method: "PATCH" })
    ).rejects.toThrow()
    const added = await tripCall(`${path}/stops`, {
      customPlace: { name: "Middle", coordinates: [5, 6] },
      afterStopId: created.trip.stops[0].stopId,
    })
    expect(added.trip.stops.map(stop => stop.place.name)).toEqual([
      "First",
      "Middle",
      "Second",
    ])
    const middle = added.trip.stops[1]
    await expect(
      tripCall(
        `${path}/stops/${middle.stopId}`,
        { actualDates: { arrival: "2025-02-29", departure: null } },
        { method: "PATCH" }
      )
    ).rejects.toThrow()
    const edited = await tripCall(
      `${path}/stops/${middle.stopId}`,
      {
        memory: "Keep until explicitly removed",
        plannedDates: { arrival: "2027-01-01", departure: "2027-01-02" },
        actualDates: { arrival: null, departure: null },
      },
      { method: "PATCH" }
    )
    const revision = edited.profile.revision
    await expect(
      tripCall(
        `${path}/stops/order`,
        { stopIds: [middle.stopId, middle.stopId, middle.stopId] },
        { method: "PATCH" }
      )
    ).rejects.toMatchObject({ code: "invalid_stop_order" })
    expect(
      (await getMyProfile({ environment: environment(), identity: IDENTITY }))
        .profile.revision
    ).toBe(revision)
    const reordered = await tripCall(
      `${path}/stops/order`,
      { stopIds: [...edited.trip.stops].reverse().map(stop => stop.stopId) },
      { method: "PATCH" }
    )
    expect(reordered.trip.stops[1].memories).toEqual(
      edited.trip.stops[1].memories
    )
    expect(reordered.trip.stops[1].plannedDates).toEqual(
      edited.trip.stops[1].plannedDates
    )
    await expect(
      tripCall(`${path}/stops/${middle.stopId}`, {}, { method: "DELETE" })
    ).rejects.toMatchObject({ code: "stop_has_content" })
    await tripCall(
      `${path}/stops/${middle.stopId}`,
      { discardContent: true },
      { method: "DELETE" }
    )
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    expect(
      await runInDurableObject(user, (_instance, state) =>
        JSON.stringify([...state.storage.kv.list()])
      )
    ).not.toContain("Keep until explicitly removed")
    await expect(
      tripCall(path, { confirmation: "wrong" }, { method: "DELETE" })
    ).rejects.toThrow()
    const key = tripKey(),
      before = (
        await getMyProfile({ environment: environment(), identity: IDENTITY })
      ).profile.revision
    await tripCall(
      path,
      { confirmation: "DELETE TRIP" },
      { method: "DELETE", key, revision: before }
    )
    expect(
      (
        await tripCall(
          path,
          { confirmation: "DELETE TRIP" },
          { method: "DELETE", key, revision: before }
        )
      ).idempotent
    ).toBe(true)
    expect(
      (await tripCall("/v1/me/trips", undefined, { method: "GET" })).trips
    ).toEqual([])
  })
  it("previews trip organization without writing records, revision or retention alarms", async () => {
    await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        customPlace: { name: "A visited place", coordinates: [16.44, 43.51] },
        visitedYears: [2025],
        memory: "Private favorite memory",
        expectedRevision: 1,
        idempotencyKey: "dededede-1111-4111-8111-111111111111",
      }),
      now: NOW,
    })
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    const snapshot = () =>
      runInDurableObject(user, async (_instance, state) => ({
        records: [...state.storage.kv.list()],
        alarm: await state.storage.getAlarm(),
      }))
    const before = await snapshot()
    const preview = await getMyTripUpgradePreview({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(preview.ready).toBe(true)
    expect(preview.revision).toBe(2)
    expect(preview.counts).toMatchObject({
      sourcePins: 1,
      sourcePlans: 0,
      candidateTrips: 0,
      candidateStops: 0,
      ungroupedDestinations: 1,
    })
    expect(preview.groups).toEqual([])
    expect(preview.destinations[0].name).toBe("A visited place")
    expect(JSON.stringify(preview)).not.toContain("Private favorite memory")
    expect(JSON.stringify(preview)).not.toContain("identityDigest")
    expect(JSON.stringify(preview)).not.toContain("legacy")
    expect(await snapshot()).toEqual(before)
    expect(
      (
        await getMyTripUpgradePreview({
          environment: environment(),
          identity: IDENTITY,
        })
      ).fingerprint
    ).toBe(preview.fingerprint)
    await registerSecondOwner()
    const other = await getMyTripUpgradePreview({
      environment: environment(),
      identity: SECOND_IDENTITY,
    })
    expect(other.groups).toEqual([])
    expect(other.counts.candidateTrips).toBe(0)
    expect(await snapshot()).toEqual(before)
  })
  it("cannot replay a deleted account operation against a newly registered account", async () => {
    const input = {
      confirmation: "DELETE MY ATLAS",
      expectedRevision: 1,
      idempotencyKey: "abababab-abab-4bab-8bab-abababababab",
    }
    await deleteMyAccount({
      environment: environment(),
      identity: IDENTITY,
      input,
      now: NOW,
    })
    const recreatedId = "usr_eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
    await registerOwner({
      userId: recreatedId,
      inviteCode: "new_account_invitation_1234567890",
      registrationKey: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    })
    const replay = await deleteMyAccount({
      environment: environment(),
      identity: IDENTITY,
      input,
      now: NOW,
    })
    expect(replay.idempotent).toBe(true)
    expect(
      (await getMyProfile({ environment: environment(), identity: IDENTITY }))
        .profile.userId
    ).toBe(recreatedId)
    await expect(
      deleteMyAccount({
        environment: environment(),
        identity: IDENTITY,
        input: { ...input, expectedRevision: 2 },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "idempotency_conflict" })
    await expect(
      deleteMyAccount({
        environment: environment(),
        identity: IDENTITY,
        input: {
          ...input,
          accountId: USER_ID,
          idempotencyKey: "babababa-baba-4aba-8aba-babababababa",
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "account_changed" })
    expect(
      (await getMyProfile({ environment: environment(), identity: IDENTITY }))
        .profile.status
    ).toBe("active")
  })
  it("renames and repositions an owned custom pin without replacing its identity or visit data", async () => {
    const created = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: pinInput({
        customPlace: {
          name: "Original custom stop",
          coordinates: [16.44, 43.51],
        },
        visitedYears: [2025],
        memory: "Keep this memory",
        expectedRevision: 1,
        idempotencyKey: "eeeeeeee-1111-4111-8111-111111111111",
      }),
      now: NOW,
    })
    const experience = await updateMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: created.pin.pinId,
        patch: {
          experienceChange: {
            action: "add",
            id: "exp_" + "e".repeat(32),
            title: "Keep this activity",
            operatorName: "",
            operatorWebsite: "",
          },
        },
        expectedRevision: 2,
        idempotencyKey: "eeeeeeee-2222-4222-8222-222222222222",
      },
      now: NOW,
    })
    const input = {
      pinId: created.pin.pinId,
      patch: {
        customPlace: {
          name: "Corrected custom stop",
          coordinates: [16.45, 43.52],
        },
      },
      expectedRevision: 3,
      idempotencyKey: "eeeeeeee-3333-4333-8333-333333333333",
    }
    const updated = await updateMyPin({
      environment: environment(),
      identity: IDENTITY,
      input,
      now: NOW,
    })
    expect(updated.pin).toMatchObject({
      pinId: created.pin.pinId,
      placeId: created.pin.placeId,
      customPlace: input.patch.customPlace,
      memory: created.pin.memory,
      visitedYears: created.pin.visitedYears,
      experiences: experience.pin.experiences,
    })
    const replay = await updateMyPin({
      environment: environment(),
      identity: IDENTITY,
      input,
      now: NOW,
    })
    expect(replay.idempotent).toBe(true)
    expect(replay.profile.revision).toBe(4)
    const exported = await exportMyAtlas({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(exported.pins).toHaveLength(1)
    expect(exported.pins[0].customPlace).toEqual(input.patch.customPlace)
    const reloaded = await getMyAtlasState({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(reloaded.pins[0]).toMatchObject({
      name: "Corrected custom stop",
      coordinates: [16.45, 43.52],
      pinId: created.pin.pinId,
      memory: created.pin.memory,
      experiences: experience.pin.experiences,
    })
    await expect(
      updateMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: {
          ...input,
          expectedRevision: 2,
          idempotencyKey: "eeeeeeee-4444-4444-8444-444444444444",
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "revision_conflict" })
    await registerSecondOwner()
    await expect(
      updateMyPin({
        environment: environment(),
        identity: SECOND_IDENTITY,
        input: {
          ...input,
          expectedRevision: 1,
          idempotencyKey: "eeeeeeee-5555-4555-8555-555555555555",
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "pin_not_found" })
    await deleteMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: created.pin.pinId,
        expectedRevision: 4,
        idempotencyKey: "eeeeeeee-6666-4666-8666-666666666666",
      },
      now: NOW,
    })
    expect(
      (await exportMyAtlas({ environment: environment(), identity: IDENTITY }))
        .pins
    ).toEqual([])
  })

  it("keeps private visit experiences independent, revisioned, exportable and removable", async () => {
    let sequence = 100,
      revision = 1
    const key = () =>
      `${String(++sequence).padStart(8, "0")}-1111-4111-8111-111111111111`
    const created = await createMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        customPlace: { name: "Private visit", coordinates: [16.44, 43.51] },
        visitedYears: [2026],
        memory: "Keep this memory",
        expectedRevision: revision,
        idempotencyKey: key(),
      },
      now: NOW,
    })
    revision = created.profile.revision
    const pinId = created.pin.pinId
    const first = {
      action: "add",
      id: "exp_" + "1".repeat(32),
      title: "Boat excursion",
      operatorName: "Private operator",
      operatorWebsite: "https://operator.example.com/",
    }
    const firstInput = {
      pinId,
      patch: { experienceChange: first },
      expectedRevision: revision,
      idempotencyKey: key(),
    }
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    const before = await runInDurableObject(
      user,
      (_instance, state) => state.storage.kv.get("profile").publicAtlasUpdatedAt
    )
    expect(before).toBe(NOW)
    const saved = await updateMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: firstInput,
      now: "2026-11-16T18:00:00.000Z",
    })
    revision = saved.profile.revision
    expect(saved.pin.experiences).toHaveLength(1)
    expect(saved.pin.memory).toBe("Keep this memory")
    expect(saved.pin.visitedYears).toEqual([2026])
    expect(
      await runInDurableObject(
        user,
        (_instance, state) =>
          state.storage.kv.get("profile").publicAtlasUpdatedAt
      )
    ).toBe(before)
    const replay = await updateMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: firstInput,
      now: NOW,
    })
    expect(replay.idempotent).toBe(true)
    expect(replay.profile.revision).toBe(revision)
    const change = async value => {
      const result = await updateMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: {
          pinId,
          patch: { experienceChange: value },
          expectedRevision: revision,
          idempotencyKey: key(),
        },
        now: NOW,
      })
      revision = result.profile.revision
      return result
    }
    await change({
      action: "add",
      id: "exp_" + "2".repeat(32),
      title: "Snorkeling",
    })
    await expect(
      updateMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: {
          pinId,
          patch: {
            experienceChange: {
              ...first,
              action: "edit",
              title: "Stale change",
            },
          },
          expectedRevision: 2,
          idempotencyKey: key(),
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "revision_conflict" })
    const edited = await change({
      ...first,
      action: "edit",
      title: "Private edited activity",
    })
    expect(edited.pin.experiences.map(e => e.title)).toEqual([
      "Private edited activity",
      "Snorkeling",
    ])
    const state = await getMyAtlasState({
      environment: environment(),
      identity: IDENTITY,
      placeCatalog: { resolveMany: async () => [] },
    })
    expect(state.pins[0].experiences).toHaveLength(2)
    const exported = await exportMyAtlas({
      environment: environment(),
      identity: IDENTITY,
    })
    expect(exported.pins[0].experiences[0].operatorWebsite).toBe(
      first.operatorWebsite
    )
    await registerSecondOwner()
    await expect(
      updateMyPin({
        environment: environment(),
        identity: SECOND_IDENTITY,
        input: {
          pinId,
          patch: { experienceChange: first },
          expectedRevision: 1,
          idempotencyKey: key(),
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "pin_not_found" })
    const published = await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { public: true, discoverable: true },
        expectedRevision: revision,
        idempotencyKey: key(),
      },
      now: NOW,
    })
    revision = published.profile.revision
    for (const result of [
      await user.getPublicAtlas(),
      await user.getPublicAtlasDiscovery(),
    ]) {
      expect(JSON.stringify(result)).not.toContain("experiences")
      expect(JSON.stringify(result)).not.toContain(first.operatorWebsite)
    }
    await change({ action: "remove", id: first.id })
    const remaining = (
      await getMyAtlasState({
        environment: environment(),
        identity: IDENTITY,
        placeCatalog: { resolveMany: async () => [] },
      })
    ).pins[0]
    expect(remaining.experiences.map(e => e.title)).toEqual(["Snorkeling"])
    expect(remaining.memory).toBe("Keep this memory")
    await runInDurableObject(user, (_instance, storageState) => {
      const cached = JSON.stringify([
        ...storageState.storage.kv.list({ prefix: "mutation:" }),
      ])
      expect(cached).not.toContain("Private operator")
      expect(cached).not.toContain("Snorkeling")
    })
    const deleted = await deleteMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: { pinId, expectedRevision: revision, idempotencyKey: key() },
      now: NOW,
    })
    revision = deleted.profile.revision
    expect(
      (await exportMyAtlas({ environment: environment(), identity: IDENTITY }))
        .pins
    ).toEqual([])
    await expect(
      updateMyPin({
        environment: environment(),
        identity: IDENTITY,
        input: firstInput,
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "pin_not_found" })
    await deleteMyAccount({
      environment: environment(),
      identity: IDENTITY,
      input: {
        confirmation: "DELETE MY ATLAS",
        expectedRevision: revision,
        idempotencyKey: key(),
      },
      now: NOW,
    })
    await runInDurableObject(user, (_instance, storageState) => {
      expect(JSON.stringify([...storageState.storage.kv.list()])).not.toContain(
        "Snorkeling"
      )
    })
  })

  it("previews all handles and wipes both user accounts through ordinary deletion", async () => {
    await registerSecondOwner()
    const preview = await wipeMyAtlasAccounts({
      environment: environment(),
      body: { apply: false },
    })
    expect(preview.handles.sort()).toEqual(["account-owner", "second-owner"])
    expect(
      (await getMyProfile({ environment: environment(), identity: IDENTITY }))
        .profile.status
    ).toBe("active")
    await expect(
      wipeMyAtlasAccounts({
        environment: environment(),
        body: { apply: true, confirmation: "wrong" },
      })
    ).rejects.toThrow()
    const body = {
      apply: true,
      confirmation: "WIPE ALL USER MY ATLAS ACCOUNTS",
    }
    expect(
      (await wipeMyAtlasAccounts({ environment: environment(), body })).deleted
    ).toBe(true)
    expect(
      (await wipeMyAtlasAccounts({ environment: environment(), body })).deleted
    ).toBe(true)
    expect(
      await wipeMyAtlasAccounts({ environment: environment(), body })
    ).toEqual({ complete: true, deleted: false })
    await expect(
      getMyProfile({ environment: environment(), identity: IDENTITY })
    ).rejects.toMatchObject({ code: "registration_not_found" })
    await expect(
      getMyProfile({ environment: environment(), identity: SECOND_IDENTITY })
    ).rejects.toMatchObject({ code: "registration_not_found" })
  })

  it("stores one private Atlas image, replaces it atomically, and removes it", async () => {
    let imageSequence = 0
    const imageTransformer = async () => {
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
        location: "Banff, Canada",
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
        location: "San Juan, Puerto Rico",
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

  it("requires photo locations and lets legacy owners add one without reuploading", async () => {
    let transforms = 0
    const upload = {
      bytes: new Uint8Array([1]).buffer,
      contentType: "image/jpeg",
    }
    const imageTransformer = async () => {
      transforms++
      return {
        bytes: new Uint8Array([82, 73, 70, 70, 1]).buffer,
        contentType: "image/webp",
        width: 1200,
        height: 1200,
        byteLength: 5,
        sourceSha256: "1".repeat(64),
      }
    }
    const input = {
      expectedRevision: 1,
      idempotencyKey: "10101010-1010-4010-8010-101010101010",
    }
    await expect(
      replaceMyAtlasImage({
        environment: environment(),
        identity: IDENTITY,
        input,
        upload,
        imageTransformer,
        now: NOW,
      })
    ).rejects.toMatchObject({
      code: "atlas_image_location_required",
    })
    expect(transforms).toBe(0)
    const saved = await replaceMyAtlasImage({
      environment: environment(),
      identity: IDENTITY,
      input: { ...input, location: "Banff, Canada" },
      upload,
      imageTransformer,
      now: NOW,
    })
    const user = env.MY_ATLAS_USERS.getByName(USER_ID)
    await runInDurableObject(user, (_instance, state) => {
      const image = state.storage.kv.get("atlas-image")
      delete image.location
      state.storage.kv.put("atlas-image", image)
    })
    expect(
      (
        await getMyAtlasImage({
          environment: environment(),
          identity: IDENTITY,
        })
      ).atlasImage.location
    ).toBeUndefined()
    await expect(
      updateMyAtlasImageVisibility({
        environment: environment(),
        identity: IDENTITY,
        input: {
          expectedRevision: 2,
          publicProfile: true,
          idempotencyKey: "20202020-2020-4020-8020-202020202020",
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "atlas_image_location_required" })
    const updated = await updateMyAtlasImageVisibility({
      environment: environment(),
      identity: IDENTITY,
      input: {
        expectedRevision: 2,
        location: "Montréal, Canada",
        idempotencyKey: "30303030-3030-4030-8030-303030303030",
      },
      now: NOW,
    })
    expect(updated.atlasImage).toMatchObject({
      imageId: saved.atlasImage.imageId,
      publicProfile: false,
      location: "Montréal, Canada",
    })
    expect(updated.profile.revision).toBe(3)
    expect(transforms).toBe(1)
  })

  it("purges the private Atlas image before final account deletion", async () => {
    const key = `private/atlas/${USER_ID}/image_33333333333333333333333333333333.webp`
    await replaceMyAtlasImage({
      environment: environment(),
      identity: IDENTITY,
      input: {
        expectedRevision: 1,
        idempotencyKey: "04040404-0404-4404-8404-040404040404",
        location: "Banff, Canada",
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

    const discoverable = await updateMyProfile({
      environment: environment(),
      identity: IDENTITY,
      input: {
        patch: { discoverable: true },
        expectedRevision: 5,
        idempotencyKey: "91919191-9191-4191-8191-919191919191",
      },
      now: NOW,
    })
    expect(discoverable.profile).toMatchObject({
      public: true,
      discoverable: true,
      revision: 6,
    })

    const afterFirstDelete = await deleteMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: first.pin.pinId,
        expectedRevision: 6,
        idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
      },
      now: NOW,
    })
    expect(afterFirstDelete.profile).toMatchObject({
      public: true,
      discoverable: true,
      pinCount: 1,
      revision: 7,
    })
    const empty = await deleteMyPin({
      environment: environment(),
      identity: IDENTITY,
      input: {
        pinId: second.pin.pinId,
        expectedRevision: 7,
        idempotencyKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc",
      },
      now: NOW,
    })
    expect(empty.profile).toMatchObject({
      public: false,
      discoverable: false,
      pinCount: 0,
      revision: 8,
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
