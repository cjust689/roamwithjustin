// Canonical Puerto Rico geography for every existing trip visit and Atlas node.
export const puertoRicoPlaces = Object.freeze([
  {
    id: "puerto-rico",
    name: "Puerto Rico",
    coordinates: [-66.5901, 18.2208],
    parentPlaceId: null,
    countryCode: "PR",
    regionCode: "PR",
    category: "territory",
    evidenceStatus: "confirmed",
    description:
      "A seven-day road trip through colonial streets, Atlantic cliffs, jungle waterfalls, and the beaches of the northwest coast.",
    externalLinks: {},
  },
  {
    id: "gozalandia-falls",
    name: "Gozalandia Falls",
    coordinates: [-66.9831, 18.36093],
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "waterfall",
    evidenceStatus: "confirmed",
    description:
      "A two-tier waterfall in the hills of San Sebastián with swimming pools, misty jungle light, and an upper-falls trail.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=18.36093%2C-66.9831",
    },
  },
  {
    id: "old-san-juan",
    name: "Old San Juan",
    coordinates: [-66.11028, 18.46639],
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "architecture-and-street-photography",
    evidenceStatus: "confirmed",
    description:
      "Colorful colonial streets, historic fortifications, ocean views, and a city made for slow walks with a camera.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=18.46639%2C-66.11028",
    },
  },
  {
    id: "cueva-del-indio",
    name: "Cueva del Indio",
    coordinates: [-66.641578, 18.49269],
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "cliffs-and-sea-caves",
    evidenceStatus: "confirmed",
    description:
      "A rugged stretch of limestone cliffs, sea caves, petroglyphs, and wide Atlantic views near Arecibo.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=18.49269%2C-66.641578",
    },
  },
  {
    id: "crash-boat-beach",
    name: "Crash Boat Beach",
    coordinates: [-67.16525, 18.45972],
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "beach-and-snorkeling",
    evidenceStatus: "confirmed",
    description:
      "Clear water, colorful piers, snorkeling, and a lively local beach atmosphere on Aguadilla's northwest coast.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=18.45972%2C-67.16525",
    },
  },
  {
    id: "san-juan",
    name: "San Juan",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Colorful colonial streets, historic forts, and vibrant energy & food. Great for photography and slow walks.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "fairmont-el-san-juan",
    name: "Fairmont El San Juan Hotel Nightclub",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "nightlife",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Classy beachfront resort clubbing — upscale nightlife, food, drinks and atmosphere.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "estatua-de-colon",
    name: "Estatua de Colón",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Massive and controversial statue of Christopher Columbus overlooking the Arecibo coast — quick photo stop.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "calle-c-canals",
    name: "Calle C. Canals",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Massive and controversial statue of Christopher Columbus overlooking the Arecibo coast — quick photo stop.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "shacks-beach",
    name: "Shacks Beach",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "beach",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "A scenic beach on the northwest coast of Puerto Rico, known for turquoise waters, offshore coral reefs, snorkeling, and kite surfing.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "pena-blanca-beach",
    name: "Peña Blanca Beach",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "beach",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "A small, picturesque cove in Aguadilla with calm water and rocky outcrops, ideal for swimming, relaxing, and photography.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "mar-chiquita",
    name: "Mar Chiquita",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "beach",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Small, protected beach cove with calm turquoise water and surrounding rock walls — popular for relaxing or swimming.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "playa-pastillo",
    name: "Playa Pastillo",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "beach",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Remote, undeveloped beach near Coto with dramatic rock formations and rough surf — peaceful and photogenic.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "la-cara-del-indio",
    name: "La Cara del Indio",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Iconic roadside rock carving of a Taíno chief’s face overlooking the coast near Isabela. A quick cultural and historical stop along the north coast drive.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "hacienda-florecer",
    name: "Hacienda Florecer",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Modern luxury retreat built from upcycled shipping containers, perched in the foothills of Moca with sweeping mountain views and serene seclusion.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "playuelas-horse-rides",
    name: "Playuelas Horse Rides",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "activity",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Family-friendly equestrian center near Aguadilla offering private horseback tours across coastal meadows, jungle trails, beaches and historic ruins.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "arte-aguadilla",
    name: "ARTe – Aguadilla Rooftop Experience",
    coordinates: null,
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "dining",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Chic rooftop restaurant and bar in downtown Aguadilla with oceanfront sunset views over Aguadilla Bay, creative Criollo‑inspired cuisine, and tropical cocktails.",
    externalLinks: {},
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
])
