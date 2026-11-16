import {
  getExperienceMoments,
  getJourneyExperiences,
} from "../experiences/index.mjs"
import { getExperiencePublishedMedia } from "./media.mjs"

export function getJourneyExperienceViews(journeyId) {
  return getJourneyExperiences(journeyId)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
    )
    .map(experience => ({
      id: experience.id,
      slug: experience.slug,
      title: experience.title,
      summary: experience.summary || "",
      placeId: experience.placeId,
      visitId: experience.visitId,
      moments: getExperienceMoments(experience.id).map(moment => ({
        id: moment.id,
        title: moment.title,
        notes: moment.notes || "",
        travelDate: moment.travelDate || "",
        media: getExperiencePublishedMedia(experience.id, moment.mediaAssetIds),
      })),
    }))
}
