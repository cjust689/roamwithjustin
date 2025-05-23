export const trips = [
  {
    id: "utah",
    name: "Utah",
    cover: "/img/locations/utah/utah.jpg",
    fullImage: "/img/locations/utah/utah-full.jpg",
    gallery: [
      "/img/locations/utah/gallery/utah-saltflats.jpg",
      "/img/locations/utah/gallery/utah-arches.jpg",
      "/img/locations/utah/gallery/utah-deadhorse.jpg",
      "/img/locations/utah/gallery/utah-canyonlands.jpg",
      "/img/locations/utah/gallery/utah-parkcity.jpg",
    ],
    description:
      "A 7-day cinematic road trip through Utah\u2019s contrasting landscapes...",
    dates: "February 2025",
    duration: "7 days",
    who: "Couples, photographers, drone pilots, solo travelers",
    costLevel: "$$",
    bestTimeToGo: "February-March",
    gearHighlights: [
      {
        name: "Sony FX30",
        link: "https://amzn.to/sony-fx30-affiliate",
      },
      {
        name: "Sony A6700",
        link: "https://amzn.to/sony-fx30-affiliate",
      },
      {
        name: "DJI ACTION 5 Pro",
        link: "https://amzn.to/sony-fx30-affiliate",
      },
      {
        name: "DJI Air 3",
        link: "https://amzn.to/dji-air-3-affiliate",
      },
      {
        name: "DJI Avata 2",
        link: "https://amzn.to/dji-air-3-affiliate",
      },
      {
        name: "Tamron 35-150mm",
        link: "https://amzn.to/tamron-17-70-affiliate",
      },
      {
        name: "Tamron 17-70mm",
        link: "https://amzn.to/tamron-17-70-affiliate",
      },
      {
        name: "PGYTECH OneMo 2 Backpack",
        link: "https://amzn.to/grayl-geopress-affiliate",
      },
    ],
    travelNotes: [
      "Flew into Salt Lake City International Airport (SLC)",
      "Rented a JEEP 4x4 \u2014, as some roads are rough and unpaved though any suv with 4x4 or AWD would be fine for the specific locations we visited.",
      "Used Moab as a base for Arches and Canyonlands",
      "Stayed in Park City for final night before flying out",
    ],
    tips: [
      "Drone use is prohibited in all U.S. national parks...",
      "Bring layers. We had snow in Park City and desert heat near Moab...",
      "Don\u2019t underestimate how far apart locations are...",
      "Salt Flats are windy \u2014",
    ],
    lodging: [
      {
        name: "Montego Bay Hotel Casino Resort",
        location: "Wendover, UT",
        nights: 1,
        blurb: "Nice hotel with a casino and surprisingly busy...",
        image:
          "https://www.wendoverfun.com/library/images/backgrounds/mb-romanza-1.jpg",
        link: "https://www.wendoverfun.com/",
      },
      {
        name: "Hyatt Place Moab",
        location: "Moab, UT",
        nights: 2,
        blurb:
          "Affordable and central. Used as a base... Very clean, nice pool and hot tub to enjoy after hiking. Food was pretty good too!",
        image: `https://images.trvl-media.com/lodging/25000000/24420000/24413400/24413369/5bc5ea10.jpg?impolicy=resizecrop&rw=1200&ra=fit`,
        link: `https://www.expedia.com/Moab-Hotels-Hyatt-Place-Moab.h24413369.Hotel-Information?chkin=2025-05-21&chkout=2025-05-22&x_pwa=1&rfrr=HSR&pwa_ts=1747753945737&referrerUrl=aHR0cHM6Ly93d3cuZXhwZWRpYS5jb20vSG90ZWwtU2VhcmNo&useRewards=false&rm1=a2&regionId=6176216&destination=Moab%2C+Utah%2C+United+States+of+America&destType=MARKET&selected=24413369&latLong=33.8714%2C-84.4998&sort=RECOMMENDED&top_dp=249&top_cur=USD&gclid=Cj0KCQjw0LDBBhCnARIsAMpYlAq94E1v_iDjN3g777mvYz3ITeTq7iqLjQFrP7TW8FuMmDvrRMO8QwcaAl3ZEALw_wcB&mctc=10&userIntent=&selectedRoomType=220212969&selectedRatePlan=397428255&searchId=a8267973-3176-4c88-ba05-2d5eedc7cdf5`,
      },
      {
        name: "Hyatt Centric Park City",
        location: "Park City, UT",
        nights: 2,
        blurb: `amazing hotel right on the slopes. Great for skiing and snowboarding...`,
        image: `https://assets.hyatt.com/content/dam/hyatt/hyattdam/images/2014/09/21/1639/SLCPC-P085-Aerial.jpg/SLCPC-P085-Aerial.16x9.jpg`,
        link: `https://www.hyatt.com/en-US/hotel/utah/hyatt-centric-park-city/parkc`,
      },
    ],
    locations: [
      {
        id: "bonneville-salt-flats",
        name: "Bonneville Salt Flats",
        description:
          "Open, alien, and cinematic \u2014 we shot sunrise drone footage here.",
        type: "landscape",
        droneAllowed: true,
        image: "/img/locations/utah/locations/utah-saltflats.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-saltflats-1.jpg",
          "/img/locations/utah/gallery/utah-saltflats-2.jpg",
        ],
        notes: [
          "Arrived before 6:00am for sunrise shots",
          "Can easily drive out on to the flats",
          "Wore waterproof shoes due to puddles on the flats",
          "Can be very windy",
        ],
        video: "https://www.instagram.com/reel/example_bonneville",
      },
      {
        id: "potash-road",
        name: "Potash Road Scenic Drive",
        description:
          "Drove Potash Road for stunning desert and canyon views at sunset.",
        type: "drive",
        droneAllowed: true,
        image: "/img/locations/utah/locations/utah-potash.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-potash-1.jpg",
          "/img/locations/utah/gallery/utah-potash-2.jpg",
        ],
        notes: [
          "Shot canyon pull-offs at golden hour",
          "Used handheld gimbal on tight rock edges",
        ],
        video: "https://www.instagram.com/reel/example_potash",
      },
      {
        id: "potash-road-solo",
        name: "Potash Road Scenic Drive",
        description:
          "Drove Potash Road for stunning desert and canyon views at sunset.",
        type: "drive",
        droneAllowed: true,
        image: "/img/locations/utah/locations/utah-potash-solo.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-potash-solo-1.jpg",
          "/img/locations/utah/gallery/utah-potash-solo-2.jpg",
        ],
        notes: [
          "Shot canyon pull-offs at golden hour",
          "Used handheld gimbal on tight rock edges",
        ],
        video: "https://www.instagram.com/reel/example_potash",
      },
      {
        id: "arches",
        name: "Arches National Park",
        description:
          "Iconic red rock formations, golden hour flares, no drone allowed.",
        type: "hike",
        droneAllowed: false,
        image: "/img/locations/utah/locations/utah-arches.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-arches-1.jpg",
          "/img/locations/utah/gallery/utah-arches-2.jpg",
        ],
        notes: [
          "Arrived at 4:00pm to catch golden hour",
          "amazing landscapes and rock formations, don't leave the camera in the car",
          "Decent amount of walking between arches, but trails are well marked and easy, no major surprises or climbs.",
        ],
        video: "https://www.instagram.com/reel/DH6g4ckJZVl",
      },
      {
        id: "canyonlands",
        name: "Canyonlands National Park",
        description:
          "Expansive desert vistas and geological drama. Saw sun, snow, and rain in one visit.",
        type: "hike",
        droneAllowed: false,
        image: "/img/locations/utah/locations/utah-canyonlands.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-canyonlands-1.jpg",
          "/img/locations/utah/gallery/utah-canyonlands-2.jpg",
        ],
        notes: [
          "Weather changed dramatically\u2014sun, snow, rain in a 2-hour span.",
          "Ideal for family hikes and grand vista drone-less filming.",
        ],
        video:
          "https://www.instagram.com/reel/DJT4Liwup1V/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
      },
      {
        id: "dead-horse-point",
        name: "Dead Horse Point",
        description:
          "Unreal canyon overlook that feels like a mini Grand Canyon. Quick access to stunning views.",
        type: "viewpoint",
        droneAllowed: false,
        image: "/img/locations/utah/locations/utah-deadhorse.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-deadhorse-1.jpg",
          "/img/locations/utah/gallery/utah-deadhorse-2.jpg",
        ],
        notes: [
          "Canyon edge views just a few minutes walk from parking.",
          "Caught in a freak snowstorm for dramatic scenery.",
        ],
        video:
          "https://www.instagram.com/reel/DI9KdimpUxs/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
      },
      {
        id: "moab-giants",
        name: "Moab Giants Dinosaur Park",
        description:
          "A dinosaur-themed park with life-sized models and a small museum. Great stop for kids and families before heading deeper into Moab.",
        type: "attraction",
        droneAllowed: false,
        image: "/img/locations/utah/locations/utah-moabgiants.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-moabgiants-1.jpg",
          "/img/locations/utah/gallery/utah-moabgiants-2.jpg",
        ],
        notes: [
          "Perfect for kids \u2013 life-sized dinosaur replicas and educational exhibits.",
          "Helped spark our son's imagination for the rest of the trip.",
          "Fun mix of outdoor walking and indoor learning.",
        ],
        video:
          "https://www.instagram.com/reel/DHynA7DJzMl/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
        link: "https://www.moabgiants.com",
      },
      {
        id: "park-city",
        name: "Park City",
        description:
          "Skiing and snowboarding in the morning, then exploring the charming streets of Park City in the afternoon.",
        type: "attraction",
        droneAllowed: false,
        image: "/img/locations/utah/locations/utah-park-city.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-park-city-1.jpg",
          "/img/locations/utah/gallery/utah-park-city-2.jpg",
        ],
        notes: [
          "Ski/Snowboard",
          "Walked Park City downtown area in the afternoon.",
        ],
        video: "https://www.instagram.com/reel/example_potash",
      },
      {
        id: "woodward",
        name: "Park City Woodward",
        description:
          "the famous Woodward Park City, a year-round action sports facility. We spent the day skiing and snowboarding, and our son had a blast at the indoor skatepark/trampoline park.",
        type: "attraction",
        droneAllowed: false,
        image: "/img/locations/utah/locations/utah-woodward.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-woodward-1.jpg",
          "/img/locations/utah/gallery/utah-woodward-2.jpg",
        ],
        notes: [
          "Ski/Snowboard/Sakte/Bike/Trampoine",
          "Accomodates all ages, prices are reasonable. Adult area aka BAR!!!",
        ],
        video: "https://www.instagram.com/reel/example_potash",
      },
      {
        id: "uintas",
        name: "Uintas - Cross Country Skiing + Dog Sledding",
        description:
          "We spent part of the day cross-country skiing in the Uintas. The snow was perfect, and the scenery was breathtaking. We rented gear from a local shop and hit the trails. It was a great way to experience the winter wonderland of Utah. We also went dog sledding, which was an unforgettable experience. The dogs were so excited to pull the sled, and it was a unique way to explore the snowy landscape.",
        type: "attraction",
        droneAllowed: true,
        image: "/img/locations/utah/locations/utah-uintas.jpg",
        gallery: [
          "/img/locations/utah/gallery/utah-uintas-1.jpg",
          "/img/locations/utah/gallery/utah-uintas-2.jpg",
          "/img/locations/utah/gallery/utah-uintas-3.jpg",
        ],
        notes: [
          "Used Wasatch Adventure Guides to organized the dog sledding tour and cross-country skiing.",
          "Accomodates all ages, prices are reasonable.",
        ],
        video: "https://www.instagram.com/reel/example_potash",
        link: "https://wasatchadventureguides.com/",
      },
      {
        id: "slc",
        name: "SLC",
        description: "",
        type: "drive",
        droneAllowed: false,
        image: "/img/locations/utah/locations/utah-airport.jpg",
        gallery: [],
      },
    ],
    reel: `https://www.instagram.com/reel/DHynA7DJzMl/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==`,
    featuredShots: [
      {
        img: "/img/locations/utah/featured/utah-sunset-arches.jpg",
        caption:
          "Golden hour breaking through the arches \u2014 handheld with a 75mm...",
      },
      {
        img: "/img/locations/utah/featured/utah-drone-salt.jpg",
        caption:
          "Top-down symmetry over the Salt Flats \u2014 flown at golden hour...",
      },
    ],
    days: [
      {
        label: "Arrival Day \u2013 SLC to Wendover",
        summary:
          "Landed in Salt Lake City around 4\u20135pm, drove scenic route west to Wendover for the night.",
        locations: [],
        routes: [
          {
            label: "SLC to Wendover",
            link: `https://www.google.com/maps/dir/Salt+Lake+City,+UT/Wendover,+UT`,
            duration: "2 hr drive",
          },
        ],
      },
      {
        label: "Day 1 \u2013 Sunrise at Salt Flats, Drive to Moab",
        summary:
          "Left Wendover early before sunrise to reach Bonneville, then drove scenic route to Moab with sunset drive along Potash Road.",
        locations: [
          {
            ref: "bonneville-salt-flats",
            notes: `Arrived before dawn to catch golden hour shimmering off the wet salt flats. The surreal reflections made it feel like we were floating in the sky — a drone pilot’s dream and easily one of the most cinematic locations we've ever shot.`,
          },
          {
            ref: "moab-giants",
            notes: `We stopped here on the way into Moab and it set the tone for the whole trip. Life-sized dinosaurs scattered across the desert sparked our son's imagination — he spent the rest of the drive pretending they still roamed the canyons around us. The interactive exhibits were surprisingly fun for adults too.`,
          },
          {
            ref: "potash-road",
            notes: `We hit Potash Road just before sunset — the low light lit the cliffs in a burnt orange glow. The winding drive hugged the canyon edge, with each turn revealing a new dramatic vista. Quiet, cinematic, and wildly underrated — we shot some of our favorite footage here. Lots of rock climbing along the roadside, very cool to watch`,
          },
        ],
        routes: [
          {
            label: "Wendover to Bonneville Salt Flats",
            link: `https://www.google.com/maps/dir/Wendover,+UT/Bonneville Speedway Road, Wendover, UT 84083`,
            duration: "20 min drive",
          },
          {
            label: "Bonneville Salt Flats to Moab",
            link: `https://www.google.com/maps/dir/Bonneville,+UT/Moab,+UT`,
            duration: "5 hr drive",
          },
          {
            label: "Moab to Potash Road",
            link: `https://www.google.com/maps/dir/Moab,+UT/Jug Handle Arch,+UT`,
            duration: "40 min drive",
          },
        ],
      },
      {
        label: "Day 2 \u2013 Canyonlands, Dead Horse Point, Sunset at Arches",
        summary:
          "A full day exploring epic Utah landscapes. Started in Canyonlands and Dead Horse Point under shifting skies, ended with a glowing sunset in Arches. One of our most unforgettable days. Hikes listed here were all done with a 4 year old in tow",
        locations: [
          {
            ref: "canyonlands",
            notes:
              "Experienced sunshine, rain, and snow all in one stop. Family-friendly hikes and scenic views. Canyonland is enormous, so we focused on the Island in the Sky area. We hiked to the Grand View Point and Mesa Arch, which are both easy walks with stunning views.",
          },
          {
            ref: "dead-horse-point",
            notes:
              "Overlook with dramatic canyon views. Weather shift made it surreal. Don't miss the short walk to the viewpoint. It’s a quick 5-minute stroll from the parking lot, and the views are breathtaking. We were caught in a freak snowstorm that made it even more dramatic.",
          },
          {
            ref: "arches",
            notes:
              "Returned in the evening for sunset light over iconic formations. The drive in and through arches is stunning, and manyof the iconic arches are very accessible with short hikes (15-20 mins from parking). ",
          },
        ],
        routes: [
          {
            label: "Moab to Deadhorse Point State Park",
            link: `https://www.google.com/maps/dir/Moab,+UT/Dead Horse Point State Park, Moab, UT`,
            duration: "40 min drive",
          },
          {
            label: "Deadhorse Point State Park to Canyonlands entrance",
            link: `https://www.google.com/maps/dir/Dead+Horse+Point+State+Park,+Moab,+UT/Canyonlands+National+Park,+Moab,+UT`,
            duration: "20 min drive",
          },
          {
            label: "Canyonlands entrance to Arches National Park",
            link: `https://www.google.com/maps/dir/Canyonlands+National+Park,+Moab,+UT/Arches+National+Park,+Moab,+UT`,
            duration: "30 min drive",
          },
        ],
      },
      {
        label: "Day 3 \u2013 Solo Filming on Potash Road",
        summary:
          "Morning solo mission back down Potash Road to capture drone footage over the potash ponds while the family enjoyed Moab. Returned to the hotel for lunch and then drove to SLC where we dropped off the car and caught an Uber to Park City for our final few days.",
        locations: [
          {
            ref: "potash-road-solo",
            notes:
              "Focused on flying over potash ponds and capturing aerial symmetry.",
          },
        ],
        routes: [
          {
            label: "Moab to Potash Road",
            link: `https://www.google.com/maps/dir/Moab,+UT/Dead Horse Point State Park, Moab, UT`,
            duration: "40 min drive",
          },
          {
            label: "Moab to SLC Aiport",
            link: `https://www.google.com/maps/dir/Moab,+UT/SLC+UT`,
            duration: "5 Hr drive",
          },
          {
            label: "SLC Aiport to Park City",
            link: `https://www.google.com/maps/dir/SLC+UT/Park+City,+UT`,
            duration: "1 hr drive via Uber",
          },
        ],
      },
      {
        label: "Day 4 \u2013 Park City Skiing and Exploring",
        summary:
          "Hit the slopes in the AM, then explored Park City in the afternoon. We had a great time skiing and snowboarding at Park City Mountain Resort. The slopes were perfect for our family, and the views were stunning. In the afternoon, we strolled through the charming streets of Park City, enjoying the shops and restaurants.",
        locations: [
          {
            ref: "park-city",
            notes:
              "Little guy did ski school while we hit the slopes. Park City is a great family-friendly ski resort with a variety of runs for all skill levels. We had a blast skiing and snowboarding together, and the views from the top were breathtaking.",
          },
        ],
        routes: [],
      },
      {
        label: "Day 5 \u2013 Park City Woodward",
        summary:
          "Woodward Park City for the little guy. Ramps, trampolines, and skateboarding, bikes, ski, snowboard, snow tube. We spent the day at Woodward Park City, a year-round action sports facility. Our son had a blast at the indoor skatepark/trampoline park, while we enjoyed some skiing and snowboarding.",
        locations: [
          {
            ref: "woodward",
            notes: "",
          },
        ],
        routes: [],
      },
      {
        label: "Day 6 \u2013 Uintas Cross Country Skiing + Dog Sledding",
        summary:
          "We spent part of the day cross-country skiing in the Uintas. The snow was perfect, and the scenery was breathtaking. We rented gear from a local shop and hit the trails. It was a great way to experience the winter wonderland of Utah. We also went dog sledding, which was an unforgettable experience. The dogs were so excited to pull the sled, and it was a unique way to explore the snowy landscape.",
        locations: [
          {
            ref: "uintas",
            notes:
              "We rented cross-country ski gear from a local shop and hit the trails. The snow was perfect, and the scenery was breathtaking. It was a great way to experience the winter wonderland of Utah. Son loved it, especially the dog sledding. dog Sleeding lasted about 2 hrs total. the Cross country skiing was about 3-4 hrs total",
          },
        ],
      },
      {
        label: "Day 7 \u2013 Departure Day",
        summary:
          "1 hr ride to the airport. Flew out of SLC around 1pm. We had a great time in Utah and can't wait to come back! Lines at the airport can really vary especially during peak season for skiing",
        locations: [
          {
            ref: "slc",
            notes: "",
          },
        ],
      },
    ],
  },
  {
    id: "puerto-rico",
    name: "Puerto Rico",
    cover: "/img/locations/puerto-rico/puerto-rico.jpg",
    fullImage: "/img/locations/puerto-rico/puerto-rico-full.jpg",
    comingSoon: true,
  },
  {
    id: "usvi",
    name: "US Virgin Islands",
    cover: "/img/locations/usvi/usvi.jpg",
    fullImage: "/img/locations/usvi/usvi-full.jpg",
    comingSoon: true,
  },
  {
    id: "North Georgia",
    name: "North Georgia, USA",
    cover: "/img/locations/nga/nga.jpg",
    fullImage: "/img/locations/nga/nga-full.jpg",
    comingSoon: true,
  },
  {
    id: "Hungary",
    name: "Hungary",
    cover: "/img/locations/hungary/hungary.jpg",
    fullImage: "/img/locations/hungary/hungary-full.jpg",
    comingSoon: true,
  },
]
