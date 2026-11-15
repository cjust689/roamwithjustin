---
id: video-metadata-pipeline
title: Video Metadata and Gear Pipeline
kind: proposal
status: proposed
implementation_state: none
updated: 2026-11-14
related:
  - media-pipeline
  - gear-system
  - r2-video-delivery
supersedes: []
superseded_by: []
code_paths: []
verification:
  state: unverified
  evidence: []
---

> **Proposal:** Controlled R2 videos and manifest-driven, byte-preserving MP4
> preparation/upload/ingestion exist. No ffprobe/ExifTool ingestion, video
> sidecar normalization, capture-Gear matching, poster generation,
> transcoding, or Behind-the-Shot video UI exists.
> References below to `trips.js` or `atlasData.js` are historical; extend the
> canonical Media registry and selectors documented in
> [Media Pipeline](../architecture/media-pipeline.md).

# Roam With Justin — Video Metadata & Gear Integration

**Status:** Implementation brief for coding AI  
**Scope:** DaVinci Resolve exports → local metadata extraction/normalization → media registry → Cloudflare R2 → Atlas UI  
**Priority:** Implement **after** canonical Media/Places/Journeys architecture and content validation are established. Do not replace those models.

## 1. Goal

Make video publishing as repeatable as photo publishing. A video added to the Atlas should have a stable media ID, an R2 object key, usable technical specifications, optional editorial metadata, and links to canonical gear records. Visitors interested in production can expand a **Behind the Shot** panel, while casual visitors simply enjoy the video.

**Critical distinction:** A finished MP4 usually reliably exposes *delivery* properties (codec, size, fps, duration), **not** the original camera/lens/ISO/shutter/aperture. Resolve's internal clip metadata and tags are **not guaranteed to be exported into the rendered MP4**. Do not infer capture gear from the codec or assume that source-clip metadata survives a multi-clip timeline.

## 2. Fits the existing architecture

Keep these responsibilities distinct:

| Domain | Owns |
| --- | --- |
| `src/content/media/` | Canonical media IDs, R2/local paths, intrinsic technical information, descriptive source metadata, capture/gear associations where known |
| `src/content/places/` | Canonical geographic IDs and coordinates |
| `src/content/journeys/` | Dates, visits, travel order, trip-specific details |
| `src/content/gear/` (or existing canonical gear catalog) | Canonical gear IDs, models, product descriptions, optional affiliate links |
| Future `experiences/` | Story-specific narrative, video sequence, captions, role, presentation options, social links |
| `src/content/selectors/` | Derived Atlas and trip-page view models |

**Do not create a parallel video database, duplicate the media registry, or place gear product details inside each video record.** Existing `trips.js` and `atlasData.js` compatibility exports should continue working during migration.

Instagram and YouTube URLs belong in `socialLinks`/`embeds`, not as owned MP4 objects.

## 3. Three kinds of metadata

1. **Delivery (automatically extracted from final MP4):** duration, dimensions, codec, bitrate, frame rate, audio stream, rotation/orientation, container, file size.
2. **Editorial (optional, from MP4 tags or a sidecar):** title, description, keywords, copyright, publication-ready summary, place ID. Tags in exported MP4s vary by application and container; a sidecar is a reliable fallback.
3. **Capture/production (explicit, validated):** actual camera(s), lenses, drones, profiles (e.g. S-Log3), original resolution and fps, capture date, stabilization, grading notes. This can be **per video** only if representative, or **per shot/segment** when multiple cameras or lenses were involved. Do not invent missing details.

Metadata on a photo export is different: JPEG EXIF often retains camera settings, while an edited MP4 does not necessarily retain its source footage's camera settings.

## 4. DaVinci Resolve workflow

- On the **Media** page, tag and describe source clips in Resolve's Metadata panel. Use consistent keywords for your own organization.
- Keep a naming convention that links an exported edit to its media ID, such as `zion-bike-morning-001.mp4`.
- Export an optimized H.264 MP4 for short Atlas clips, ideally with an appropriate poster image.
- **Verify** whether any desired tags survived export using ExifTool/ffprobe. Resolve project fields are *not* the source of truth for what exists inside the MP4.
- If metadata does not survive, write a small JSON sidecar next to the export. This is the recommended canonical editorial/capture input.
- If a Resolve metadata CSV export is useful, support it as a *future optional importer* with explicit column mapping; don't assume it maps cleanly to timeline exports or finished edits.

Suggested local staging folder:

```text
media-staging/
  zion-bike-morning-001/
    zion-bike-morning-001.mp4
    poster.webp
    metadata.json
```

Example `metadata.json` (values are **illustrative**; do not treat as verified facts about the user's clip):

```json
{
  "id": "zion-bike-morning-001",
  "title": "Morning Ride Through Zion",
  "description": "An early ride through the canyon",
  "keywords": ["zion", "cycling", "morning"],
  "placeId": "zion-national-park",
  "capture": {
    "gearIds": [],
    "notes": "",
    "cameraProfile": null,
    "originalResolution": null
  },
  "rights": {
    "owner": "roam-with-justin",
    "status": "owned"
  }
}
```

`gearIds` intentionally starts empty until the user confirms which cameras/lenses were used. A separate optional `segments` structure can be added later for mixed-camera edits.

## 5. Extract metadata locally, once at publish time

Use **ffprobe** (FFmpeg) for actual stream/container details and **ExifTool** for embedded descriptive/QuickTime/XMP metadata. Both are CLI tools run on the developer machine or in a secure publishing job, **not** in the Vue browser at runtime.

### Inspect delivery streams

```powershell
ffprobe -v error -show_format -show_streams -of json "zion-bike-morning-001.mp4"
```

For a narrower machine-readable query:

```powershell
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,avg_frame_rate,bit_rate:format=duration,size,bit_rate -of json "zion-bike-morning-001.mp4"
```

Frame-rate ratios such as `30000/1001` must be converted carefully. If `avg_frame_rate` is missing or `0/0`, leave it null or use a verified fallback. Rotated video can have coded width/height that differ from display orientation; inspect rotation/display matrix metadata where present.

### Inspect embedded tags

```powershell
exiftool -a -G1 -s -j "zion-bike-morning-001.mp4"
```

Do not assume output fields have consistent names across all MP4/MOV sources. Implement explicit mappings and preserve unknown fields only for debugging.

### Optional MP4 tagging

You *can* write some supported MP4/QuickTime metadata with ExifTool, but **first determine writable tags for the exact file format and ExifTool version**, and verify after writing. Example concept:

```powershell
exiftool -Title="Morning Ride Through Zion" -Description="An early ride through the canyon" -Copyright="Roam With Justin" "zion-bike-morning-001.mp4"
exiftool -a -G1 -s "zion-bike-morning-001.mp4"
```

ExifTool may create an `_original` backup. Metadata write support and tag interoperability vary, especially for keywords. **Do not make embedded MP4 tags mandatory** or the sole source of truth; favor the sidecar for controlled keywords and canonical IDs. Preserve a master copy before modifying a video.

## 6. Proposed media record

Use the project's chosen JavaScript/JSON schema and naming conventions; this is a shape example, not an instruction to create a second schema.

```js
{
  id: "zion-bike-morning-001",
  kind: "video",
  source: {
    provider: "r2",
    key: "videos/usa/utah/zion/zion-bike-morning-001.mp4"
  },
  poster: {
    provider: "r2",
    key: "posters/usa/utah/zion/zion-bike-morning-001.webp"
  },
  intrinsic: {
    mimeType: "video/mp4",
    width: 1920,
    height: 1080,
    durationSeconds: 12.5,
    frameRate: 29.97,
    codec: "h264",
    hasAudio: false
  },
  metadata: {
    title: "Morning Ride Through Zion",
    description: "An early ride through the canyon",
    keywords: ["zion", "cycling", "morning"]
  },
  capture: {
    placeId: "zion-national-park",
    gearIds: [],
    cameraProfile: null,
    notes: null
  },
  rights: {
    owner: "roam-with-justin",
    status: "owned"
  }
}
```

Numbers and capture properties above are **examples only**, not measured facts. Actual intrinsic values must come from the uploaded file. The existing live test video currently uses `videos/usa/utah/zion/zion_bike_morning.mp4`; **do not silently rename the existing R2 object or break its public URL**. Either register that exact key first or perform an intentional versioned migration.

Editorial usage lives with the *experience or journey*:

```js
{
  assetId: "zion-bike-morning-001",
  role: "ambient-video",
  caption: "The canyon before the crowds",
  autoplay: true,
  muted: true,
  loop: true
}
```

The usage data controls display, not the media's intrinsic facts.

## 7. Gear matching

Create or reuse one canonical gear registry; do **not** use product names as foreign keys.

```js
{
  id: "sony-fx30",
  manufacturer: "Sony",
  model: "FX30",
  category: "camera",
  affiliateId: null
}
```

Mapping logic:

- Read source metadata when available; normalize manufacturer/model strings and match against a curated alias map.
- Return `unknown` / `needsReview` for unmapped or ambiguous strings. Never guess the camera/lens based on file name, export codec, or other heuristics.
- Allow explicit gear overrides in `metadata.json`, with documented precedence: **user-confirmed sidecar > verified source-footage metadata > recognized embedded tag > unknown**.
- Don't infer lenses from final focal lengths, and don't attribute a single lens to edits shot on several devices.
- Affiliate links are optional and belong to gear/partner records. Display affiliate disclosures where required.

For a multi-camera film, consider a `gearIds` summary labeled **Equipment used** rather than an exact claim that the entire video was captured on any one camera. Add per-shot mappings only if the payoff justifies the data-entry overhead.

## 8. Suggested pipeline & scripts

Build a small local CLI using Node.js. Implement the simple manual flow **before** R2 upload automation.

```text
DaVinci Resolve export + optional JSON sidecar
        ↓
media:inspect  (ffprobe + ExifTool)
        ↓
media:prepare  (normalize, merge sidecar, verify canonical IDs)
        ↓
review         (show unknown gear/fields; do not fabricate)
        ↓
media:register (update destination-scoped media module)
        ↓
media:upload   (implemented manifest upload; future metadata checks remain)
        ↓
validate-content + existing build
        ↓
Vue Atlas selectors + Behind the Shot UI
```

The `media:inspect` command does **not** exist yet. The current
`media:prepare` command uses the flags documented in Journey media ingestion;
the positional form below remains conceptual metadata-pipeline syntax:

```bash
npm run media:inspect -- ./media-staging/zion-bike-morning-001/zion-bike-morning-001.mp4
npm run media:prepare -- ./media-staging/zion-bike-morning-001
npm run validate:content
```

Implementation guidance:

1. Check whether `ffprobe` and `exiftool` are installed; produce a clear actionable error if missing.
2. Spawn tools with argument arrays (`execFile`/`spawn`), not string-interpolated shell commands.
3. Parse JSON, validate types, and handle missing fields without crashing.
4. Check whether the asset ID exists before writing; never overwrite silently.
5. Normalize keywords (trim/lowercase/dedupe); preserve written titles/captions.
6. Validate canonical `placeId`, all `gearIds`, media type, file existence, R2 path, and duplicate object keys.
7. Read and write registry modules in the project's preferred format; avoid brittle regex insertion into JS files. If programmatic module rewriting is complex, generate a proposed record to paste/review first.
8. Don't commit large exports or credentials to Git. Keep `media-staging/` ignored.
9. For the implemented R2 uploader, keep secrets in the local environment or CI secrets, not Vue frontend variables.
10. Set correct HTTP `Content-Type: video/mp4`; verify public GET/range playback and poster access after uploading.

## 9. Viewer UI: “Behind the Shot”

The media component can expose an optional disclosure, separate from the default playback controls:

```text
Morning Ride Through Zion
[ video player ]

Behind the Shot  ▾
  Equipment used: [only confirmed gear, linked to gear catalog]
  Captured: [known profile/original specs only]
  Delivered: 1080p · 29.97 fps · H.264  [actual extracted values]
  Production notes: [optional]
```

UI principles:

- Don't show empty or speculative metadata.
- Label **Captured** versus **Delivered** explicitly.
- Make the panel expandable so it doesn't distract from visual storytelling.
- Do not automatically expose precise GPS, serial numbers, personally identifying data, or hidden source metadata to public visitors. Generate a **whitelisted** public schema.
- Optimize for mobile and avoid parsing/downloading the full MP4 purely to display its metadata.

## 10. Validation and test plan

**Automatic checks**

- No duplicate media IDs or R2 keys (except intentional aliases, if supported).
- All `placeId`, `gearIds`, and editorial `assetId` references resolve.
- Required intrinsic fields have valid types/ranges; optional fields may be null.
- Media URLs resolve using the existing centralized media resolver.
- Atlas and trip compatibility selectors continue returning the shapes their current consumers expect.

**Manual acceptance checks**

- An MP4 with *no* descriptive tags still imports with delivery specs and blank optional editorial fields.
- An MP4 with recognized tags is imported, with sidecar overrides applied predictably.
- Unknown camera/lens values are marked for review, not silently misidentified.
- A finished edit with multiple cameras is displayed as **Equipment used**, without false per-shot attribution.
- Updating a gear catalog affiliate link is reflected everywhere without changing media records.
- Both desktop and Pixel Chrome play the existing R2-hosted Zion video.
- The existing Utah trip and Atlas remain unchanged until the relevant content is intentionally migrated.

## 11. Implementation phases (small pull requests)

**Phase A — Document schema only:** Confirm Media/Place/Journey and gear contracts; define `intrinsic`, `metadata`, `capture`, `rights`, and editorial usage boundaries.

**Phase B — Inspect and normalize:** Implement `media:inspect` and optional sidecar merger against a local sample MP4; show extracted values and unresolved fields.

**Phase C — Canyonlands/Zion vertical slice:** Register one existing R2 MP4 using its **current** key; show its public data through the centralized resolver and a basic Behind the Shot UI. Use only user-confirmed capture gear.

**Phase D — Publish automation:** Manifest-driven byte-preserving MP4
packaging, upload, checksum receipt, registry update, validation, and dry-run
mode are implemented. Poster generation, metadata enrichment, and optional
deliberate transcoding remain future work.

**Phase E — Optional Resolve CSV import:** Add only if it reduces actual repeated effort.

## 12. Instructions to coding AI

> Implement the video metadata pipeline as an extension of the existing canonical media/content architecture. First inspect the actual repository and current media resolver/selectors. Do not create competing data stores or rewrite unrelated UI. Start with `ffprobe` + ExifTool extraction and an optional JSON sidecar, distinguish capture from delivery specs, and link confirmed equipment to canonical gear IDs. Preserve the live R2 object's existing path and all compatibility exports. Implement one working vertical slice with tests and a dry-run workflow before adding automatic uploads. Do not assume Resolve exports its Media Pool keywords, or that edited MP4s contain original camera settings.

**Definition of done for the first iteration:** An existing MP4 can be inspected locally, normalized into one canonical media record with verified intrinsic specs, displayed from R2 in the Atlas, and optionally enriched with *confirmed* gear details via one shared gear registry—without breaking trip or Atlas views.
