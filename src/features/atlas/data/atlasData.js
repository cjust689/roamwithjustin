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
]

export const atlasNodes = Object.freeze(
  nodes.reduce((result, node) => {
    result[node.id] = Object.freeze(node)
    return result
  }, {})
)

export const atlasRootIds = Object.freeze(["utah"])

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
