# Roam With Justin Atlas - Content and Media Architecture

**Status:** Approved direction; foundation not yet implemented  
**Application:** Vue 2, static GitHub Pages deployment, Cloudflare R2 media delivery  
**Immediate objective:** Establish durable sources of truth before adding more Atlas or publishing features

## Executive decision

Roam With Justin will begin with three authoritative content domains:

| Domain | Owns | Does not own |
| --- | --- | --- |
| Media | File identity, delivery location, R2 object keys, formats, renditions, intrinsic metadata, ownership and rights | Story-specific captions, crop choices, itinerary order |
| Places | Canonical place identity, name, coordinates, geographic hierarchy and stable place information | Visit dates, personal notes, route order |
| Journeys | A particular trip or visit, dates, ordered stops, day-by-day itinerary, lodging and visit-specific observations | Canonical geography or physical file storage |

Experiences are a planned fourth domain, but they are not required for the foundation. An Experience will eventually represent a publishable story that can span places, visits, media and social posts.

The Atlas and Trips are not additional sources of truth:

- The Atlas is a geographic projection of Places, enriched by Journey visits and media usages.
- Trips are chronological projections of Journeys, enriched by Places and media usages.
- Selectors produce the view models expected by the existing Vue components.

The application will remain static. Plain JavaScript modules, small selectors and build-time validation are sufficient. This architecture does not require a database, backend API, CMS, generic repository framework or class hierarchy.

## Why the architecture must change

The repository currently describes overlapping content independently in src/data/trips.js and src/features/atlas/data/atlasData.js.

Observed repository facts:

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
        width: 1600,
        height: 1067
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
      shared.js
      utah.js
      puerto-rico.js
      index.js

The index composes modules and exposes a single lookup API.

### Media usage

Presentation belongs at the point of use:

    {
      assetId: "utah-canyonlands-hero-001",
      role: "hero",
      caption: "A storm moving through Island in the Sky",
      alt: "Snow clouds moving across the Canyonlands overlooks",
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
      description:
        "Layered canyons and immense overlooks carved by the Colorado Plateau.",
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
      id: "utah-2025",
      slug: "utah",
      title: "Utah",
      dateRange: {
        start: "2025-02-14",
        end: "2025-02-21"
      },
      hero: {
        assetId: "utah-cover-001",
        role: "hero",
        focalPoint: {
          x: 0.5,
          y: 0.45
        }
      },
      visits: [
        {
          id: "utah-2025-canyonlands",
          placeId: "canyonlands-national-park",
          date: "2025-02-18",
          summary:
            "We experienced sunshine, rain and snow during one visit.",
          media: [
            {
              assetId: "utah-canyonlands-hero-001",
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

Public compatibility may preserve the existing /trips/utah route while the canonical Journey ID is utah-2025.

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

## Derived application views

Selectors form the boundary between canonical content and Vue components.

Recommended selectors:

    resolveMediaUsage(usage, options)
    getPlace(placeId)
    getJourney(journeyId)
    getTripViewModel(slug)
    getAtlasViewModel(context)
    getAtlasNodeViewModel(placeId, context)

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

### Compatibility during migration

The resolver may temporarily accept:

- legacy /img paths,
- external URLs,
- canonical asset IDs,
- media usage objects.

Compatibility logic belongs in selectors and resolvers, not individual components.

During transition:

- Unmigrated trips may remain in src/data/trips.js.
- Unmigrated Atlas nodes may remain in atlasData.js.
- Migrated content is authoritative only in the new content modules.
- Compatibility selectors reproduce the existing component shapes.
- Do not edit a migrated entity in both the canonical and legacy files.

The long-term goal is for trips.js and atlasData.js to become compatibility exports or disappear after all consumers use selectors.

## Proposed file layout

    src/
      content/
        media/
          shared.js
          utah.js
          puerto-rico.js
          index.js
        places/
          utah.js
          puerto-rico.js
          index.js
          aliases.js
        journeys/
          utah-2025.js
          puerto-rico-2024.js
          index.js
        experiences/
          README.md
        partners/
          index.js
        selectors/
          media.js
          places.js
          trips.js
          atlas.js
        contracts.js
      data/
        trips.js
      features/
        atlas/
          data/
            atlasData.js
    scripts/
      validate-content.js

contracts.js should contain JSDoc contracts and small assertion helpers. A TypeScript migration is not required.

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

### Phase 3 - Utah

- Migrate remaining Utah Places and media.
- Move itinerary order into the Utah Journey.
- Preserve existing /trips/utah behavior.
- Remove migrated Utah duplicates from legacy authority.
- Compare rendered pages before and after.

### Phase 4 - Puerto Rico

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

## Canyonlands implementation boundary

The first implementation should be deliberately narrow.

In scope:

- contracts and validation needed by the vertical slice,
- Canyonlands Place,
- Canyonlands Media,
- one Utah Journey visit,
- selectors for the existing Atlas and Trip shapes,
- compatibility with legacy strings,
- tests and playback verification.

Out of scope:

- bulk migration,
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
- The build contains no R2 write credentials.
- No database, backend or generalized content framework has been introduced.

## Deferred documents and work

Do not implement an R2 Video architecture or Content Strategy architecture as independent systems before this foundation exists.

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

The immediate next implementation is not a bulk migration or upload pipeline. It is the Foundation phase followed by one complete Canyonlands vertical slice. That slice must prove that a single content change can update both the Atlas and Trip experiences without duplicating place identity, file delivery details or visit-specific narrative.
