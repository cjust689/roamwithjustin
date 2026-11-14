// Canonical Utah geography. Public pins use documented venue, route-anchor, or
// area-level coordinates; verification notes retain that precision explicitly.
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
    coordinates: [-113.896194, 40.762583],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "landscape",
    evidenceStatus: "confirmed",
    coordinatePrecision: "public-access",
    description:
      "Open, alien, and cinematic — we shot sunrise drone footage here.",
    externalLinks: {
      official: "https://www.blm.gov/visit/bonneville-salt-flats",
      maps: "https://www.google.com/maps/search/?api=1&query=40.762583%2C-113.896194",
    },
    verificationNotes:
      "The Atlas pin marks the public parking area at the end of Bonneville Speedway Road, not an inferred photo or drone capture position on the flats.",
  },
  {
    id: "potash-road",
    name: "Potash Road Scenic Drive",
    coordinates: [-109.600122, 38.544455],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "drive",
    evidenceStatus: "confirmed",
    coordinatePrecision: "route-anchor",
    description:
      "Drove Potash Road for stunning desert and canyon views at sunset.",
    externalLinks: {
      official:
        "https://www.discovermoab.com/trail/potash-lower-colorado-river-scenic-byway-%28u-279%29/681e961cc610f14d9362aa64/",
      maps: "https://www.google.com/maps/search/?api=1&query=38.544455%2C-109.600122",
    },
    verificationNotes:
      "The scenic drive is a route rather than one point. The Atlas uses the documented Potash Road petroglyph pullout as a representative public route anchor, not as the asserted location of every photograph.",
  },
  {
    id: "moab-giants",
    name: "Moab Giants Dinosaur Park",
    coordinates: [-109.761166, 38.543939],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "venue",
    description:
      "A dinosaur-themed park with life-sized models and a small museum. Great stop for kids and families before heading deeper into Moab.",
    externalLinks: {
      official: "https://www.moabgiants.com",
      maps: "https://www.google.com/maps/search/?api=1&query=38.543939%2C-109.761166",
    },
    verificationNotes:
      "Venue coordinates are published by Visit Utah for Moab Giants at 112 West SR-313.",
  },
  {
    id: "park-city",
    name: "Park City",
    coordinates: [-111.506627, 40.651887],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "resort-base",
    description:
      "Skiing and snowboarding in the morning, then exploring the charming streets of Park City in the afternoon.",
    externalLinks: {
      official: "https://www.visitparkcity.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=40.651887%2C-111.506627",
    },
    verificationNotes:
      "The public Atlas pin uses the Park City Mountain Village base for the confirmed ski and snowboard portion of this stop; the Journey narrative also covers downtown Park City.",
  },
  {
    id: "woodward-park-city",
    name: "Park City Woodward",
    coordinates: [-111.585887, 40.754775],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "venue",
    description:
      "the famous Woodward Park City, a year-round action sports facility. We spent the day skiing and snowboarding, and our son had a blast at the indoor skatepark/trampoline park.",
    externalLinks: {
      official: "https://www.woodwardparkcity.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=40.754775%2C-111.585887",
    },
    verificationNotes:
      "The Atlas pin marks Woodward Park City's public venue at 3863 Kilby Road.",
  },
  {
    id: "uintas",
    name: "Uintas - Cross-Country Skiing + Dog Sledding",
    coordinates: [-111.159263, 40.78474],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "activity-area",
    description:
      "Cross-country skiing in the Uintas and a dog-sled ride on private ranch trails near Park City made this a full day in Utah's winter landscape.",
    externalLinks: {
      official:
        "https://wasatchadventureguides.com/winter-adventures-park-city/dog-sledding/",
      maps: "https://www.google.com/maps/search/?api=1&query=40.784740%2C-111.159263",
    },
    verificationNotes:
      "The public Atlas pin uses the documented Stillman Ranch activity area near Oakley, recommended by the guide for dog sledding. It does not claim an exact sled route, ski trail, or media capture position.",
  },
  {
    id: "salt-lake-city-airport",
    name: "Salt Lake City International Airport",
    coordinates: [-111.977773, 40.788393],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "drive",
    evidenceStatus: "confirmed",
    coordinatePrecision: "airport",
    description:
      "The arrival and departure point that bookends the Utah road trip.",
    externalLinks: {
      official: "https://slcairport.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=40.788393%2C-111.977773",
    },
    verificationNotes:
      "The Atlas uses the FAA-published airport reference point, not a terminal, gate, or private travel-history coordinate.",
  },
])
