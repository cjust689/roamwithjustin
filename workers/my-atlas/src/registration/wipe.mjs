import { RegistrationValidationError } from "./contracts.mjs"
import { REGISTRY_OBJECT_NAME } from "./service.mjs"
import { deleteMyAccount } from "../account/service.mjs"
import { OperatorServiceError } from "./operator.mjs"

export async function wipeMyAtlasAccounts({ environment, body }) {
  if (
    !body ||
    Object.keys(body).some(key => !["apply", "confirmation"].includes(key)) ||
    typeof body.apply !== "boolean" ||
    (body.apply && body.confirmation !== "WIPE ALL USER MY ATLAS ACCOUNTS")
  ) {
    throw new RegistrationValidationError(
      "Invalid global account wipe request."
    )
  }
  const registry = environment.MY_ATLAS_REGISTRY.getByName(REGISTRY_OBJECT_NAME)
  const batch = await registry.getGlobalWipeBatch()
  if (!batch?.ok) throw new OperatorServiceError()
  if (!body.apply) {
    return {
      scope: "user-my-atlas-accounts",
      handles: [
        ...new Set([
          ...(batch.task ? [batch.task.handle] : []),
          ...batch.registrations.map(value => value.handle),
        ]),
      ],
      interruptedDeletion: Boolean(batch.task),
      deleted: false,
    }
  }
  let task = batch.task
  if (!task) {
    const target = batch.registrations[0]
    if (!target) return { complete: true, deleted: false }
    const registration = await registry.getRegistrationForReconciliation(
      target.userId
    )
    if (!registration?.ok) throw new OperatorServiceError()
    const user = environment.MY_ATLAS_USERS.getByName(target.userId)
    const owner = await user.getOwnerProfile(
      registration.registration.identityDigest
    )
    if (!owner?.ok) throw new OperatorServiceError()
    const prepared = await registry.prepareGlobalWipeTask({
      userId: target.userId,
      expectedRevision: owner.profile.revision,
    })
    if (!prepared?.ok) throw new OperatorServiceError()
    task = prepared.task
  }
  let result
  try {
    result = await deleteMyAccount({
      environment,
      identity: task.identity,
      input: {
        expectedRevision: task.expectedRevision,
        idempotencyKey: task.idempotencyKey,
        confirmation: "DELETE MY ATLAS",
      },
    })
  } catch (error) {
    if (error?.code === "revision_conflict") {
      await registry.finishGlobalWipeTask(task.userId)
    }
    throw error
  }
  await registry.finishGlobalWipeTask(task.userId)
  return { complete: false, deleted: result.deleted, handle: task.handle }
}
