// Confirmed top-level destination from the owner-supplied travel context.
// The multi-country Europe material is one Journey, not a top-level Place for
// every route stop. Its lower-level destinations remain unregistered until the
// Journey is expanded intentionally.
export const nextDestinationPlaces = Object.freeze([
  {
    id: "miami-south-beach",
    name: "Miami Beach",
    coordinates: null,
    parentPlaceId: null,
    countryCode: "US",
    regionCode: "US-FL",
    category: "destination",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "A relaxed family beach series shaped by walks along the water, boardwalk scenes, sand, and candid moments.",
    externalLinks: {},
    verificationNotes:
      "Top-level destination only. Exact dates, lodging, businesses, coordinates, and individual attractions remain unverified.",
  },
])
