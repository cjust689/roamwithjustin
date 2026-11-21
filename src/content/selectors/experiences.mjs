import {
  getExperienceMoments,
  getJourneyExperiences,
} from "../experiences/index.mjs"
import { getExperiencePublishedMedia, resolveMediaReference } from "./media.mjs"
import { getPartner } from "../partners/index.mjs"
import {
  EXPERIENCE_CATEGORIES,
  officialExperiencePartner,
} from "../experiences/curated-contract.mjs"

export function experienceCardView(experience) {
  return {
    id: experience.id,
    title: experience.title,
    summary: experience.summary,
    category: experience.category,
    image: experience.image,
    operator: experience.operator,
  }
}

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
      category: EXPERIENCE_CATEGORIES[experience.category] || "",
      operator: experience.partnerId
        ? officialExperiencePartner(getPartner(experience.partnerId))
        : null,
      image: experience.coverAssetId
        ? resolveMediaReference({ assetId: experience.coverAssetId })
        : getExperiencePublishedMedia(experience.id).find(
            media => media.kind === "image"
          ) || null,
      moments: getExperienceMoments(experience.id).map(moment => ({
        id: moment.id,
        title: moment.title,
        notes: moment.notes || "",
        travelDate: moment.travelDate || "",
        media: getExperiencePublishedMedia(experience.id, moment.mediaAssetIds),
      })),
    }))
}
