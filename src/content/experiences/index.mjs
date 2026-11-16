import { createIdRegistry } from "../contracts.mjs"
import generated from "../editorial/generated/data.js"
import { getJourney, getJourneyVisitById } from "../journeys/index.mjs"

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

if (generated.schemaVersion !== 1) {
  throw new Error(
    `Generated editorial content uses schema version ${generated.schemaVersion}; expected 1`
  )
}

const experienceRegistry = createIdRegistry(
  generated.experiences || [],
  "Experience registry"
)
const momentRegistry = createIdRegistry(
  generated.moments || [],
  "Moment registry"
)

for (const experience of experienceRegistry.records) {
  const journey = getJourney(experience.journeyId)
  if (!idPattern.test(experience.slug || "")) {
    throw new Error(`Experience "${experience.id}" has an invalid slug`)
  }
  if (!journey) {
    throw new Error(
      `Experience "${experience.id}" references unknown Journey "${experience.journeyId}"`
    )
  }
  if (!experience.title || !["draft", "published"].includes(experience.visibility)) {
    throw new Error(`Experience "${experience.id}" has invalid public identity`)
  }
  if ((experience.placeId === null) !== (experience.visitId === null)) {
    throw new Error(
      `Experience "${experience.id}" must declare Place and Visit together`
    )
  }
  if (experience.visitId) {
    const visit = getJourneyVisitById(experience.journeyId, experience.visitId)
    if (!visit || visit.placeId !== experience.placeId) {
      throw new Error(
        `Experience "${experience.id}" has an invalid Place or Visit association`
      )
    }
  }
}

const postIds = new Set()
for (const moment of momentRegistry.records) {
  if (!experienceRegistry.byId[moment.experienceId]) {
    throw new Error(
      `Moment "${moment.id}" references unknown Experience "${moment.experienceId}"`
    )
  }
  if (!moment.postId || postIds.has(moment.postId)) {
    throw new Error(`Moment "${moment.id}" has a missing or duplicate Post ID`)
  }
  postIds.add(moment.postId)
  if (!moment.title || !["draft", "published"].includes(moment.visibility)) {
    throw new Error(`Moment "${moment.id}" has invalid public identity`)
  }
}

export const experienceRecords = experienceRegistry.records
export const experiencesById = experienceRegistry.byId
export const momentRecords = momentRegistry.records
export const momentsById = momentRegistry.byId
export const editorialPublicationBatches = Object.freeze([
  ...(generated.batches || []),
])

export function getExperience(id) {
  return id ? experiencesById[id] || null : null
}

export function getMoment(id) {
  return id ? momentsById[id] || null : null
}

export function getJourneyExperiences(journeyId) {
  return experienceRecords.filter(
    experience =>
      experience.journeyId === journeyId && experience.visibility === "published"
  )
}

export function getExperienceMoments(experienceId) {
  return momentRecords
    .filter(
      moment =>
        moment.experienceId === experienceId &&
        moment.visibility === "published"
    )
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
    )
}
