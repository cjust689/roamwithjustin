function destinationVisit(journeyId, placeId, evidenceStatus = "confirmed") {
  return {
    id: `${journeyId}-${placeId}`,
    legacyId: placeId,
    placeId,
    date: null,
    visitStatus: "visited",
    evidenceStatus,
    type: "destination",
    description: "",
    summary: "",
    notes: [],
    media: [],
    socialLinks: [],
  }
}

// Public Journey scaffolds expose only the two requested trip-level entries.
// Europe is one multi-country Journey; its individual route stops remain in
// the travel reference until lower-level destination records are requested.
export const nextDestinationJourneys = Object.freeze([
  {
    id: "europe-summer-2026",
    slug: "europe",
    title: "Europe",
    publicationStatus: "coming-soon",
    evidenceStatus: "confirmed",
    dateRange: {
      start: "2026-06-25",
      end: "2026-07-25",
      label: "June–July 2026",
    },
    hero: null,
    fullImage: null,
    gallery: [],
    description:
      "A month-long family journey through England, Amsterdam, Croatia, Marrakech and Agafay, and Spain's southern cities before Madrid.",
    duration: "One month",
    audience: "",
    costLevel: "",
    bestTimeToGo: "",
    gearHighlights: [],
    travelNotes: [],
    tips: [],
    lodging: [],
    visits: [],
    days: [],
    socialLinks: [],
    featuredMedia: [],
    atlasNotes: {},
    relatedPlaceIds: [],
    verificationNotes:
      "Trip-level scaffold only. The named route remains descriptive context, not a set of registered Place or Visit records. Do not infer coordinates, venues, operators, detailed dates, or media associations.",
  },
  {
    id: "miami-south-beach",
    slug: "miami",
    title: "Miami Beach, Florida",
    publicationStatus: "coming-soon",
    evidenceStatus: "confirmed",
    dateRange: {
      start: null,
      end: null,
      label: null,
    },
    hero: null,
    fullImage: null,
    gallery: [],
    description:
      "An easy family day by the water, remembered through beach walks, boardwalk scenes, play in the sand, and candid moments.",
    duration: "",
    audience: "",
    costLevel: "",
    bestTimeToGo: "",
    gearHighlights: [],
    travelNotes: [],
    tips: [],
    lodging: [],
    visits: [destinationVisit("miami-south-beach", "miami-south-beach")],
    days: [],
    socialLinks: [],
    featuredMedia: [],
    atlasNotes: {},
    relatedPlaceIds: ["miami-south-beach"],
    verificationNotes:
      "Top-level destination scaffold only. Exact dates, coordinates, lodging, businesses, attractions, and media associations remain unverified.",
  },
])
