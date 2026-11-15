function destinationVisit(journeyId, placeId, evidenceStatus) {
  return {
    id: `${journeyId}-${placeId}`,
    legacyId: placeId,
    placeId,
    date: null,
    visitStatus: evidenceStatus === "confirmed" ? "visited" : "to-verify",
    evidenceStatus,
    type: "destination",
    description: "",
    summary: "",
    notes: [],
    media: [],
    socialLinks: [],
  }
}

// Canonical journey stubs behind the existing coming-soon cards.
export const upcomingJourneys = Object.freeze([
  {
    id: "north-georgia-2026",
    year: 2026,
    slug: "north-georgia-2026",
    legacySlugs: ["north-georgia"],
    title: "North Georgia, USA (2026)",
    publicationStatus: "coming-soon",
    evidenceStatus: "confirmed",
    dateRange: {
      start: null,
      end: null,
      label: "November 2026",
    },
    hero: {
      assetId: "image-nga-nga",
      role: "hero",
      alt: "North Georgia, USA cover photograph",
    },
    fullImage: {
      assetId: "image-nga-nga-full",
      role: "full",
      alt: "North Georgia, USA destination photograph",
    },
    gallery: [],
    description:
      "A quiet family getaway near Mineral Bluff, shaped by cabin evenings, woodland atmosphere, mountain scenery, and aerial photography.",
    duration: "",
    audience: "",
    costLevel: "",
    bestTimeToGo: "",
    gearHighlights: [],
    travelNotes: [],
    tips: [],
    lodging: [],
    visits: [
      destinationVisit(
        "north-georgia-2026",
        "north-georgia-blue-ridge",
        "confirmed"
      ),
    ],
    days: [],
    socialLinks: [],
    featuredMedia: [],
    atlasNotes: {},
    relatedPlaceIds: ["north-georgia-blue-ridge"],
    verificationNotes:
      "Preserve private lodging details and do not promote researched trails or eagle sightings to visited facts.",
  },
  {
    id: "hungary-2024",
    year: 2024,
    slug: "hungary-2024",
    legacySlugs: ["hungary"],
    title: "Hungary (2024)",
    publicationStatus: "coming-soon",
    evidenceStatus: "unverified",
    dateRange: {
      start: null,
      end: null,
      label: "2024",
    },
    hero: {
      assetId: "image-hungary-hungary",
      role: "hero",
      alt: "Hungary cover photograph",
    },
    fullImage: {
      assetId: "image-hungary-hungary-full",
      role: "full",
      alt: "Hungary destination photograph",
    },
    gallery: [],
    description: "",
    duration: "",
    audience: "",
    costLevel: "",
    bestTimeToGo: "",
    gearHighlights: [],
    travelNotes: [],
    tips: [],
    lodging: [],
    visits: [destinationVisit("hungary-2024", "hungary", "unverified")],
    days: [],
    socialLinks: [],
    featuredMedia: [],
    atlasNotes: {},
    relatedPlaceIds: ["hungary"],
    verificationNotes:
      "The creator confirmed the trip year as 2024. The existing card is retained without asserting exact dates, a route, or visit details.",
  },
])
