---
id: miami-trip-content-ingestion
title: Miami Winter Getaway — Trip Content Ingestion Brief
kind: content-input
status: proposed
implementation_state: not-started
created: 2026-11-14
updated: 2026-11-14
related:
  - content-model
  - media-pipeline
  - journey-media-ingestion
verification:
  state: unverified
  evidence: []
---

# Roam With Justin — Miami Winter Getaway: Complete Trip Ingestion Brief

**Document type:** Creator-supplied travel recollections and planning input for AI-assisted Atlas content ingestion  
**Status:** Planning/content context; **do not publish assets or mutate application data from this document alone**  
**Destination:** Miami / Miami Beach and nearby Everglades, Florida  
**Season:** January, shortly after Christmas; **exact dates and year not supplied**  
**Travel party:** Creator and family, including a five-year-old son during this trip  
**Origin:** Short flight from the Atlanta area; exact airport/itinerary not supplied  
**Proposed journey ID:** `miami-winter-getaway` (**illustrative only; resolve against actual registry**)  
**Media inventory:** Unknown. Locate photographs and any video before making asset associations.

## 1. Purpose and ingestion constraints

This is the complete combined handoff for the creator's Miami trip, incorporating **South Beach, South Pointe, the Savoy Hotel pool/beach afternoon, an Everglades airboat outing and Shark Valley cycling, and Oleta River State Park kayaking through mangroves with an island raccoon encounter**. It supersedes earlier partial Miami recollection drafts as an editorial source, but does not override canonical repository data.

Use this document to **propose** journey chapters, verified place associations and experience/story records. Reuse the current canonical Journeys, Places, Media and Experiences models and their IDs. Check `docs/README.md`, relevant architecture/implementation docs and actual source code before generating records. Do not reintroduce legacy arrays or bypass the publication-manifest and media-ingestion flow. Keep narrative/editorial placements separate from physical media identity. Do not invent dates, camera equipment, photographic evidence, coordinates, exact routes, commercial relationships, affiliate links or venue URLs.

### Evidence labels

- **Creator-confirmed:** A firsthand visit, activity or subjective impression stated in the notes below.
- **Creator-uncertain:** Stated with uncertainty, requiring confirmation before a named factual claim.
- **Editorial suggestion:** Proposed structure, wording or grouping, not a separate trip fact.
- **External verification needed:** Venue/operator identity, current operational details, official park designation or safety/practical advice intended as general guidance.

**Chronology note:** The creator explicitly identifies the arrival as Day 1, continuing South Beach/South Pointe and beach time on Day 2, then an Everglades day afterward. The exact day of the Savoy visit, dinners, sunrise, and **Oleta outing** is not fully pinned down. The document groups experiences editorially rather than pretending to know the exact itinerary.

## 2. The journey in the creator's own terms

This was a relatively quick January escape from the Atlanta winter, a short flight away but a welcome shift before the return to ordinary routines after Christmas. Miami surprised with a daily rhythm: mornings could be cool, possibly damp, but by midmorning the sun was intense enough to make the water appealing. South Beach had that unmistakable, cinematic “Miami Vice” feeling: iconic restaurants and storefronts made the streets seem almost like a movie set, except for the very real tourists—including the creator.

The getaway mixed classic Miami beach time with more unexpected experiences: an almost-private boutique-hotel pool afternoon; airboats skimming the Everglades; cycling beside resting alligators at Shark Valley; and paddling kayaks through mangroves at Oleta River State Park to encounter raccoons on an island. The unifying story is the **contrast between familiar Miami imagery and the surprising amount of outdoor adventure within reach of the city**.

### Storytelling anchor

**Possible thematic hook:** *We came for a little January sun. Miami gave us beaches, gators, mangroves—and more adventure than we expected.*

Write from moments and felt experience, not a checklist of attractions. Preserve the creator's amused appreciation of the slightly surreal: South Beach as a film set, gators uncomfortably close to a family bike ride, and a raccoon island reached by kayak. Avoid invented sensory details or an overdramatic danger narrative.

## 3. Stops and experiences, in approximately chronological order

### Day 1 — Arrival and first walk through South Beach

**Suggested chapter:** `miami-arrival-south-beach` (candidate ID only)

- **Creator-confirmed:** Arrived by airplane, checked into an Airbnb and immediately headed out to walk South Beach.
- **Creator-confirmed impression:** January was beautiful, with cooler mornings that could sometimes feel wet, then bright/hot sunshine by midmorning.
- **Creator-confirmed impression:** Distinctive storefronts, restaurants and architecture evoked a *Miami Vice* / movie-set atmosphere, punctuated by the many tourists, creator included.
- **Media to locate:** Arrival/transit if photographed, Airbnb exterior or general home-base context if suitable for publication, Ocean Drive/South Beach storefronts, streetscape and beach/walking photographs, day-to-evening visual transitions where recorded.
- **Candidate canonical geography:** `south-beach`, `miami-beach` — resolve existing IDs before adding anything.
- **Editorial focus:** The immediate feeling of being transported from post-Christmas routine into the cinematic visual language of Miami.
- **Do not assume:** Airbnb name/address, precise route walked, the weather on a particular calendar date, or photographs from arrival transit.

### Day 2 / recurring mornings — Beach time, South Pointe and solo sunrise

**Suggested chapter:** `miami-south-pointe-and-beach` (candidate ID only)

- **Creator-confirmed:** Walks along South Beach; visited South Pointe Park and pier looking for sharks and other sea life.
- **Creator-confirmed:** Went out solo to catch a sunrise.
- **Creator-confirmed:** Much of the trip consisted of relaxing beach time; January water was cool but not too cold for the family visiting from the Atlanta area to enjoy.
- **Media to locate:** Dawn colors/sunrise and shoreline, pier and park, sea views, beach/family moments, visible marine wildlife **only if actually photographed and identified**.
- **Candidate places:** South Pointe Park; South Pointe Pier; South Beach.
- **Editorial focus:** The rhythm between cool, quieter mornings and sunshine inviting everyone into the water.
- **Important nuance:** **Looking for sharks is not proof of spotting sharks.** Do not claim a sighting or identify marine species without confirmation.
- **Timing:** Sunrise and South Pointe visits occurred during the trip; do not force them into the same exact day without media/time evidence.

### During the Miami Beach stay — Savoy Hotel pool and beach afternoon

**Suggested chapter:** `miami-savoy-pool-afternoon` (candidate ID only)

- **Creator-confirmed:** Visited the Savoy hotel for an afternoon using a pool pass and beach pass.
- **Creator-confirmed impressions:** Beautiful property, great drinks and atmosphere, true boutique feeling with the class of an upscale resort; the group nearly had the pool to itself.
- **Creator-confirmed:** Also spent time at the beach and enjoyed the cool-but-swimmable January water.
- **Creator-confirmed:** Dined along South Beach during the stay; exact restaurants and dinner dates not specified.
- **Media to locate:** Savoy exterior/interiors or pool as permitted, drinks, architecture/details, empty-feeling pool, beach access/shore, dinner atmosphere if photographed.
- **Provider/venue:** The Savoy hotel; verify exact official property name and link before publishing commercial or booking information.
- **Editorial focus:** A peaceful, unexpectedly intimate pause in a bustling beach destination.
- **Do not assume:** The hotel was the overnight accommodation, any current day-pass availability/pricing, a brand partnership, sponsorship, or the identities of dinner venues.

### Next outing — Everglades airboat experience

**Suggested chapter:** `miami-everglades-airboat` (candidate ID only)

- **Creator-confirmed:** Took a trip to the Everglades; described it memorably as **“bikes, gators and airboats.”**
- **Creator-confirmed:** Airboat guide was engaging and shared lesser-known information about native alligators. They came within inches of alligators while on the tour, according to the creator's recollection.
- **Creator-confirmed:** The creator's son loved the ride; memorable wind in their faces before the stronger afternoon heat arrived.
- **Creator's appraisal:** Would definitely do the airboat outing again.
- **Creator-uncertain operator:** *“Tiger Airboats,”* believed to be just past the main road near the Shark Valley Tram Road. **Do not publish that identification or assign an operator link until independently verified with photos/receipts/booking.**
- **Media to locate:** Airboat, guide and interpretive experience, water/sawgrass, alligator sightings, family expressions, footage conveying motion/wind if available.
- **Canonical geography:** Everglades National Park / relevant nearby access point **only after route/operator jurisdiction verified**. An airboat tour near the park is not necessarily *inside* the national park.
- **Editorial focus:** Thrill, proximity to wildlife and the family sharing an unexpectedly memorable ride.
- **Do not assume:** Species names beyond alligator, operator identity, exact physical distance objectively measured, exact tour route or legal park boundary.

### Same Everglades excursion or a return visit — Shark Valley cycling

**Suggested chapter:** `miami-shark-valley-cycling` (candidate ID only)

- **Creator-confirmed:** Returned to the Shark Valley area and rented bikes, riding the path alongside resting alligators, at times closer than expected.
- **Creator-confirmed:** A few tense moments with the five-year-old, but everyone finished safely. Keep this light and truthful; don't invent dangerous actions or incidents.
- **Creator-confirmed:** Heat built during the day and shade was limited, making sun protection and timing important from personal experience.
- **Creator-confirmed at time of visit:** Bike rental was straightforward on-site. The smallest available children's bike was reported to be **20 inches**, which was challenging at times for their five-year-old; he persevered.
- **Practical note:** Rental inventory, children's sizing, availability, hours and rules can change; treat as **dated firsthand experience**, not a current guaranteed minimum. Verify current official conditions if writing a visitor guide.
- **Media to locate:** Bikes/path, environmental views, alligators resting near path, family cycling where appropriate, signs/visitor center if captured.
- **Candidate place:** Shark Valley (Everglades National Park); distinguish the park's Shark Valley path/tram area from the separate airboat operator.
- **Editorial focus:** Beautifully ordinary cycling made extraordinary by wild alligators nearby; a family adventure with the sun as a serious consideration.
- **Do not assume:** Exact bike route, rental provider beyond the creator's reported on-site rental, hike/cycle distance, trail conditions on future dates.

### Separate outing, day unconfirmed — Oleta River State Park kayaking and raccoon island

**Suggested chapter:** `miami-oleta-mangrove-kayaking` (candidate ID only)

- **Creator-confirmed:** Visited **Oleta River State Park**, in the wider Miami area, and rented kayaks.
- **Creator-confirmed:** Paddled through mangroves and encountered raccoons on a local island; a memorable, slightly strange adventure.
- **Creator's appraisal:** Worth doing if visitors have enough time.
- **Creator's characterization:** Called Oleta the largest park in the state and “directly in the middle of Miami.” **Do not publish those geographic/superlative claims as facts without verification.** Oleta is commonly described as Florida's largest **urban** state park, not necessarily its largest state park overall; verify the official designation if used in published copy.
- **Media to locate:** Rental kayaks, launch point, mangrove waterways, island approach, raccoons **if photographed**, family paddling, return journey, ambient video.
- **Candidate place:** Oleta River State Park; if the island has a verified named geographic identity, associate it separately **only after confirmation**. Do not fabricate a “Raccoon Island” official place/pin solely from an anecdotal name.
- **Editorial focus:** A striking contrast: from Miami's neon-and-beach stereotypes to quiet, enclosed mangrove water and a bizarre wildlife encounter.
- **Safety/editorial note:** **“Made friends” is figurative**; do not imply touching, feeding, approaching or encouraging interaction with wild raccoons. Do not encourage wildlife feeding.
- **Timing:** Day/date is not specified. Keep Oleta as a distinct trip chapter, **not a fabricated Day 4/5 entry**.

### Departure — return to regular life

- **Creator-confirmed:** This was a short getaway before returning to regular life after Christmas.
- **Not supplied:** Exact departure day, flight details, closing scenes, or whether anything happened on departure morning.
- **Editorial suggestion:** Use the contrast between warm Miami adventure and normal routine as a journey epilogue; a separate departure gallery is not required.

## 4. Proposed Atlas content model

**Journey:** One canonical Miami winter getaway (resolve ID and year from live repository; do not create a duplicate).

**Potential place entities (resolve/reuse first):**

1. Miami Beach / South Beach — broad destination context.
2. South Pointe Park and South Pointe Pier — location/detail level as appropriate for existing geo model.
3. The Savoy hotel — verified venue/provider reference, not proof of paid relationship.
4. Everglades / Shark Valley — separate geography from an airboat operator not yet confirmed.
5. Oleta River State Park — separate kayaking place; optional island location only after verification.

**Candidate experience/story IDs:**

- `miami-arrival-south-beach`
- `miami-south-pointe-and-beach`
- `miami-savoy-pool-afternoon`
- `miami-everglades-airboat`
- `miami-shark-valley-cycling`
- `miami-oleta-mangrove-kayaking`

These IDs and groupings are proposals, **not commands to create six map pins**. Several experiences can share a parent place and a journey can present chapters without geographic pins. Restaurant details and the Airbnb remain unregistered until identified.

### Relationship sketch

```text
Journey: Miami winter getaway (canonical ID TBD)
├── South Beach arrival / atmospheric walking chapter
│   └── Miami Beach / South Beach
├── Beach mornings and solo sunrise
│   └── South Pointe Park / Pier; South Beach
├── Savoy afternoon pool + beach-pass experience
│   └── Savoy Hotel (name/link to verify)
├── Everglades airboat experience
│   └── Operator uncertain ("Tiger Airboats" to verify)
├── Shark Valley family cycling experience
│   └── Shark Valley, Everglades
├── Oleta mangrove kayaking / raccoon encounter
│   └── Oleta River State Park (island name unverified)
└── Short-getaway return / editorial epilogue
```

## 5. Media, video, equipment and commercial linking

This brief **does not identify or publish media assets**. Existing `media:prepare` → R2 upload → verified `media:ingest` is the technical publication path; canonical Media/placement records supply stable asset IDs, URLs, revisions, dimensions, rights and associations. This document supplies only candidate narrative destinations.

1. Inventory and creator-approve Miami photos and videos; exclude private family material unless intended for publication.
2. Resolve the existing canonical Miami Journey. Do not derive or create identity solely from a tag or filename.
3. Publish selected media with validated journey association. Unassigned photos may appear in the journey's **All Photography** collection without a fake Place claim.
4. Add optional experience/place placements later without duplicating the media asset or re-uploading unchanged bytes.
5. Preserve explicitly chosen heroes, curated gallery order and editorial copy; automated ingestion must not overwrite them.
6. If video exists, use the canonical Media model with duration/resolution/codec, poster/previews and playback variants as supported by the current pipeline. **Do not assert footage exists simply because the experience is cinematic.**
7. Gear, camera/lens, kayak rental and bicycle equipment can be enriched later through verified EXIF and/or creator-supplied gear usage records. **Rented kayaks and bikes are activities, not automatically verified branded Gear products or affiliate links.**
8. Associate the Savoy and any confirmed airboat/rental providers using the existing provider/partner model. An editorial mention does not establish affiliation or sponsorship.
9. Only use verified outward-bound official URLs. If configured, generic `partner_click` / `gear_outbound_click` analytics can attribute future referrals without per-business custom events.

## 6. Suggested editorial arcs and micro-stories

**Arc A — Miami as a movie set:** Arrival → South Beach storefronts and iconic architecture → realization that the stage is full of actual tourists (including us). Visual hook: recognizable Miami atmosphere.

**Arc B — Winter, but make it a beach day:** Cool dawn → quiet solo sunrise → warm beach/pool afternoon at the Savoy → January Atlantic water that Atlantans could still enjoy. Emotional hook: escaping the ordinary in small doses.

**Arc C — Bikes, gators, airboats:** Wind, humor/learning with the guide, son delighted → then quiet, slightly unnerving bike encounters along Shark Valley → hot exposed afternoon. Emotional hook: a family adventure that doesn't feel like a conventional beach holiday.

**Arc D — The other side of Miami:** Kayaks slip into mangroves → unexpected raccoons on an island → “strange, but worth it.” Emotional hook: discovery where you least expected it.

**Journey-wide conclusion:** A short, easy flight from Atlanta delivered a stronger sense of adventure than the length of the getaway suggested. Do not invent a dramatic climax or moral beyond what the creator expressed.

## 7. Practical observations: personal experience versus current guidance

| Topic | Creator's experience | Publishing caution |
|---|---|---|
| January weather | Cool, potentially damp mornings; strong sun by midmorning | Not a forecast or climate guarantee |
| January ocean | Cool but enjoyable for this Atlanta-area family | Subjective, variable by day |
| Savoy pool/beach pass | Used for an afternoon, nearly private pool | Verify current availability, terms, property identity and prices |
| Shark Valley heat | Strong midday sun and limited shade | Sensible firsthand reminder; check official visitor guidance |
| Children's bike sizes | 20-inch smallest available during their visit | Inventory/policies may change; do not guarantee size today |
| Airboat operator | “Tiger Airboats,” uncertain | Confirm actual business and jurisdiction before linking |
| Airboat proximity to gators | Close encounter remembered | Do not imply guests should approach wildlife |
| South Pointe sharks | Looked for sharks/sea life | No confirmed shark sighting |
| Oleta raccoons | Saw raccoons on an island | Do not encourage feeding/contact or invent island name |
| Oleta superlative | “Largest park in the state,” creator recollection | Verify; likely reference to largest **urban** state park |

## 8. Open questions / verification queue

| Field | Known so far | How to resolve |
|---|---|---|
| Exact year, dates, trip duration | January after Christmas, unspecified year | Booking/travel records, image timestamps |
| Actual canonical journey ID | Unknown | Existing Journeys registry |
| Airbnb details | Used as accommodation; no name/address | Creator confirmation; omit private address |
| Day-by-day order beyond first days | Approximate | Photo timestamps, trip notes |
| Solo sunrise location/date | South Beach-area trip, exact point unknown | Photo metadata/creator |
| Marine-life sightings | Searched at South Pointe; no species confirmed | Photos/creator |
| Savoy exact property name | “Savoy hotel” | Confirm official venue identity |
| Airboat operator | “Tiger Airboats” uncertain | Booking/receipt/photo/geolocation |
| Everglades tour boundary | Unknown | Operator and route confirmation |
| Shark Valley bike rental details | On-site, 20-inch minimum reported then | Official current provider info |
| Oleta kayaking rental operator | Unknown | Creator/booking/photos |
| Raccoon island official name | Unknown | Maps/trip materials, if relevant |
| Oleta exact day | Unknown | Capture times |
| Photo/video count, capture gear | Unknown | Lightroom/Resolve/media pipeline |
| Affiliate relationships or partner URLs | None confirmed | Explicit approval and verified links |

## 9. Instructions for AI coding/content agent

**First pass: read-only reconciliation.**

1. Read `docs/README.md` and the active Media/Places/Journeys/Experiences architecture. Inspect actual source and content indexes.
2. Find the existing Miami journey and related Places, if any; report ID conflicts, outdated content and missing candidate experience records. Do not blindly add duplicates.
3. Preserve user-confirmed firsthand facts while separating subjective impressions, uncertain operator names and suggestions. Do not infer exact dates from narrative headings.
4. Propose a minimal set of chapters and explicit placement records, preferring reuse of South Beach/park/venue entities rather than one pin per social post.
5. Inventory media from current canonical registry and/or supplied publication manifests; never fabricate image/video URLs, assets, captions, hero choices, revisions or equipment metadata.
6. Confirm whether the application already supports journey-level automatic photography and video playback. Extend through existing shared media pipeline only if authorized.
7. Request confirmation on the uncertain airboat company and any commercial outbound links before asserting identity or creating provider links.
8. Keep Oleta in the plan as a standalone kayaking/mangrove experience even though its exact chronological day is unknown.
9. After explicit implementation authorization, make additive, tested canonical edits and update relevant docs under the documented lifecycle. Keep this document a content-source brief, not a competing database or implemented-architecture claim.

### Definition of successful ingestion

One canonical Miami winter journey connects an atmospheric South Beach arrival, South Pointe sunrise/beach moments, the Savoy afternoon, Everglades airboat and Shark Valley cycling, and the unexpected Oleta mangrove/raccoon encounter. Newly approved photos/videos can be associated through stable Media IDs and existing publication manifests. Unknown specifics remain unknown; curated presentation and private family material are protected. Future gear and referral links can be added without rebuilding the content model.

---

**Source provenance:** All personal travel facts and impressions in this brief come from the creator's two messages describing Miami and the additional Oleta River State Park outing. Architectural workflow reflects the established Roam With Justin ingestion approach. Proposed IDs, chapter groupings and narrative hooks are suggestions only.
