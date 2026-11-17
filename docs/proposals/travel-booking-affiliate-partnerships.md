---
id: my-atlas-travel-booking-affiliate-partnerships
title: Roam With Justin - Planning-to-Booking Partnerships and Commerce
kind: proposal
status: proposed
implementation_state: partial
created: 2026-11-17
updated: 2026-11-17
related:
  - my-atlas-trip-planning
  - my-atlas-trip-planning-implementation
  - my-atlas-private-beta
  - monetization-analytics
  - gear-ingestion-affiliate-analytics-ai
supersedes: []
superseded_by: []
code_paths:
  - src/content/partners/index.mjs
  - src/content/selectors/projections.mjs
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - src/views/roam/RoamTripOverview.vue
  - src/utils/analytics.mjs
verification:
  state: unverified
  evidence: []
---

# Roam With Justin: My Atlas Planning to Travel Booking and Brand Partnerships

**Status: FUTURE PROPOSAL ONLY. No implementation is implied.**  
**Audience:** owner and Codex implementing agent.  
**Date:** November 17, 2026.

> This is a **companion proposal**, not a rewrite of the accepted planning-first
> beta and not a request to implement booking features immediately. The private
> wishlist, one-plan workflow, retention lifecycle, export, and client-only
> Maps and AI-prompt handoffs are implemented and documented in
> [My Atlas trip planning](../implementation/my-atlas-trip-planning.md).
> Travel merchant handoffs, booking panels, and sponsored placements remain
> unimplemented. Audit the live implementation and actual merchant approvals
> before changing application code.

## 1. Product thesis

**Roam With Justin is the inspiration and decision layer; approved travel merchants remain the booking layer.**

```text
Roam With Justin editorial Atlas / Instagram discovery
                      |
              Visitor saves interest
                      v
            My Atlas private Bucket List
                      |
               Private Trip Plan
                      |
          Helpful "Next steps" panel
             /         |          \
       Find flight  Find stay   Explore options
        /  |   \      / | \        /  |  \
     flight search   hotels rentals    cars/experiences
                      |
         Visitor chooses outbound link
                      |
        APPROVED AFFILIATE / ORDINARY LINK
                      |
       Merchant handles search and booking
                      |
        Affiliate network later reports any
        attributable qualifying conversion
```

The product is **not** an airline ticket seller, travel agency, booking engine, live rate comparison service, or price guarantee. Do not promise live inventory, the best price, confirmed availability, or the fastest route unless a separately licensed and reviewed integration can prove it.

### Objective

Offer a simple, trustworthy way to act on trip intent:

- **Find a flight** to the destination area.
- **Find a hotel** or other accommodation.
- **Find a vacation rental** (including an ordinary Airbnb link when no approved commissionable integration exists).
- **Find a rental car** or **things to do** later.
- Surface **firsthand lodging and experience recommendations** from the public editorial Atlas where they genuinely exist.
- Monetize through **approved affiliate commissions, clearly disclosed direct sponsorships, and eligible public editorial AdSense inventory**, each measured separately.

## 2. Important distinctions: how revenue is actually earned

| Channel | What user sees | When revenue may occur | Suitability |
|---|---|---|---|
| Travel affiliate | "Search stays on Expedia" / "View hotel at Marriott" | A valid, approved affiliate-link attribution and qualifying transaction under program rules | **Primary initial commerce model** |
| Direct hotel/brand sponsor | Explicitly labeled "Sponsored: [brand]" card or commissioned original content | Contracted campaign fee, fixed placement, license, or agreed results | **Later, with measured audience fit** |
| Direct ordinary outbound link | "Explore Airbnb" / brand website | No commission unless an approved tracking agreement exists | User utility, not monetization |
| AdSense display advertisement | Google-served advertising creative, distinct from editorial cards | Ad impressions/clicks per Google's system and policy | **Public content-rich editorial only** |
| Google Ads / Meta Ads | You buy promotion | **Expense**, not publisher revenue | Acquisition; evaluate against qualified outcomes |

Do **not** call every partner referral an AdSense impression. Do **not** treat a click as a booking, and do not promise commission for every product category (especially flights, where program eligibility and payouts can differ).

## 3. Recommended initial partner lineup (current opportunities to verify before launch)

| Visitor need | First path to investigate | Why | Current caution |
|---|---|---|---|
| General lodging, vacation rentals, activities, some flights | **Expedia Group Travel Creator Program** (Expedia, Hotels.com, Vrbo) | One creator program with links/widgets and broad travel inventory | Confirm approvals, qualifying products and actual rates in account; no automatic assumption all flight bookings pay |
| Hotels / other stays | **Booking.com Affiliate Program** | Popular broad accommodation inventory | Booking.com's current U.S. affiliate page points to **CJ**; the Booking.com North America Awin listing is labeled **closed 6/30/26**. Do not assume the owner's Awin membership is enough |
| Direct hotel chain bookings | **Marriott Affiliate Program** | Direct hotel/city deep linking; natural editorial fit where appropriate | Marriott's official FAQ says program uses **Partnerize**; apply and obtain approved links before publishing monetized CTA |
| Flight search/comparison | **Skyscanner affiliate / creator program**, or approved Expedia flight paths | Useful high-intent search handoff | Skyscanner currently lists a **>5,000 unique visitors/month** website threshold for its affiliate program; smaller creators can assess its creator route; check eligibility first |
| Airbnb | Airbnb Creators / Demand eligibility or **plain ordinary link** | Visitor explicitly asks for Airbnb | Airbnb's publisher program **is not accepting applications**; access to selective creator/demand programs is not automatic. No invented or manipulated affiliate URL |
| Vacation-rental alternative | **Vrbo via Expedia Group** | Broad rental inventory with an official creator referral route | Label as Vrbo, not Airbnb; respect approved link rules |
| Tours and activities | Approved activities affiliate or direct local venue agreements | Strong editorial tie to actual trips and experiences | Later phase; verify program, image rights and endorsements |

**Sources checked 2026-11-17 (official):**

- Expedia Travel Creator / affiliate: https://creator.expediagroup.com/affiliates
- Booking.com affiliate registration: https://sp.booking.com/affiliate-program/v2/index.html
- Awin Booking.com North America closed-listing notice: https://ui.awin.com/advertiser-terms/6776/affiliate
- Marriott affiliate and FAQ: https://www.marriott.com/marriott/affiliateprogram.mi and https://www.marriott.com/marriott/affiliateprogramfaq.mi
- Skyscanner affiliates: https://www.partners.skyscanner.net/product/affiliates
- Airbnb affiliate availability: https://www.airbnb.com/help/article/4236

**Operational rule:** actual merchant agreement/dashboard controls eligibility, affiliate destinations, approval, permitted promotional spaces, attribution, cookies, creative usage, rates, disclosures and reporting. The table is a shortlist, not proof of active agreements.

## 4. Suggested traveler experience: a lightweight "Ready to book?" panel

### Private saved plan

After the user intentionally saves a plan, optionally offer a separate, dismissible **Travel options** or **Plan next steps** panel:

```text
UTAH NATIONAL PARKS                                      My Atlas / Private
Moab -> Arches -> Canyonlands

Plan next steps
[ Find flights ]  [ Find places to stay ]  [ Vacation rentals ]
[ Find rental car ]  [ Things to do ]

You will search on a separate provider's site. Check dates, routes,
prices, access and availability there; My Atlas does not book your trip.

Accommodation options (shown only after user opens this section)
 - Compare stays on Expedia      [Search stays]   [We may earn a commission]
 - Find rentals on Vrbo          [Search rentals] [We may earn a commission]
 - Browse Marriott properties    [Marriott]       [We may earn a commission]
 - Explore Airbnb                [Airbnb]        [Ordinary outbound link]

A sponsored hotel card, if separately approved in the future, would be
clearly marked "Sponsored" and separate from neutral options.
```

### Crucial UX constraints

1. **Utility before marketing:** "Find flights", "Find stays", "Find rentals" are helpful user-initiated actions, not ads disguised as trip stops.
2. **No automatic commercial cards for a newly created private plan** in the first planning release. Introduce the handoff phase only after deletion/privacy/consent and affiliate permissions are verified.
3. **Never show AdSense inside the authenticated personal planner.** The prior AdSense architecture reserves it for substantial, suitable public editorial content. Google may restrict ads on password-protected content it cannot evaluate.
4. Country-only plans must resolve to an actual destination city/airport/region before meaningful flight/hotel searches; don't use a country centroid as a hotel address.
5. No implied availability. "Find stays near Moab" is safe; "Marriott Moab available for $210 tonight" requires separately verified live, licensed inventory.
6. **No mandatory handoff.** The user can plan and use My Atlas without merchant links, creating an account with any supplier, or clicking any ad.
7. Do not create an all-in-one booking checkout or scrape airline/hotel search engines.

### Public/editorial version

A place or journey article can show a small, more discovery-oriented block after substantial original content:

**Planning a trip to Moab?**

- Explore places to stay near Moab (approved affiliate or official ordinary link).
- Compare flights to the nearest practical airport (requires genuine airport selection, not a guessed centroid).
- See my firsthand hotel / activity notes if such editorial content exists.
- Optional **Sponsored** campaign card after separate approval.

Public editorial context is a better initial sponsor/ad surface than private Trip Plans. Keep paid creative away from photo lightboxes and MapLibre controls.

## 5. Affiliate architecture: approved partner links, not URL guesswork

### Key rule

Do **not** append arbitrary `?aff=...`, `?tag=...`, `?aid=...` to airline, hotel, Airbnb, Booking.com, or Marriott URLs. Tracking formats differ by program/network, may require wrapped destinations or generated deep links, and can be disallowed by program terms.

Reuse the gear-ingestion commercial-link direction, with **provider-specific approved builders** and a clear exact-URL override:

- `trackingMode: "custom"`: a **pre-approved tracking URL is stored and used verbatim**, after safety validation; never rewrite, replace or double-append affiliate parameters.
- `trackingMode: "approved-rule"`: use a provider-specific integration/configuration **only if documented and activated**; run tests against real known destinations.
- `trackingMode: "none"`: an ordinary, clearly noncommissionable outbound URL.
- If no valid tracked link is available, either display an approved ordinary search link or hide the commissionable CTA; **never pretend it is monetized**.
- Do not use generic redirect/cloaking or link shorteners where merchant programs prohibit them; preserve required referrer behavior and disclosures.

### Proposed merchant/offer registry (editorial/static, NOT per-user DO)

```ts
type TravelMerchant = {
  id: string
  label: string
  category: "flights" | "lodging" | "rentals" | "cars" | "experiences"
  programProvider: "expedia" | "cj" | "partnerize" | "awin" | "skyscanner" | "direct" | "none"
  approvalStatus: "not-applied" | "applied" | "approved" | "active" | "paused"
  trackingMode: "custom" | "approved-rule" | "none"
  destinationUrl?: string
  approvedLinkRuleId?: string
  allowedSurfaces: Array<"editorial" | "gear" | "instagram" | "private-planner-handoff">
  disclosureKind: "commission" | "sponsored" | "none"
  verifiedAt?: string
}

type TravelPlacement = {
  id: string
  merchantId: string
  surface: "public-destination" | "public-journey" | "private-plan-handoff"
  service: "flights" | "lodging" | "rentals" | "cars" | "experiences"
  placementType: "neutral-link" | "affiliate" | "sponsored"
  editorialPriority: number
  sponsorCampaignId?: string
}
```

Examples are **schema sketches**, not currently implemented TypeScript contracts. Reuse the existing `partners`, `affiliates.js`, GA4 partner event, selectors and content models after auditing, rather than creating competing registries.

**Avoid confusion:** A hotel's being listed under a global OTA, a direct brand affiliate, and a sponsored campaign should be distinct links/relationships. One company can have multiple link destinations but only one canonical identity for reporting.

## 6. Search handoff contract (NO live price API initially)

Keep the planning-state model from the revised proposal: GeoNames canonical IDs, user-owned private plan stop snapshots, and planned/visited separation. **Do not put affiliate/search data inside the global user account revision just to display optional merchant links.**

Suggested browser-side ephemeral object:

```ts
type TravelSearchIntent = {
  service: "flight" | "hotel" | "rental" | "car" | "activity"
  publicDestinationLabel: string // Resolved locally from selected non-sensitive place
  destinationCityId?: string     // Canonical catalog ID, internal only
  originAirportCode?: string     // User explicitly selected, never inferred from login/GPS
  destinationAirportCode?: string // Verified, not automatically guessed
  dates?: { checkIn?: string; checkOut?: string } // Explicitly user-provided
  party?: { adults?: number; children?: number } // Optional and conscious user choice
}
```

- No required dates; search should work with region/city alone when the merchant permits it.
- **Private plan fields are never exposed automatically.** Before opening an external search, show the selected service/provider and optional location/date/party details being shared. Use an explicit click to leave the site.
- Do not pass a home/start coordinate, exact custom pin GPS, private note, user Auth0 ID, account identifier, secret or entire itinerary to the provider.
- A user's chosen destination city is a booking search query, **not** an advertising audience record.
- Never call a merchant API from the browser with a secret; if an API is added later, put credentials only in a Cloudflare Worker secret with rate limits, budgets and a separate security/privacy review.
- Some programs restrict query-string templating, API usage, widgets, social attribution or deep linking. **Build links only with program-approved mechanisms** (including SDKs/builders where needed).
- If an approved hotel link cannot accept chosen dates, do not fake it; send user to the merchant's normal search and let them enter dates.

### Flights: focus on city/airport selection, not route math

The road-trip plan's geographic start/end is **not automatically an appropriate flight origin or destination airport**. Flight search should ask the user to pick an origin city/airport and destination city/airport; support multi-city later. A plan containing Moab does not mean the correct arrival airport is Moab. No IATA mappings should be guessed into persisted records.

## 7. Marriott vs Hyatt: brand preference without hidden steering

**Yes, a negotiated Marriott partnership can be an advantage, but it must not turn into secret manipulation.**

Allowed examples:

- A public article about a Marriott property you actually stayed at, with original photos, accurate details, and an approved direct booking link.
- A clearly marked **"Sponsored: Marriott"** feature card in a relevant city or public destination guide, supported by a real paid agreement.
- A disclosed affiliate action **"Browse Marriott hotels in [city]"**, available alongside neutral discovery tools and alternative accommodations.
- A destination partnership with an independently operated hotel, a local tour company, or a specific property that is a practical early commercial contact.

Not acceptable:

- Claiming Marriott is "best" or "recommended from personal experience" when that is not supported.
- Silently excluding Hyatt, rentals, or other relevant options solely because their commission is lower.
- Presenting paid placements as if they were an objective ranking or as an unpaid editorial recommendation.
- Claiming to be an *official partner* unless approval or an executed sponsorship agreement supports it.

**Recommended ranking separation:** editorial relevance (user-selected service/location; actual personal experience, practical location, verified relevance) and paid **placement** are separate concepts. A contracted promotional slot may favor a brand **only when labeled Sponsored**. Unpaid comparison/results should not covertly favor the highest bidder.

### Partnership progression

1. **Affiliate first:** apply to programs, configure/test approved links, gather 30-90 days of reliable outbound metrics.
2. **Local direct partnerships:** approach individual hotels, tour guides, outfitters and activity providers already covered by Roam With Justin's original content. Pitch original media and referrals together.
3. **Brand-level offers:** Marriott/Hyatt/Expedia-type partnerships become more credible with consistent relevant engagement, destination-specific referral counts, original visuals, and confirmed campaign reporting.
4. **Sponsored campaigns later:** fixed sponsorship fees, limited editorial placements, licensed photography/video packages, or negotiated commission structures. Keep contracts, creative rights, disclosures, term/termination and attribution ownership explicit.

## 8. Analytics, AdSense, attribution, privacy

Align with existing 3-day GA4 improvement roadmap: **measure real Atlas engagement reliably first**. The screenshots showed 512 site active users and only 18 Atlas active users over a short initial window; those numbers do not prove a broad planning audience or sponsor pricing power. Don't promise bookings based on early traffic.

### Reuse GA4 and classify real outbound referrals

Reconcile existing events before adding any event. Existing `partner_click` is the preferred commercial action taxonomy, where it is available and consent allows it.

Proposed fields for *public editorial* affiliate clicks:

```json
{
  "event": "partner_click",
  "partner_id": "expedia",
  "service_type": "lodging",
  "placement": "destination-planning-card",
  "link_type": "affiliate",
  "public_destination_id": "public-editorial-id"
}
```

For a **private plan handoff**, use only coarse non-sensitive values where analytics consent and the product privacy review permit the event:

```json
{
  "event": "partner_click",
  "partner_id": "expedia",
  "service_type": "lodging",
  "placement": "private-trip-next-steps",
  "link_type": "affiliate"
}
```

**Never transmit** private plan IDs, wish IDs, person identifiers, dates, custom coordinates, home locations, private notes, raw search strings, or private destination IDs to GA4/ads. For private plans, omit `public_destination_id` rather than inventing a private one. Do not build a new `/v1/telemetry` endpoint. Do not count GA4 enhanced measurement's generic `click` and `partner_click` as two separate referrals.

### Revenue accounting

- GA4: actual recorded outbound links, public page engagement, funnel actions (subject to consent).
- Merchant / CJ / Awin / Partnerize / Expedia dashboard: **verified qualified bookings**, pending/approved/canceled commissions, program currency, approved revenue.
- AdSense: ads and publisher reporting **on approved public editorial content**, not affiliate bookings.
- Direct sponsors: contracted placements/creative deliveries plus agreed campaign reporting.
- Do not join or sell private individual itineraries to commercial partners.
- Use aggregate reports with audience-size thresholds to avoid revealing sparse travel intentions.
- Expect merchant-side attribution gaps from consent choices, app handoffs and program attribution windows; don't fabricate perfect conversion data.

### Disclosures and link markup

- Near actionable affiliate buttons, explain plainly: **"We may earn a commission if you book through this link, at no additional cost to you."** (Only where accurate; confirm provider rules.)
- Mark paid featured content clearly **"Sponsored"** and preserve independent editorial labeling.
- Paid/affiliate anchors should generally use `rel="sponsored"`; add `noopener noreferrer` for external new tabs where applicable.
- Approved images/logos are not free for arbitrary reuse; use original photos or properly licensed/merchant-provided creative only within its permitted usage.
- AdSense can serve only where eligible, approved and compliant; signed-in personal dashboards with restricted content are not an appropriate initial ad surface.

**Policy references:**

- FTC affiliate/material connection disclosure: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- Google outbound paid link qualification: https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links
- Google AdSense placement rules: https://support.google.com/adsense/answer/1346295
- Google Analytics private data rules: https://support.google.com/analytics/answer/6366371

## 9. Cost/complexity guardrails

**MVP: no paid search API, no flight/hotel crawling, no inventory sync, no price tables, no new database, no LLM calls.**

- Browser constructs **approved** affiliate links from static configuration or opens static provider URLs.
- Most routing and planning data stays in existing My Atlas per-user Durable Object; keep merchant registry editorial/static and avoid any per-view DO write for affiliate rendering.
- No auto-recommendation from private plan histories.
- No API expenditure per merchant-card impression or every plan open.
- Search providers handle checkout; Roam With Justin never handles payment card details.
- Travel-intent feature flag defaults off until user benefit, legal review, and partner credentials are confirmed.
- A future partner inventory API may be useful, but requires rate/cost/rights analysis first.
- Avoid content-heavy first-load widgets and network scripts that would worsen Atlas map performance on mobile.

## 10. Planned phases / gates

### Phase 0 - Confirm actual repository and commercial state

- Read current `docs/architecture/my-atlas-account-state.md`, monetization architecture and current managed docs; inspect actual code before claiming anything shipped.
- Audit current Auth0 My Atlas, DO profile revisions, export, account deletion status, existing public projection and page routes.
- Read revised Bucket List/Trip Plan proposal; preserve immutable plan stop snapshots, `If-Match` + idempotency, plan statuses (`draft|saved|archived`), six-month retention + 30-day grace and server-side expiry.
- Verify prior media/gear/partners registry and GA4 tracking. Do not invent new variants of the same concepts.
- Verify current Awin, CJ, Expedia, Marriott/Partnerize, and Airbnb approval **in the actual accounts**, never assume membership in Awin means affiliate acceptance at every advertiser.
- Confirm privacy, age, retention, consent and AdSense account status.

### Phase 1 - Ship the previous private planner **without** booking offers

- Private wishlist CRUD; one saved three-stop plan with immutable snapshots; reorder; client-only Google Maps URL; client-only privacy-filtered AI prompt; export; no public leakage.
- Implement and verify permanent account deletion before inviting planning-beta users.
- Preserve the six-month confirmation and 30-day pending-delete lifecycle; no passive refresh.
- Follow the existing global DO revision and idempotency system.
- **Do not merge commercial work into Phase 1.**

### Phase 2 - Standalone public editorial affiliate handoffs

- Add/update a **minimal canonical travel merchant registry** using actual approved URLs, distinct from gear.
- Select ONE public high-interest destination page, with original substantial content, and show `Find stays` and one other travel-service link.
- Allow verified, tested link types `custom | approved-rule | none`; show a clear disclosure.
- Reuse `partner_click` analytics and test against GA4 duplicate generic click behavior.
- No AdSense change, no paid provider APIs, no private-plan awareness.

### Phase 3 - Opt-in private-plan "Next steps" handoff

- Add utility buttons to completed saved plans: flight, hotel, rental and later car/experiences.
- Resolve city/region separately from private custom pin coordinates. Require explicit user choice for airport and search dates.
- Show pre-handoff parameters and external-provider disclosure; no automatic export on plan load.
- Respect affiliate partner permitted surfaces and privacy consent; no plan-sensitive GA4 events.
- Test no itinerary leakage, no public share of future travel, and no changes to My Atlas plan-retention clocks due to handoff.

### Phase 4 - Direct sponsor experiments and brand relationships

- Offer one clearly labeled sponsor location on a relevant, content-rich public page, not inside a map pin or personal planner.
- Pair exposure with original photos/videos and a real venue experience whenever possible.
- Measure sponsor-card exposures and clicks accurately; collect merchant-confirmed bookings only if agreed reporting is available.
- Establish commercial contracts, disclosure and creative licensing review before enabling campaigns.

### Phase 5 - Advanced integrations only after demonstrated demand

- Approved availability feeds, deep-linked search widgets, affiliate conversion callbacks if programs allow and privacy is reviewed, structured comparisons, richer local recommendations.
- Build only if measured user demand and verified commissions justify implementation/operating cost.
- Do not turn the product into a disguised full travel booking engine.

## 11. Acceptance criteria (Codex)

1. No claim of an implemented planner or booking affiliate feature where code does not yet exist.
2. Existing curated Atlas, private My Atlas, media pipeline, gear ingestion, AdSense, Auth0 and CF Worker/DO remain working and architecturally separate.
3. Existing first planning release ships without affiliate offers or AdSense as agreed.
4. A public editorial "Find stays" link uses a genuinely approved merchant destination and clearly disclosed commercial status.
5. No arbitrary affiliate-tag query parameter is appended to unsupported URLs; custom approved links are preserved exactly.
6. Unapproved/inactive merchant falls back to an honest ordinary link or is hidden; it cannot silently earn imaginary commission.
7. A click produces no more than one counted custom partner referral; no double-counting with GA4 enhanced-measurement click.
8. Private trip ID, destination IDs, GPS, home origin, notes, exact dates and identities do not appear in GA4/ad parameters or URLs sent to partners without explicit, visible user selection (and only permissible fields).
9. Ads are absent from authenticated private-plan pages; no surprise marketing pixels or new telemetry endpoint.
10. Brand- or hotel-specific sponsored placements are labeled and do not masquerade as a neutral "best hotel" ranking.
11. The fallback user experience remains usable with zero affiliate approvals, zero price APIs and zero bookings.
12. Flight search asks for/verifies airport city, rather than treating a road-trip start/stop coordinate as an airport.
13. Public page performance, accessibility, consent and mobile Atlas interaction are tested.
14. Qualified bookings/commissions are reconciled against affiliate-network reports, not inferred from GA4 clicks.
15. Future plans preserve existing retention, deletion, owner isolation, global revisions, snapshots, explicit visited conversion and public-data boundaries.

## 12. Suggested minimal Codex assignment

> Audit Roam With Justin's current monetization/GA4 and public destination editorial architecture alongside the revised My Atlas planning proposal. **Do not assume the planner or prior gear proposal is implemented.** Implement only a reusable, provider-safe travel affiliate-link model and **one public editorial destination** panel offering an approved accommodation search link; allow ordinary links when no partnership exists, preserve branded/sponsored disclosure and reuse the existing GA4 `partner_click` event. Do not add AdSense to private dashboards, expose private trip data, scrape travel listings, add paid booking/LLM APIs, or modify the current My Atlas user state. Separately report readiness and blockers for a later opt-in private-plan booking handoff.

---

**Document state:** Future proposal. No repository code, My Atlas account state, advertiser approvals, affiliate account settings, GA4 events, Cloudflare configuration or merchant contracts were changed.
