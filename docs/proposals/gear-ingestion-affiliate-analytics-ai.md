---
id: gear-ingestion-affiliate-analytics-ai
title: Roam With Justin - Gear Ingestion, Product Images, Affiliate Links, Analytics and Optional AI
kind: proposal
status: in-progress
implementation_state: partial
created: 2026-11-17
updated: 2026-11-17
related:
  - gear-system
  - gear-ingestion-cli
  - gear-publishing-implementation
  - media-pipeline
  - content-model
  - monetization-analytics
  - gear-affiliate-readiness-2026-11-17
supersedes: []
superseded_by: []
code_paths:
  - scripts/ingest-gear.js
  - scripts/lib/gear-ingestion.js
  - src/content/gear
  - src/content/selectors/gear.mjs
  - src/components/GearGrid.vue
verification:
  state: unverified
  evidence: []
---

# Roam With Justin: Gear Ingestion and Monetization Architecture

**For Codex / implementing agent.** This is a proposal for the remaining Gear
workflow, not implementation evidence. The canonical Gear and Usage ingestor,
selectors, Journey projection, validation, registry-backed Gear page, Partner
link integration, and shared `partner_click` path are implemented and
documented in [Gear registry and Journey usage](../architecture/gear.md). The
generated registry is empty. Gear image publication, a real product slice,
automatic merchant adapters, and optional AI enrichment remain unimplemented.
Review the current source, managed documentation, and actual account and
affiliate settings before editing code. Adapt this proposal to the verified
baseline instead of creating a competing model.

The completed Phase 0 repository decisions are recorded in the
[Gear and affiliate readiness audit](../audits/gear-affiliate-readiness-2026-11-17.md).
Phase 1 is partial: exact custom URLs now fail closed through canonical Partner
and permitted-host validation, `isCustomTracked` maps to one canonical tracking
mode, and public Gear actions reuse existing analytics. No sample product was
fabricated. A creator-owned product image, exact product identity, firsthand
usage, and approved merchant destination are still required for the first real
record.

## 0. Product objective and non-negotiables

Build a lightweight, creator-controlled gear publishing workflow:

1. Supply a **product name**, **one local image or an image URL**, and **one or more product URLs**.
2. Indicate whether each product URL is **already tracked** (`isCustomTracked: true`) or should use an **approved default affiliate rule** (`false`).
3. Let the pipeline download permitted source images, optimize/crop safely, upload to existing media delivery infrastructure, and populate or update **one canonical gear record**.
4. Display a polished, lightweight **Gear card** wherever appropriate: gear directory, editorial trip/experience, packing guide, and verified "How I Shot This" references.
5. Track meaningful, privacy-safe **outbound commerce clicks** through existing GA4 instrumentation; align with the separately managed AdSense program.
6. Optionally enrich draft specifications and copy with **explicitly requested, budget-limited OpenAI-assisted research**; no model call at visitor runtime and no auto-published claims.
7. Support a first-person, independently reviewed gear note or article **based only on genuine hands-on experience**. Never fabricate or mass-post promotional customer reviews to retailer sites.

**Business outcome:** More useful first-party editorial gear content and measurable affiliate/direct-brand referrals, with low operating cost and minimal additional authoring work.

**Design principle:** Gear identity, media identity, editorial usage, merchant destinations, affiliate tracking, and ad inventory must remain **separate concerns** even when presented together in one card.

## 1. Previously documented direction to preserve

The creator's prior design work describes:

- A canonical gear/equipment registry with stable IDs, not duplicate gear names embedded in each trip.
- Canonical Media/Places/Journeys/Visits and selectors; media ingestion/build-time metadata rather than EXIF parsing at page-view time.
- `media:prepare`, `media:upload` and `media:ingest` pipeline plans, with R2-backed public media and generated records; the documented implementation state varies across historical snapshots.
- An optional "How I Shot This" panel that maps verified camera/lens EXIF to canonical gear IDs. Additional gear such as bags, tripods, filters and lighting is editorial/manual, not guessed from EXIF.
- Existing or historical `gearHighlights`, `affiliates.js`, and monetization components requiring compatibility or reconciliation.
- One consistent GA4 installation, `partner_click` for meaningful curated outbound partner/affiliate clicks, and no duplicate conversions when GA4 also emits generic outbound `click`.
- AdSense reserved for substantial public editorial content, not interactive maps, photo cards/lightboxes, or private My Atlas pages.
- A lightweight publishing workflow; the creator should NOT have to hand-edit registries, build variants, upload images and add IDs for every new product.

### Required Phase-0 repository audit

Before implementation, verify CURRENT paths and behavior, not presumed old layout:

- Gear registry shape, existing Gear card(s), gear/detail routes, `gearHighlights`, `affiliates.js`, selectors, existing images and owner/used/researched labels.
- Whether the live repo has a working `media:upload` Worker and real production receipts, and the exact CLI contracts for `media:prepare`, `media:upload`, `media:ingest`.
- Whether canonical media allows a product/gear image with **no Journey or Place association**; do not assign a fake Journey just to satisfy media tooling.
- Existing R2 bucket/CDN/image URL prefixes and image licensing metadata, image optimization utilities, content validator, CI/deployment and managed-docs schema.
- Existing GA4 `partner_click` event and whether AdSense has been approved/enabled; do not create duplicate tags.
- Existing affiliate accounts and **real** Amazon tracking IDs; do not invent a tag or assume an affiliate program is active.
- Current gear content that must not be overwritten by generated summaries.

Output a small evidence-based audit/ADR describing reuse, gaps and the smallest change set.

## 2. Architecture at a glance

```text
Creator: one gear entry (product + image + merchant links + firsthand notes)
                              |
                              v
                  gear:prepare --dry-run
                              |
                validation / duplicate matching
                source and image-rights check
                safe local or HTTPS image fetch
                source metadata + content hash
                optimized card/hero variants
                affiliate URL resolution preview
                optional AI research draft, OFF by default
                              |
                         HUMAN REVIEW
                              |
                              v
                    gear:publish --apply
                     image upload -> R2
                  verified receipt / checksum
                  canonical gear upsert
                  validation + source commit
                              |
                              v
                    existing Vue selectors
                    /      |       \
                Gear cards  Trip use  How I Shot This
                    \      |       /
                     trusted CTA links
                              |
                    GA4 partner_click
                              |
                Amazon / brand affiliate reports

  AdSense: separate manually controlled editorial slots, never card CTAs.
```

Keep this **repository-authored/static-content-friendly**. No new production database, CMS, background image crawler, or public LLM endpoint is needed for the MVP.

## 3. Creator-facing intake: minimum fields

A small local CLI wizard, structured `.json` input, or lightweight developer form are all acceptable. Do not introduce a CMS just for gear.

| Field | Required? | Default/behavior |
| --- | --- | --- |
| Product name | Yes | Human-supplied; verified exact variant/model |
| Brand | Yes | Validated manufacturer name |
| Category | Yes | Camera, lens, drone, bag, tripod, accessory, etc. |
| Image source | Yes for image card | Local file path OR explicit HTTPS source URL |
| Image rights/source | Yes for third-party image | Creator-owned, licensed manufacturer asset, authorized feed, etc. |
| Primary merchant URL | Yes for a shop CTA | Direct HTTPS product URL, NOT search results unless intentional |
| Merchant | Auto-detect + review | Amazon, official brand, other approved retailer |
| `isCustomTracked` | Yes; default `false` | `true`: use URL exactly as provided; `false`: apply supported default program rule, if any |
| Firsthand status | Yes | `owned`, `used`, `previously-used`, `borrowed`, `researched`, etc. |
| Personal notes | Optional | Original experience, why it matters, limitations |
| Short summary | Optional | User-written, or reviewed AI draft |
| Alternate merchant link(s) | Optional | Keep Amazon and official brand options together |
| Featured places/journeys | Optional | IDs resolved from canonical catalogs, not free-text duplication |
| Publishing state | Yes | Start `draft`; explicit review/publish action |

If brand/product already exists, offer **update existing** or **create separate variant**. Do not silently create duplicates based on slight naming differences.

### Example minimal input

```json
{
  "name": "Example SmallRig Camera Accessory",
  "brand": "SmallRig",
  "category": "accessory",
  "imageSource": {
    "type": "file",
    "value": "./gear-inbox/example-product.jpg",
    "rights": "creator-owned"
  },
  "firsthandStatus": "used",
  "notes": "My firsthand observations go here; do not fabricate missing details.",
  "links": [
    {
      "merchant": "amazon-us",
      "url": "https://www.amazon.com/dp/B0ABC12345",
      "isCustomTracked": false,
      "label": "See on Amazon"
    },
    {
      "merchant": "smallrig-official",
      "url": "https://www.smallrig.com/example-product",
      "isCustomTracked": true,
      "label": "Shop SmallRig"
    }
  ]
}
```

**Illustrative placeholder only:** the ASIN and URLs above are not verified real product listings; replace them with actual product variants and verified URLs.

A product can have **multiple distinct merchant links** while retaining one Gear ID and one image. Keep routine entry easy: one link is enough to start, and add more later.

## 4. Canonical records and source of truth

Do not use affiliate URLs or manufacturer page URLs as gear identity. Keep stable, repository-compatible hyphenated gear IDs, such as `smallrig-camera-accessory-model`.

### Proposed canonical gear record

```json
{
  "id": "smallrig-example-accessory",
  "brand": "SmallRig",
  "name": "Example SmallRig Camera Accessory",
  "category": "accessory",
  "model": null,
  "aliases": [],
  "firsthandStatus": "used",
  "imageAssetId": "gear-smallrig-example-accessory-main",
  "summary": "Creator-reviewed, original copy.",
  "experienceNotes": "Creator-authored experience or null.",
  "specs": [],
  "specProvenance": [],
  "links": [
    {
      "id": "amazon-us",
      "merchant": "amazon-us",
      "url": "https://www.amazon.com/dp/B0ABC12345",
      "isCustomTracked": false,
      "linkKind": "affiliate",
      "label": "See on Amazon",
      "status": "pending-validation"
    }
  ],
  "publicationStatus": "draft",
  "sourceFingerprint": null
}
```

### Separate concerns and ownership

- **Gear record:** product/variant identity, brand/category, stable labels, verified specs, genuine use/ownership status.
- **Gear media asset:** source provenance, license/rights, optimized renditions, R2 key, revision, checksum, alt text.
- **Gear-to-trip relationship:** actual equipment used on a Journey/Experience, not just ownership. Never silently assert "used on this trip" from generic gear ownership.
- **Gear-to-photo relationship:** verified camera/lens resolution from EXIF; other accessories from manual additions only.
- **Merchant link:** merchant ID, destination, tracking mode, compliance/commission status; independently editable without replacing gear or image.
- **Editorial review:** original personal review, pros/cons, dates, and approved disclosures; distinct from manufacturer specifications.
- **AdSense:** site-level approved ad slots and policies, entirely separate from gear links or cards.

Honor curated legacy sources. When adding generated gear records, compose them through the existing selector/registry conventions; never replace all curated `.mjs` entries with machine-generated JSON.

## 5. Product image ingestion: local file OR URL

### 5.1 Requirements

1. Source may be a local JPEG/PNG/WebP/AVIF file or HTTPS image URL from a permitted source. A Google Drive download adapter is an optional follow-on, not required for the first vertical slice.
2. Prefer the creator's original **photo of actual gear**. If using manufacturer product photography, require a license/permission basis or explicitly permitted partner/press assets. A publicly reachable image URL is NOT evidence of reuse rights.
3. **Do not scrape, hotlink, rehost or transform Amazon listing images** unless the creator has the necessary program/API rights for that specific use. Amazon Program Content carries separate license restrictions.
4. Fetch images in the **local trusted publishing process**, not directly from the browser at card render time and not from a publicly exposed arbitrary URL-fetch endpoint.
5. For remote sources, use HTTPS, explicit allowlisted hosts or one-time manual approval, max redirects/timeouts/bytes/pixels, content-type and actual file-signature checks; block local/private IPs and unsafe redirects to prevent SSRF, DNS rebinding and resource exhaustion.
6. Reject SVG/HTML/executable data as arbitrary image sources unless a separate secure SVG sanitizer is deliberately adopted. Do not process external scripts or HTML.
7. Preserve original composition and product fidelity. Center/contain products with transparent background where appropriate; don't crop off important grips, controls or accessories simply to force a square card.
8. Strip location, owner, camera serials and unnecessary EXIF from public derivatives. Preserve license/source/credit provenance in the private manifest, not as public source metadata.
9. Generate a deterministic filename/content hash and avoid duplicate R2 uploads for identical bytes/settings.
10. Stage image and URL previews BEFORE publication. Fail the gear import if source rights or image processing remain unresolved.

### 5.2 Proposed derivatives (targets, benchmark on real images)

| Role | Width target | Format | Loading |
| --- | ---: | --- | --- |
| Card thumbnail | 320 px | WebP, fallback if necessary | Lazy |
| Card display | 640 px | WebP, fallback if necessary | Responsive `srcset`, lazy below fold |
| Detail/hero | 960 px | WebP or AVIF where justified | On demand |

Choose output sizes from the existing optimizer and real UI measurements. Suggested card budget: **roughly 35-100 KB** where the image can meet visual quality; this is a test target, not a strict universal limit. Do not increase generated image variants without measured benefit. Images with alpha or small product labels may require different settings.

### 5.3 R2 contract

- Reuse existing media delivery domain (currently described as `media.roamwithjustin.com`) if appropriate for licensed gear assets.
- Scope keys, for example, under `gear/<gear-id>/<contenthash>/<width>.webp`, with revision/receipt semantics compatible with the current media pipeline.
- Maintain immutable source provenance and revision; replacing an image changes the referenced asset revision, not the Gear ID.
- Never put R2 upload secrets in Vue, VUE_APP_ variables or published Git files.
- The upload step must verify expected checksum/receipt before adding published gear references.
- Publishing should update only the appropriate machine-owned gear/media records, not unrelated Journey media placements.
- If the existing `media:prepare` requires a Journey association or writes Journey placements, build a **gear-specific adapter/prepare mode that shares processing/upload helpers**, rather than faking a Journey.
- Preserve curated product hero images until an explicit image replacement is approved.
- Support clean abort/rollback if image upload succeeds but record update fails. Orphan cleanup is a later controlled maintenance operation, not an immediate destructive action.

### 5.4 Proposed manifest

```json
{
  "version": 1,
  "gearId": "smallrig-example-accessory",
  "sourceType": "local",
  "sourceReference": "./gear-inbox/example-product.jpg",
  "rights": { "kind": "creator-owned", "reviewed": true },
  "sourceSha256": "computed-at-prepare-time",
  "derivatives": [],
  "uploadReceipt": null,
  "publishAction": "create-or-update-reviewed"
}
```

## 6. Affiliate URLs: exact custom URLs versus automatic defaults

### 6.1 The creator-facing rule

For **each** merchant link, retain the simple boolean the creator requested:

| `isCustomTracked` | Meaning | Output |
| --- | --- | --- |
| `true` | This URL is already a complete approved tracked URL, or the creator deliberately wants it unchanged | Use the URL **as supplied** after safety/merchant validation. **Do not append, replace or strip its tracking arguments.** |
| `false` | Creator provided a normal product URL and wants the configured merchant-specific default | Apply a **supported, approved merchant tracking rule** where available, otherwise retain an ordinary untracked product URL and signal that no affiliate attribution exists. |

Do **not** append an Amazon Associates tag to a SmallRig, PGYTECH, Tilta or other merchant URL. **One universal query suffix for all retailers is not a valid affiliate system.**

### 6.2 Amazon is reconstructible, with limits

An ordinary U.S. Amazon item link may use a canonical item path plus **your assigned Amazon Associates tracking ID**:

```text
Product:     https://www.amazon.com/dp/B0ABC12345
Configured:  AMAZON_ASSOCIATES_US_TAG=your-approved-tag-20
Resolved:    https://www.amazon.com/dp/B0ABC12345?tag=your-approved-tag-20
```

- An Associates tracking ID is **assigned/approved through Amazon Associates**; it is not a free-form arbitrary slug invented per product.
- Optional additional tracking IDs can be issued/approved through the Associates program for reporting purposes. Do not dynamically tag individual users or private profiles.
- Canonical ASIN paths are useful for a given marketplace and listing, but ASINs/variants and regional marketplaces must be verified; never assume every manufacturer SKU maps to an ASIN in every country.
- Preserve an approved SiteStripe special link **as is** with `isCustomTracked: true`.
- Never append a second `tag` parameter to a URL that already has one; for automatic mode, require a clean canonical Amazon product URL or verified ASIN. Warn on unknown existing affiliate/tracking parameters rather than silently overwriting another party's tracking.
- Amazon short links (e.g. `amzn.to`) may conceal the canonical ASIN; keep an approved SiteStripe shortlink in custom/unchanged mode rather than attempt brittle rewriting.
- Do not obscure the destination with an opaque redirect or violate Amazon linking requirements. Display an explicit "Amazon" destination on the CTA. A future internal `/go/...` redirect must pass a separate Amazon policy review before use.
- Amazon country-specific programs/tags and allowed product types need separate configuration where applicable.

Authoritative reference: https://affiliate-program.amazon.com/help/operating/linking/

### 6.3 Brand and retailer affiliates

For a manufacturer, direct referral rules often use unique issued links, networks, coupons or program-specific query parameters. Do **not** guess the tracking method.

Rules:

1. If there is **no approved program**: use the official URL as a regular editorial link (`linkKind: official`), not "affiliate" and not tracked by a fabricated tag.
2. If the brand supplies a unique tracked link: save it with `isCustomTracked: true` and do not modify it.
3. If a particular affiliate program explicitly supports predictable link generation: add a **merchant-specific resolver** after verifying terms and testing one genuine link; then `isCustomTracked: false` may apply that resolver.
4. Custom tracked does NOT itself prove a commission agreement. Keep a separate reviewed `linkKind`/affiliate relationship flag.
5. Store the **real merchant** and direct destination. Never silently replace a manufacturer link with Amazon or vice versa.
6. Keep program credentials, internal campaign codes and any secret signing keys out of client bundles.

### 6.4 Merchant preference: the TWO-LINK strategy

**Recommended default when both links exist:** show an honest, recognizable "See on Amazon" CTA and a separate "Shop direct at [Brand]" CTA, or editorially choose one primary and the other secondary. Do not force the visitor into the higher-paying merchant.

For the creator's SmallRig / PGYTECH / Tilta audience:

- **Amazon** provides familiar checkout and may convert better for some visitors, but affiliate rates depend on the applicable Amazon product category and program.
- **Direct manufacturer** can create a stronger relationship and may pay better when the creator is an approved affiliate. The merchant may also supply a coupon or track conversions more directly.
- **Brand recognition** usually requires evidence of relevant product views, qualified outbound referrals and eventually confirmed sales/content quality; raw site visits alone do not establish a sales opportunity.

Current public brand program pages observed at proposal time (verify when applying; eligibility and terms change):

| Brand | Published offer observed | Important caveat |
| --- | --- | --- |
| SmallRig | Up to 10% commission advertised | Requires accepted participation; actual program terms and exceptions control. |
| PGYTECH | Program page advertises 10% referral share | Rules address eligible channels and restrict some paid advertising; verify whether your exact public website/channel qualifies. |
| Tilta | 5% commission advertised | 7-day cookie currently described; actual eligibility and terms control. |

Sources: https://www.smallrig.com/affiliate-program ; https://www.pgytech.com/pages/affiliate-program-rules ; https://tilta.com/affiliate-program/

The **primary CTA** may be chosen by creator-approved editorial settings or later controlled tests, **not** by an unverified assumption that a larger commission always yields more earnings.

Suggested performance metric: **net attributed commission per 100 qualified gear-card impressions** (or per 100 outbound clicks), independently by merchant and placement, accounting for reversals and verified affiliate reports. Do not call GA4 clicks sales.

### 6.5 Link resolver contract and example pseudocode

```js
function resolveMerchantLink(link, config) {
  const parsed = new URL(link.url)
  validateHttpsProductUrl(parsed, link.merchant)

  if (link.isCustomTracked) {
    return { url: parsed.toString(), tracking: "provided-unchanged" }
  }

  if (link.merchant === "amazon-us") {
    const asin = extractVerifiedAmazonAsin(parsed)
    if (!asin || parsed.searchParams.has("tag")) {
      throw new Error("Amazon auto-tagging requires a verified untagged product URL")
    }
    if (!config.amazonUsTag) {
      return { url: parsed.toString(), tracking: "not-configured" }
    }
    const cleanUrl = new URL(`https://www.amazon.com/dp/${asin}`)
    cleanUrl.searchParams.set("tag", config.amazonUsTag)
    return { url: cleanUrl.toString(), tracking: "amazon-default" }
  }

  const approvedAdapter = config.merchantAdapters[link.merchant]
  if (approvedAdapter) return approvedAdapter(parsed)

  return { url: parsed.toString(), tracking: "no-approved-rule" }
}
```

**This is pseudocode, not production code.** Validate merchant host allowlists, wildcard/subdomain pitfalls, HTTPS redirect behavior, approved ASIN pattern and actual program rules. Do not remove valid required retailer parameters blindly. Include unit tests for unknown merchants, duplicate tags, shortlinks, malformed URLs, geo domains, expired destinations and mixed tracking states.

## 7. Gear cards and editorial placement

### Gear card (MVP)

- Optimized first-party/authorized image in a fixed, restrained card grid; stable layout ratio and no cumulative layout shift.
- Product name + brand + category.
- One **authentic** short "why I use it" line if available; otherwise a neutral verified summary, not a fake endorsement.
- Relationship indicator where useful: "I use", "Previously used", "Researching", "Recommended based on research".
- One or two clearly labeled merchant links; identifiable destination; paid-link disclosure near affiliate CTA.
- Lightweight alt text and keyboard-accessible links.
- No auto-playing video, third-party product widget or image fetched from retailer on each page view.

### Placement precedence

1. Existing public **Gear** index/directory and optional gear detail pages.
2. Genuine "What I packed" / trip gear strip connected to verified use for that destination/experience.
3. "How I Shot This" photo detail: camera/lens EXIF aliases resolve to canonical IDs; editorial attachments for non-EXIF accessories.
4. Gear-focused articles/reviews with meaningful original photography, original field experience and comparisons.

**Avoid:** inserting affiliate cards over immersive Atlas map pins, private My Atlas maps, personal trip planning, photo lightboxes, or profile-sharing interfaces.

## 8. GA4, AdSense, affiliate reporting and actual revenue

### 8.1 One custom commercial outbound event

Reuse and extend the existing **`partner_click`** taxonomy, after auditing the actual implementation. Proposed parameters:

```js
window.gtag("event", "partner_click", {
  partner_id: "amazon-us",
  link_type: "gear_affiliate",
  placement: "gear_card",
  gear_id: "smallrig-example-accessory",
  merchant: "amazon-us",
  content_type: "gear"
})
```

- All parameters here are public editorial/product information, NOT user identity, personal travel, private itinerary, GPS coordinates, email or login subject.
- Emit exactly one intentional `partner_click` for one qualified action; GA4 may also automatically emit a generic `click`, but **do not sum them as two referrals**.
- Consider which parameters merit GA4 custom dimensions. Unbounded `gear_id` or URL values may lead to high cardinality; retain a compact merchant/category/placement reporting view and use product-level exploration only where practical.
- Track Amazon, manufacturer, affiliate and ordinary official outbound as distinct `link_type`/merchant states. Do not mistake all external links for paid affiliate clicks.
- Do not run site-side click intermediaries that obscure Amazon referrer/destination; track the **ordinary anchor click** via the existing GA4 client.
- If tracking fails or consent is absent, the external link should still open normally; do not force analytics to block navigation.

### 8.2 AdSense is independent

- Do not append affiliate tags to AdSense ad URLs, modify ad creatives, treat product cards as Google ad units, or claim that linking expensive products forces high-CPM ads.
- Existing AdSense script stays centralized; avoid duplicate loaders, manually controlled placements and SPA ad re-initialization bugs.
- If account approval and consent/policy conditions are met, consider one unobtrusive ad **on a substantial public gear guide/article**, not inside an Atlas map, photo card, or authenticated personal planning view.
- Ad requests are NOT equivalent to impressions and affiliate clicks are NOT confirmed purchases.
- Affiliated/paid links should generally use `rel="sponsored"`, plus `noopener noreferrer` for new tabs. Site-wide and near-link disclosures are separate requirements.

### 8.3 Disclosure and verification

- Amazon Associates requires the statement **"As an Amazon Associate I earn from qualifying purchases."** where applicable, and clear disclosures near compensated links.
- Disclose other commission relationships close to CTAs using understandable language, e.g. "I may earn a commission if you buy through these links, at no extra cost to you." Do not claim this statement about a program that is not actually active.
- Sponsored product placement or gifted items require appropriate disclosure; distinguish sponsorship from ordinary affiliate status.
- Follow FTC endorsement guidance, Amazon Associates terms, retailer terms, and consent requirements for any ad measurement.

Sources: https://affiliate-program.amazon.com/help/node/topic/GPXFHVYZMTGPUMPE ; https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking

### 8.4 Partner reporting

A future lightweight partner one-pager should show **measured**:

- Public gear guide/card views, qualified affiliate/brand outbound clicks, click-through rate and source context.
- For manufacturer-specific placements, aggregate outbound referrals to that manufacturer, with actual site/date ranges.
- Actual commission/conversions ONLY when separately reported by Amazon Associates or a brand affiliate network.
- Original first-person reviews, field photos, travel/photography context and suitable audience evidence.

Do not claim "100,000 monthly gear shoppers" based solely on site sessions or high Atlas engagement. A small high-intent audience is more credible than inflated pageviews.

## 9. Optional AI-assisted product enrichment (not required for MVP)

### User-controlled trigger

A local action such as `gear:research --id <gear-id>` may optionally use OpenAI **after** the creator supplies a product name/model and official, permitted source material.

Default: **OFF**. No browser-initiated OpenAI calls, no arbitrary public endpoint, and no automatic daily product-refresh crawl.

### Allowed AI-assisted tasks

1. Extract structured specifications from user-provided manufacturer documentation, official URL content retrieved through an approved mechanism, or creator-provided product sheets.
2. Normalize brand/model names, classify product category and suggest safe `aliases` for Gear/EXIF match review.
3. Generate a **neutral 1-2 sentence summary** grounded only in supplied facts, with per-field source/provenance and unresolved items flagged.
4. Create a draft **review outline** using creator-supplied hands-on observations (pros, cons, use case, travel conditions, what changed their workflow).
5. Suggest comparisons with other **verified** gear from the catalog without claiming the creator tested products they didn't use.
6. Detect factual gaps and request a human decision rather than hallucinating a rating, weight, compatibility, availability, current price or endorsement.

### Forbidden automation

- Never invent first-person testing, ownership, product specifications, price, stock, warranty, product availability, quotes, or affiliate agreements.
- Never scrape retailer HTML or copy protected product images/reviews without permission; do not treat an LLM answer as proof of product data licensing.
- Do not automatically submit AI-generated customer reviews to Amazon or other retailers; do not manufacture independent customer reviews for brand recognition or manipulate review systems.
- Amazon's customer review guidelines prohibit reviews with a financial interest, compensated/incentivized reviews, and promotional links/content. In particular, do **not** insert affiliate links or site promotions into Amazon customer reviews.
- Never publish paid partner endorsements without the creator's review, evidence and disclosure.

### Human-authored / human-verified review path

The preferred growth tool is an **original product review on Roam With Justin**: honest field notes, what went well/poorly, original photographs, context of actual use, clearly disclosed commissions, and a product link. That content can be shared with manufacturer outreach or linked socially.

For an external product-review platform, the creator must actually have used the product, independently verify every claim, avoid affiliate/self-promotional content, and check that retailer's rules about incentives, AI assistance, affiliation and conflicts **before posting**.

Google encourages product reviews grounded in original experience and comparisons: https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews
Amazon customer-review policy: https://digprjsurvey.amazon.com/csad/help/node/GLHXEX85MENUE4XF

### Cost and controls

- Optional local CLI or CI-only enrichment; if a Worker API is used later, protect it with strong admin authentication, fixed model, max tokens and request budgets.
- Enforce a small monthly API spending threshold set by the creator; fail closed when exhausted; log token usage and model cost per enrichment batch.
- Cache by exact product input/source hash and prompt/version; do not re-bill for unchanged data.
- Make all output `draft` with source links and an explicit `needsReview` list.
- OpenAI API billing is independent of ChatGPT workspace credits unless a separate eligible API credit grant is activated. Do not rely on existing ChatGPT credits automatically funding production API calls.

Proposed structured response:

```json
{
  "gearId": "smallrig-example-accessory",
  "proposedCategory": "accessory",
  "specSuggestions": [],
  "neutralSummaryDraft": "",
  "firstPersonReviewDraft": null,
  "sources": [],
  "missingFacts": ["exact model/variant", "verified compatibility"],
  "confidence": "needs-review",
  "readyToPublish": false
}
```

## 10. SEO and honest product discovery

- Give published gear guides/descriptive review pages real first-party writing, original photos and crawlable product links; do not auto-generate thin pages for every purchased item solely for traffic.
- Reuse the actual site's existing SEO/social metadata system, with proper canonical URL, OG image and title when a product detail route truly exists.
- `Product`/`Review` structured data only when content genuinely qualifies. No fake star ratings, aggregate scores, offers, stock status or prices. Prices should be omitted unless legitimately sourced and maintained.
- Don't present general product specifications as personal recommendations. Distinguish "used", "considering", "borrowed", "previously owned" in every applicable display.
- Link useful gear context back to a firsthand experience or "Behind the Shot" explanation; gear cards are a supporting part of the travel story, not a competing storefront.
- Prefer one thoughtful gear guide linking to several products over dozens of auto-generated, near-identical SEO pages.

## 11. Phased implementation plan

### Phase 0 - Audit + narrow data/affiliate decision (no external writes)

- Inspect current code/data and compare this proposal to managed architecture, `media-pipeline.md`, photo EXIF/Gear integration plan and monetization/GA4 plan.
- Inventory what exists and identify stale assumptions (especially upload Worker, Gear record shape and `partner_click`).
- Verify product URL affiliate behavior and permissions for current Amazon Associates account, SmallRig/PGYTECH/Tilta when applicable.
- Record product-image licensing and current assets. Confirm existing gear IDs and images to migrate.
- Publish an implementation note listing confirmed paths, sources of truth, gaps, test commands and any source-rights blockers.

### Phase 1 - Gear record and link resolver (NO R2 required)

- Add one sample gear entry using already licensed image or neutral local placeholder; don't silently change hero images.
- Implement canonical fields, one or two merchant offers, `isCustomTracked`, merchant validation and affiliate default resolver with unit tests.
- Preserve existing gear selectors, trip highlights and legacy affiliate links via compatibility mapping.
- Render new card, verify hover/mobile/accessibility, disclosure and direct links.
- GA4 event emits once per intended partner CTA; no AdSense changes.

### Phase 2 - Image preparation and R2 publication

- Add gear-specific prepare/manifest path reusing existing optimizer/receipt/upload/validation libraries; do not fake Journey association.
- Intake one creator-owned local JPEG and one explicitly authorized remote image URL; verify clipping/alpha, compression, EXIF removal and derivative sizes.
- Require review and dry-run success before external upload. Upload + checksum verify, then idempotently update canonical/generated gear image reference.
- Repeated import of identical content creates no duplicate products/media, and a changed image updates only its intended asset.

### Phase 3 - Authoring orchestration

- Implement a small interactive CLI or file-based `gear:add` / `gear:prepare` / `gear:publish` flow, with full preview and error reporting.
- Auto-resolve existing product aliases, image duplicates and known merchant settings; ask only on ambiguity or rights/variant conflicts.
- Provide a single successful command path while retaining explicit `--dry-run` and `--apply` separation.
- Add managed documentation and developer usage example after actual behavior is verified.

### Phase 4 - Optional AI pilot (manually triggered)

- Pilot one verified item with supplied manufacturer info and creator field notes.
- Strict structured output: fact/source pairs, unknowns and human approval gate.
- Record measured token cost; compare with manual entry. Keep off if net benefit is negligible.
- Allow original review draft for the creator's own site; do not submit customer reviews automatically.

### Phase 5 - Revenue and brand partnership experiments

- Add approved direct brand tracked links alongside Amazon links for a few genuine products.
- Evaluate measured qualified CTR and confirmed commission, separate from GA4 outbound-click counts.
- Build a one-page SmallRig/PGYTECH/Tilta outreach report only when metrics are real and persuasive.
- AdSense on qualifying public gear guides only if account approval, moderation, consent and page quality permit; never force ad inventory into gear cards or Atlas interactions.

## 12. Detailed acceptance criteria

1. A creator supplies one valid local image + product URL and receives a preview Gear card without hand-editing Vue components.
2. A creator supplies an explicitly permitted HTTPS image URL; the publisher downloads, transforms and stores authorized derivative(s), not a browser hotlink.
3. Unauthorized or unknown-rights image URLs are rejected or held pending review.
4. Unsafe/private-address or malformed image URLs do not permit SSRF or unbounded image downloads.
5. Repeated ingestion of the same item/image/source yields the same Gear ID and no duplicate public asset placements.
6. Changed product image produces a reviewed image revision without silently changing the Gear ID.
7. Product cards work on mobile, use a reserved image footprint, and load an optimized rendition without downloading the original source file.
8. Public derivatives contain no private EXIF GPS, camera serial, owner email or local source path.
9. `isCustomTracked: true` uses the exact approved external URL (after safety validation) with no extra tracking parameters.
10. `isCustomTracked: false` with a verified untagged Amazon.com product URL creates **one** valid configured Amazon `tag`, only when an approved US Associates tracking ID exists.
11. Re-running resolution does not add a second `tag` or alter a valid custom SiteStripe URL.
12. An unconfigured Amazon tag does not fabricate attribution. The link remains clearly untracked or is held for review.
13. A non-Amazon untracked brand URL remains unchanged unless an explicitly approved merchant adapter exists.
14. Two offers can coexist (Amazon and official manufacturer) on one product card with distinct CTAs and correct merchant names.
15. An invalid or expired product URL is reported; no broken CTA is silently published.
16. A gear item can be added without claiming the product was personally used on every associated Journey.
17. Photo EXIF gear aliases resolve only to verified camera/lens IDs; low-confidence matches do not silently assign products or affiliate CTAs.
18. An outbound affiliate click triggers one `partner_click` and the link still opens when analytics is blocked/unavailable.
19. Generic GA4 enhanced-measurement `click` and `partner_click` are not summed as independent purchases or unique referrals.
20. Public gear cards and articles display appropriate paid-link disclosure, with Amazon's separate program-required statement when applicable.
21. No AdSense ads appear in MapLibre, private My Atlas, photo lightboxes, gear card controls or user profile sharing.
22. Optional AI output remains draft and source-labeled, never invents usage/prices/ratings, and performs no background visitor-time inference.
23. Amazon/retailer customer review submission is not automated; any review draft uses real hands-on notes and respects platform restrictions.
24. Site still builds, validates and deploys with the existing managed pipeline; no unrelated content model migration is required.
25. Original curated gear/hero/Trip/Atlas behavior stays unchanged for already published content.
26. E2E vertical slice: creator-owned item image + dual offers -> gear card -> GA4 click event -> external merchant landing, with no new database or production AI runtime.

## 13. Risks, gaps and decisions for the implementation agent

| Concern | Required action |
| --- | --- |
| Existing Gear registry may already have fields/ingestion | Audit and adapt in place; do not introduce duplicate model or route. |
| Image assets from online product pages | Require rights source; "publicly downloadable" is not licensing permission. |
| Amazon links have variable parameters/marketplaces | Use verified product variants, approved tags and SiteStripe; no blind string concatenation. |
| Amazon policy on redirects and identity | Prefer honest direct anchors; no hidden link cloak or automatic redirect. |
| Brand affiliate programs differ | Do not invent suffixes for SmallRig/PGYTECH/Tilta; store issued unique URLs, verify channel restrictions. |
| Link flag semantics are too limited | Use `isCustomTracked` for creator simplicity but retain merchant, linkKind, validation status and tracked provenance internally. |
| Existing optimized media requires Journey IDs | Add gear-specific publish adapter; reuse lower-level transform/receipt/upload utilities. |
| Product revision versus editorial history | Stable gear ID, separately versioned image/link/summary; do not overwrite hand-authored notes. |
| OpenAI hallucination or stale specifications | Source-constrained structured drafts, human approval, hard cost caps. |
| External "review for recognition" violates retailer rules | Publish original site reviews; any retailer customer reviews must be independent, genuine and policy-compliant. |
| Performance/CWVs and static hosting | Generate optimized sizes, lazy load, preserve responsive layout, no runtime API fetch per card. |
| Manufacturer referrals vs Amazon conversion | Show both where helpful; measure actual value and user experience; do not promise sales from raw traffic. |
| GA4 privacy and high-cardinality dimensions | Use only public product metadata, register few dimensions, never send private Atlas state. |
| AdSense policy/approval/consent | Keep it separate and disabled on unsuitable or non-approved surfaces. |
| SEO reviews and structured data | Don't mark thin AI descriptions as first-hand reviews or invent prices/ratings. |
| Link-country mismatch and affiliate expiration | Display honest destination merchant and monitor stale links; explicit locale strategy later. |

### Specific Phase-0 questions

- What gear catalog/card components exist today, and which current Gear IDs should be reused?
- Does `media:prepare` already accept gear-purpose images, or does its manifest require Journey association? Can the uploader receive gear keys without changing media-ingestion assumptions?
- Is `partner_click` already implemented? Which taxonomy/schema is current and how is generic GA4 `click` configured?
- Does the owner have an **approved** Amazon US Associates tag? Is the site listed as an approved channel? Are there other regional tags?
- Which manufacturer programs are active/approved, and which supply custom tracked links?
- Can the creator provide original product photos? Which manufacturer image licenses or press kits are genuinely reusable?
- Where should canonical gear records live to avoid two conflicting registries? Which machine-generated files, if any, are already protected from overwrite?
- Does the present site expose gear detail pages with real share/SEO metadata and properly qualified reviews?
- Are current Adsense account, publisher tag and manual placements enabled and approved?
- Is OpenAI API billing configured and is optional enrichment cost worth adding after the manual path works?

## 14. Codex handoff

> Audit the current Roam With Justin source, especially the existing Gear catalog/cards, media pipeline, R2 uploader, GA4 partner-click instrumentation, affiliate links, and managed architecture documents. Use this proposal to implement a **small, safe gear ingestion vertical slice**: one product, creator-owned local image, verified Amazon URL with approved default tag, optional existing brand custom tracked link, canonical record, preview card, upload/ingest using reused components and one GA4 outbound event. Do not create a new CMS, force Journey associations for product images, insert ads into Atlas, invent affiliate accounts, scrape product images, or call OpenAI at visitor runtime. Confirm image rights, affiliate link safety, creator's use claims and all machine-generated content before publication. Proceed to optional remote-image import and AI enrichment only after the first slice passes tests. Update managed documentation and mark implementation state only with verification evidence.

## 15. References (terms may change; recheck during implementation)

- Amazon Associates link/tag requirements: https://affiliate-program.amazon.com/help/operating/linking/
- Amazon Associates program policies, link cloaking and content licensing: https://affiliate-program.amazon.com/help/operating/policies
- Amazon SiteStripe links (tracking ID included): https://affiliate-program.amazon.com/help/node/topic/GJMMT7G4C8K4Y3AY
- Amazon Associates disclosures: https://affiliate-program.amazon.com/help/node/topic/GPXFHVYZMTGPUMPE
- Amazon customer Community Guidelines: https://digprjsurvey.amazon.com/csad/help/node/GLHXEX85MENUE4XF
- SmallRig affiliate program: https://www.smallrig.com/affiliate-program
- PGYTECH affiliate rules: https://www.pgytech.com/pages/affiliate-program-rules
- Tilta affiliate program: https://tilta.com/affiliate-program/
- FTC endorsement/affiliate disclosure guidance: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- Google guidance on high-quality product reviews: https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews
- Google product/review structured data: https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- Cloudflare Workers/R2 pricing: https://developers.cloudflare.com/workers/platform/pricing/

**Proposal only:** No website code, Cloudflare resources, OpenAI accounts, product records, affiliate accounts or Google Analytics settings were changed by this file.
