// Canonical St. John Journey. The seven day labels are editorial chapters;
// exact calendar dates and the charter's within-day stop order remain unknown.
export const usviStJohn2025Journey = Object.freeze({
  id: "usvi-st-john-2025",
  slug: "usvi",
  title: "St. John, USVI",
  publicationStatus: "published",
  evidenceStatus: "confirmed",
  dateRange: {
    start: null,
    end: null,
    label: "Year to be confirmed",
  },
  hero: {
    assetId: "image-usvi-usvi",
    role: "hero",
    alt: "St. John journey cover photograph",
  },
  fullImage: {
    assetId: "image-usvi-usvi-full",
    role: "full",
    alt: "St. John destination photograph",
  },
  gallery: [],
  description:
    "A family journey across St. John: ferry arrival in Cruz Bay, calm water and turtles at Maho, a music-filled charter day, north-shore beaches, and the rewarding outing to Waterlemon Cay.",
  duration: "7 story chapters",
  audience: "Families, beach lovers, and island explorers",
  costLevel: "",
  bestTimeToGo: "Trip timing to be confirmed",
  gearHighlights: [],
  travelNotes: [
    "The trip began with a flight and ferry connection into Cruz Bay.",
    "The seven chapters preserve the creator's current editorial order without inventing exact calendar dates.",
    "Nate's Custom Charters operated the boat day; the captain's humor and love of music became part of the memory.",
  ],
  tips: [
    "Maho was our family's favorite beach for its calm-ish water and the turtle encounter we shared there.",
    "Cinnamon felt more touristy to us than Maho; that is our firsthand comparison, not a universal ranking.",
    "Waterlemon was really cool, but reaching it felt like a trek.",
    "Wildlife sightings are part of our story, never a promise about what another visitor will see.",
  ],
  lodging: [
    {
      name: "Oceana Villa",
      location: "Great Cruz Bay, St. John",
      nights: null,
      blurb:
        "Our vacation-rental home base overlooking Great Cruz Bay. The pool, bay view, and slower family moments balanced the days spent exploring the island.",
      image: null,
      link: "",
      verificationNotes:
        "The newest creator-supplied spelling is Oceana. No current listing link, availability claim, accessibility claim, or sponsorship is asserted.",
    },
  ],
  // Visit order follows the creator's seven-chapter outline. Hermit Crab
  // Island remains in the story but stays off the map until it is resolved.
  visits: [
    {
      id: "usvi-st-john-2025-cruz-bay",
      legacyId: "cruz-bay",
      placeId: "cruz-bay",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "arrival",
      description:
        "A flight and ferry crossing brought us into Cruz Bay and marked the real beginning of the island journey.",
      summary:
        "Cruz Bay was the handoff from travel day to island time: airport, ferry, harbor, and the first view of St. John.",
      notes: [
        "Arrival by flight and ferry is creator-confirmed.",
        "A previous firsthand recollection places the ferry arrival around sunset, but that timing awaits media timestamp verification.",
      ],
      media: [],
      socialLinks: [],
    },
    {
      id: "usvi-st-john-2025-maho-bay",
      legacyId: "maho-bay",
      placeId: "maho-bay",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "beach",
      description:
        "Maho was our family's favorite beach: calm-ish water, paddleboarding, room for the kids to relax, and a memorable turtle encounter while snorkeling together.",
      summary:
        "The easy pace at Maho made it the family favorite, especially the shared in-water turtle encounter.",
      notes: [
        "Paddleboarding, relaxed beach time, animals, and the Maho visit are creator-confirmed.",
        "The creator previously confirmed snorkeling with his son and seeing a sea turtle together.",
        "The story does not promise wildlife sightings or assign every animal photograph to this day before media review.",
      ],
      media: [],
      socialLinks: [],
    },
    {
      id: "usvi-st-john-2025-great-cruz-bay",
      legacyId: "great-cruz-bay",
      placeId: "great-cruz-bay",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "lodging",
      description:
        "Oceana Villa overlooking Great Cruz Bay became the trip's home base, with pool time, broad water views, and quieter family moments between outings.",
      summary:
        "The villa overlooking Great Cruz Bay gave the journey a slower counterpoint to its beach and boat days.",
      notes: [
        "Oceana Villa and the Great Cruz Bay setting were supplied directly by the creator.",
        "Amenity details remain listing claims until an official source is verified, and no sponsorship or affiliate relationship is implied.",
        "The public Atlas pin represents Great Cruz Bay broadly rather than the villa's private address.",
      ],
      media: [],
      socialLinks: [],
    },
    {
      id: "usvi-st-john-2025-hermit-crab-island",
      legacyId: "hermit-crab-island",
      placeId: "hermit-crab-island",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "charter-stop",
      description:
        "Hermit Crab Island was one of two creator-confirmed stops during the charter day with Nate's Custom Charters.",
      summary:
        "A confirmed charter stop whose firsthand name is preserved while its formal geographic identity remains unresolved.",
      notes: [
        "The stop and the name Hermit Crab Island are creator-confirmed.",
        "No coordinates, alternate official name, or route order are asserted yet.",
      ],
      media: [],
      socialLinks: [],
    },
    {
      id: "usvi-st-john-2025-lovango-cay",
      legacyId: "lovango-cay",
      placeId: "lovango-cay",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "charter-stop",
      description:
        "Lovango was the laid-back half of the charter day, with lunch and time to relax before returning to the water.",
      summary:
        "We stopped at Lovango for lunch and a slower stretch of the boat day, with no need to turn the memory into a specific venue claim.",
      notes: [
        "The Lovango visit, lunch, and relaxation are creator-confirmed.",
        "The exact restaurant or beach-club venue is not confirmed.",
        "Nate's Custom Charters was the operator, not a sponsor or affiliate.",
      ],
      media: [],
      socialLinks: [],
    },
    {
      id: "usvi-st-john-2025-trunk-bay",
      legacyId: "trunk-bay",
      placeId: "trunk-bay",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "beach",
      description:
        "Trunk Bay centered the children's beach day, with family play, swimming, and striking underwater scenery around rock, coral, and pale sand.",
      summary:
        "Trunk Bay became a family and underwater chapter rather than just another beach stop.",
      notes: [
        "Children playing and the Trunk Bay visit are creator-confirmed.",
        "Previous firsthand discussion confirms footage of rocks, coral, pale underwater sand, and the creator's wife swimming and diving.",
        "Specific reef or wildlife identifications wait for media review.",
      ],
      media: [],
      socialLinks: [],
    },
    {
      id: "usvi-st-john-2025-cinnamon-bay",
      legacyId: "cinnamon-bay",
      placeId: "cinnamon-bay",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "beach",
      description:
        "Cinnamon Bay offered a different north-shore rhythm and felt more touristy to us than the quieter family day at Maho.",
      summary:
        "Cinnamon gave us a useful firsthand contrast with Maho, without turning a personal impression into a universal verdict.",
      notes: [
        "The visit and photographs are creator-confirmed.",
        "The more-touristy comparison is explicitly subjective.",
      ],
      media: [],
      socialLinks: [],
    },
    {
      id: "usvi-st-john-2025-waterlemon-cay",
      legacyId: "waterlemon-cay",
      placeId: "waterlemon-cay",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "island-outing",
      description:
        "Waterlemon Cay was the trip's more effortful outing: really cool once we reached it, but enough of a trek to feel distinct from the beach days.",
      summary:
        "Waterlemon felt earned, with the approach becoming part of the experience rather than background to it.",
      notes: [
        "The visit, photographs, and the creator's 'really cool, but a bit of a trek' impression are confirmed.",
        "No hike distance, trailhead, trail condition, or snorkeling detail is asserted until the trip record and media are reviewed.",
      ],
      media: [],
      socialLinks: [],
    },
  ],
  days: [
    {
      label: "Day 1 - Arrival in Cruz Bay",
      summary:
        "The journey began in motion: a flight, a ferry crossing, and the first arrival into Cruz Bay. An earlier recollection places the harbor near sunset, but the story leaves that timing open until the source media confirms it.",
      visits: [{ visitId: "usvi-st-john-2025-cruz-bay" }],
      routes: [],
    },
    {
      label: "Day 2 - Maho and the Villa",
      summary:
        "Maho set the family tone for the trip with paddleboarding, calm-ish water, relaxed beach time, and the turtle encounter we still remember. The day then settles back into the pool and views at Oceana Villa overlooking Great Cruz Bay.",
      visits: [
        { visitId: "usvi-st-john-2025-maho-bay" },
        { visitId: "usvi-st-john-2025-great-cruz-bay" },
      ],
      routes: [],
    },
    {
      label: "Day 3 - Boat Day",
      summary:
        "Nate's Custom Charters carried the day, with a funny captain, music always close by, and the line that captured the mood: 'Hope you like music.' Hermit Crab Island and Lovango are both confirmed stops; their exact sequence is intentionally left unresolved. Lovango was for lunch and slowing down, while the boat offered views of houses and the coast between stops.",
      visits: [
        { visitId: "usvi-st-john-2025-hermit-crab-island" },
        { visitId: "usvi-st-john-2025-lovango-cay" },
      ],
      routes: [],
    },
    {
      label: "Day 4 - Family Time at Trunk Bay",
      summary:
        "A children's beach day opened into one of the journey's strongest underwater chapters: swimming, rocks, coral, pale sand, and the simple energy of the family playing together.",
      visits: [{ visitId: "usvi-st-john-2025-trunk-bay" }],
      routes: [],
    },
    {
      label: "Day 5 - Cinnamon Bay",
      summary:
        "Cinnamon Bay stood on its own, and felt more touristy to us than Maho. That contrast is part of the story, not a ranking that every visitor has to share.",
      visits: [{ visitId: "usvi-st-john-2025-cinnamon-bay" }],
      routes: [],
    },
    {
      label: "Day 6 - Waterlemon Cay",
      summary:
        "Waterlemon was really cool, but it took more effort to reach. The approach and the payoff make this outing feel different from the easier beach chapters, even while the exact trail details remain unpublished.",
      visits: [{ visitId: "usvi-st-john-2025-waterlemon-cay" }],
      routes: [],
    },
    {
      label: "Day 7 - Departure",
      summary:
        "The final photographs close the journey as an epilogue. Exact ferry, flight, location, and timing details remain open until the departure media and travel records are reviewed.",
      visits: [],
      routes: [],
    },
  ],
  socialLinks: [],
  featuredMedia: [],
  atlasNotes: {
    "st-john":
      "We moved between a harbor arrival, family beach days, a personality-filled charter, and one more involved island outing without forcing every day into the same rhythm.",
    "cruz-bay":
      "The ferry into Cruz Bay was the moment the trip shifted from travel logistics to the island itself.",
    "maho-bay":
      "Maho became our family favorite: calm-ish water, room to slow down, and a turtle encounter shared while snorkeling with my son.",
    "great-cruz-bay":
      "Oceana Villa overlooking Great Cruz Bay gave us a poolside reset and a quieter home base between outings.",
    "lovango-cay":
      "Lovango was for lunch and relaxing during a charter day remembered just as much for the captain's humor and music as the scenery.",
    "trunk-bay":
      "Trunk Bay brought the children's beach time together with the trip's strongest underwater textures and family footage.",
    "cinnamon-bay":
      "Cinnamon felt more touristy to us than Maho, a personal contrast that helped each beach keep its own identity.",
    "waterlemon-cay":
      "Waterlemon was really cool, but it felt like a trek - the effort of getting there became part of the memory.",
  },
  relatedPlaceIds: [
    "st-john",
    "cruz-bay",
    "maho-bay",
    "great-cruz-bay",
    "hermit-crab-island",
    "lovango-cay",
    "trunk-bay",
    "cinnamon-bay",
    "waterlemon-cay",
  ],
  verificationNotes:
    "The creator-authorized seven-chapter outline is authoritative for editorial grouping. Exact dates, the charter's stop sequence, the formal identity of Hermit Crab Island, and per-file media attribution remain open.",
})
