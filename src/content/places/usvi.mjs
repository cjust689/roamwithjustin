// Canonical St. John geography for the USVI Journey.
// Coordinates are public feature centers, never a private lodging address.
export const usviPlaces = Object.freeze([
  {
    id: "us-virgin-islands",
    name: "U.S. Virgin Islands",
    coordinates: null,
    parentPlaceId: null,
    countryCode: "VI",
    regionCode: "VI",
    category: "territory",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "A Caribbean territory whose islands include St. John, St. Thomas, and St. Croix.",
    externalLinks: {},
    verificationNotes:
      "This territory record groups the Journey geography; the Atlas opens on St. John rather than an arbitrary territory-wide centerpoint.",
  },
  {
    id: "st-thomas",
    name: "St. Thomas",
    coordinates: null,
    parentPlaceId: "us-virgin-islands",
    countryCode: "VI",
    regionCode: "VI",
    category: "island",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "The arrival island for the St. John journey, connecting the airport, Charlotte Amalie harbor views, and the ferry departure from Red Hook.",
    externalLinks: {
      maps: "https://www.google.com/maps?q=St.+Thomas,+USVI",
    },
    verificationNotes:
      "The drive across St. Thomas is creator-confirmed; no arbitrary island centerpoint is needed for the current Atlas story.",
  },
  {
    id: "cyril-e-king-airport",
    name: "Cyril E. King Airport",
    coordinates: [-64.9733611, 18.3373056],
    parentPlaceId: "st-thomas",
    countryCode: "VI",
    regionCode: "VI",
    category: "airport",
    evidenceStatus: "confirmed",
    coordinatePrecision: "airport",
    description:
      "St. Thomas's public airport and the first island-scale contrast after departing Atlanta.",
    externalLinks: {
      official: "https://www.viport.com/cekastt",
      maps: "https://www.google.com/maps?q=Cyril+E.+King+Airport,+St.+Thomas",
    },
    verificationNotes:
      "Airport identity and public reference point checked against Virgin Islands Port Authority and FAA records.",
  },
  {
    id: "red-hook-ferry-terminal",
    name: "Red Hook Ferry Terminal",
    coordinates: [-64.84917, 18.32669],
    parentPlaceId: "st-thomas",
    countryCode: "VI",
    regionCode: "VI",
    category: "ferry-terminal",
    evidenceStatus: "confirmed",
    coordinatePrecision: "terminal",
    description:
      "The east-St. Thomas passenger-ferry departure point for the short crossing into Cruz Bay.",
    externalLinks: {
      official: "https://dpw.vi.gov/ferries/",
      maps: "https://www.google.com/maps?q=Red+Hook+Ferry+Terminal,+St.+Thomas,+USVI",
    },
    verificationNotes:
      "Terminal identity and public map point checked against Virgin Islands government ferry information and NPS geographic material.",
  },
  {
    id: "st-john",
    name: "St. John",
    coordinates: [-64.7495816, 18.3396764],
    parentPlaceId: "us-virgin-islands",
    countryCode: "VI",
    regionCode: "VI",
    category: "island",
    evidenceStatus: "confirmed",
    coordinatePrecision: "island",
    description:
      "A compact Caribbean island shaped by protected coves, steep green hills, harbor towns, and the beaches of Virgin Islands National Park.",
    externalLinks: {
      official: "https://www.nps.gov/viis/index.htm",
      maps: "https://www.google.com/maps?q=St.+John,+USVI",
    },
    verificationNotes:
      "Public island center checked against NPS and public geographic references; it is not a creator-supplied GPS point.",
  },
  {
    id: "cruz-bay",
    name: "Cruz Bay",
    coordinates: [-64.79413, 18.33595],
    parentPlaceId: "st-john",
    countryCode: "VI",
    regionCode: "VI",
    category: "harbor-town",
    evidenceStatus: "confirmed",
    coordinatePrecision: "town",
    description:
      "St. John's ferry harbor and the transition point between the trip's air travel and island arrival.",
    externalLinks: {
      maps: "https://www.google.com/maps?q=Cruz+Bay,+St.+John,+USVI",
    },
    verificationNotes:
      "The public map point uses a USVI DPNR Cruz Bay monitoring coordinate near the harbor, not a precise arrival photo location.",
  },
  {
    id: "great-cruz-bay",
    name: "Great Cruz Bay",
    coordinates: [-64.78803, 18.32295],
    parentPlaceId: "st-john",
    countryCode: "VI",
    regionCode: "VI",
    category: "bay",
    evidenceStatus: "confirmed",
    coordinatePrecision: "bay",
    description:
      "A sheltered bay on St. John's southwest coast, used as the public geographic context for the trip's villa stay.",
    externalLinks: {
      maps: "https://www.google.com/maps?q=Great+Cruz+Bay,+St.+John,+USVI",
    },
    verificationNotes:
      "The Atlas uses a broad USVI DPNR bay coordinate and does not expose or infer the villa's street address.",
  },
  {
    id: "maho-bay",
    name: "Maho Bay",
    coordinates: [-64.7484706, 18.3566202],
    parentPlaceId: "st-john",
    countryCode: "VI",
    regionCode: "VI",
    category: "beach",
    evidenceStatus: "confirmed",
    coordinatePrecision: "beach",
    description:
      "A broad north-shore bay within Virgin Islands National Park, known here through the family's relaxed beach day.",
    externalLinks: {
      official: "https://www.nps.gov/viis/planyourvisit/maps.htm",
      maps: "https://www.google.com/maps?q=Maho+Bay,+St.+John,+USVI",
    },
    verificationNotes:
      "The beach coordinate is a public USGS feature point; wildlife encounters remain Journey observations, not a Place guarantee.",
  },
  {
    id: "hermit-crab-island",
    name: "Hermit Crab Island",
    coordinates: null,
    parentPlaceId: "us-virgin-islands",
    countryCode: "VI",
    regionCode: "VI",
    category: "informal-charter-stop",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "A creator-confirmed boat-day stop preserved under Justin's nickname, Hermit Crab Island, while its formal geographic identity is resolved.",
    externalLinks: {},
    verificationNotes:
      "Do not create an Atlas pin or alias this to Cas Cay or another island without creator or itinerary confirmation.",
  },
  {
    id: "lovango-cay",
    name: "Lovango Cay",
    coordinates: [-64.80375, 18.3624533],
    parentPlaceId: "us-virgin-islands",
    countryCode: "VI",
    regionCode: "VI",
    category: "cay",
    evidenceStatus: "confirmed",
    coordinatePrecision: "island",
    description:
      "A small cay northwest of St. John, visited during the charter day for lunch and time to relax.",
    externalLinks: {
      maps: "https://www.google.com/maps?q=Lovango+Cay,+USVI",
    },
    verificationNotes:
      "The visit to Lovango is creator-confirmed. The Atlas point represents the cay broadly and does not assert a specific restaurant or beach-club venue.",
  },
  {
    id: "trunk-bay",
    name: "Trunk Bay",
    coordinates: [-64.77, 18.35202],
    parentPlaceId: "st-john",
    countryCode: "VI",
    regionCode: "VI",
    category: "beach",
    evidenceStatus: "confirmed",
    coordinatePrecision: "bay",
    description:
      "A north-shore bay in Virgin Islands National Park that anchors the trip's family and underwater chapter.",
    externalLinks: {
      official: "https://www.nps.gov/viis/planyourvisit/maps.htm",
      maps: "https://www.google.com/maps?q=Trunk+Bay,+St.+John,+USVI",
    },
    verificationNotes:
      "The public map point uses a USVI DPNR Trunk Bay monitoring coordinate; exact photo positions will come from reviewed media, not embedded GPS.",
  },
  {
    id: "cinnamon-bay",
    name: "Cinnamon Bay",
    coordinates: [-64.75787, 18.35342],
    parentPlaceId: "st-john",
    countryCode: "VI",
    regionCode: "VI",
    category: "beach",
    evidenceStatus: "confirmed",
    coordinatePrecision: "bay",
    description:
      "A north-shore bay and beach within Virgin Islands National Park, visited as its own day chapter.",
    externalLinks: {
      official: "https://www.nps.gov/viis/planyourvisit/maps.htm",
      maps: "https://www.google.com/maps?q=Cinnamon+Bay,+St.+John,+USVI",
    },
    verificationNotes:
      "The public map point uses a USVI DPNR Cinnamon Bay monitoring coordinate.",
  },
  {
    id: "waterlemon-cay",
    name: "Waterlemon Cay",
    coordinates: [-64.72347, 18.3668977],
    parentPlaceId: "st-john",
    countryCode: "VI",
    regionCode: "VI",
    category: "island-outing",
    evidenceStatus: "confirmed",
    coordinatePrecision: "island",
    description:
      "A small cay off St. John's northeast shore that provided the trip's more involved walk-and-water outing.",
    externalLinks: {
      official: "https://www.nps.gov/viis/planyourvisit/maps.htm",
      maps: "https://www.google.com/maps?q=Waterlemon+Cay,+St.+John,+USVI",
    },
    verificationNotes:
      "The public cay center is based on USGS/GeoNames geographic data. The Journey deliberately makes no unverified trail-distance or snorkeling claim.",
  },
])
