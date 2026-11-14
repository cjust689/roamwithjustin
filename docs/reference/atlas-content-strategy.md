---
id: atlas-content-strategy
title: Living Atlas and Publishing Strategy
kind: reference
status: approved
implementation_state: unknown
updated: 2026-11-14
related:
  - content-model
  - storytelling-framework
supersedes: []
superseded_by: []
code_paths: []
verification:
  state: not-applicable
  evidence: []
---

# Roam With Justin — Living Atlas & Publishing Strategy

**Purpose:** Build a growing, interactive travel atlas that connects each social-media release to a richer, permanent experience on roamwithjustin.com.

**Core principle:** **Every social post has a home in the Atlas. Every Atlas experience offers something beyond the social post.**

## 1. Product vision

Roam With Justin is not intended to be a complete, fixed travel guide for each trip. It is an **evolving visual travel journal**: destinations are established first, then locations, stories, photographs, videos, practical details, and partnerships appear over time.

Visitors should feel that they are exploring a world being gradually revealed, not browsing an encyclopedia that must be completed before launch.

- **Instagram:** discovery and invitation — concise, curated, emotionally engaging visual stories.
- **Atlas:** exploration — map pins, context, connected stories, galleries, moving images, routes, and local details.
- **Archive:** enduring value — permanent, searchable, updateable experience pages.

The Atlas is the canonical home of the material; social platforms distribute introductions to it.

## 2. One publishing workflow, two outputs

Align each Instagram carousel or Reel with a corresponding addition or update to the Atlas.

**Proposed workflow**

1. Select an existing trip or destination (or create a top-level entry if it does not exist).
2. Curate and edit the photos / video for the next social post.
3. Capture the narrative while choosing the media: what happened, how it felt, why the images matter, and any useful practical context.
4. Assemble the Atlas experience: hero image, location, short story, gallery, and optional details.
5. Publish or update the permanent Atlas URL.
6. Publish the social post, pointing to the corresponding experience when appropriate.
7. Enrich the same experience later with extended photos, routes, clips, recommendations, or links.

**Minimum viable Atlas entry:** a title, hero photograph, coordinates or parent location, short narrative, and selected images. Do not require a complete guide, route, gallery, or video before publishing.

### Important distinction: a post is not necessarily a new pin

A single map location can contain several distinct stories. Avoid three overlapping pins simply because three carousels were published from the same place.

Example:

```text
Journey: Europe 2026
  Destination: Morocco / Marrakech
    Place: Medina
      Story: Street Photography
      Story: Architecture
      Story: After Dark
    Place: Agafay Desert
      Story: An Evening at Inara Camp
```

**Publishing 1:1 means each social release maps to an Atlas story or update — not necessarily a new geographical marker.** Some Atlas-only updates are also fine.

## 3. Progressive geography and content depth

The Atlas can be populated from broad to specific, without requiring all media up front.

| Layer | Example | Initial requirement | Can be added later |
| --- | --- | --- | --- |
| Journey | Europe, Summer 2026 | Name, time period, overview | Itinerary, route, reflections |
| Destination | Croatia | Location, hero visual | Destination introduction and collections |
| Place / experience | Split boat excursion | Pin, title, hero visual | Gallery, provider, route, travel notes |
| Story / chapter | Sailing toward Hvar | Short narrative and selected photos | Video, related moments, deeper background |
| Moment / detail | Snorkeling stop | Optional location or media item | Caption, audio, practical tip |

A location may be **visited**, **previewed**, or **published**. A preview should still have meaningful content, not an empty detail panel.

## 4. Visitor experience and return visits

- **Explore map:** start at journey/country/destination level and drill into experiences.
- **Latest discoveries:** chronological feed of newly published stories with links that fly the map to their locations.
- **Recently enriched:** distinguish new stories from older stories with new video, galleries, or useful details.
- **Related nearby stories:** an experience provides natural pathways to other pins, chapters, and destinations.
- **Direct deep links:** an Instagram follower arrives at the exact story, not at a generic map home page.
- **Optional subscriptions later:** digest emails or similar opt-in notifications for newly published discoveries.

Use a subtle **New** indicator for recent material and a limited **Coming Soon** state only where the teaser itself is worth viewing. Do not make the map feel like a to-do list.

## 5. Editorial approach

The Atlas should preserve the personal visual narrative while adding information social platforms cannot comfortably provide.

**Social post:** the strongest 5–10 images or short Reel; a hook and compact emotional arc.

**Atlas story:** the selected visual story, full context, a location or route, useful observations, related experiences, and potentially extra images or video. “More” does not always mean “more photographs.”

Keep the writing lightweight and specific. Example notes to capture during photo selection:

- **What is the story?** One sentence.
- **What did it feel like?** One or two sensory / emotional details.
- **What was surprising or memorable?** One distinctive observation.
- **Where exactly?** Coordinates, venue, or route if appropriate.
- **What would help another traveler?** Booking link, access, timing, caveat, or recommendation, when known.
- **Who was involved?** Guide, operator, venue, collaborators; obtain permission where appropriate.

The editor should be able to publish with partial information and add the rest later.

## 6. Video strategy: Instagram embeds, YouTube, and native clips

### Do Instagram Reel embeds work?

**Yes, for eligible public posts and Reels when embedding is allowed.** They are a convenient way to reuse already-published social content. The embed depends on Instagram's presentation/scripts, a publicly accessible post, and browser/privacy settings. It can fail for users with tracking blockers or when the post or embed permissions change. It also brings Instagram's branded UI into the page. Instagram Stories are not a dependable embed format.

**Best use:** optional “View the original Reel / Instagram post” modules, especially when social context and attribution are useful. Avoid making an Instagram embed the *only* way visitors can experience a key video.

### Is YouTube better?

**Generally yes for longer videos, travel films, ambient sequences, and videos meant to be watched inside the Atlas.** YouTube provides a documented embed player, responsive iframe integration, hosting, streaming quality adaptation, captions, and a format for both horizontal video and Shorts. YouTube embeds still depend on a third party and may show platform branding or ads. Use `youtube-nocookie.com` for the privacy-enhanced player where appropriate; it is not equivalent to hosting videos yourself.

An **unlisted** upload can be embedded without making the video publicly discoverable on the YouTube channel, but it remains accessible to anyone with the link; it is not private or access-controlled.

### What about native / self-hosted video?

For **very short cinematic loops** used as map previews, card motion, or background atmosphere, a small, optimized WebM/MP4 asset hosted with the site or an appropriate media service may offer the cleanest design and greatest control. Use poster images, lazy loading, and muted playback only where useful. Avoid loading many autoplay videos across the map at once. A static-site host such as GitHub Pages is not a good long-term home for a large video library.

### Recommended hybrid approach

| Video purpose | Preferred approach | Why |
| --- | --- | --- |
| Short atmospheric teaser on a map/card | Optimized native clip | Seamless, brand-controlled presentation |
| Full visual story or ambient travel film | YouTube embed | Reliable video delivery and simple integration |
| Existing Instagram Reel | Instagram embed or outbound link | Reuses published social content; provides social proof/context |
| Photo-driven story with no video ready | Hero photograph / gallery | No new production blocker |

**Recommendation:** Build the Atlas content model to support all three video types, but **prioritize YouTube for substantive embedded films, native clips for small decorative motion, and Instagram embeds as a supplemental social layer.** Do not require re-exporting every Reel to YouTube just to launch an experience.

### Video implementation notes

- Store media as typed records rather than raw iframe HTML mixed into narrative text.
- Use thumbnails/posters; load external players only when a visitor opens or plays a video.
- Preserve aspect ratios: 9:16 for most Reels/Shorts; 16:9 for landscape films.
- Keep a fallback link if an external embed fails.
- Test on mobile, including browsers with tracking protection.
- Respect platform embed restrictions, rights, and any music licensing limitations: music permitted in Instagram may not be cleared for YouTube or separately hosted video.

Example media data:

```js
const media = [
  {
    type: "image",
    src: "/images/split/boat-hero.webp",
    alt: "Boat crossing the Adriatic near Split"
  },
  {
    type: "youtube",
    videoId: "YOUTUBE_VIDEO_ID",
    aspectRatio: "16:9"
  },
  {
    type: "instagram",
    url: "https://www.instagram.com/reel/REEL_ID/",
    aspectRatio: "9:16"
  },
  {
    type: "nativeVideo",
    src: "/video/split/sea-loop.mp4",
    poster: "/images/split/sea-loop-poster.webp",
    aspectRatio: "16:9"
  }
]
```

## 7. Suggested content model and implementation

Keep content independent of the MapTiler rendering layer. The map visualizes geography; it should not be the database.

```js
const experience = {
  id: "split-adriatic-boat-day",
  journeyId: "europe-2026",
  destinationId: "split-croatia",
  placeId: "split-boat-excursion",
  slug: "split/a-day-on-the-adriatic",
  title: "A Day on the Adriatic",
  coordinates: [16.4402, 43.5081], // Example city-level position; not an exact tour stop
  status: "published", // visited | preview | published
  traveledAt: "2026-07-06",
  publishedAt: null,
  updatedAt: null,
  heroImage: "/images/split/boat-hero.webp",
  summary: "A short visual story about a day on the water.",
  story: [],
  media: [],
  relatedExperienceIds: [],
  placesAndPartners: [],
  socialPosts: []
}
```

Recommended architecture for the current Vue + MapTiler site:

- Start with structured JSON or Markdown/frontmatter entries checked into the repository; move to a CMS only if editing overhead justifies it.
- Keep **journeys**, **destinations/places**, **stories**, **media**, and **partners** as distinct concepts linked by stable IDs.
- Provide stable, shareable URLs with direct opening of the correct story and map position.
- Keep `traveledAt` separate from `publishedAt` and `updatedAt`.
- Add map clustering / drill-down as pin count grows.
- Make Atlas stories accessible without interacting with the map (mobile, search, accessibility, direct links).
- Consider SEO-friendly prerendering/static generation for story pages if the existing Vue deployment is otherwise client-rendered.

## 8. Partnerships and monetization

Experiences can naturally connect to businesses personally used on the trip: tour operators, stays, restaurants, guides, and activities.

For example, a Split boat story could include a clearly labeled operator information card for Raptor Experience, related photos, an optional booking link, and cross-links to nearby Split stories.

Potential future uses include referrals, affiliate arrangements, sponsored features, licensing inquiries, and portfolio examples. **Clearly disclose paid or affiliate relationships**, and keep editorial value independent of sponsorship.

## 9. Launch priorities

### Phase 1 — Publishable foundation

- Journey and destination overview pages or map states.
- A reusable story/experience component with a permanent URL.
- Hero photo, short narrative, image gallery, location link/pin.
- Latest Discoveries list.
- Content records editable without complex back-end work.

### Phase 2 — Richer exploration

- Related story links and clustering.
- Optional video provider integration (start with YouTube; Instagram where useful).
- Practical location details and partner cards.
- “Recently updated” indicators.

### Phase 3 — Deeper immersion

- Routes, layered moments, short cinematic previews.
- Destination-level collections and editorial sequences.
- Subscriptions/notifications and measured repeat engagement.
- More advanced interactive transitions, if they improve navigation rather than obscure it.

## 10. Success criteria

Measure whether the Atlas actually invites deeper exploration and return visits, not just whether the map looks impressive:

- Social-to-Atlas visits per post.
- Story reads and gallery/video engagement.
- Number of related experiences opened per session.
- Repeat visitors and new-content return visits.
- Time spent producing each paired Instagram + Atlas release.
- Partner-link engagement (where applicable).

**North-star operating principle:** Curation for Instagram should *also* advance the Atlas. Every release makes the underlying world richer, without requiring a full trip to be finished in advance.

## References for video implementation

- Instagram public posts / Reels embedding support (Meta WordPress plugin): https://github.com/facebook/meta-embeds-for-wordpress/blob/main/readme.txt
- Instagram embed requirements (WordPress support): https://wordpress.com/support/instagram/
- YouTube embeds and privacy-enhanced player: https://support.google.com/youtube/answer/171780
