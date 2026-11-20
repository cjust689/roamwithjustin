import { env } from "cloudflare:workers"
import { evictDurableObject, reset, runInDurableObject } from "cloudflare:test"
import { beforeEach, describe, expect, it } from "vitest"
import { normalizeRegistrationInput } from "../src/registration/contracts.mjs"
import {
  hashInviteCode,
  hashQualifiedIdentity,
  hashRegistrationOperation,
  hashRegistrationRequest,
  sha256,
} from "../src/registration/hashing.mjs"
import {
  REGISTRY_OBJECT_NAME,
  registerBetaAccount,
} from "../src/registration/service.mjs"
import {
  issueBetaInvitation,
  reconcilePendingRegistration,
  revokeBetaInvitation,
} from "../src/registration/operator.mjs"

const NOW = "2026-11-16T16:30:00.000Z"
const EXPIRES = "2026-11-17T16:30:00.000Z"
const TERMS_VERSION = "test-terms-1"
const PRIVACY_VERSION = "test-privacy-1"
const PEPPER = "test-only-invite-pepper-with-at-least-32-characters"
const OPERATOR_IDENTITY = {
  issuer: "https://roamwithjustin.us.auth0.com/",
  subject: "google-oauth2|test-operator",
}

function operatorEnvironment() {
  return {
    ...env,
    INVITE_HASH_PEPPER: PEPPER,
    INVITE_GENERATION_SECRET:
      "test-only-generation-secret-with-at-least-32-characters",
    BETA_INVITE_USE_CEILING: "5",
    BETA_INVITE_MAX_TTL_SECONDS: "172800",
    REGISTRATION_PENDING_LEASE_SECONDS: "300",
  }
}

function registry() {
  return env.MY_ATLAS_REGISTRY.getByName(REGISTRY_OBJECT_NAME)
}

async function reservationCommand(index, inviteDigest) {
  const identity = {
    issuer: "https://roamwithjustin.us.auth0.com/",
    subject: `google-oauth2|test-${index}`,
  }
  const identityDigest = await hashQualifiedIdentity(identity)
  const operationDigest = await hashRegistrationOperation(
    identityDigest,
    `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`
  )
  const command = {
    identity,
    identityDigest,
    inviteDigest,
    operationDigest,
    userId: `usr_00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    handle: `traveler-${index}`,
    displayName: `Traveler ${index}`,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    now: NOW,
  }
  command.requestDigest = await hashRegistrationRequest(command)
  return command
}

beforeEach(async () => {
  await reset()
})

describe("registration registry Durable Object", () => {
  it("reserves a one-use invitation for only one concurrent identity", async () => {
    const inviteDigest = await sha256("concurrent-invitation")
    expect(
      await registry().issueInvitation({
        digest: inviteDigest,
        maxUses: 1,
        createdAt: NOW,
        expiresAt: EXPIRES,
      })
    ).toMatchObject({ ok: true, idempotent: false })

    const commands = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        reservationCommand(index + 1, inviteDigest)
      )
    )
    const results = await Promise.all(
      commands.map(command => registry().reserveRegistration(command))
    )
    const accepted = results
      .map((result, index) => ({ result, command: commands[index] }))
      .filter(entry => entry.result.ok)

    expect(accepted).toHaveLength(1)
    expect(
      results.filter(result => result.error === "invitation_unavailable")
    ).toHaveLength(11)

    const winner = accepted[0]
    expect(await registry().reserveRegistration(winner.command)).toMatchObject({
      ok: true,
      state: "pending",
      idempotent: true,
      userId: winner.command.userId,
    })

    const conflict = {
      ...winner.command,
      requestDigest: await sha256("changed-request"),
    }
    expect(await registry().reserveRegistration(conflict)).toMatchObject({
      ok: false,
      error: "idempotency_conflict",
    })

    expect(
      await registry().finalizeRegistration({
        operationDigest: winner.command.operationDigest,
        identityDigest: winner.command.identityDigest,
        userId: winner.command.userId,
        now: NOW,
      })
    ).toMatchObject({ ok: true, state: "active" })
    expect(await registry().getInvitationStatus(inviteDigest)).toMatchObject({
      ok: true,
      used: 1,
      reserved: 0,
    })
  })

  it("issues a recoverably idempotent operator invitation and revokes by safe ID", async () => {
    const input = {
      maxUses: 2,
      expiresAt: EXPIRES,
      idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    }
    const first = await issueBetaInvitation({
      environment: operatorEnvironment(),
      identity: OPERATOR_IDENTITY,
      input,
      now: NOW,
    })
    const retried = await issueBetaInvitation({
      environment: operatorEnvironment(),
      identity: OPERATOR_IDENTITY,
      input,
      now: NOW,
    })

    expect(first.created).toBe(true)
    expect(retried.created).toBe(false)
    expect(retried.invitation).toEqual(first.invitation)
    expect(first.invitation.id).toMatch(/^inv_[a-f0-9]{24}$/)
    expect(first.invitation.code).toMatch(/^beta_[A-Za-z0-9_-]{40,}$/)

    const serializedStorage = await runInDurableObject(
      registry(),
      (_instance, state) => JSON.stringify(Array.from(state.storage.kv.list()))
    )
    expect(serializedStorage).not.toContain(first.invitation.code)

    const revoked = await revokeBetaInvitation({
      environment: operatorEnvironment(),
      identity: OPERATOR_IDENTITY,
      input: {
        invitationId: first.invitation.id,
        idempotencyKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
      now: NOW,
    })
    expect(revoked).toMatchObject({
      revoked: true,
      idempotent: false,
      invitation: { id: first.invitation.id, status: "revoked" },
    })
  })

  it("keeps invitation digests instead of raw invitation codes", async () => {
    const rawInvite = "raw-secret-invite-code-123456789"
    const digest = await hashInviteCode(rawInvite, PEPPER)
    await registry().issueInvitation({
      digest,
      maxUses: 1,
      createdAt: NOW,
      expiresAt: EXPIRES,
    })

    const serializedStorage = await runInDurableObject(
      registry(),
      (_instance, state) => JSON.stringify(Array.from(state.storage.kv.list()))
    )
    expect(serializedStorage).toContain(digest)
    expect(serializedStorage).not.toContain(rawInvite)
  })

  it("enforces identity and normalized-handle uniqueness", async () => {
    const inviteDigests = await Promise.all([
      sha256("uniqueness-invite-1"),
      sha256("uniqueness-invite-2"),
      sha256("uniqueness-invite-3"),
    ])
    for (const digest of inviteDigests) {
      await registry().issueInvitation({
        digest,
        maxUses: 1,
        createdAt: NOW,
        expiresAt: EXPIRES,
      })
    }

    const first = await reservationCommand(20, inviteDigests[0])
    expect(await registry().reserveRegistration(first)).toMatchObject({
      ok: true,
      state: "pending",
    })

    const sameHandle = await reservationCommand(21, inviteDigests[1])
    sameHandle.handle = first.handle
    sameHandle.requestDigest = await hashRegistrationRequest(sameHandle)
    expect(await registry().reserveRegistration(sameHandle)).toEqual({
      ok: false,
      error: "handle_unavailable",
    })

    const sameIdentity = await reservationCommand(20, inviteDigests[2])
    sameIdentity.handle = "another-handle"
    sameIdentity.operationDigest = await sha256("another-operation")
    sameIdentity.requestDigest = await hashRegistrationRequest(sameIdentity)
    expect(await registry().reserveRegistration(sameIdentity)).toEqual({
      ok: false,
      error: "identity_unavailable",
    })
  })

  it("paginates the protected pending-registration index", async () => {
    const commands = []
    for (let index = 70; index < 73; index += 1) {
      const inviteDigest = await sha256(`pending-page-invitation-${index}`)
      await registry().issueInvitation({
        digest: inviteDigest,
        maxUses: 1,
        createdAt: NOW,
        expiresAt: EXPIRES,
      })
      const command = await reservationCommand(index, inviteDigest)
      commands.push(command)
      await registry().reserveRegistration(command)
    }

    const firstPage = await registry().listPendingRegistrations({
      limit: 2,
      cursor: "",
    })
    expect(firstPage).toMatchObject({
      ok: true,
      registrations: [
        { userId: commands[0].userId },
        { userId: commands[1].userId },
      ],
      nextCursor: commands[1].userId,
    })
    expect(
      await registry().listPendingRegistrations({
        limit: 2,
        cursor: firstPage.nextCursor,
      })
    ).toMatchObject({
      ok: true,
      registrations: [{ userId: commands[2].userId }],
      nextCursor: null,
    })
  })
})

describe("private profile provisioning saga", () => {
  it("initializes once, finalizes once, and survives Durable Object eviction", async () => {
    const inviteCode = "test_invitation_code_1234567890"
    const inviteDigest = await hashInviteCode(inviteCode, PEPPER)
    expect(
      await registry().issueInvitation({
        digest: inviteDigest,
        maxUses: 1,
        createdAt: NOW,
        expiresAt: EXPIRES,
      })
    ).toMatchObject({ ok: true })

    const input = normalizeRegistrationInput(
      {
        inviteCode,
        handle: "justin-travels",
        displayName: "Justin Traveler",
        turnstileToken: "test-turnstile-token",
        acceptTerms: true,
        acceptPrivacy: true,
      },
      "11111111-1111-4111-8111-111111111111"
    )
    const identity = {
      issuer: "https://roamwithjustin.us.auth0.com/",
      subject: "google-oauth2|phase-2b-owner",
    }
    const environment = {
      ...env,
      BETA_TERMS_VERSION: TERMS_VERSION,
      BETA_PRIVACY_VERSION: PRIVACY_VERSION,
      INVITE_HASH_PEPPER: PEPPER,
      TURNSTILE_SECRET_KEY: "test-only-turnstile-secret",
      TURNSTILE_ACTION: "my-atlas-register",
      TURNSTILE_HOSTNAMES: "localhost",
    }
    const turnstileVerifier = async options => {
      expect(options.token).toBe("test-turnstile-token")
      expect(options.secret).toBe("test-only-turnstile-secret")
      expect(options.expectedAction).toBe("my-atlas-register")
      return true
    }
    const userId = "usr_22222222-2222-4222-8222-222222222222"

    const created = await registerBetaAccount({
      environment,
      identity,
      input,
      now: NOW,
      turnstileVerifier,
      userIdFactory: () => userId,
    })
    expect(created.created).toBe(true)
    expect(created.profile).toMatchObject({
      userId,
      handle: "justin-travels",
      displayName: "Justin Traveler",
      public: false,
      discoverable: false,
      pinCount: 0,
      wishCount: 0,
      planCount: 0,
      status: "active",
      revision: 1,
      acceptedTermsVersion: TERMS_VERSION,
      acceptedPrivacyVersion: PRIVACY_VERSION,
    })
    expect(created.profile).not.toHaveProperty("identityDigest")
    expect(created.profile).not.toHaveProperty("identities")

    const retried = await registerBetaAccount({
      environment,
      identity,
      input,
      now: NOW,
      turnstileVerifier,
      userIdFactory: () => "usr_33333333-3333-4333-8333-333333333333",
    })
    expect(retried.created).toBe(false)
    expect(retried.profile.userId).toBe(userId)

    const identityDigest = await hashQualifiedIdentity(identity)
    const user = env.MY_ATLAS_USERS.getByName(userId)
    await evictDurableObject(user)
    expect(await user.getOwnerProfile(identityDigest)).toMatchObject({
      ok: true,
      profile: { userId, public: false, revision: 1 },
    })
    expect(await registry().getInvitationStatus(inviteDigest)).toMatchObject({
      used: 1,
      reserved: 0,
    })
  })

  it("does not reveal a profile to another qualified identity", async () => {
    const userId = "usr_44444444-4444-4444-8444-444444444444"
    const ownerDigest = await sha256("owner")
    const otherDigest = await sha256("other")
    const user = env.MY_ATLAS_USERS.getByName(userId)

    expect(
      await user.initializeProfile({
        userId,
        identity: {
          issuer: "https://roamwithjustin.us.auth0.com/",
          subject: "google-oauth2|owner",
        },
        identityDigest: ownerDigest,
        handle: "private-owner",
        displayName: "Private Owner",
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        now: NOW,
      })
    ).toMatchObject({ ok: true, profile: { public: false } })
    expect(await user.getOwnerProfile(otherDigest)).toEqual({
      ok: false,
      error: "forbidden",
    })
  })

  it("lists pending registrations and completes an initialized profile", async () => {
    const inviteDigest = await sha256("operator-complete-invitation")
    await registry().issueInvitation({
      digest: inviteDigest,
      maxUses: 1,
      createdAt: NOW,
      expiresAt: EXPIRES,
    })
    const command = await reservationCommand(50, inviteDigest)
    expect(await registry().reserveRegistration(command)).toMatchObject({
      ok: true,
      state: "pending",
    })
    expect(
      await registry().listPendingRegistrations({ limit: 25, cursor: "" })
    ).toMatchObject({
      ok: true,
      registrations: [{ userId: command.userId, handle: command.handle }],
      nextCursor: null,
    })

    const user = env.MY_ATLAS_USERS.getByName(command.userId)
    expect(
      await user.initializeProfile({
        userId: command.userId,
        identity: command.identity,
        identityDigest: command.identityDigest,
        handle: command.handle,
        displayName: command.displayName,
        termsVersion: command.termsVersion,
        privacyVersion: command.privacyVersion,
        now: NOW,
      })
    ).toMatchObject({ ok: true })

    await expect(
      reconcilePendingRegistration({
        environment: operatorEnvironment(),
        identity: OPERATOR_IDENTITY,
        input: {
          userId: command.userId,
          mode: "release",
          idempotencyKey: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        },
        now: "2026-11-16T16:40:00.000Z",
      })
    ).rejects.toMatchObject({ code: "profile_already_initialized" })

    expect(
      await reconcilePendingRegistration({
        environment: operatorEnvironment(),
        identity: OPERATOR_IDENTITY,
        input: {
          userId: command.userId,
          mode: "complete",
          idempotencyKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        },
        now: "2026-11-16T16:40:00.000Z",
      })
    ).toMatchObject({ state: "active" })
    expect(
      await registry().listPendingRegistrations({ limit: 25, cursor: "" })
    ).toMatchObject({ registrations: [] })
  })

  it("releases only an aged uninitialized registration and blocks ghost activation", async () => {
    const inviteDigest = await sha256("operator-release-invitation")
    await registry().issueInvitation({
      digest: inviteDigest,
      maxUses: 1,
      createdAt: NOW,
      expiresAt: EXPIRES,
    })
    const command = await reservationCommand(60, inviteDigest)
    expect(await registry().reserveRegistration(command)).toMatchObject({
      ok: true,
      state: "pending",
    })

    await expect(
      reconcilePendingRegistration({
        environment: operatorEnvironment(),
        identity: OPERATOR_IDENTITY,
        input: {
          userId: command.userId,
          mode: "release",
          idempotencyKey: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
        now: NOW,
      })
    ).rejects.toMatchObject({ code: "registration_lease_active" })

    const releaseTime = "2026-11-16T16:40:00.000Z"
    expect(
      await reconcilePendingRegistration({
        environment: operatorEnvironment(),
        identity: OPERATOR_IDENTITY,
        input: {
          userId: command.userId,
          mode: "release",
          idempotencyKey: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        },
        now: releaseTime,
      })
    ).toMatchObject({ state: "abandoned", idempotent: false })
    expect(await registry().getInvitationStatus(inviteDigest)).toMatchObject({
      used: 0,
      reserved: 0,
    })

    const user = env.MY_ATLAS_USERS.getByName(command.userId)
    expect(
      await user.initializeProfile({
        userId: command.userId,
        identity: command.identity,
        identityDigest: command.identityDigest,
        handle: command.handle,
        displayName: command.displayName,
        termsVersion: command.termsVersion,
        privacyVersion: command.privacyVersion,
        now: releaseTime,
      })
    ).toEqual({ ok: false, error: "profile_provisioning_abandoned" })

    const replacement = await reservationCommand(61, inviteDigest)
    expect(await registry().reserveRegistration(replacement)).toMatchObject({
      ok: true,
      state: "pending",
    })
  })
})
