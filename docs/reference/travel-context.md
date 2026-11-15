---
id: travel-context
title: Travel History and Content Context
kind: reference
status: approved
implementation_state: unknown
updated: 2026-11-14
related:
  - content-model
  - storytelling-framework
  - usvi-st-john-source
supersedes: []
superseded_by: []
code_paths:
  - src/content/places/europe.mjs
  - src/content/places/costa-rica.mjs
  - src/content/places/utah.mjs
  - src/content/places/next-destinations.mjs
  - src/content/journeys/costa-rica-2025.mjs
  - src/content/journeys/utah-2026.mjs
  - src/content/journeys/next-destinations.mjs
  - src/content/atlas/preview-presentation.mjs
verification:
  state: unverified
  evidence: []
---

> **Evidence reference:** This owner-supplied context mixes confirmed travel,
> plans, and candidate content. Canonical repository records win when they
> conflict, and planned facts must not be published as completed travel.
> References below to `trips.js`, `trips.ts`, or a generic CMS predate the
> canonical registries documented in [Content Model](../architecture/content-model.md).

# Roam With Justin — Travel History, Experiences & Content Context

> **Purpose:** A working source of truth for Codex when updating the existing Roam With Justin website, `trips.js` / `trips.ts`, destination pages, interactive atlas, location pins, experience cards, and venue profiles.
>
> **Prepared:** November 13, 2026, using information Justin previously shared in conversations. This is **not** an export of his photo library, Notion journal, repository, bookings, or a fact-checked travel log. Some details came from trip planning rather than confirmed post-trip accounts. The distinctions below are intentional.
>
> **Important instruction to Codex:** Inspect the current repository and preserve its existing structure before importing data. Do **not** assume mentioned files, media assets, contact details, URLs, or coordinates actually exist. Do not fabricate them. Treat the status labels and verification notes as part of the data.

---

## 0. Read this first: source reliability

This file captures two different things: **firsthand information about Justin's actual travels** and **ideas/plans discussed while organizing trips or developing content**. A real travel website must not silently turn the latter into asserted facts.

**Status labels used throughout:**

| Label | Meaning | Recommended website treatment |
|---|---|---|
| `CONFIRMED` | Justin directly described visiting, doing, photographing, filming, or posting this experience. | Safe to use as firsthand context, subject to checking names, media, and any practical travel information. |
| `STRONGLY INDICATED` | Multiple discussions or photos/posts indicate a real experience, but the precise venue/sequence/detail may be uncertain. | Can appear in draft content; check trip journal/media before publishing specifics. |
| `PLANNED / DISCUSSED` | A route, hotel, shot, activity, or location was considered during planning. | **Do not** assert it happened or add it as a visited pin until verified. |
| `TO VERIFY` | Detail may be accurate but lacks confirmation (exact date, address, coordinates, route, business affiliation, etc.). | Leave blank, add verification task, or display only broader information. |
| `CREATIVE SUGGESTION` | An assistant-proposed angle, shot, tagline, or editorial idea. | Inspiration only; never evidence that something occurred. |

**Absolute rules for data updates:**

1. A business's name appearing in a trip plan does **not** prove it was visited. Separate `planned`, `visited`, `photographed`, `featured`, and `partnered` statuses.
2. Never invent lat/lng coordinates, street addresses, hours, current business phone numbers, Google Maps URLs, official websites, prices, booking links, availability, or affiliate relationships.
3. Do not invent photo/video paths. Reference only verified repository assets. If media is missing, leave `media: []` (or existing-schema equivalent) and keep a backlog item.
4. Never imply that a listed business paid for coverage or endorsed the site unless an actual agreement exists. Actual relationships are distinct from potential sponsorships.
5. The content should reflect **firsthand travel experiences**, not boilerplate destination descriptions or unverified travel advice.
6. Public-facing captions, stories, and on-site copy should not expose private family names, exact personal details, or unpublished commercial negotiations.
7. Where older plans and later actual experience reports differ, prioritize explicit *post-trip* details over itineraries drafted before travel.

---

## 1. Brand, positioning, and audience

**Brand:** Roam With Justin  
**Website:** `roamwithjustin.com`  
**Instagram:** `@roam.with.justin`  
**Separate professional brand:** WebWorks Media / `@webworks.media`

Roam With Justin is Justin's travel-focused photography and film publication. It blends cinematic destination imagery with authentic family travel, real places, personal impressions, and practical details that help people plan or imagine similar experiences. The subject is principally **the place and the experience**, with family members appearing naturally within the story; it is not primarily a personality/influencer selfie channel or a camera tutorial site.

### Why the site exists

- Instagram / short-form social content drives discovery and curiosity.
- The website delivers a richer, immersive, memorable experience that social platforms cannot: interactive geographic exploration, layered stories, media, actual logistics, and usable venue information.
- Visitors should browse for the **pleasure of exploration** and still leave with destinations, routes, recommendations, or experiences worth saving.
- Photography and video function as original editorial work **and** potentially as compelling, natural advertising for places Justin actually experienced.
- Long-term monetization paths: direct hospitality/tourism partnerships, commercial image/video licensing, disclosed affiliate/referral relationships, and thoughtfully integrated featured experiences.
- WebWorks Media handles general local client work and behind-the-camera professional services. Roam With Justin owns travel, hospitality, tourism partnerships, destination imagery, and travel-oriented commercial licensing.

### Creative direction

- Cinematic, photographic, editorial, immersive, atmospheric, polished—not a standard listicle blog.
- Strong visual anchor / hero image; location and atmosphere lead. Justin tends to favor environment-first frames (approximately 70% environment / 20% human within environment / 10% portrait was discussed as a shooting heuristic, not a hard content quota).
- Prefer **micro-stories** with one emotional payoff over giant, loosely connected montage recaps.
- Give every story a **why it mattered**, not just a place name. Useful themes: awe, a quiet evening, unexpected weather, freedom, togetherness, adventure, discovering a hidden corner.
- Include connective moments—traveling, arriving, anticipation, transition, reactions, quiet details—so footage feels emotionally connected rather than simply cut together.
- Use actual experiences as the narrative nucleus: e.g., a boat day, family hotel stay, walking the Whale Tail at low tide, spotting wild ponies near the hotel, watching weather transform Utah's canyon landscape.
- Avoid cliché AI travel language and empty phrases. Be natural, specific, grounded, and first-person when appropriate.
- For Roam With Justin social captions, use exactly **five hashtags** when generating them: `#travel`, `#RoamWithJustin`, one location-specific hashtag, and two relevant hashtags. Captions should include a short, original, introspective thought or quote. This is a **social-caption rule**, not a requirement for pages or structured data.
- Instagram is organized in destination / experience series; avoid mixing unrelated content mid-series without a clear purpose. A fuller trip recap can close the series. Stories can show ongoing moments or behind-the-scenes content.
- Site content should prioritize helpful trip information (where, access, transport, parking, timing, kid-friendliness, photography moments, what was actually worth doing) rather than tutorial content about lenses and settings.
- Visitors may come for entertainment **or** to plan a real trip. Support both.

### Photography/video capabilities and content style

Justin works with high-resolution Sony photography, cinematic Sony video, aerial/drone footage where legal, underwater imagery, ambient audio, and edited social reels. Assets may exist across Lightroom/Resolve exports, camera files, personal galleries, social edits, and a site repository. Do not assume an archive file is available without finding it.

---

## 2. Atlas / content data model: what this information should become

A good content model should make it possible to move naturally through:

`Trip → country/region → destination → specific place → experience/activity → media/story/venue`

But **do not enforce a rigid tree**. A business can relate to a story, an island can relate to multiple boat stops, and a lodging venue can appear across several family/travel stories. Use both simple parents and explicit `relatedIds` / `nearbyIds` / route stop IDs.

Suggested conceptual entity types (adapt to the existing schema rather than replacing it):

| Entity | What it represents | Example |
|---|---|---|
| `trip` | A journey across dates and multiple destinations | `europe-summer-2026`, `utah-winter-2025` |
| `destination` | Geographic area suitable for map framing | `split-croatia`, `uvita-costa-rica` |
| `place` | Geographic point/area with its own visuals | `dead-horse-point`, `playa-san-josecito` |
| `experience` | Something personally done, with a story | `raptor-boat-day`, `whale-tail-low-tide-walk` |
| `venue` | Hotel, restaurant, tour operator, or service provider | `inara-camp`, `balmer-lawn`, `raptor-experience` |
| `story` | Editorial narrative with selected images/video | `new-forest-ponies`, `utah-storms` |
| `media` | Real asset and its credit, caption, type, aspect ratio | An existing image in a gallery |
| `route` | Ordered relationship between stops, not necessarily a navigable GPS path | Split boat excursion, Utah road trip |

Recommended fields to preserve or add only as needed:

- Stable, human-readable `id`/`slug`; `title`; optional `subtitle`/`teaser`.
- `type`, `parentId`, `tripIds`, `relatedIds`, `routeStopIds`.
- Country/region/city and a flexible `geo` field with **verified** coordinates/bounds; don't guess pins.
- `visitStatus`, `evidenceStatus`, optional `visitDate` / `dateRange`, and internal `verificationNotes`.
- `story`, `personalNotes`, `practicalNotes`, `familyNotes`, `photoOpportunities`, `whatWeWouldChange`—only for known experiences.
- `media` with verified paths, alt text, landscape/portrait crop preferences, attribution, and video-poster images.
- `venueId`, `officialUrl`, `googleMapsUrl`, `phone`, `bookingUrl`, `affiliateDisclosure`—nullable until verified.
- `featured`, `sponsorStatus` (`none`, `proposed`, `active`), not as a conflation of a normal recommendation with a paid placement.
- Optional `contentStatus`: `draft`, `ready`, `published` and `needsVerification` tasks.

**Interactive behavior this data should support:** a regional pin opens a photo preview; entering the region reveals individual places; an experience displays photos/video, local context, saved favorites, related stops, official venue actions, and a return-to-map action. Pins can choose among **real media attached to that locale**, but do not randomize the image while a card is open. Favorites and last-visited context can persist in `localStorage` without account creation. Browser back/forward and deep links should restore geographic state as far as practical. Every meaningful destination/story should also be accessible by direct URL for sharing and SEO.

---

# 3. Master travel index

The list below represents known travel material, **not a verified complete chronology**.

| Suggested ID | Trip / region | Approximate timing | Evidence / note |
|---|---|---|---|
| `europe-summer-2026` | UK → Netherlands → Croatia → Morocco → Spain | June 25–July 25, 2026 | `CONFIRMED` trip; segment dates originally from itinerary, many independently corroborated by photo/story discussions. |
| `utah-winter-2025` | Salt Lake City/Wendover/Bonneville → Moab → Park City | February 2025, roughly seven days | `CONFIRMED` completed family road trip with many detailed firsthand notes. |
| `utah-2026` | Zion National Park → Park City | 2026; exact dates to verify | `CONFIRMED` trip with **two days at Zion National Park**, followed by **five days skiing and snowboarding in Park City**. Keep separate from Utah winter 2025 and the proposed future Hanksville visit. |
| `puerto-rico-2024` | San Juan → northern/western Puerto Rico | August 2024 | `CONFIRMED`; lodging and venue details discussed. |
| `costa-rica-2025` | La Fortuna/Bajos del Toro → Drake Bay/Osa → Uvita → San José area | 2025 | `CONFIRMED` route and several specific visited sites; exact dates require journal verification. |
| `usvi-st-john-2025` | St. John / possibly St. Thomas | 2025 (precise dates to verify) | `CONFIRMED` St. John photo/underwater work; some lodging/charter stops appear only in assistant drafts. |
| `miami-south-beach` | Miami Beach, Florida | Before March 2026 | `CONFIRMED` photo series; exact dates, lodging, businesses unknown. |
| `north-georgia-2026` | Blue Ridge / Mineral Bluff / Morganton area | November 2026 | `CONFIRMED` stay and photography; various hikes/eagle sightings remain unconfirmed. |
| `peoria-illinois` | Peoria / Illinois River | Fall break, date to verify | `CONFIRMED` sunrise aerial/downtown footage discussed. |
| `utah-future-trip` | Hanksville bentonite area / Park City / Utah | Discussed November 2026 | `PLANNED / DISCUSSED`; **not** evidence of a completed visit. |

Any new map/published dataset should show only destinations that can be supported by real travel material. A location need not have its own pin until meaningful media and story data exist.

---

# 4. EUROPE — SUMMER 2026

**Suggested trip ID:** `europe-summer-2026`  
**Broad dates:** Departed Atlanta June 25, 2026; returned July 25, 2026.  
**Party:** Family travel with wife and young son; some extended-family moments during the UK section.  
**Broad route:** England → Amsterdam/Netherlands → Split/Croatia → Marrakech/Morocco → Málaga / Cádiz / Seville / Madrid, Spain.  
**Content framing:** A month of distinct experiences, not one 30-day montage. Each destination can contain multiple self-contained micro-stories and linked service profiles.

## 4.1 United Kingdom / England — late June to July 1, 2026

### 4.1.1 Portsmouth Historic Dockyard

- **Suggested place ID:** `portsmouth-historic-dockyard`
- **Status:** `CONFIRMED` family visit and documented photography.
- **Context:** The family visited the dockyard/museum during the England leg; a charter coach outing was discussed.
- **Specific photographed subjects / scenes:** HMS Warrior exterior and bow; people walking on or near the ship; ship figurehead; helm / wheel; historical weapons and artifacts; ship interiors and hammocks; a son exploring; multigenerational family frames; Portsmouth's Spinnaker Tower visible in contextual shots.
- **Story angle:** A historical site interpreted through a child's sense of adventure—authentic family interaction within maritime architecture, not just ship facts.
- **Possible relationship:** `england-2026` → `portsmouth` → `portsmouth-historic-dockyard` → `hms-warrior`.
- **Asset note:** Prior editing conversations mentioned image identifiers around `07102`, `07107`, `07125`, `07126`, `07127`, `07144`, `07166`, `07175`, `07178`, `07236`, `07241`; these are **not verified repository paths**. Search actual asset filenames before assigning.
- **Venue:** Historic Dockyard / HMS Warrior. Official links, pricing, address and opening hours need verification.

### 4.1.2 Brockenhurst / New Forest / Balmer Lawn

- **Suggested IDs:** `new-forest-england`, `balmer-lawn-hotel`, `new-forest-ponies`, `new-forest-family-stay`.
- **Status:** `CONFIRMED` stay / area photography / pony and family imagery.
- **Timing:** Family reunion / hotel stay discussed around June 25–28, 2026; broader UK stop extends to July 1.
- **Lodging:** **Balmer Lawn Hotel**, Brockenhurst/New Forest area. A family reunion/stay took place here. This is a venue of potential hospitality interest; **do not imply sponsorship**.
- **Photographed/filmed material:** Hotel and grounds; extensive family gathering footage; quiet New Forest landscapes, streams, pasture, free-roaming ponies/horses; wife photographed alone with horses; son and niece photographed together. Earlier photo discussions corrected that identification—do not label the pair as wife and son.
- **Geographic note:** Some New Forest scenes were only a few hundred yards from the hotel (roughly 300 yards in one recollection). Do not pin a precise horse location without EXIF or confirmation.
- **Story angle:** Slowing down; a quieter pace in England; wild ponies near a comfortable family base; changing from hotel/reunion activity to peaceful woods and grazing animals.
- **Commercial possibility:** The hotel could be a natural partner for a professionally photographed/filmed firsthand stay. A proposal discussed ~25+ edited images, a ~40–60-second film, and 2–3 shorter edits, but **that was a content concept, not a confirmed deliverables agreement**.
- **Suggested linked stories:** `balmer-lawn-family-stay` ↔ `new-forest-ponies` ↔ `brockenhurst-walks`.

### 4.1.3 Harrogate and York

- **Suggested IDs:** `harrogate-england`, `york-england`, `york-street-performance`.
- **Route:** Harrogate and a York day visit formed part of the UK travel leg.
- **York status:** `CONFIRMED` photography of a street performer; an elaborate / jester-like street performance was discussed in a carousel/story.
- **Performer:** Social handle `@wheniamnothing` was supplied in a prior discussion. The performer's name was uncertain (recalled as “Andy Something”); **verify identity before publishing a real name or tagging**.
- **Content:** York streets/architecture and the performance as a memorable micro-story.
- **Harrogate status:** `STRONGLY INDICATED` as part of route; individual attractions, lodging, businesses, and images still need verification. Do not fill with generic suggested stops.

## 4.2 Netherlands — Amsterdam, around July 1–4, 2026

### 4.2.1 Amsterdam

- **Suggested destination ID:** `amsterdam-netherlands`
- **Status:** `CONFIRMED` travel and substantial photography/video sets.
- **Lodging:** A **Corendon** hotel was listed in planning context. Exact property and whether it was actually used need confirmation.
- **Known stories/media:** Canal imagery; an early Amsterdam teaser/quiet canal editorial set; a **NEMO Science Museum rooftop** scene (photo selection discussed in detail); Amsterdam canals and modern architecture; distinctive urban viewpoints.
- **Private boat:** A sunset/blue-hour private canal boat experience was part of the travel plan. There is ample canal content, but confirm the actual operator, boat route, and exact date before giving it a standalone booked-service profile.
- **Cycling / Pllek:** A bike ride toward **Pllek** was discussed during itinerary development. `PLANNED / DISCUSSED` until photos/journal confirm actual visit.
- **Vondelpark:** Also part of exploration planning; no confirmed firsthand scene in this summary.
- **Zaanse Schans vs Kinderdijk:** Considered as possible windmill excursions. **Neither should be labeled visited without confirmation**.
- **Suggested interactive nodes:** `amsterdam-canals`, `nemo-rooftop`, possibly `amsterdam-boat-ride` once verified, with any hotel/operator profiles linked by actual evidence.
- **Story direction:** Quiet canals versus energetic / layered city; unexpected perspectives above the city; contrast between street, water, and rooftop views.

## 4.3 Croatia — Split and Central Dalmatian islands, around July 4–9, 2026

### 4.3.1 Split base

- **Suggested destination ID:** `split-croatia`
- **Status:** `CONFIRMED` travel, photo/video and experience coverage.
- **Arrival/departure:** July 4–9, 2026.
- **Lodging:** A Le Méridien property in the greater Split area was mentioned as the base. **Verify exact property name** from booking records before publishing; prior notes sometimes abbreviate it inconsistently.
- **General material:** Split waterfront/coastline; Old Town streets and architectural scenes; accommodation/resort environs; Adriatic water; day-trip transport and boat footage.
- **Old Town sunrise:** A solo early walk was planned or discussed; potential subjects included Diocletian's Palace areas, the Riva, lanes, arches, and historic squares. Only publish exact stop-by-stop walk details if captured/confirmed.
- **Caution:** Drone use in historic city zones and some protected areas is restricted. Don't assume an aerial asset was legally captured from a location or imply permission based solely on a photo concept.

### 4.3.2 Raptor Experience private boat excursion — major commercial candidate

- **Suggested experience ID:** `raptor-experience-boat-day`
- **Suggested venue ID:** `raptor-experience`
- **Status:** `CONFIRMED` actual excursion and extensive photo/video coverage.
- **Date:** Boat day July 6, 2026.
- **Operator:** **Raptor Experience** (verify official legal/business name and contact links).
- **Route/geography:** Central Dalmatia / Split Archipelago, with **Brač and Hvar** discussed in relation to the actual excursion. A stop around **Uvala Splitska / Splitska Bay on Brač** appeared in boat-day discussions. **Pakleni Islands** appeared in an assistant route suggestion, not an independently verified stop; don't place it on a confirmed route without checking.
- **Photographed/filmed scenes:** Boat boarding and operator branding; the boat underway; views across turquoise Adriatic water; snorkeling gear and water activities; boat profile; feet on deck / tactile details; distant boat framed against coastline; Hvar seen in relation to the vessel; captain/crew and his fiancée were included in one revised carousel plan (check rights and identifying details before public publishing).
- **Story angle:** The *experience of spending the day on the water*, not merely a gallery of pretty sea views: the anticipation of boarding, movement between islands, pauses to swim/snorkel, the people running the excursion, and the places reached by boat.
- **Gallery size:** Approximately **1,300 photos shot; roughly 100 edited** were discussed. Those are working figures from conversation, not a guaranteed file count.
- **Partnership/licensing context (INTERNAL, NOT PUBLIC):** Operator expressed interest in originals after a collaboration/social exchange. Justin considered licensing selected photographs (prices such as ~$50/photo, earlier $30, and a possible ~$750 broader buyout were discussed). **No completed sale, contract, or perpetual usage license is established here.** Don't mark `paidPartner: true` or promise deliverables.
- **Website potential:** Rich operator profile linked to a boat-route story with individual stops, media, what to expect, and verified booking/contact buttons. A natural candidate for attribution/referral tracking **once agreed**.
- **Related nodes:** `split-croatia`, `brac-island`, `hvar-island`, `raptor-experience`, `croatia-boat-snorkeling`, and any subsequently verified specific stops.

### 4.3.3 Krka National Park / waterfalls

- **Suggested ID:** `krka-national-park`
- **Status:** `CONFIRMED / STRONGLY INDICATED` on-site coverage; a Krka story/carousel was discussed as a relatively short drive from Split.
- **Context:** A national park/waterfalls outing took place as part of the Split region visit, and Krka National Park was the named content subject.
- **Do not substitute:** **Plitvice Lakes** was considered as a comparison during planning, not confirmation of visiting Plitvice.
- **Story angle:** A waterfall/nature counterpoint to Split's coast and boating.
- **To verify:** Specific waterfalls, trails, access entrance, parking, ticket information, and visit date.

## 4.4 Morocco — Marrakech and Agafay, around July 9–12, 2026

### 4.4.1 Marrakech / Medina / Dar Darma

- **Suggested destination ID:** `marrakech-morocco`
- **Suggested venue ID:** `dar-darma`
- **Status:** `CONFIRMED` travel and hotel stay arrangements; Medina street/story coverage strongly indicated.
- **Arrival:** Evening of July 9, 2026; estimated late check-in at the riad was discussed before the trip, not an audited arrival time.
- **Lodging:** **Dar Darma**, a riad in the Marrakech Medina, for the first night. Subsequently stayed at **Le Méridien N'Fis** for the remaining two nights.
- **Photographic interests/content:** Intricate riad architecture and interiors, lanterns and courtyards, street details, doors, local activity, markets, and transitions between the Medina and a more relaxed hotel environment.
- **Suggested structure:** `marrakech-medina` → `dar-darma` as a distinct hospitality/location story, connected to the guided tour.
- **Do not assume:** Suggested rooftop venues, restaurants, particular mosques, market stalls, or planned compositions were actually visited without evidence.

### 4.4.2 Tarik Belasri guided Marrakech tour

- **Suggested IDs:** `marrakech-guided-medina-walk`, `tarik-belasri-guide`.
- **Guide name:** **Tarik Belasri**.
- **Scheduled date/time:** July 10, approximately 9:00 a.m.–1:00 p.m.
- **Status:** The booking/plan was explicit and later captions included thanks to this guide; treat the tour as `STRONGLY INDICATED / CONFIRMED` with individual itinerary stops to be verified.
- **Experience:** Guided exploration of Marrakech/Medina, culture, architecture, and street life.
- **Visitor value:** Explain what guided navigation contributes in a busy, intricate city, based on Justin's actual experience. Do not invent exact stops or price.
- **Venue contact:** No verified phone, website, or public guide booking URL on record. Avoid inventing one.

### 4.4.3 Le Méridien N'Fis / Azyr cocktails

- **Suggested venue IDs:** `le-meridien-nfis`, `azyr-le-meridien-nfis`.
- **Status:** `CONFIRMED` hotel presence and drink experience.
- **Hotel:** **Le Méridien N'Fis**, Marrakech.
- **Bar / experience:** **Azyr**; short evening stop for cocktails. Mixologist **@mehdi_krh** prepared fresh drinks, and Justin created imagery/content about them.
- **Hotel Instagram:** `@lemeridiennfis.marrakech` (as supplied in previous conversations; verify current handle before linking).
- **Story direction:** A quieter evening / hospitality moment contrasting with the intensity of the Medina. Feature photography of the cocktails, craft, atmosphere, and setting without overselling an experience that was a brief stop.
- **Potential venue profiles:** Hotel and its Azyr outlet can be separate but related entities.

### 4.4.4 Inara Camp / Agafay Desert

- **Suggested IDs:** `inara-camp-agafay`, `agafay-evening-experience`.
- **Date:** July 11, 2026.
- **Status:** `CONFIRMED` content/experiences discussed after trip as a distinctive shoot, with a clear scheduled camp visit.
- **Place/operator:** **Inara Camp**, in the Agafay area outside Marrakech.
- **Planned activities and later pictured motifs:** Camel riding, buggy/off-road activity, an evening camp/dinner atmosphere, massage, henna, music/dance, fire entertainer/performance. Some activities were in the confirmed pre-trip schedule; photographic posts featuring music/dance, henna, and a fire performer were subsequently discussed. Check each item's actual occurrence before asserting the complete bundled itinerary.
- **Transfer detail:** A pickup around 5 p.m. appeared in planning; exact timing and route should be verified if offered as travel guidance.
- **Story opportunities:** Transition from Marrakech city to desert landscape; arriving at camp; slowing light, hospitality, camp ambiance, participatory activities, the surprise of evening music/performance.
- **Cover/editorial direction:** Agafay worth staying overnight?—an interesting hook was discussed, but **Justin's experience was an evening visit, not a confirmed overnight at Inara Camp**. Do not imply he stayed overnight.
- **Do not invent:** Package names, current prices, booking phones, website URLs, transport arrangements, exact service providers, or unsupported claims about animal ethics.

## 4.5 Spain — July 12–25, 2026

The Spain leg was discussed extensively while traveling. Exact dates and transport changed across planning conversations. The city sequence is well supported, but the precise transfer schedule should be checked against the travel journal before publishing a day-by-day route.

### 4.5.1 Málaga / Gibraltar / Cádiz coastal segment

- **Suggested IDs:** `malaga-spain`, `gibraltar`, `cadiz-spain`, `andalusia-coastal-drive`.
- **Broad plan:** Arrive in Málaga July 12; make way toward Cádiz, possibly via Gibraltar / Tarifa and the coast; Cádiz area around July 12–17/18.
- **Status:** These areas are part of the discussed route, and later user descriptions include Málaga, Gibraltar, and Cádiz among traveled Spain destinations. `CONFIRMED` at city/route level; exact sights remain `TO VERIFY`.
- **Do not assume actual stops at:** Bolonia beach/dunes, Baelo Claudia, Zahara, Vejer de la Frontera, individual Gibraltar attractions, or any swimming holes. These appeared as **assistant recommendations**, not firsthand confirmations.
- **Potential experience content:** Coastal driving, contrasts between white towns and coastline, urban Cádiz architecture and culture if source photos exist.

### 4.5.2 Seville

- **Suggested destination ID:** `seville-spain`
- **Status:** `CONFIRMED` visit and edited photography sets (a roughly ten-image curated Seville carousel was discussed).
- **Timing:** Around July 17/18–20 in the overall plan; a train from Seville toward Madrid was discussed for a Saturday morning. Actual departure date should be checked.
- **Potential photographic scenes:** Architectural streets, Santa Cruz area, Plaza de España, Cathedral/Giralda, gardens, tilework, early-morning light and fountains. **Not every named site is confirmed as visited**; distinguish confirmed images from a suggested sunrise shot list.
- **Story angle:** Exploring an architectural city early before the heat and crowds, contrasting broad plazas and intimate alleyways, family discovery.
- **Do not assume:** An actual horse-carriage ride, specific ticketed attraction, or restaurant without media/journal confirmation.

### 4.5.3 Madrid / El Retiro

- **Suggested destination ID:** `madrid-spain`
- **Suggested place ID:** `el-retiro-park`
- **Status:** `CONFIRMED` final portion of trip and park photography.
- **Timing:** Approximately July 20–25, 2026 in original itinerary; lodging with family/friends rather than a booked hotel was mentioned (do not publish private residential details).
- **Content:** A quiet park/flower and water-based photo series; dramatic skies; green space; possible candid family moments. A shorter curated 3–4-image park set was considered.
- **Story angle:** A gentle urban pause—less about ticking off famous sights, more about atmosphere and family time.
- **Additional Madrid attractions:** Do not add without actual evidence.

---

# 5. UTAH — FAMILY WINTER ROAD TRIP, FEBRUARY 2025

**Suggested trip ID:** `utah-winter-2025`  
**Status:** `CONFIRMED`, with unusually detailed firsthand sequencing.  
**Duration:** Approximately seven days.  
**Transport:** Flew into Salt Lake City area; rented a capable 4x4 Jeep; road-tripped from Wendover/Bonneville through Moab to Park City.  
**Family:** Wife and son participated; some drone/photo excursions were solo.

## 5.1 Utah trip sequence — concrete firsthand narrative

1. **Arrival / Wendover:** Landed around late afternoon (approximately 4–5 p.m.) and drove toward **Wendover**, taking a scenic route; stayed the night in that area. Exact hotel unknown.
2. **Bonneville Salt Flats:** Departed very early (before 5 a.m. was discussed) for the Salt Flats. Photographed/filmed a dramatic early-morning landscape with wife/son. A sunrise aerial shoot was described; map/flight regulations should be verified before publishing drone advice.
3. **Journey to Moab:** Continued toward Moab; visited **Moab Giants** dinosaur attraction with son; explored the **Potash Road** corridor, including driving scenes, red-rock formations, and Colorado River scenery.
4. **Canyon weather day:** **Dead Horse Point** and **Canyonlands** were visited on a day that brought sun, rain, wind and a **surprising snowstorm**. A memorable, changing landscape experience; son especially enjoyed it.
5. **Arches:** **Arches National Park** at/near sunset on the same general leg; subsequent Moab dinner/overnight.
6. **Solo Potash outing:** On a different day, Justin went out alone to capture aerial footage around Potash Road / potash pond scenery while family used the pool and explored town.
7. **Park City/Wasatch area:** Final nights involved Park City, the ski/snowboard environment, downtown, **Woodward Park City**, cross-country skiing in the Uintas area, and approximately two hours of dog sledding with **Wasatch Adventure Guides**.

The above is the best recovered sequence, but do not assign exact dates to every item without checking the original trip journal.

## 5.2 Individual Utah map and story nodes

### Bonneville Salt Flats
- **ID:** `bonneville-salt-flats`
- **Status:** `CONFIRMED` sunrise visit and media.
- **Scenes:** Vast reflective/open salt landscape; family within scale; early light; drone perspectives where legally captured.
- **Story:** The stillness and unusual geometry of the flats, setting out before dawn, scale of the landscape.
- **Practical notes to verify:** Access road, exact vehicle restrictions, conditions when wet, drone regulations, sunrise timing.

### Moab Giants
- **ID:** `moab-giants`
- **Status:** `CONFIRMED` attraction visit.
- **Scenes:** Son among large/life-size dinosaur exhibits; a family-friendly stop between landscapes.
- **Note:** The trip also referenced petroglyphs and dinosaur tracks along the broader Moab/Potash corridor; don't conflate them automatically with the Moab Giants venue.
- **Commercial:** Attraction profile only after official business details are verified.

### Potash Road / Colorado River corridor
- **ID:** `potash-road-moab`
- **Status:** `CONFIRMED` several drives/shoots.
- **Scenes:** Red-rock cliff walls, river corridor, dramatic roadside vistas, three-image landscape post, solo aerial capture of potash ponds/nearby industrial-color landscape, driving footage.
- **Story:** Dramatic scenery close to Moab, an unexpectedly strong photographic subject outside marquee national-park overlooks.
- **Location caveat:** Specific pullouts and exact aerial photography locations must come from EXIF or notes. Avoid pinning a generic “Potash Road” photograph at an invented viewpoint.

### Dead Horse Point State Park
- **ID:** `dead-horse-point-state-park`
- **Status:** `CONFIRMED` visit/media.
- **Scenes:** Three-image storm/weather sequence, changing cloud cover, the vast bend/canyon panorama.
- **Story:** An exceptional weather day; skies repeatedly changed the colors, light and atmosphere.

### Canyonlands National Park
- **ID:** `canyonlands-national-park`
- **Status:** `CONFIRMED` visit/media.
- **Scenes:** Big canyon landscape; weather change / unexpected snow in the same day's adventure.
- **Caution:** Exact district/viewpoint unknown. Don't label a precise park district without checking files.

### Arches National Park
- **ID:** `arches-national-park`
- **Status:** `CONFIRMED` ground-level national-park photos/video and sunset outing.
- **Scenes:** Red-rock geology, family scale, changing late-day light, a separate editorial carousel with an “what surprised me” angle.
- **Caution:** Do **not** imply national-park aerial shots originated from drone flights inside the park; earlier project discussions explicitly distinguished ground photos within parks from drone work where allowed.

### Park City and winter activities
- **IDs:** `park-city-utah`, `woodward-park-city`, `uintas-cross-country-skiing`, `wasatch-adventure-guides-dog-sledding`.
- **Status:** `CONFIRMED` for Park City, Woodward, Uintas cross-country skiing, and dog sledding with the named operator.
- **Scenes:** Winter mountain environment, skiing/snowboarding, downtown exploration, family adventure; verify actual images per activity.
- **Commercial opportunity:** Dog sledding operator, venue/experience write-up, winter travel context.
- **Note:** Justin also travels to Park City repeatedly on winter trips; keep the **February 2025 Utah road trip** distinct from later or upcoming annual Park City visits.

## 5.3 Other Utah interests — not part of a confirmed completed trip

- In **November 2026**, Justin researched the **bentonite hills near Hanksville**, especially access by large SUVs such as Explorer/Tahoe/Navigator, scenic sunset light, and avoiding rain/mud. This was **trip planning**, not evidence he had visited the bentonite area.
- Utah hiking with family and compact footwear/camera setup were discussed for a forthcoming trip.
- Do not include `hanksville-bentonite` as a *visited* pin until actual footage or confirmation exists. It can be an unpublished itinerary idea if useful.

## 5.4 Utah — 2026 trip, Zion and Park City

- **Suggested journey ID:** `utah-2026` (verify against any existing canonical Journey record before creating a new one).
- **Status:** `CONFIRMED` by the creator: a Utah 2026 trip included **two days at Zion National Park**, followed by **five days skiing and snowboarding in Park City**.
- **Place IDs:** `zion-national-park` and `park-city` (reuse the shared canonical Place records).
- **Visit duration/order:** Two days at Zion, then five days in Park City. Exact calendar dates, Zion trails/areas, Park City mountain/resort details, lodging, and transport are **TO VERIFY**.
- **Media:** Do not infer that specific photographs or videos belong to this trip merely from a Zion filename, an existing R2 test clip, or footage from another year. Associate verified assets through source metadata, the Lightroom publishing collection, or explicit creator confirmation.
- **Architectural note:** Represent this as its own **Journey** with Zion and Park City **visits**, pointing to shared canonical Places. Reuse Park City across the 2025 and 2026 Journeys; do not merge the trips or treat either as evidence for Hanksville.
- **Publication note:** Zion and Park City can support place galleries when assets are verified. Visit duration does **not** imply one public story or pin per day; add experiences progressively.

---

# 6. PUERTO RICO — AUGUST 2024

**Suggested ID:** `puerto-rico-2024`  
**Status:** `CONFIRMED` extensive photo/video travel series.  
**Style:** Coastal exploration, city atmosphere, waterfalls, family adventure, mixed hotel and distinctive vacation lodging.

### Route and lodging

- Arrived by air in **San Juan**.
- Stayed at **Don Rafa Boutique Hotel** in San Juan.
- Later stayed at **Hacienda Florecer**, described as a container-home accommodation in **Moca**.
- Both lodging businesses are natural possible experience/venue profiles once official business URLs and usable imagery are verified.

### Confirmed or strongly indicated places

| Suggested ID | Place / venue | Firsthand context |
|---|---|---|
| `old-san-juan` | Old San Juan | Early walk to avoid heat; historical Spanish fort area, colorful streets, shops/squares, coastline, architectural textures. |
| `la-carreta-san-juan` | La Carreta | Meal during Old San Juan exploration. Exact location/official listing to verify. |
| `fairmont-el-san-juan` | Fairmont El San Juan Hotel | Visited nightlife / hotel area; exact activity and footage to verify. Do not infer overnight lodging. |
| `cueva-del-indio` | Cueva del Indio | Coastal landscape/site, striking views, photo/video material. |
| `crash-boat-beach` | Crash Boat Beach | Coast / beach imagery and related western Puerto Rico exploration. |
| `gozalandia-waterfalls` | Gozalandia | Main and less obvious / hidden falls, approached early to avoid crowds. Verify exact trail/stop details. |
| `aguadilla` | Aguadilla | Urban/rooftop and coastal perspectives; verify precise coordinates. |
| `shacks-beach` | Shacks Beach | Firsthand photo set discussed in July 2026; includes tropical/water/swimwear visual content. Trip/date association should be checked rather than assumed automatically. |
| `hacienda-florecer` | Hacienda Florecer, Moca | Distinctive container-home lodging; link as a stay. |
| `don-rafa-boutique-hotel` | Don Rafa Boutique Hotel | City accommodation; link as a stay. |

### Story/useful visitor angle

- Old San Juan works as a compact walking exploration: architecture, the fort, scenic streets, food, and practical heat/timing considerations.
- Waterfall and coastal locations offer different pace/visual themes from the city.
- The north/west route makes a natural connected map experience: San Juan → coastal sites → Aguadilla/Moca → beaches/waterfalls.
- Exact road sequence and dates need journal verification; a proposed map route should not imply GPS-perfect tracking.

---

# 7. COSTA RICA — 2025

**Suggested ID:** `costa-rica-2025`  
**Status:** `CONFIRMED` trip, route, and several specific on-site experiences.  
**Broad route:** **La Fortuna / Bajos del Toro** → **Drake Bay / Osa Peninsula** → **Uvita / southern Pacific coast** → **San José area**. Dates and some order details need trip-journal confirmation.

### 7.1 La Fortuna / Bajos del Toro

- **IDs:** `la-fortuna-costa-rica`, `bajos-del-toro`.
- **Status:** `CONFIRMED` at route level.
- **Media themes:** Lush/misty tropical landscape, rainforest, waterfalls, shifting jungle atmosphere.
- **Potential content label:** `Jurassic Canyon / Bajos del Toro` was discussed in content/pitch planning; verify the exact named attraction and actual visit before making a precise venue pin.
- **Do not assume:** Arenal activity, a particular hotel, Monteverde, bridge tour, hot spring, or cafe was visited merely because it appeared in recommendations.

### 7.2 Drake Bay / Osa Peninsula

- **IDs:** `drake-bay`, `playa-san-josecito`.
- **Status:** `CONFIRMED` route and **Playa San Josecito** firsthand photography/context.
- **Scenes:** Jungle meeting the ocean; beach with lush tree line and dramatic tropical setting; snorkeling/calmer-water context.
- **Story:** The feeling of reaching a more remote Pacific coastline; beach approached by boat or hiking was discussed as visitor context, but verify which method Justin personally used.
- **Nearby Caño Island:** Discussed as a potential snorkeling/diving opportunity; **not confirmed visited** in the available data.

### 7.3 Uvita / Marino Ballena Whale Tail

- **IDs:** `uvita-costa-rica`, `uvita-whale-tail`, `marino-ballena`.
- **Status:** `CONFIRMED` specific walk and media.
- **Actual experience:** Walked out across the **Whale Tail** formation at **low tide**; wife photographed against/near a palm tree; aerial imagery reveals the distinctive shape.
- **Story:** The dramatic geographic reveal that only makes sense once you understand the tide—ground-level exploration followed by a high-angle view. Excellent progressive map/card story.
- **Practical take-away:** Tide timing matters to the visit. Don't publish specific safe tide windows, restricted airspace advice, or detailed access conditions without an up-to-date source.
- **Possible cover theme:** “Uvita: Why the Tide Matters” (editorial idea, not a verified published headline).

### 7.4 Nauyaca Falls

- **ID:** `nauyaca-waterfalls`
- **Status:** `CONFIRMED` actual trip visit/photography as stated in a retrospective route account.
- **To verify:** Which waterfall/entry route, how accessed, duration, logistics, and exact photo files.

### 7.5 Uvita rainforest / howler monkeys

- **ID:** `uvita-howler-monkeys`
- **Status:** `CONFIRMED` firsthand wildlife photography.
- **Scenes:** Walking into forest and seeing **howler monkeys in trees**, including a mother with a baby overhead.
- **Editorial:** Patient observational wildlife scene; natural jungle setting without staged animal encounter.
- **Safety/ethics:** Never imply touching, feeding, or approaching wildlife beyond the evidence; do not geotag a sensitive nesting/animal location precisely without a good reason.

### 7.6 Manuel Antonio

- **ID:** `manuel-antonio-area`
- **Status:** `CONFIRMED` a **quick stop in the area** during the trip.
- **Important caveat:** Discussions mentioned the park being closed Tuesdays. This is **not proof Justin entered the national park**; label the area stop appropriately until confirmed.
- **Value:** Logistics around a short pass-through versus a dedicated park visit, if original notes/photos support it.

### 7.7 Other Costa Rica material

- **San José end of trip:** Ending near/overlooking San José was included in a retrospective trip route.
- **Unverified/planned only:** Monteverde, Nosara, Golfito Bay, particular rafting/canyoning operators, and specific villas/restaurants floated in itineraries. Do not mark visited without confirming.
- **Commercial possibilities:** Lodging, boat operators, rainforest guides, waterfall access operators, and tours only when actual experience + official contact info can be established.

---

# 8. UNITED STATES VIRGIN ISLANDS — ST. JOHN / ST. THOMAS

**Suggested ID:** `usvi-st-john-2025`  
**Timing:** 2025 is strongly indicated; precise dates require confirmation.  
**Status:** `CONFIRMED` St. John/USVI imagery and aquatic experiences; some names below were previously assistant-drafted and are marked separately.

### Strongly supported firsthand scenes

- **St. John** travel, beaches and tropical coastal landscapes.
- **Trunk Bay:** Swim/snorkel/underwater imagery, rock and coral environments, white sandy bottom, wife diving/swimming. A short cinematic reel was discussed.
- **Maho Bay / north-shore beaches:** Prior social posts/captions and island scenes strongly suggest coverage; confirm exact gallery for individual locations.
- **Boat/harbor/aerial imagery:** Elevated views of island coves and boats, harbor scenic perspectives, relaxed pool/beach and family imagery; specific operators need verification.
- **Story style:** A series of distinct quiet tropical moments rather than asserting every photo happened on one day; a USVI photo series was deliberately **not chronological**.

### Needs verification before venue or route publication

- A prior assistant draft described flights into St. Thomas, ferry to St. John, a Cruz Bay stay, a boat charter, **Lovango Beach Club**, and **Shipwreck Cove**. These details were **not independently confirmed from the user in the retrieved record**. They may be leads to check against the actual travel journal, not asserted itinerary facts.
- Do not publish a charter operator, boat route, dive site, beach club, accommodation, or travel dates unless confirmed.

---

# 9. MIAMI / SOUTH BEACH

- **Suggested ID:** `miami-south-beach`
- **Timing:** Before March 2026; exact trip dates unknown.
- **Status:** `CONFIRMED` family photo series.
- **Images and scenes:** Beach walks, saltwater, young child running freely, boardwalk scenes, playful sand/block moments, overhead water views, walking away, Miami sign, candid family perspectives.
- **Story angle:** Casual unstructured family time along the beach; small moments rather than a checklist of destinations.
- **No named businesses confirmed** from this set; avoid inventing restaurants, hotels, and attractions.

---

# 10. NORTH GEORGIA / BLUE RIDGE / MINERAL BLUFF — NOVEMBER 2026

- **Suggested destination ID:** `north-georgia-blue-ridge`
- **Status:** `CONFIRMED` time spent in/near **Mineral Bluff**, North Georgia, and drone/landscape photography.
- **Related broad regions:** Blue Ridge and Morganton areas.
- **Personal experience:** Quiet family getaway with a fire, card games, a movie, hot tub, cabin/woodland ambiance, and surrounding mountain scenery. The creator explicitly recognized that these **micro-moments** could tell a better story than disconnected scenic shots.
- **Media:** Aerial/drone landscape photographs near Mineral Bluff were shared; future Avata 2 FPV flying was considered but **not confirmed accomplished**.
- **Bald eagle project:** Justin researched how and where to photograph bald eagles around **Morganton**, including time-of-day options. **Do not claim an eagle was photographed or sighted** without evidence.
- **Hikes/roads researched:** Nearby hikes, Swinging Bridge, Morganton highway/access points and recent flooding impacts were investigated. Some were just options; do not create visited trail pins from the questions alone.
- **Editorial:** “A quiet night in North Georgia” could be told through arrival, fire, family play, cabin evening, and landscape reveal. This is a **creative structure**, not an assertion that every moment was filmed.
- **Venue:** No verified cabin name/address or booking operator. Keep private stay details private.

---

# 11. PEORIA, ILLINOIS — FALL TRIP

- **Suggested ID:** `peoria-illinois`
- **Status:** `CONFIRMED` discussed drone footage.
- **Location:** Peoria, Illinois; Illinois River / downtown area.
- **Scenes:** Early/sunrise aerial view over the river and city.
- **Timing:** Fall-break period, year/date needs verification against metadata/journal.
- **Editorial:** A quiet river-city morning and an unexpected aerial perspective, potentially distinct from larger destination travel.
- **No specific hospitality venue** verified.

---

# 12. Destination / experience / venue discovery index

Use this table as a **starting inventory**, not a promise that each row already has sufficient material for a published pin. `CONFIRMED` refers to existence/visit, not current contact/link verification.

| ID candidate | Parent / region | Entity kind | Status | Useful relationship |
|---|---|---|---|---|
| `portsmouth-historic-dockyard` | England / Portsmouth | attraction | CONFIRMED | HMS Warrior / family adventure story |
| `balmer-lawn-hotel` | England / New Forest | hotel | CONFIRMED | family reunion stay ↔ pony walks |
| `new-forest-ponies` | England / New Forest | experience/story | CONFIRMED | Balmer Lawn area |
| `york-street-performance` | England / York | story | CONFIRMED | historic streets / performer (name to verify) |
| `harrogate-england` | England | destination | STRONGLY INDICATED | actual media pending |
| `amsterdam-canals` | Netherlands / Amsterdam | place/story | CONFIRMED | urban perspectives |
| `nemo-rooftop` | Netherlands / Amsterdam | place/story | CONFIRMED | architectural/city views |
| `amsterdam-boat-ride` | Netherlands / Amsterdam | experience | PLANNED / DISCUSSED | confirm operator/photos |
| `split-croatia` | Croatia | destination | CONFIRMED | base for boat and waterfalls |
| `raptor-experience` | Croatia / Split area | tour operator | CONFIRMED | boat-day story + inquiry links (TBD) |
| `raptor-experience-boat-day` | Croatia / islands | experience | CONFIRMED | Brač/Hvar route, photo story |
| `brac-island` | Croatia | destination | STRONGLY INDICATED | verify exact boat stops |
| `hvar-island` | Croatia | destination | CONFIRMED / STRONGLY INDICATED | boat-day images |
| `krka-national-park` | Croatia | park | CONFIRMED / STRONGLY INDICATED | waterfall day |
| `dar-darma` | Morocco / Marrakech | riad | CONFIRMED | Medina stay |
| `marrakech-guided-medina-walk` | Morocco / Marrakech | experience | STRONGLY INDICATED | Tarik Belasri |
| `le-meridien-nfis` | Morocco / Marrakech | hotel | CONFIRMED | Azyr cocktail moment |
| `azyr-le-meridien-nfis` | Morocco / Marrakech | restaurant/bar | CONFIRMED | @mehdi_krh |
| `inara-camp-agafay` | Morocco / Agafay | camp/experience | CONFIRMED | evening activities/performances |
| `malaga-spain` | Spain / Andalusia | destination | CONFIRMED at route level | stop details pending |
| `gibraltar` | Gibraltar | destination | CONFIRMED at route level | attraction details pending |
| `cadiz-spain` | Spain / Andalusia | destination | CONFIRMED at route level | local media pending |
| `seville-spain` | Spain / Andalusia | destination | CONFIRMED | architecture carousel |
| `el-retiro-park` | Spain / Madrid | place/story | CONFIRMED | Madrid relaxed urban moment |
| `bonneville-salt-flats` | Utah | landscape | CONFIRMED | sunrise/family road trip |
| `moab-giants` | Utah / Moab | attraction | CONFIRMED | kid-friendly dinosaur stop |
| `potash-road-moab` | Utah / Moab | route/landscape | CONFIRMED | dramatic drive, aerial shots |
| `dead-horse-point-state-park` | Utah / Moab | state park | CONFIRMED | storm imagery |
| `canyonlands-national-park` | Utah / Moab | national park | CONFIRMED | snowstorm/weather memory |
| `arches-national-park` | Utah / Moab | national park | CONFIRMED | ground-level photography |
| `zion-national-park` | Utah / Zion | national park | CONFIRMED | Two days visited on `utah-2026`; precise dates, stops and media associations to verify |
| `park-city-utah` | Utah | destination | CONFIRMED | winter experiences |
| `woodward-park-city` | Utah / Park City | venue | CONFIRMED | verify media |
| `wasatch-adventure-guides` | Utah / Wasatch | service | CONFIRMED | dog sledding experience |
| `old-san-juan` | Puerto Rico | destination | CONFIRMED | fort/street walk |
| `don-rafa-boutique-hotel` | Puerto Rico / San Juan | hotel | CONFIRMED | stay |
| `hacienda-florecer` | Puerto Rico / Moca | lodging | CONFIRMED | distinctive container home stay |
| `la-carreta-san-juan` | Puerto Rico / San Juan | restaurant | CONFIRMED | Old San Juan meal |
| `cueva-del-indio` | Puerto Rico | attraction | CONFIRMED | coastal imagery |
| `crash-boat-beach` | Puerto Rico | beach | CONFIRMED | coast |
| `gozalandia-waterfalls` | Puerto Rico | waterfall | CONFIRMED | main/hidden falls |
| `shacks-beach` | Puerto Rico | beach | CONFIRMED | exact trip date pending |
| `la-fortuna-costa-rica` | Costa Rica | destination | CONFIRMED | rainforest route |
| `bajos-del-toro` | Costa Rica | destination | CONFIRMED | waterfall/rainforest route |
| `drake-bay` | Costa Rica / Osa | destination | CONFIRMED | remote coast |
| `playa-san-josecito` | Costa Rica / Osa | beach | CONFIRMED | jungle beach |
| `uvita-whale-tail` | Costa Rica / Uvita | place/experience | CONFIRMED | low-tide walk + aerial reveal |
| `nauyaca-waterfalls` | Costa Rica | attraction | CONFIRMED | waterfall story |
| `uvita-howler-monkeys` | Costa Rica / Uvita | wildlife story | CONFIRMED | mother/baby in canopy |
| `manuel-antonio-area` | Costa Rica | area/stop | CONFIRMED | quick stop; park admission NOT confirmed |
| `trunk-bay` | USVI / St. John | beach | CONFIRMED | underwater swimming/snorkeling |
| `maho-bay` | USVI / St. John | beach | STRONGLY INDICATED | gallery confirmation needed |
| `miami-south-beach` | Miami | destination | CONFIRMED | family beach series |
| `north-georgia-blue-ridge` | Georgia | destination | CONFIRMED | family cabin/mountains |
| `peoria-illinois` | Illinois | destination | CONFIRMED | sunrise aerial |
| `hanksville-bentonite` | Utah | future idea | PLANNED / DISCUSSED | **not visited as of this context** |

---

# 13. Media library and storytelling hints

The website should **not** treat media as a flat array of generic photographs. Assign each verified image/video to its most specific supported location/experience, and allow the same asset to be referenced by both a broader destination page and a specific story.

## Content collections / editorial concepts known from discussions

| Collection | Content evidence | Suggested treatment |
|---|---|---|
| Portsmouth dockyard / HMS Warrior | Curated multi-photo family/ship set | One memorable historical attraction story. |
| New Forest ponies / Balmer Lawn | Hotel/reunion scenes plus outdoor ponies, wife portrait, son+niece image | Two linked stories: stay and surrounding nature. |
| York performer | Street performer/jester-like set | A short, distinct cultural micro-story. |
| Amsterdam NEMO rooftop | Curated rooftop images | Specific geographic pin and city-views story. |
| Amsterdam canals | Canal teaser, architectural details | Multiple related city moments, not one giant carousel. |
| Split Raptor boat | ~1,300 captured, ~100 edited mentioned, boat-centric carousel revisions | Primary pilot for nested experience, operator profile, route stops, video. |
| Croatia Krka | Waterfall park set | Independent nature experience under Croatia. |
| Marrakech Medina / Dar Darma | Riad/architecture/street coverage | Contrasting urban and private interior atmosphere. |
| Azyr cocktails | Hotel bar/mixologist images | Discrete short hospitality moment. |
| Inara Camp | Henna, music/dance, fire entertainer, desert, activities | Evening story broken into meaningful beats. |
| Seville | Curated ~10-image urban architecture set | City story linking finer location pins only when confirmed. |
| Madrid / El Retiro | Selected quiet park scenes | Compact atmospheric urban interlude. |
| Utah storm day | Dead Horse Point/Canyonlands changing weather, three-image selection | Weather as the narrative, not weather as a technical footnote. |
| Potash Road | Three-image landscape set and aerial photo/video | Area/route story with multiple photographic vantage points. |
| Arches | Ground-level park photography; 'what surprised me' cover concept | Landmark page with real surprise/personal takeaway. |
| Costa Rica Uvita Whale Tail | Palm-tree portrait, low tide walk, aerial reveal | Excellent map-to-story cinematic payoff. |
| Costa Rica howler monkeys | Forest encounter, mother and baby | Wildlife micro-story. |
| St. John Trunk Bay | Coral/rocks/white sand/wife in clear water | Underwater visual experience. |
| Miami South Beach | Candid family scenes | Warm, uncomplicated family day. |
| Mineral Bluff cabin getaway | Fire, cards, film, hot tub, scenic North Georgia | Emotional connective footage; do not assert unfilmed beats exist. |
| Peoria Illinois River | Sunrise urban river aerial | Small but visually distinct destination story. |

## Media mapping protocol for Codex

1. Enumerate assets actually present in the repo and any user-provided metadata.
2. Do not assign a place to a photograph by visual guess alone if several locations look similar. Use album folder, EXIF, journal, caption, or explicit user mapping.
3. Store descriptive alt text and source/creator credit. Use thumbnails/posters for map card rendering; don't load raw high-megapixel originals into dozens of pins.
4. If there is one standout image, use it as a destination hero. For hover previews, optionally rotate *on subsequent card openings* among approved images from that specific location.
5. Distinguish photos depicting actual venues from editorial landscapes nearby; don't accidentally present one company's property with images of a different place.
6. Never repurpose partner-supplied logos, third-party images, or identifiable private subjects without appropriate permission.
7. Permit content to be incomplete. A destination can appear with a carefully selected hero and no venue link until later.

---

# 14. Direct venue/service opportunities and disclosure status

These are attractive potential destination profiles because actual experience or related media exists. **They are not confirmed sponsors.**

| Venue / service | Place | Why it fits | Relationship evidence | Verify before publication |
|---|---|---|---|---|
| Raptor Experience | Split / Croatian islands | Cinematic boat-day experience + unusually large original image set | Actual excursion; discussions around collaboration and licensing requests | Official identity, permission/use terms, contacts, booking URL, relationship status |
| Balmer Lawn Hotel | New Forest, England | Authentic multigenerational hotel stay and nearby landscapes | Actual family stay; proposed content collaboration | Official booking link, property, any agreed terms |
| Le Méridien N'Fis | Marrakech | Resort stay and lifestyle/hospitality coverage | Actual stay; content posted | Official property URL, current contacts |
| Azyr / mixologist | Marrakech | Boutique cocktail-making visuals / hospitality micro-story | Actual drinks with @mehdi_krh | Accurate venue name, person's permitted attribution, current handles |
| Dar Darma | Marrakech | Distinctive riad, architecture, first-night stay | Actual booking/stay | Official site/contact, photographed rooms/permissions |
| Inara Camp | Agafay | Evening destination experience + several visual story beats | Actual planned/featured visit | Actual services used, booking link, contacts, sponsorship status |
| Tarik Belasri | Marrakech | Guided personal Medina experience | Scheduled guide; later thanks | Current public booking/contact details, how to list service |
| Krka National Park | Croatia | Natural companion day-trip to Split | Photo/story coverage | Official site/rules/access, no implied affiliation |
| Wasatch Adventure Guides | Utah | Personal dog-sledding adventure | Actual activity | Specific tour/operator link, dates, current availability |
| Woodward Park City | Utah | Family winter activity | Visit included in trip account | Actual booked/visited experience and current booking link |
| Moab Giants | Utah | Family-friendly dinosaur attraction | Actual visit | Official site, hours, visitor info |
| Don Rafa Boutique Hotel | Puerto Rico | City lodging context | Actual stay | Official site and current details |
| Hacienda Florecer | Puerto Rico / Moca | Distinctive accommodation | Actual stay | Official site/booking platform |
| La Carreta | Old San Juan | Personal restaurant experience | Actual meal | Specific business listing and URL |
| Fairmont El San Juan | Puerto Rico | Hotel/nightlife visual possibilities | Visit; not confirmed lodging | Exact visited outlet/service |

### Commercial integration principles

- A high-quality experience card can show **Justin's image**, a short firsthand takeaway, a map/location link, phone, provider site, and booking/contact action.
- Always validate the official business links and details; don't use fabricated phone numbers or unreviewed scraped data.
- Distinguish **Editorial recommendation**, **Affiliate link**, **Sponsored feature**, and **Content licensing** as separate concepts.
- Payment or commission relationships must be clearly disclosed near the endorsement/link; do not hide disclosures in the footer.
- Never imply a venue is recommended simply because it paid. Firsthand authenticity is the durable value proposition.
- Link outbound clicks to analytics (privacy-respectful) so partnership value can eventually be demonstrated: venue-card views, website clicks, call taps, maps taps, booking clicks; do not equate clicks with actual sales without conversion data.
- Commercial negotiations, private client messages, internal rates, and unpublished image proofs should not be rendered as public content.

---

# 15. Practical user experience / retention requirements

These are **product requirements**, not recovered trip facts, but they explain why the content must be structured as above.

## Geographic discovery

- Start with a visually compelling world or regional atlas, favoring **cinematic satellite + elevated 3D terrain** for regional/destination exploration.
- **MapLibre GL JS** should manage map rendering and geographic coordinate projection. Use a compatible provider such as MapTiler for imagery/terrain if needed and properly configured. Do not implement a globe/terrain renderer from scratch.
- Pins start broad (country/region/city), then reveal meaningful sublocations and experiences at deeper zoom/selection levels.
- No wall of markers; cluster or curate by scale. The pin photo should be tied to that locale, not randomly drawn from an entire country.
- Hover on desktop can show a compact image preview; click/tap should persist a detail card. Mobile must not depend on hover.
- Use MapLibre HTML markers/popups or straightforward HTML overlay patterns for cards. Three.js/CSS2D is **optional** only if a concrete effect demands it; do not create unnecessary parallel coordinate or rendering systems.
- A detail card can expand into a full editorial article/gallery/short film, with related places, stops, and venues.

## Returning and saving

- Persistent favorites using `localStorage`, with a schema/version and safe fallback on invalid data.
- Recently explored places, optionally last map viewport.
- Back navigation should restore previous map center, zoom, pitch, bearing, and selected place where feasible.
- Breadcrumbs e.g. `World > Europe > Croatia > Split > Boat excursion > Brač stop`.
- Browser Back/Forward buttons and deep links must behave predictably.
- Direct destination pages should be crawlable, shareable, and useful **without** needing to enter the world map.
- Future wishlist/itinerary feature should build on favorites, not require accounts on day one.

## Media and performance

- Let high-quality photos carry the visual drama; avoid multiple simultaneous auto-playing videos.
- Lazy-load/offscreen images, responsive formats, efficient markers, reduced motion support, keyboard and touch accessibility.
- Direct social traffic will include many phones: create a deliberate mobile bottom-sheet/card experience.
- Monitor real engagement (cards opened, depth of discovery, saved destinations, return visits) rather than optimizing only for vanity page views.

---

# 16. Unverified locations and suggestions: explicit exclusion list

The following appeared as **possible** activities, editor ideas, route alternatives, or planning research. Do **not** create `visited` entries solely from this document:

- Zaanse Schans or Kinderdijk windmills as a completed Netherlands excursion.
- Pllek, Vondelpark, a particular canal cruise operator or a specific Amsterdam hotel property without confirmation.
- Pakleni Islands as a confirmed stop on the Raptor boat excursion.
- Plitvice Lakes National Park instead of Krka.
- A complete Split Old Town sunrise walking itinerary or drone flight inside a protected city area.
- Specific Marrakech rooftop restaurants or every Medina market/attraction suggested in shot lists.
- An overnight stay at Inara Camp (the documented visit was an evening outing).
- Gibraltar Rock attractions, Tarifa stops, Bolonia dunes, Baelo Claudia, Vejer, Zahara, or specific Andalucía swimming holes, without verifying actual stops.
- Seville horse carriage rides or every attraction from a suggested sunrise route.
- Costa Rica Monteverde, Nosara, Caño Island, Golfito tours, particular villas and dive operators, unless confirmed by photos/journal.
- Entry into Manuel Antonio National Park (only a quick area stop is confirmed).
- Lovango Beach Club, Shipwreck Cove, specific St. John charter operator, Cruz Bay accommodation, or exact St. Thomas transit route: only assistant draft context currently supports these.
- North Georgia hiking trails and actual bald eagle sighting: researched, not confirmed.
- Hanksville bentonite hills visited in late 2026: discussed as an upcoming Utah idea, not completed. **This is separate from the confirmed 2026 Utah trip with two days at Zion followed by five days skiing and snowboarding in Park City.**
- Any business contact phone, current opening hours, price, menu, or booking conditions listed nowhere in the evidence.

---

# 17. Recommended ingestion workflow for Codex

When asked to update the existing trip-data file, Codex should:

1. **Read repository first.** Find the real trip model and existing files (`trips.js`, `trips.ts`, `src/data/...`, JSON, CMS, or equivalent). Inspect existing entries, media folders, route patterns, and frontend types.
2. **Take an inventory.** Show which destinations from this file already exist, are missing, are partial, or conflict with current repo content.
3. **Preserve good existing data.** Do not overwrite verified coordinates, valid venue links, captions, media arrays, schema, or first-person travel notes with vaguer text from here.
4. **Normalize entries carefully.** Add missing trip/destination/place/experience records with stable IDs, clear hierarchy and relationships. Use actual repo conventions and existing types.
5. **Respect confidence.** Only populate public `visited` content from confirmed/reviewed experiences. Add draft or internal verification tasks for uncertain locations; don't make a placeholder look like a factual claim.
6. **Do not invent coordinates or images.** Real geographic location data should come from trusted geocoding/EXIF/user-provided source, not guesses. Missing links should stay absent.
7. **Separate service profiles.** An experience can point to a real provider without implying a commercial partnership.
8. **Test behaviors.** Validate links, routes, localStorage favorites if present, media loading and type checks/build.
9. **Report clearly.** Summarize updated entities, remaining missing assets, unresolved coordinates, disputed stops, and commercial links needing verification.

### Example instruction to paste into Codex

> Read `docs/travel-context.md` in full, then inspect my existing trip-data implementation and the actual media assets in this repository. Update the data to include as much **confirmed firsthand** Roam With Justin travel history as the current schema supports. Preserve existing entries, IDs, verified coordinates and working media references. Distinguish places I actually visited from itineraries or suggestions. Do not make up location coordinates, file paths, venue URLs, phone numbers, prices, or sponsorships. Link destination → place → experience → venue in a maintainable way without overengineering. Add a concise `docs/travel-data-gaps.md` listing uncertain facts and missing media/links, run typecheck/build, and summarize the changes.

### Safe seed structure (illustrative only; not an instruction to replace the schema)

```ts
// Illustrative data shape only; adapt to the actual repository.
type EvidenceStatus = "confirmed" | "strongly-indicated" | "planned" | "to-verify"

type AtlasNode = {
  id: string
  kind: "trip" | "destination" | "place" | "experience" | "venue" | "story"
  title: string
  parentId?: string
  relatedIds?: string[]
  tripIds?: string[]
  evidenceStatus: EvidenceStatus
  coordinates?: [number, number] // ONLY verified [longitude, latitude]
  mediaIds?: string[] // ONLY verified real assets
  venueId?: string
  description?: string
  verificationNotes?: string
}

const example: AtlasNode = {
  id: "uvita-whale-tail",
  kind: "experience",
  title: "Walking the Whale Tail at low tide",
  parentId: "uvita-costa-rica",
  tripIds: ["costa-rica-2025"],
  evidenceStatus: "confirmed",
  description: "We walked the Whale Tail at low tide; the aerial perspective reveals its distinctive shape.",
  verificationNotes: "Attach actual Uvita ground and aerial photos; source precise pin from existing map or photo metadata."
}
```

---

# 18. Priority order for getting this content live

**Phase 1 — Best immersive pilot:** **Croatia / Split / Raptor Experience**. Strong media depth, real venue, geographically meaningful excursion route, related island stops, commercial potential. Build a beautiful destination context, expandable boat card, verified stops, gallery, venue actions, breadcrumbs, favorites, and repeatable back navigation.

**Phase 2 — Strong photographic/interactive contrasts:** **Costa Rica / Uvita Whale Tail** (ground-to-aerial reveal), **Utah / Moab weather and Potash Road** (dramatic terrain), **New Forest / hotel-to-ponies** (intimate family/venue travel), **Marrakech / Medina-to-Agafay evening** (narrative movement).

**Phase 3 — Build breadth:** Amsterdam, Madrid, Seville, Puerto Rico, St. John, Park City, North Georgia, and Peoria. Broaden only after specific media / locations / services can be verified.

**Overall philosophy:** A visitor should be able to enter through one beautiful photograph, explore geographically and emotionally, save a location, discover the actual service that made the experience possible, and return to their map position. The value is **genuinely useful firsthand travel information delivered through a memorable, rewarding interface**.

---

## 19. Outstanding source documents/assets to consult (not included here)

These are categories to **look for**, not assertions about filenames or repository presence:

- Existing `trips.js` / `trips.ts` / trip JSON or CMS entries.
- The Notion trip journal workflow Justin previously described for building blogs, captions and trip objects.
- Lightroom collections / album exports / gallery selects per location.
- Sony and DJI EXIF/GPS metadata where available; Resolve video edits and exported reels.
- Actual confirmed booking emails, official vendor websites and Instagram handles.
- Existing public Instagram posts/captions to identify which named photo groups were actually published.
- Existing website sections and image directory conventions, which should take precedence over suggested IDs here.
- Licenses, model releases, commercial agreements, and images that are okay for public reuse.

**Final reminder:** This document is a high-coverage research handoff from our discussions. It is intentionally rich in detail but **not a substitute for checking the repository and real travel media**. Verified data should always win over these notes.
