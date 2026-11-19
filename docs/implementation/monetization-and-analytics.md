---
id: monetization-analytics-plan
title: Monetization, Analytics, and Partner Referrals
kind: implementation
status: in-progress
implementation_state: partial
updated: 2026-11-18
related:
  - monetization-analytics
  - ga4-three-day-improvement-roadmap
  - ga4-tracking-audit-2026-11-17
  - analytics-event-dictionary
  - gear-system
  - gear-affiliate-readiness-2026-11-17
  - adsense-operations
  - lodging-partner-operations
  - affiliate-activation-public-editorial-first-slice
supersedes: []
superseded_by: []
code_paths:
  - public/index.html
  - src/main.js
  - src/router/index.js
  - src/utils/analytics.mjs
  - src/content/commercial-links.js
  - src/components/GearGrid.vue
  - src/components/TravelPlanningOffers.vue
  - src/data/affiliates.js
  - src/config/adsense.mjs
  - src/services/adsense.mjs
  - src/services/expediaBanners.mjs
  - src/components/AdSlot.vue
  - src/views/roam/RoamTripOverview.vue
  - src/features/atlas/config/atlasAdEligibility.mjs
  - src/features/atlas/views/AtlasView.vue
  - src/features/atlas/components/AtlasMap.vue
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/content/selectors/projections.mjs
  - src/content/partners/index.mjs
  - src/views/roam/Privacy.vue
  - scripts/audit-lodging-links.mjs
  - scripts/test-commercial-content.mjs
  - scripts/validate-adsense-config.mjs
  - scripts/test-atlas-ad-eligibility.mjs
  - scripts/test-analytics.mjs
  - scripts/lib/adsense-build-env.js
  - scripts/prepare-pages.js
  - .github/workflows/deploy-pages.yml
verification:
  state: verified
  evidence:
    - npm run adsense:test
    - npm run adsense:validate
    - npm run analytics:test
    - npm run commerce:test
    - npm run lodging:audit
    - npm run content:validate
    - npm run atlas:test
    - npm run docs:audit
    - npm run lint
    - npm run build
    - Pull requests 101 and 102 passed required validation; GitHub Pages run 44128602408 deployed main merge 8add555205dcd23314c0e11e1f0a2b4d1038fd54
    - The live application bundle contained the atlas_open_clicked and partner_click event contracts
---

> **Implementation status:** GA4 now uses one production-host-only adapter, a
> strict public event dictionary, and canonical Partner click tracking. The
> safe default preserves Enhanced Measurement page views, while a tested
> manual Vue Router mode awaits a coordinated GA4 data-stream setting change.
> Private My Atlas routes are excluded.
> The first AdSense phase is implemented as a disabled by default,
> manually placed story unit with configuration validation, ads.txt generation,
> a public privacy notice, and the owner supplied publisher verification meta
> tag. A second, independently disabled guided Atlas unit is implemented with
> content eligibility and a one-request-per-Journey-tab cap. Live account
> values and dashboard state remain externally controlled. Additional partner
> placements and the later editorial commerce work remain. See the
> [as-built analytics document](../architecture/monetization-and-analytics.md)
> and [AdSense operations guide](../reference/adsense.md).

### Public affiliate activation implementation result, 2026-11-17

- [x] Promoted every current Journey lodging URL into one canonical lodging
  Partner and replaced duplicate Journey URLs with stable `partnerId`
  references.
- [x] Added a lodging inventory command with readable and JSON output. It
  validates six stays, their stable tracking slugs, and their website or
  reviewed directory URLs. It separately identifies the published `La Fortuna
  Airbnb` Experience as requiring an exact owner-supplied URL before it can be
  promoted into structured lodging.
- [x] Added two Expedia commercial offers to the existing Partner registry
  using the exact owner-supplied campaign reference and unique Utah stays and
  flights Pubrefs.
- [x] Added one disclosed public Utah Journey planning block. It loads the
  fixed Expedia script only after explicit visitor activation and retries
  without retaining a duplicate loader. A compatibility adapter invokes the
  provider's one-time DOM ready callback when the visitor loads it after the
  page is already ready.
- [x] Reused `partner_click` for lodging and observable direct Partner actions,
  with stable Partner IDs and public Journey context. Expedia banner actions
  remain inside provider-controlled cross-origin iframes and use their exact
  campaign reference plus unique Pubrefs instead of fabricated local click
  telemetry. No full outbound URL or private My Atlas data enters the custom
  event.
- [x] Added factual Expedia script behavior to the public privacy notice.
- [x] Promoted through protected pull requests 123 and 124. Feature,
  `develop`, and production checks passed. Pages run `44210436840` deployed
  production merge `898d801`. The first post-deployment activation check
  correctly found that the provider script downloaded but left the banners
  empty because its DOM ready listener was registered after the page was ready.
- [x] Corrective pull requests 125 and 126 passed feature, `develop`, and
  production validation. Pages run `44213345541` deployed production merge
  `37761c8`. A new isolated live-browser session verified zero Expedia requests
  before activation, one exact provider script after activation, two visible
  `728x90` provider iframes, campaign reference `1101l6yKm4`, distinct stays
  and flights Pubrefs, and no loading error.
- [ ] Owner review of the disclosure and privacy copy.
- [ ] Verify final Expedia destinations, Pubref attribution, program
  eligibility, and commissions in the provider dashboard. Verify direct
  lodging `partner_click` events separately in GA4; cross-origin banner clicks
  are not locally observable.
- [ ] Complete mobile, desktop, keyboard, and screen reader QA on the deployed
  public Journey.

### Gear commercial-link reconciliation, 2026-11-17

- [x] Reused canonical Partner IDs and the existing `partner_click` event for
  Gear instead of introducing Gear-specific merchant or analytics systems.
- [x] Added one shared commercial parameter builder for Journey partners,
  lodging, the Gear catalog, and canonical Journey Gear actions.
- [x] Added optional public `gear_id` context while keeping URLs, tokenized
  query strings, private My Atlas state, and free-form copy outside analytics.
- [x] Made affiliate Gear ingestion fail closed on missing Partner identity,
  affiliate relationship, explicit tracking mode, permitted public surface,
  or permitted destination host.
- [x] Preserved complete `custom` URLs unchanged and rejected
  `approved-rule` input when no provider-specific Gear resolver exists.
- [ ] Add a real product only after exact identity, firsthand usage, original
  image rights, and an official or approved tracked destination are supplied.
- [ ] Implement the separate Gear image prepare, receipt, upload, and publish
  adapter. The current supported media command remains Journey-bound.
- [ ] Verify one rendered Gear action and exactly one consent-allowed
  `partner_click` in a deployed browser session and GA4 DebugView.

### GA4 roadmap implementation result, 2026-11-17

- [x] Removed unconditional HTML-shell initialization and moved the single
  loader into a production-host-only adapter.
- [x] Preserved automatic Enhanced Measurement as the safe default and added a
  tested manual router mode whose page locations retain only allowlisted
  `utm_*` campaign fields.
- [x] Disabled production-property collection on localhost and unrelated
  hostnames by default. Added explicit QA enablement, DebugView mode, and a
  browser opt-out key.
- [x] Excluded `/my-atlas` routes and private planning state from this GA4
  phase.
- [x] Replaced the separate homepage discovery surface with direct root Atlas
  entry and one feature-gated My Atlas action in the Atlas toolbar. Journey
  guides remain discoverable inside the Atlas.
- [x] Added allowlisted Atlas entry, load, Journey, destination, story, Maps,
  and canonical Partner actions without map movement telemetry.
- [x] Removed hostname-derived GearGrid events, full outbound URL parameters,
  and mutation of third-party links with incoming campaign UTMs. Canonical
  Gear Partner actions now reuse the shared strict event contract.
- [x] Added a repository tracking audit, event dictionary, and automated
  adapter tests.
- [ ] Choose one page-view owner. Keep automatic mode, or first disable
  Enhanced Measurement's browser-history page views and then deploy
  `VUE_APP_GA4_PAGE_VIEW_MODE=manual`.
- [ ] Deploy and reproduce the expected navigation trace in browser network
  tools and GA4 DebugView.
- [ ] Confirm Enhanced Measurement, timezone, hostname and internal-traffic
  filters, consent requirements, and custom dimensions in the owner account.
- [ ] Apply consistent incoming UTMs to future Meta and Instagram campaigns,
  then establish a fixed session-based baseline before comparing results.
- [ ] Configure a production 200 rewrite for direct SPA routes. The GitHub
  Pages `404.html` shell remains a routing limitation, not an analytics claim.

### Phase 1 implementation result

- One responsive placement may appear after the full itinerary on a published
  Journey with at least three chapters.
- One separately disabled Atlas placement may appear below editorial stop
  content after three distinct guided arrivals on a published, media-rich
  Journey. A browser-tab session reservation prevents per-stop refreshes.
- There are no placements on the Atlas root shell, map canvas, markers, free Atlas
  exploration, incomplete Journeys, story heroes, location cards, galleries,
  lightboxes, videos, dialogs, navigation, or footer.
- The shared loader is added only when the eligible unit mounts and is never
  duplicated. The component does not refresh ads or track their interactions.
- The root HTML shell exposes the owner supplied publisher ID through Google's
  supported verification meta tag without loading advertising JavaScript.
- Live activation fails closed unless privacy readiness and Auto ads being off
  are explicitly acknowledged alongside valid client, slot, and ads.txt data.
- Account approval, Auto ads, consent management, Brand safety settings, and
  production serving remain externally unverified owner actions.

# Roam With Justin — Monetization, Google Analytics 4, AdSense & Partner Referral Plan

**Purpose:** Working product brief and implementation prompt for Codex in VS Code, covering scalable GA4 referral analytics alongside existing AdSense and editorial monetization  
**Website:** `https://roamwithjustin.com`  
**Prepared:** November 13, 2026  
**Owner's intent:** Generate revenue without compromising a cinematic, beautiful, interactive travel-photography website.

> **Instruction to Codex:** Read this document alongside the site's existing source code and [travel context](../reference/travel-context.md). Inspect the repository before making architectural decisions. Implement the first practical, maintainable phase, rather than creating an unnecessarily complex monetization platform. Preserve the visual identity and map experience. **Do not invent product ownership, endorsements, affiliate arrangements, venue relationships, prices, or technical credentials.**

---

## 1. Executive intent

Roam With Justin is not meant to become a conventional blog cluttered with display ads. It should feel like a premium, interactive travel publication: a cinematic map, photographer-led stories, original photographs and videos, and useful details about hotels, restaurants, excursions, and locations actually experienced.

Social media is the discovery layer; the website is the destination. Revenue should emerge naturally from visitors exploring travel experiences, learning what was used to create an image or complete a trip, and finding trusted recommendations.

### The monetization order of preference

1. **Premium first-party editorial commerce:** Thoughtfully designed, clearly disclosed product/gear recommendations and affiliate links connected to firsthand travel and photography experiences.
2. **Venue and experience referrals:** Official booking links and potential referral/affiliate agreements for hotels, tours, dining, and activities.
3. **Direct partnerships:** Paid featured experiences and image/video licensing, transparently labeled where sponsored.
4. **Selective Google AdSense display units:** A small number of explicitly placed advertisements in content-rich, non-interactive areas.

**Important distinction:** Google AdSense does **not** let a publisher choose only expensive Sony cameras, outdoor apparel, travel luggage, or luxury hotels as the ads displayed. The auction, advertiser demand, page context, viewer signals/consent, and Google's policies affect the actual creative. The price of an advertised item does not translate directly into a percentage of the sale for the publisher. To feature specific premium products predictably, use **clearly disclosed, editorial affiliate/product modules or direct paid partnerships**, not AdSense targeting tricks.

### Nonnegotiable design goal

**Monetization must feel subordinate to the photography and experience.** If an ad or commerce module visually degrades the atmosphere, blocks interaction, or makes the site feel like a coupon blog, do not ship it.

---

## 2. First task: audit the existing site

Before editing code:

- Identify framework, layout structure, router, rendering strategy (SSG/SSR/SPA), hosting, content model, and page templates.
- Find all existing Google AdSense script references and ad-unit placements. The owner **already has a Google-provided AdSense script**. Do **not** create a new publisher ID, overwrite the given code, or load it multiple times.
- Check whether the AdSense script is in the shared document head or duplicated across individual page components. **It should normally be loaded once per full document**, with correct page coverage. If the site has multiple independently rendered HTML pages, ensure those pages receive it through their shared template as appropriate.
- Identify content-rich routes versus immersive application surfaces: home/hero, world atlas, destination guide, story, venue experience, photo gallery, equipment/packing guide.
- Audit meta tags, canonical URLs, crawlability, structured data, robots/sitemap, image metadata, and performance.
- Inspect existing **Google Analytics 4 (GA4)** installation, measurement ID, routing/page-view behavior, Enhanced Measurement, event handlers, and consent tooling. The owner reports that GA4 is already collecting traffic and outbound clicks; **reuse the current installation** rather than adding a duplicate tag or creating a new property.
- Determine which external links are ordinary `<a href>` anchors versus programmatic `window.open`/router handlers. Inventory venue, charter, lodging, affiliate, maps, social, and general outbound links. Distinguish commercially relevant partner/gear links from other external navigation.
- Inventory existing content/media and identify what is real, what is confirmed firsthand, and what is placeholder content.
- Provide a short plan and implement a bounded vertical slice. Do not refactor unrelated site architecture.

**Cannot be resolved by code alone:** Whether **Auto ads** are enabled is controlled in the owner's **AdSense dashboard**. The owner should visit **AdSense → Ads → [site] → Edit** and switch **Auto ads OFF** for maximum manual-placement control. If Auto ads must remain on, configure excluded pages/areas and disable disruptive overlay formats (e.g. anchors/vignettes), but exclusions for in-page ads do **not** necessarily stop overlay formats. Do not assume that simply omitting manual ad units prevents Auto ads when an AdSense script is present.

---

## 3. Ad placement strategy: premium, not intrusive

Use **manual AdSense ad units** only where the page has substantial original content and where an ad does not interfere with the user's main task. The existing site-wide AdSense script is not itself a manually positioned ad unit; manual placement requires the distinct ad-unit markup/slot IDs provided in AdSense.

| Surface                                      | Initial policy                                                                                       | Why                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Atlas root entry shell                       | **No Google display ads**                                                                            | Preserve the immediate exploratory entry and visual brand.                                                |
| Interactive globe / 3D MapLibre atlas        | **No ads on the map or controls; one optional gated unit inside rich guided-stop editorial content** | Preserve exploration, require three distinct guided arrivals, and cap requests to one per Journey and tab. |
| Hover photo pins / location previews         | **No Google display ads**                                                                            | Pins/cards are interactive navigation, not ad inventory.                                                   |
| Photo lightboxes, video players, galleries   | **No Google display ads**                                                                            | Respect the art and avoid obscuring controls/media.                                                        |
| Destination editorial guides                 | **Up to 1–2 intentional display placements initially**                                               | Natural, content-rich reading breaks; measure impact.                                                      |
| Longform travel story / detailed trip report | **1–2 optional placements**                                                                          | Insert between narrative sections, not within critical actions.                                            |
| Individual venue / booking profiles          | **Generally none at launch**                                                                         | Prioritize a genuinely useful venue profile, official links, and clearly disclosed sponsorships.           |
| Packing list / photo gear field guide        | **Optional 1 carefully placed unit**                                                                 | Affiliate/editorial product modules will likely be more useful here.                                       |
| Footer of a long article                     | **Optional single placement**                                                                        | Lower interference than in the hero or navigation.                                                         |

### Creative boundaries

- Place ads in a dedicated, spacious region of the article grid. The overall container can share the site's background and spacing, but **do not camouflage an ad as a photograph, clickable destination card, recommendation, or part of the map**.
- Distinguish ads from editorial content; a subtle but legible **Advertisement** label may help where appropriate. Never replace or suppress Google's own disclosure labels.
- Do not place ad units next to a map pin, gallery arrow, carousel interaction, booking button, download button, or another element that might generate accidental ad clicks.
- Never put AdSense into popovers, modals, expanding cards, floating map layers, or any overlapping content.
- Do not obscure ad creatives or edit the ad contents, code, or click behavior. Advertisers control their creative, so **placement aesthetics** are controllable; **creative aesthetics** are not fully controllable.
- Use responsive ad units according to Google's guidance and reserve sensible layout space to avoid cumulative layout shift. Avoid forcing unsupported sizes or hiding live ad units outside documented responsive approaches.
- Prioritize readability, mobile behavior, and low ad density. Do not place an ad above substantial page content just to chase impressions.
- Respect ad blockers, failed requests, and missing fill: no broken/ugly placeholder UI in normal production. Handle empty states without overlaying unrelated content.
- **Do not artificially refresh ads, simulate page views, create accidental clicks, or programmatically interact with Google ad creatives.**

### Suggested initial placement names (illustrative)

- `destination-guide-inline-1`
- `destination-guide-end`
- `travel-story-inline-1`
- `gear-guide-inline-1`

These are **internal names**, not actual Google ad-unit IDs. Reuse existing valid slots if available. Request actual ad-unit code from the owner where missing; never fabricate IDs.

### Tech implementation notes

- Create a small **`AdSlot` component** (name adapted to the existing framework), if appropriate, for manual ad placements.
- Keep the loader centralized, load once, and avoid duplicate initialization across route changes or remounts.
- For SPA route transitions, respect Google's supported ad-unit lifecycle rather than naively rerunning `adsbygoogle.push` against an initialized element. Test under development, production, client-side navigation, and browser Back/Forward. Do not invent unsupported behavior.
- Only initialize ads when necessary and in a consent-compliant manner. If consent tooling is not implemented, document the gap instead of pretending the site is compliant.
- Use feature flags / config such as `adsEnabled` and placement names to support staging, A/B tests, and full rollback without branching over many components. Configuration should not create a way to circumvent consent or policies.
- No actual AdSense ads in development if the real account cannot safely serve them there. Use neutral placeholders labeled as mock previews in a development-only mode, with no fake revenue/click events.

---

## 4. Premium commerce: what visitors actually want to discover

The owner wants relevant **apparel, travel footwear, luggage, equipment, photography gear, camera accessories, and premium travel services** in addition to destination recommendations.

The strongest concept is **"What made this experience possible?"** instead of a generic "Shop" tab. Allow products to emerge from genuine content:

| Travel content             | Useful editorial commerce                                                | Design idea                                                            |
| -------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Croatia boat excursion     | Camera/lens used, waterproof bag, sunwear, travel kit _if actually used_ | Small `Behind the Shot` expansion after gallery/story.                 |
| Utah / Moab photo trip     | Camera support, footwear used, outdoor gear, packs, filters              | `What I packed for this landscape` with concise why-it-mattered notes. |
| Amsterdam city photography | Compact walkaround setup, camera bag, walking accessories                | `My city walk kit` in a side panel or article section.                 |
| Morocco travel story       | Travel packing choices, camera/lens, weather/comfort gear                | `Travel essentials for this day` after the narrative.                  |
| Camera/photo tutorial      | Body, lens, support gear, capture settings and tradeoffs                 | `How I captured it` gear + settings card.                              |

**Only present firsthand claims for gear and venues actually used.** If a product is merely a potential purchase, a researched alternative, or an item considered but not owned/used, label that clearly. Price, stock, warranties, specifications, and eligibility change: only show live details when a legitimate product feed or API supports them and its terms permit it. Otherwise show plain product names and retailer links without unsupported prices.

### Real gear context to verify against repository and owner's assets

Previous project context indicates the creator uses or has used equipment in these families; **confirm current ownership and exact trip usage before publishing specific reviews or gear lists**:

- Camera bodies: Sony A7R V; Sony FX30; Sony A6500 for some underwater work.
- Lenses: Tamron 35–150mm f/2–2.8; Sony 20–70mm f/4; Sony 24mm f/1.4 GM; Sony 90mm macro; other Sony/Tamron/Sirui lenses.
- Drones/action cameras: DJI Air 3; Mini 5 Pro; Avata 2; Action 5 Pro.
- Supports and production: Peak Design tripod; SmallRig carbon monopod; DJI RS-series stabilizer; DJI Mic 2 and portable video lighting.
- Bags: PGYTech OneGo 16L and related travel/camera bags.

This is **context to validate**, not authority to state "I used this in Croatia" or imply a current affiliate partnership.

### Four premium editorial components to build

1. **`BehindTheShot`** — From a photograph to camera, lens, settings, conditions, and a short storytelling note. Include an appropriately disclosed affiliate link when enabled.
2. **`WhatIPacked`** — A compact, photography-first travel packing strip connected to an actual trip. Separate clothing/footwear, camera equipment, and travel essentials.
3. **`ExperienceProvider`** — The venue, hotel, tour operator, guide, or booking partner associated with an event. Include your photograph, verified contact links, and practical notes.
4. **`GearGuide`** — An optional full editorial page comparing only gear actually tested (plus alternatives clearly presented as researched, not personally tested). Explain why a product mattered and its limitations.

All components must fit a high-end visual system: restrained typography, beautiful spacing, original imagery, native-feeling animations, and obvious but unobtrusive calls to action. **Do not design fake AdSense units to mimic these product modules.** They are separate, owner-controlled editorial/affiliate components.

---

## 5. Data model: simple, explicit, reusable

Adapt the current schema rather than creating a database migration just for monetization. The following is a _concept_, not a mandatory implementation:

```typescript
type CommercialLink = {
  id: string
  label: string
  url: string
  kind: "official" | "affiliate" | "booking" | "maps" | "phone"
  merchant?: string
  disclosure?: string
}

type GearItem = {
  id: string
  name: string
  category:
    | "camera"
    | "lens"
    | "drone"
    | "bag"
    | "footwear"
    | "apparel"
    | "accessory"
  image?: string
  firstHandStatus: "used" | "owned-not-used-here" | "researched"
  whyItMatters?: string
  links: CommercialLink[]
}

type ExperienceCommerce = {
  experienceId: string
  gearIds?: string[]
  operatorLinks?: CommercialLink[]
  paidPlacement?: boolean
  disclosure?: string
}
```

Guidelines:

- Use meaningful IDs shared with existing trip/destination/experience data.
- External destinations must be verified; links should fail gracefully if absent.
- Keep advertising units distinct from `GearItem` or `ExperienceCommerce`.
- Use `rel="sponsored"` for paid/affiliate links where appropriate, and `noopener noreferrer` for external new-tab links; do not mechanically add `nofollow` to every ordinary editorial link.
- Store no secrets in frontend TypeScript. AdSense publisher/slot IDs are public identifiers; **affiliate private API keys and secret tokens are not**.
- Avoid unnecessary helper frameworks and abstraction layers.

---

## 6. High-quality SEO and contextual relevance

Technical SEO should make the site's **actual first-person travel, photography, and gear context** clear. This helps people find useful pages and may help search engines and ad systems understand the site's content. It is **not** a guarantee that specific high-paying advertiser categories will appear.

### Pages should stand on their own

Interactive maps may retain visitors, but indexable, shareable story and guide pages need **actual useful HTML content**. Do not rely on WebGL to convey all location information. Evaluate static generation or SSR/prerendering when compatible with the stack, especially for canonical destination/experience pages.

Example page families (create only if content exists):

- `/destinations/croatia/split` — firsthand Split destination guide.
- `/experiences/croatia/raptor-experience` — verified boat-trip story with provider and route details.
- `/destinations/utah/moab` — real photography locations and practical travel notes.
- `/gear/what-i-packed-for-utah` — actual travel kit, tradeoffs, weather/comfort needs.
- `/photography/behind-the-shot/...` — story and technique behind one original photograph.

### Code-level improvements to audit / implement

- Distinct page titles, natural meta descriptions, canonical tags, share imagery (`og:image`), and Twitter/X card metadata.
- Accurate heading hierarchy and descriptive text near photography and media.
- Contextual internal links across destination → experience → behind-the-shot → relevant gear page, and back to map.
- Crawlable `<a href>` links for substantive pages, not only click handlers on a WebGL surface.
- Sitemap and robots configuration aligned with actual public URLs.
- Relevant JSON-LD for `BlogPosting`/`Article`, `BreadcrumbList`, `Person`, and place-related pages where supported by accurate content; use `Product` or `Review` schema only when the page genuinely meets Google's requirements. **Do not invent reviews, ratings, prices, or availability.**
- Media optimizations: responsive image sizes, lazy loading below the fold, meaningful alt text, poster images for video, sensible preloading, and no automatic download of all atlas media.
- Strong real-world usefulness: actual photography settings, weather/conditions, logistics, who the experience is for, things that surprised the traveler, what was worth paying for, and what would be done differently.

### Avoid manipulation

- No keyword stuffing like `premium camera travel hotel drone luxury hiking boots` in hidden fields or page metadata.
- No mass-generated thin gear pages based only on advertiser categories.
- No fabricated first-person reviews or fake ownership claims.
- No hiding text from people to influence ad targeting.
- No misleading search snippets, affiliate links, or commercial claims.

---

## 7. Sponsorship, referral, affiliate, and disclosure model

These are **separate products** with separate economics:

### A. AdSense (Google-sold display inventory)

- Owner controls broad placement choices, ad formats and some brand-safety exclusions.
- Google primarily determines which eligible advertisements actually serve.
- Owner earns ad revenue that depends on traffic, demand, region, content, ad fill, and viewability.
- Brand-safety controls can exclude categories or advertiser URLs, but cannot guarantee only aesthetic, travel-focused, premium-looking ads.

### B. Affiliate links (owner-curated products/services)

- Link to a **specific** camera, lens, bag, clothing item, tour, or booking site through a valid, approved affiliate program.
- Revenue comes from eligible conversions under the program's terms, not merely from a high product list price.
- Use direct, visible disclosure close to the relevant recommendations, such as: **"Some links in this guide are affiliate links. I may earn a commission if you purchase through them, at no additional cost to you."** Customize based on the actual arrangement.
- Do not imply every link is affiliated when it is not; do not claim affiliate status until approved.

### C. Direct featured placement or licensing

- Paid venue feature, destination spotlight, production/content licensing, or referral arrangement.
- Clearly label material paid relationships (e.g., `Sponsored experience`) while keeping opinions and factual information accurate.
- Treat photography licensing and website placement as distinct rights/revenue streams in contracts.
- Consider a later admin/reporting view for business partners only after meaningful traffic exists.

---

## 8. User flow and visual monetization opportunities

**Example visitor journey:**

1. Discovers a Croatia reel on Instagram.
2. Opens the Split experience through a shareable deep link.
3. Explores cinematic MapLibre terrain and a few photo pins.
4. Opens Raptor Experience and sees the creator's actual boat-trip images, stops, and helpful operator information.
5. Chooses `View Operator` or `Open in Maps`—not an ad disguised as a tour button.
6. Sees an optional `Behind the Shot` expansion describing camera/lens technique.
7. Opens a related gear guide and finds an editorial product link.
8. Saves the location to browser-local favorites and continues exploring.

**Monetization placements in this flow:**

- **Map canvas and navigation controls**: no AdSense. The independently enabled
  guided-stop editorial unit follows the strict eligibility and session cap in
  the AdSense operations guide.
- **Experience**: venue referral or direct sponsorship if applicable, visibly disclosed.
- **Behind the Shot / packing guide**: direct editorial affiliate links, genuinely relevant.
- **Long-form article**: one carefully placed AdSense unit, possibly a second later if metrics justify it.

### Mobile-first requirements

- Main discovery remains map and content, not ads.
- Gear modules must work as scrollable or stacked content without covering navigation.
- Calls to action clearly distinguish `Read story`, `View gear`, `Visit official site`, `Buy from retailer`, and `Book experience`.
- Never place a Google ad where a bottom sheet animation or gesture would cause accidental interaction.
- Return to map state and favorites must remain intact after opening a related guide.

---

## 9. Google Analytics 4: scalable referral measurement and engagement

**Implementation requirement:** GA4 is already installed and collecting data for Roam With Justin. The owner has verified an Exploration filtered to GA4's automatic `click` event, showing outbound `link_domain` values. **Do not replace its measurement ID, duplicate gtag/GTM loaders, create a second property, or assume the current app is untracked.** First inspect the actual site code and confirm the configuration in use. The owner's WebWorks Media and Roam With Justin sites can share one Analytics _account_ but should retain separate GA4 _properties/measurement IDs_.

### 9.1 Measurement layers: separate the meanings

| Layer                         | Event/source                                                                   | Purpose                                                                                | Reporting rule                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Built-in outbound links       | GA4 Enhanced Measurement `click` with `outbound`, `link_domain`, `link_url`    | All eligible regular external anchors (Google, Instagram, MapTiler, venue sites, etc.) | Baseline outbound traffic; does **not** identify a partner relationship by itself. |
| **Commercial referral**       | **One reusable `partner_click` event**                                         | Business/venue/operator/gear affiliate referral intent with canonical IDs              | Primary per-partner report; do not add to `click` counts for the same interaction. |
| Optional editorial engagement | Existing/small set of `atlas_*`, `experience_*`, `behind_the_shot_open` events | Engagement in the Atlas                                                                | Introduce only when the metric changes a real product/business decision.           |
| Ads and actual sales          | AdSense reports; approved affiliate/partner reporting                          | Ad revenue and any actual transactions                                                 | Do not label a GA4 referral click a booking, sale, or verified arrival.            |

**No individual partner trackers.** Hundreds of businesses must all use the **same `partner_click` event and the same shared link component/function**. Stable values distinguish businesses, not event names or code branches. Any new partner record automatically participates without changes to Analytics configuration.

### 9.2 Canonical event contract

Send an event only when the user intentionally activates a commercial outbound action (website, booking, maps, telephone where policy-consistent, or disclosed affiliate link). Prefer existing canonical partner/provider and experience IDs from the site's real registries. **`partner_id` is a stable analytics identifier, never the display name or URL.** For a gear affiliate link, use the existing partner/merchant identity when known and optionally a separate safe `gear_id`; do not manufacture partner IDs for missing data.

```js
// Conceptual GA4 event payload; adapt to the repository's existing analytics adapter.
window.gtag("event", "partner_click", {
  partner_id: "nates-custom-charters",
  experience_id: "st-john-boat-day",
  link_type: "website",
})
```

`nates-custom-charters` is the **creator-confirmed charter operator for the USVI St. John boat-day experience**, not a confirmed sponsor or affiliate. Use its real, verified URL when one is available in the canonical record; never invent a live link. Do not make a website link clickable if its destination is unknown.

Contract:

- `partner_id`: **required** for `partner_click`, stable, canonical business/provider ID.
- `experience_id`: optional when the action occurred in an experience; otherwise omit. Use the actual canonical record, not a guessed slug.
- `link_type`: required controlled vocabulary such as `website`, `booking`, `maps`, `phone`, `affiliate`. Ensure each value has one defined meaning.
- `page_location` and acquisition/source attribution: use GA4's built-in collection, subject to consent and availability.
- Do **not** send email addresses, phone numbers, visitor IDs, private contact information, full URLs containing personal/tokenized query strings, or unknown free-form text as custom dimensions. If needed, keep destination domains in the existing GA4 outbound event; use sanitized, allowlisted fields for custom partner events.
- Never include an invented `booking` value because a generic website link _might_ lead to booking. Label according to the actual clicked action.

### 9.3 One-time GA4 admin setup (NOT per partner)

In **Admin → Data display → Custom definitions**, create **event-scoped** custom dimensions (where not already present):

| UI name       | Event parameter | Importance  |
| ------------- | --------------- | ----------- |
| Partner ID    | `partner_id`    | Required    |
| Experience ID | `experience_id` | Recommended |
| Link Type     | `link_type`     | Required    |

Enter a new parameter name if it is not listed in the UI. **Do not create dimensions for `nates-custom-charters`, each hotel, or every new partner**; the three parameter _names_ are registered only once. Avoid `partner_name` as a second high-cardinality dimension; resolve labels from the canonical content registry when preparing external reports.

GA4 may warn about high cardinality. Stable partner IDs are still the correct general approach, but at larger volumes some GA4 reports may aggregate values into `(other)`. For guaranteed granular partner-level history at larger scale, evaluate **GA4 BigQuery export** later, subject to availability/cost/privacy; do not add a database solely for initial tracking.

The first events do not require manually using **Create event** in GA4; the site emits `partner_click`. Custom dimension reporting is not necessarily immediate (often 24–48 hours); use **DebugView / Realtime** for initial verification. Custom dimensions generally don't retrospectively populate prior unregistered events in reports.

### 9.4 Implementation in Vue (reuse one analytics adapter)

Inspect the existing analytics initialization and components first. Prefer one reusable analytics function and one reusable external-action component/handler used by all commercial links, rather than attaching tracking to hundreds of pages. Example _conceptual_ helper; adapt to actual Vue version, CSP, consent handling, link ownership, and existing gtag adapter:

```js
export function trackPartnerClick({ partnerId, experienceId, linkType }) {
  if (!partnerId || !linkType) return
  if (typeof window === "undefined" || typeof window.gtag !== "function") return

  const params = {
    partner_id: partnerId,
    link_type: linkType,
  }

  if (experienceId) params.experience_id = experienceId
  window.gtag("event", "partner_click", params)
}
```

**Usage:** When the user clicks a verified provider CTA, call the helper **once** from the common `PartnerLink` / `ExperienceProvider` / shared external-action component, and follow the real URL normally using a native anchor. Do not prevent default navigation just to send analytics. Respect consent first; a user's opt-out must disable event emission where required. Do not fire events on hover, impressions, programmatic render, or retry.

- Standard `<a href>` links: Enhanced Measurement can also emit a generic `click`; **expect both event types for one click, and never sum them**.
- Programmatic navigation (`window.open`, JavaScript-controlled redirects): GA4's automatic click capture may not see it. Ensure the shared action emits `partner_click` and navigates reliably; prefer semantic native anchors where possible.
- Any click to a **noncommercial** outbound destination continues to rely on built-in outbound tracking, not `partner_click`.
- Calls initiated from map cards, venue profiles, deep-linked stories, optional gear modules, and mobile bottom sheets should converge through the same shared action semantics.
- If a partner appears in multiple experiences, one stable `partner_id` identifies it across all of them, while `experience_id` attributes each eligible click to its context.
- Avoid double dispatch from nested click handlers and duplicated component layers; no analytics-only redirect URL or self-hosted click logger is required initially.
- Separate an **outbound action** from the record's _commercial relationship_: a featured operator is not automatically a paid sponsor, affiliate, or booked conversion.

### 9.5 Attribution and reporting for real business proposals

Build/save one reusable GA4 Exploration for referrals:

| Exploration setting | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| Rows                | `Partner ID`, optionally `Link Type`, `Experience ID` |
| Metric              | `Event count`                                         |
| Filter              | `Event name` exactly matches `partner_click`          |
| Date range          | Explicit agreed reporting period                      |

Allow filtering to one partner ID, e.g. `nates-custom-charters`, **without adding a new event or dimension**. Include context such as experience views, when measurable, but **do not equate pageviews with unique visitors or click counts with unique people**. A logged outbound click is referral intent, not proof the destination loaded or that a customer booked. Any report for a prospective client should identify the period, metric definition, and limitations.

If GA4's default outbound-link report is useful for comparing all domains, keep a separate Exploration: Rows = `Link domain` / `Link URL`, Values = `Event count`, filter = `Event name` exactly matches `click`, optionally `Outbound` true. The site owner has already configured such an Exploration; do not rebuild it unnecessarily. GA4's generic `click` and custom `partner_click` must stay separate in reporting.

For selected campaigns, use consistent incoming **UTM parameters** on links pointing _to Roam With Justin_ (Instagram campaign traffic), not automatically append tracking parameters to third-party URLs. Avoid claiming GA4 can verify a downstream partner purchase without the partner's attribution/reporting agreement.

### 9.6 Test plan and acceptance criteria

1. **Audit:** Identify the current GA4 measurement ID source, loader ownership, consent behavior, and outbound link implementation. Confirm Enhanced Measurement outbound clicks remain enabled.
2. **Baseline:** Confirm existing outbound `click`/`link_domain` activity is preserved. Do not duplicate page views for Vue SPA router changes; verify history-change handling in actual browser navigation.
3. **First end-to-end example:** Use the confirmed `nates-custom-charters` provider ID associated with the existing St. John boat-day experience. Use a verified real destination URL only when present. On activation, emit exactly one `partner_click` with the correct IDs and `link_type`; navigation still works.
4. **Scale:** Add a second sample provider from real canonical content without writing new analytics code or touching GA4; the same adapter reports the distinct partner ID.
5. **No false events:** Native and programmatic links, nested click targets, back navigation, ad blockers, noncommercial/social links, missing URLs, repeat renders, and consent-denied states behave correctly.
6. **Verify:** Use browser network inspection and GA4 DebugView/Realtime, then the saved Exploration after processing delay. Test production and local/development tracking configuration without polluting live reporting unnecessarily.
7. **Commercial honesty:** No programmatic AdSense click tracking, no duplicate-referral summation, no assertion that referrals are bookings or sales, and no fabricated sponsorships.

### 9.7 Other optional product events (defer until justified)

Existing planning candidates include `atlas_destination_open`, `experience_preview_open`, `experience_details_open`, `behind_the_shot_open`, `gear_guide_open`, `favorite_added`, `favorite_removed`, and `return_to_exploration`. Prior suggestions such as `venue_website_click`, `venue_maps_click`, `booking_outbound_click`, and `gear_outbound_click` are **superseded as primary commercial outbound events by the unified `partner_click` event with `link_type`**. Do not implement four overlapping per-link event families. An independent non-partner gear-interest event is optional only if there is a genuine distinct reporting question.

### 9.8 Relationship with AdSense

GA4 measures site behavior and visitor actions; **AdSense measures Google-served ads and earnings**. They are separate products. Do not create custom events for impressions or clicks on AdSense ads, intercept ad clicks, fake ad interactions, or claim GA4 referral clicks are ad revenue. Preserve the AdSense single-loader/manual-placement restrictions elsewhere in this brief. Audit privacy/consent for both products together rather than assuming an existing tag guarantees compliance.

### A simple success dashboard

- Entrances from Instagram/social media, organic search, and direct.
- Atlas → experience open rate and experiences per visitor/session (if those events are implemented correctly).
- Return visits and favorites where measurable with appropriate privacy controls.
- Organic clicks/impressions and landing pages (Search Console).
- **GA4 partner referral clicks by partner, context and action type**, plus a separate general outbound-domain report.
- Affiliate conversions/revenue **only from approved partner/network records**, not inferred from GA4 clicks.
- AdSense estimated earnings, **page RPM**, and performance by genuinely ad-eligible page family.
- Page performance: LCP, CLS, INP; bounce/exit trends around ad placements.

**Measurement principle:** Optimize for useful reader engagement and credible referral intent, not vanity clicks, artificial ad interactions, or fabricated conversions.

---

## 10. Financial model: AdSense revenue by traffic

**These figures are arithmetic scenarios, not empirical promises or verified RPM benchmarks for this website.** Google states AdSense earnings vary significantly with traffic, topic, geography, placement, and other factors. A sparse, visually protected implementation may earn less than a high-density content site.

**Formula:** `Estimated monthly AdSense revenue = (monetized pageviews / 1,000) × page RPM`

For simple planning, assume total monthly pageviews below are eligible to be monetized, and imagine effective **sitewide page RPM** outcomes of **$2 (low), $5 (middle), $10 (strong)**. These are illustrative input assumptions, not guaranteed travel-photography rates.

| Monthly pageviews | $2 page RPM | $5 page RPM | $10 page RPM |
| ----------------: | ----------: | ----------: | -----------: |
|             1,000 |          $2 |          $5 |          $10 |
|             5,000 |         $10 |         $25 |          $50 |
|            10,000 |         $20 |         $50 |         $100 |
|            25,000 |         $50 |        $125 |         $250 |
|            50,000 |        $100 |        $250 |         $500 |
|           100,000 |        $200 |        $500 |       $1,000 |
|           250,000 |        $500 |      $1,250 |       $2,500 |

**Key qualification:** Most Atlas traffic remains ineligible for ads. Free map
exploration, early guided stops, incomplete Journeys, thin stops, and repeat
stops produce no Atlas request. The **effective RPM across the whole website**
may therefore remain well below the RPM of eligible story or guided-stop
content. Don't apply an eligible-content RPM to every Atlas pageview. Google
distinguishes page RPM from ad-impression RPM; make sure the denominator is
correct when modeling performance.

Example traffic funnel:

- **20,000 monthly visitors** × **1.6 pages/visitor** = **32,000 pageviews**.
- If **only 40%** of those pageviews are eligible editorial pages, that is **12,800 ad-eligible pageviews**.
- At an illustrative **$5 RPM on those eligible pages**, that would be **about $64/month**, before considering further differences in fill, ad blocking, reporting, or actual RPM.

Don't interpret this as a prediction—actual measured revenue is the only reliable basis for budgeting.

### Why big-ticket products are exciting—but different

A $2,500 camera does **not** imply that a Google AdSense impression pays a share of $2,500. Conversely, a **direct affiliate conversion**, if valid under a program's terms, may earn a commission calculated from a qualifying purchase.

Illustrative affiliate economics only:

- 4 qualifying sales × $2,000 × 3% commission = **$240**.
- 10 qualifying bookings × $250 × 5% commission = **$125**.

**These are math examples, not actual offered commission rates, program approval guarantees, or expected conversions.** Different merchants exclude categories, impose caps, have attribution windows and returns, or disallow some marketing channels.

This is the rationale for investing in credible gear/venue editorial modules rather than flooding the site with AdSense.

### Future direct sponsorship concept (not established market pricing)

Direct featured-experience placements and photo/video rights can be negotiated individually. Prioritize validating referral quality and actual audience demand before offering packages or recurring fees. No sponsored placement should compromise the site's editorial authenticity.

---

## 11. Policy, legal, and trust checklist

- Verify the AdSense site is approved/ready before expecting live display ads.
- Do not duplicate the existing AdSense snippet or use fabricated `data-ad-client`/`data-ad-slot` values.
- Configure **Auto ads OFF** in the AdSense UI for full manual placement control; this is an **owner dashboard step**, not a code-only change.
- Set up and verify `ads.txt` per current AdSense account guidance; use the owner's exact authorized-seller line. Do not invent it.
- Maintain a real privacy policy covering Google advertising, analytics, cookies/local storage and relevant user choices.
- For personalized ads in the EEA, UK, and Switzerland, review Google's **certified CMP / IAB TCF** requirements; use an appropriate certified CMP and obtain consent where required. Do not assume a homemade cookie banner is enough.
- Review applicable US state privacy obligations and publisher settings, as traffic geography and processing change requirements.
- Make all paid endorsements/affiliate relationships clear and conspicuous, close to the recommendation, consistent with FTC guidance.
- Do not accidentally create incentives to click ads, place ads under misleading labels, or create ad-like navigation/controls that mislead users.
- Review Google AdSense **Brand safety** controls for problematic advertisers, general/sensitive categories, and the Ad review center. Blocking can reduce competition and does not guarantee every ad will be attractive.
- Keep original photographs and media rights clear; merchant/brand image use must follow applicable licenses and affiliate-program terms.
- Minimize tracking and avoid collecting or transmitting unnecessary visitor data. `localStorage` for favorites should be independent of advertising identification.
- Preserve mobile accessibility, keyboard interaction, screen-reader labels, and reduced-motion behavior.

---

## 12. Development phases

### Phase 1 — Protect the aesthetic and integrate correctly

1. Audit current AdSense placement and loader.
2. Make a written owner checklist for switching Auto ads OFF in AdSense.
3. Add a clean ad-placement configuration and one optional responsive article ad unit if **actual slot code is available**.
4. Ensure no ads appear in the map canvas, markers, hero, photo previews, video
   overlays, or navigation. Keep the optional guided-stop unit below substantial
   editorial content and limited to one request per Journey and tab.
5. Validate consent/privacy gaps and avoid deploying noncompliant personalized ad behavior.
6. Run build/lint/type checks and inspect responsive design.

### Phase 2 — Create the first premium editorial commerce module

1. Choose a real existing destination or original photograph.
2. Build `BehindTheShot` and/or `WhatIPacked` around verified information.
3. Support optional disclosed outbound product links without requiring a CMS/database.
4. Implement the **single reusable GA4 `partner_click` integration** (shared partner action, canonical IDs, one-time custom dimension guidance, Nate's Custom Charters vertical-slice test). Preserve existing GA4 Enhanced Measurement and do not create per-partner trackers.
5. Make modules reusable and visually elegant.

### Phase 3 — SEO, content-rich pathways and experiments

1. Ensure destination and experience pages have indexable, original content.
2. Improve metadata, linking, sitemap and appropriate structured data.
3. Create one genuine first-person gear guide.
4. Compare content interaction, ad earnings, outbound referrals and performance across page templates.
5. Improve ad placement only where results justify it and visual quality remains high.

### Phase 4 — Business development

1. Apply to relevant affiliate programs appropriate to actual products/venues.
2. Negotiate with venues featured in the travel experience.
3. Define first-party sponsored experience placements and licensing options.
4. Create transparent disclosure and reporting standards.
5. Consider more infrastructure only when volume and operations justify it.

---

## 13. Output expectations for Codex

After reading the project:

1. Summarize the architecture and list current AdSense code locations.
2. Identify **what is controlled in code** versus **what requires the AdSense dashboard**.
3. Audit existing GA4 separately from AdSense: exact loader/measurement-ID locations, Enhanced Measurement, SPA pageviews, consent, outbound links, and pre-existing analytics events. Propose the fewest files/components needed.
4. Implement a **small, working vertical slice** without redesigning the existing site: one reusable GA4 `partner_click` event via the canonical partner link component, demonstrated with Nate's Custom Charters and its verified URL if present. Do not create unique events per partner.
5. Include a refined, accessible sample editorial gear/affiliate module with verified content or transparently labeled placeholders, **not live fabricated ads**.
6. Leave missing ad slot values, affiliate URLs, and consent configuration as explicit follow-ups; do not invent them.
7. Test desktop and mobile navigation, client routing, loading, and build/types/lint where available.
8. Report performance considerations and any policy risks or unknowns.
9. Present an owner checklist: Auto ads setting, exact ad-unit snippets, `ads.txt`, CMP/privacy, affiliate disclosures, and **one-time GA4 custom dimensions (`partner_id`, `experience_id`, `link_type`)**. Include a reusable referral Exploration and explicit data-delay/reporting caveats.

### Definition of done for the first release

- Existing website remains aesthetically premium and fully functional.
- No auto-injected floating banners, in-map ads, or pop-up-style AdSense obstructions are introduced by code.
- Existing AdSense loader is configured correctly without duplication.
- Any manual ad slot appears only on approved, content-rich pages and is visually separated from editorial/navigation elements.
- One attractive, clearly labeled editorial commerce module works using legitimate data or flagged placeholders.
- The immersive geographic discovery, back navigation, and favorites continue working.
- GA4 uses its **existing installation**; a verified commercial outbound action sends exactly one `partner_click` with a stable `partner_id`, optional `experience_id`, and appropriate `link_type`. General Enhanced Measurement outbound tracking still works. No partner-specific tracker setup is necessary.
- Build and type checks pass (or blockers are documented with exact errors).

---

## 14. Official references for implementation validation

These sources should be checked for updates at implementation time; Google may change UI labels, formats, and policy wording.

- [GA4: Enhanced Measurement (including outbound clicks)](https://support.google.com/analytics/answer/9216061)
- [GA4: Custom dimensions and metrics](https://support.google.com/analytics/answer/14240153)
- [GA4: Send events and custom parameters](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [GA4: About high-cardinality dimensions](https://support.google.com/analytics/answer/12226705)
- [GA4: DebugView](https://support.google.com/analytics/answer/7201382)
- [Google AdSense: Set up ads on your site (Auto ads vs ad units)](https://support.google.com/adsense/answer/7037624)
- [Google AdSense: About the AdSense code](https://support.google.com/adsense/answer/9274634)
- [Google AdSense: Create a display ad unit](https://support.google.com/adsense/answer/9274025)
- [Google AdSense: Auto ads settings](https://support.google.com/adsense/answer/9305577)
- [Google AdSense: Exclude areas from in-page Auto ads](https://support.google.com/adsense/answer/12626543)
- [Google AdSense: Ad placement policies](https://support.google.com/adsense/answer/1346295)
- [Google AdSense: Ad code modification limitations](https://support.google.com/adsense/answer/1354736)
- [Google AdSense: Brand safety blocking categories](https://support.google.com/adsense/answer/186376)
- [Google AdSense: Revenue per thousand impressions (RPM)](https://support.google.com/adsense/answer/190515)
- [Google AdSense: How much will you earn?](https://support.google.com/adsense/answer/9902)
- [Google AdSense: EU/UK/Switzerland CMP requirements](https://support.google.com/adsense/answer/13554116)
- [Google Search Central: Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central: Understand JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Search Central: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google Search Central: Product snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
- [FTC: Endorsement Guides and affiliate disclosures](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)

---

## 15. One-paragraph implementation command

> Inspect Roam With Justin's existing codebase and this brief. Preserve its cinematic Atlas and canonical content model. **GA4 is already tracking website traffic and automatic outbound clicks**: audit/reuse that setup without adding a duplicate loader, verify SPA pageviews, and implement **one scalable `partner_click` event** for commercial links via a reusable component, not a separate event per business. Include stable canonical `partner_id`, optional `experience_id`, and `link_type`; use Nate's Custom Charters on the St. John boat-day experience as the first verified example if its real URL exists. Provide the owner's one-time GA4 event-scoped custom dimension setup and a reusable partner referral Exploration; distinguish clicks from actual bookings, and never sum generic `click` with `partner_click`. Audit the existing AdSense site script without duplication, and do not assume code can disable Auto ads: document the dashboard step. Keep ads out of map, hero, markers, photo cards, galleries, and navigation; use only deliberate, responsive placements on content-rich pages when legitimate ad-slot details exist. Add elegant editorial gear/provider links with accurate disclosures, protect consent/privacy, avoid fabricated IDs/affiliations/claims, run relevant tests, and report code changes and remaining dashboard steps.
