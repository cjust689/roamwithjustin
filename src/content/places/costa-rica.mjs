// Confirmed Costa Rica route geography. Precise venues, wildlife locations,
// and access logistics remain excluded until the journal or media proves them.
export const costaRicaPlaces = Object.freeze([
  {
    id: "costa-rica",
    name: "Costa Rica",
    coordinates: [-84.0739102, 10.2735633],
    parentPlaceId: null,
    countryCode: "CR",
    regionCode: null,
    category: "country",
    evidenceStatus: "confirmed",
    coordinatePrecision: "country",
    description:
      "A route from the rainforest to the Pacific through La Fortuna, the Osa Peninsula, Uvita, and the San José area.",
    externalLinks: {},
    verificationNotes:
      "The country coordinate is an OpenStreetMap administrative centroid used only as the Atlas journey anchor.",
  },
  {
    id: "la-fortuna-costa-rica",
    name: "La Fortuna",
    coordinates: [-84.644436, 10.4716839],
    parentPlaceId: "costa-rica",
    countryCode: "CR",
    regionCode: "CR-A",
    category: "destination",
    evidenceStatus: "confirmed",
    coordinatePrecision: "district",
    description:
      "A rainforest stop in northern Costa Rica where the route begins near the Arenal landscape.",
    externalLinks: {},
    verificationNotes:
      "Route-level confirmation only. Do not attach suggested activities without source evidence.",
  },
  {
    id: "bajos-del-toro",
    name: "Bajos del Toro",
    coordinates: [-84.2996454, 10.2134461],
    parentPlaceId: "costa-rica",
    countryCode: "CR",
    regionCode: "CR-A",
    category: "destination",
    evidenceStatus: "confirmed",
    coordinatePrecision: "village",
    description:
      "A misty rainforest and waterfall segment in the highlands of Alajuela Province.",
    externalLinks: {},
    verificationNotes:
      "The village is confirmed at route level; the proposed Jurassic Canyon label is not treated as a visited venue.",
  },
  {
    id: "drake-bay",
    name: "Drake Bay",
    coordinates: [-83.6550131, 8.7046659],
    parentPlaceId: "costa-rica",
    countryCode: "CR",
    regionCode: "CR-P",
    category: "bay",
    evidenceStatus: "confirmed",
    coordinatePrecision: "bay",
    description:
      "A remote Pacific chapter where dense Osa Peninsula forest meets the water.",
    externalLinks: {},
    verificationNotes:
      "The route and bay are confirmed; transport method and operators remain unverified.",
  },
  {
    id: "playa-san-josecito",
    name: "Playa San Josecito",
    coordinates: [-83.7112504, 8.6550443],
    parentPlaceId: "costa-rica",
    countryCode: "CR",
    regionCode: "CR-P",
    category: "beach",
    evidenceStatus: "confirmed",
    coordinatePrecision: "nearby-area",
    description:
      "A jungle beach stop south of Drake Bay, with a lush tree line and calmer water near shore.",
    externalLinks: {},
    verificationNotes:
      "The coordinate uses the geocoded San Josecito area near Drake Bay, not an asserted photo capture point on the beach.",
  },
  {
    id: "uvita-costa-rica",
    name: "Uvita",
    coordinates: [-83.7363979, 9.1730967],
    parentPlaceId: "costa-rica",
    countryCode: "CR",
    regionCode: "CR-P",
    category: "destination",
    evidenceStatus: "confirmed",
    coordinatePrecision: "village",
    description:
      "A southern Pacific base for the Whale Tail, waterfall, rainforest, wildlife, and aerial stories.",
    externalLinks: {},
    verificationNotes:
      "Sensitive wildlife locations remain intentionally unpinned.",
  },
  {
    id: "uvita-whale-tail",
    name: "Uvita Whale Tail",
    coordinates: [-83.7484997, 9.1304772],
    parentPlaceId: "costa-rica",
    countryCode: "CR",
    regionCode: "CR-P",
    category: "coastal-landform",
    evidenceStatus: "confirmed",
    coordinatePrecision: "protected-area",
    description:
      "A walk at low tide whose distinctive shape becomes clear when the story shifts from ground level to an aerial view.",
    externalLinks: {},
    verificationNotes:
      "The Atlas uses the Marino Ballena protected-area coordinate rather than inventing an exact path or drone position.",
  },
  {
    id: "nauyaca-waterfalls",
    name: "Nauyaca Waterfalls",
    coordinates: [-83.8075411, 9.254635],
    parentPlaceId: "costa-rica",
    countryCode: "CR",
    regionCode: "CR-SJ",
    category: "waterfall",
    evidenceStatus: "confirmed",
    coordinatePrecision: "waterfall",
    description:
      "A waterfall chapter in the southern Pacific portion of the route, set among steep forest and moving water.",
    externalLinks: {},
    verificationNotes:
      "Do not infer an operator or entry route from the waterfall coordinate.",
  },
  {
    id: "manuel-antonio-area",
    name: "Manuel Antonio",
    coordinates: [-84.1547592, 9.4085692],
    parentPlaceId: "costa-rica",
    countryCode: "CR",
    regionCode: "CR-P",
    category: "destination",
    evidenceStatus: "confirmed",
    coordinatePrecision: "area",
    description:
      "A brief stop in the wider Manuel Antonio area during the route toward San José, without entering the national park.",
    externalLinks: {},
    verificationNotes:
      "The public copy must preserve the distinction between an area stop and a national-park visit.",
  },
  {
    id: "san-jose-costa-rica",
    name: "San José",
    coordinates: [-84.0796683, 9.9327373],
    parentPlaceId: "costa-rica",
    countryCode: "CR",
    regionCode: "CR-SJ",
    category: "city",
    evidenceStatus: "confirmed",
    coordinatePrecision: "metropolitan-area",
    description:
      "The broad San José area marks an overnight transition after Bajos del Toro and the final return after the Pacific coast.",
    externalLinks: {},
    verificationNotes:
      "The metropolitan coordinate comes from Costa Rican/UN geographic sources and does not expose lodging.",
  },
])
