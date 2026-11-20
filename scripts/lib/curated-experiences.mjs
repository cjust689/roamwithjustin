import fs from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { validateCuratedExperiences } from "../../src/content/experiences/curated-contract.mjs"

export function compileCuratedExperiences(input, previous, context) {
  const errors = validateCuratedExperiences(input, {
    ...context,
    requireEvidence: true,
  })
  if (errors.length) throw new Error(errors.join("\n"))
  const publicFields = [
    "id",
    "slug",
    "journeyId",
    "visitId",
    "placeId",
    "title",
    "summary",
    "category",
    "firsthand",
    "partnerId",
    "coverAssetId",
    "visibility",
    "sortOrder",
    "disclosure",
    "sourceOwner",
  ]
  const records = input.experiences
    .map(record =>
      Object.fromEntries(
        publicFields
          .filter(field => record[field] !== undefined)
          .map(field => [field, record[field]])
      )
    )
    .sort(
      (left, right) =>
        left.journeyId.localeCompare(right.journeyId) ||
        left.sortOrder - right.sortOrder ||
        left.id.localeCompare(right.id)
    )
  const incomingIds = new Set(records.map(record => record.id))
  if (previous.experiences.some(record => !incomingIds.has(record.id)))
    throw new Error(
      "Missing existing experiences. Restore the rows and set visibility to draft to withdraw them."
    )
  const registry = { schemaVersion: 1, experiences: records }
  const publicErrors = validateCuratedExperiences(registry, context)
  if (publicErrors.length) throw new Error(publicErrors.join("\n"))
  const before = new Map(
    previous.experiences.map(record => [record.id, record])
  )
  const diff = records.map(record => ({
    id: record.id,
    change: !before.has(record.id)
      ? "added"
      : JSON.stringify(before.get(record.id)) === JSON.stringify(record)
        ? "unchanged"
        : record.visibility === "draft" &&
            before.get(record.id).visibility === "published"
          ? "withdrawn"
          : "changed",
  }))
  return {
    registry,
    diff,
    baseline: JSON.stringify(previous),
    serialized: JSON.stringify(registry, null, 2) + "\n",
  }
}

export async function publishCuratedExperiences(target, result) {
  const current = await fs.readFile(target, "utf8")
  if (current === result.serialized) return false
  if (JSON.stringify(JSON.parse(current)) !== result.baseline)
    throw new Error(
      "The registry changed after preview. Read it again before publishing."
    )
  const temporary = `${target}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, result.serialized, { flag: "wx" })
    await fs.rename(temporary, target)
  } finally {
    await fs.rm(temporary, { force: true })
  }
  return true
}
