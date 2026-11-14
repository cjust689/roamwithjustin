// Canonical Utah geography. Unknown coordinates stay null rather than being inferred.
export const utahPlaces = Object.freeze([
  {
    id: "utah",
    name: "Utah",
    coordinates: [-111.0937, 39.321],
    parentPlaceId: null,
    countryCode: "US",
    regionCode: "US-UT",
    category: "region",
    evidenceStatus: "confirmed",
    description:
      "A cinematic road trip through salt flats, high desert, red-rock parks, and mountain towns.",
    externalLinks: {
      official: "https://www.visitutah.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=Utah",
    },
  },
  {
    id: "arches-national-park",
    name: "Arches National Park",
    coordinates: [-109.586367, 38.722618],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "national-park",
    evidenceStatus: "confirmed",
    description:
      "Iconic red-rock formations, accessible overlooks, and warm evening light across the fins and arches.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=38.722618%2C-109.586367",
      official: "https://www.nps.gov/arch/index.htm",
    },
  },
  {
    id: "canyonlands-national-park",
    name: "Canyonlands National Park",
    coordinates: [-109.8801624, 38.24555783],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "national-park",
    evidenceStatus: "confirmed",
    coordinatePrecision: "park",
    description:
      "Layered canyons and immense overlooks where fast-changing weather can completely transform the scene.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=38.24555783%2C-109.8801624",
      official: "https://www.nps.gov/cany/index.htm",
    },
    verificationNotes:
      "The visit and park-level location are confirmed. Do not publish a precise district or viewpoint until verified from the trip journal or media metadata.",
  },
  {
    id: "dead-horse-point",
    name: "Dead Horse Point",
    coordinates: [-109.7331732, 38.5058162],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "state-park",
    evidenceStatus: "confirmed",
    description:
      "A dramatic Colorado River overlook with quick access to expansive canyon views.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=38.5058162%2C-109.7331732",
      official: "https://stateparks.utah.gov/parks/dead-horse-point/",
    },
  },
  {
    id: "moab",
    name: "Moab",
    coordinates: [-109.54583, 38.57447],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "desert-landscapes",
    evidenceStatus: "confirmed",
    description:
      "A base for red-rock drives, family-friendly hikes, canyon overlooks, and national-park photography.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=38.57447%2C-109.54583",
      official: "https://www.discovermoab.com/",
    },
  },
  {
    id: "bonneville-salt-flats",
    name: "Bonneville Salt Flats",
    coordinates: null,
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "landscape",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Open, alien, and cinematic — we shot sunrise drone footage here.",
    externalLinks: {
      official: "https://www.blm.gov/visit/bonneville-salt-flats",
      maps: "https://www.google.com/maps/search/?api=1&query=Bonneville+Salt+Flats%2C+Utah",
    },
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "potash-road",
    name: "Potash Road Scenic Drive",
    coordinates: null,
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "drive",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Drove Potash Road for stunning desert and canyon views at sunset.",
    externalLinks: {
      official:
        "https://www.discovermoab.com/trail/potash-lower-colorado-river-scenic-byway-%28u-279%29/681e961cc610f14d9362aa64/",
      maps: "https://www.google.com/maps/search/?api=1&query=Potash+Road+Scenic+Byway%2C+Moab%2C+Utah",
    },
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "moab-giants",
    name: "Moab Giants Dinosaur Park",
    coordinates: null,
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "A dinosaur-themed park with life-sized models and a small museum. Great stop for kids and families before heading deeper into Moab.",
    externalLinks: {
      official: "https://www.moabgiants.com",
      maps: "https://www.google.com/maps/search/?api=1&query=Moab+Giants+Dinosaur+Park%2C+Utah",
    },
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "park-city",
    name: "Park City",
    coordinates: null,
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "Skiing and snowboarding in the morning, then exploring the charming streets of Park City in the afternoon.",
    externalLinks: {
      official: "https://www.visitparkcity.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=Park+City%2C+Utah",
    },
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "woodward-park-city",
    name: "Park City Woodward",
    coordinates: null,
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "the famous Woodward Park City, a year-round action sports facility. We spent the day skiing and snowboarding, and our son had a blast at the indoor skatepark/trampoline park.",
    externalLinks: {
      official: "https://www.woodwardparkcity.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=Woodward+Park+City%2C+Utah",
    },
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "uintas",
    name: "Uintas - Cross Country Skiing + Dog Sledding",
    coordinates: null,
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "We spent part of the day cross-country skiing in the Uintas. The snow was perfect, and the scenery was breathtaking. We rented gear from a local shop and hit the trails. It was a great way to experience the winter wonderland of Utah. We also went dog sledding, which was an unforgettable experience. The dogs were so excited to pull the sled, and it was a unique way to explore the snowy landscape.",
    externalLinks: {
      official: "https://wasatchadventureguides.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=Uinta+Mountains%2C+Utah",
    },
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "salt-lake-city-airport",
    name: "SLC",
    coordinates: null,
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "drive",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description: "",
    externalLinks: {
      official: "https://slcairport.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=Salt+Lake+City+International+Airport",
    },
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
])
