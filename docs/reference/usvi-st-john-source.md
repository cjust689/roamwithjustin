---
id: usvi-st-john-source
title: USVI / St. John Journey Source Notes
kind: reference
status: approved
implementation_state: partial
updated: 2026-11-14
related:
  - content-model
  - travel-context
  - storytelling-framework
supersedes: []
superseded_by: []
code_paths:
  - src/content/journeys/usvi-st-john-2025.mjs
  - src/content/places/usvi.mjs
  - src/content/media/usvi.mjs
  - src/content/atlas/presentation.mjs
verification:
  state: verified
  evidence:
    - npm run content:validate
---

> **Journey source reference:** Current canonical records implement much of
> this brief, but unresolved evidence notes remain useful. Do not publish new
> facts or media from this document alone.

# Roam With Justin — USVI / St. John Trip Ingestion Brief

**Document type:** Human-authored trip input for AI-assisted Atlas content ingestion  
**Status:** Content context and planning only; **do not mutate application data or publish assets from this document alone**  
**Proposed canonical journey ID:** `usvi-st-john-2025` (confirm against the existing canonical registry before adding)  
**Destination:** St. John, U.S. Virgin Islands  
**Duration:** Seven day-labeled entries in the creator's provided outline; exact calendar dates not supplied  
**Media:** Three R2-hosted videos are inventoried and linked; location-specific photographs will follow  
**Evidence:** Creator's direct trip outline and impressions, supplemented by explicitly identified prior firsthand discussion

## Implementation checkpoint — November 14, 2026

The creator explicitly authorized implementation after this planning brief was written. The repository now contains the canonical `usvi-st-john-2025` Journey, ten confirmed visit records, seven editorial day chapters, public Places, a St. John Atlas root, nine geographically resolved leaf stops, and guided playback.

The implementation preserves the open evidence boundaries from this brief:

- the trip year is confirmed as 2025, while exact calendar dates and the factual trip length remain unconfirmed;
- Hermit Crab Island is a Journey visit with no coordinates or Atlas pin until its formal geographic identity is resolved;
- the Great Cruz Bay map point is broad lodging context and does not expose the villa's address;
- the charter's exact within-day stop order and the specific Lovango lunch venue remain unverified;
- the existing journey cover is an explicit temporary visual placeholder, while location-specific photographs remain pending review.

Application data remains authoritative in `src/content/`; this document continues to be a human-readable evidence and ingestion handoff rather than a second database.

### Creator storytelling update — November 14, 2026

The published Journey narrative now incorporates a second, more experiential firsthand account using the [Experiential Storytelling Framework](storytelling-framework.md) as its editorial guide:

- arrival through Cyril E. King Airport, the drive across St. Thomas, cruise ships seen through the creator's son's perspective, the Red Hook ferry, sunset arrival in Cruz Bay, and a crowded stop at High Tide;
- roosters, breakfast, patio views, and creator-confirmed drone/photo material at Oceana Villa;
- Maho's parking rhythm, nearby Reef2Peak rentals and amenities, the Painkiller, calm water, anchored boats, and the shared turtle encounter;
- the National Park dock pickup, twelve-person boat comfort, covered seating, captain personality, music, reef-to-reef movement, creator-named Hermit Crab Island, the depicted sunken sailboat, and lunch at Lovango;
- the creator's mixed Trunk Bay assessment, Cinnamon's more developed feel, and the Annaberg history, rocky approach, sparse visitation, reef sharks, and challenging current at Waterlemon.

The 2023 “best beach” recollection is not published as a number-one claim; the sailboat's hurricane history and present-day status remain explicitly unverified. Exact child ages are also omitted from public copy.

### R2 video update — November 14, 2026

The creator confirmed the trip year as **2025** and supplied three owned MP4 object keys already hosted below `videos/usa/usvi/`:

- `This Is Saint John.mp4` — arrival on St. Thomas and the ferry crossing into St. John; attached to the Cruz Bay chapter;
- `NatesCharters_Edit-30k.mp4` — the multi-stop Nate's Custom Charters day; attached to Lovango as the mapped representative for that chapter without claiming the entire film was captured at Lovango;
- `roam_waterlemon_1.mp4` — attached to the Waterlemon Cay chapter.

The canonical Media records retain the exact R2 keys, while the public URL resolver percent-encodes spaces. All three temporarily use the general St. John cover as a poster until location-specific photographs arrive. Their presence does not clear the UI's “location photos coming soon” state.

## Latest confirmed update — Day 3 charter excursion

**Creator-confirmed firsthand details (supersedes older tentative charter/stop notes):**

- **Charter operator:** Nate's Custom Charters.
- **Captain:** Described as amazing and funny, with music central to the onboard atmosphere. Creator's personal line: **“Hope you like music!”** Do not infer the captain's actual name or a playlist.
- **Stops visited:** **Hermit Crab Island** and **Lovango**.
- **Lovango activity:** **Lunch and relaxation**; the specific lunch establishment is not yet confirmed.
- **Media grouping:** Day 3 / Boat Day, alongside photos of houses and coastal scenery; exact sequence of the stops is not verified.
- **Atlas interpretation:** A single charter **experience** linked to the two confirmed places and to the charter operator as a provider. Do not create duplicate place pins or imply an affiliate/sponsored partnership.

This update is intentionally echoed in the Day 3 outline and relationship mapping below so an ingestion agent will not miss it. It changes **content context only**; it does not authorize automatic changes to app code or published assets.

## 1. Objective and ingestion constraints

Use this Markdown as the **human-readable trip handoff**, not as a second database. An AI ingestor should parse it into **proposals** against the existing canonical Places, Journeys, Media, Experiences (if implemented), and placement/usage records. Reuse canonical place IDs; preserve explicit human-selected stories and heroes. Do not hand-edit legacy trip or Atlas arrays; honor the media registry and publication manifest pipeline. **This content brief provides narrative and itinerary mapping. Lightroom's Publish Service remains authoritative for which photographs are selected, their identity/revisions, and delivered media references.**

Never invent exact dates, GPS coordinates, camera settings, file paths, booking links, boat stops, specific wildlife sightings (beyond the turtle experiences confirmed below), or commercial relationships. A place mentioned in the creator's firsthand day plan is confirmation of a trip stop at that broad level, not proof of precise coordinates or every possible activity. Keep unverified information optional.

**Potential chronology conflict to resolve, without guessing:** An older firsthand recollection described a five-day St. John stay and a boat charter on day six. The creator's **newer, explicit seven-day content outline** places the Boat Day on **Day 3**. Treat the seven-day outline below as authoritative for intended editorial grouping; do not convert its day labels into exact travel dates until checked against image timestamps/booking details. The older recollection may have used different counting conventions.

## 2. Destination and accommodation

### St. John / Cruz Bay

- Island: St. John, USVI.
- Arrival included a **flight followed by a ferry**, ending in **Cruz Bay**.
- A prior firsthand discussion described arriving at the Cruz Bay ferry dock **around sunset**. Verify against image timestamps before assigning a specific date or exact light conditions to a particular photo.
- A prior firsthand recollection mentioned a **Jeep rental**; do not include in published copy unless it serves the story and can be verified.

### Oceana Villa — Great Cruz Bay

**Creator-supplied lodging identification and property description:** *Oceana Villa*, overlooking **Great Cruz Bay**. A previous recollection used the spelling “Oceania”; use **Oceana** as provided in this update, but verify the official listing name before generating outbound links.

Property details supplied in this brief (treat as listing claims requiring verification for current booking copy):

- Overlooks the aqua waters of Great Cruz Bay.
- Approximately **0.5 miles from the beach**.
- **10 × 18 ft infinity-edge pool**, hot tub and views toward outer cays.
- **Six air-conditioned bedrooms**, **6.5 baths**, child-friendly positioning and a handicap-accessible bathroom.
- Served as the group's vacation rental / Airbnb.

**Editorial potential:** Home-base imagery, the view, pool, relaxed family moments, and the contrast between island outings and returning to the villa. **Do not imply a sponsorship, affiliate arrangement, verified accessibility certification, or present-day rental availability.** The creator supplied the property description; it is not independent verification of amenities.

## 3. Creator's chronological day-by-day outline

The headings below preserve the creator's **seven-day / one-post-per-day** planning model. They are editorial groupings, not necessarily seven separate Atlas map pins or seven required published experiences. A cohesive beach chapter may cross day boundaries.

### Day 1 — Arrival

**Proposed Post 1:** Flight → Ferry → Cruz Bay.

- **Directly supplied:** Travel by flight, ferry crossing, and arrival at Cruz Bay.
- **Previously corroborated firsthand:** Ferry arrival around sunset.
- **Narrative idea, not a claimed recorded shot:** The transition from air travel to the ferry and first glimpse of the island.
- **Media to locate:** Flight/transit photographs, ferry imagery, arrival at Cruz Bay, optional video.
- **Candidate canonical place:** `cruz-bay` (resolve against repository, do not create a duplicate automatically).

### Day 2 — Maho Bay and the Villa

**Proposed Post 1:** Maho → Paddleboarding → Relaxing → Animals → Airbnb.

- **Directly supplied:** Maho, paddleboard, relaxed beach time, animals and the Airbnb in this day's photo set.
- **Creator's strongest impression:** **Maho was the family's favorite beach**; calm-ish water, lots of sea turtles, good for children.
- **Previously corroborated firsthand:** Drove from Cruz Bay to Maho, snorkeled with the creator's son, and saw a sea turtle together; beach footage included sea turtles and in-water scenes.
- **Do not assume:** Every animal seen was a turtle or that every wildlife scene was recorded on this exact day; use media review for attribution.
- **Media to locate:** Maho shoreline, paddleboarding, family relaxation, sea turtle underwater material, villa/vista/pool.
- **Candidate places:** `maho-bay` and Oceana Villa / Great Cruz Bay as a separate accommodation/venue reference.
- **Editorial emphasis:** Calm, family-friendly water and the memorable turtle encounter, without suggesting guaranteed wildlife sightings for visitors.

### Day 3 — Boat Day

**Proposed Post 1:** Nate's Custom Charters → Hermit Crab Island → Lovango (lunch and relaxation) → Coastal houses/views.

- **Directly confirmed by creator:** Boat excursion with **Nate's Custom Charters**. The captain was amazing, funny, and played music; the creator's memorable advice is **"Hope you like music."** Keep the personal tone without inventing the captain's name or details of his playlist.
- **Confirmed itinerary stops:** **Hermit Crab Island** and **Lovango**, with lunch and time to relax at Lovango.
- **Previously supplied:** Photographs of houses / residences associated with the boat day. Whether these were shoreline views or a specific residential stop remains unverified.
- **Media to locate:** Charter vessel/captain (if photographed), music and onboard atmosphere, Hermit Crab Island, Lovango lunch/relaxation, coastal houses and views, optional video.
- **Unknown:** Exact departure point, route order beyond the creator's list, precise coordinates, restaurant or beach club identity at Lovango, vessel details, and commercial/affiliate relationship.
- **Venue relationship:** Treat Nate's Custom Charters as the **actual excursion operator**, not a sponsor or affiliate unless separately confirmed. Create or reuse a canonical provider record after verifying official identifiers/links.
- **Important:** Lovango is now a **confirmed visit**, overriding the previous suggestion-only classification. Do not infer that the group visited a particular Lovango establishment merely from the island name. Other formerly suggested stops (such as Lime Out and Honeymoon Beach) remain unconfirmed.
- **Candidate story:** `st-john-boat-day` (subject to repository conventions).

### Day 4 — Children Playing and Trunk Bay

**Proposed Post 1:** Kids playing → Trunk Bay.

- **Directly supplied:** Children playing and a visit to Trunk Bay.
- **Previously corroborated firsthand:** Filmed Trunk Bay's rocks, coral, pale sandy underwater scenery, and the creator's wife swimming/diving; existing footage from Maho/Trunk includes family/beach moments.
- **Media to locate:** Family play, beach landscapes, swimming/snorkeling, underwater imagery, a short cinematic video segment if present.
- **Candidate place:** `trunk-bay`.
- **Editorial emphasis:** Children's experience and underwater atmosphere; avoid specific reef/species claims unless visible and verified.

### Day 5 — Cinnamon Bay

**Proposed Post 1:** Cinnamon Bay.

- **Directly supplied:** Visit and photographs of Cinnamon Bay.
- **Creator's impression:** **Cinnamon felt more touristy** than Maho. Present as a subjective firsthand comparison, not a universal ranking.
- **Media to locate:** Beach and scenery, any activities or short clips actually captured.
- **Candidate place:** `cinnamon-bay`.
- **Editorial emphasis:** Contrast with the quieter, family-favorite experience at Maho.

### Day 6 — Waterlemon Cay

**Proposed Post 1:** Waterlemon Cay.

- **Directly supplied:** Visit and photographs.
- **Creator's impression:** **Really cool, but a bit of a trek to get there.**
- **Previously corroborated firsthand:** Treated Waterlemon as a distinct hiking/experience chapter instead of just another generic beach stop.
- **Media to locate:** Approach/hike, landscape, water and snorkeling if actually photographed; video if available.
- **Candidate place:** `waterlemon-cay`.
- **Editorial emphasis:** A more involved excursion and the payoff of reaching the location. Do not invent hike distance, trailhead, conditions, or whether snorkeling occurred on this day.

### Day 7 — Departure

**Proposed Post 1:** Departure day.

- **Directly supplied:** Departure day with photographs.
- **Unknown:** Exact outbound ferry/flight order, departure locations, time, and activities.
- **Media to locate:** Final island moments, transit, farewell scene.
- **Editorial emphasis:** A short visual closing chapter; don't force a full standalone experience if the media works better as an epilogue.

## 4. Proposed Atlas model (not instructions to alter code now)

**Journey:** One canonical St. John journey with ordered visit/day records. Match the existing journey ID instead of blindly inserting `usvi-st-john-2025`.

**Places:** Cruz Bay, Maho Bay, Trunk Bay, Cinnamon Bay, Waterlemon Cay, and Great Cruz Bay / Oceana Villa where appropriate. Reuse existing geographic identities. **Boat Day** is an *experience*, not an invented geographic location; associate it with confirmed Hermit Crab Island and Lovango stops after resolving their canonical geographic identities, plus Nate's Custom Charters as its operator. **Arrival** and **Departure** can be journal chapters rather than pins.

**Experience/story grouping options:**

- `st-john-arrival` — travel and first impressions.
- `st-john-maho-family-day` — family, sea turtles, paddleboarding and relaxation.
- `st-john-boat-day` — coastal excursion, with route to be verified.
- `st-john-beaches` — optionally combine Trunk and Cinnamon with Maho as linked chapters instead of separate story pages.
- `st-john-waterlemon-excursion` — independent walk/outing.
- `st-john-villa-stay` — optional accommodation context or venue profile.
- `st-john-departure` — optional epilogue.

These are **candidate story IDs**, not orders to create each entity. Avoid duplicating pins or requiring a dedicated post/page for every day. Support direct links and map exploration while reusing the same photos across journey, place, and story via placement records.

### Relationship sketch

```text
Journey: usvi-st-john-2025 (candidate)
  Day 1 → Arrival chapter → Cruz Bay
  Day 2 → Maho family chapter → Maho Bay
        ↘ lodging context → Oceana Villa / Great Cruz Bay
  Day 3 → Nate's Custom Charters boat-day experience
        ├─ Hermit Crab Island (confirmed stop)
        └─ Lovango (confirmed lunch and relaxation; specific venue unverified)
  Day 4 → Family + Trunk chapter → Trunk Bay
  Day 5 → Cinnamon chapter → Cinnamon Bay
  Day 6 → Waterlemon excursion → Waterlemon Cay
  Day 7 → Departure epilogue → no new pin required
```

## 5. Media integration and automation contract

**The creator has photos for every day and approximately 2–3 videos.** This document establishes *editorial destinations*, not asset identities or URLs.

1. Confirm the canonical journey/place IDs against the actual current repository.
2. Seed or reconcile journey/day/experience **metadata** from this Markdown, using only confirmed statements and leaving missing details null.
3. Make canonical destinations available to the Lightroom Publish Service's collection mapping manifest.
4. In Lightroom, assign an entire Publish Collection to the appropriate journey/place/optional experience **once**; subsequent photos inherit the mapping.
5. Lightroom publisher exports, local processor extracts safe metadata and produces optimized renditions, then uploads to R2. Maintain stable asset IDs and revisions on republish.
6. The pipeline emits a validated publication manifest with asset IDs and associations; the Atlas ingestor upserts canonical media and placements without editing narratives or carefully chosen hero/order overrides.
7. The ingestor automatically commits generated content to GitHub; CI validates and deploys via GitHub Pages. Track Accepted, Committed and Deployed separately.
8. Atlas selectors assemble the new media under the relevant journey, place and experience; no manual `gallery` URL arrays, filename management or routine commits.
9. Video clips from Resolve can use the same media/manifest contract with verified delivery properties, but don't falsely attribute per-shot camera details.
10. Publishing a photograph should not automatically publish private family material; retain an explicit photographer-controlled Publish action and an optional review/visibility state.

**Human work that remains:** choose/adjust creative edits, select which images can be public, optionally choose story hero and narrative. The system should avoid demanding one-by-one mapping, keyword re-entry, or app maintenance.

## 6. Content notes and voice

- **Maho:** favorite; accessible-feeling, calm-ish water, sea turtles, memorable snorkeling with a child; describe personally, not as a promise to other travelers.
- **Cinnamon:** a more touristy impression than Maho. Do not fabricate crowds, facilities or prices.
- **Waterlemon:** rewarding but required a trek. Do not invent trail stats.
- **Trunk:** family/children and striking underwater imagery.
- **Boat Day:** Nate's Custom Charters; a funny, music-loving captain, Hermit Crab Island and a laid-back lunch/relaxation stop at Lovango. This is a strong personality-led micro-story, not just boat scenery. Avoid inventing the exact route or named restaurant.
- **Villa:** home base with broad bay views and pool; avoid sounding like paid lodging promotion.
- **Narrative arc:** arrival → relaxed family discovery → boat day → beach exploration → more effortful Waterlemon outing → departure. The seven social posts can feed an enduring Atlas journey without forcing seven separate full stories.

## 7. Verification / open items

| Item | Current status | Resolution source |
|---|---|---|
| Exact calendar dates and year | **Year 2025 creator-confirmed; exact dates remain unknown** | Lightroom capture dates, booking/travel records |
| Seven days versus older five-day recollection | **Editorial seven-day outline wins for grouping; factual length unresolved** | Lightroom dates and itinerary |
| Boat day labeled Day 3 versus earlier “day six” recollection | **Conflicting recollections** | Image dates, booking/charter confirmation |
| Oceana vs Oceania name | **Oceana in newest user-supplied property description** | Actual listing or booking |
| Villa amenities and distance | **Provided from descriptive property copy** | Current official listing if publicly asserted |
| Ferry sunset arrival | **Previously stated firsthand, date unverified** | Source photo/video timestamps |
| Exact Maho turtle imagery, paddling, animals | **Visit/activity confirmed broadly; assign per-file only after review** | Lightroom collections / footage |
| Boat operator | **Nate's Custom Charters — creator confirmed** | Verify official business listing/link before public outbound links |
| Boat stops | **Hermit Crab Island and Lovango confirmed**; exact route order/coordinates unverified | Lightroom timestamps, creator notes, operator itinerary |
| Lovango venue | **Lunch and relaxation confirmed; restaurant/beach club not identified** | Booking/receipts, creator confirmation |
| Captain identity/music details | **Funny captain and strong music presence confirmed; name and playlist unknown** | Creator confirmation / media |
| Exact Waterlemon trail details | **Unknown** | Trip notes / trustworthy location evidence |
| Three videos | **Inventoried in R2 and linked to arrival/ferry, boat day and Waterlemon chapters** | Canonical Media registry and creator-supplied object keys |
| Daily photo sets | **Creator says photos will follow; not yet inventoried** | Lightroom catalog and media files |
| Coordinates, links, affiliate arrangements | **Not supplied** | Canonical registry / verified sources only |

## 8. Instructions for an AI coding agent

**Planning / read-only pass first. Do not change repository content automatically from this brief.**

- Read this document and the project's master architecture first; inspect the **current** repository and canonical models rather than relying on stale instructions mentioning `trips.js` or `atlasData.js` as sources of truth.
- Report existing journey/place/story entities that match these seven day groups; show missing or conflicting canonical IDs and status.
- Propose only the minimal new canonical records needed, preserving existing journey facts, places, hero picks, galleries, visits and publication URLs.
- Treat the user's current seven-day grouping as the creative outline. Surface date/boat-day discrepancies rather than guessing. The Day 3 charter operator and stops (Nate's Custom Charters, Hermit Crab Island, Lovango) are now creator-confirmed; do not revert them to speculative suggestions.
- Distinguish **confirmed firsthand experience**, **listing claims**, **previous firsthand recollection**, and **editorial suggestion** in proposed data.
- Describe how Lightroom collection mappings and eventual media publication manifests will attach photographs to this journey without editing source code by hand.
- After review/authorization, implement additive changes with tests; do not create fictitious media records or URLs and do not publish sensitive family/source metadata.

**Definition of successful ingestion:** The Atlas has one reliable St. John journey and verified geographic/story links, can accept Lightroom-published media automatically via canonical placements, supports a richer evolving travel story, and requires no ongoing asset-path bookkeeping.
