// Confirmed geographic stops from the Europe 2026 Journey. These are bounded
// Place records for Atlas discovery; venue, attraction, and experience detail
// remains absent until the supporting story or media is verified.
export const europePlaces = Object.freeze([
  {
    id: "europe",
    name: "Europe",
    coordinates: [10, 51],
    parentPlaceId: null,
    countryCode: null,
    regionCode: null,
    category: "continent",
    evidenceStatus: "confirmed",
    coordinatePrecision: "continent",
    description:
      "A month-long family route through England, the Netherlands, Croatia, Morocco, and Spain.",
    externalLinks: {},
    verificationNotes:
      "The Atlas root uses the OpenStreetMap continent coordinate as a map anchor, not as a visited stop.",
  },
  {
    id: "portsmouth-england",
    name: "Portsmouth",
    coordinates: [-1.109484, 50.8004657],
    parentPlaceId: "europe",
    countryCode: "GB",
    regionCode: "GB-ENG",
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "attraction-area",
    description:
      "The England leg included a family visit centered on Portsmouth's historic dockyard and maritime architecture.",
    externalLinks: {},
    verificationNotes:
      "The Atlas pin uses the geocoded Portsmouth Historic Dockyard area. Individual ships and exhibits remain future content.",
  },
  {
    id: "new-forest-england",
    name: "New Forest",
    coordinates: [-1.5956844, 50.8557268],
    parentPlaceId: "europe",
    countryCode: "GB",
    regionCode: "GB-ENG",
    category: "national-park",
    evidenceStatus: "confirmed",
    coordinatePrecision: "protected-area",
    description:
      "A quieter England stay shaped by woodland, pasture, streams, free-roaming ponies, and time with extended family.",
    externalLinks: {},
    verificationNotes:
      "The park-level coordinate avoids publishing the private stay or an inferred animal location.",
  },
  {
    id: "harrogate-england",
    name: "Harrogate",
    coordinates: [-1.5391039, 53.9921491],
    parentPlaceId: "europe",
    countryCode: "GB",
    regionCode: "GB-ENG",
    category: "town",
    evidenceStatus: "strongly-indicated",
    coordinatePrecision: "town",
    description:
      "Harrogate carries the England route north between the New Forest and York chapters.",
    externalLinks: {},
    verificationNotes:
      "Route presence is strongly indicated. Do not add attractions, lodging, or media without further evidence.",
  },
  {
    id: "york-england",
    name: "York",
    coordinates: [-1.0743052, 53.9656579],
    parentPlaceId: "europe",
    countryCode: "GB",
    regionCode: "GB-ENG",
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "city",
    description:
      "Historic streets and a memorable street performance made York a distinct stop during the England leg.",
    externalLinks: {},
    verificationNotes:
      "The city visit is confirmed; performer identity and individual venues remain unverified.",
  },
  {
    id: "amsterdam-netherlands",
    name: "Amsterdam",
    coordinates: [4.8924534, 52.3730796],
    parentPlaceId: "europe",
    countryCode: "NL",
    regionCode: null,
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "city",
    description:
      "A city chapter moving between quiet canals, layered architecture, street-level energy, and views from above.",
    externalLinks: {},
    verificationNotes:
      "Canals and rooftop coverage are confirmed; lodging, operators, and planned-only outings remain excluded.",
  },
  {
    id: "split-croatia",
    name: "Split",
    coordinates: [16.4399659, 43.5116383],
    parentPlaceId: "europe",
    countryCode: "HR",
    regionCode: null,
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "city",
    description:
      "An Adriatic base for waterfront scenes, historic streets, coastal travel, and days spent moving across the water.",
    externalLinks: {},
    verificationNotes:
      "The city is confirmed. Lodging, operators, island stops, and drone capture positions remain separate future records.",
  },
  {
    id: "krka-national-park",
    name: "Krka National Park",
    coordinates: [15.9785288, 43.9189188],
    parentPlaceId: "europe",
    countryCode: "HR",
    regionCode: null,
    category: "national-park",
    evidenceStatus: "strongly-indicated",
    coordinatePrecision: "protected-area",
    description:
      "A waterfall and nature counterpoint to the coast during the Croatia portion of the journey.",
    externalLinks: {},
    verificationNotes:
      "Park-level coverage is confirmed or strongly indicated; the entrance, trails, and waterfalls require verification.",
  },
  {
    id: "marrakech-morocco",
    name: "Marrakech",
    coordinates: [-7.9891608, 31.6258257],
    parentPlaceId: "europe",
    countryCode: "MA",
    regionCode: null,
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "city",
    description:
      "A city of intimate riad spaces, Medina streets, architectural detail, and changing rhythms between busy and quiet moments.",
    externalLinks: {},
    verificationNotes:
      "The city is confirmed; lodging, guides, restaurants, and detailed Medina stops remain separate records.",
  },
  {
    id: "agafay-morocco",
    name: "Agafay",
    coordinates: [-8.1970725, 31.4872129],
    parentPlaceId: "europe",
    countryCode: "MA",
    regionCode: null,
    category: "region",
    evidenceStatus: "confirmed",
    coordinatePrecision: "area",
    description:
      "An evening transition from Marrakech into open desert landscape, camp atmosphere, music, and performance.",
    externalLinks: {},
    verificationNotes:
      "This is an area-level pin for the confirmed evening visit, not a claim of an overnight stay or a precise camp coordinate.",
  },
  {
    id: "malaga-spain",
    name: "Málaga",
    coordinates: [-4.4422005, 36.7647913],
    parentPlaceId: "europe",
    countryCode: "ES",
    regionCode: "ES-AN",
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "city",
    description:
      "Málaga begins the southern Spain segment and shifts the journey back toward the Mediterranean coast.",
    externalLinks: {},
    verificationNotes:
      "Confirmed at route and city level only.",
  },
  {
    id: "gibraltar",
    name: "Gibraltar",
    coordinates: [-5.3474761, 36.1285933],
    parentPlaceId: "europe",
    countryCode: "GI",
    regionCode: "GI",
    category: "destination",
    evidenceStatus: "confirmed",
    coordinatePrecision: "territory",
    description:
      "A compact coastal chapter where the route meets the Strait of Gibraltar.",
    externalLinks: {},
    verificationNotes:
      "No individual Gibraltar attraction is asserted by this Place.",
  },
  {
    id: "cadiz-spain",
    name: "Cádiz",
    coordinates: [-6.2928976, 36.5297438],
    parentPlaceId: "europe",
    countryCode: "ES",
    regionCode: "ES-AN",
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "city",
    description:
      "A coastal city chapter shaped by Atlantic light, old streets, and the southern Spain route.",
    externalLinks: {},
    verificationNotes:
      "Confirmed at route and city level only.",
  },
  {
    id: "seville-spain",
    name: "Seville",
    coordinates: [-5.9953403, 37.3886303],
    parentPlaceId: "europe",
    countryCode: "ES",
    regionCode: "ES-AN",
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "city",
    description:
      "An architectural city experienced through broad plazas, intimate streets, changing light, and family exploration.",
    externalLinks: {},
    verificationNotes:
      "The city and edited photography are confirmed; named attractions require asset or journal confirmation.",
  },
  {
    id: "madrid-spain",
    name: "Madrid",
    coordinates: [-3.703507, 40.416782],
    parentPlaceId: "europe",
    countryCode: "ES",
    regionCode: "ES-MD",
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "city",
    description:
      "A gentler final city chapter centered on atmosphere, green space, dramatic skies, and time with family and friends.",
    externalLinks: {},
    verificationNotes:
      "The city and park photography are confirmed; private lodging and additional attractions remain excluded.",
  },
])
