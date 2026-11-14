# Roam With Justin Atlas - Content and Media Architecture

**Status:** All existing Trip and Atlas content migrated to canonical Media, Places and Journeys
**Application:** Vue 2, static GitHub Pages deployment, Cloudflare R2 media delivery
**Immediate objective:** Add future content directly to canonical modules without restoring legacy authorities

## Executive decision

Roam With Justin uses three authoritative content domains:

| Domain   | Owns                                                                                                            | Does not own                                           |
| -------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Media    | File identity, delivery location, R2 object keys, formats, renditions, intrinsic metadata, ownership and rights | Story-specific captions, crop choices, itinerary order |
| Places   | Canonical place identity, name, coordinates, geographic hierarchy and stable place information                  | Visit dates, personal notes, route order               |
| Journeys | A particular trip or visit, dates, ordered stops, day-by-day itinerary, lodging and visit-specific observations | Canonical geography or physical file storage           |

Experiences are a planned fourth domain, but they are not required for the foundation. An Experience will eventually represent a publishable story that can span places, visits, media and social posts.

The Atlas and Trips are not additional sources of truth:

- The Atlas is a geographic projection of Places, enriched by Journey visits and media usages.
- Trips are chronological projections of Journeys, enriched by Places and media usages.
- Selectors produce the view models expected by the existing Vue components.

The application will remain static. Plain JavaScript modules, small selectors and build-time validation are sufficient. This architecture does not require a database, backend API, CMS, generic repository framework or class hierarchy.

## Relationship to the other context documents

This README owns the content boundaries and migration architecture. The other files in `codex-context/` provide constraints or future plans; they do not create competing sources of truth.

| Document                                                 | How this implementation uses it                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `roam_with_justin_travel_context.md`                     | Supplies evidence and confidence boundaries. Unknown visit dates, districts and viewpoints remain `null` or explicitly unverified rather than being inferred. It also establishes the canonical Journey ID `utah-winter-2025`.       |
| `Roam_With_Justin_Atlas_R2_Video_README.md`              | Supplies delivery behavior: poster-first video, native controls, `playsinline`, metadata preload, byte-range-friendly R2 delivery and no autoplaying map media. R2 object identity still belongs to Media.                           |
| `Roam_With_Justin_Video_Metadata_Pipeline_README.md`     | Defines a later ffprobe/ExifTool and sidecar workflow. Delivery metadata, capture metadata and confirmed gear may enrich the same Media record; the pipeline must not create a parallel video catalog or relax Atlas playback rules. |
| `Roam_With_Justin_Atlas_Content_Strategy.md`             | Guides the future Experience domain and progressive publishing. It does not move story ownership into Atlas nodes or Vue components.                                                                                                 |
| `roam_with_justin_monetization_adsense_codex_brief.md`   | Keeps advertising out of immersive Atlas and media experiences. Monetization work must not alter these canonical content records.                                                                                                    |
| `Roam_With_Justin_Photo_EXIF_Gear_Integration_README.md` | May enrich Media capture and gear metadata later. EXIF ingestion must propose or update Media records rather than create a parallel asset catalog.                                                                                   |

When documents overlap, use this order of authority: verified first-party travel evidence for facts, this architecture for data ownership, then delivery or publishing documents for presentation and workflow. Never promote a plausible detail to a confirmed fact merely because a UI requires a value.

## Why the architecture changed

Before migration, the repository described overlapping content independently in `src/data/trips.js` and `src/features/atlas/data/atlasData.js`. Both legacy files have now been removed.

Pre-migration audit facts:

- trips.js contains 92 unique local image references.
- atlasData.js contains 28 unique local image references.
- All 28 Atlas images are also referenced by trips.js.
- trips.js contains 32 trip/location IDs and Atlas contains 10 node IDs, but only six IDs match exactly.
- Equivalent places already use inconsistent IDs:
  - arches and arches-national-park
  - canyonlands and canyonlands-national-park
  - gozalandia and gozalandia-falls
- The Fairmont image reference points to a local file that does not currently exist.
- Media handling is duplicated:
  - AtlasDetailPanel normalizes strings and typed video objects.
  - AtlasMap separately decides whether to display a poster or source.
  - HeroCarousel and LocationModal expect raw image path strings.
- Atlas childIds currently carry both hierarchy and visit-order responsibilities.

Centralizing only file paths would solve media delivery duplication while leaving place identity, route order and editorial context duplicated. The source-of-truth model must therefore include Media, Places and Journeys together.

## Architectural principles

### One fact has one authoritative owner

- A file path or R2 key belongs to Media.
- Coordinates belong to Places.
- A February 2025 observation belongs to the Utah 2025 Journey visit.
- A caption, crop or display role belongs to the usage of an asset in a particular context.
- Route order belongs to a Journey, not to a Place hierarchy.

### Identity and presentation are separate

A media asset is reusable. Its use on a page can vary.

The same photograph may be:

- a Journey hero,
- an Atlas thumbnail,
- the third gallery item in an Experience,
- or a background image with a different focal point.

The media record must not contain every presentation decision. Context-specific fields belong in a media usage reference.

### Migration is incremental, but authority is unambiguous

Legacy strings and existing component shapes may remain temporarily. Once a specific place or asset is migrated, its canonical record becomes authoritative and its legacy duplicate must not continue to be edited independently.

### Validation is part of the architecture

Validation begins with the foundation. It is not deferred until after a bulk migration. Invalid IDs, missing files and broken relationships must fail before deployment.

## Domain model

### 1. Media

A media record describes a controlled asset and how it can be delivered.

Example image:

    {
      id: "utah-canyonlands-hero-001",
      kind: "image",
      source: {
        provider: "local",
        path: "/img/locations/utah/locations/utah-canyonlands.jpg"
      },
      intrinsic: {
        mimeType: "image/jpeg",
        width: 2560,
        height: 1707
      },
      rights: {
        owner: "roam-with-justin",
        status: "owned"
      },
      capture: {
        placeId: "canyonlands-national-park",
        capturedAt: null
      },
      defaultAlt: "Layered canyon landscape at Canyonlands National Park"
    }

Example R2 video:

    {
      id: "utah-canyonlands-video-001",
      kind: "video",
      source: {
        provider: "r2",
        objectKey:
          "videos/usa/utah/canyonlands/canyonlands_1.mp4"
      },
      intrinsic: {
        mimeType: "video/mp4",
        durationSeconds: null,
        width: null,
        height: null
      },
      posterAssetId: "utah-canyonlands-hero-001",
      rights: {
        owner: "roam-with-justin",
        status: "owned"
      },
      capture: {
        placeId: "canyonlands-national-park",
        capturedAt: null
      }
    }

Use arrays of records composed by a registry helper rather than a single object literal keyed by ID. An object literal can silently replace duplicate keys before validation sees them. The registry builder must reject duplicate IDs and duplicate controlled object keys.

The current content volume already warrants destination modules:

    src/content/media/
      shared.mjs
      utah.mjs
      puerto-rico.mjs
      index.mjs

The index composes modules and exposes a single lookup API.

### Media usage

Presentation belongs at the point of use:

    {
      assetId: "utah-canyonlands-hero-001",
      role: "hero",
      caption: "Winter weather moving across the canyon landscape",
      alt: "Snow clouds moving across the Canyonlands landscape",
      focalPoint: {
        x: 0.55,
        y: 0.4
      }
    }

Recommended usage fields:

- assetId: required canonical media reference.
- role: hero, thumbnail, gallery, poster, background or another constrained role.
- caption: optional editorial text.
- alt: optional contextual override of the media default.
- focalPoint: optional normalized x/y coordinates for responsive cropping.
- order: normally implied by array position; use an explicit value only when needed.

### Renditions

Only register renditions that actually exist.

    {
      id: "utah-canyonlands-video-002",
      kind: "video",
      source: {
        provider: "r2"
      },
      renditions: {
        default: {
          objectKey:
            "videos/usa/utah/canyonlands/canyonlands-002-1080p.mp4",
          mimeType: "video/mp4",
          width: 1920,
          height: 1080
        },
        mobile: {
          objectKey:
            "videos/usa/utah/canyonlands/canyonlands-002-720p.mp4",
          mimeType: "video/mp4",
          width: 1280,
          height: 720
        }
      },
      posterAssetId: "utah-canyonlands-video-002-poster"
    }

Do not generate imaginary variant URLs from naming conventions.

### External media and social links

Instagram, YouTube and third-party pages are references to external systems, not owned physical assets.

Store them as typed external media or social links:

    {
      provider: "instagram",
      kind: "reel",
      url: "https://www.instagram.com/reel/...",
      shortcode: null
    }

Do not pass Instagram or YouTube URLs into a native video element. Provider-specific adapters may render an embed or a normal link fallback.

### 2. Places

A Place is a durable geographic identity.

    {
      id: "canyonlands-national-park",
      name: "Canyonlands National Park",
      coordinates: [-109.8801624, 38.24555783],
      parentPlaceId: "utah",
      countryCode: "US",
      regionCode: "US-UT",
      category: "national-park",
      evidenceStatus: "confirmed",
      coordinatePrecision: "park",
      description:
        "Layered canyons and immense overlooks where fast-changing weather can completely transform the scene.",
      verificationNotes:
        "Do not publish a precise district or viewpoint until verified.",
      externalLinks: {
        official:
          "https://www.nps.gov/cany/index.htm"
      }
    }

Places own:

- canonical ID and name,
- coordinates,
- geographic parent,
- stable categorization,
- stable description,
- official or map links,
- stable place relationships when appropriate.

Places do not own:

- the date Justin visited,
- visit order,
- weather during a particular visit,
- personal notes from a trip,
- lodging,
- a Journey-specific hero or gallery.

### Canonical ID policy

Canonical IDs must be selected before migration.

Rules:

- Use lowercase ASCII kebab-case.
- Prefer the recognizable complete place name.
- Keep IDs stable after publication.
- Do not encode visit dates into Place IDs.
- Do not use the same field for a public route slug and an internal Journey identity when they represent different concepts.

Initial aliases preserve current references:

    export const placeAliases = {
      arches: "arches-national-park",
      canyonlands: "canyonlands-national-park",
      gozalandia: "gozalandia-falls"
    }

Aliases are migration tools. New content must use canonical IDs, and validation must reject alias collisions or alias chains.

### Geographic hierarchy versus journey order

Place parentage and travel sequence are separate.

- parentPlaceId answers: "Where is this place geographically?"
- Journey visit order answers: "Where did this trip go next?"

Atlas map paths must use ordered Journey visits. They must not infer route order from Place children.

### 3. Journeys

A Journey represents one time-bounded trip or visit.

    {
      id: "utah-winter-2025",
      slug: "utah",
      title: "Utah Winter Road Trip",
      evidenceStatus: "confirmed",
      dateRange: {
        start: null,
        end: null,
        label: "February 2025"
      },
      visits: [
        {
          id: "utah-winter-2025-canyonlands",
          placeId: "canyonlands-national-park",
          date: null,
          visitStatus: "visited",
          evidenceStatus: "confirmed",
          migrated: true,
          summary:
            "We experienced sunshine, rain and snow during one visit.",
          verificationNotes:
            "Keep the date and exact district or viewpoint unset until verified.",
          hero: {
            assetId: "utah-canyonlands-hero-001",
            role: "hero",
            focalPoint: {
              x: 0.5,
              y: 0.48
            }
          },
          media: [
            {
              assetId: "utah-canyonlands-gallery-001",
              role: "gallery"
            },
            {
              assetId: "utah-canyonlands-video-001",
              role: "gallery"
            }
          ]
        }
      ],
      days: [],
      lodging: [],
      tips: [],
      travelNotes: []
    }

The visits array is ordered and becomes the authoritative journey path. A day itinerary can reference visit IDs or canonical Place IDs depending on whether it needs visit-specific detail.

Public compatibility preserves the existing `/trips/utah` route while the canonical Journey ID is `utah-winter-2025`.

### 4. Experiences - future

An Experience is a publishable story, not simply a Place or Journey.

Examples:

- Morning Ride Through Zion
- A Day on the Adriatic
- Snowstorm at Dead Horse Point

An Experience may include:

- narrative sections,
- one or more Places,
- one or more Journey visits,
- a media sequence,
- operators or Partners,
- Instagram or YouTube relationships,
- publication and update dates.

Do not implement Experiences during the foundation unless a real publishing requirement cannot be represented cleanly by a Journey visit. Initially, visit-specific stories remain in Journeys.

Introduce Experiences when standalone stories begin overloading Journey records or need independent public URLs and publication lifecycles.

### 5. Partners and listings

Partners, lodging and operators are not media assets.

Keep business identity, URLs, affiliate disclosures and booking data in Partner or listing records. Their logos or owned photographs reference Media IDs.

Third-party hotel images should remain explicit external URLs until ownership or usage permission is confirmed. Do not automatically copy vendor media into R2.

The first canonical provider record is now implemented in `src/content/partners/index.mjs` for Nate's Custom Charters. Journey days reference it through `partnerIds`; selectors resolve the public operator link and disclosure, and validation rejects unknown providers or unsafe URLs. This establishes the Partner boundary without turning the charter day into a premature standalone Experience.

## Derived application views

Selectors form the boundary between canonical content and Vue components.

Recommended selectors:

    resolveMediaUsage(usage, options)
    getPlace(placeId)
    getJourney(journeyId)
    getTripViewModel(slug)
    getAtlasViewModel(context)
    getAtlasNodeViewModel(placeId, context)
    getGuidedJourneyViewModel(journeyId)

Components must receive usable view models. They should not know:

- how an R2 URL is assembled,
- whether an image is local or remote,
- how aliases are resolved,
- where poster metadata is stored,
- or which canonical records were joined.

A resolved media view should be consistent:

    {
      id: "utah-canyonlands-video-001",
      kind: "video",
      src:
        "https://media.roamwithjustin.com/videos/usa/utah/canyonlands/canyonlands_1.mp4",
      mimeType: "video/mp4",
      poster:
        "/img/locations/utah/locations/utah-canyonlands.jpg",
      alt: "Canyonlands National Park travel video",
      caption: null,
      focalPoint: null
    }

AtlasDetailPanel, AtlasMap, HeroCarousel and LocationModal should eventually consume this shared shape rather than implement their own normalization.

### Guided Journey playback - implemented foundation

The guided or "autopilot" tour is implemented as a playback projection of an existing Journey, not a new content authority. `buildGuidedJourneyViewModel` reads the Journey's ordered visits, resolves each visit's Place, camera and Atlas node, and produces a sequence the Atlas can play without copying coordinates, route order, stories or assets. `AtlasView` owns the temporary playback state, `AtlasJourneyPlayer` renders the controls, `AtlasMap` performs camera and transition animation, and `AtlasDetailPanel` presents each stop's canonical media.

Implemented interaction:

1. The visitor explicitly starts the journey.
2. The map animates toward the next ordered visit. A neutral transition marker follows the route today; the supported transport icon replaces it only when the Journey contains a confirmed transport mode.
3. Playback pauses automatically at the stop, opens its detail drawer and presents the curated photos or video.
4. The visitor chooses Next, Previous, Resume or Exit. A separate opt-in may auto-advance after a readable dwell time, but auto-pause should remain the default.
5. Manual map interaction pauses playback instead of fighting the visitor for camera control.

The player uses explicit `idle`, `traveling`, `paused-travel`, `at-stop` and `complete` states. Playback position, the travel timer and current media index are temporary UI state; they do not belong in Media, Places or Journeys. Optional transition facts such as `mode`, a confirmed duration or a public route geometry belong to the Journey visit-to-visit relationship, never to the Place hierarchy. The current published Journeys do not yet assert those transition facts, so the UI deliberately does not invent car, plane or walking modes.

Accessibility and delivery constraints:

- Always expose Play/Pause, Previous, Next and Exit controls with readable labels and large touch targets.
- Under `prefers-reduced-motion`, replace camera flights and moving icons with direct cuts between stops.
- Never start audible video without a visitor gesture; retain native controls, captions when available and poster-first loading.
- Announce the current stop and sequence position, preserve keyboard operation, and keep every stop available through its direct Atlas URL.
- Suspend timers and media when the page is hidden, the drawer is manually closed or the visitor takes control of the map.

Current delivery notes:

- Guided playback is available for every Journey that resolves to at least two map-visible leaf stops; the current Utah, Puerto Rico and St. John Journeys qualify.
- Stop media advances poster-first without starting audible video. Opening a video remains an explicit visitor action and uses the existing native-control lightbox.
- Reduced-motion visitors receive near-instant camera changes and no automatic media cycling.
- Confirmed per-transition modes and public road-following route geometry remain content-model extensions; the player and transport marker are ready to consume them without moving those facts into Places.

### Trip story and Atlas navigation - implemented

Trip stories and the Atlas expose two presentations of the same Journey. Their cross-navigation is derived by `addTripAtlasNavigation`; it is not stored on Journey or Place records and does not create a separate route mapping.

- A trip-level link resolves to the Atlas root node with the same `journeyId`.
- A location-level link resolves to the exact Atlas node when its canonical `placeId` is publicly mapped.
- A visited Place without an Atlas presentation falls back to the Journey root instead of inventing a pin.
- Atlas nodes continue to derive their "Read the trip story" action from the Journey slug.
- Build-time validation checks root fallbacks and exact Place-to-pin links for drift.

### Compatibility after migration

The resolver may temporarily accept:

- legacy /img paths,
- external URLs,
- canonical asset IDs,
- media usage objects.

Compatibility logic belongs in selectors and resolvers, not individual components.

All existing content is canonical:

- `src/data/trips.js` and `src/features/atlas/data/atlasData.js` no longer exist.
- Trip selectors project all five current cards and all five routable Journey pages from Journeys, Places and Media. Utah, Puerto Rico and St. John expose their verified itineraries; North Georgia and Hungary retain evidence-aware previews until stop, route and coordinate facts are ready.
- Atlas selectors project twenty-one nodes from canonical facts plus Atlas-only presentation settings.
- Compatibility selectors preserve current Vue prop shapes without owning content.
- New content must not reintroduce raw local media paths in Journey or Atlas records.

## Proposed file layout

    src/
      content/
        media/
          utah.mjs
          puerto-rico.mjs
          upcoming.mjs
          index.mjs
        places/
          utah.mjs
          puerto-rico.mjs
          upcoming.mjs
          index.mjs
          aliases.mjs
        journeys/
          utah-winter-2025.mjs
          puerto-rico-2024.mjs
          upcoming.mjs
          index.mjs
        atlas/
          presentation.mjs
          roots.mjs
        experiences/
          README.md
        partners/
          index.mjs
        selectors/
          media.mjs
          places.mjs
          projections.mjs
          trips.js
          atlas.js
        contracts.mjs
    scripts/
      validate-content.js

`contracts.mjs` contains JSDoc contracts and small assertion helpers. A TypeScript migration is not required. Canonical modules use `.mjs` so the Node validator and Vue build consume the same ESM records; Vue-facing compatibility entry points may remain `.js`.

### Concrete extension workflow

Use this sequence for each newly migrated place. It is intentionally explicit so future work does not reintroduce a second authority:

1. Add or confirm one canonical Place. Put coordinates and geographic parentage there; record evidence status and verification notes when precision is limited.
2. Add each controlled file once to Media. Record the local path or R2 object key, MIME type, dimensions or duration when known, rights, capture place and poster relationship.
3. Add a Journey visit that references the Place and Media IDs. Put dates, visit status, personal observations, captions, focal points and ordered route position there.
4. Add truly view-specific Atlas camera, hierarchy and media-usage settings to `content/atlas/presentation.mjs`. Do not create another Trip or Atlas content record.
5. Extend selectors only when a new reusable output field is needed. Do not assemble R2 URLs, resolve aliases or infer media kinds in Vue components.
6. Extend `scripts/validate-content.js` whenever a new relationship or required field is introduced. A record is not part of the architecture until invalid forms fail the build.
7. Compare the Atlas and Trip presentations at desktop and portrait/mobile sizes. For video, confirm poster display, controls, `playsinline`, metadata preload and playback through the public R2 domain.

For a future Experience, begin with `src/content/experiences/<experience-id>.mjs`, reference existing Place, Journey visit and Media IDs, add an Experience registry, then add a selector for the public page. Do not move the underlying assets, coordinates or visit facts into the Experience. Add publication state, narrative sections, social relationships and partner references only when an actual standalone story requires them.

## R2 delivery rules

R2 remains a delivery mechanism, not the content model.

Public base URL:

    https://media.roamwithjustin.com

Recommended new object keys:

    images/usa/utah/zion/bike-morning-001-1600.webp
    images/usa/utah/zion/bike-morning-001-thumb.webp
    videos/usa/utah/zion/bike-morning-001-1080p.mp4
    posters/usa/utah/zion/bike-morning-001.webp

Keep already published object keys working, including:

    videos/usa/utah/zion/zion_bike_morning.mp4
    videos/usa/utah/canyonlands/canyonlands_1.mp4

Naming rules:

- lowercase ASCII,
- hyphens for new files,
- meaningful subject and location,
- rendition suffix where applicable,
- no reliance on filename parsing for meaning.

Metadata such as capture date, Place association, rights and tags belongs in Media records.

The public media base URL may use VUE_APP_MEDIA_BASE_URL because it is not secret. R2 write credentials must never appear in Vue variables, browser bundles or repository content.

## Validation contract

Add scripts/validate-content.js in Phase 1 and run it before production builds.

Validation must check:

### Registry integrity

- Every record has a unique ID.
- Every local path exists.
- Every controlled R2 object key is unique.
- Required fields match the record kind.
- Image posters resolve to image assets.
- Usage roles are compatible with media kinds.
- No provider-specific secret appears in content.

### Relationship integrity

- Every assetId resolves.
- Every placeId resolves after alias handling.
- Every parentPlaceId resolves.
- Place hierarchy contains no cycles.
- Every Journey visit has a valid Place.
- Visit IDs are unique within a Journey.
- Journey route order is deterministic.
- Every day or itinerary reference resolves to the intended visit or Place.
- Experience references resolve when Experiences are introduced.

### Geographic and view integrity

- Longitude is between -180 and 180.
- Latitude is between -90 and 90.
- Generated Atlas nodes satisfy the current Atlas component contract.
- Generated Trip records satisfy the current Trip component contract.
- Required hero and thumbnail media resolve.
- Optional missing media degrades intentionally rather than producing broken elements.

### Hosted media checks

Network checks may run separately from the fast local validator:

- URL returns a successful status.
- Content-Type matches the declared MIME type.
- Video supports byte-range requests where required.
- Poster and rendition URLs are reachable.

### Build integration

Add scripts similar to:

    "content:validate": "node scripts/validate-content.js",
    "build": "npm run content:validate && vue-cli-service build"

The validator must report actionable record IDs and source file locations.

## Migration plan

### Phase 0 - Freeze and audit

- Preserve current rendering behavior.
- Record the component contracts currently consumed by HeroCarousel, LocationModal, AtlasMap and AtlasDetailPanel.
- Select canonical Place IDs.
- Create the explicit alias map.
- Inventory local files, external images, Instagram links and R2 objects.
- Record known broken references, including the missing Fairmont image.

### Phase 1 - Foundation

- Add Media, Places and Journeys directories.
- Add registry composition helpers.
- Add JSDoc contracts.
- Add aliases.
- Add content validation and make it a build gate.
- Add shared media resolution.
- Add selectors that can emit current component-compatible shapes.

This phase should not redesign the UI.

### Phase 2 - Canyonlands vertical slice

Migrate Canyonlands end to end:

- Canonical Place record.
- Hero and gallery image Media records.
- Existing R2 MP4 Media record.
- Poster relationship.
- Utah 2025 Journey visit.
- Atlas selector output.
- Trip selector output.
- Existing Atlas and Trip UI compatibility.
- Local and hosted validation.
- Desktop and mobile video playback.

Definition of success:

Changing the canonical Canyonlands Place, media record or visit updates both the Atlas and Trip presentations without editing duplicate records.

### Phase 3 - Utah - complete

- Migrate remaining Utah Places and media.
- Move itinerary order into the Utah Journey.
- Preserve existing /trips/utah behavior.
- Remove migrated Utah duplicates from legacy authority.
- Compare rendered pages before and after.

### Phase 4 - Puerto Rico - complete

- Migrate Puerto Rico Places and owned media.
- Resolve ID differences such as gozalandia and gozalandia-falls.
- Preserve external lodging and social URLs through typed compatibility.
- Validate route order separately from geographic hierarchy.

### Phase 5 - R2 publishing workflow

After several manual registry additions establish a stable pattern, add a publishing tool that can:

    local export folder
      -> inspect format, dimensions, duration and checksum
      -> create web-safe renditions and posters
      -> collision-check object keys
      -> upload with server-side credentials
      -> emit a proposed Media record
      -> validate URLs and metadata

Never silently overwrite a published object. Prefer immutable rendition keys and an explicit registry update.

### Phase 6 - Experiences and progressive publishing

Introduce Experiences when standalone stories need their own narrative and publishing lifecycle.

A future social publishing flow may:

- publish an Instagram carousel or Reel,
- add the same Media IDs to an Experience,
- connect that Experience to Journey visits and Places,
- and expand the Atlas through selector output.

Implement this only after the foundational content model is stable.

## Canyonlands implementation boundary - completed pilot

The first implementation was deliberately narrow. It proved the selector and validation contracts before the remaining Utah, Puerto Rico and coming-soon records were migrated.

In scope:

- contracts and validation needed by the vertical slice,
- Canyonlands Place,
- Canyonlands Media,
- one Utah Journey visit,
- selectors for the existing Atlas and Trip shapes,
- compatibility with legacy strings,
- tests and playback verification.

Still out of scope:

- database or API work,
- CMS integration,
- generic entity repositories,
- Experience pages,
- Instagram publishing automation,
- full R2 upload automation,
- unrelated UI redesign.

## Definition of done for the foundation

- Media, Places and Journeys have explicit ownership boundaries.
- Experiences are documented as a future domain without being required.
- Canonical Place IDs and aliases are validated.
- Canyonlands exists once as a Place and once per actual Journey visit.
- Its owned files and R2 video exist once in Media.
- Atlas and Trip outputs are produced through selectors.
- Existing Vue components remain functional through compatibility view models.
- Unknown media, Place and Journey references fail validation.
- Missing local files fail validation.
- Route order is not inferred from geographic hierarchy.
- All 92 controlled assets are registered once in Media.
- All five existing trip cards and 37 detailed visits are Journey projections.
- All twenty-one Atlas nodes are canonical projections; no `atlasData.js` authority remains.
- Missing or unverified coordinates remain `null` outside map-visible Atlas nodes.
- The build contains no R2 write credentials.
- No database, backend or generalized content framework has been introduced.

## Deferred documents and work

Do not implement R2 video, EXIF, gear or Content Strategy work as independent systems beside this foundation.

Those documents may be drafted, but their implementation must build on:

- canonical Media IDs,
- canonical Place IDs,
- Journey visits,
- shared selectors,
- and content validation.

This prevents new video or publishing features from being coupled to data structures that are about to be replaced.

## Final guidance

Media defines controlled assets. Places define geography. Journeys define travel history. Experiences will eventually define independently published stories.

The Atlas and Trip pages are derived presentations of that content.

All content that previously lived in `trips.js` and `atlasData.js` has been migrated. Future work should extend the canonical registries, selectors and validation contract directly. The next architecture phase may add a controlled publishing pipeline or Experiences, but neither should create a parallel media, place, journey or gear catalog.
