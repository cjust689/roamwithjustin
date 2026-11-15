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
      "A route across Utah from wet salt before sunrise to darkened red rock beneath changing weather, followed by a final shift into Park City snow.",
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
      "Red fins and arches that can be reached on short, clearly marked walks, especially striking when the evening light begins warming the rock.",
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
      "Layered canyon country where sun, wind, rain, and snow can reveal four different landscapes within the same visit.",
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
      "A short walk to a broad canyon overlook where passing snow can hide entire mesas and uncover them again minutes later.",
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
      "The practical center of the red rock leg, with dinosaur stops, canyon roads, overlooks, and national park walks radiating out from town.",
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
      "Wet salt, hard wind, and almost no foreground give sunrise room to arrive one thin line at a time beneath the mountains.",
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
      "A drive between river and cliff where late light reduces people to tiny figures beneath the canyon and aerial views turn the ponds into pure geometry.",
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
      "Full size dinosaurs and interactive exhibits turn a break in the drive into a new way for kids to imagine the desert outside.",
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
      "A mountain day that can move from ski school and independent runs to an easy afternoon regrouping in downtown Park City.",
    externalLinks: {
      official: "https://www.visitparkcity.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=40.651887%2C-111.506627",
    },
    verificationNotes:
      "The public Atlas pin uses the Park City Mountain Village base for the confirmed ski and snowboard portion of this stop; the Journey narrative also covers downtown Park City.",
  },
  {
    id: "zion-national-park",
    name: "Zion National Park",
    coordinates: [-113.0047934, 37.3221673],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "national-park",
    evidenceStatus: "confirmed",
    coordinatePrecision: "protected-area",
    description:
      "Two days in Zion open the 2026 Utah trip before the journey turns north toward Park City.",
    externalLinks: {
      official: "https://www.nps.gov/zion/index.htm",
      maps:
        "https://www.google.com/maps/search/?api=1&query=37.3221673%2C-113.0047934",
    },
    verificationNotes:
      "The Atlas uses the park-level OpenStreetMap/NPS geography and does not infer a trail, entrance, lodging, or media capture position.",
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
      "BMX riders rotate above the foam pit while young skateboarders launch across indoor transitions; outside, the same campus continues with skiing, snowboarding, and tubing.",
    externalLinks: {
      official: "https://www.woodwardparkcity.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=40.754775%2C-111.585887",
    },
    verificationNotes:
      "The Atlas pin marks Woodward Park City's public venue at 3863 Kilby Road.",
  },
  {
    id: "uintas",
    name: "Uintas Cross Country Skiing and Dog Sledding",
    coordinates: [-111.159263, 40.78474],
    parentPlaceId: "utah",
    countryCode: "US",
    regionCode: "US-UT",
    category: "attraction",
    evidenceStatus: "confirmed",
    coordinatePrecision: "activity-area",
    description:
      "A winter day that begins on cross country skis, then changes energy when the guide clips in the dog team for a sled ride on private ranch trails.",
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
      "The ordinary bookend to a week of salt, sandstone, and snow: rental keys on arrival and busy winter security lines on departure.",
    externalLinks: {
      official: "https://slcairport.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=40.788393%2C-111.977773",
    },
    verificationNotes:
      "The Atlas uses the FAA-published airport reference point, not a terminal, gate, or private travel-history coordinate.",
  },
])
