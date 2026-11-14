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
      "A road trip that begins after dark in San Juan, follows the north coast west, and slows down among mountain views, waterfalls, and Aguadilla beaches.",
    externalLinks: {
      official: "https://www.discoverpuertorico.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=Puerto+Rico",
    },
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
      "A main swimming pool beneath dark rock and filtered light, with an upper fall another 10–15 minutes along the trail.",
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
      "Fort walls open onto the coast, then bright facades, cobblestones, and small plazas pull the walk back into the city one detail at a time.",
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
      "A short walk from the road opens abruptly onto limestone arches and rough Atlantic water moving through the rock below.",
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
      "Piers, clear water, underwater frames, and a lively local crowd keep this Aguadilla beach moving through golden hour.",
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
      "A city that can move from narrow nighttime streets and tacos to fort walls, rooftop pools, and music spilling from the next block.",
    externalLinks: {
      official:
        "https://www.discoverpuertorico.com/article/things-to-do-san-juan",
      maps: "https://www.google.com/maps/search/?api=1&query=San+Juan%2C+Puerto+Rico",
    },
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
      "A polished beachfront night stop where dressed-up calm provides a counterpoint to San Juan's busier bar strips.",
    externalLinks: {
      official:
        "https://www.fairmont.com/en/hotels/puerto-rico/fairmont-el-san-juan-hotel/dining/the-lobby.restaurant.html",
      maps: "https://www.google.com/maps/search/?api=1&query=Fairmont+El+San+Juan+Hotel",
    },
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
      "A giant and controversial Columbus statue that appears from the highway and turns a brief pull-off into a complicated pause.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=Estatua+de+Colon%2C+Arecibo%2C+Puerto+Rico",
    },
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
    category: "nightlife",
    evidenceStatus: "confirmed",
    coordinatePrecision: "unknown",
    description:
      "A busy nightlife strip where salsa, reggaetón, hip-hop, dance, and electronic music offer a different room every few doors.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=Calle+C.+Canals%2C+San+Juan%2C+Puerto+Rico",
    },
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
      "Clear near-shore water and an offshore reef define this quiet northwest-coast stop, with stronger currents farther out and no formal facilities.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=Shacks+Beach%2C+Isabela%2C+Puerto+Rico",
    },
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
      "A small Aguadilla cove where calmer water and rocky edges create a quiet middle between larger beach stops.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=Playa+Pena+Blanca%2C+Aguadilla%2C+Puerto+Rico",
    },
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
      "Rock walls hold a compact pocket of calmer water inside the open Atlantic coast, making the cove easy to understand at a glance.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=Mar+Chiquita%2C+Manati%2C+Puerto+Rico",
    },
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
      "Rough surf, an undeveloped shoreline, and a cave about a mile from the main access give this beach a quieter, moodier character.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=Playa+Pastillo%2C+Isabela%2C+Puerto+Rico",
    },
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
      "A Taíno chief's face carved into roadside rock near Isabela, brief enough to remain part of the north-coast drive rather than interrupt it.",
    externalLinks: {
      maps: "https://www.google.com/maps/search/?api=1&query=La+Cara+del+Indio%2C+Isabela%2C+Puerto+Rico",
    },
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
  {
    id: "hacienda-florecer",
    name: "Hacienda Florecer",
    // Creator-supplied GPS is stored longitude-first by the Place contract.
    coordinates: [-67.0752792, 18.3882008],
    parentPlaceId: "puerto-rico",
    countryCode: "PR",
    regionCode: "PR",
    category: "lodging",
    evidenceStatus: "confirmed",
    coordinatePrecision: "exact",
    description:
      "Shipping-container architecture, a long pool, and open mountain views turn this Moca Airbnb from a practical base into one of the trip's real locations.",
    externalLinks: {
      maps: "https://www.google.com/maps?q=18.3882008,-67.0752792",
    },
    verificationNotes:
      "GPS supplied by the creator for the public Atlas pin on November 13, 2026.",
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
      "A private Paso Fino ride through fields and tropical growth toward palm-framed coastal trails, made personal by an energetic guide who sings along the way.",
    externalLinks: {
      official:
        "https://www.discoverpuertorico.com/es/profile/playuelas-horse-rides/12105",
      maps: "https://www.google.com/maps/search/?api=1&query=Playuelas+Horse+Rides%2C+Aguadilla%2C+Puerto+Rico",
    },
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
      "A rooftop above Aguadilla Bay where dinner, tropical drinks, and the last light give a long coastal day somewhere to settle.",
    externalLinks: {
      official: "https://aguadillarooftop.com/",
      maps: "https://www.google.com/maps/search/?api=1&query=ARTe+Aguadilla+Rooftop+Experience%2C+Puerto+Rico",
    },
    verificationNotes:
      "Coordinates remain unset until verified from the trip journal or media metadata.",
  },
])
