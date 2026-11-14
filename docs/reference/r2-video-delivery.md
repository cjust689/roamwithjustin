---
id: r2-video-delivery
title: R2 Video Delivery Reference
kind: reference
status: unverified
implementation_state: partial
updated: 2026-11-14
related:
  - media-pipeline
  - video-metadata-pipeline
supersedes: []
superseded_by: []
code_paths:
  - src/content/media
  - src/content/selectors/media.mjs
  - src/components/LocationModal.vue
verification:
  state: unverified
  evidence: []
---

> **Scope note:** Source confirms R2-backed Media resolution and native video
> consumers. Cloudflare dashboard configuration, CORS, caching, and live range
> behavior still require external verification.

# Roam With Justin Atlas — Video Hosting with Cloudflare R2

**Status:** Implementation plan  
**Stack:** Vue CLI + GitHub Pages + Cloudflare R2  
**Goal:** Deliver short, immersive travel videos without embedding Instagram/YouTube players or putting large media files in the Git repository.

## 1. Architecture

```text
DaVinci Resolve / original camera footage
                 |
                 +--> Google Drive (masters / archive)
                 |
                 +--> Optimized MP4 + poster image
                               |
                               v
                        Cloudflare R2
                               |
                 media.roamwithjustin.com
                               |
                               v
GitHub Pages --> Vue Atlas --> Native <video> element
  (app/code)     (metadata)     (R2-hosted file)
```

**Separation of responsibilities**

- **GitHub Pages:** Host the Vue app, routes, and content metadata. No large travel video library in `public/` or Git history.
- **R2 (Standard storage):** Host public, web-optimized MP4s and optionally posters/images.
- **Google Drive:** Retain camera originals and high-quality exports; do not use Drive as a public video CDN.
- **YouTube / Instagram (optional):** Use embeds when the social player or long-form streaming is specifically desirable.

**Key principle:** One Atlas experience has a stable page/URL; its media may be added or replaced without changing the experience URL.

## 2. Recommended bucket and domain

| Setting | Example |
|---|---|
| Bucket | `roamwithjustin-media` |
| Public media hostname | `media.roamwithjustin.com` |
| Video object key | `videos/croatia/split/boat-day/v1/ambient-sunset.mp4` |
| Poster object key | `posters/croatia/split/boat-day/ambient-sunset.jpg` |
| Public video URL | `https://media.roamwithjustin.com/videos/croatia/split/boat-day/v1/ambient-sunset.mp4` |

The names are examples, not resources created for you.

### Set up R2

1. In Cloudflare, open **R2 Object Storage** and enable R2 for the account (billing/subscription setup may be required).
2. Create a bucket, e.g. `roamwithjustin-media`, using **Standard** storage.
3. Upload a small sample `.mp4` via the R2 bucket's **Upload** action.
4. In the bucket's **Settings > Custom Domains**, select **Add** and connect `media.roamwithjustin.com`.
5. The domain must be in the same Cloudflare account as the bucket and configured appropriately in Cloudflare DNS. Follow the dashboard's DNS prompt; don't manually point a CNAME to an `r2.dev` address.
6. Wait for the custom domain to become **Active**, then open the full video URL in a browser to confirm it loads.
7. If you temporarily used the `r2.dev` development URL, disable it once the production custom domain is functioning. `r2.dev` is rate-limited and intended for development.

**DNS caveat:** If `roamwithjustin.com` DNS is not currently managed by Cloudflare, check Cloudflare's domain-zone requirements and supported partial (CNAME) setup before changing nameservers. You do **not** need to migrate the GitHub Pages website itself to Cloudflare.

## 3. Object layout and naming

Organize media by **destination > experience**, independent of social post dates:

```text
roamwithjustin-media/
  videos/
    croatia/
      split/
        boat-day/
          v1/
            ambient-sunset.mp4
            boat-passing.mp4
    netherlands/
      amsterdam/
        canal-cruise/
          v1/
            bridge-passage.mp4
  posters/
    croatia/
      split/
        boat-day/
          ambient-sunset.jpg
  images/
    ... (optional future migration)
```

Use URL-safe lowercase names with hyphens. Avoid spaces. **Version files when replacing them** (`v2/` or a content hash) so long-lived cache entries don't show old footage. Keep experience IDs stable even when media paths change.

## 4. Export settings for ambient clips

Practical starting targets, not rigid requirements:

| Setting | Target |
|---|---|
| Format | MP4 |
| Video codec | H.264 for broad compatibility |
| Resolution | Usually 1920×1080; consider smaller for mobile-only cards |
| Frame rate | 24 or 30 fps; match editorial intent |
| Duration | 4–10 seconds for loops/ambient accents |
| Bitrate | ~2–4 Mbps for simple footage; raise for high-motion scenes |
| Audio | Remove for silent looping backgrounds |
| Poster | Optimized JPG/WebP still at display aspect ratio |
| File optimization | Enable **fast start** / move MP4 metadata to beginning |

Example FFmpeg conversion (adjust input/output and quality to taste):

```bash
ffmpeg -i input.mov -an -vf "scale=-2:1080" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -movflags +faststart ambient-sunset.mp4
```

For handheld scenes, water, trees, and complex motion, test actual visual quality rather than pursuing a fixed tiny file size.

**Do not upload camera originals or Resolve masters to public R2 paths.** They are unnecessarily large and may reveal content intended to remain private.

## 5. Upload workflow

### Simple manual approach (recommended first)

1. Export optimized video and poster from Resolve.
2. Save the high-quality master to Google Drive.
3. Upload the optimized video to the matching path in R2 from the dashboard.
4. Verify object metadata: video should return `Content-Type: video/mp4`; posters should have their correct image content type.
5. Open the public media URL in an incognito/private browser window.
6. Add that URL to the Atlas experience's metadata, then publish the Vue site.

For a handful of updates per week, manual uploads are perfectly reasonable. Add an automated upload pipeline only when repetitive uploads become painful.

### Optional CLI upload later

Cloudflare's Wrangler CLI can upload objects:

```bash
npx wrangler r2 object put roamwithjustin-media/videos/croatia/split/boat-day/v1/ambient-sunset.mp4 --file ./exports/ambient-sunset.mp4 --content-type video/mp4
```

Authenticate Wrangler to your Cloudflare account first. Confirm the installed Wrangler version's flag support before scripting bulk uploads. **Never put R2 API tokens or access keys in Vue client code or commit them to Git.** Public read-only media URLs do not need credentials.

## 6. Vue content model

Keep media provider information in data so the front end is not locked to R2:

```js
const MEDIA_BASE_URL = "https://media.roamwithjustin.com"

export const experiences = [
  {
    id: "split-boat-day",
    slug: "croatia/split/boat-day",
    title: "A Day on the Adriatic",
    publishedAt: "2026-11-13",
    media: [
      {
        id: "ambient-sunset",
        type: "video",
        provider: "r2",
        src: `${MEDIA_BASE_URL}/videos/croatia/split/boat-day/v1/ambient-sunset.mp4`,
        poster: `${MEDIA_BASE_URL}/posters/croatia/split/boat-day/ambient-sunset.jpg`,
        alt: "Sunset light across the water near Split",
        autoplay: false,
        loop: true
      }
    ]
  }
]
```

Use one canonical `experience` record per story/chapter. An Instagram carousel or Reel can link to that experience; its media are not required to duplicate Instagram exactly.

### Native player example

```html
<video
  controls
  playsinline
  preload="metadata"
  poster="https://media.roamwithjustin.com/posters/croatia/split/boat-day/ambient-sunset.jpg"
  width="100%"
>
  <source
    src="https://media.roamwithjustin.com/videos/croatia/split/boat-day/v1/ambient-sunset.mp4"
    type="video/mp4"
  />
  Your browser does not support HTML video.
</video>
```

For a purely decorative/ambient loop, use `autoplay muted loop playsinline preload="none"`, but **only load/play when visible** and offer a pause control or respect reduced-motion settings. Muted playback is generally required for reliable mobile autoplay.

### Performance rules

- Render a **poster image first**; don't eagerly download all video assets represented by map pins.
- Load a video's source when the visitor opens its experience or when its card is about to enter the viewport.
- Use `IntersectionObserver` to start/pause visible ambient clips; stop playback when closing a modal or changing map destinations.
- Avoid multiple simultaneous autoplay videos on a map-heavy mobile page.
- Support `prefers-reduced-motion` by disabling automatic motion or requiring a play action.
- Use `preload="none"` for off-screen clips; `metadata` is fine for a selected player.
- Validate on an actual mobile device over cellular, not just desktop Wi-Fi.

## 7. CORS, caching, and delivery

**Public delivery:** The site can reference an R2 object via its public HTTPS URL. A regular `<video src="...">` does not inherently require fetching through JavaScript or a CORS policy. Configure CORS when the application needs cross-origin JavaScript access, canvas processing, or explicit cross-origin playback behavior.

Example bucket CORS policy for those use cases (adapt origins to the final site):

```json
[
  {
    "AllowedOrigins": [
      "https://roamwithjustin.com",
      "https://www.roamwithjustin.com"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**Important:** Cloudflare's UI and Wrangler can use different JSON formats depending on configuration method/version; use the format shown in the current R2 CORS dashboard/documentation rather than assuming the example above is accepted verbatim.

**Caching:** A custom domain gives you access to Cloudflare caching and rules. Don't assume MP4 files will be edge-cached automatically under default cache behavior; explicitly verify eligibility and caching rules. For immutable/versioned assets, set a long `Cache-Control` lifetime, e.g. `public, max-age=31536000, immutable`, once tested. For unversioned or frequently replaced objects, use shorter lifetimes. Confirm behavior with browser network tools and response headers.

**Streaming limitations:** R2 is **object storage**, not an adaptive-bitrate streaming service. Short progressive MP4s work well; for long films or multiple bitrate variants, consider YouTube or Cloudflare Stream. Test HTTP range requests and seek behavior for your actual files/player.

## 8. Cost model (Standard storage)

As documented in November 2026, Standard storage includes approximately:

- **10 GB-month** storage in the free allowance.
- **1 million** Class A operations/month included.
- **10 million** Class B operations/month included.
- Storage beyond the allowance: **$0.015 per GB-month**.
- No R2 egress bandwidth fee; requests and other Cloudflare products may still generate charges.

These allowances are account-level usage terms, subject to Cloudflare's current pricing and billing rules. Approximate **storage-only** monthly costs after a 10 GB-month allowance:

| Total stored | Estimated monthly storage cost |
|---|---:|
| 10 GB | $0.00 |
| 25 GB | $0.23 |
| 50 GB | $0.60 |
| 100 GB | $1.35 |

For budgeting, monitor actual storage, requests, cache hit rate, and Cloudflare invoice totals. Free allowances and price terms can change.

## 9. Recommended editorial pipeline

The **Atlas and Instagram publish together**, with the Atlas offering deeper context:

```text
Curate photos/reel for Instagram
           |
           +--> Choose experience / chapter in Atlas
           +--> Export selected ambient clip(s) and poster(s)
           +--> Upload optimized assets to R2
           +--> Add location, story, practical details, links
           +--> Publish/update Atlas experience
           +--> Publish Instagram carousel or Reel
                    |
                    +--> Link toward the permanent Atlas experience
```

**Minimum viable experience:** hero image, title, location, short narrative, meaningful gallery, and optionally a single short clip. Extra route details, partners, tips, and media can be added later. Don't delay an Instagram post just because an entire trip isn't documented.

## 10. Implementation checklist

- [ ] Create `roamwithjustin-media` R2 bucket (Standard).
- [ ] Connect `media.roamwithjustin.com` using Cloudflare's custom domain flow.
- [ ] Upload **one** 5–10-second optimized H.264 MP4 and poster.
- [ ] Verify HTTPS public playback and MIME type on desktop and Pixel.
- [ ] Add R2 media provider/base URL to the Vue content model.
- [ ] Implement poster-first, lazy-loading video component.
- [ ] Respect reduced-motion preferences and limit simultaneous playback.
- [ ] Test seek/range behavior, mobile data consumption, and caching.
- [ ] Publish one Instagram post and matching Atlas experience as an end-to-end pilot.
- [ ] Add batch upload/automation later, only if needed.

## 11. Official references

- R2 getting started: https://developers.cloudflare.com/r2/get-started/
- Public buckets & custom domains: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Uploading objects: https://developers.cloudflare.com/r2/objects/upload-objects/
- CORS: https://developers.cloudflare.com/r2/buckets/cors/
- Pricing: https://developers.cloudflare.com/r2/pricing/

---

**Working decision:** Start with **GitHub Pages + Cloudflare R2 (optimized ambient video) + Google Drive (masters)**. Keep the content schema provider-agnostic. Let each Instagram publication expand the Atlas rather than requiring complete trip coverage up front.
