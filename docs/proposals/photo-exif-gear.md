---
id: photo-exif-gear
title: Photo EXIF and Capture Gear
kind: proposal
status: proposed
implementation_state: none
updated: 2026-11-14
related:
  - media-pipeline
  - gear-system
  - lightroom-publishing
supersedes: []
superseded_by: []
code_paths: []
verification:
  state: unverified
  evidence: []
---

> **Proposal:** Canonical Gear ingestion exists, but EXIF extraction, privacy
> filtering, capture-settings storage/resolution, and Behind-the-Shot UI do not.
> References below to `trips.js` or `atlasData.js` are historical assumptions;
> both authorities were retired. Extend the [current content model](../architecture/content-model.md).

# Roam With Justin — Photo EXIF, Camera Settings & Gear Linking

**Status:** Architecture proposal / implementation handoff  
**Depends on:** Canonical Media + Places + Journeys architecture and media selectors  
**Goal:** Give technically curious visitors a useful **How I Shot This** panel without manually entering camera settings or duplicating gear information for every photograph.

## Executive decision

**Extract EXIF once during media ingestion/build, store a normalized, privacy-reviewed subset in the media registry, and resolve camera/lens references against a separate canonical gear catalog.** Do **not** fetch and parse full JPEG files at page-view time merely to discover EXIF.

An exported Lightroom JPEG *can* include camera EXIF (camera, lens, focal length, aperture, shutter, ISO), but **only if Lightroom export settings preserve it**. Downstream WebP/AVIF/thumbnail conversion can strip it. The media record, not the public image file, should become the reliable source for displaying technical settings.

This extends the existing direction:

- **Media** owns reusable image files, variants, metadata extracted from capture, and provenance.
- **Places** owns canonical geography.
- **Journeys** owns visits, itinerary order, and visit-specific narrative.
- **Gear** owns equipment/product identity, equipment metadata, and optional affiliate links.
- **Editorial usage** owns contextual crop, alt text, caption, ordering, and visibility of a technical panel.
- **Atlas and trip views** derive their displays through selectors rather than independently maintaining camera/gear details.

Do not conflate **media assets** (photographs/videos) with **gear assets** (camera bodies, lenses, drones, filters, accessories). Call the latter `gear` or `equipment` in code, even if the public page is titled **My Gear** or **Gear I Use**.

## Observations from the current repository

The supplied `trips.js` currently embeds photograph paths directly in `cover`, `fullImage`, `gallery`, location `image`/`gallery`, and `featuredShots`. It also keeps `gearHighlights` arrays containing free-text names and affiliate links on individual trips. The supplied `affiliates.js` has `partners` and a currently commented-out `gear` array. Those sources should **reference canonical media IDs and canonical gear IDs**, not become competing gear catalogs.

The repository review additionally identified duplicated trip/Atlas location and asset data. **Do not build the EXIF/gear feature on the old duplicated model.** Build it atop the canonical media/place/journey slices already planned; an initial Canyonlands photo is a good vertical-slice test.

## 1. User experience

A photo detail page or lightbox can show a discreet expandable **How I Shot This** section:

> **Canyonlands — Shifting Weather**  
> Sony A7R V · Tamron 35–150mm f/2–2.8  
> 70 mm · f/5.6 · 1/250 s · ISO 200  
> [View camera] [View lens]  
> Optional: tripod/filter/drone, short behind-the-shot note.

The UI should:

- Be optional and visually secondary to the photograph; do not turn every image into a spec sheet.
- Show only available, verified fields; do not fabricate unknown lens identities or settings.
- Allow visitors to click to a **gear detail** page and optionally an affiliate/shop link with a clear disclosure.
- Distinguish **recorded EXIF** from **manually supplied or corrected** data.
- Support phone, drone, scanned, edited/composite, or EXIF-less images gracefully.
- Not expose private GPS coordinates by default.

## 2. Why ingest-time EXIF beats parsing in the browser

| Approach | Advantages | Problems | Decision |
|---|---|---|---|
| Read EXIF from JPEG in browser on every visit | Minimal upfront pipeline | Downloads bytes; needs special parsing and often cross-origin access; metadata may be absent; duplicates work across views; image variants may have stripped EXIF | **Avoid as primary mechanism** |
| Extract once from Lightroom export with a local Node CLI/ExifTool | Reliable workflow; inspect and correct; searchable; cacheable; no browser dependency | Needs a small ingest step | **Recommended** |
| Manually enter photo technical information | Works for videos, EXIF-less exports, filters, modifiers | Tedious/error-prone at scale | **Use only as override/fallback** |

A browser could sometimes parse EXIF from a fetched image, but it is unnecessary for an Atlas built from static content. Especially avoid runtime fetching of original high-resolution JPEGs just for metadata when the displayed asset is an optimized WebP.

### Lightroom export preset

Create a named **Atlas Metadata Source** export preset in Lightroom Classic:

1. Export JPEG with a metadata inclusion option that **retains camera EXIF** (for example, `All Metadata`; verify against your installed Lightroom version).
2. Enable **Remove Location Info** for public-facing exports when you do not intend to share precise capture coordinates.
3. Consider excluding person metadata and private contact details where the export UI allows it.
4. Keep this ingest source locally or in your private archive; it need not be the web-optimized version uploaded to R2.
5. Verify with ExifTool before building automation. An exported JPEG may contain data only if it was preserved in the export.

Example inspection:

```bash
exiftool -json -Make -Model -LensModel -LensID -FocalLength -FNumber -ExposureTime -ISO -DateTimeOriginal -ImageWidth -ImageHeight photo.jpg
```

**Caution:** Real ExifTool keys and values depend on camera and file; inspect a real Sony, DJI, and phone export before finalizing mappings. `LensID` can be ambiguous or unavailable. For video, EXIF-style fields are less consistent; provide metadata from export/project information and editorial overrides instead.

## 3. Canonical gear catalog

Create a standalone gear registry keyed by stable product IDs, **not affiliate URLs, labels, or raw camera EXIF strings**:

```js
// src/content/gear/cameras.js
export const cameras = {
  "sony-a7rv": {
    id: "sony-a7rv",
    category: "camera",
    brand: "Sony",
    name: "Sony A7R V",
    aliases: ["ILCE-7RM5", "Sony ILCE-7RM5", "ILCE-7RM5"],
    image: null, // Optional canonical media asset ID
    description: "High-resolution full-frame mirrorless camera",
    links: [] // Optional trusted product / affiliate link objects
  }
}
```

```js
// src/content/gear/lenses.js
export const lenses = {
  "tamron-35-150-f2-28-sony-e": {
    id: "tamron-35-150-f2-28-sony-e",
    category: "lens",
    brand: "Tamron",
    name: "35–150mm f/2–2.8 Di III VXD",
    mount: "Sony E",
    aliases: ["Tamron 35-150mm F/2-2.8 Di III VXD A058"],
    links: []
  }
}
```

These are **illustrative**, not a guarantee of the exact EXIF strings on your exports. Treat actual exports as authoritative when adding aliases. Never assume a lens based solely on its focal length.

Other categories can include drones, action cameras, filters, tripods, lighting, and bags. Only camera/lens metadata is likely to be automatically identifiable from a standard photograph; **filters, tripods, lighting setups, etc. usually require manual attribution**.

**Ownership vs recommendation:** A product shown in the gear catalog need not imply current ownership. Optional `relationship` values might be `owned`, `previously-used`, `borrowed`, `recommended`, or `unknown`, with timestamps if useful. Avoid silently converting trip historical gear usage into claims about the user's current kit.

### Affiliate relationships

Keep `partners` as a separate editorial/commercial domain. For individual products, associate gear records with link objects, including disclosure status and destination. Do not hardcode affiliate links on every photo or trip. Preserve existing `affiliates.js` exports through compatibility selectors while migrating.

```js
{
  gearId: "sony-a7rv",
  kind: "affiliate", // or "manufacturer", "review", "internal"
  label: "See this camera",
  url: "https://example.com/approved-link",
  disclosureRequired: true
}
```

Use approved, real URLs only. Do not generate fake affiliate links. If a link earns commissions, display a clear affiliate disclosure near the link.

## 4. Media schema: captured technical data + gear IDs

```js
// src/content/media/utah.js
export const utahMedia = {
  "utah-canyonlands-storm-001": {
    id: "utah-canyonlands-storm-001",
    kind: "image",
    source: {
      provider: "r2", // "local" is also supported
      path: "images/usa/utah/canyonlands/storm-001.webp"
    },
    capture: {
      placeId: "canyonlands-national-park",
      recordedAt: "2025-02-01T15:45:00", // Example ONLY; ingest real value
      cameraMake: "SONY",
      cameraModelRaw: "ILCE-7RM5",
      lensModelRaw: "Tamron ...", // Exact EXIF string from file
      cameraGearId: "sony-a7rv",
      lensGearId: "tamron-35-150-f2-28-sony-e",
      focalLengthMm: 70,
      aperture: 5.6,
      shutterSeconds: 0.004,
      iso: 200,
      provenance: "exif", // raw origin; per-field provenance if mixed
      reviewed: false
    },
    technicalOverrides: {
      // Optional: corrections or explicit notes, with attribution.
      gearIds: [],
      technique: null,
      notes: null
    }
  }
}
```

**All numerical capture values and capture timestamp above are placeholders, not factual claims about the existing Canyonlands photo.** During implementation, replace them with actual export metadata or `null`.

Suggested optional fields: `focalLength35mmEq`, `exposureCompensation`, `flashFired`, `orientation`, `dimensions`, `whiteBalance` (only if useful), `cameraSerial` **never published**, `sourceFileFingerprint` stored privately if desired, and `extractionVersion` for reproducibility.

Do not preserve arbitrary full EXIF blobs in published app data: they can contain GPS, serial numbers, owner names, and other sensitive information. Use a **field allowlist** and verify generated artifacts.

### Editorial use stays separate

```js
{
  assetId: "utah-canyonlands-storm-001",
  role: "hero",
  caption: "Weather changing over Island in the Sky",
  alt: "Storm clouds above Canyonlands National Park",
  focalPoint: { x: 0.55, y: 0.42 },
  showTechnicalDetails: true
}
```

Display-specific captions, crop/focal point, position, and alt text belong to the **usage**, not to the universal media record. A single photo can appear in the Atlas, a journey, and an experience with different editorial framing.

## 5. Resolution and matching rules

A resolver maps raw EXIF strings to canonical gear IDs:

1. **Normalize** whitespace, punctuation, casing, vendor prefixes, and known model-number patterns.
2. Match strong **exact aliases** against a curated catalog.
3. Only use fuzzy matching to **suggest** candidates in an ingest report; never silently attach an affiliate product after a low-confidence match.
4. If ambiguous, leave `lensGearId`/`cameraGearId` `null` and retain the raw reported model for review.
5. Support explicit per-photo corrections without changing the underlying raw EXIF strings.
6. Validate that all referenced gear IDs exist and product links are allowed/approved.

Example:

```js
const cameraAliases = {
  "ilce-7rm5": "sony-a7rv",
  "sony ilce-7rm5": "sony-a7rv"
}

export function resolveCameraGearId(rawModel) {
  if (!rawModel) return null
  return cameraAliases[rawModel.trim().toLowerCase()] ?? null
}
```

Build the real alias table from observed EXIF. Some Sony + third-party lens combinations report incomplete or generic lens names; those must be reviewed instead of guessed.

## 6. Proposed folder organization

```text
src/content/
  media/
    utah.js
    puerto-rico.js
    index.js
  places/
  journeys/
  gear/
    cameras.js
    lenses.js
    accessories.js
    index.js
  partners.js
  selectors/
    media.js
    gear.js
    trips.js
    atlas.js

scripts/
  extract-photo-metadata.js
  validate-content.js

# Separate local staging directory (gitignored):
media-ingest/
  incoming/
  manifests/
```

The **gear catalog** is not the media registry. A product's optional image can itself reference the media registry, but a camera body is not a photo asset.

## 7. Ingest / publishing pipeline

```text
Lightroom edits / RAW master (private)
           |
Lightroom JPEG metadata source (retains camera EXIF)
           |
Local ingest CLI: ExifTool -> normalize -> match gear -> review exceptions
           |
Static media record: camera settings, gear IDs, safe publishable metadata
           |
Generate web JPEG/WebP/AVIF + thumbnail (metadata may be stripped)
           |
Upload public renditions to Cloudflare R2
           |
Atlas/trip/experience selectors resolve media + gear + editorial usage
           |
Vue photo detail -> "How I Shot This" disclosure and gear links
```

**Do not parse EXIF from R2 in the browser on every page view.** For a static GitHub Pages deployment, the build-time/public metadata record is the contract. Run ingestion locally or in CI using credentials and private source files securely; never place R2 upload credentials in the frontend.

### Useful first command

```bash
exiftool -json -Make -Model -LensModel -LensID -FocalLength -FNumber -ExposureTime -ISO -DateTimeOriginal "path/to/lightroom-export.jpg"
```

Implement a CLI only after verifying at least three representative files: Sony body + Sony lens, Sony body + third-party lens, and DJI/mobile capture. The extraction script should be **idempotent**: repeated runs must not create duplicate asset IDs or overwrite intentional human corrections.

## 8. Selector interface

Aim for a single selector returning presentation-ready metadata, without embedding EXIF parsing into Vue components:

```js
getPhotoTechnicalDetails("utah-canyonlands-storm-001")
// -> {
//   camera: { id, name, url? } | null,
//   lens: { id, name, url? } | null,
//   settings: { focalLength, aperture, shutter, iso },
//   otherGear: [],
//   note: null,
//   provenance: "exif" | "manual" | "mixed" | "unknown"
// }
```

Keep formatting (e.g., `1/250 s`, `f/5.6`) in a shared formatting utility; store numeric values in the registry. Never assume the metadata is complete. A panel with no meaningful details should be hidden.

## 9. Privacy and accuracy safeguards

- **GPS:** Default to omit exact embedded coordinates from public metadata. Use the manually chosen canonical place pin instead. This is especially important for lodging, family photos, or sensitive wildlife sites.
- **Serial numbers/owner details:** Never expose camera serial numbers, owner/email details, original local paths, or private Lightroom catalog IDs.
- **Time/date:** Consider whether publishing precise timestamps is desirable; store only what is needed for the product.
- **Lens matching:** Some exports have unreliable or ambiguous lens metadata. Do not show inaccurate affiliate links as facts.
- **Software alterations:** A crop does not change the recorded focal length, but composites, panoramas, and AI-generated images need clear treatment; suppress misleading single-shot settings when appropriate.
- **Correctness:** Lightroom/optimizer settings vary. Test the actual JPEG, not assumptions about export presets.
- **Performance:** Only load images/videos needed for the UI; the EXIF-derived panel comes from small static JSON/JS, not raw photo downloads.

## 10. Validation additions

Extend `scripts/validate-content.js` to check:

- All referenced `cameraGearId`, `lensGearId`, and additional gear IDs exist.
- Canonical media IDs are unique; image sources and allowed variants resolve.
- Known positive numeric ranges for ISO, aperture, shutter duration, focal length; `null` is acceptable for absent values.
- Unmapped/ambiguous EXIF models generate warnings, not automatically guessed associations.
- Public generated content excludes forbidden EXIF fields (GPS, serial, identifying private metadata).
- Gear photos and outbound partner links are valid when supplied.
- Existing compatibility selectors for `trips.js` and `atlasData.js` remain behaviorally stable.
- A report identifies images with no camera metadata, unknown lenses, or manual overrides for later review.

## 11. Suggested vertical slice and acceptance criteria

**Start with Canyonlands**, consistent with the architecture review:

1. Choose **one real Lightroom-exported JPEG** used by the existing Canyonlands trip/Atlas UI.
2. Inspect its actual EXIF with ExifTool. Document the real tags observed; do not manufacture values.
3. Register its file in the canonical Utah media collection.
4. Add a camera/lens gear record **only if its model is known and verified**. Otherwise leave unresolved and show the raw text cautiously.
5. Store safe normalized capture fields in the media record; keep display caption/alt in editorial usage.
6. Produce both trip and Atlas views via selectors; they must show the same equipment identity and settings.
7. Convert to web media / upload to R2, proving that details still render even when web rendition EXIF is stripped.
8. Test photo without EXIF, ambiguous third-party lens, missing gear link, and existing affiliate card.

**Done when:** Editing a gear name/link updates all relevant panels, replacing an R2 object path updates every image consumer, and a photo displays correct captured settings without downloading/parsing image EXIF at runtime.

## 12. Implementation order and scope guardrails

1. **Complete Media / Places / Journeys foundation** and compatibility selectors first.
2. Introduce **Gear catalog** and read-only selectors, migrating existing `gearHighlights` references incrementally.
3. Add manual `capture` fields to **one** Canyonlands media record and render a simple technical-details UI.
4. Add ExifTool-based local extraction and alias matching after the schema/UI is validated.
5. Add R2 upload automation and wider ingestion **last**.

Do not migrate all 92 existing paths just to test this feature. Do not introduce a CMS, database, client-side EXIF parser, or generic ORM. Keep the system static-data-friendly, straightforward for developers, and low-friction for photo publishing.

## 13. Sources / technical references

- Adobe Lightroom Classic metadata basics: https://helpx.adobe.com/lightroom-classic/desktop/organize-photos-in-lightroom-classic/metadata-basics-actions.html
- Adobe Lightroom Classic export metadata controls: https://helpx.adobe.com/lightroom-classic/desktop/export-photos/export-files-disk-cd.html
- Sharp output behavior: https://sharp.pixelplumbing.com/api-output/ (by default image transformations remove metadata)
- ExifTool documentation: https://exiftool.org/

**Design principle:** *One photograph is one reusable media asset; capture metadata describes how it was made, gear IDs identify the equipment, and each story decides how to present it.*
