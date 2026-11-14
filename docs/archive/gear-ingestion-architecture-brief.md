---
id: gear-ingestion-architecture-brief
title: Historical Gear Ingestion Architecture Brief
kind: historical
status: archived
implementation_state: partial
updated: 2026-11-14
related:
  - photo-exif-gear
supersedes: []
superseded_by:
  - gear-system
  - gear-ingestion-cli
code_paths: []
verification:
  state: unverified
  evidence: []
---

> **Archived:** The implemented Gear model and CLI are documented in
> [Gear Registry and Journey Usage](../architecture/gear.md) and
> [Gear Ingestion CLI](../reference/gear-ingestion-cli.md). Unimplemented EXIF
> ideas remain in the active [Photo EXIF proposal](../proposals/photo-exif-gear.md).

# Roam With Justin — Gear Ingestion, Journey Linking & Discovery Architecture

**Status:** Proposed design and coding-agent handoff; **planning only — do not modify application code yet**.  
**Purpose:** Make it easy to record gear actually used on a trip, connect it to existing journeys/visits/experiences/media, and have the Atlas render it automatically.  
**North star:** *Remember the item, describe it once, tag the trip, run one command. Never hand-edit several `.mjs` files or rebuild UI for each product.*

## 1. Product intent

The site should answer two different visitor questions:

1. **What did you bring/use on this trip?** From the root journey page, browse a compact, authentic gear overview (camera kit, bags, clothing, snorkeling equipment, footwear, travel accessories). Drill down to what was relevant to a particular place/experience.
2. **What is that thing in the photograph or video?** From a media detail, optionally identify a bag, camera, filter, shoe, etc. visible in the scene. Link back to the same canonical equipment entry. This is **not** the same as the camera/lens that captured the image.

Gear adds practical context to firsthand travel stories; it should never replace the photography or turn the Atlas into a shopping catalog. Support editorial notes such as *why it helped*, *what didn't work*, and *whether you'd bring it again*. Affiliate links are optional, secondary, and disclosed.

### The routine creator workflow

```text
Capture/edit travel material as usual
    +
Remember gear used on USVI trip
    ↓
Create or update one small Markdown/JSON input
    ↓
Run: npm run gear:ingest -- --journey usvi-st-john-2025 --source ./gear-inbox/usvi.md
    ↓
Script validates gear identity, associations and image references
    ↓
Upserts canonical Gear catalog + generated usage records
    ↓
Existing journey / experience / photo selectors resolve gear
    ↓
Journey gear section and contextual "Gear used" links appear automatically
```

**Journey ID is illustrative.** Resolve its actual ID from the live registry; do not create a second journey if the canonical ID differs.

## 2. Respect the current architecture

Read the latest `Roam_With_Justin_Master_Plan_AI_Context.md`, `Roam_With_Justin_Atlas_Asset_Architecture_README.md`, `Roam_With_Justin_Photo_EXIF_Gear_Integration_README.md`, the Lightroom publishing architecture, and the latest monetization/GA4 brief. **Audit the actual repository** first: the most recent asset architecture says Media/Places/Journeys migration is complete and legacy sources were removed. Do not reintroduce `trips.js`, `atlasData.js`, or a second gear/affiliate catalog as a source of truth.

| Concept | Authority | What it owns |
|---|---|---|
| **Gear** | Canonical Gear registry | Stable equipment identity, brand/model/category, description, owned photographs/product visuals, verified links, aliases |
| **Journey** | Canonical Journeys registry | Trip identity, chronology, visit references; gear is associated to journey via separate record |
| **Gear usage / association** | Generated linkage layer | `gearId` ↔ `journeyId`, optional `visitId`, `experienceId`, `mediaAssetId`; context-specific firsthand notes and confidence |
| **Media** | Canonical Media registry | Physical photo/video identity, R2/local source, technical capture info, revisions and rights |
| **Partners/commercial links** | Existing commercial/link model, referencing Gear | Amazon/retailer/brand URLs and affiliate/disclosure status; avoid duplicating relationships |
| **Selectors** | Application selectors | Computed trip-level equipment, per-place/per-story kit, and per-photo related gear |

**Critical model split:** `captureGear` (camera/lens used to MAKE a photo, ideally verified EXIF) is different from `visibleGear` (bag/shoes/etc. SHOWN in a photo) and `journeyGear` (equipment known to have been used on the trip). Do not populate one from another automatically. A bag being seen in one photo does not prove it was used on every day of the journey.

Avoid inserting gear arrays directly into every journey/experience object. A standalone association index is easier to regenerate and query without altering hand-written narratives or curated media layouts. Keep current `.mjs` modules authoritative if that is what the repository uses; **machine-generated JSON can be loaded by a thin `.mjs` adapter**. Do not rewrite arbitrary `.mjs` source with regex.

## 3. Canonical data contracts (proposals — adapt to repository)

### 3.1 Gear item: one reusable identity

```json
{
  "id": "cressi-snorkel-mask-model-tbd",
  "category": "snorkeling",
  "brand": "Cressi",
  "model": null,
  "name": "Cressi snorkel mask (model to confirm)",
  "description": "A snorkeling mask used during travel, pending exact model verification.",
  "image": { "assetId": null },
  "aliases": [],
  "links": [
    {
      "kind": "manufacturer",
      "url": null,
      "label": "Manufacturer",
      "affiliate": false
    }
  ],
  "verificationStatus": "needs-review"
}
```

Illustrative **only**; do not publish this placeholder as a verified item. Gear IDs should be stable and independent of retailers, URLs, images, prices, or journey names. Gear may cover: bodies, lenses, drones, underwater kit, backpacks, luggage, tripods, footwear, outerwear, apparel, batteries, and travel accessories. Use an appropriate category taxonomy without overengineering.

A product photo may be:
- An **owned photograph** registered in Media and referenced by `assetId` (preferred).
- A **manufacturer-provided visual** only if its usage rights and allowed hotlinking/copying are confirmed.
- **No image** (a text/card fallback is acceptable).

Do **not** scrape or download Amazon product images, prices, ratings, or descriptions into R2. Amazon Program Content carries specific licensing and API restrictions. Don't invent an Amazon URL or affiliate tag; a plain verified manufacturer link is acceptable until affiliate setup is real.

### 3.2 Journey/experience usage: context is different from product identity

```json
{
  "id": "gearuse-usvi-mask-001",
  "gearId": "cressi-snorkel-mask-model-tbd",
  "journeyId": "usvi-st-john-2025",
  "visitId": null,
  "experienceId": "st-john-maho-family-day",
  "usageType": "used",
  "evidence": "creator-confirmed",
  "notes": "Used for snorkeling; confirm exact model before linking the product.",
  "wouldBringAgain": null,
  "featured": false,
  "sortOrder": null,
  "mediaAssetIds": [],
  "visibility": "draft"
}
```

Example IDs and statements are not confirmed inventory. `used`, `packed`, `borrowed`, `rented`, `considered`, and `recommended` must not be conflated. For public *What I Used* lists, include only `used`/otherwise explicitly verified statuses. Distinguish `journeyId` (trip scope), `visitId` (actual visit), and optional `experienceId` (editorial story). A journey-wide link means *used at some point during this trip*, **not** *used at every stop*.

`mediaAssetIds` on a usage record may connect a gear item to a specific photo that **depicts the equipment**. An image's EXIF camera gear may be linked separately using existing Media capture metadata. If a photo is merely taken with a camera, do not say the camera is *visible in* the photo.

### 3.3 Link model

```json
{
  "kind": "amazon-associates",
  "label": "View on Amazon",
  "url": null,
  "affiliate": true,
  "verified": false
}
```

This is a template, not a usable outbound link. Affiliate relationships are **per link**, not inherent to the whole product; the same equipment could have a manufacturer link and an affiliate retailer link. Use only URLs the creator supplies or verifies. Omit unverified/null links from public UI. Do not include live prices unless supported by an authorized, compliant fresh product feed.

## 4. Ingestion input: Markdown-first, JSON-compatible

**Recommendation:** Support a friendly Markdown format with YAML frontmatter or fenced `json` payload; normalize both into **one strict internal schema**. Do not let the AI loosely parse arbitrary prose into unreviewed production data. A pure JSON input is also supported for scripted imports.

An example human-editable input file:

```md
---
schemaVersion: 1
journeyId: usvi-st-john-2025
mode: upsert
---

# Gear used on St. John

## Cressi snorkeling mask
- gearId: cressi-snorkel-mask-model-tbd
- category: snorkeling
- brand: Cressi
- model: unknown
- usage: used
- visitId: unknown
- experienceId: st-john-maho-family-day
- imageAssetId: unknown
- website: unknown
- affiliateUrl: unknown
- notes: Used for snorkeling. Verify model and exact story association.

## Camera backpack
- gearId: unknown
- category: bag
- brand: unknown
- model: unknown
- usage: used
- notes: Add only when the actual bag used on this trip is confirmed.
```

All sample items/usage notes are **draft placeholders**, not assertions of trip gear. Never infer that a camera bag known to be owned was carried on a particular trip. Treat `unknown` and blank as **null**, not public text; flag unresolved identity for review. If a gear name ambiguously matches multiple products, stop that item instead of guessing. Encourage `gearId` for updates. Optionally add `mediaAssetIds`, tags, `whyItWorked`, `limitations`, `wouldBringAgain`, and scoped usage notes when known.

**Alternative high-confidence JSON file** (`gear-inbox/usvi.json`):

```json
{
  "schemaVersion": 1,
  "journeyId": "usvi-st-john-2025",
  "items": [
    {
      "gearId": "sony-a7rv",
      "usageType": "used",
      "verificationStatus": "needs-review",
      "notes": "Example only; do not assume this camera was used on St. John.",
      "experienceIds": [],
      "mediaAssetIds": []
    }
  ]
}
```

**Do not publish any example data.** Real input comes from actual creator-confirmed kit and journey evidence. A read-only `gear:list` or `gear:search` command should show existing IDs to make reuse easy.

## 5. CLI contract: simple, deterministic, repeatable

Suggested commands (not implemented yet):

```bash
npm run gear:ingest -- --journey usvi-st-john-2025 --source ./gear-inbox/usvi.md --dry-run
npm run gear:ingest -- --journey usvi-st-john-2025 --source ./gear-inbox/usvi.md
npm run gear:validate
npm run gear:list -- --query cressi
```

The `--journey` argument is an **explicit scope/guard**. If it conflicts with `journeyId` in the source, fail with a clear error; never silently pick one. In source files, unknown IDs should produce a candidate/review report rather than generating plausible but incorrect gear entries. For a well-formed new item with a confirmed exact product identity, a slug can be suggested but should not collide with an existing canonical ID.

**Default mode: upsert, never append blindly.** Running the same input twice should produce no changes the second time. Editing a note or product link should update the correct record without duplicating gear or usage links.

Pipeline:

1. Inspect actual registry shape and current item IDs.
2. Parse Markdown/YAML or JSON; normalize into a single typed structure.
3. Validate input schema, required fields, canonical journey/visit/experience/media IDs, supported link protocols, and ownership/verification status.
4. Resolve gear IDs and recognized aliases; detect duplicate gear identity across different IDs and duplicates inside the input.
5. Generate a human-readable **dry-run diff**: new gear, updated gear, journey usage changes, unresolved references and missing/unsafe imagery/links.
6. On apply, write **only dedicated generated gear and usage files** (or structured canonical modules after an explicit repository audit), via deterministic serialization and atomic file replacement.
7. Run existing `validate-content` + build; on failure do not publish broken content, provide a recoverable error and preserve last-good output.
8. Produce an ingestion receipt (`created`, `updated`, `linked`, `unchanged`, `skipped`, `warnings`) with no secrets in logs.

**Deletion safety:** Omitting an item from a later source file must **not** remove an earlier association. Unlinking is an explicit `--remove` operation or an explicit removal input with dry-run preview. Never delete a shared gear item when unlinking it from one journey. No automatic pruning of R2 images or affiliate links.

## 6. Suggested project layout (adapt to live `.mjs` organization)

```text
src/content/
  gear/
    index.mjs                     # canonical lookup (existing or thin adapter)
    curated.mjs                   # optional hand-maintained gear definitions
    generated/
      items.json                  # generated / upserted gear identity records
      usage.json                  # generated journey/visit/experience/photo links
  selectors/
    gear.mjs                      # joins gear, usage, journeys, media and links

scripts/
  ingest-gear.mjs
  validate-gear.mjs               # can extend existing validate-content instead

schemas/
  gear-input.schema.json          # or existing schema-validation stack

gear-inbox/                         # local creator input; commit if useful
  usvi.md
```

This is **a proposal, not an instruction to replace repository layout**. Prefer existing registered gear structure and validation packages. Avoid two writable sources for the same product. If hand-maintained and generated items coexist, enforce unique IDs and well-defined ownership (which fields may be edited where). Prefer immutable IDs and explicit update rules.

## 7. How the application discovers gear automatically

Keep the pages declarative. Components should not know about the input script or inspect files themselves.

Proposed selector interface:

```js
getGearItem(gearId)
getJourneyGear(journeyId, { includeDrafts: false })
getVisitGear(visitId)
getExperienceGear(experienceId)
getMediaGear(assetId) // { captureGear: [], visibleGear: [] }
```

Selection rules:

- **Journey overview / root trip page:** aggregate all *verified, published* journey usage records; de-duplicate by `gearId`, group by category, show short firsthand notes, optional owned image, and verified outbound links. If gear was used in multiple experiences, show it **once** and allow links to those experiences.
- **Experience and visit pages:** show only gear explicitly connected to that experience/visit, plus deliberately approved journey-level highlights. Do not automatically claim all journey equipment was used at that stop.
- **Media detail:** show verified camera/lens settings from EXIF as **Shot with** and separately show tagged objects as **Featured in this image**. Tagging visible objects is manual/creator-verified or user-approved; **do not use vision inference as fact**.
- **Linking to gear:** clicking an item can open a lightweight detail panel or dedicated gear route; outbound affiliate/brand links remain an explicit second click, not a surprise redirect from the photograph.
- **No gear yet:** hide the section gracefully; no empty cards or bogus product tiles.

### Visual treatment

A restrained **Gear used on this trip** strip or drawer works better than an invasive storefront. Show a small owned thumbnail, equipment name/category, one sentence about why it mattered, and a distinct **View gear** or **Visit retailer** control. The public journey content remains primary. Optional labels: `Used on this trip`, `Photographed with`, `Seen in photo`, `Packed`, `Would bring again`. Avoid all of these unless evidence supports them.

## 8. Automated photo linking and future Lightroom integration

Photo EXIF can reliably identify some camera/lens models **when preserved**, but not all; the existing ingestion pipeline should resolve to the same Gear catalog through curated aliases. A Lightroom Publish Service might later offer a simple **Tagged equipment visible in photo** field or a collection-level association, but **do not make the Lightroom UI a dependency** for this travel-gear importer.

**High-value low-effort flow:** Ingest journey kit in bulk through one Markdown document; let media EXIF automatically populate `captureGear`; selectively annotate only a few hero/gear-focused photos for `visibleGear`. No obligation to tag every photograph. If gear later changes its image, description or affiliate URL, all journey/experience/photo uses reflect that one canonical update.

A future AI-assisted enrichment tool may **suggest** products visible in images, but must never publish a particular brand/model, usage claim, ownership, or affiliate URL without explicit confirmation.

## 9. Analytics and affiliate compliance

The latest analytics/monetization brief calls for **one generic referral tracking pattern**, not one GA4 event per item. Use the existing GA4 integration, with reusable `gear_click` or `gear_outbound_click` as appropriate to the existing convention and one event payload carrying stable `gear_id`, `journey_id`, `experience_id` (if known), `link_type`, and optionally retailer/merchant ID. Do not create hundreds of event names or custom dimensions; avoid sending sensitive information or URL parameters. GA4's automatic outbound `click` may also fire, so don't add both event counts when reporting unique referrals. Confirm actual event naming and field budget with current implementation before adding new events.

Affiliate behavior:

- Never imply a commercial partnership solely because an item was used.
- Only publish genuine, creator-approved affiliate links; no invented Amazon tag, shortened URL or false price/availability.
- Amazon Associates requires a clear sitewide Associate disclosure and sufficiently conspicuous disclosure near affiliate links; exact required language/policy should be reviewed at implementation. 
- Affiliate/paid links should use `rel="sponsored"` as appropriate, with normal safe external-link attributes; ordinary manufacturer/editorial links are not automatically sponsored.
- Do not scrape or cache Amazon product advertising content (including images) outside permitted channels.
- Prefer **original creator-owned photographs** of gear as images.

**Official source checks (review current terms at implementation):**

- Amazon Associates agreement: https://affiliate-program.amazon.com/help/operating/agreement
- Amazon Associates program policies/content licensing: https://affiliate-program.amazon.com/help/operating/policies
- Amazon Associates disclosure guidance: https://affiliate-program.amazon.com/help/node/topic/GPXFHVYZMTGPUMPE
- Google outbound sponsored-link guidance: https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links

## 10. Acceptance tests / definition of done

1. Ingest a confirmed real gear entry for the canonical USVI journey via Markdown, in dry-run mode. No writes or uploads.
2. Apply it: exactly one canonical Gear record and one USVI journey usage record appear; `getJourneyGear()` returns it without hand-editing any journey `.mjs` file.
3. Re-run same input: zero new records and no content diff.
4. Change description/approved retailer URL once: all relevant gear cards update with no per-page edits.
5. Link the same gear item to a second journey: one product identity, two contextual usage records; notes may differ.
6. Link it to one verified photo showing the item: photo detail exposes **Seen in photo**, while photo EXIF camera gear remains distinct.
7. Unknown model, invalid journey ID, missing R2/media asset, or duplicate ID: produce clear validation/reporting; no false published claims.
8. Removing USVI association does not delete the shared product or associations in other journeys.
9. Affiliate and nonaffiliate links have correct disclosures, link attributes and generic GA4 events; no fabricated reviews/prices.
10. Mobile trip page remains editorial-first, loads gear visuals lazily, and hides empty groups; current Atlas/trip views and builds keep working.

## 11. Delivery stages for coding AI

**Phase 0 — Audit only:** Inspect actual `.mjs` registries, selectors, current gear references, `affiliates.js` compatibility, GA4 integration, validation and build tooling. Report authoritative files and minimum needed changes. Do not implement until authorized.

**Phase 1 — Canonical Gear and Usage contract:** Finalize one input schema, stable gear ID policy, association model and gear selector contract; preserve existing manual data.

**Phase 2 — Small ingestion CLI:** Add `--source`, `--journey`, `--dry-run`, idempotent upserts, atomic generated output, useful error messages and validation; prove a single USVI item.

**Phase 3 — Journey UI:** Add one reusable gear section to journey overview; selectors derive content automatically. Validate missing image, no affiliate URL, and 100+ items without a manual UI configuration step.

**Phase 4 — Contextual surfaces:** Add optional experience/visit links and media visible-item tagging; reuse existing EXIF/camera gear panel.

**Phase 5 — Commerce and discovery:** Add approved affiliate links, one generic GA4 gear click event, and optional gear detail routes. Do not add a new CMS/database or product scraper for this.

**Phase 6 — Optional publishing automation:** Once reliable, integrate gear ingest with the existing automated Git/Actions publishing pipeline. Avoid a new Worker or service unless the repository requires it.

## 12. Hand-off prompt for coding agent

> Read `Roam_With_Justin_Master_Plan_AI_Context.md`, the latest Atlas Asset Architecture, Photo EXIF & Gear Integration, Lightroom-to-Atlas Publishing Architecture, and Monetization/Analytics brief. Inspect the actual repository to confirm current `.mjs` content registries, Gear/affiliate model and selectors, validators and build scripts. **Planning pass only:** propose the minimum backward-compatible approach for a `gear:ingest` CLI accepting `--journey` and `--source` (Markdown or JSON), with `--dry-run`, canonical gear upserts and separate journey/experience/media usage links. Gear identity must be entered once and reused across trips; itinerary narratives and manually curated media must never be overwritten. Build the eventual journey gear view from selectors, not per-trip hand-maintained product arrays. Distinguish gear visible in a photograph from gear recorded as the camera/lens that captured it; do not invent actual product usage, images or affiliate links. Use existing GA4 tracking architecture, enforce affiliate disclosures, and make the workflow idempotent. Report proposed file changes, edge cases, and a one-item USVI vertical slice. **Do not edit application code until explicitly told to implement.**

---

### Decisions to confirm during repository audit (not blockers for this architecture brief)

- The actual canonical ID of the St. John journey and whether `Gear` already exists as `.mjs`, JSON, or another format.
- Whether journey data already has a generic placement/index abstraction usable for gear.
- Which pieces of the existing `affiliates.js` are live or legacy compatibility exports.
- Whether the current public gear UI uses `BehindTheShot`, an affiliate page, a generic link card, or none yet.
- Whether the author prefers Markdown list syntax (quick editing) or JSON (strict machine validation); support both through one normalized schema if practical.
