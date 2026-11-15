function destinationVisit(placeId, description) {
  return {
    id: `utah-2026-${placeId}`,
    legacyId: placeId,
    placeId,
    date: null,
    visitStatus: "visited",
    evidenceStatus: "confirmed",
    type: "destination",
    description,
    summary: description,
    notes: [],
    media: [],
    socialLinks: [],
  }
}

export const utah2026Journey = Object.freeze({
  id: "utah-2026",
  year: 2026,
  slug: "utah-2026",
  title: "Utah (2026)",
  publicationStatus: "coming-soon",
  evidenceStatus: "confirmed",
  dateRange: {
    start: null,
    end: null,
    label: "2026",
  },
  hero: null,
  fullImage: null,
  gallery: [],
  description:
    "A separate Utah journey with two days at Zion National Park followed by five days skiing and snowboarding in Park City.",
  duration: "Seven days",
  audience: "",
  costLevel: "",
  bestTimeToGo: "",
  gearHighlights: [],
  travelNotes: [],
  tips: [],
  lodging: [],
  visits: [
    destinationVisit(
      "zion-national-park",
      "Two days at Zion National Park begin the trip before the route turns north toward Park City."
    ),
    destinationVisit(
      "park-city",
      "Five days in Park City center the rest of the trip on skiing and snowboarding."
    ),
  ],
  days: [],
  socialLinks: [],
  featuredMedia: [],
  atlasNotes: {},
  relatedPlaceIds: ["utah", "zion-national-park", "park-city"],
  verificationNotes:
    "Owner-confirmed two-day Zion then five-day Park City structure. Exact calendar dates, trails, resort details, lodging, and media remain unverified. Keep separate from Utah winter 2025 and the planned Hanksville idea.",
})
