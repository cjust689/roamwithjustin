// Canonical St. John Journey. The seven day labels are editorial chapters;
// exact calendar dates and the charter's within-day stop order remain unknown.
export const usviStJohn2025Journey = Object.freeze({
  id: "usvi-st-john-2025",
  year: 2025,
  slug: "usvi-2025",
  legacySlugs: ["usvi"],
  title: "St. John, USVI (2025)",
  publicationStatus: "published",
  evidenceStatus: "confirmed",
  dateRange: {
    start: null,
    end: null,
    label: "2025",
  },
  hero: {
    assetId: "image-usvi-usvi-full",
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
    "A family journey that shifts from Atlanta jets to St. Thomas prop planes, crosses into St. John in sunset light, and finds its pace between Maho, a charter shaped by music, beaches along the northern shore, and Waterlemon Cay.",
  duration: "7 story chapters",
  audience: "Families, beach lovers, and island explorers",
  costLevel: "",
  bestTimeToGo: "",
  gearHighlights: [],
  travelNotes: [
    "We flew from Atlanta into Cyril E. King Airport on St. Thomas, crossed the island by taxi, and took the passenger ferry from Red Hook into Cruz Bay.",
    "Traffic keeps left even though the steering wheel is also on the left, something the first taxi ride makes impossible to forget.",
    "The story follows seven chapters, moving from arrival through beach days, the charter, and the Waterlemon Cay outing.",
    "Nate's Custom Charters operated the boat day; the captain's humor and love of music became part of the memory.",
  ],
  tips: [
    "Maho was our family's favorite beach. Parking became harder as the morning went on, so getting there earlier made the easy roadside access even easier.",
    "Cinnamon felt more touristy to us than Maho; that is our firsthand comparison, not a universal ranking.",
    "Waterlemon rewards the effort, but the rocky coastal walk, limited amenities, and strong current deserve proper shoes, a light load, and respect for the ocean.",
    "Wildlife sightings are part of our story, never a promise about what another visitor will see.",
  ],
  lodging: [
    {
      partnerId: "oceana-villa-st-john",
      name: "Oceana Villa",
      location: "Great Cruz Bay, St. John",
      nights: null,
      blurb:
        "Our vacation rental home base overlooking Great Cruz Bay. The roosters, breakfasts on the patio, steady breeze, and broad water view gave the mornings their own rhythm before we went anywhere.",
      image: null,
      verificationNotes:
        "The creator-supplied spelling and Great Cruz Bay description match the current Oceana Villa site. No availability, accessibility, or sponsorship claim is asserted.",
    },
  ],
  // Visit order follows the creator's seven-chapter outline. Hermit Crab
  // Island remains in the story but stays off the map until it is resolved.
  visits: [
    {
      id: "usvi-st-john-2025-cyril-e-king-airport",
      legacyId: "cyril-e-king-airport",
      placeId: "cyril-e-king-airport",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "arrival",
      description:
        "Cyril E. King Airport made the change in scale immediate: fresh air and palms outside, ocean views nearby, and small prop planes moving where Atlanta's largest jets had filled the horizon hours earlier.",
      summary:
        "The small St. Thomas airport made arrival feel fast and physical. Outside air, palms, ocean, and prop planes replaced the scale of Atlanta.",
      notes: [
        "The flight from Atlanta ended at Cyril E. King Airport on St. Thomas.",
        "The terminal moved quickly on arrival, without the long lines or wait the family expected.",
        "Prop planes arriving and departing created the first strong contrast with ATL's large jets.",
      ],
      media: [],
      socialLinks: [],
    },
    {
      id: "usvi-st-john-2025-red-hook-ferry-terminal",
      legacyId: "red-hook-ferry-terminal",
      placeId: "red-hook-ferry-terminal",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "ferry terminal",
      description:
        "The taxi ride to Red Hook introduced traffic moving on the left, the working harbors of St. Thomas, and the cruise ships that kept catching my son's attention before we boarded for Cruz Bay.",
      summary:
        "The transfer across St. Thomas became part of the arrival story, especially once my son started pointing out the cruise ships in the harbor.",
      notes: [
        "The family loaded their luggage into a taxi or van and crossed St. Thomas to Red Hook.",
        "Driving on the left while the steering wheel was also on the left made for a memorable adjustment.",
        "My son pointed out large cruise ships while we passed the main harbor.",
      ],
      media: [],
      socialLinks: [],
    },
    {
      id: "usvi-st-john-2025-cruz-bay",
      legacyId: "cruz-bay",
      placeId: "cruz-bay",
      date: null,
      visitStatus: "visited",
      evidenceStatus: "confirmed",
      type: "arrival",
      description:
        "We rode the top deck into Cruz Bay with the wind in our faces, the sun dropping behind St. Thomas, and late gold light reaching St. John in front of us.",
      summary:
        "The quick ferry crossing arrived in the best possible light: St. Thomas falling into silhouette behind us and St. John turning gold ahead.",
      notes: [
        "The family reached the ferry shortly before sunset and sat on the top deck during the crossing.",
        "The ride felt surprisingly fast, with strong wind on the open upper deck.",
        "After arriving, the family stopped for a quick bite at a packed High Tide near the ferry dock.",
      ],
      media: [
        {
          assetId: "video-usvi-arrival-ferry-001",
          role: "gallery",
          caption: "Arriving on St. Thomas and crossing to St. John by ferry",
        },
      ],
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
        "Maho was our family's favorite beach: calm water, anchored boats, paddleboards, a Painkiller that converted even a reluctant rum drinker, and a memorable turtle encounter while snorkeling together.",
      summary:
        "Maho paired easy roadside access and useful amenities with the kind of calm water that let the whole family settle in.",
      notes: [
        "Parking became more difficult later in the morning, but the beach remained easy to reach directly from the road.",
        "Reef2Peak rentals, food, drinks, and restrooms were all within a short walk during the visit.",
        "I do not usually enjoy rum, but I loved the Painkiller I tried at Maho.",
        "I snorkeled with my son, and we saw a sea turtle together.",
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
        "Oceana Villa overlooking Great Cruz Bay became the trip's home base, where roosters replaced alarms and breakfast happened on the patio in the breeze above the water.",
      summary:
        "The villa mornings had their own island soundtrack: the infamous St. John roosters, breakfast outside, and the view over Great Cruz Bay.",
      notes: [
        "Oceana Villa in Great Cruz Bay became our base for the trip.",
        "I captured drone footage and a small photo set from the patio and around the property.",
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
      type: "charter stop",
      description:
        "At the place I call Hermit Crab Island, the ground looked still until we stopped and watched it move. Hermit crabs appeared everywhere once our eyes adjusted.",
      summary:
        "The name is mine, not an official map label. What stays with me is the moment the ground seemed to come alive with hermit crabs.",
      notes: [
        "Hermit Crab Island is the name we use for this boat day stop.",
        "We also saw a sunken sailboat in the water.",
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
      type: "charter stop",
      description:
        "Lovango gave the charter day a slower middle: lunch, time to relax, and open views back toward both St. John and St. Thomas.",
      summary:
        "The stop had a cool, relaxed feel and enough distance to see St. John and St. Thomas as part of the same view.",
      notes: [
        "We stopped at Lovango for lunch and time to relax.",
        "Nate's Custom Charters was the operator, not a sponsor or affiliate.",
      ],
      media: [
        {
          assetId: "video-usvi-nates-charters-001",
          role: "gallery",
          caption:
            "Boat day with Nate's Custom Charters between St. Thomas and St. John",
        },
      ],
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
        "Trunk Bay arrived with a world class reputation and absolutely looked the part, but honestly, I enjoyed some of St. John's other beaches more.",
      summary:
        "The beauty was obvious; the more useful truth for our family was that the rougher water demanded a closer eye on the younger kids.",
      notes: [
        "Children played along the beach during our Trunk Bay visit.",
        "The tide and shore break felt rougher than at Maho during the family's visit, which required more attention with young children.",
        "Our footage moves across rocks, coral, pale underwater sand, and a swimmer diving through clear water.",
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
        "Cinnamon Bay felt like the most developed and tourist focused beach we visited, with sailboats, a full service restaurant, a gift shop, and more amenities close at hand.",
      summary:
        "Cinnamon was beautiful, but its busier, more developed rhythm made the quieter ease of Maho stand out even more.",
      notes: [
        "The photographs follow our family visit to Cinnamon Bay.",
        "The family found plenty of parking, though the area became busier as the day developed.",
        "Sailboats, a full service restaurant, a gift shop, and other amenities were present during the visit.",
        "The comparison with quieter beaches reflects our family's experience.",
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
      type: "island outing",
      description:
        "Waterlemon Cay was the more adventurous version of the trip, without the amenities of the easier beaches. It brought plantation history, a rocky coastal walk, active sea life, and a current that deserved more respect than the calm beaches had asked of us.",
      summary:
        "The coastal approach of roughly a mile made Waterlemon feel earned, and seeing almost no one else there made the payoff unusually intimate.",
      notes: [
        "The outing began around the old Annaberg sugar plantation landscape, whose history added necessary weight before the walk to the cay.",
        "I remember roughly a mile of rocky coastal walking and recommend proper shoes and carrying as little as practical.",
        "The family encountered only one or two other people and observed abundant sea life, including reef sharks.",
        "The current felt challenging during the visit; the story treats that as a firsthand warning to avoid underestimating the ocean.",
      ],
      media: [
        {
          assetId: "video-usvi-waterlemon-001",
          role: "gallery",
          caption: "The coastal approach and water around Waterlemon Cay",
        },
      ],
      socialLinks: [],
    },
  ],
  days: [
    {
      label: "Day 1: From Atlanta to Cruz Bay",
      summary:
        "The first thing that changes is the scale. We leave Atlanta, where some of the largest planes in the sky seem to be taking off constantly, and arrive at this small St. Thomas airport with little prop planes coming and going. We step outside into fresh air with palms in the distance, an ocean breeze, and island views. The terminal moves fast. There is no long wait or drawn out line, which only adds to the anticipation of finally being where we have waited to be.\n\nOur bags go into the taxi and the next adjustment happens immediately: traffic keeps left even though the steering wheel is also on the left. On the ride across St. Thomas, my son keeps pointing out the giant cruise ships in the main harbor while the ports and hills slide past the windows.\n\nWe reach Red Hook not long before sunset. The ferry is surprisingly quick, especially from the top deck with the wind in our faces. The sun drops behind us, St. Thomas turns into a silhouette, and the last gold light lands on St. John ahead. By the time we step into a packed High Tide for a quick bite, the travel day no longer feels like something we had to get through. It is the opening scene.",
      visits: [
        { visitId: "usvi-st-john-2025-cyril-e-king-airport" },
        { visitId: "usvi-st-john-2025-red-hook-ferry-terminal" },
        { visitId: "usvi-st-john-2025-cruz-bay" },
      ],
      partnerIds: ["high-tide-st-john"],
      routes: [
        {
          label: "Red Hook to Cruz Bay passenger ferry",
          link: "https://dpw.vi.gov/ferries/",
          duration: "About 20 minutes",
        },
      ],
    },
    {
      label: "Day 2: Maho and the Villa",
      summary:
        "The infamous St. John roosters take care of the alarm. If you know, you know. We make breakfast and sit on the patio above Great Cruz Bay, letting the breeze and the view stretch the morning while I capture a few photographs and send the drone up.\n\nMaho is easy to understand once we arrive. The beach is right off the road, with paddleboards and Reef2Peak rentals, food, drinks, and restrooms all close enough that the family never has to turn the day into a production. Parking gets harder the later the morning goes, but once we are settled, the bay is calm, boats sit at anchor, and everything slows down. I order a Painkiller even though I do not normally like rum. My God, it is good.\n\nMaho ends up being my favorite beach on the island. It is beautiful without requiring much from us, especially with kids, and it gives my son and me the chance to snorkel together and spot a sea turtle. That shared moment lasts longer than the drink, the paddleboards, or any ranking ever could.",
      visits: [
        { visitId: "usvi-st-john-2025-maho-bay" },
        { visitId: "usvi-st-john-2025-great-cruz-bay" },
      ],
      partnerIds: ["reef2peak"],
      routes: [],
    },
    {
      label: "Day 3: Boat Day",
      summary:
        "Nate's Custom Charters picks us up from the National Park dock beside the Cruz Bay Visitor Center. There are twelve of us, and the boat handles the group without ever feeling cramped. Most of it is covered, which matters once the sun is up, and it moves through the chop more smoothly than I expect.\n\nThe captain is phenomenal: funny, relaxed, and serious about the music. 'Hope you like music,' is less a warning than the operating philosophy for the day. We move from reef to reef, watching the coast change between St. Thomas and Leinster Bay and seeing sea life almost everywhere we stop.\n\nAt the place I call Hermit Crab Island, we pause long enough to notice that the ground is moving. There are crabs everywhere. We also pass a sunken sailboat captured in the media. Lunch at Lovango slows the day down and opens a wide view toward both St. John and St. Thomas. The places are great. The captain's personality is what holds the whole day together.",
      visits: [
        {
          visitId: "usvi-st-john-2025-cruz-bay",
          notes:
            "Pickup from the National Park dock beside the Cruz Bay Visitor Center.",
        },
        { visitId: "usvi-st-john-2025-hermit-crab-island" },
        { visitId: "usvi-st-john-2025-lovango-cay" },
      ],
      partnerIds: ["nates-custom-charters"],
      routes: [],
    },
    {
      label: "Day 4: Family Time at Trunk Bay",
      summary:
        "Trunk Bay carries the kind of reputation that makes you assume it will be the favorite. It is genuinely beautiful, with pale sand, rock, coral, clear water, and the kind of underwater scenery that looks exactly like people hope St. John will look.\n\nHonestly, I still enjoy some of the other beaches more. The water feels rougher here during our visit, and with young kids that means watching more closely instead of fully settling in. It does not make Trunk Bay less impressive. It just makes our experience of it more complicated than the ranking.",
      visits: [{ visitId: "usvi-st-john-2025-trunk-bay" }],
      routes: [],
    },
    {
      label: "Day 5: Cinnamon Bay",
      summary:
        "Cinnamon feels like the most tourist oriented beach we visit. There are sailboats offshore, a full service restaurant, a gift shop, and enough amenities that the day can be almost effortless. We find plenty of parking, though the area gets busier as the day develops.\n\nIt is still beautiful. Every St. John beach seems to begin with that advantage, but the extra activity makes me appreciate Maho's quieter, easier rhythm even more. That is not a universal ranking. It is simply the version of each beach that our family experiences.",
      visits: [{ visitId: "usvi-st-john-2025-cinnamon-bay" }],
      routes: [],
    },
    {
      label: "Day 6: Waterlemon Cay",
      summary:
        "Waterlemon asks more from us before we ever reach the water. The route begins around the Annaberg sugar plantation landscape, where the history can change the mood if you let it. It should. The island's beauty and the people who were forced to build its plantation economy belong in the same view, even when that history is uncomfortable.\n\nFrom there, the walk follows roughly a mile of rocky coast toward the cay. Proper shoes matter. So does carrying less than you think you need. We see only one or two other people the entire time, which makes the water and the active sea life feel unusually close. We even see reef sharks.\n\nThe current is the part not to romanticize. It is challenging enough to remind us how quickly a quiet place can demand our full attention. Waterlemon is really cool, and it feels intimate in a way the more developed beaches do not. The payoff only works if we respect what it took to get there and do not underestimate the ocean once we arrive.",
      visits: [{ visitId: "usvi-st-john-2025-waterlemon-cay" }],
      routes: [],
    },
    {
      label: "Day 7: Departure",
      summary:
        "The final photographs close the journey as an epilogue, carrying us from the island back into the movement of the trip home.",
      visits: [],
      routes: [],
    },
  ],
  socialLinks: [],
  featuredMedia: [],
  atlasNotes: {
    "st-john":
      "We moved between a harbor arrival, family beach days, a charter shaped by the captain's personality, and one more involved island outing without forcing every day into the same rhythm.",
    "cyril-e-king-airport":
      "The change from Atlanta's huge jets to St. Thomas prop planes, palms, fresh air, and ocean views made the trip feel different before we even left the airport.",
    "red-hook-ferry-terminal":
      "The taxi ride brought the first adjustment to traffic moving on the left and my son's running commentary on the cruise ships before we crossed to St. John.",
    "cruz-bay":
      "We rode the top deck into Cruz Bay near sunset, with St. Thomas silhouetted behind us and gold light reaching St. John ahead.",
    "maho-bay":
      "Maho became our family favorite: calm water, an easy setup, a surprisingly good Painkiller, and a turtle encounter shared while snorkeling with my son.",
    "great-cruz-bay":
      "Roosters woke us at Oceana Villa before breakfast, patio views, and the breeze over Great Cruz Bay set the pace for the morning.",
    "lovango-cay":
      "Lovango was for lunch, relaxing, and wide views toward both islands during a charter day held together by the captain's humor and music.",
    "trunk-bay":
      "Trunk Bay looked worthy of its reputation, but the rougher water kept us more watchful with the kids and left other beaches higher on my personal list.",
    "cinnamon-bay":
      "Cinnamon felt more tourist focused and developed than Maho, with sailboats, a restaurant, a gift shop, and a busier rhythm during our visit.",
    "waterlemon-cay":
      "Waterlemon combined Annaberg's difficult history, a rocky coastal walk, very few people, active sea life, and a current that demanded respect.",
  },
  relatedPlaceIds: [
    "st-thomas",
    "cyril-e-king-airport",
    "red-hook-ferry-terminal",
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
