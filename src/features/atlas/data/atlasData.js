const nodes = [
  {
    id: "utah",
    parentId: null,
    title: "Utah",
    eyebrow: "Destination",
    category: "Road trip",
    coordinates: [-111.0937, 39.321],
    camera: {
      center: [-111.35, 39.35],
      zoom: 6.2,
      pitch: 52,
      bearing: 12,
    },
    summary:
      "A cinematic road trip through salt flats, high desert, red-rock parks, and mountain towns.",
    personalNote:
      "This atlas slice uses photography and notes from the existing seven-day Utah trip story.",
    image: "/img/locations/utah/utah.jpg",
    media: [
      "/img/locations/utah/utah.jpg",
      "/img/locations/utah/featured/utah-drone-salt.jpg",
      "/img/locations/utah/featured/utah-sunset-arches.jpg",
    ],
    childIds: ["moab"],
    relatedIds: [],
    actions: [
      {
        label: "Read the Utah trip story",
        href: "/trips/utah",
        type: "internal",
      },
    ],
  },
  {
    id: "moab",
    parentId: "utah",
    title: "Moab",
    eyebrow: "Exploration hub",
    category: "Desert landscapes",
    coordinates: [-109.54583, 38.57447],
    camera: {
      center: [-109.72, 38.48],
      zoom: 9.1,
      pitch: 60,
      bearing: -18,
    },
    summary:
      "A base for red-rock drives, family-friendly hikes, canyon overlooks, and national-park photography.",
    personalNote:
      "We used Moab as our base while exploring Arches, Canyonlands, Dead Horse Point, and Potash Road.",
    image: "/img/locations/utah/gallery/utah-arches.jpg",
    media: [
      "/img/locations/utah/gallery/utah-arches.jpg",
      "/img/locations/utah/gallery/utah-canyonlands.jpg",
      "/img/locations/utah/gallery/utah-deadhorse.jpg",
    ],
    childIds: [
      "arches-national-park",
      "canyonlands-national-park",
      "dead-horse-point",
    ],
    relatedIds: [],
    actions: [
      {
        label: "View Moab on Google Maps",
        href: "https://www.google.com/maps/search/?api=1&query=38.57447%2C-109.54583",
        type: "external",
      },
      {
        label: "Read the Utah trip story",
        href: "/trips/utah",
        type: "internal",
      },
    ],
  },
  {
    id: "arches-national-park",
    parentId: "moab",
    title: "Arches National Park",
    eyebrow: "Photography location",
    category: "Hike",
    coordinates: [-109.586367, 38.722618],
    camera: {
      center: [-109.586367, 38.722618],
      zoom: 12.4,
      pitch: 67,
      bearing: 24,
    },
    summary:
      "Iconic red-rock formations, accessible overlooks, and warm evening light across the fins and arches.",
    personalNote:
      "We arrived in the afternoon and stayed for sunset. The drive and shorter walks made this stop work well with a young child.",
    image: "/img/locations/utah/locations/utah-arches.jpg",
    media: [
      "/img/locations/utah/locations/utah-arches.jpg",
      "/img/locations/utah/gallery/utah-arches-1.jpg",
      "/img/locations/utah/gallery/utah-arches-2.jpg",
    ],
    childIds: [],
    relatedIds: ["canyonlands-national-park", "dead-horse-point"],
    actions: [
      {
        label: "View on Google Maps",
        href: "https://www.google.com/maps/search/?api=1&query=38.722618%2C-109.586367",
        type: "external",
      },
      {
        label: "Official NPS website",
        href: "https://www.nps.gov/arch/index.htm",
        type: "external",
      },
    ],
  },
  {
    id: "canyonlands-national-park",
    parentId: "moab",
    title: "Canyonlands National Park",
    eyebrow: "Photography location",
    category: "Hike",
    coordinates: [-109.8801624, 38.24555783],
    camera: {
      center: [-109.8801624, 38.24555783],
      zoom: 11.4,
      pitch: 64,
      bearing: -26,
    },
    summary:
      "Layered canyons and immense overlooks where fast-changing weather can completely transform the scene.",
    personalNote:
      "We experienced sunshine, rain, and snow in one visit while focusing on the Island in the Sky area.",
    image: "/img/locations/utah/locations/utah-canyonlands.jpg",
    media: [
      "/img/locations/utah/locations/utah-canyonlands.jpg",
      "/img/locations/utah/gallery/utah-canyonlands-1.jpg",
      "/img/locations/utah/gallery/utah-canyonlands-2.jpg",
    ],
    childIds: [],
    relatedIds: ["dead-horse-point", "arches-national-park"],
    actions: [
      {
        label: "View on Google Maps",
        href: "https://www.google.com/maps/search/?api=1&query=38.24555783%2C-109.8801624",
        type: "external",
      },
      {
        label: "Official NPS website",
        href: "https://www.nps.gov/cany/index.htm",
        type: "external",
      },
    ],
  },
  {
    id: "dead-horse-point",
    parentId: "moab",
    title: "Dead Horse Point",
    eyebrow: "Scenic overlook",
    category: "Viewpoint",
    coordinates: [-109.7331732, 38.5058162],
    camera: {
      center: [-109.7331732, 38.5058162],
      zoom: 12.2,
      pitch: 69,
      bearing: 34,
    },
    summary:
      "A dramatic Colorado River overlook with quick access to expansive canyon views.",
    personalNote:
      "A sudden snowstorm changed the light and made an already dramatic overlook feel surreal.",
    image: "/img/locations/utah/locations/utah-deadhorse.jpg",
    media: [
      "/img/locations/utah/locations/utah-deadhorse.jpg",
      "/img/locations/utah/gallery/utah-deadhorse-1.jpg",
      "/img/locations/utah/gallery/utah-deadhorse-2.jpg",
    ],
    childIds: [],
    relatedIds: ["canyonlands-national-park", "arches-national-park"],
    actions: [
      {
        label: "View on Google Maps",
        href: "https://www.google.com/maps/search/?api=1&query=38.5058162%2C-109.7331732",
        type: "external",
      },
      {
        label: "Official park website",
        href: "https://stateparks.utah.gov/parks/dead-horse-point/",
        type: "external",
      },
    ],
  },
  {
    id: "puerto-rico",
    parentId: null,
    title: "Puerto Rico",
    eyebrow: "Destination",
    category: "Island road trip",
    coordinates: [-66.5901, 18.2208],
    camera: {
      center: [-66.55, 18.28],
      zoom: 7.35,
      pitch: 46,
      bearing: -8,
    },
    summary:
      "A seven-day road trip through colonial streets, Atlantic cliffs, jungle waterfalls, and the beaches of the northwest coast.",
    personalNote:
      "We split the trip between San Juan and Moca, following the north coast west before slowing down around Aguadilla and San Sebastián.",
    image: "/img/locations/puerto-rico/puerto-rico-beach-sunset.jpg",
    media: [
      "/img/locations/puerto-rico/puerto-rico-beach-sunset.jpg",
      "/img/locations/puerto-rico/old-san-juan-2.jpg",
      "/img/locations/puerto-rico/puerto-rico-watewerfall-2.jpg",
    ],
    childIds: [
      "old-san-juan",
      "cueva-del-indio",
      "crash-boat-beach",
      "gozalandia-falls",
    ],
    relatedIds: [],
    actions: [
      {
        label: "Read the Puerto Rico trip story",
        href: "/trips/puerto-rico",
        type: "internal",
      },
    ],
  },
  {
    id: "old-san-juan",
    parentId: "puerto-rico",
    title: "Old San Juan",
    eyebrow: "Historic city",
    category: "Architecture and street photography",
    coordinates: [-66.11028, 18.46639],
    camera: {
      center: [-66.11028, 18.46639],
      zoom: 14,
      pitch: 62,
      bearing: -20,
    },
    summary:
      "Colorful colonial streets, historic fortifications, ocean views, and a city made for slow walks with a camera.",
    personalNote:
      "We started early at Castillo San Cristóbal, then wandered the old city before the afternoon heat and crowds arrived.",
    image: "/img/locations/puerto-rico/old-san-juan-3.jpg",
    media: [
      "/img/locations/puerto-rico/old-san-juan-3.jpg",
      "/img/locations/puerto-rico/old-san-juan-2.jpg",
      "/img/locations/puerto-rico/PXL_20240804_023431011.jpg",
    ],
    childIds: [],
    relatedIds: ["cueva-del-indio"],
    actions: [
      {
        label: "View on Google Maps",
        href: "https://www.google.com/maps/search/?api=1&query=18.46639%2C-66.11028",
        type: "external",
      },
      {
        label: "Read the Puerto Rico trip story",
        href: "/trips/puerto-rico",
        type: "internal",
      },
    ],
  },
  {
    id: "cueva-del-indio",
    parentId: "puerto-rico",
    title: "Cueva del Indio",
    eyebrow: "Atlantic coast",
    category: "Cliffs and sea caves",
    coordinates: [-66.641578, 18.49269],
    camera: {
      center: [-66.641578, 18.49269],
      zoom: 13.2,
      pitch: 66,
      bearing: 18,
    },
    summary:
      "A rugged stretch of limestone cliffs, sea caves, petroglyphs, and wide Atlantic views near Arecibo.",
    personalNote:
      "The short walk opens onto dramatic cliff edges and textured rock formations that worked especially well for wide-angle and aerial footage.",
    image: "/img/locations/puerto-rico/cueva-del-indio.jpg",
    media: [
      "/img/locations/puerto-rico/cueva-del-indio.jpg",
      "/img/locations/puerto-rico/Still001.jpg",
      "/img/locations/puerto-rico/cueva-indio-1.jpg",
    ],
    childIds: [],
    relatedIds: ["old-san-juan", "crash-boat-beach"],
    actions: [
      {
        label: "View on Google Maps",
        href: "https://www.google.com/maps/search/?api=1&query=18.49269%2C-66.641578",
        type: "external",
      },
      {
        label: "Read the Puerto Rico trip story",
        href: "/trips/puerto-rico",
        type: "internal",
      },
    ],
  },
  {
    id: "gozalandia-falls",
    parentId: "puerto-rico",
    title: "Gozalandia Falls",
    eyebrow: "Jungle waterfall",
    category: "Swim and hike",
    coordinates: [-66.9831, 18.36093],
    camera: {
      center: [-66.9831, 18.36093],
      zoom: 14.1,
      pitch: 68,
      bearing: -24,
    },
    summary:
      "A two-tier waterfall in the hills of San Sebastián with swimming pools, misty jungle light, and an upper-falls trail.",
    personalNote:
      "Arriving at opening gave us a quiet first swim and time to reach the upper falls before the busiest part of the day.",
    image: "/img/locations/puerto-rico/puerto-rico-watewerfall-2.jpg",
    media: [
      "/img/locations/puerto-rico/puerto-rico-watewerfall-2.jpg",
      "/img/locations/puerto-rico/puerto-rico-water-6.jpg",
      "/img/locations/puerto-rico/waterfall-1.jpg",
    ],
    childIds: [],
    relatedIds: ["crash-boat-beach"],
    actions: [
      {
        label: "View on Google Maps",
        href: "https://www.google.com/maps/search/?api=1&query=18.36093%2C-66.9831",
        type: "external",
      },
      {
        label: "Read the Puerto Rico trip story",
        href: "/trips/puerto-rico",
        type: "internal",
      },
    ],
  },
  {
    id: "crash-boat-beach",
    parentId: "puerto-rico",
    title: "Crash Boat Beach",
    eyebrow: "Northwest coast",
    category: "Beach and snorkeling",
    coordinates: [-67.16525, 18.45972],
    camera: {
      center: [-67.16525, 18.45972],
      zoom: 14.4,
      pitch: 63,
      bearing: 28,
    },
    summary:
      "Clear water, colorful piers, snorkeling, and a lively local beach atmosphere on Aguadilla's northwest coast.",
    personalNote:
      "We stayed through golden hour for pier jumps, underwater footage, and the warm color across Aguadilla Bay.",
    image: "/img/locations/puerto-rico/puerto-rico-crashboat.jpg",
    media: [
      "/img/locations/puerto-rico/puerto-rico-crashboat.jpg",
      "/img/locations/puerto-rico/puerto-rico-crash-boat.jpg",
      "/img/locations/puerto-rico/Underwater Reel_Fast.00_00_36_10.Still004.jpg",
    ],
    childIds: [],
    relatedIds: ["cueva-del-indio", "gozalandia-falls"],
    actions: [
      {
        label: "View on Google Maps",
        href: "https://www.google.com/maps/search/?api=1&query=18.45972%2C-67.16525",
        type: "external",
      },
      {
        label: "Read the Puerto Rico trip story",
        href: "/trips/puerto-rico",
        type: "internal",
      },
    ],
  },
]

export const atlasNodes = Object.freeze(
  nodes.reduce((result, node) => {
    result[node.id] = Object.freeze(node)
    return result
  }, {})
)

export const atlasRootIds = Object.freeze(["utah", "puerto-rico"])

export function getAtlasNode(id) {
  return id ? atlasNodes[id] || null : null
}

export function getAtlasNodes(ids = []) {
  return ids.map(getAtlasNode).filter(Boolean)
}

export function getAtlasLineage(node) {
  const lineage = []
  let current = node

  while (current) {
    lineage.unshift(current)
    current = getAtlasNode(current.parentId)
  }

  return lineage
}

export function getAtlasLeaves() {
  return nodes.filter(node => node.childIds.length === 0)
}
