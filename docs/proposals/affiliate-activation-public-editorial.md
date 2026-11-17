---
id: affiliate-activation-public-editorial-first-slice
title: Roam With Justin - Affiliate Activation and Public Destination Referral Implementation
kind: proposal
status: proposed
implementation_state: none
created: 2026-11-17
updated: 2026-11-17
related:
  - my-atlas-travel-booking-affiliate-partnerships
  - my-atlas-trip-planning
  - my-atlas-trip-planning-implementation
  - monetization-analytics
  - media-pipeline
  - gear-ingestion-affiliate-analytics-ai
supersedes: []
superseded_by: []
code_paths: []
verification:
  state: unverified
  evidence: []
---

# Roam With Justin: Affiliate Activation and First Measurable Booking Referrals

## Codex implementation brief | Audit first; ship a small public-editorial vertical slice

**Owner status as of November 17, 2026:** The owner reports completing **three of four initial affiliate-program onboarding recommendations**. This is not confirmation that any particular advertiser has approved the site, that commissionable links are available, or that payment/tax onboarding is complete. Obtain actual program/advertiser status and approved tracking links from the owner. **Never infer approvals from network membership.**

**Primary goal:** Turn existing, firsthand public travel coverage into a trustworthy and measurable path to a travel provider, beginning with **one Moab/Utah public editorial surface**, without coupling commerce to the implemented private My Atlas planner.

**Business thesis:** Roam With Justin is the inspiration and travel-decision layer. Expedia, Booking.com, Marriott, Vrbo, other approved merchants, and official venue websites are the booking/purchase layer. Roam With Justin does not sell tickets, hold hotel inventory, process payments, guarantee availability, or calculate a booking commission from GA4 click data.

**IMPORTANT FOR AGENT:** Read the live repo, existing managed documents, and this brief. Follow the repository's actual naming, conventions, selectors and validation tooling. Complete an audit before modifying code. Implement only a bounded public referral slice unless the owner separately approves expansion. **No repository contents were inspected for this brief, and none of its proposed paths or interfaces should be represented as already shipped.**

---

## 1. Scope, decisions, and exclusions

### In scope for this delivery

1. Audit existing affiliate, partners, gear, public destination/journey content, SEO, disclosures, analytics, consent, and AdSense setup.
2. Reuse or minimally extend the **canonical editorial partner/merchant registry**. Add program eligibility, link approval, and allowed placement metadata; do not create parallel merchant lists.
3. Build a small, accessible **public** travel booking/referral module (e.g., `Explore stays near Moab`) with useful, non-pushy CTAs.
4. Use **verified, permitted affiliate URLs** exactly as issued where applicable; allow a normal untracked destination link only when clearly disclosed and useful.
5. Show appropriate affiliate/sponsored disclosures at the actual placement and ensure any global website disclosure remains reachable.
6. Instrument/verify **one** meaningful outbound `partner_click` GA4 event per user action where consent permits; avoid duplicate conversion reporting.
7. Add content/link validation, privacy tests, accessibility/mobile QA, and a short operator handoff for future approved partners.
8. Produce an evidence-based implementation report with tests, changed paths, and remaining owner actions.

### Explicitly out of scope

- Implementing or modifying My Atlas private Bucket List, plan snapshots, saved-plan retention, account deletion, or private-plan booking UI.
- Placing affiliate/sponsor/AdSense cards inside authenticated private My Atlas planning or on the immersive Atlas/map, lightboxes, pins, or photography controls.
- A booking engine, flight/hotel search inventory API, paid routing, live pricing/availability, scraping provider sites, AI-generated hotel claims, server-side LLM, CRM, database, lead capture, or custom click-tracking backend.
- A self-service advertiser marketplace, ad auction, dynamic ad personalization, or sponsored ranking algorithm.
- Claiming product ownership, hotel stays, sponsorships, account acceptance, conversion rates, or affiliate earnings without evidence.
- Automatically applying to affiliate networks, accepting terms, or publishing undisclosed affiliate content on Instagram.
- New AdSense placements, changing publisher IDs, or enabling Auto ads.

**Phase boundary:** This is a public editorial affiliate launch. The separately approved *My Atlas private planner* remains independent and its first beta release remains **free of commercial cards**. Integrating these merchant records into an optional private-plan handoff is a later, separately reviewed phase only after privacy/account deletion and provider placement permissions are verified.

---

## 2. Source-of-truth documents and compatibility requirements

Read the current managed sources before implementation:

- [Planning-to-booking partnerships and commerce](travel-booking-affiliate-partnerships.md), whose public commerce Phase 2 this brief narrows.
- [My Atlas trip-planning proposal](my-atlas-trip-planning.md) and [implementation record](../implementation/my-atlas-trip-planning.md), which preserve the ad-free private boundary.
- [Three-day GA4 roadmap](ga4-three-day-improvement-roadmap.md), the small-sample baseline for meaningful Atlas and partner events.
- [Gear ingestion and monetization expansion](gear-ingestion-affiliate-analytics-ai.md), which owns the canonical Gear and merchant-link compatibility direction.
- [Monetization and analytics architecture](../architecture/monetization-and-analytics.md) and [active implementation](../implementation/monetization-and-analytics.md), which own public AdSense placement policy and partner tracking.
- [My Atlas account state](../architecture/my-atlas-account-state.md) and [media pipeline](../architecture/media-pipeline.md) for the boundaries this work must preserve.

**Known architectural direction (verify against live repo):** Vue 2 / GitHub Pages; public curated Atlas; separate private My Atlas with Auth0 and per-user Cloudflare Durable Objects; GA4 already collecting events; original images on local media/R2; existing `affiliates.js`, trip `gearHighlights`, and canonical gear/media selector plans. No new DB, Worker, R2 media requirement, or API secret is needed for this slice.

Preserve the distinction among:

- **Editorial destination/journey/experience**: original public travel content, facts and firsthand recommendations.
- **Merchant/partner**: canonical commercial destination identity and program metadata.
- **Commercial link/offer**: approved referral or ordinary outbound link for a particular surface.
- **Gear/product**: separate identity and media; links may use the same underlying commercial-link rules.
- **Sponsored campaign**: paid placement/contract and disclosure, **not** the same as ordinary affiliate eligibility.
- **AdSense**: Google-served public editorial display ads with separate reporting and policies.

---

## 3. Phase 0 - Mandatory audit and decision report (no production edits)

Inventory these before writing code:

1. Actual public Moab/Utah editorial routes, source data, and content depth. Prefer the **most suitable existing, substantive public page**. Do not create a thin affiliate doorway page. If no eligible page exists, use the existing most relevant public journey/article, or **report blocked by insufficient original content** rather than invent a first-person hotel guide.
2. Current `affiliates.js`, partners data, gear catalogs, commercial link helpers, usage selectors, and trip/experience references. Choose a single canonical way to represent partners and offers. Preserve compatibility with existing gear links.
3. Current GA4/gtag/GTM installation, Vue Router auto/manual pageview handling, existing `partner_click`, consent gating, and outbound Enhanced Measurement `click` events. Identify any duplicate event firing or self/developer traffic contamination before claiming conversion improvement.
4. Existing privacy policy, affiliate disclosures, sponsored-card presentation, contact/partnership page, and accessibility. Flag any consent/legal text that must be reviewed by the owner rather than silently declaring legal compliance.
5. Current AdSense loader, Auto ads assumptions, consent manager and eligible pages. **Do not** change or add ad units during this work.
6. Which merchant tracking integrations are *really* configured and approved, including the site/social placements permitted by each advertiser. **Network account does not equal advertiser approval.** Check ordinary-link fallback allowance.
7. Build/testing scripts, repo linting, generated content, static-site routing, image asset registration, and content validators.

Write a brief `Phase 0 audit` summary before implementation:

| Question | Evidence to record |
|---|---|
| What public Moab/Utah content can hold a CTA? | Actual route/component/data IDs and content quality |
| Which merchant/affiliate registry already exists? | File paths + schema and references |
| Which program-approved live links are supplied? | Only merchant IDs, approved URL inventory/location; **don't log private account tokens in reports** |
| What GA4 events already exist? | Event names, firing paths and duplicate risk |
| What privacy/disclosure blockers exist? | Exact pages, owner-review items and consent dependencies |
| What is the minimal code change? | Implementation/test/documentation files; migration impact |

**Stop and report blockers** for real partner URLs or consent/eligibility issues that cannot be established. You may still build and test the generic registry/component using nonproduction fixtures. Do **not** publish placeholder affiliate URLs or assume the owner's third completed application identifies a particular advertiser.

---

## 4. Commercial onboarding is an owner-managed gate, not code

Provide or update a private operator checklist with **unknown until verified** values. Ask the owner only for missing *non-discoverable account-level facts*. **Do not request passwords, merchant account secrets, personal tax details, or assume connected browser access.**

| Merchant / platform | Network / route | Owner to verify before publishing as affiliate |
|---|---|---|
| Expedia / Hotels.com / Vrbo | Expedia Group creator/affiliate program | Approved publisher and placements; qualifying products; exact tracked URLs / authorized deep-link creation |
| Marriott | Partnerize / Marriott affiliate program | Program acceptance; approved deep links; property/destination link rights; brand asset rights |
| Booking.com | CJ Publisher + Booking.com advertiser | Booking.com advertiser acceptance separately from CJ registration; allowed links, social/web surfaces |
| Other Awin advertisers | Awin and advertiser-specific approval | Advertiser acceptance, approved URLs, terms, link attribution and permitted promotion |
| Airbnb | Ordinary link unless separately approved for an active program | No affiliate/commission claim without current approved arrangement |
| Local operators / venues | Direct or ordinary editorial links | Written terms for paid promotions; ordinary official link when no payout |

Include these owner checkboxes in the handoff:

- [ ] Confirm which **3/4** network/advertiser onboarding steps are done and identify the remaining one.
- [ ] Confirm **advertiser acceptance**, not merely network account creation.
- [ ] Complete tax, payout and payment onboarding within each network.
- [ ] Register/authorize `roamwithjustin.com` and `@roam.with.justin` as permitted promotional properties where required.
- [ ] Review advertiser-specific link/surface/cookie/referrer rules and any **social content usage rights**. CJ's agreement includes broad language about certain third-party promotional posts; flag for owner review before enabling CJ-sponsored Instagram posts.
- [ ] Obtain at least **one real, approved, working link** (commissionable or clearly ordinary) for the first public test.
- [ ] Approve visible affiliate/sponsored disclosure text and ensure privacy/consent notices are accurate.
- [ ] Maintain private records of network terms, payout rates, cookie windows, application dates, and verified transactions **outside client bundle**; only non-sensitive operational metadata enters public site data.

**Important:** The public registry must not expose personal affiliate credentials, private API keys, payment/tax records, internal contract documents, or user data. Some affiliate URLs contain public-facing publisher attribution identifiers by design; only publish those that the network explicitly authorizes for public links.

---

## 5. Phase 1 - Minimal canonical merchant/offer schema

Prefer extending an existing partner registry and link renderer over inventing multiple sources. If no usable canonical registry exists, create **one** small static build-time registry with validation, optionally shared with Gear. Retain existing URL presentation where already stable.

### Sample type sketch (not a required new library or actual current contract)

```ts
type MerchantId = string

type TravelMerchant = {
  id: MerchantId
  displayName: string
  network: "expedia" | "partnerize" | "cj" | "awin" | "direct" | "none"
  websiteUrl?: string
  category: "lodging" | "flights" | "vacation-rental" | "activities" | "transport"
  status: "unverified" | "applied" | "approved" | "paused"
}

type PublicCommercialLink = {
  id: string
  merchantId: MerchantId
  label: string
  kind: "affiliate" | "ordinary" | "sponsored"
  trackingMode: "custom" | "approved-rule" | "none"
  url: string
  approvedLinkRuleId?: string
  allowedSurfaces: Array<"public-destination" | "public-journey" | "public-gear">
  publicDestinationId?: string
  disclosureRequired: boolean
  isEnabled: boolean
  // No private-plan IDs, Auth0 subjects, personalized or GPS data.
}
```

**Schema guidance:**

- `status: "approved"` must be owner-verified; never infer from URL appearance. An `affiliate` or `sponsored` link must be enabled only if the corresponding arrangement and placements are permitted.
- Use stable merchant/link IDs. Do not make retailer URL, product name, image path, or an affiliate network account number the canonical identity.
- `trackingMode: "custom"`: preserve the **approved complete tracking URL exactly** (subject to safety validation); no extra query tags, no token stripping, no query-order rewriting that may break signatures.
- `trackingMode: "approved-rule"`: generate tracking only through an explicitly configured, documented and tested merchant-specific rule. **Never** apply one global `?tag=`, `?aid=` or other suffix to Marriott, Expedia, Booking.com, Airbnb, etc.
- `trackingMode: "none"`: ordinary official outbound link; no commission claim. If an intended affiliate URL is unavailable, offer an approved plain website link only when appropriate, or hide the CTA. Never silently downgrade a link while still showing affiliate earnings language as if the particular link pays.
- If the user specifically uses a boolean `isCustomTracked`, map it cleanly to `trackingMode` without creating ambiguous competing booleans. Preserve compatibility with the separate Gear ingestion plan.
- Keep real approval/verification evidence and merchant account administrative records private; static public data should contain only fields needed for rendering and attribution.
- Place the registry under current editorial content structure. Do **not** put it in per-user My Atlas DO state, new Cloudflare KV, or a new dynamic API.
- Do not create arbitrary redirect endpoints/URL shorteners that cloak tracking URLs or change affiliate attribution without merchant approval.
- Validate `https:` destination (with program-specified exceptions only after explicit review), approved host/redirect policy, valid destination, no JavaScript/data URLs, no unsafe HTML, allowed placement, disclosure consistency and missing/duplicate IDs.

### Source-of-truth rules

- For one merchant's hotel/flight/rental offers, reuse one canonical merchant ID across all placements.
- The same merchant can have multiple approved offer/link records for different destinations or services.
- No prices, availability, star ratings, or discounts unless current, licensed, verified source data supports them and required terms are respected.
- For brand preference (e.g., Marriott vs. Hyatt), keep editorial relevance separate from *explicit paid placement*. A paid priority may be set only for a clearly labeled sponsored slot with an actual campaign; no secret paid preference presented as objective recommendation.
- Avoid a generalized click-tracking redirect: use merchant-approved links as first-party anchors and track normal user gestures through existing analytics.

---

## 6. Phase 2 - Public Moab/Utah editorial referral UI

### Product requirement

Add **one** compact, beautifully integrated and accessible commercial utility block to a real, substantive, publicly accessible Moab/Utah destination or journey page. Suggested heading:

> **Planning your visit to Moab?**  
> Explore accommodation and travel options to organize the next part of your journey.

Example *only if real links are verified*:

| CTA | Destination | Eligibility |
|---|---|---|
| `Find stays near Moab` | Approved Expedia/Booking.com destination search or permitted ordinary link | Affiliate only if actual advertiser approved |
| `Explore Marriott properties` | Approved Marriott search/deep link, or permitted ordinary Marriott site URL | Do not imply a specific Marriott property is in Moab unless actually verified |
| `Explore vacation rentals` | Approved Vrbo route or clearly ordinary Airbnb link | Label actual merchant accurately |

**Deliver at least one working CTA** for the first vertical slice. **Do not fabricate links** to fill a three-button design. The block should render elegantly with one or two offers, or not render at all when no suitable offer exists.

### Presentation constraints

- Place below substantive original destination content and near related planning advice, **not** in the map hero, immersive Atlas map, pin popup, lightbox, or My Atlas private plan.
- Prefer understated editorial styling consistent with the current typography, photography, mobile interactions and page layout. No fake booking widgets, rates, departure selectors or intrusive banners.
- Clear service/merchant labels (`Search stays on Expedia`, etc.), not ambiguous `Book Now` claims when only opening a search page.
- Readable near-link disclosure for commissionable offers: **"I may earn a commission if you book through these links, at no additional cost to you."** Only use statements that are accurate for the link and merchant terms; standard wording is subject to owner/legal approval.
- For a **paid featured promotion**, visibly label `Sponsored` and state the relationship as required; do not quietly blend into independent recommendations.
- No fake personal endorsement. Unless the owner confirms an actual hotel stay, use neutral search-help language, not `my favorite hotel`.
- Use semantic anchors, accessible names, focus indicators, touch-friendly controls, keyboard support, and safe external navigation. Prefer `rel="sponsored"` for commission/paid links, plus `noopener` when opening new tabs; apply `noreferrer`/`referrerpolicy` only after confirming merchant attribution requirements. Ordinary editorial links need not be marked sponsored solely because they leave the site.
- Do not block navigation on the success of a GA4 event.
- Keep photos and media tied to the existing canonical registry; **no new external image scraping** for partner graphics. Plain text links are acceptable.
- Respect existing consent, restrictions and content requirements. Do not load third-party embedded booking widgets, trackers, or cookies merely to display this block.

---

## 7. Phase 3 - GA4 attribution and QA (reuse, do not duplicate)

The earlier three-day report showed high average engagement on `/atlas` from a small cohort and some tracked outbound travel/product clicks. This is an **early observation, not evidence of completed bookings or revenue**. Measurement accuracy is a prerequisite.

### Required event behavior

- Reuse an existing `partner_click` action if implemented. If absent, implement a **single client-only, consent-gated** event at the user's explicit outbound click.
- Suggested **public editorial** event payload (real IDs from existing content; example values only):

```json
{
  "event": "partner_click",
  "partner_id": "expedia",
  "service_type": "lodging",
  "placement": "public-moab-planning-utility",
  "link_type": "affiliate",
  "public_destination_id": "moab"
}
```

- Use existing taxonomy if naming already differs. Do **not** create both `partner_click` and `partner_outbound_clicked` for one action if they mean the same thing.
- Never send affiliate URL query strings, network tokens, visitor IDs, exact private coordinates, private wishlist/plan records, future dates, private notes, Auth0 subjects, emails, or payment data to GA4.
- Do not create per-click Durable Object writes, custom backend `/v1/telemetry` or a second analytics platform.
- GA4 Enhanced Measurement may record a generic outbound `click` for the same action; **don't sum generic `click` plus `partner_click` as two referrals**. Validate event taxonomy in a controlled browser test.
- Be aware of SPA pageview duplication; fix only confirmed issues, preserve existing tracking where accurate, and avoid extensive unrelated analytics refactoring.
- If analytics consent is denied or unavailable, the outbound link must **still work**; no GA4 event should be emitted contrary to consent.

### Useful reports (manual GA4 exploration or existing reporting surface)

1. Public Moab page sessions/views, separated from site-wide `active users`.
2. Distinct consenting sessions that intentionally click a travel partner (plus event counts, clearly labeled).
3. Referral interaction segmented by `partner_id`, `service_type`, `placement`, and public content context.
4. Organic vs paid acquisition and mobile vs desktop breakdowns (existing UTM/GA4 dimensions).
5. Later: verified bookings/commissions from merchant network exports. **Do not label GA4 click count as orders or revenue.**

Avoid automatically registering excessive high-cardinality GA4 dimensions. Document only the dimensions used and steps required in GA4 UI if they cannot be set via code.

---

## 8. Website readiness: disclosure, privacy, partnership contact

Audit and make the smallest supported, owner-reviewable changes to:

- Public `About` / `Contact` / `Work with me` or Partnerships entry, if absent or difficult to find. Include a professional contact route without exposing unnecessary personal information. Don't invent business contact details.
- A clear general **Affiliate Disclosure** page/section and immediate, context-specific disclosures beside affiliate cards or recommendations.
- Existing Privacy Policy to accurately disclose GA4, affiliate programs/tracking, cookies, related third parties and available user choices. **Do not write a false blanket claim of compliance; require owner review of any policy edits**, especially for global audience, age and consent rules.
- Existing consent mechanism. If a program's trackers need consent but no adequate workflow exists, leave additional trackers disabled and flag the blocker. Prefer simple outbound affiliate links over embedded widgets/pixels in this slice.
- No activation or relocation of AdSense onto private screens. Do not install additional tracking scripts just for this launch.
- SEO/outbound behavior: use crawlable anchors, clear headings and real original editorial context, canonical links where existing patterns support them, and `rel="sponsored"` on paid links. Don't generate thin SEO pages to host affiliate blocks.

**Do not silently overwrite current legal copy or enact new advertising-consent policy.** Prepare proposed copy/diffs for review and gate affiliate launch on the owner's acceptance where material.

---

## 9. Validation and automated tests

At minimum, cover:

### Registry/link behavior

- Active, approved custom tracked URL is rendered unchanged; query strings are not rewritten or double-tagged.
- Missing/unapproved/paused commission program does not render a false affiliate CTA.
- An ordinary official link can render, with no claim of earning commission.
- Network-approved rule is usable only when configured and tested; unknown merchant rule fails closed.
- Invalid URL schemes, unsafe domain/redirect conditions, missing merchant or link IDs, duplicate IDs and unsupported placement types are rejected.
- `sponsored` links have appropriate disclosure; no fake partner labels, rates or review claims.
- No source/asset/image/license references are invented.

### Analytics

- One intentional click -> one custom partner action (when tracking allowed); ordinary external link does not become partner action by accident.
- Generic GA4 outbound enhanced-measurement event is not counted as a second sale/referral.
- With analytics consent denied, click still opens merchant URL but no unauthorized GA4 event fires.
- SPA home -> public Moab article -> back -> Atlas event/pageview counts are correct; no duplicate initialization caused by the module.
- Payload contains no private/account data, raw affiliate URL, itinerary, coordinates or payment information.

### UX/performance/privacy

- Mobile and desktop: visually aligned, accessible, keyboard/touch usable and non-obstructive.
- No extra AdSense ad slot, script, automatic ad request or paid API call from the new component.
- Public content remains indexable and does not depend on sign-in.
- No changes to My Atlas DO, private export, retention, public profile projection or private planning beta.
- Broken/missing partner links fail gracefully and do not leave dead call-to-action buttons.
- Existing gear/affiliate components continue working via compatibility selectors.
- Page load, bundle size and CLS remain reasonable; test against current baseline rather than claiming an invented performance result.

### Smoke-test scenario

1. Visit public Moab/Utah editorial route directly in a clean browser and from the home/Atlas navigation (where applicable).
2. Locate useful public planning block after actual destination content.
3. Verify disclosure is visible beside commission-earning CTAs and that the right brand name is used.
4. Click approved affiliate link (or ordinary fallback). Confirm correct merchant domain/landing page and preserved approved tracking URL.
5. Confirm the `partner_click` event appears once in consent-allowed GA4 DebugView or browser telemetry inspection; verify no raw URL or private data leaked.
6. Repeat with denied consent; external link still works and prohibited GA4 events do not fire.
7. Repeat on mobile; no overlay, double taps or lost navigation.
8. Verify no authenticated private-plan page displays the commercial block.

---

## 10. Implementation order and explicit stop points

| Milestone | Work | Ship/continue when |
|---|---|---|
| **0. Audit** | Inspect repo/docs, existing affiliate/GA4/consent, content and exact approved link inventory | Short evidence report; identify existing reuse paths and blockers |
| **1. Partner data** | Canonical merchant/link representation with approval/placement gates and validator | All link/approval tests pass; no duplicate registry |
| **2. Public UI** | One polished public Moab/Utah placement from real editorial content | Correct functional link(s), disclosure and accessible layout |
| **3. Analytics** | Reuse/fix `partner_click`, controlled GA4 QA and reporting note | Single-action semantics and privacy/consent verified |
| **4. Readiness** | Contact/disclosure/privacy audit; owner-reviewed changes; launch flag | Appropriate review completed; no unexpected AdSense change |
| **5. Pilot report** | Capture real traffic/referral baseline and owner operations | Document how to verify actual advertiser conversions |

**If advertiser approval/approved links or necessary disclosure/consent are absent:** Build/test the reusable structure and prepare an owner checklist, but leave monetized CTA(s) **disabled** and report the specific blocking fact. Ordinary editorial links may still be allowed if the owner approves and links are not represented as commissionable.

**Do not scope-creep to Split/Marrakech, a booking widget marketplace, airfare search, My Atlas personalized itineraries or AI enrichment in this patch.** After the first pilot has trustworthy tracking and a supported commercial link, the same registry/component can be reused in those locations without starting over.

---

## 11. Deliverables and final agent report

1. **Phase 0 findings**: exact files/features verified in current repo; current program/link evidence; blockers and risks.
2. **Implementation**: minimal registry/helper changes and one public Moab/Utah referral UI using existing layout/data conventions.
3. **Validation**: tests for tracked URL preservation, eligibility gating, privacy/consent, event uniqueness, affiliate disclosure and unchanged private My Atlas behavior.
4. **Owner handoff**: where to enter real approved URLs, how to set `isCustomTracked`/tracking mode, how to disable links/campaigns, how to update merchant approval/terms, and how to test tracking.
5. **Website policy review**: any disclosure/privacy/contact changes proposed or completed, with owner review flagged explicitly.
6. **Report**: changed code paths, commands and results, measured before/after behavior, unverified items, follow-up work and rollback strategy. **Never claim code implemented without evidence.**
7. **Documentation discipline**: Promote into the repo's managed proposal/implementation structure only after auditing actual front matter/index rules; keep `implementation_state` and verification evidence accurate. The repository is the source of truth, not this file's suggested structure.

### Definition of done

A visitor can read an existing, substantive public Utah/Moab story and **voluntarily open an appropriate real travel-provider link** from a tasteful, correctly disclosed editorial block. Program approval and merchant linking are accurate; no synthetic commission claim is made. The action is measured once in the existing consent-appropriate GA4 taxonomy, without private travel data or extra platform costs. The curated Atlas, My Atlas, gear catalog, media pipeline and AdSense behavior remain intact.

---

## 12. Deferred work / next independently approved work packages

- Add a second verified public destination (Split or Marrakech) using the same registry and disclosure system.
- Extend existing Gear registry with the same approved/custom merchant-link rules when the gear ingestion feature is ready; no new duplicate tracking stack.
- Build a one-page media kit and outreach package based on **verified** audience and link-referral performance, plus original photography/video licensing terms. Owner-led, not automatic advertising.
- After the implemented private planner passes its remaining disposable-account deletion, authenticated accessibility, and real-device Maps acceptance, separately evaluate an **optional, explicit, privacy-reviewed** `Find hotels / Find flights / Find vacation rentals` handoff. It should share only user-reviewed destination/search parameters and respect merchant placement rules. No private plan coordinates or dates may enter GA4.
- Assess sponsored brand placements only with signed terms, explicit `Sponsored` labeling and separate editorial ranking. A preferred Marriott paid placement is allowed only as disclosed sponsorship, not a concealed claim it is objectively the best hotel.
- After actual commission events: reconcile aggregate GA4 referral clicks to network dashboards (Expedia/Partnerize/CJ/Awin). Program reporting may be delayed, reversed or incomplete; never create false conversion guarantees.

---

## 13. Technical and policy references (verify latest terms before live use)

- FTC affiliate disclosure Q&A: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- FTC social media endorsement disclosure guide: https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers
- Google Search Central `rel="sponsored"`: https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links
- Google Analytics prohibited personally identifiable information guidance: https://support.google.com/analytics/answer/6366371
- Official Expedia creator affiliate information: https://creator.expediagroup.com/affiliates
- Marriott affiliate program: https://www.marriott.com/marriott/affiliateprogram.mi
- Booking.com affiliate registration: https://sp.booking.com/affiliate-program/v2/index.html
- CJ Publisher agreement: the owner's November 17, 2026 supplied U.S. agreement; review its Section 2 (promotion/privacy/tracking) and Section 4(e) (third-party posted-content license) before any CJ advertiser social promotions.

**Document state:** Proposed implementation handoff only. No site code, merchant accounts, network approvals, tracking settings, consent configuration, analytics properties, or advertising inventory was modified by preparation of this brief.
