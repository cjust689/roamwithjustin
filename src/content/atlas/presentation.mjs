// Atlas-only presentation settings. Geographic facts and stories resolve from canonical records.
export const atlasPresentation = Object.freeze([
  {
    id: "utah",
    placeId: "utah",
    journeyId: "utah-winter-2025",
    parentId: null,
    eyebrow: "Destination",
    category: "Road trip",
    camera: {
      center: [-111.35, 39.35],
      zoom: 6.2,
      pitch: 52,
      bearing: 12,
    },
    hero: {
      assetId: "image-utah-utah",
      role: "hero",
      alt: "Utah photograph",
    },
    media: [
      {
        assetId: "image-utah-utah",
        role: "gallery",
        alt: "Utah media 1",
      },
      {
        assetId: "image-utah-featured-utah-drone-salt",
        role: "gallery",
        alt: "Utah media 2",
      },
      {
        assetId: "image-utah-featured-utah-sunset-arches",
        role: "gallery",
        alt: "Utah media 3",
      },
    ],
    relatedIds: [],
  },
  {
    id: "moab",
    placeId: "moab",
    journeyId: "utah-winter-2025",
    parentId: "utah",
    eyebrow: "Exploration hub",
    category: "Desert landscapes",
    camera: {
      center: [-109.72, 38.48],
      zoom: 9.1,
      pitch: 60,
      bearing: -18,
    },
    hero: {
      assetId: "image-utah-gallery-utah-arches",
      role: "hero",
      alt: "Moab photograph",
    },
    media: [
      {
        assetId: "image-utah-gallery-utah-arches",
        role: "gallery",
        alt: "Moab media 1",
      },
      {
        assetId: "image-utah-gallery-utah-canyonlands",
        role: "gallery",
        alt: "Moab media 2",
      },
      {
        assetId: "image-utah-gallery-utah-deadhorse",
        role: "gallery",
        alt: "Moab media 3",
      },
    ],
    relatedIds: [],
  },
  {
    id: "arches-national-park",
    placeId: "arches-national-park",
    journeyId: "utah-winter-2025",
    parentId: "moab",
    eyebrow: "Photography location",
    category: "Hike",
    camera: {
      center: [-109.586367, 38.722618],
      zoom: 12.4,
      pitch: 67,
      bearing: 24,
    },
    hero: {
      assetId: "image-utah-locations-utah-arches",
      role: "hero",
      alt: "Arches National Park photograph",
    },
    media: [
      {
        assetId: "image-utah-locations-utah-arches",
        role: "gallery",
        alt: "Arches National Park media 1",
      },
      {
        assetId: "image-utah-gallery-utah-arches-1",
        role: "gallery",
        alt: "Arches National Park media 2",
      },
      {
        assetId: "image-utah-gallery-utah-arches-2",
        role: "gallery",
        alt: "Arches National Park media 3",
      },
    ],
    relatedIds: ["canyonlands-national-park", "dead-horse-point"],
  },
  {
    id: "canyonlands-national-park",
    placeId: "canyonlands-national-park",
    journeyId: "utah-winter-2025",
    parentId: "moab",
    eyebrow: "Photography location",
    category: "Hike",
    camera: {
      center: [-109.8801624, 38.24555783],
      zoom: 11.4,
      pitch: 64,
      bearing: -26,
    },
    hero: {
      assetId: "utah-canyonlands-hero-001",
      role: "hero",
      focalPoint: {
        x: 0.5,
        y: 0.48,
      },
    },
    media: [
      {
        assetId: "utah-canyonlands-hero-001",
        role: "hero",
        focalPoint: {
          x: 0.5,
          y: 0.48,
        },
      },
      {
        assetId: "utah-canyonlands-gallery-001",
        role: "gallery",
      },
      {
        assetId: "utah-canyonlands-gallery-002",
        role: "gallery",
      },
      {
        assetId: "utah-canyonlands-video-001",
        role: "gallery",
        caption: "Canyonlands in changing winter weather",
      },
    ],
    relatedIds: ["dead-horse-point", "arches-national-park"],
  },
  {
    id: "dead-horse-point",
    placeId: "dead-horse-point",
    journeyId: "utah-winter-2025",
    parentId: "moab",
    eyebrow: "Scenic overlook",
    category: "Viewpoint",
    camera: {
      center: [-109.7331732, 38.5058162],
      zoom: 12.2,
      pitch: 69,
      bearing: 34,
    },
    hero: {
      assetId: "image-utah-locations-utah-deadhorse",
      role: "hero",
      alt: "Dead Horse Point photograph",
    },
    media: [
      {
        assetId: "image-utah-locations-utah-deadhorse",
        role: "gallery",
        alt: "Dead Horse Point media 1",
      },
      {
        assetId: "image-utah-gallery-utah-deadhorse-1",
        role: "gallery",
        alt: "Dead Horse Point media 2",
      },
      {
        assetId: "image-utah-gallery-utah-deadhorse-2",
        role: "gallery",
        alt: "Dead Horse Point media 3",
      },
    ],
    relatedIds: ["canyonlands-national-park", "arches-national-park"],
  },
  {
    id: "puerto-rico",
    placeId: "puerto-rico",
    journeyId: "puerto-rico-2024",
    parentId: null,
    eyebrow: "Destination",
    category: "Island road trip",
    camera: {
      center: [-66.55, 18.28],
      zoom: 7.35,
      pitch: 46,
      bearing: -8,
    },
    hero: {
      assetId: "image-puerto-rico-puerto-rico-beach-sunset",
      role: "hero",
      alt: "Puerto Rico photograph",
    },
    media: [
      {
        assetId: "image-puerto-rico-puerto-rico-beach-sunset",
        role: "gallery",
        alt: "Puerto Rico media 1",
      },
      {
        assetId: "image-puerto-rico-old-san-juan-2",
        role: "gallery",
        alt: "Puerto Rico media 2",
      },
      {
        assetId: "image-puerto-rico-puerto-rico-watewerfall-2",
        role: "gallery",
        alt: "Puerto Rico media 3",
      },
    ],
    relatedIds: [],
  },
  {
    id: "old-san-juan",
    placeId: "old-san-juan",
    journeyId: "puerto-rico-2024",
    parentId: "puerto-rico",
    eyebrow: "Historic city",
    category: "Architecture and street photography",
    camera: {
      center: [-66.11028, 18.46639],
      zoom: 14,
      pitch: 62,
      bearing: -20,
    },
    hero: {
      assetId: "image-puerto-rico-old-san-juan-3",
      role: "hero",
      alt: "Old San Juan photograph",
    },
    media: [
      {
        assetId: "image-puerto-rico-old-san-juan-3",
        role: "gallery",
        alt: "Old San Juan media 1",
      },
      {
        assetId: "image-puerto-rico-old-san-juan-2",
        role: "gallery",
        alt: "Old San Juan media 2",
      },
      {
        assetId: "image-puerto-rico-pxl-20240804-023431011",
        role: "gallery",
        alt: "Old San Juan media 3",
      },
    ],
    relatedIds: ["cueva-del-indio"],
  },
  {
    id: "cueva-del-indio",
    placeId: "cueva-del-indio",
    journeyId: "puerto-rico-2024",
    parentId: "puerto-rico",
    eyebrow: "Atlantic coast",
    category: "Cliffs and sea caves",
    camera: {
      center: [-66.641578, 18.49269],
      zoom: 13.2,
      pitch: 66,
      bearing: 18,
    },
    hero: {
      assetId: "image-puerto-rico-cueva-del-indio",
      role: "hero",
      alt: "Cueva del Indio photograph",
    },
    media: [
      {
        assetId: "image-puerto-rico-cueva-del-indio",
        role: "gallery",
        alt: "Cueva del Indio media 1",
      },
      {
        assetId: "image-puerto-rico-still001",
        role: "gallery",
        alt: "Cueva del Indio media 2",
      },
      {
        assetId: "image-puerto-rico-cueva-indio-1",
        role: "gallery",
        alt: "Cueva del Indio media 3",
      },
    ],
    relatedIds: ["old-san-juan", "crash-boat-beach"],
  },
  {
    id: "gozalandia-falls",
    placeId: "gozalandia-falls",
    journeyId: "puerto-rico-2024",
    parentId: "puerto-rico",
    eyebrow: "Jungle waterfall",
    category: "Swim and hike",
    camera: {
      center: [-66.9831, 18.36093],
      zoom: 14.1,
      pitch: 68,
      bearing: -24,
    },
    hero: {
      assetId: "image-puerto-rico-puerto-rico-watewerfall-2",
      role: "hero",
      alt: "Gozalandia Falls photograph",
    },
    media: [
      {
        assetId: "image-puerto-rico-puerto-rico-watewerfall-2",
        role: "gallery",
        alt: "Gozalandia Falls media 1",
      },
      {
        assetId: "image-puerto-rico-puerto-rico-water-6",
        role: "gallery",
        alt: "Gozalandia Falls media 2",
      },
      {
        assetId: "image-puerto-rico-waterfall-1",
        role: "gallery",
        alt: "Gozalandia Falls media 3",
      },
    ],
    relatedIds: ["crash-boat-beach"],
  },
  {
    id: "crash-boat-beach",
    placeId: "crash-boat-beach",
    journeyId: "puerto-rico-2024",
    parentId: "puerto-rico",
    eyebrow: "Northwest coast",
    category: "Beach and snorkeling",
    camera: {
      center: [-67.16525, 18.45972],
      zoom: 14.4,
      pitch: 63,
      bearing: 28,
    },
    hero: {
      assetId: "image-puerto-rico-puerto-rico-crashboat",
      role: "hero",
      alt: "Crash Boat Beach photograph",
    },
    media: [
      {
        assetId: "image-puerto-rico-puerto-rico-crashboat",
        role: "gallery",
        alt: "Crash Boat Beach media 1",
      },
      {
        assetId: "image-puerto-rico-puerto-rico-crash-boat",
        role: "gallery",
        alt: "Crash Boat Beach media 2",
      },
      {
        assetId: "image-puerto-rico-underwater-reel-fast-00-00-36-10-still004",
        role: "gallery",
        alt: "Crash Boat Beach media 3",
      },
    ],
    relatedIds: ["cueva-del-indio", "gozalandia-falls"],
  },
])
