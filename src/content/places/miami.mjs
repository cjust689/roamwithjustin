// Confirmed Miami-area geography from the creator's firsthand trip account.
// Coordinates are public feature references, never private lodging or capture
// positions. The uncertain airboat operator and unnamed raccoon island remain
// deliberately unregistered.
export const miamiPlaces = Object.freeze([
  {
    id: "miami-south-beach",
    name: "Miami Beach",
    coordinates: [-80.1353006, 25.7929198],
    parentPlaceId: null,
    countryCode: "US",
    regionCode: "US-FL",
    category: "destination",
    evidenceStatus: "confirmed",
    coordinatePrecision: "city",
    description:
      "The familiar face of the trip: South Beach streets, cooler January mornings, family beach time, and a city that can feel like a film set until ordinary life walks into the frame.",
    externalLinks: {},
    verificationNotes:
      "The city coordinate is a public Miami Beach reference point, not the Airbnb, a restaurant, or a media capture position.",
  },
  {
    id: "south-pointe-park",
    name: "South Pointe Park",
    coordinates: [-80.1331012, 25.7656549],
    parentPlaceId: "miami-south-beach",
    countryCode: "US",
    regionCode: "US-FL",
    category: "waterfront park",
    evidenceStatus: "confirmed",
    coordinatePrecision: "park",
    description:
      "A quieter edge of South Beach for a solo sunrise and a family walk to the pier, where the water kept everyone looking for sharks and other sea life.",
    externalLinks: {
      official:
        "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/south-pointe-park/",
    },
    verificationNotes:
      "Park identity, address, and public feature coordinate were checked against City of Miami Beach and public U.S. geographic records. Looking for wildlife is not treated as a confirmed sighting.",
  },
  {
    id: "everglades",
    name: "The Everglades",
    coordinates: [-80.7667, 26.0833],
    parentPlaceId: null,
    countryCode: "US",
    regionCode: "US-FL",
    category: "wetland region",
    evidenceStatus: "confirmed",
    coordinatePrecision: "region",
    description:
      "The broad wetland setting for the trip's airboat outing, with wind, an engaging guide, a delighted five year old, and alligators much closer than expected.",
    externalLinks: {},
    verificationNotes:
      "The coordinate is the USGS/GNIS reference for the Everglades geographic region. It provides regional Atlas context only and is not the airboat launch, tour route, operator, or a national-park boundary claim.",
  },
  {
    id: "shark-valley",
    name: "Shark Valley",
    coordinates: [-80.7669472, 25.7576667],
    parentPlaceId: "everglades",
    countryCode: "US",
    regionCode: "US-FL",
    category: "national park district",
    evidenceStatus: "confirmed",
    coordinatePrecision: "visitor-center",
    description:
      "The precisely known Everglades stop is a family bike ride on the Shark Valley path, with resting alligators nearby and very little relief from the building heat.",
    externalLinks: {
      official: "https://www.nps.gov/ever/planyourvisit/svdirections.htm",
    },
    verificationNotes:
      "The coordinate is the NPS-published Shark Valley Visitor Center reference. It does not identify the separate airboat operator or tour route.",
  },
  {
    id: "oleta-river-state-park",
    name: "Oleta River State Park",
    coordinates: [-80.14, 25.91889],
    parentPlaceId: null,
    countryCode: "US",
    regionCode: "US-FL",
    category: "state park",
    evidenceStatus: "confirmed",
    coordinatePrecision: "park",
    description:
      "A different side of the Miami area, reached by rented kayak through mangroves and remembered for an unexpected raccoon encounter on an island.",
    externalLinks: {
      official: "https://www.floridastateparks.org/OletaRiver",
    },
    verificationNotes:
      "The park identity and public park reference are verified. The island's official name, exact paddle route, rental operator, and raccoon location remain unregistered.",
  },
])
