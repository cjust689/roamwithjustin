import { DurableObject } from "cloudflare:workers"
import {
  TRIP_MARKER,
  TRIP_BACKUP,
  storedTrips,
  tripPins,
  mutateTripStore,
} from "../trips/store.mjs"
import { normalizeImageLocation } from "../../../../shared/my-atlas-image-location.mjs"
import {
  normalizeInstagramHandle,
  publicInstagramHandle,
} from "../../../../shared/my-atlas-instagram.mjs"
import { isNormalizedPinMemory } from "../account/memory.mjs"
import {
  applyExperienceChange,
  normalizeExperienceChange,
} from "../../../../shared/my-atlas-experiences.mjs"
import {
  CUSTOM_PLACE_ID_PATTERN,
  isNormalizedCustomPlace,
} from "../account/custom-place.mjs"
import {
  deletionDeadline,
  nextRetentionAlarm,
  retentionDeadline,
} from "../planning/retention.mjs"
import { MAX_PLAN_DESTINATIONS } from "../planning/constants.mjs"

const DIGEST_PATTERN = /^[a-f0-9]{64}$/
const USER_ID_PATTERN = /^usr_[0-9a-f-]{36}$/
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/
const INVITATION_ID_PATTERN = /^inv_[a-f0-9]{24}$/
const PIN_ID_PATTERN = /^pin_[a-f0-9]{24}$/
const WISH_ID_PATTERN = /^wish_[a-f0-9]{24}$/
const PLAN_ID_PATTERN = /^plan_[a-f0-9]{24}$/
const ATLAS_IMAGE_ID_PATTERN = /^image_[a-f0-9]{32}$/
const PLACE_ID_PATTERN =
  /^(?:iso-country:[A-Z]{2}|geonames:[1-9][0-9]{0,11}|park:(?:us:nps|ca:pca|mx:conanp):[a-z0-9-]+|custom:[a-f0-9]{24})$/

function validIsoDate(value) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  )
}

function failure(error) {
  return Object.freeze({ ok: false, error })
}

function registrationResult(registration, idempotent = false) {
  return Object.freeze({
    ok: true,
    state: registration.state,
    idempotent,
    userId: registration.userId,
    handle: registration.handle,
  })
}

function invitationKey(digest) {
  return `invitation:${digest}`
}

function invitationIdKey(invitationId) {
  return `invitation-id:${invitationId}`
}

function invitationOperationKey(digest) {
  return `invitation-operation:${digest}`
}

function invitationRevokeOperationKey(digest) {
  return `invitation-revoke-operation:${digest}`
}

function identityKey(digest) {
  return `identity:${digest}`
}

function handleKey(handle) {
  return `handle:${handle}`
}

function operationKey(digest) {
  return `operation:${digest}`
}

function registrationKey(userId) {
  return `registration:${userId}`
}

function pendingRegistrationKey(userId) {
  return `pending-registration:${userId}`
}

function mutationKey(digest) {
  return `mutation:${digest}`
}

function pinKey(pinId) {
  return `pin:${pinId}`
}

function pinPlaceKey(placeId) {
  return `pin-place:${placeId}`
}

function wishKey(wishId) {
  return `wish:${wishId}`
}

function wishPlaceKey(placeId) {
  return `wish-place:${placeId}`
}

function planKey(planId) {
  return `plan:${planId}`
}

const ATLAS_IMAGE_KEY = "atlas-image"

function deletionOperationKey(digest) {
  return `deletion-operation:${digest}`
}

function invitationSnapshot(invitation) {
  return Object.freeze({
    id: invitation.invitationId,
    status: invitation.status,
    maxUses: invitation.maxUses,
    used: invitation.used,
    reserved: invitation.reserved,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
  })
}

function invitationResult(invitation, idempotent = false) {
  return Object.freeze({
    ok: true,
    idempotent,
    invitationId: invitation.invitationId,
    status: invitation.status,
    maxUses: invitation.maxUses,
    used: invitation.used,
    reserved: invitation.reserved,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
  })
}

function validReservation(command) {
  return (
    command &&
    typeof command === "object" &&
    DIGEST_PATTERN.test(command.inviteDigest) &&
    DIGEST_PATTERN.test(command.identityDigest) &&
    DIGEST_PATTERN.test(command.operationDigest) &&
    DIGEST_PATTERN.test(command.requestDigest) &&
    USER_ID_PATTERN.test(command.userId) &&
    HANDLE_PATTERN.test(command.handle) &&
    typeof command.displayName === "string" &&
    command.displayName.length >= 2 &&
    command.displayName.length <= 50 &&
    typeof command.identity?.issuer === "string" &&
    typeof command.identity?.subject === "string" &&
    typeof command.termsVersion === "string" &&
    typeof command.privacyVersion === "string" &&
    validIsoDate(command.now)
  )
}

export class RegistrationRegistryDurableObject extends DurableObject {
  issueInvitation(command) {
    const invitationId =
      command?.invitationId ||
      (DIGEST_PATTERN.test(command?.digest)
        ? `inv_${command.digest.slice(0, 24)}`
        : "")
    if (
      !command ||
      !INVITATION_ID_PATTERN.test(invitationId) ||
      !DIGEST_PATTERN.test(command.digest) ||
      !Number.isInteger(command.maxUses) ||
      command.maxUses < 1 ||
      command.maxUses > 1000 ||
      !validIsoDate(command.createdAt) ||
      !validIsoDate(command.expiresAt) ||
      Date.parse(command.expiresAt) <= Date.parse(command.createdAt)
    ) {
      return failure("invalid_invitation_definition")
    }

    return this.ctx.storage.transactionSync(() => {
      const key = invitationKey(command.digest)
      const existing = this.ctx.storage.kv.get(key)

      if (existing) {
        const sameDefinition =
          existing.invitationId === invitationId &&
          existing.maxUses === command.maxUses &&
          existing.expiresAt === command.expiresAt
        return sameDefinition
          ? invitationResult(existing, true)
          : failure("invitation_already_exists")
      }

      const existingId = this.ctx.storage.kv.get(invitationIdKey(invitationId))
      if (existingId && existingId.digest !== command.digest) {
        return failure("invitation_id_collision")
      }
      if (command.operationDigest) {
        if (
          !DIGEST_PATTERN.test(command.operationDigest) ||
          !DIGEST_PATTERN.test(command.operatorIdentityDigest)
        ) {
          return failure("invalid_invitation_definition")
        }
        const operation = this.ctx.storage.kv.get(
          invitationOperationKey(command.operationDigest)
        )
        if (operation && operation.digest !== command.digest) {
          return failure("invitation_operation_conflict")
        }
      }

      const invitation = {
        schemaVersion: 1,
        invitationId,
        status: "active",
        maxUses: command.maxUses,
        used: 0,
        reserved: 0,
        createdAt: command.createdAt,
        expiresAt: command.expiresAt,
        createdByDigest: command.operatorIdentityDigest || undefined,
        issueOperationDigest: command.operationDigest || undefined,
      }
      this.ctx.storage.kv.put(key, invitation)
      this.ctx.storage.kv.put(invitationIdKey(invitationId), {
        digest: command.digest,
      })
      if (command.operationDigest) {
        this.ctx.storage.kv.put(
          invitationOperationKey(command.operationDigest),
          { digest: command.digest, invitationId }
        )
      }
      return invitationResult(invitation)
    })
  }

  revokeInvitation(digest, revokedAt) {
    if (!DIGEST_PATTERN.test(digest) || !validIsoDate(revokedAt)) {
      return failure("invalid_invitation_definition")
    }

    return this.ctx.storage.transactionSync(() => {
      const key = invitationKey(digest)
      const invitation = this.ctx.storage.kv.get(key)
      if (!invitation) return failure("invitation_not_found")
      if (invitation.status === "revoked") {
        return Object.freeze({ ok: true, idempotent: true })
      }

      this.ctx.storage.kv.put(key, {
        ...invitation,
        status: "revoked",
        revokedAt,
      })
      return Object.freeze({ ok: true, idempotent: false })
    })
  }

  revokeInvitationById(command) {
    if (
      !command ||
      !INVITATION_ID_PATTERN.test(command.invitationId) ||
      !validIsoDate(command.revokedAt) ||
      !DIGEST_PATTERN.test(command.operationDigest) ||
      !DIGEST_PATTERN.test(command.operatorIdentityDigest)
    ) {
      return failure("invalid_invitation_definition")
    }

    return this.ctx.storage.transactionSync(() => {
      const operationKey = invitationRevokeOperationKey(command.operationDigest)
      const existingOperation = this.ctx.storage.kv.get(operationKey)
      if (
        existingOperation &&
        existingOperation.invitationId !== command.invitationId
      ) {
        return failure("invitation_operation_conflict")
      }
      const idRecord = this.ctx.storage.kv.get(
        invitationIdKey(command.invitationId)
      )
      if (!idRecord) return failure("invitation_not_found")
      const key = invitationKey(idRecord.digest)
      const invitation = this.ctx.storage.kv.get(key)
      if (!invitation) return failure("invitation_inconsistent")
      if (invitation.status === "revoked") {
        return Object.freeze({
          ok: true,
          idempotent: true,
          invitation: invitationSnapshot(invitation),
        })
      }

      const revoked = {
        ...invitation,
        status: "revoked",
        revokedAt: command.revokedAt,
        revokedByDigest: command.operatorIdentityDigest,
        revokeOperationDigest: command.operationDigest,
      }
      this.ctx.storage.kv.put(key, revoked)
      this.ctx.storage.kv.put(operationKey, {
        invitationId: command.invitationId,
      })
      return Object.freeze({
        ok: true,
        idempotent: false,
        invitation: invitationSnapshot(revoked),
      })
    })
  }

  reserveRegistration(command) {
    if (!validReservation(command)) return failure("invalid_registration")

    return this.ctx.storage.transactionSync(() => {
      const operationStorageKey = operationKey(command.operationDigest)
      const existingOperation = this.ctx.storage.kv.get(operationStorageKey)

      if (existingOperation) {
        if (existingOperation.requestDigest !== command.requestDigest) {
          return failure("idempotency_conflict")
        }
        if (existingOperation.state === "abandoned") {
          return failure("registration_abandoned")
        }
        const registration = this.ctx.storage.kv.get(
          registrationKey(existingOperation.userId)
        )
        return registration
          ? registrationResult(registration, true)
          : failure("registration_inconsistent")
      }

      const existingIdentity = this.ctx.storage.kv.get(
        identityKey(command.identityDigest)
      )
      if (existingIdentity) {
        if (existingIdentity.state === "active") {
          const registration = this.ctx.storage.kv.get(
            registrationKey(existingIdentity.userId)
          )
          return registration
            ? registrationResult(registration, true)
            : failure("registration_inconsistent")
        }
        return failure("identity_unavailable")
      }

      if (this.ctx.storage.kv.get(handleKey(command.handle))) {
        return failure("handle_unavailable")
      }
      if (this.ctx.storage.kv.get(registrationKey(command.userId))) {
        return failure("user_id_collision")
      }

      const inviteStorageKey = invitationKey(command.inviteDigest)
      const invitation = this.ctx.storage.kv.get(inviteStorageKey)
      if (
        !invitation ||
        invitation.status !== "active" ||
        Date.parse(invitation.expiresAt) <= Date.parse(command.now) ||
        invitation.used + invitation.reserved >= invitation.maxUses
      ) {
        return failure("invitation_unavailable")
      }

      const registration = {
        schemaVersion: 1,
        state: "pending",
        userId: command.userId,
        identity: command.identity,
        identityDigest: command.identityDigest,
        inviteDigest: command.inviteDigest,
        operationDigest: command.operationDigest,
        requestDigest: command.requestDigest,
        handle: command.handle,
        displayName: command.displayName,
        termsVersion: command.termsVersion,
        privacyVersion: command.privacyVersion,
        createdAt: command.now,
        updatedAt: command.now,
      }

      this.ctx.storage.kv.put(inviteStorageKey, {
        ...invitation,
        reserved: invitation.reserved + 1,
      })
      this.ctx.storage.kv.put(registrationKey(command.userId), registration)
      this.ctx.storage.kv.put(pendingRegistrationKey(command.userId), {
        userId: command.userId,
        handle: command.handle,
        displayName: command.displayName,
        createdAt: command.now,
        updatedAt: command.now,
      })
      this.ctx.storage.kv.put(identityKey(command.identityDigest), {
        state: "pending",
        userId: command.userId,
        operationDigest: command.operationDigest,
      })
      this.ctx.storage.kv.put(handleKey(command.handle), {
        state: "pending",
        userId: command.userId,
        operationDigest: command.operationDigest,
      })
      this.ctx.storage.kv.put(operationStorageKey, {
        state: "pending",
        userId: command.userId,
        requestDigest: command.requestDigest,
      })

      return registrationResult(registration)
    })
  }

  finalizeRegistration(command) {
    if (
      !command ||
      !DIGEST_PATTERN.test(command.operationDigest) ||
      !DIGEST_PATTERN.test(command.identityDigest) ||
      !USER_ID_PATTERN.test(command.userId) ||
      !validIsoDate(command.now)
    ) {
      return failure("invalid_registration")
    }

    return this.ctx.storage.transactionSync(() => {
      const operationStorageKey = operationKey(command.operationDigest)
      const operation = this.ctx.storage.kv.get(operationStorageKey)
      if (!operation || operation.userId !== command.userId) {
        return failure("registration_not_found")
      }

      const key = registrationKey(command.userId)
      const registration = this.ctx.storage.kv.get(key)
      if (
        !registration ||
        registration.identityDigest !== command.identityDigest ||
        registration.operationDigest !== command.operationDigest
      ) {
        return failure("registration_inconsistent")
      }
      if (registration.state === "active") {
        return registrationResult(registration, true)
      }

      const inviteStorageKey = invitationKey(registration.inviteDigest)
      const invitation = this.ctx.storage.kv.get(inviteStorageKey)
      if (!invitation || invitation.reserved < 1) {
        return failure("registration_inconsistent")
      }

      const activeRegistration = {
        ...registration,
        state: "active",
        activatedAt: command.now,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put(key, activeRegistration)
      this.ctx.storage.kv.put(inviteStorageKey, {
        ...invitation,
        reserved: invitation.reserved - 1,
        used: invitation.used + 1,
      })
      this.ctx.storage.kv.put(identityKey(command.identityDigest), {
        state: "active",
        userId: command.userId,
      })
      this.ctx.storage.kv.put(handleKey(registration.handle), {
        state: "active",
        userId: command.userId,
      })
      this.ctx.storage.kv.put(operationStorageKey, {
        ...operation,
        state: "active",
      })
      this.ctx.storage.kv.delete(pendingRegistrationKey(command.userId))

      return registrationResult(activeRegistration)
    })
  }

  listPendingRegistrations(command) {
    if (
      !command ||
      !Number.isInteger(command.limit) ||
      command.limit < 1 ||
      command.limit > 100 ||
      (command.cursor && !USER_ID_PATTERN.test(command.cursor))
    ) {
      return failure("invalid_pending_query")
    }

    const options = {
      prefix: "pending-registration:",
      limit: command.limit + 1,
    }
    if (command.cursor) {
      options.startAfter = pendingRegistrationKey(command.cursor)
    }
    const entries = Array.from(
      this.ctx.storage.kv.list(options),
      ([, value]) => value
    )
    const truncated = entries.length > command.limit
    const registrations = entries.slice(0, command.limit)
    return Object.freeze({
      ok: true,
      registrations,
      nextCursor: truncated
        ? registrations[registrations.length - 1].userId
        : null,
    })
  }

  listActiveRegistrations(command) {
    if (
      !command ||
      !Number.isInteger(command.limit) ||
      command.limit < 1 ||
      command.limit > 100 ||
      (command.cursor && !USER_ID_PATTERN.test(command.cursor))
    ) {
      return failure("invalid_active_registration_query")
    }

    const options = {
      prefix: "registration:",
      limit: command.limit + 1,
    }
    if (command.cursor) {
      options.startAfter = registrationKey(command.cursor)
    }
    const registrations = Array.from(
      this.ctx.storage.kv.list(options),
      ([, value]) => value
    )
    const truncated = registrations.length > command.limit
    const scanned = registrations.slice(0, command.limit)
    const page = scanned.filter(registration => registration.state === "active")
    return Object.freeze({
      ok: true,
      registrations: Object.freeze(
        page.map(registration =>
          Object.freeze({
            userId: registration.userId,
            handle: registration.handle,
          })
        )
      ),
      nextCursor: truncated ? scanned[scanned.length - 1].userId : null,
    })
  }

  getGlobalWipeBatch() {
    const tasks = Array.from(
      this.ctx.storage.kv.list({ prefix: "global-wipe:", limit: 1 }),
      ([, value]) => value
    )
    const registrations = Array.from(
      this.ctx.storage.kv.list({ prefix: "registration:" }),
      ([, value]) => value
    ).filter(value => value.state === "active")
    return {
      ok: true,
      task: tasks[0] || null,
      registrations: registrations.map(value => ({
        userId: value.userId,
        handle: value.handle,
      })),
    }
  }

  prepareGlobalWipeTask(command) {
    if (
      !USER_ID_PATTERN.test(command?.userId) ||
      !Number.isSafeInteger(command.expectedRevision) ||
      command.expectedRevision < 1
    )
      return failure("invalid_account_deletion")
    return this.ctx.storage.transactionSync(() => {
      const key = `global-wipe:${command.userId}`
      const existing = this.ctx.storage.kv.get(key)
      if (existing) return { ok: true, task: existing }
      const registration = this.ctx.storage.kv.get(
        registrationKey(command.userId)
      )
      if (registration?.state !== "active")
        return failure("registration_not_found")
      const task = {
        userId: registration.userId,
        handle: registration.handle,
        identity: registration.identity,
        expectedRevision: command.expectedRevision,
        idempotencyKey: crypto.randomUUID(),
      }
      this.ctx.storage.kv.put(key, task)
      return { ok: true, task }
    })
  }

  finishGlobalWipeTask(userId) {
    if (!USER_ID_PATTERN.test(userId))
      return failure("invalid_account_deletion")
    this.ctx.storage.kv.delete(`global-wipe:${userId}`)
    return { ok: true }
  }

  getRegistrationForReconciliation(userId) {
    if (!USER_ID_PATTERN.test(userId)) {
      return failure("invalid_registration")
    }
    const registration = this.ctx.storage.kv.get(registrationKey(userId))
    if (!registration) return failure("registration_not_found")
    return Object.freeze({ ok: true, registration })
  }

  abandonRegistration(command) {
    if (
      !command ||
      !USER_ID_PATTERN.test(command.userId) ||
      !DIGEST_PATTERN.test(command.identityDigest) ||
      !DIGEST_PATTERN.test(command.operationDigest) ||
      !DIGEST_PATTERN.test(command.operatorIdentityDigest) ||
      !DIGEST_PATTERN.test(command.reconciliationOperationDigest) ||
      !Number.isInteger(command.leaseSeconds) ||
      command.leaseSeconds < 300 ||
      !validIsoDate(command.now)
    ) {
      return failure("invalid_registration")
    }

    return this.ctx.storage.transactionSync(() => {
      const key = registrationKey(command.userId)
      const registration = this.ctx.storage.kv.get(key)
      if (
        !registration ||
        registration.identityDigest !== command.identityDigest ||
        registration.operationDigest !== command.operationDigest
      ) {
        return failure("registration_not_found")
      }
      if (registration.state === "abandoned") {
        return Object.freeze({
          ...registrationResult(registration, true),
          state: "abandoned",
        })
      }
      if (registration.state !== "pending") {
        return failure("registration_state_conflict")
      }
      if (
        Date.parse(command.now) - Date.parse(registration.createdAt) <
        command.leaseSeconds * 1000
      ) {
        return failure("registration_lease_active")
      }

      const inviteStorageKey = invitationKey(registration.inviteDigest)
      const invitation = this.ctx.storage.kv.get(inviteStorageKey)
      if (!invitation || invitation.reserved < 1) {
        return failure("registration_inconsistent")
      }
      const identityStorageKey = identityKey(registration.identityDigest)
      const handleStorageKey = handleKey(registration.handle)
      const operationStorageKey = operationKey(registration.operationDigest)
      const identity = this.ctx.storage.kv.get(identityStorageKey)
      const handle = this.ctx.storage.kv.get(handleStorageKey)
      const operation = this.ctx.storage.kv.get(operationStorageKey)
      if (
        identity?.userId !== registration.userId ||
        handle?.userId !== registration.userId ||
        operation?.userId !== registration.userId
      ) {
        return failure("registration_inconsistent")
      }

      const abandoned = {
        ...registration,
        state: "abandoned",
        abandonedAt: command.now,
        updatedAt: command.now,
        abandonedByDigest: command.operatorIdentityDigest,
        reconciliationOperationDigest: command.reconciliationOperationDigest,
      }
      this.ctx.storage.kv.put(key, abandoned)
      this.ctx.storage.kv.put(inviteStorageKey, {
        ...invitation,
        reserved: invitation.reserved - 1,
      })
      this.ctx.storage.kv.delete(identityStorageKey)
      this.ctx.storage.kv.delete(handleStorageKey)
      this.ctx.storage.kv.put(operationStorageKey, {
        ...operation,
        state: "abandoned",
        abandonedAt: command.now,
      })
      this.ctx.storage.kv.delete(pendingRegistrationKey(command.userId))
      return Object.freeze({
        ...registrationResult(abandoned),
        state: "abandoned",
      })
    })
  }

  getRegistrationByIdentity(identityDigest) {
    if (!DIGEST_PATTERN.test(identityDigest)) return failure("invalid_identity")
    const identity = this.ctx.storage.kv.get(identityKey(identityDigest))
    if (!identity) return failure("registration_not_found")
    const registration = this.ctx.storage.kv.get(
      registrationKey(identity.userId)
    )
    return registration
      ? registrationResult(registration, true)
      : failure("registration_inconsistent")
  }

  getActiveRegistrationByHandle(handle) {
    if (!HANDLE_PATTERN.test(handle)) {
      return failure("registration_not_found")
    }
    const assignment = this.ctx.storage.kv.get(handleKey(handle))
    if (!assignment || assignment.state !== "active") {
      return failure("registration_not_found")
    }
    const registration = this.ctx.storage.kv.get(
      registrationKey(assignment.userId)
    )
    if (
      !registration ||
      registration.state !== "active" ||
      registration.handle !== handle
    ) {
      return failure("registration_inconsistent")
    }
    return Object.freeze({
      ok: true,
      userId: registration.userId,
      handle: registration.handle,
    })
  }

  getAccountDeletion(operationDigest, requestDigest) {
    if (
      !DIGEST_PATTERN.test(operationDigest) ||
      !DIGEST_PATTERN.test(requestDigest)
    ) {
      return failure("invalid_account_deletion")
    }
    const deletion = this.ctx.storage.kv.get(
      deletionOperationKey(operationDigest)
    )
    if (!deletion) return failure("account_deletion_not_found")
    if (deletion.requestDigest !== requestDigest) {
      return failure("idempotency_conflict")
    }
    return Object.freeze({
      ok: true,
      idempotent: true,
      userId: deletion.userId,
      deletedAt: deletion.deletedAt,
    })
  }

  deleteActiveRegistration(command) {
    if (
      !command ||
      !USER_ID_PATTERN.test(command.userId) ||
      !DIGEST_PATTERN.test(command.identityDigest) ||
      !DIGEST_PATTERN.test(command.operationDigest) ||
      !DIGEST_PATTERN.test(command.requestDigest) ||
      !validIsoDate(command.now)
    ) {
      return failure("invalid_account_deletion")
    }

    return this.ctx.storage.transactionSync(() => {
      const deletionKey = deletionOperationKey(command.operationDigest)
      const existing = this.ctx.storage.kv.get(deletionKey)
      if (existing) {
        return existing.requestDigest === command.requestDigest
          ? Object.freeze({
              ok: true,
              idempotent: true,
              userId: existing.userId,
              deletedAt: existing.deletedAt,
            })
          : failure("idempotency_conflict")
      }

      const registrationStorageKey = registrationKey(command.userId)
      const registration = this.ctx.storage.kv.get(registrationStorageKey)
      if (
        !registration ||
        registration.state !== "active" ||
        registration.identityDigest !== command.identityDigest
      ) {
        return failure("registration_not_found")
      }
      const identityStorageKey = identityKey(command.identityDigest)
      const handleStorageKey = handleKey(registration.handle)
      if (
        this.ctx.storage.kv.get(identityStorageKey)?.userId !==
          command.userId ||
        this.ctx.storage.kv.get(handleStorageKey)?.userId !== command.userId
      ) {
        return failure("registration_inconsistent")
      }

      this.ctx.storage.kv.delete(identityStorageKey)
      this.ctx.storage.kv.delete(handleStorageKey)
      this.ctx.storage.kv.delete(registrationStorageKey)
      this.ctx.storage.kv.put(deletionKey, {
        schemaVersion: 1,
        userId: command.userId,
        requestDigest: command.requestDigest,
        deletedAt: command.now,
      })
      return Object.freeze({
        ok: true,
        idempotent: false,
        userId: command.userId,
        deletedAt: command.now,
      })
    })
  }

  getInvitationStatus(digest) {
    if (!DIGEST_PATTERN.test(digest)) return failure("invalid_invitation")
    const invitation = this.ctx.storage.kv.get(invitationKey(digest))
    if (!invitation) return failure("invitation_not_found")
    return Object.freeze({
      ok: true,
      status: invitation.status,
      maxUses: invitation.maxUses,
      used: invitation.used,
      reserved: invitation.reserved,
      expiresAt: invitation.expiresAt,
    })
  }
}

function profileResult(profile, idempotent = false) {
  return Object.freeze({ ok: true, idempotent, profile })
}

function validProfileInitialization(command) {
  return (
    command &&
    USER_ID_PATTERN.test(command.userId) &&
    DIGEST_PATTERN.test(command.identityDigest) &&
    HANDLE_PATTERN.test(command.handle) &&
    typeof command.identity?.issuer === "string" &&
    typeof command.identity?.subject === "string" &&
    typeof command.displayName === "string" &&
    command.displayName.length >= 2 &&
    command.displayName.length <= 50 &&
    typeof command.termsVersion === "string" &&
    typeof command.privacyVersion === "string" &&
    validIsoDate(command.now)
  )
}

function validOwnerMutation(command) {
  return (
    command &&
    DIGEST_PATTERN.test(command.identityDigest) &&
    DIGEST_PATTERN.test(command.operationDigest) &&
    DIGEST_PATTERN.test(command.requestDigest) &&
    Number.isSafeInteger(command.expectedRevision) &&
    command.expectedRevision >= 1 &&
    validIsoDate(command.now)
  )
}

function validStoredAtlasImage(value) {
  return Boolean(
    value &&
      value.schemaVersion === 1 &&
      ATLAS_IMAGE_ID_PATTERN.test(value.imageId) &&
      typeof value.storageKey === "string" &&
      /^private\/atlas\/usr_[0-9a-f-]{36}\/image_[a-f0-9]{32}\.webp$/.test(
        value.storageKey
      ) &&
      DIGEST_PATTERN.test(value.sourceSha256) &&
      value.contentType === "image/webp" &&
      value.width === 1200 &&
      value.height === 1200 &&
      Number.isSafeInteger(value.byteLength) &&
      value.byteLength >= 1 &&
      value.byteLength <= 1024 * 1024 &&
      (value.publicProfile === undefined ||
        typeof value.publicProfile === "boolean") &&
      (value.location === undefined ||
        (normalizeImageLocation(value.location) !== null &&
          normalizeImageLocation(value.location) === value.location)) &&
      validIsoDate(value.createdAt) &&
      validIsoDate(value.updatedAt)
  )
}

function validVisitedYears(value) {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every((year, index) => {
      return (
        Number.isInteger(year) &&
        year >= 1900 &&
        year <= new Date().getUTCFullYear() &&
        (index === 0 || value[index - 1] < year)
      )
    })
  )
}

function validVisitedDates(value) {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every((date, index) => {
      if (
        !date ||
        typeof date !== "object" ||
        Array.isArray(date) ||
        Object.keys(date).some(key => !["year", "month"].includes(key)) ||
        !Number.isInteger(date.year) ||
        date.year < 1900 ||
        date.year > new Date().getUTCFullYear() ||
        (date.month !== undefined &&
          (!Number.isInteger(date.month) || date.month < 1 || date.month > 12))
      ) {
        return false
      }
      if (index === 0) return true
      const previous = value[index - 1]
      return (
        previous.year < date.year ||
        (previous.year === date.year &&
          (previous.month || 0) < (date.month || 0))
      )
    })
  )
}

function visitedDatesForPin(pin) {
  const dates = Array.isArray(pin.visitedDates)
    ? pin.visitedDates
    : (pin.visitedYears || []).map(year => ({ year }))
  return Object.freeze(
    dates.map(date =>
      Object.freeze({
        year: date.year,
        ...(date.month === undefined ? {} : { month: date.month }),
      })
    )
  )
}

function publicPinTiming(pin) {
  const visitedDates = visitedDatesForPin(pin)
  return Object.freeze({
    visitedDates,
    visitedYears: Object.freeze([
      ...new Set(visitedDates.map(date => date.year)),
    ]),
  })
}

function validPinTiming(command) {
  if (
    !validVisitedYears(command.visitedYears) ||
    !validVisitedDates(command.visitedDates)
  ) {
    return false
  }
  const derivedYears = [...new Set(command.visitedDates.map(date => date.year))]
  return (
    derivedYears.length === command.visitedYears.length &&
    derivedYears.every((year, index) => year === command.visitedYears[index])
  )
}

function validStoredPinPlace(value) {
  if (!PLACE_ID_PATTERN.test(value?.placeId)) return false
  if (CUSTOM_PLACE_ID_PATTERN.test(value.placeId)) {
    return isNormalizedCustomPlace(value.customPlace)
  }
  return value.customPlace === undefined || value.customPlace === null
}

function validStoredWish(value) {
  return Boolean(
    WISH_ID_PATTERN.test(value?.wishId) &&
      validStoredPinPlace(value) &&
      isNormalizedPinMemory(value.note) &&
      ["low", "normal", "high"].includes(value.priority) &&
      (value.desiredYear === null ||
        (Number.isInteger(value.desiredYear) &&
          value.desiredYear >= 2000 &&
          value.desiredYear <= 2200)) &&
      validIsoDate(value.createdAt) &&
      validIsoDate(value.updatedAt)
  )
}

function validPlanSnapshot(value) {
  const optionalStrings = [
    "countryCode",
    "admin1Name",
    "countryName",
    "spotCategory",
    "spotKind",
    "catalogRevision",
  ]
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      PLACE_ID_PATTERN.test(value.placeId) &&
      ["country", "city", "spot", "custom"].includes(value.placeType) &&
      typeof value.name === "string" &&
      value.name.length > 0 &&
      value.name.length <= 320 &&
      Array.isArray(value.coordinates) &&
      value.coordinates.length === 2 &&
      value.coordinates.every(Number.isFinite) &&
      [
        "route-ready",
        "needs-entrance-selection",
        "user-coordinate-review",
      ].includes(value.routeReadiness) &&
      optionalStrings.every(
        key => value[key] === undefined || typeof value[key] === "string"
      ) &&
      (value.sourceWishId === undefined ||
        WISH_ID_PATTERN.test(value.sourceWishId))
  )
}

function validStoredPlan(value) {
  return Boolean(
    PLAN_ID_PATTERN.test(value?.planId) &&
      isNormalizedPinMemory(value.title) &&
      value.title.length > 0 &&
      Array.from(value.title).length <= 80 &&
      ["draft", "saved", "archived"].includes(value.status) &&
      (value.desiredYear === null ||
        (Number.isInteger(value.desiredYear) &&
          value.desiredYear >= 2000 &&
          value.desiredYear <= 2200)) &&
      isNormalizedPinMemory(value.note) &&
      validPlanSnapshot(value.start) &&
      Array.isArray(value.stops) &&
      value.stops.length >= 1 &&
      value.stops.length <= MAX_PLAN_DESTINATIONS &&
      value.stops.every(validPlanSnapshot) &&
      ["return-to-start", "last-stop", "selected-end"].includes(
        value.endMode
      ) &&
      (value.endMode === "selected-end"
        ? validPlanSnapshot(value.end)
        : value.end === undefined) &&
      ["active", "deletion-pending"].includes(value.retentionState) &&
      validIsoDate(value.retentionConfirmedAt) &&
      validIsoDate(value.retentionExpiresAt) &&
      (value.retentionState !== "deletion-pending" ||
        (validIsoDate(value.deletionPendingAt) &&
          validIsoDate(value.deleteAfter))) &&
      validIsoDate(value.createdAt) &&
      validIsoDate(value.updatedAt)
  )
}

function ownerProfile(storage, identityDigest) {
  const profile = storage.kv.get("profile")
  if (!profile) return failure("profile_not_found")
  if (profile.identityDigest !== identityDigest) return failure("forbidden")
  if (profile.status !== "active") return failure("profile_not_active")
  return Object.freeze({ ok: true, profile })
}

function existingMutation(storage, command) {
  const existing = storage.kv.get(mutationKey(command.operationDigest))
  if (!existing) return null
  if (
    existing.requestDigest === command.requestDigest &&
    (existing.planReference || existing.pinReferences)
  ) {
    const plan = existing.planReference
      ? storage.kv.get(planKey(existing.planReference))
      : null
    const pins = existing.pinReferences?.map(id => storage.kv.get(pinKey(id)))
    if (existing.planReference && !plan) return failure("plan_not_found")
    if (pins?.some(pin => !pin)) return failure("pin_not_found")
    return {
      ...existing.result,
      ...(plan ? { plan } : {}),
      ...(pins ? { pins } : {}),
      profile: storage.kv.get("profile"),
      idempotent: true,
    }
  }
  if (
    existing.requestDigest === command.requestDigest &&
    existing.pinReference
  ) {
    const pin = storage.kv.get(pinKey(existing.pinReference))
    if (!pin) return failure("pin_not_found")
    return Object.freeze({
      ...existing.result,
      pin,
      profile: storage.kv.get("profile"),
      idempotent: true,
    })
  }
  return existing.requestDigest === command.requestDigest
    ? Object.freeze({ ...existing.result, idempotent: true })
    : failure("idempotency_conflict")
}

function storeMutation(storage, command, result) {
  if (storage.kv.get(TRIP_MARKER)) storage.kv.delete(TRIP_BACKUP)
  const pinReference =
    result.pin?.experiences !== undefined ? result.pin.pinId : null
  let cachedResult = result
  if (pinReference) {
    const pin = { ...result.pin }
    delete pin.experiences
    cachedResult = { ...result, pin }
  }
  storage.kv.put(mutationKey(command.operationDigest), {
    requestDigest: command.requestDigest,
    result: cachedResult,
    ...(pinReference ? { pinReference } : {}),
    createdAt: command.now,
  })
}

export class UserProfileDurableObject extends DurableObject {
  initializeProfile(command) {
    if (!validProfileInitialization(command)) {
      return failure("invalid_profile_initialization")
    }

    return this.ctx.storage.transactionSync(() => {
      const abandoned = this.ctx.storage.kv.get("provisioning-abandoned")
      if (abandoned) {
        return failure("profile_provisioning_abandoned")
      }
      const existing = this.ctx.storage.kv.get("profile")
      if (existing) {
        const sameOwner =
          existing.userId === command.userId &&
          existing.identityDigest === command.identityDigest &&
          existing.handle === command.handle &&
          existing.displayName === command.displayName &&
          existing.acceptedTermsVersion === command.termsVersion &&
          existing.acceptedPrivacyVersion === command.privacyVersion
        return sameOwner
          ? profileResult(existing, true)
          : failure("profile_initialization_conflict")
      }

      const profile = {
        schemaVersion: 1,
        userId: command.userId,
        identities: [command.identity],
        identityDigest: command.identityDigest,
        handle: command.handle,
        displayName: command.displayName,
        public: false,
        discoverable: false,
        status: "active",
        pinCount: 0,
        wishCount: 0,
        planCount: 0,
        acceptedTermsVersion: command.termsVersion,
        acceptedPrivacyVersion: command.privacyVersion,
        acceptedAt: command.now,
        publicAtlasUpdatedAt: command.now,
        revision: 1,
        createdAt: command.now,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put("profile", profile)
      return profileResult(profile)
    })
  }

  getOwnerProfile(identityDigest) {
    if (!DIGEST_PATTERN.test(identityDigest)) return failure("invalid_identity")
    const result = ownerProfile(this.ctx.storage, identityDigest)
    return result.ok ? profileResult(result.profile, true) : result
  }
  getOwnerTrips(identityDigest) {
    const owner = ownerProfile(this.ctx.storage, identityDigest)
    if (!owner.ok) return owner
    return {
      ok: true,
      profile: owner.profile,
      upgraded: Boolean(this.ctx.storage.kv.get(TRIP_MARKER)),
      trips: storedTrips(this.ctx.storage),
      rollbackAvailable: Boolean(this.ctx.storage.kv.get(TRIP_BACKUP)),
    }
  }
  async mutateOwnerTrip(command) {
    if (!validOwnerMutation(command)) return failure("invalid_trip_mutation")
    const alarm =
      command.action === "upgrade" ? await this.ctx.storage.getAlarm() : null
    const result = this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      return mutateTripStore(this.ctx.storage, owner.profile, command, {
        source:
          command.action === "upgrade"
            ? this.exportOwnerState(command.identityDigest)
            : null,
        alarm,
      })
    })
    if (result.ok) {
      if (command.action === "rollback") {
        if (result.restoreAlarm)
          await this.ctx.storage.setAlarm(result.restoreAlarm)
        else await this.ctx.storage.deleteAlarm()
      } else if (this.ctx.storage.kv.get(TRIP_MARKER))
        await this.ctx.storage.deleteAlarm()
    }
    return result
  }

  getOwnerAtlasImage(identityDigest) {
    if (!DIGEST_PATTERN.test(identityDigest)) return failure("invalid_identity")
    const owner = ownerProfile(this.ctx.storage, identityDigest)
    if (!owner.ok) return owner
    const atlasImage = this.ctx.storage.kv.get(ATLAS_IMAGE_KEY) || null
    if (atlasImage && !validStoredAtlasImage(atlasImage)) {
      return failure("atlas_image_inconsistent")
    }
    return Object.freeze({ ok: true, profile: owner.profile, atlasImage })
  }

  getOwnerAtlasImageForDeletion(identityDigest) {
    if (!DIGEST_PATTERN.test(identityDigest)) return failure("invalid_identity")
    const profile = this.ctx.storage.kv.get("profile")
    if (
      !profile ||
      profile.identityDigest !== identityDigest ||
      !["active", "deleting"].includes(profile.status)
    ) {
      return failure("forbidden")
    }
    const atlasImage = this.ctx.storage.kv.get(ATLAS_IMAGE_KEY) || null
    if (atlasImage && !validStoredAtlasImage(atlasImage)) {
      return failure("atlas_image_inconsistent")
    }
    return Object.freeze({ ok: true, atlasImage })
  }

  replaceOwnerAtlasImage(command) {
    if (
      !validOwnerMutation(command) ||
      !validStoredAtlasImage(command.image) ||
      !normalizeImageLocation(command.image?.location)
    ) {
      return failure("invalid_atlas_image")
    }
    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      if (
        !command.image.storageKey.startsWith(
          `private/atlas/${owner.profile.userId}/`
        )
      ) {
        return failure("invalid_atlas_image")
      }
      const previousAtlasImage =
        this.ctx.storage.kv.get(ATLAS_IMAGE_KEY) || null
      if (previousAtlasImage && !validStoredAtlasImage(previousAtlasImage)) {
        return failure("atlas_image_inconsistent")
      }
      const profile = {
        ...owner.profile,
        publicAtlasUpdatedAt: command.now,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put(ATLAS_IMAGE_KEY, command.image)
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        atlasImage: command.image,
        previousAtlasImage,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  updateOwnerAtlasImageVisibility(command) {
    if (
      !validOwnerMutation(command) ||
      (command.publicProfile === undefined && command.location === undefined) ||
      (command.publicProfile !== undefined &&
        typeof command.publicProfile !== "boolean") ||
      (command.location !== undefined &&
        (normalizeImageLocation(command.location) === null ||
          normalizeImageLocation(command.location) !== command.location))
    ) {
      return failure("invalid_atlas_image")
    }
    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const atlasImage = this.ctx.storage.kv.get(ATLAS_IMAGE_KEY) || null
      if (!atlasImage) return failure("atlas_image_not_found")
      if (!validStoredAtlasImage(atlasImage)) {
        return failure("atlas_image_inconsistent")
      }
      if (
        command.publicProfile === true &&
        !normalizeImageLocation(command.location || atlasImage.location)
      )
        return failure("atlas_image_location_required")
      const updatedAtlasImage = Object.freeze({
        ...atlasImage,
        ...(command.publicProfile === undefined
          ? {}
          : { publicProfile: command.publicProfile }),
        ...(command.location === undefined
          ? {}
          : { location: command.location }),
        updatedAt: command.now,
      })
      const profile = {
        ...owner.profile,
        publicAtlasUpdatedAt: command.now,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put(ATLAS_IMAGE_KEY, updatedAtlasImage)
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        atlasImage: updatedAtlasImage,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  removeOwnerAtlasImage(command) {
    if (!validOwnerMutation(command)) return failure("invalid_atlas_image")
    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const atlasImage = this.ctx.storage.kv.get(ATLAS_IMAGE_KEY) || null
      if (!atlasImage) return failure("atlas_image_not_found")
      if (!validStoredAtlasImage(atlasImage)) {
        return failure("atlas_image_inconsistent")
      }
      const profile = {
        ...owner.profile,
        publicAtlasUpdatedAt: command.now,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.delete(ATLAS_IMAGE_KEY)
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        removedAtlasImage: atlasImage,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  updateOwnerProfile(command) {
    const patch = command?.patch
    if (
      !validOwnerMutation(command) ||
      !patch ||
      typeof patch !== "object" ||
      Array.isArray(patch) ||
      Object.keys(patch).length === 0 ||
      Object.keys(patch).some(
        key =>
          ![
            "displayName",
            "public",
            "discoverable",
            "instagramHandle",
          ].includes(key)
      ) ||
      (patch.displayName !== undefined &&
        (typeof patch.displayName !== "string" ||
          patch.displayName.length < 2 ||
          patch.displayName.length > 50)) ||
      (patch.instagramHandle !== undefined &&
        (normalizeInstagramHandle(patch.instagramHandle) === null ||
          normalizeInstagramHandle(patch.instagramHandle) !==
            patch.instagramHandle)) ||
      (patch.public !== undefined && typeof patch.public !== "boolean") ||
      (patch.discoverable !== undefined &&
        typeof patch.discoverable !== "boolean")
    ) {
      return failure("invalid_profile_update")
    }

    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      if (patch.public === true && (owner.profile.pinCount || 0) < 1) {
        return failure("profile_requires_pin")
      }
      const nextPublic = patch.public ?? owner.profile.public
      const nextDiscoverable =
        patch.discoverable !== undefined
          ? patch.discoverable
          : owner.profile.discoverable === true
      if (patch.discoverable === true && nextPublic !== true) {
        return failure("discovery_requires_public_profile")
      }

      const profile = {
        ...owner.profile,
        ...patch,
        discoverable: nextPublic === true ? nextDiscoverable : false,
        publicAtlasUpdatedAt: command.now,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  listOwnerPins(command) {
    if (
      !command ||
      !DIGEST_PATTERN.test(command.identityDigest) ||
      !Number.isInteger(command.limit) ||
      command.limit < 1 ||
      command.limit > 100 ||
      (command.cursor && !PIN_ID_PATTERN.test(command.cursor))
    ) {
      return failure("invalid_pin_query")
    }
    const owner = ownerProfile(this.ctx.storage, command.identityDigest)
    if (!owner.ok) return owner
    const options = { prefix: "pin:", limit: command.limit + 1 }
    if (command.cursor) options.startAfter = pinKey(command.cursor)
    const entries = this.ctx.storage.kv.get(TRIP_MARKER)
      ? tripPins(this.ctx.storage)
          .sort((a, b) => a.pinId.localeCompare(b.pinId))
          .filter(pin => !command.cursor || pin.pinId > command.cursor)
          .slice(0, command.limit + 1)
      : Array.from(this.ctx.storage.kv.list(options), ([, value]) => value)
    const truncated = entries.length > command.limit
    const pins = entries.slice(0, command.limit)
    return Object.freeze({
      ok: true,
      profile: owner.profile,
      pins,
      nextCursor: truncated ? pins[pins.length - 1].pinId : null,
    })
  }

  createOwnerPin(command) {
    if (this.ctx.storage.kv.get(TRIP_MARKER)) {
      const owner = ownerProfile(this.ctx.storage, command?.identityDigest)
      return owner.ok ? failure("trip_upgrade_required") : owner
    }
    if (
      !validOwnerMutation(command) ||
      !PIN_ID_PATTERN.test(command.pinId) ||
      !validStoredPinPlace(command) ||
      !validPinTiming(command) ||
      !isNormalizedPinMemory(command.memory)
    ) {
      return failure("invalid_pin")
    }

    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      if ((owner.profile.pinCount || 0) >= 300) {
        return failure("pin_limit_reached")
      }
      if (this.ctx.storage.kv.get(pinPlaceKey(command.placeId))) {
        return failure("duplicate_place")
      }
      if (this.ctx.storage.kv.get(pinKey(command.pinId))) {
        return failure("pin_id_collision")
      }

      const pin = {
        schemaVersion: 4,
        pinId: command.pinId,
        placeId: command.placeId,
        ...(command.customPlace ? { customPlace: command.customPlace } : {}),
        visitedYears: command.visitedYears,
        visitedDates: command.visitedDates,
        memory: command.memory,
        createdAt: command.now,
        updatedAt: command.now,
      }
      const profile = {
        ...owner.profile,
        pinCount: (owner.profile.pinCount || 0) + 1,
        publicAtlasUpdatedAt: command.now,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put(pinKey(pin.pinId), pin)
      this.ctx.storage.kv.put(pinPlaceKey(pin.placeId), { pinId: pin.pinId })
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        pin,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  updateOwnerPin(command) {
    if (this.ctx.storage.kv.get(TRIP_MARKER)) {
      const owner = ownerProfile(this.ctx.storage, command?.identityDigest)
      return owner.ok ? failure("trip_upgrade_required") : owner
    }
    const patch = command?.patch
    if (
      !validOwnerMutation(command) ||
      !PIN_ID_PATTERN.test(command.pinId) ||
      !patch ||
      typeof patch !== "object" ||
      Array.isArray(patch) ||
      Object.keys(patch).length === 0 ||
      Object.keys(patch).some(
        key =>
          ![
            "placeId",
            "customPlace",
            "visitedYears",
            "visitedDates",
            "memory",
            "experienceChange",
          ].includes(key)
      ) ||
      (patch.placeId !== undefined && !PLACE_ID_PATTERN.test(patch.placeId)) ||
      (patch.customPlace !== undefined &&
        patch.customPlace !== null &&
        !isNormalizedCustomPlace(patch.customPlace)) ||
      ((patch.visitedYears !== undefined || patch.visitedDates !== undefined) &&
        !validPinTiming(patch)) ||
      (patch.memory !== undefined && !isNormalizedPinMemory(patch.memory)) ||
      (patch.experienceChange !== undefined &&
        !normalizeExperienceChange(patch.experienceChange))
    ) {
      return failure("invalid_pin")
    }

    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const current = this.ctx.storage.kv.get(pinKey(command.pinId))
      if (!current) return failure("pin_not_found")
      if (patch.customPlace && (!current.customPlace || patch.placeId))
        return failure("invalid_pin")
      const placeId = patch.placeId || current.placeId
      if (placeId !== current.placeId) {
        const place = this.ctx.storage.kv.get(pinPlaceKey(placeId))
        if (place && place.pinId !== current.pinId) {
          return failure("duplicate_place")
        }
      }

      const { experienceChange, ...pinPatch } = patch
      const experienceResult = experienceChange
        ? applyExperienceChange(
            current.experiences,
            experienceChange,
            command.now
          )
        : null
      if (experienceResult?.error) return failure(experienceResult.error)
      const pin = {
        ...current,
        ...pinPatch,
        ...(experienceResult
          ? { experiences: experienceResult.experiences }
          : {}),
        schemaVersion: 4,
        updatedAt: command.now,
      }
      if (pin.customPlace === null) delete pin.customPlace
      if (!validStoredPinPlace(pin)) return failure("invalid_pin")
      const profile = {
        ...owner.profile,
        publicAtlasUpdatedAt:
          experienceChange && Object.keys(pinPatch).length === 0
            ? owner.profile.publicAtlasUpdatedAt
            : command.now,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      if (placeId !== current.placeId) {
        this.ctx.storage.kv.delete(pinPlaceKey(current.placeId))
        this.ctx.storage.kv.put(pinPlaceKey(placeId), { pinId: current.pinId })
      }
      this.ctx.storage.kv.put(pinKey(pin.pinId), pin)
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        pin,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  deleteOwnerPin(command) {
    if (this.ctx.storage.kv.get(TRIP_MARKER)) {
      const owner = ownerProfile(this.ctx.storage, command?.identityDigest)
      return owner.ok ? failure("trip_upgrade_required") : owner
    }
    if (!validOwnerMutation(command) || !PIN_ID_PATTERN.test(command.pinId)) {
      return failure("invalid_pin")
    }

    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const pin = this.ctx.storage.kv.get(pinKey(command.pinId))
      if (!pin) return failure("pin_not_found")
      const pinCount = Math.max(0, (owner.profile.pinCount || 0) - 1)
      const profile = {
        ...owner.profile,
        public: pinCount === 0 ? false : owner.profile.public,
        discoverable:
          pinCount === 0 ? false : owner.profile.discoverable === true,
        pinCount,
        publicAtlasUpdatedAt: command.now,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.delete(pinKey(pin.pinId))
      this.ctx.storage.kv.delete(pinPlaceKey(pin.placeId))
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  listOwnerWishes(command) {
    if (
      !command ||
      !DIGEST_PATTERN.test(command.identityDigest) ||
      !Number.isInteger(command.limit) ||
      command.limit < 1 ||
      command.limit > 100 ||
      (command.cursor && !WISH_ID_PATTERN.test(command.cursor))
    ) {
      return failure("invalid_wish_query")
    }
    const owner = ownerProfile(this.ctx.storage, command.identityDigest)
    if (!owner.ok) return owner
    const options = { prefix: "wish:", limit: command.limit + 1 }
    if (command.cursor) options.startAfter = wishKey(command.cursor)
    const entries = Array.from(
      this.ctx.storage.kv.list(options),
      ([, value]) => value
    )
    if (entries.some(value => !validStoredWish(value))) {
      return failure("wishlist_inconsistent")
    }
    const truncated = entries.length > command.limit
    const wishes = entries.slice(0, command.limit)
    return Object.freeze({
      ok: true,
      profile: owner.profile,
      wishes,
      nextCursor: truncated ? wishes[wishes.length - 1].wishId : null,
    })
  }

  getOwnerWishesByIds(command) {
    if (
      !command ||
      !DIGEST_PATTERN.test(command.identityDigest) ||
      !Array.isArray(command.wishIds) ||
      command.wishIds.length < 1 ||
      command.wishIds.length > MAX_PLAN_DESTINATIONS + 2 ||
      command.wishIds.some(value => !WISH_ID_PATTERN.test(value))
    ) {
      return failure("invalid_wish_query")
    }
    const owner = ownerProfile(this.ctx.storage, command.identityDigest)
    if (!owner.ok) return owner
    const wishes = command.wishIds.map(id =>
      this.ctx.storage.kv.get(wishKey(id))
    )
    if (wishes.some(value => !value)) return failure("wish_not_found")
    if (wishes.some(value => !validStoredWish(value))) {
      return failure("wishlist_inconsistent")
    }
    return Object.freeze({ ok: true, profile: owner.profile, wishes })
  }

  createOwnerWish(command) {
    if (
      !validOwnerMutation(command) ||
      !WISH_ID_PATTERN.test(command.wishId) ||
      !validStoredPinPlace(command) ||
      !isNormalizedPinMemory(command.note) ||
      !["low", "normal", "high"].includes(command.priority) ||
      (command.desiredYear !== null &&
        (!Number.isInteger(command.desiredYear) ||
          command.desiredYear < 2000 ||
          command.desiredYear > 2200))
    ) {
      return failure("invalid_wish")
    }
    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      const existingPlace = this.ctx.storage.kv.get(
        wishPlaceKey(command.placeId)
      )
      if (existingPlace) {
        const existingWish = this.ctx.storage.kv.get(
          wishKey(existingPlace.wishId)
        )
        if (
          !existingWish ||
          !validStoredWish(existingWish) ||
          existingWish.placeId !== command.placeId
        ) {
          return failure("wishlist_inconsistent")
        }
        return Object.freeze({
          ok: true,
          idempotent: true,
          profile: owner.profile,
          wish: existingWish,
        })
      }
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      if ((owner.profile.wishCount || 0) >= 250) {
        return failure("wish_limit_reached")
      }
      if (this.ctx.storage.kv.get(wishKey(command.wishId))) {
        return failure("wish_id_collision")
      }
      const wish = {
        schemaVersion: 1,
        wishId: command.wishId,
        placeId: command.placeId,
        ...(command.customPlace ? { customPlace: command.customPlace } : {}),
        note: command.note,
        priority: command.priority,
        desiredYear: command.desiredYear,
        createdAt: command.now,
        updatedAt: command.now,
      }
      const profile = {
        ...owner.profile,
        wishCount: (owner.profile.wishCount || 0) + 1,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put(wishKey(wish.wishId), wish)
      this.ctx.storage.kv.put(wishPlaceKey(wish.placeId), {
        wishId: wish.wishId,
      })
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        wish,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  updateOwnerWish(command) {
    const patch = command?.patch
    if (
      !validOwnerMutation(command) ||
      !WISH_ID_PATTERN.test(command.wishId) ||
      !patch ||
      typeof patch !== "object" ||
      Array.isArray(patch) ||
      !Object.keys(patch).length ||
      Object.keys(patch).some(
        key => !["note", "priority", "desiredYear"].includes(key)
      ) ||
      (patch.note !== undefined && !isNormalizedPinMemory(patch.note)) ||
      (patch.priority !== undefined &&
        !["low", "normal", "high"].includes(patch.priority)) ||
      (patch.desiredYear !== undefined &&
        patch.desiredYear !== null &&
        (!Number.isInteger(patch.desiredYear) ||
          patch.desiredYear < 2000 ||
          patch.desiredYear > 2200))
    ) {
      return failure("invalid_wish")
    }
    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const current = this.ctx.storage.kv.get(wishKey(command.wishId))
      if (!current) return failure("wish_not_found")
      const wish = { ...current, ...patch, updatedAt: command.now }
      if (!validStoredWish(wish)) return failure("invalid_wish")
      const profile = {
        ...owner.profile,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put(wishKey(wish.wishId), wish)
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        wish,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  deleteOwnerWish(command) {
    if (!validOwnerMutation(command) || !WISH_ID_PATTERN.test(command.wishId)) {
      return failure("invalid_wish")
    }
    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      const wish = this.ctx.storage.kv.get(wishKey(command.wishId))
      if (!wish) {
        return Object.freeze({
          ok: true,
          idempotent: true,
          profile: owner.profile,
        })
      }
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const profile = {
        ...owner.profile,
        wishCount: Math.max(0, (owner.profile.wishCount || 0) - 1),
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.delete(wishKey(wish.wishId))
      this.ctx.storage.kv.delete(wishPlaceKey(wish.placeId))
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  listOwnerPlans(identityDigest) {
    if (!DIGEST_PATTERN.test(identityDigest)) return failure("invalid_identity")
    const owner = ownerProfile(this.ctx.storage, identityDigest)
    if (!owner.ok) return owner
    const plans = Array.from(
      this.ctx.storage.kv.list({ prefix: "plan:", limit: 2 }),
      ([, value]) => value
    )
    if (plans.length > 1 || plans.some(value => !validStoredPlan(value))) {
      return failure("plans_inconsistent")
    }
    return Object.freeze({ ok: true, profile: owner.profile, plans })
  }

  getOwnerPlanning(identityDigest) {
    if (!DIGEST_PATTERN.test(identityDigest)) return failure("invalid_identity")
    const owner = ownerProfile(this.ctx.storage, identityDigest)
    if (!owner.ok) return owner
    const wishes = Array.from(
      this.ctx.storage.kv.list({ prefix: "wish:", limit: 251 }),
      ([, value]) => value
    )
    if (
      wishes.length > 250 ||
      wishes.some(value => !validStoredWish(value)) ||
      wishes.length !== (owner.profile.wishCount || 0)
    ) {
      return failure("wishlist_inconsistent")
    }
    const plans = Array.from(
      this.ctx.storage.kv.list({ prefix: "plan:", limit: 2 }),
      ([, value]) => value
    )
    if (
      plans.length > 1 ||
      plans.some(value => !validStoredPlan(value)) ||
      plans.length !== (owner.profile.planCount || 0)
    ) {
      return failure("plans_inconsistent")
    }
    return Object.freeze({
      ok: true,
      profile: owner.profile,
      wishes,
      plans,
    })
  }

  async createOwnerPlan(command) {
    if (this.ctx.storage.kv.get(TRIP_MARKER)) {
      const owner = ownerProfile(this.ctx.storage, command?.identityDigest)
      return owner.ok ? failure("trip_upgrade_required") : owner
    }
    const candidate = {
      planId: command?.planId,
      title: command?.title,
      status: command?.status,
      desiredYear: command?.desiredYear,
      note: command?.note,
      start: command?.start,
      stops: command?.stops,
      endMode: command?.endMode,
      ...(command?.end ? { end: command.end } : {}),
      retentionState: "active",
      retentionConfirmedAt: command?.now,
      retentionExpiresAt: validIsoDate(command?.now)
        ? retentionDeadline(command.now)
        : "",
      createdAt: command?.now,
      updatedAt: command?.now,
    }
    if (!validOwnerMutation(command) || !validStoredPlan(candidate)) {
      return failure("invalid_plan")
    }
    const result = this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      if ((owner.profile.planCount || 0) >= 1) {
        return failure("plan_limit_reached")
      }
      if (this.ctx.storage.kv.get(planKey(candidate.planId))) {
        return failure("plan_id_collision")
      }
      const profile = {
        ...owner.profile,
        planCount: 1,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put(planKey(candidate.planId), candidate)
      this.ctx.storage.kv.put("profile", profile)
      const stored = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        plan: candidate,
      })
      storeMutation(this.ctx.storage, command, stored)
      return stored
    })
    if (result.ok) {
      await this.ctx.storage.setAlarm(
        Date.parse(result.plan.retentionExpiresAt)
      )
    }
    return result
  }

  async replaceOwnerPlan(command) {
    if (this.ctx.storage.kv.get(TRIP_MARKER)) {
      const owner = ownerProfile(this.ctx.storage, command?.identityDigest)
      return owner.ok ? failure("trip_upgrade_required") : owner
    }
    if (!validOwnerMutation(command) || !PLAN_ID_PATTERN.test(command.planId)) {
      return failure("invalid_plan")
    }
    const result = this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const current = this.ctx.storage.kv.get(planKey(command.planId))
      if (!current) return failure("plan_not_found")
      const plan = {
        ...current,
        title: command.title,
        status: command.status,
        desiredYear: command.desiredYear,
        note: command.note,
        start: command.start,
        stops: command.stops,
        endMode: command.endMode,
        ...(command.end ? { end: command.end } : {}),
        retentionState: "active",
        retentionConfirmedAt: command.now,
        retentionExpiresAt: retentionDeadline(command.now),
        updatedAt: command.now,
      }
      delete plan.deletionPendingAt
      delete plan.deleteAfter
      if (!command.end) delete plan.end
      if (!validStoredPlan(plan)) return failure("invalid_plan")
      const profile = {
        ...owner.profile,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put(planKey(plan.planId), plan)
      this.ctx.storage.kv.put("profile", profile)
      const stored = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        plan,
      })
      storeMutation(this.ctx.storage, command, stored)
      return stored
    })
    if (result.ok) {
      await this.ctx.storage.setAlarm(
        Date.parse(result.plan.retentionExpiresAt)
      )
    }
    return result
  }

  async keepOwnerPlan(command) {
    if (this.ctx.storage.kv.get(TRIP_MARKER)) {
      const owner = ownerProfile(this.ctx.storage, command?.identityDigest)
      return owner.ok ? failure("trip_upgrade_required") : owner
    }
    if (!validOwnerMutation(command) || !PLAN_ID_PATTERN.test(command.planId)) {
      return failure("invalid_plan")
    }
    const result = this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const current = this.ctx.storage.kv.get(planKey(command.planId))
      if (!current) return failure("plan_not_found")
      const plan = {
        ...current,
        retentionState: "active",
        retentionConfirmedAt: command.now,
        retentionExpiresAt: retentionDeadline(command.now),
        updatedAt: command.now,
      }
      delete plan.deletionPendingAt
      delete plan.deleteAfter
      const profile = {
        ...owner.profile,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put(planKey(plan.planId), plan)
      this.ctx.storage.kv.put("profile", profile)
      const stored = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        plan,
      })
      storeMutation(this.ctx.storage, command, stored)
      return stored
    })
    if (result.ok) {
      await this.ctx.storage.setAlarm(
        Date.parse(result.plan.retentionExpiresAt)
      )
    }
    return result
  }

  markOwnerPlanVisited(command) {
    if (this.ctx.storage.kv.get(TRIP_MARKER)) {
      const owner = ownerProfile(this.ctx.storage, command?.identityDigest)
      return owner.ok ? failure("trip_upgrade_required") : owner
    }
    if (
      !validOwnerMutation(command) ||
      !PLAN_ID_PATTERN.test(command.planId) ||
      !Array.isArray(command.pins) ||
      command.pins.length < 1 ||
      command.pins.length > MAX_PLAN_DESTINATIONS ||
      command.pins.some(
        pin =>
          !Number.isInteger(pin?.stopIndex) ||
          pin.stopIndex < 0 ||
          pin.stopIndex >= MAX_PLAN_DESTINATIONS ||
          !PIN_ID_PATTERN.test(pin.pinId) ||
          !validStoredPinPlace(pin) ||
          !validPinTiming(pin) ||
          !isNormalizedPinMemory(pin.memory)
      ) ||
      new Set(command.pins.map(pin => pin.stopIndex)).size !==
        command.pins.length ||
      new Set(command.pins.map(pin => pin.placeId)).size !== command.pins.length
    ) {
      return failure("invalid_plan_visit")
    }

    return this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const plan = this.ctx.storage.kv.get(planKey(command.planId))
      if (!plan || !validStoredPlan(plan)) return failure("plan_not_found")
      if ((owner.profile.pinCount || 0) + command.pins.length > 300) {
        return failure("pin_limit_reached")
      }

      for (const candidate of command.pins) {
        const stop = plan.stops[candidate.stopIndex]
        if (!stop || stop.placeId !== candidate.placeId) {
          return failure("plan_stop_mismatch")
        }
        if (CUSTOM_PLACE_ID_PATTERN.test(candidate.placeId)) {
          if (
            stop.placeType !== "custom" ||
            candidate.customPlace.name !== stop.name ||
            candidate.customPlace.coordinates.some(
              (coordinate, index) => coordinate !== stop.coordinates[index]
            )
          ) {
            return failure("plan_stop_mismatch")
          }
        }
        if (this.ctx.storage.kv.get(pinPlaceKey(candidate.placeId))) {
          return failure("duplicate_place")
        }
        if (this.ctx.storage.kv.get(pinKey(candidate.pinId))) {
          return failure("pin_id_collision")
        }
      }

      const pins = command.pins.map(candidate =>
        Object.freeze({
          schemaVersion: 4,
          pinId: candidate.pinId,
          placeId: candidate.placeId,
          ...(candidate.customPlace
            ? { customPlace: candidate.customPlace }
            : {}),
          visitedYears: candidate.visitedYears,
          visitedDates: candidate.visitedDates,
          memory: candidate.memory,
          createdAt: command.now,
          updatedAt: command.now,
        })
      )
      const profile = {
        ...owner.profile,
        pinCount: (owner.profile.pinCount || 0) + pins.length,
        publicAtlasUpdatedAt: command.now,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      pins.forEach(pin => {
        this.ctx.storage.kv.put(pinKey(pin.pinId), pin)
        this.ctx.storage.kv.put(pinPlaceKey(pin.placeId), {
          pinId: pin.pinId,
        })
      })
      this.ctx.storage.kv.put("profile", profile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
        pins: Object.freeze(pins),
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  async deleteOwnerPlan(command) {
    if (this.ctx.storage.kv.get(TRIP_MARKER)) {
      const owner = ownerProfile(this.ctx.storage, command?.identityDigest)
      return owner.ok ? failure("trip_upgrade_required") : owner
    }
    if (!validOwnerMutation(command) || !PLAN_ID_PATTERN.test(command.planId)) {
      return failure("invalid_plan")
    }
    const result = this.ctx.storage.transactionSync(() => {
      const owner = ownerProfile(this.ctx.storage, command.identityDigest)
      if (!owner.ok) return owner
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (owner.profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const plan = this.ctx.storage.kv.get(planKey(command.planId))
      if (!plan) return failure("plan_not_found")
      const profile = {
        ...owner.profile,
        planCount: 0,
        revision: owner.profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.delete(planKey(plan.planId))
      this.ctx.storage.kv.put("profile", profile)
      const stored = Object.freeze({
        ok: true,
        idempotent: false,
        profile,
      })
      storeMutation(this.ctx.storage, command, stored)
      return stored
    })
    if (result.ok) await this.ctx.storage.deleteAlarm()
    return result
  }

  async expireOwnerPlans(now = new Date().toISOString()) {
    if (!validIsoDate(now)) return failure("invalid_plan_expiry")
    const result = this.ctx.storage.transactionSync(() => {
      const profile = this.ctx.storage.kv.get("profile")
      if (this.ctx.storage.kv.get(TRIP_MARKER))
        return { ok: true, changed: false, nextAlarm: null }
      if (!profile || profile.status !== "active") {
        return Object.freeze({ ok: true, changed: false, nextAlarm: null })
      }
      const plans = Array.from(
        this.ctx.storage.kv.list({ prefix: "plan:", limit: 2 }),
        ([, value]) => value
      )
      if (!plans.length) {
        return Object.freeze({ ok: true, changed: false, nextAlarm: null })
      }
      if (plans.length > 1 || !validStoredPlan(plans[0])) {
        return failure("plans_inconsistent")
      }
      const plan = plans[0]
      if (plan.retentionState === "active") {
        const deleteAfter = deletionDeadline(plan.retentionExpiresAt)
        if (Date.parse(now) >= Date.parse(deleteAfter)) {
          this.ctx.storage.kv.delete(planKey(plan.planId))
          this.ctx.storage.kv.put("profile", {
            ...profile,
            planCount: 0,
            revision: profile.revision + 1,
            updatedAt: now,
          })
          return Object.freeze({
            ok: true,
            changed: true,
            deleted: true,
            nextAlarm: null,
          })
        }
        if (Date.parse(now) >= Date.parse(plan.retentionExpiresAt)) {
          const pending = {
            ...plan,
            retentionState: "deletion-pending",
            deletionPendingAt: plan.retentionExpiresAt,
            deleteAfter,
          }
          this.ctx.storage.kv.put(planKey(plan.planId), pending)
          this.ctx.storage.kv.put("profile", {
            ...profile,
            revision: profile.revision + 1,
            updatedAt: now,
          })
          return Object.freeze({
            ok: true,
            changed: true,
            deleted: false,
            nextAlarm: pending.deleteAfter,
          })
        }
      } else if (Date.parse(now) >= Date.parse(plan.deleteAfter)) {
        this.ctx.storage.kv.delete(planKey(plan.planId))
        this.ctx.storage.kv.put("profile", {
          ...profile,
          planCount: 0,
          revision: profile.revision + 1,
          updatedAt: now,
        })
        return Object.freeze({
          ok: true,
          changed: true,
          deleted: true,
          nextAlarm: null,
        })
      }
      return Object.freeze({
        ok: true,
        changed: false,
        nextAlarm: nextRetentionAlarm(plan),
      })
    })
    if (!result.ok) return result
    if (result.nextAlarm) {
      await this.ctx.storage.setAlarm(Date.parse(result.nextAlarm))
    } else {
      await this.ctx.storage.deleteAlarm()
    }
    return result
  }

  async alarm() {
    await this.expireOwnerPlans(new Date().toISOString())
  }

  prepareOwnerDeletion(command) {
    if (!validOwnerMutation(command)) return failure("invalid_account_deletion")
    return this.ctx.storage.transactionSync(() => {
      const profile = this.ctx.storage.kv.get("profile")
      if (!profile) return failure("profile_not_found")
      if (profile.identityDigest !== command.identityDigest) {
        return failure("forbidden")
      }
      const existing = existingMutation(this.ctx.storage, command)
      if (existing) return existing
      if (profile.status !== "active") return failure("profile_not_active")
      if (profile.revision !== command.expectedRevision) {
        return failure("revision_conflict")
      }
      const deletingProfile = {
        ...profile,
        public: false,
        discoverable: false,
        status: "deleting",
        revision: profile.revision + 1,
        updatedAt: command.now,
      }
      this.ctx.storage.kv.put("profile", deletingProfile)
      const result = Object.freeze({
        ok: true,
        idempotent: false,
        profile: deletingProfile,
      })
      storeMutation(this.ctx.storage, command, result)
      return result
    })
  }

  async finalizeOwnerDeletion(command) {
    if (
      !command ||
      !DIGEST_PATTERN.test(command.operationDigest) ||
      !DIGEST_PATTERN.test(command.requestDigest) ||
      !validIsoDate(command.now)
    ) {
      return failure("invalid_account_deletion")
    }
    const tombstone = this.ctx.storage.kv.get("account-deleted")
    if (tombstone) {
      return tombstone.operationDigest === command.operationDigest &&
        tombstone.requestDigest === command.requestDigest
        ? Object.freeze({
            ok: true,
            idempotent: true,
            deletedAt: tombstone.deletedAt,
          })
        : failure("idempotency_conflict")
    }
    const profile = this.ctx.storage.kv.get("profile")
    if (profile && profile.status !== "deleting") {
      return failure("profile_not_deleting")
    }
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
    this.ctx.storage.kv.put("account-deleted", {
      schemaVersion: 1,
      operationDigest: command.operationDigest,
      requestDigest: command.requestDigest,
      deletedAt: command.now,
    })
    return Object.freeze({
      ok: true,
      idempotent: false,
      deletedAt: command.now,
    })
  }

  exportOwnerState(identityDigest) {
    if (!DIGEST_PATTERN.test(identityDigest)) return failure("invalid_identity")
    const owner = ownerProfile(this.ctx.storage, identityDigest)
    if (!owner.ok) return owner
    if (this.ctx.storage.kv.get(TRIP_MARKER))
      return {
        ok: true,
        profile: owner.profile,
        pins: tripPins(this.ctx.storage),
        wishes: Array.from(
          this.ctx.storage.kv.list({ prefix: "wish:" }),
          ([, value]) => value
        ),
        plans: [],
        trips: storedTrips(this.ctx.storage),
        tripUpgrade: {
          ...this.ctx.storage.kv.get(TRIP_MARKER),
          rollbackSnapshot: this.ctx.storage.kv.get(TRIP_BACKUP) || null,
        },
        atlasImage: this.ctx.storage.kv.get(ATLAS_IMAGE_KEY) || null,
      }
    const pins = Array.from(
      this.ctx.storage.kv.list({ prefix: "pin:", limit: 301 }),
      ([, value]) => value
    )
    if (pins.length > 300) return failure("pin_limit_inconsistent")
    const wishes = Array.from(
      this.ctx.storage.kv.list({ prefix: "wish:", limit: 251 }),
      ([, value]) => value
    )
    if (
      wishes.length > 250 ||
      wishes.some(value => !validStoredWish(value)) ||
      wishes.length !== (owner.profile.wishCount || 0)
    ) {
      return failure("wishlist_inconsistent")
    }
    const plans = Array.from(
      this.ctx.storage.kv.list({ prefix: "plan:", limit: 2 }),
      ([, value]) => value
    )
    if (
      plans.length > 1 ||
      plans.some(value => !validStoredPlan(value)) ||
      plans.length !== (owner.profile.planCount || 0)
    ) {
      return failure("plans_inconsistent")
    }
    const atlasImage = this.ctx.storage.kv.get(ATLAS_IMAGE_KEY) || null
    if (atlasImage && !validStoredAtlasImage(atlasImage)) {
      return failure("atlas_image_inconsistent")
    }
    return Object.freeze({
      ok: true,
      profile: owner.profile,
      pins,
      wishes,
      plans,
      atlasImage,
    })
  }

  getPublicAtlas() {
    const profile = this.ctx.storage.kv.get("profile")
    if (
      !profile ||
      profile.status !== "active" ||
      profile.public !== true ||
      (profile.pinCount || 0) < 1
    ) {
      return failure("public_atlas_not_found")
    }
    const upgraded = Boolean(this.ctx.storage.kv.get(TRIP_MARKER))
    const pins = upgraded
      ? tripPins(this.ctx.storage, { publicOnly: true })
      : Array.from(
          this.ctx.storage.kv.list({ prefix: "pin:", limit: 301 }),
          ([, value]) => value
        )
    if (
      pins.length > 300 ||
      (!upgraded && pins.length !== profile.pinCount) ||
      pins.some(
        pin =>
          !validStoredPinPlace(pin) ||
          (pin.memory !== undefined && !isNormalizedPinMemory(pin.memory))
      )
    ) {
      return failure("public_atlas_inconsistent")
    }
    if (!pins.length) return failure("public_atlas_not_found")
    const atlasImage = this.ctx.storage.kv.get(ATLAS_IMAGE_KEY) || null
    if (atlasImage && !validStoredAtlasImage(atlasImage)) {
      return failure("public_atlas_inconsistent")
    }
    return Object.freeze({
      ok: true,
      profile: Object.freeze({
        handle: profile.handle,
        displayName: profile.displayName,
        ...(publicInstagramHandle(profile.instagramHandle)
          ? { instagramHandle: profile.instagramHandle }
          : {}),
      }),
      pins: Object.freeze(
        pins.map(pin =>
          Object.freeze({
            placeId: pin.placeId,
            ...(pin.placeSnapshot ? { placeSnapshot: pin.placeSnapshot } : {}),
            ...(pin.customPlace ? { customPlace: pin.customPlace } : {}),
            ...publicPinTiming(pin),
            ...(pin.memory ? { memory: pin.memory } : {}),
          })
        )
      ),
      atlasImage: atlasImage?.publicProfile === true ? atlasImage : null,
    })
  }

  getPublicAtlasDiscovery() {
    const profile = this.ctx.storage.kv.get("profile")
    if (
      !profile ||
      profile.status !== "active" ||
      profile.public !== true ||
      profile.discoverable !== true ||
      (profile.pinCount || 0) < 1
    ) {
      return failure("public_atlas_not_discoverable")
    }
    const atlasImage = this.ctx.storage.kv.get(ATLAS_IMAGE_KEY) || null
    if (atlasImage && !validStoredAtlasImage(atlasImage)) {
      return failure("public_atlas_inconsistent")
    }
    const publicPinCount = this.ctx.storage.kv.get(TRIP_MARKER)
      ? tripPins(this.ctx.storage, { publicOnly: true }).length
      : profile.pinCount
    if (!publicPinCount) return failure("public_atlas_not_discoverable")
    return Object.freeze({
      ok: true,
      profile: Object.freeze({
        handle: profile.handle,
        displayName: profile.displayName,
        pinCount: publicPinCount,
        updatedAt: profile.publicAtlasUpdatedAt || profile.updatedAt,
      }),
      atlasImage: atlasImage?.publicProfile === true ? atlasImage : null,
    })
  }

  getPublicAtlasImage() {
    const atlas = this.getPublicAtlas()
    if (!atlas.ok) return atlas
    if (!atlas.atlasImage) return failure("public_atlas_image_not_found")
    return Object.freeze({ ok: true, atlasImage: atlas.atlasImage })
  }

  inspectProvisioning(command) {
    if (!validProfileInitialization(command)) {
      return failure("invalid_profile_initialization")
    }
    const profile = this.ctx.storage.kv.get("profile")
    if (profile) {
      const matches =
        profile.userId === command.userId &&
        profile.identityDigest === command.identityDigest &&
        profile.handle === command.handle &&
        profile.displayName === command.displayName &&
        profile.acceptedTermsVersion === command.termsVersion &&
        profile.acceptedPrivacyVersion === command.privacyVersion
      return matches
        ? Object.freeze({ ok: true, state: "initialized" })
        : failure("profile_initialization_conflict")
    }
    const abandoned = this.ctx.storage.kv.get("provisioning-abandoned")
    return Object.freeze({
      ok: true,
      state: abandoned ? "abandoned" : "absent",
    })
  }

  abandonUninitializedProfile(command) {
    if (
      !validProfileInitialization(command) ||
      !DIGEST_PATTERN.test(command.operatorIdentityDigest) ||
      !DIGEST_PATTERN.test(command.reconciliationOperationDigest) ||
      !DIGEST_PATTERN.test(command.operationDigest)
    ) {
      return failure("invalid_profile_initialization")
    }

    return this.ctx.storage.transactionSync(() => {
      if (this.ctx.storage.kv.get("profile")) {
        return failure("profile_already_initialized")
      }
      const existing = this.ctx.storage.kv.get("provisioning-abandoned")
      if (existing) {
        const sameRegistration =
          existing.userId === command.userId &&
          existing.identityDigest === command.identityDigest &&
          existing.operationDigest === command.operationDigest
        return sameRegistration
          ? Object.freeze({ ok: true, idempotent: true, state: "abandoned" })
          : failure("profile_abandonment_conflict")
      }

      this.ctx.storage.kv.put("provisioning-abandoned", {
        schemaVersion: 1,
        userId: command.userId,
        identityDigest: command.identityDigest,
        operationDigest: command.operationDigest,
        abandonedAt: command.now,
        abandonedByDigest: command.operatorIdentityDigest,
        reconciliationOperationDigest: command.reconciliationOperationDigest,
      })
      return Object.freeze({
        ok: true,
        idempotent: false,
        state: "abandoned",
      })
    })
  }
}
