// Miami's public narrative follows docs/reference/storytelling-framework.md.
// It uses only creator-confirmed recollections. Unknown dates, exact chronology,
// operator identity, and lodging details stay omitted; generated Media placements
// remain owned by the media-ingestion registry rather than this narrative file.
function miamiVisit(placeId, type, description, summary, notes = []) {
  return {
    id: `miami-south-beach-2026-${placeId}`,
    legacyId: placeId,
    placeId,
    date: null,
    visitStatus: "visited",
    evidenceStatus: "confirmed",
    type,
    description,
    summary,
    notes,
    media: [],
    socialLinks: [],
  }
}

export const miamiJourney = Object.freeze({
  id: "miami-south-beach-2026",
  year: 2026,
  slug: "miami-2026",
  legacySlugs: ["miami"],
  title: "Miami Winter Getaway (2026)",
  publicationStatus: "coming-soon",
  evidenceStatus: "confirmed",
  itineraryMode: "chapters",
  dateRange: {
    start: null,
    end: null,
    label: "January 2026",
  },
  hero: null,
  fullImage: null,
  gallery: [],
  description:
    "We come for a little January sun and find two versions of Miami. One is the familiar South Beach set, and the other is a wilder place reached by airboat, bicycle, and kayak.",
  duration: "Short winter getaway",
  audience: "Families mixing beach time with outdoor adventure",
  costLevel: "",
  bestTimeToGo: "",
  gearHighlights: [],
  travelNotes: [
    "January mornings could feel cool or damp during our stay, while the sun felt much stronger by midmorning.",
    "The ocean felt cool but still swimmable to our family visiting from the Atlanta area.",
    "At Shark Valley, midday heat and limited shade made timing and sun protection matter to us.",
    "The smallest children's bike available during our visit was 20 inches, which challenged our son at five years old. Current rental inventory may differ.",
  ],
  tips: [],
  lodging: [],
  visits: [
    miamiVisit(
      "miami-south-beach",
      "Beach and city walks",
      "South Beach feels familiar before it feels real. The storefronts and architecture look borrowed from a Miami Vice scene, then the tourists, including us, break the illusion. We check into an Airbnb, head straight outside, and let the first walk set the pace.",
      "Cool January mornings give way to stronger sun, but the first surprise is how quickly South Beach shifts from movie set to an ordinary family walk.",
      [
        "We walked South Beach soon after checking into our Airbnb.",
        "Beach walks, boardwalk scenes, sand, and candid family time made up much of the stay.",
      ]
    ),
    miamiVisit(
      "south-pointe-park",
      "Sunrise and pier walk",
      "At South Pointe, the trip slows down. I head out alone for sunrise on one outing, and during a family visit we scan the water from the pier for sharks and other sea life. The looking becomes its own reason to linger.",
      "A solo sunrise and a family search for sea life give the quieter morning hours their own place in the trip.",
      [
        "I went out alone for a sunrise during the trip.",
        "We visited the park and pier looking for sharks and other sea life.",
      ]
    ),
    miamiVisit(
      "everglades",
      "Airboat outing",
      "The Everglades part of the trip starts at airboat speed. The wind reaches us before the stronger afternoon heat, our guide shares details about native alligators that are new to me, and the animals come much closer to the boat than I expect. My son loves the ride. I would do this part again without much convincing.",
      "An airboat, a guide with stories to share, and close alligator encounters turn the Everglades into the trip's fastest family chapter.",
      [
        "Our guide shared information about native alligators that was new to us.",
        "We remember coming within inches of alligators while on the airboat.",
        "My son loved the ride, and I would do the outing again.",
      ]
    ),
    miamiVisit(
      "shark-valley",
      "Family cycling",
      "At Shark Valley, the engine is gone and we are pedaling instead, sometimes past resting alligators closer to the path than we expect. The sun builds, shade is scarce, and a 20 inch bike asks a lot of our son at five years old. He keeps going and we finish safely.",
      "A family bike ride becomes something stranger when resting alligators share the edge of the path and the afternoon heat keeps building.",
      [
        "We rented bikes on site. The smallest children's bike available during our visit was 20 inches.",
        "There were a few tense moments with our son at five years old, but everyone finished safely.",
        "Midday heat and limited shade mattered more than we expected.",
      ]
    ),
    miamiVisit(
      "oleta-river-state-park",
      "Mangrove kayaking",
      "The route shifts from the familiar beaches and streets of Miami to rented kayaks and mangroves at Oleta. We paddle out to an island, find raccoons there, and end up with one of the strangest memories of the trip.",
      "Kayaks, mangroves, and raccoons on an island reveal a version of Miami we did not expect to find.",
      [
        "We rented kayaks in the park and paddled through mangroves.",
        "We encountered raccoons on an island during the paddle.",
      ]
    ),
  ],
  days: [
    {
      label: "Arrival in a South Beach movie set",
      summary:
        "We land after a short flight from the Atlanta area, check into an Airbnb, and head straight out on foot. South Beach has the staged familiarity of a Miami Vice scene, with distinctive storefronts, restaurants, and architecture, until the crowds make the obvious point that this is real life. We are tourists too. That first walk is enough to move the trip out of the routine after Christmas and into its own rhythm.",
      visits: [
        {
          visitId: "miami-south-beach-2026-miami-south-beach",
          notes:
            "The first walk sets the visual language for the trip. Cinematic Miami is interrupted in the best way by ordinary family time.",
        },
      ],
      partnerIds: [],
      routes: [],
    },
    {
      label: "Cool mornings, South Pointe, and the water",
      summary:
        "Morning is when Miami feels least like its reputation. It can be cool, even damp, and I head out alone for sunrise before the stronger sun arrives. During a family visit to South Pointe, we scan the water from the pier for sharks and other sea life. Across the stay, the beach keeps taking over again. The January water is cool, but not too cold for our family visiting from the Atlanta area.",
      visits: [
        {
          visitId: "miami-south-beach-2026-south-pointe-park",
          notes:
            "A quieter morning chapter built around sunrise, the pier, and time spent looking into the water.",
        },
        {
          visitId: "miami-south-beach-2026-miami-south-beach",
          notes:
            "Beach time gives the trip its recurring pace rather than a checklist of attractions.",
        },
      ],
      partnerIds: [],
      routes: [],
    },
    {
      label: "A quieter pool and beach afternoon",
      summary:
        "South Beach is busy, but this afternoon goes the other way. A pool and beach pass at the Savoy gives us a quiet pause at a boutique hotel, with good drinks and nearly the whole pool to ourselves. We move between the property and the beach. Dinners along South Beach make up another part of the stay, but the quiet pool is the detail that lingers. It is not what I expect in the middle of this trip.",
      visits: [
        {
          visitId: "miami-south-beach-2026-miami-south-beach",
          notes:
            "A nearly empty pool gives the busiest part of the trip an unexpectedly quiet pause.",
        },
      ],
      partnerIds: [],
      routes: [],
    },
    {
      label: "Bikes, gators, and airboats",
      summary:
        "The Everglades part of the trip keeps changing speed. On the airboat, the wind arrives before the stronger afternoon heat and my son loves the ride. The guide shares alligator details I had not heard before, while the animals come much closer to the boat than I expect. On the Shark Valley bike outing, the engine is gone and we pedal past resting alligators close to the path. The heat builds, shade is limited, and the smallest children's bike available that day is 20 inches. It asks a lot of our son at five years old. There are a few tense moments. He keeps going, and we finish safely.",
      visits: [
        {
          visitId: "miami-south-beach-2026-everglades",
          notes:
            "The airboat puts motion, wind, our guide's alligator knowledge, and my son's reaction at the center of the experience.",
        },
        {
          visitId: "miami-south-beach-2026-shark-valley",
          notes:
            "The airboat brings the speed. Shark Valley turns the wildlife encounter into a family bike ride.",
        },
      ],
      partnerIds: [],
      routes: [],
    },
    {
      label: "Mangroves and raccoons at Oleta",
      summary:
        "Miami changes shape again at Oleta River State Park. We rent kayaks and paddle through mangroves, putting the beaches and storefronts behind us for a while. On one island, raccoons become the oddest wildlife encounter of the trip. It is strange, memorable, and worth making room for when a Miami trip has time for one more change of pace.",
      visits: [
        {
          visitId: "miami-south-beach-2026-oleta-river-state-park",
          notes:
            "The mangrove paddle becomes one of the trip's strangest and most memorable detours.",
        },
      ],
      partnerIds: [],
      routes: [],
    },
  ],
  socialLinks: [],
  featuredMedia: [],
  atlasNotes: {},
  relatedPlaceIds: [
    "miami-south-beach",
    "south-pointe-park",
    "everglades",
    "shark-valley",
    "oleta-river-state-park",
  ],
  verificationNotes:
    "First narrative pass from creator-confirmed recollections. The creator confirmed the trip year as 2026; exact dates, chapter chronology beyond arrival, Airbnb, restaurants, Savoy property identity, airboat operator and route, and Oleta island name remain unverified. The generated Media registry currently places published batches on the Miami Beach, Everglades, and Oleta Visits; South Pointe and Shark Valley media plus curated story roles remain unresolved.",
})
