---
id: journey-media-inventory-2026-11-14
title: Journey Media Inventory — 2026-11-14
kind: reference
status: unverified
implementation_state: unknown
updated: 2026-11-14
related:
  - content-model
  - media-pipeline
  - lightroom-publishing
supersedes: []
superseded_by: []
code_paths:
  - src/content/media
  - src/content/journeys
  - src/content/atlas/presentation.mjs
verification:
  state: unverified
  evidence: []
---

> **Snapshot only:** Counts and content priorities below were not regenerated
> during the documentation migration. Recalculate them from current source
> before using them for publication planning.

# Roam With Justin — Journey Media Inventory and Interim Lightroom Workflow

- **Snapshot date:** November 14, 2026
- **Purpose:** Track which canonical Journeys exist, what media is already attached, what should be selected from Lightroom next, and how to publish safely before the automated Lightroom pipeline is ready.

This document is an operational inventory, not a new content authority. The live sources of truth remain:

- `src/content/journeys/` for trip chronology, visits, and editorial usage;
- `src/content/places/` for geographic identity and verified coordinates;
- `src/content/media/` for controlled asset records;
- `src/content/atlas/presentation.mjs` for Atlas-only presentation choices.

Counts below refer to unique canonical asset IDs attached to each Journey. “Distinct local files” uses file hashes, so identical files stored under different names are not overstated as different photographs.

## Recommendation

Do one focused Lightroom pass for the under-supplied past journeys, then call the current site content-complete and begin the **receiving-side automation proof**, not the full Lightroom plug-in.

Recommended order:

1. Publish a curated USVI set because it currently has only one distinct photograph.
2. Publish a curated North Georgia set because it currently shows one forest scene in two orientations.
3. Verify the Hungary trip date, locations, and intended story before selecting more images.
4. Optionally fill the few Puerto Rico visit gaps. Utah does not need a general media refresh.
5. Stop doing large manual batches. Use the current
   [Journey media ingestion workflow](../implementation/journey-media-ingestion.md)
   before advancing the [Lightroom proposal](../proposals/lightroom-publishing.md).

This sequence gives the site enough real content now while using one or two actual Lightroom batches to expose the metadata and association decisions the automation must support. Building the entire Lightroom plug-in first would automate a workflow that has not yet been exercised against these new Journey records. Manually processing the whole archive would create avoidable migration work.

## Canonical Journey inventory

| Public page            | Canonical Journey ID |                      State | Visits |         Attached media | Actual coverage                                       | Next action                                                |
| ---------------------- | -------------------- | -------------------------: | -----: | ---------------------: | ----------------------------------------------------- | ---------------------------------------------------------- |
| `/trips/utah-2025`          | `utah-winter-2025`   |       Published, confirmed |     11 | 41 images + 1 R2 video | 39 distinct local image files; every visit has a hero | No broad refresh needed                                    |
| `/trips/puerto-rico-2024`   | `puerto-rico-2024`   |       Published, confirmed |     16 |              48 images | 46 distinct local image files; one visit has no media | Fill only specific gaps if good Lightroom selections exist |
| `/trips/usvi-2025`          | `usvi-st-john-2025`  | Published structure, media pending |     10 |        2 image records | One distinct journey-level photograph; stop media pending | Highest Lightroom priority                              |
| `/trips/north-georgia-2026` | `north-georgia-2026` | Preview, confirmed imagery |      0 |        2 image records | Two orientations/crops of one forest scene            | Second Lightroom priority                                  |
| `/trips/hungary-2024`       | `hungary-2024`       |        Preview, unverified |      0 |        2 image records | Two Parliament photographs with little story variety  | Verify facts before expanding                              |

Utah, Puerto Rico and St. John now qualify for guided Atlas playback because they have ordered Journey visits and multiple mapped leaf stops. North Georgia and Hungary remain previews and should not receive invented pins, exact dates, or routes merely because more photographs are available.

## Journey-by-journey media plan

### Utah — `utah-winter-2025`

Current coverage is already strong:

- 11 canonical visits;
- 41 attached image asset records;
- 39 distinct local image files;
- one Canyonlands video delivered from R2;
- every visit has at least a hero image;
- most visits have a hero plus two or more gallery images.

Known thin spot:

- `salt-lake-city-airport` has a hero but no gallery images. This is a low-value storytelling gap and does not justify a Lightroom search unless the departure sequence matters editorially.

Known identical-file pairs:

- `image-utah-gallery-utah-deadhorse` and `image-utah-locations-utah-deadhorse`;
- `image-utah-gallery-utah-canyonlands` and `utah-canyonlands-hero-001`.

Recommendation: leave Utah alone except for exceptional replacements or a deliberate new story. Its more important future work is expanding verified Atlas presentation coverage, not adding more images indiscriminately.

### Puerto Rico — `puerto-rico-2024`

Current coverage is also strong:

- 16 canonical visits;
- 48 attached image asset records;
- 46 distinct local image files;
- varied coverage across Old San Juan, Cueva del Indio, Hacienda Florecer, horseback riding, beaches, Aguadilla, Gozalandia, Mar Chiquita, and Playa Pastillo.
- Hacienda Florecer is now a mapped Atlas stop using creator-supplied GPS and four dedicated pool/mountain images.

Specific media gaps:

| Place ID               | Current state                | Lightroom target                                               |
| ---------------------- | ---------------------------- | -------------------------------------------------------------- |
| `calle-c-canals`       | No hero and no gallery media | Add 2–3 images only if the location can be confidently matched |
| `fairmont-el-san-juan` | Hero only                    | Optional 1–2 supporting images                                 |
| `estatua-de-colon`     | Hero only                    | Optional 1–2 supporting images                                 |
| `pena-blanca-beach`    | Hero only                    | Optional 1–2 supporting images                                 |

Known identical-file pairs:

- `image-puerto-rico-puerto-rico-full` and `image-puerto-rico-featured-puerto-rico-gozalandia`;
- `image-puerto-rico-featured-puerto-rico-crash-boat` and `image-puerto-rico-puerto-rico-crash-boat`.

Recommendation: do not re-export the entire trip. Fill a gap only when the Lightroom catalog provides a clearly better or genuinely different photograph. A small native-video pass could add more value than another large still gallery.

### US Virgin Islands — `usvi-st-john-2025`

Current media:

- `image-usvi-usvi` → `/img/locations/usvi/usvi.jpg`;
- `image-usvi-usvi-full` → `/img/locations/usvi/usvi-full.jpg`;
- `video-usvi-arrival-ferry-001` → `videos/usa/usvi/This Is Saint John.mp4`;
- `video-usvi-nates-charters-001` → `videos/usa/usvi/NatesCharters_Edit-30k.mp4`;
- `video-usvi-waterlemon-001` → `videos/usa/usvi/roam_waterlemon_1.mp4`.

The two image usages are backed by byte-for-byte identical files. The Journey now has **one distinct public photograph and three R2-hosted videos**, ten confirmed visit records, seven editorial day chapters, and nine map-visible leaf stops plus the St. John root. The arrival/ferry film is attached to Cruz Bay, the multi-stop Nate's charter edit is attached to Lovango as the mapped boat-day representative, and the Waterlemon film is attached directly to Waterlemon Cay. Location cards continue to identify their photography as pending rather than presenting the shared cover or the presence of video as a verified location image.

Lightroom target: select approximately 10–15 finished photographs, not the entire archive.

Suggested mix, subject to verification:

- 1 strong destination hero;
- 3–5 Trunk Bay swimming, snorkeling, underwater, coral, rock, or white-sand images;
- 3–4 broader St. John beach and island-landscape images;
- 2–3 harbor, boat, aerial, or elevated-cove views when ownership and location are known;
- 1–2 quiet personal/detail frames that give the story human scale.

The creator's updated trip brief now confirms Maho Bay, Cruz Bay transit, Great Cruz Bay lodging context, Nate's Custom Charters, Hermit Crab Island, Lovango Cay, Trunk Bay, Cinnamon Bay and Waterlemon Cay as Journey facts. Per-file attribution is still pending: do not label a photograph with one of those places until the Lightroom gallery or travel record supports it, and do not turn Lovango into a specific restaurant or beach-club claim. The photo series may remain non-chronological; image sequence does not need to pretend to prove the day-by-day itinerary.

### North Georgia — `north-georgia-2026`

Current media:

- `image-nga-nga` → a landscape crop of a forest-stream scene;
- `image-nga-nga-full` → a portrait crop/alternate frame of the same scene.

The files are technically distinct, but they communicate one scene. The Journey has no canonical visits, no days, no stop galleries, and no Atlas route.

Lightroom target: select approximately 8–12 finished photographs.

Suggested mix:

- 1 broader mountain or North Georgia establishing hero if a strong one exists;
- 2–3 verified aerial/landscape photographs from near Mineral Bluff;
- 2–4 quiet getaway details such as fire, cards, cabin atmosphere, or family moments that are appropriate for public display;
- 2–3 woodland, weather, texture, or mountain-detail frames.

Privacy requirements:

- strip exact GPS from private-cabin photographs;
- do not publish the cabin address, booking listing, or operator;
- do not create trail pins from researched hikes;
- do not claim a bald-eagle sighting without a matching confirmed photograph and record.

### Hungary — `hungary-2024`

Current media:

- two distinct landscape images of the Hungarian Parliament Building;
- the creator-confirmed year is 2024, but no exact date range is verified;
- no canonical visits or itinerary;
- no Atlas route;
- Journey evidence state remains `unverified`.

Before exporting more images, confirm:

1. whether this is a completed personal trip;
2. the exact date range;
3. the cities and places actually visited;
4. which photographs belong to this same trip;
5. whether Budapest should become a canonical Place and Journey visit.

After verification, select approximately 8–12 photographs with genuine variety: establishing city views, street/detail frames, river or bridge context, interiors or food when appropriate, and personal moments. More Parliament crops alone will not turn the placeholder into a Journey story.

## Interim Lightroom workflow

Use this workflow only until manifest ingestion is operational. It preserves the current architecture and keeps the eventual migration small.

### 1. Curate in Lightroom

Create one collection per Journey and, where the place is verified, one nested collection per place. Use the canonical Journey ID in the collection description or name.

Example:

```text
Roam With Justin
└── USVI 2025 [journeyId=usvi-st-john-2025]
    ├── St. John — general
    └── Trunk Bay — confirmed
```

Natural collection names are fine. Do not invent a `placeId` inside Lightroom. If a place is not registered yet, leave the canonical ID blank and provide the human-readable location for review.

### 2. Export a small final set

Recommended temporary image export:

- color space: sRGB;
- format: JPEG for the least-friction current workflow;
- quality: approximately 78–82;
- long edge: 2400–2560 pixels for heroes, 1800–2200 pixels for gallery images;
- output sharpening: screen/standard if it suits the edit;
- metadata: copyright/contact only, with precise GPS, camera serials, and private source paths removed;
- target size: preferably under 650 KB for heroes and under 400 KB for gallery images;
- filename: lowercase ASCII with hyphens, such as `trunk-bay-underwater-001.jpg`.

Do not export Lightroom masters, TIFFs, full-resolution originals, sidecars, or private catalog paths into the repository. Keep masters in Lightroom plus the existing private backup system.

The current optimizer only resizes JPEG/PNG files whose largest dimension exceeds 2560 pixels. It does not rescue a poorly compressed 2560-pixel export, so Lightroom export quality still matters.

### 3. Stage before publishing

Export into a temporary staging folder outside `public/img`. Include a small handoff CSV or Markdown table with one row per image:

```csv
file,journey_id,place_label,canonical_place_id,role,caption,alt,approximate_date,privacy_notes
trunk-bay-underwater-001.jpg,usvi-st-john-2025,Trunk Bay,,gallery,"Swimming above the reef","Clear water and reef at Trunk Bay",2025,"GPS removed"
```

`canonical_place_id` may be blank. A blank ID means “review and register this place if verified,” not “guess an ID from the filename.” This handoff file is temporary intake material, not another permanent content database.

### 4. Integrate one batch through the canonical records

For each accepted image:

1. confirm or add its canonical Place;
2. add one Media record with dimensions, MIME type, rights, source, and capture-place association when known;
3. confirm or add the appropriate Journey visit;
4. attach the Media ID to the Journey hero/gallery/visit usage;
5. add Atlas presentation only when a public coordinate and map presentation are verified;
6. run `npm run content:validate`;
7. run the production build and review the Trip and Atlas at desktop and mobile sizes.

Journey records must reference `assetId`; they must not contain raw `/img/...` paths. New images should not silently replace an existing curated hero.

Until automation exists, the lowest-risk division of work is:

- Lightroom handles selection, editing, and export;
- the handoff table records editorial intent;
- the repository integration updates Media, Place, Journey, and Atlas relationships together;
- validation prevents incomplete or invented associations from deploying.

### 5. Keep batches deliberately small

Use 8–15 images per under-supplied Journey. A tight story with visual variety is more valuable than importing every acceptable photograph. Small batches also make incorrect place assignments, duplicates, privacy issues, and weak edits easier to catch.

## When to begin automation

Begin the automation architecture after the USVI and North Georgia selection pass—or sooner if new photos will be published weekly. Do not begin with the full Lua Lightroom Publish Service.

The next technical milestone should be:

1. define and validate one versioned publication manifest;
2. ingest one already-registered Canyonlands photo in dry-run mode;
3. prove idempotency, stable asset identity, revision handling, curated-hero protection, and invalid-ID failure;
4. make both Atlas and Trip selectors consume the ingested placement;
5. only then build the local processor and Lightroom front end.

Decision rule:

- If the site will receive only this one past-trip refresh and occasional quarterly updates, finish the curated batches and pause automation without guilt.
- If publishing will be weekly, include repeated re-edits, or cover many more trips, start the receiving-side vertical slice immediately after the first curated batch.

Either way, avoid a long middle period where dozens of photographs are manually registered. The current site is functioning; the next value comes from filling the obvious story gaps, then reducing future publishing friction—not from another broad UI overhaul.

## Completion checklist for the current content pass

- [x] USVI canonical Places, Journey visits, day chapters, Atlas route, and guided playback are implemented.
- [x] Three creator-supplied USVI videos are registered from R2 and attached to their Journey and Atlas chapters.
- [ ] USVI has 10–15 varied, verified Lightroom selections.
- [ ] USVI cover/full usages no longer resolve to the same underlying photograph unless intentionally retained.
- [ ] North Georgia has 8–12 varied selections with private GPS removed.
- [ ] Hungary facts are verified before new places or route claims are added.
- [ ] Optional Puerto Rico gaps are reviewed without re-exporting the full trip.
- [ ] Utah is left unchanged unless an image is clearly better or tells a missing story.
- [ ] Every accepted image has one stable Media record and explicit Journey/place usage.
- [ ] `npm run content:validate` and `npm run build` pass.
- [ ] Trip previews are reviewed at desktop and portrait/mobile sizes.
- [ ] The next engineering task is the Canyonlands manifest-ingestion vertical slice, not the full Lightroom plug-in.

## Related architecture documents

- [Canonical Content Model](../architecture/content-model.md)
- [Lightroom Publishing proposal](../proposals/lightroom-publishing.md)
- [Photo EXIF and Capture Gear proposal](../proposals/photo-exif-gear.md)
- [Travel Context](../reference/travel-context.md)
