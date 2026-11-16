---
id: my-atlas-private-beta-v1
title: My Atlas Private Beta V1 Architecture
kind: historical
status: archived
implementation_state: none
created: 2026-11-16
updated: 2026-11-16
related:
  - my-atlas-private-beta
supersedes: []
superseded_by:
  - my-atlas-private-beta
code_paths: []
verification:
  state: unverified
  evidence: []
---

> **Archived:** This initial product architecture is superseded by the accepted
> [My Atlas Private Beta V1.1 proposal](../proposals/my-atlas-private-beta.md).
> It is retained for decision history and is not an implementation instruction.

# Roam With Justin - My Atlas (Private Beta)
## V1 product and architecture proposal for Codex

**Status:** Proposed; repository audit required before implementation  
**Date:** 2026-11-16  
**Product:** A lightweight, shareable personal travel pinboard hosted within Roam With Justin  
**Intended implementer:** VS Code / Codex agent working in the existing Roam With Justin repository  
**Scope:** V1 private beta, future V2 media and enhanced annual recaps

> **Product constraint:** The owner builds and curates the existing Roam With Justin Atlas. Visitors create a separate, much simpler **My Atlas** consisting of destinations they have visited, a public shareable profile, and a simple annual travel recap. Do not expose the owner's journeys, stories, visit authoring, media ingestion system, or editorial tools to user accounts.

> **Infrastructure constraint:** Keep the current Vue/static site deployed to GitHub Pages. Add a small Cloudflare Workers API and Cloudflare-managed storage. Prefer a NoSQL-style key/value data model. Reuse the owner's Cloudflare account and existing R2 expertise, but isolate beta user data from editorial media. No traditional server to deploy or manage.

---

## 1. Outcomes and non-goals

### V1 goals

1. A visitor can open a shareable public personal Atlas without logging in.
2. Only invited beta testers can register a new personal Atlas; registration requires a valid invitation code and third-party sign-in.
3. Signed-in testers can **create, read, update, and delete** visited-place pins, and edit or delete their profile/account.
4. Pins are geographic markers only. No individual pin pages, galleries, ads, journals, or itineraries.
5. Users can search recognizable destinations, pin them, and revisit or share their personal map.
6. Every eligible public profile uses a template with **one responsive AdSense ad placement** (not an ad per pin). Actual fill/impressions are not guaranteed.
7. A shared profile provides a compelling introduction to My Atlas and an invitation-driven sign-up path without obstructing the profile itself.
8. Store an optional year visited for annual recaps, while allowing undated lifetime pins.
9. Provide a simple, downloadable/shareable annual recap without requiring image upload in V1, if there is enough dated data.
10. Protect the existing photography-led Atlas and its routes, metadata, performance, and editorial architecture.
11. Keep beta operations inexpensive, observable, reversible, and explicit about possible data resets.

### Deliberate V1 non-goals

- No image uploads or storage from users.
- No three-photo favorites or cover images yet; **V2** reserves exactly one cover and three favorite images per profile, not per pin.
- No user-authored stories, article bodies, reviews, videos, comments, private messaging, or community feed.
- No per-pin advertising or paid placement inserted into a user's visited pins.
- No complex travel date/timeline system. Only optional visited year(s).
- No follow graph, public search/discovery of users, or social-network features.
- No direct-sponsored advertising marketplace or individual-level advertiser targeting.
- No assumption that a public profile pageview equals an AdSense impression.

### Experience principles

**Creator:** Search -> Pin -> Optional year -> Save -> Share.  
**Viewer:** Open shared link -> Explore map and travel highlights -> Discover My Atlas -> Request an invitation/sign up.  
**Owner:** Manage invitations, moderate public profiles, observe aggregate usage, monitor cost and ad eligibility.

V1 should feel like a beautiful digital version of a pin-covered travel map, not like a stripped-down content management system.

---

## 2. Recommended architecture

```text
                   Existing roamwithjustin.com
                         Vue / GitHub Pages
                                |
                +---------------+----------------+
                |                                |
        Curated owner Atlas               My Atlas frontend
        (keep unchanged)               (public + authenticated)
                                                 |
                                      HTTPS: api.roamwithjustin.com
                                                 |
                                       Cloudflare Worker API
                                                 |
            +-----------------+------------------+------------------+
            |                 |                  |                  |
      Managed social     Durable Objects     Workers KV        Existing R2
      authentication     strong writes       read snapshots     V2 images only
      Google/Facebook    invites/users       public maps         isolated prefix
            |                 |                  |
            +----- JWT -------+------------------+
                                                 |
                                 Optional Worker profile HTML
                                 for direct links + OG metadata

  AdSense: one responsive slot on eligible public profile pages;
  analytics: measure pageviews separately from actual ad impressions.
```

### Why Cloudflare instead of Firebase

You already operate Cloudflare R2 for your editorial media. Cloudflare Workers provides a server-side API on a domain you control, with no conventional application server. It can handle invitation redemption, authorization, normalization, public reads, and administration while the Vue frontend stays on GitHub Pages.

**Keep the services separate:** GitHub Pages serves the static application; a Worker implements the API. Do not migrate the entire site unless an audit reveals an independent need.

### Storage architecture decision: KV alone is not enough

Workers KV is excellent for globally distributed, **read-heavy public snapshots**, but it is eventually consistent. A write may take roughly a minute or more to be visible from other locations, and writes to the same key are rate-limited. Read-modify-write and unique claims cannot safely rely on KV alone.

Use:

- **Cloudflare Worker:** request validation, authentication verification, authorization, location adapter, public API, administrative endpoints.
- **Cloudflare Durable Objects (DO):** authoritative mutable account/pin state, serialized/transactional invitation redemption, handle reservation, atomic update and deletion. Use Cloudflare's **new SQLite-backed DO class with its key/value storage API**; this is a key/value programming model, not a request to build relational SQL tables. Cloudflare currently recommends SQLite-backed DO classes for new implementations.
- **Workers KV:** public, denormalized, sanitized profile/map snapshots; short-lived caches; non-authoritative indices. The DO remains authoritative if a snapshot is stale.
- **R2:** no new user media in V1. For V2, store tightly limited optimized images in an isolated user-content bucket/prefix, never intermixed with the existing curated editorial pipeline.

**Alternative for agent evaluation:** For an extremely small beta, DO can serve both owner reads and public profile reads directly, with KV caching introduced only if measurement warrants it. Prefer fewer moving parts if caching adds complexity without measurable value. Do **not** substitute KV-only mutable data storage without documenting consistency compromises and safeguards.

### Deployment boundary

- Suggested API: `https://api.roamwithjustin.com/v1/...` on a Cloudflare Worker custom domain.
- Suggested public share link: `https://roamwithjustin.com/my-atlas/{handle}` if the current DNS/proxy setup supports a Worker route for server-rendered public metadata; otherwise use a dedicated Worker-hosted `https://share.roamwithjustin.com/u/{handle}` and link to the existing application.
- Inspect GitHub Pages custom domain, Cloudflare DNS proxy status, Vue router behavior, Google search/share bot rendering, and existing Atlas routes **before** selecting final URL structure.
- Existing site builds/releases continue through their current GitHub Actions/Pages flow; Worker code has a separately deployable Wrangler configuration and environment bindings.
- Public profile URL must survive refresh, direct navigation, social sharing and link previews. Don't rely on a client-only SPA route that returns GitHub Pages 404 or empty Open Graph data.

---

## 3. V1 flows

### A. Invite-only registration

1. Visitor opens `/my-atlas` entry page, or sees CTA on a friend's public Atlas.
2. Clearly identify the feature as **Private Beta**. Show what it does and disclose that beta pins/profiles may be reset before general release.
3. Request an invitation code. Validate its format and eligibility **on the Worker**, not in browser JavaScript. Avoid leaking valid codes through detailed error messages.
4. User continues with a managed Google sign-in. Facebook sign-in should also be supported when provider setup, review, and mobile-browser behavior are validated. Consider Apple as a future provider.
5. Verify the authentication provider's signed identity on the Worker, create an internal stable user ID, and atomically redeem/reserve the invite. Never trust a client-supplied user ID or authorization flag.
6. Collect a public display name and unique public handle; allow privacy controls and require acceptance of current beta notice/privacy terms.
7. Create the user's empty Atlas and redirect to the map editor with a first-pin onboarding cue.
8. Subsequent logins use their social identity. No password database in the application.

**Ordering and race safety:** A preflight invitation check is only advisory; the real code consumption happens atomically after identity is verified. A failed/aborted registration must not permanently consume a code without an account. Make redemption retry-safe for the same account and reject excessive uses. Do not place raw invitation secrets in client-side storage or URLs.

**Social authentication:** Evaluate a reputable managed identity provider with Google/Facebook social connections and a Vue SPA integration. The Worker validates the provider's JWT signature, issuer, audience and expiry against its JWKS. Do not implement OAuth token exchange, refresh tokens, or social-account linking from scratch for V1. Cloudflare Access is meant primarily for protected applications, not as the consumer social-login system here.

**Public viewing is ungated.** Invite codes restrict creating a profile, not a friend viewing a shared map. The public profile may include "Join the Beta" and "Have an invite?" CTAs. Friends without codes can request/waitlist if the owner enables that later; a waitlist is not essential to V1.

### B. Create a pin

1. Sign-in owner taps **Add a place**.
2. Typeahead searches cities, countries, and recognizable destinations (e.g., parks/landmarks when provider supports them).
3. Show unambiguous label with region/country, suitable category and map preview when necessary.
4. Select place, optionally add visited year (or choose "year unknown"), and save.
5. Immediately show the saved pin from authoritative state. Publish a sanitized public snapshot asynchronously; notify if a public map may take time to update.
6. Repeated selection of the same canonical place should offer "Add another visited year" or prevent an accidental duplicate, rather than creating indistinguishable stacked pins.

### C. View, edit, remove and delete

- **Read:** Public visitor can view public profile, its pins and aggregate highlights; owner can view own private/editor state.
- **Update:** Owner can rename their display name, change handle with safe redirects, toggle public visibility, correct a pin's year(s), and replace a pin's chosen place if needed.
- **Delete pin:** Show confirmation and remove the pin from authoritative storage and public snapshot/cache; no orphaned summaries.
- **Delete account:** Confirm separately; delete/deactivate profile, pins, identity bindings, public snapshots, caches, and future media, subject to documented retention for abuse/security records. Support export before delete.
- **Undo:** Optional short-lived UI undo for pin deletion; account deletion always requires stronger confirmation.

### D. Share a profile

- Public URL is stable, human-friendly and case-normalized.
- Shared page displays user display name, map, numbered destination/country/city highlights, and an optional simple beta disclaimer.
- Contextual, clearly separate invitation CTA: "Map your own travels" or "Create your Atlas".
- Web Share API on mobile with copy-link fallback.
- Generate useful Open Graph title/description and a generic share preview image in V1; **user-uploaded photos not required**.
- Profile visibility defaults should be clearly selected during onboarding; avoid exposing hidden or newly created profiles before consent.

### E. Annual recap

- V1 should **collect visited years now** even if the full recap experience launches later.
- Basic V1 recap can show: countries visited in year Y, distinct cities/destinations added with visit year Y, and perhaps countries as a shareable text/map-based graphic.
- Lifetime count and calendar-year count are **different metrics**. Pins without a visited year contribute to lifetime stats, not a specific year's recap.
- If a user revisits a destination in multiple years, store multiple visited years against one canonical pin.
- Count distinct countries once per year. Pick and document a consistent country reference list/denominator and handling of disputed territories and travel to non-country jurisdictions.
- Allow browser-generated 9:16 recap share graphic without persisting a new image, provided map/data licenses permit export.
- **Beta reset conflict:** a recap for year Y cannot be accurate if the underlying pinned visit history has been deleted. During beta, label recap as provisional, offer export, and do not promise permanent annual history.

---

## 4. Minimal geographic model

User input should be a **destination choice**, not manual latitude/longitude entry.

### Supported V1 place levels

- **Country:** Canada, Morocco, etc. Display a geographic country marker or country highlighting if map data licensing permits.
- **City/locality:** Amsterdam, Split, Miami, etc.
- **Named place/attraction:** Grand Canyon, Maho Bay, etc. Permit only if the chosen provider supplies stable geographic identity and suitable public coordinates.

Every pin resolves to:

- stable provider place ID or normalized internal `placeId` (not a free-text-only name);
- `name`, `displayLabel`, `category` (`country`, `city`, `place`);
- parent region/country codes when available;
- non-sensitive representative coordinates, with a suitable precision;
- provider/source and licensing metadata.

Do not treat text strings such as "Paris" as unique without country/region disambiguation. Avoid exact residential addresses and precise real-time/current-location sharing. Users are recording *past travel*, not live tracking.

### Geographic and billing safeguards

- Reuse existing MapLibre/MapTiler components where appropriate, without modifying curated Atlas marker semantics.
- Validate allowable commercial use, geocoding storage/caching terms, attribution, request quotas, and map tile pricing for **many public profile views**.
- Bound autocomplete requests with debounce, minimum length, server/client rate limits, and hard result limits.
- Cluster pins at wide zoom levels and support country-level aggregation so hundreds of pins stay fast.
- Define parent-country mapping for counting cities/countries; don't double count the same place under different spelling or provider aliases.
- V1 does not need personalized routes, visit chronology, image hotspots or content cards per pin.

---

## 5. Data model (NoSQL-style, illustrative)

The following are *domain contracts*, not an instruction to create a relational SQL schema. Use Durable Object key/value storage or an equivalent strong-consistency store for mutable state. Use versioned, sanitized public JSON snapshots for public reads.

### Account / profile (authoritative)

```json
{
  "userId": "usr-c7eab2",
  "identitySubject": "managed-provider|opaque-id",
  "handle": "traveler-example",
  "displayName": "Traveler Example",
  "public": true,
  "betaAcceptedAt": "2026-11-16T15:00:00Z",
  "profileStatus": "active",
  "createdAt": "2026-11-16T15:00:00Z",
  "updatedAt": "2026-11-16T15:00:00Z",
  "revision": 1
}
```

Never expose `identitySubject`, email, tokens, or invitation details in public snapshots.

### Pin (authoritative, one per canonical place per user)

```json
{
  "pinId": "pin-f3b8c1",
  "userId": "usr-c7eab2",
  "placeId": "place-provider-opaque-id",
  "placeType": "city",
  "displayLabel": "Split, Croatia",
  "countryCode": "HR",
  "point": { "lat": 43.5081, "lng": 16.4402 },
  "visitedYears": [2026],
  "createdAt": "2026-11-16T15:15:00Z",
  "updatedAt": "2026-11-16T15:15:00Z",
  "revision": 1
}
```

The example coordinates are illustrative representative city coordinates. The actual destination provider must supply grounded coordinates. V1 can store a pin with an empty `visitedYears` array if the date is unknown.

### Public profile snapshot (KV, denormalized, never authority)

```json
{
  "schemaVersion": 1,
  "handle": "traveler-example",
  "displayName": "Traveler Example",
  "public": true,
  "pins": [],
  "stats": { "countries": 0, "cities": 0, "otherPlaces": 0 },
  "revision": 1,
  "updatedAt": "2026-11-16T15:15:00Z"
}
```

Snapshots should contain only consented public fields and be reconstructible from authoritative state. Use bounded size/pagination; don't assume one unbounded KV blob is safe at 10,000 pins.

### Invitations

- Store only a salted/keyed digest of each randomly generated high-entropy invitation code, never plaintext codes in persistent data or logs.
- State: issue date, expiry, max uses (typically one), redeemed count, status (active/revoked), optional campaign label.
- Redeem via strongly consistent Durable Object with idempotent user binding. Use unique invite lookup in a way that does not reveal validity to unauthenticated scrapers.
- Avoid generic shared codes for unlimited uncontrolled registrations. If a batch code supports many users, enforce an atomic max-use counter.
- Admin can create/revoke invitations through protected CLI or secured admin endpoints.

### Handle reservations / identity mapping

- Unique, case-folded handles with reserved words, length and allowed characters validated server-side.
- Atomic handle claim, rename and tombstone/redirect policy to avoid impersonation and dead links.
- Link managed-identity provider subject to stable internal userId. If account linking across Google/Facebook is desired, use the managed provider's safe linking workflow rather than email-address matching alone.

### Data lifecycle

- Distinguish active profile, hidden profile, suspended profile, deleted profile, and beta-reset data.
- Never place secrets or raw OAuth credentials in Git, KV public snapshots, URLs, or client bundles.
- Keep data shape versioned for future migration, including V2 media references.

---

## 6. Proposed API surface (adjust to repository conventions)

All protected endpoints require a validated signed identity and user-ownership authorization; all state-changing endpoints enforce rate limiting, input validation, size limits, and origin/CORS policy.

| Endpoint | Auth | Behavior |
| --- | --- | --- |
| `GET /v1/public/atlas/{handle}` | None | Sanitized public Atlas and pins; 404 if private/unavailable |
| `GET /v1/me` | Sign-in | Get own profile/editor state |
| `POST /v1/beta/invites/check` | Limited public + abuse control | Advisory invite precheck; not authoritative redemption |
| `POST /v1/beta/register` | Sign-in + invite + Turnstile | Atomic beta eligibility and profile creation |
| `PATCH /v1/me` | Owner | Update profile, handle, visibility |
| `DELETE /v1/me` | Owner | Account deletion with explicit confirmation |
| `GET /v1/me/pins` | Owner | Paginated own pins |
| `POST /v1/me/pins` | Owner | Create canonical pin or merge visit-year intent |
| `PATCH /v1/me/pins/{pinId}` | Owner | Edit pin, place or visited years |
| `DELETE /v1/me/pins/{pinId}` | Owner | Delete pin and refresh public snapshot |
| `GET /v1/me/export` | Owner | JSON/CSV export of personal map |
| `GET /v1/public/atlas/{handle}/recap/{year}` | None when profile is public | Aggregated year recap, no private data |
| `POST /v1/admin/invitations` | Admin | Create/revoke invitation batch, protected |
| `POST /v1/admin/profiles/{id}/moderate` | Admin | Hide/suspend public profile, protected |

For mutation endpoints, use idempotency keys where retries could create duplicate state. Use explicit version/revision checks for concurrent edits and publish/update public snapshots after authoritative mutation succeeds. Test account deletion and public-cache invalidation across multiple edge locations.

### Worker bindings and environment isolation

```text
MY_ATLAS_PROFILES_KV       Public read snapshots only
MY_ATLAS_USER_DO          Per-user authoritative profile + pins
MY_ATLAS_INVITE_DO        Atomic code redemption
MY_ATLAS_HANDLES_DO      Atomic handle claims
MY_ATLAS_PUBLIC_MEDIA_R2   Reserved for V2, separate from editorial assets
AUTH_ISSUER / AUTH_AUDIENCE / AUTH_JWKS_URL
TURNSTILE_SECRET         Worker secret; no browser exposure
```

These are illustrative binding names. Agent should decide whether to consolidate Durable Object classes without creating a global write hotspot. Maintain separate development/staging/production resources and secrets.

---

## 7. AdSense and monetization requirements

### V1 requirement: one ad placement on each eligible public profile

- Public profile template includes **one dedicated responsive AdSense ad slot** in a visually separated, accessible location, normally after the map/summary and before the invitation CTA or other substantive travel content.
- A profile with no meaningful map content, a suspended/private profile, auth page, invite gate, empty editor, error page or content under review **must not force an ad request**. This exception is necessary for Google policy compliance.
- A public profile should have real value beyond the ad: map, searchable/visible pins, distinct country and city counts, and a clear public presentation.
- No ads inside markers, tooltips, modal pin selectors, map controls, or individual pin interactions. No ad refresh on every pin click or client-side state change.
- Ad component must mount correctly on direct navigation and SPA-to-SPA transitions, without duplicate initialization or double requests on re-render.
- Use Google-provided ad code/configuration rather than manipulating ad internals; honor applicable consent requirements and platform policies.
- Explicitly distinguish `public_profile_page_view`, `ad_slot_attempt` (optional product metric), AdSense **ad requests**, **matched/served ad impressions**, **viewable impressions**, and actual revenue. These are not the same thing.
- **100,000 registered users != 100,000 monthly pageviews != 100,000 monetized impressions.** An ad unit is an opportunity; the ad network controls actual serving/fill.
- Validate monetization on sparse user-generated profiles with Google Publisher Policies before broad rollout; if a page lacks qualifying publisher content, suppress ads until adequate value exists.

### Future direct business partnerships

Do not build a full ad marketplace in V1. Future roadmap may include clearly labeled sponsored discovery placements separate from user-verified visited pins. Sell aggregate destination engagement and measured campaign performance, not personal travel histories. Distinguish **visited** from **planning or actively exploring** a destination; do not infer travel intent merely because a city is pinned.

### Analytics (V1, privacy-aware)

Measure unique public profile visits where feasible, profile share interactions, invite funnel, first-pin success, repeat pinning, returning users, map/geocoder requests, destinations by broad region, recap shares and actual AdSense reports. Use aggregate reporting with minimum audience thresholds, reasonable retention, consent/cookie controls, and no exposure of individual travel histories to sponsors. Do not rely on client telemetry alone for ad revenue reporting.

---

## 8. Privacy, safety, abuse and beta lifecycle

### Public versus private

- Public profiles must be deliberately enabled; viewer-only sharing requires no authentication.
- Never reveal provider email, OAuth ID, invitation code, IP address, account creation audit data, or fine-grained device location.
- Map pins should be standardized past destinations rather than live GPS points. Consider disallowing exact street addresses in V1.
- Include a visibility toggle; updates to private/suspended profiles must invalidate public KV snapshots and indexed/share metadata promptly.
- Support report-abuse and admin hide/block controls from V1, even without image uploads; handles and display names are user-generated content.
- Prefer age 18+ beta initially unless legal/parental-consent obligations for minors are designed and reviewed.

### Beta reset notice

Proposed onboarding copy:

> **My Atlas is in private beta.** We're testing how personal travel maps work. Your pins, profile details and recap history may be changed or cleared during testing. Please don't rely on this beta as your only record of travel. You can export your map data, and we'll announce planned resets when possible.

- Show a persistent beta badge/settings notice; require explicit acknowledgment during first registration.
- Do **not** silently wipe user data on a fixed undisclosed schedule. Support controlled planned test resets with admin confirmation, audit log, notification when possible, and a reasonable export window.
- Clearly distinguish **deleting beta pins** from **deleting the entire social-login/profile identity**. Preserve handle/re-registration behavior intentionally so old shared URLs don't become impersonation or privacy risks.
- Keep a tested deletion/retention procedure for user-requested account deletion independent of beta maintenance wipes.
- The source of truth for annual recap history must survive a release if the product promises lasting yearly recaps. Otherwise communicate that beta recap data is temporary.

### Abuse and cost controls

- Apply Cloudflare Turnstile to registration and suspicious activity, with mandatory Worker-side Siteverify validation.
- API rate limits, account-level pin count thresholds (high but finite), search/geocoder quotas, auth request throttling, invite brute-force protection, and oversized payload rejection.
- Validate social account token server side on every protected request or via a securely managed session.
- No arbitrary HTML, external URLs, or user-written long-form text in profile/pin data for V1.
- Use CSP, sanitized output, CORS restricted to actual site origins, and appropriate CSRF defenses if using cookie sessions.
- Admin controls must be separated from general social users and logged; never trust an `isAdmin` client property.
- Monitor Worker/DO/KV requests, errors, provider quotas, and map tile spending; set billing alerts. At 100,000 users, map tile/geocoding/API loads and traffic can matter more than storage.
- Provide privacy policy, terms/beta notice, reporting contact, data export/deletion policy and relevant consent controls before public launch.

---

## 9. V2: images and richer annual sharing (explicitly deferred)

V2 introduces **four optional images total per profile**, not per destination:

1. **One cover image** for the user's public Atlas.
2. **Three favorite travel images**, which may show their three favorite destinations, multiple moments from one destination, or any combination. They do not need to attach to specific pins.
3. Optional caption/short label for favorite photos only if moderation requirements are addressed.
4. Users can swap favorites annually; the editor remains simple.

### Proposed V2 media constraints

- Upload directly or through short-lived signed upload flow into user-specific isolated R2 namespace/prefix.
- Enforce limits **at Worker boundary and after decode**, not just in UI. Reject unsupported types, oversized dimensions or unexpected content. Strip EXIF/GPS, orient, resize, and re-encode to WebP/AVIF or another supported optimized format.
- Proposed target: cover image <= 200 KB at an appropriate hero resolution; each favorite <= 150 KB. These are targets, not quality guarantees; agent should test representative travel photography and choose defensible dimensions.
- At the illustrative 650 KB/user maximum for 1 cover + 3 favorites, 100,000 users would store about **65 GB** of optimized originals/derivatives before replicas, backups, generated recap art, operations or overhead.
- No arbitrary image count, no per-pin gallery, no original RAW/video retention.
- Use content hashes and server-enforced quotas; replace/delete old images when swapped, with orphan cleanup.
- Include abuse review/reporting, content moderation, takedown, and copyright/rights affirmation before public user image uploads are enabled.
- Distinguish cover/favorites currently shown from historical recap graphics. If a user replaces favorites every year, an old annual recap must either (a) intentionally update to current images, (b) persist a small immutable recap graphic in R2 with disclosed retention, or (c) retain opt-in yearly image snapshots. Define this policy before shipping V2.
- Annual recap can show top countries/cities, country count, new destinations for that year (when history supports it), and optionally those 3 selected photos. Do not fabricate travel facts.

---

## 10. Repository integration guidance for Codex

1. **Audit first:** Determine Vue version, current router, GitHub Pages URL/deep-link behavior, existing MapLibre/MapTiler instance, AdSense integration, GA4, Worker/Wrangler layout, R2 binding conventions, account security configuration, tests, and documentation lifecycle.
2. **Keep curated Atlas isolated:** Do not retrofit public users into the existing canonical Journey / Experience / Moment/media ingestion registries. My Atlas is a separate bounded context with its own user-domain data model.
3. **Reuse UI primitives selectively:** Use common map shell and visual language where appropriate, but do not expose editorial content editing or reuse generated content registries as writable user data.
4. **Source control:** Worker code, migrations, interface types, schemas, and tests belong in the repo. Secrets, user data, OAuth private keys, and live beta pins must never be committed to Git.
5. **NoSQL contract:** Prefer typed key/value objects and explicit revisions. SQLite-backed DO is Cloudflare's current recommended storage substrate, but the application need not use relational SQL tables in V1.
6. **Public profiles and bots:** Social share previews, link unfurlers, and AdSense crawlers need meaningful HTML. Decide whether targeted Cloudflare Worker SSR is necessary while keeping GitHub Pages as the static app origin.
7. **Ad implementation:** Audit existing AdSense configuration and ensure auto ads don't accidentally add multiple placements inside My Atlas or onto login/edit pages.
8. **Operations:** Provide a CLI/admin mechanism to create beta codes, deactivate invitations, suspend/restore users, export a user's pins, perform an announced wipe, and review basic metrics.
9. **Documentation:** Follow existing `docs/proposals`, `docs/architecture`, `docs/implementation`, and `docs/README.md` conventions after repository audit. This proposal is not authorization to skip docs validation.
10. **Minimize new dependencies:** Don't install a full CMS, generalized social network, image pipeline, or custom OAuth framework unless essential.

### Suggested organization (adapt to existing structure)

```text
src/features/my-atlas/
  components/
  pages/
  services/
  types/
workers/my-atlas/
  src/
    api/
    auth/
    places/
    durable-objects/
    public-profiles/
  wrangler.jsonc
scripts/my-atlas/
  invitations
  admin
  export
  reset
```

---

## 11. Phased rollout

### Phase 0 - Audit and decisions (no production changes)

- Verify current site host, DNS, SPA deep links, map component and attribution, AdSense policy eligibility, auth SDK candidate, Workers compatibility, and KV/DO/R2 account bindings.
- Confirm final public profile URL design, map search provider, and identity provider choice.
- Document cost budget, privacy responsibilities, beta reset policy and success metrics.

### Phase 1 - Backend proof (development only)

- Create Worker with auth verification, owner-scoped DO data and basic profile/pin CRUD.
- Add reliable invite redemption and handle reservation; include idempotency/retry and concurrent-register tests.
- Add public snapshot generation, privacy toggle, cache invalidation and export/delete.
- Do not introduce AdSense or allow public registrations yet.

### Phase 2 - Vue experience and private beta

- Build My Atlas entry page, invite gate, Google social login (and Facebook after integration validation), empty-state onboarding, searchable map, pin CRUD, profile settings and public share page.
- Direct URL/social preview tests, mobile usability, privacy and account deletion checks.
- Enable a very small invited test group and test reset/export notices.

### Phase 3 - Advertising and growth

- Enable **one responsive AdSense slot** per *eligible* public profile, not per pin.
- Verify crawlability, content value, consent, slot loading on direct and client-side navigation, and Google policy compliance.
- Add share/referral analytics, invite attribution (not users' private histories), and transparent site-to-profile CTAs.

### Phase 4 - Yearly recap beta

- Deliver simple text/map-based year summary and mobile-shareable card from `visitedYears` data.
- Make year-specific counts correct and consistent; explain missing years and beta reset limitations.
- Only after beta data retention is stabilized, promote the recap as a lasting annual tradition.

### V2 (separate approval)

- Add one cover image, three favorite images, R2 optimization/limits/moderation, rotating annual favorites, and image-rich annual recap.

---

## 12. Acceptance criteria

### Account, invite and social auth

- [ ] Anonymous friend can open public profile without a code or login.
- [ ] Uninvited visitor cannot create/edit an Atlas, even by calling API directly.
- [ ] Valid invite + provider login creates exactly one account on retries; invalid/expired/redeemed code fails.
- [ ] Two concurrent attempts cannot exceed a one-use invitation limit.
- [ ] Same user can return using linked social account without losing pins.
- [ ] Google social login works on mobile and desktop; Facebook works if included in initial provider launch.
- [ ] Session and ownership validation rejects cross-user profile/pin changes.

### Pins and profiles

- [ ] User can add 100+ city/country/point pins without sluggish map interaction.
- [ ] Ambiguous names disambiguate by country/region.
- [ ] Duplicate destination selection does not silently double-count a visit.
- [ ] Pin year edit, delete, profile edits and profile deletion work and persist after page reload.
- [ ] Private/disabled profile is not publicly readable or cached after revocation.
- [ ] Direct share links work from Instagram browser, phone messages, desktop and bot previews.
- [ ] Export produces reconstructible user-owned map data.

### Data correctness and storage

- [ ] Two quick edits to the same pin do not silently overwrite newer state.
- [ ] DO authoritative writes and public snapshots reconcile correctly after failures.
- [ ] Public KV cache staleness does not cause unauthorized disclosure after visibility change/deletion; use authoritative checks or other fail-closed technique.
- [ ] Invite codes/identity tokens not logged or shipped to the client.
- [ ] Production secrets and beta data absent from Git repository.

### Advertising

- [ ] Every **eligible** public profile template has one responsive AdSense placement, not zero and not multiple because of Vue remounts.
- [ ] No ad is requested on login, invitation, empty/low-value, private/suspended or admin/edit screens.
- [ ] Ads are not triggered by clicking pins and are not refreshed by unrelated UI actions.
- [ ] Profile pageviews, eligible ad slots, AdSense actual impressions and earnings are independently measured/reported.
- [ ] Google review/policy checks have been completed before public monetization.

### Annual recap and beta operations

- [ ] Yearly counts exclude undated pins and deduplicate countries/destinations.
- [ ] Revisit in two different years can contribute to both annual summaries without duplicate map markers.
- [ ] Beta testers acknowledge potential resets; export works prior to reset.
- [ ] Admin can issue/revoke invites, hide profile, and execute a confirmed/tested reset without compromising editorial Atlas.
- [ ] Future V2 image quota is documented but V1 does not require any user-uploaded photos.

---

## 13. Implementation questions for the agent to resolve during audit

Provide **recommended defaults**, not a multi-page requirements questionnaire. Ask the owner only when a product decision is essential.

1. Which managed identity provider best fits Google + Facebook sign-in, account linking, mobile in-app browsers, and reasonable costs? What provider review/verification is needed?
2. Does the existing domain route through Cloudflare in a way that supports Worker share-page HTML on the same apex domain without disrupting GitHub Pages?
3. How will client app routing and Open Graph metadata work for any public `{handle}` URL?
4. What geocoding provider/source best matches the existing MapTiler/MapLibre setup and allows persistent `placeId` references?
5. What is the least complex DO key/value schema and public read path? Is KV caching necessary at beta scale?
6. How are invite redemption, handle uniqueness, privacy changes and account deletion kept strongly consistent across retries?
7. What happens to existing public links after handle change, suspension, user deletion or a beta reset?
8. Which AdSense page formats are actually eligible given the minimal user-generated content, and should ads be suppressed until a threshold (such as a populated map) is reached?
9. How should maps handle country markers vs city markers vs named destination pins, particularly overlapping places and statistics?
10. What privacy/consent and beta reset notices are legally appropriate for the launch audience and countries served?
11. What measurable operating-cost thresholds should trigger caching, pricing review, image limits, or pausing registration?
12. How should annual recap share cards be generated without violating map tile/data usage terms or manufacturing inaccurate statistics?

---

## 14. Source documentation (verify versions at implementation time)

- Workers KV consistency and concurrent writes: https://developers.cloudflare.com/kv/concepts/how-kv-works/
- Workers KV limits: https://developers.cloudflare.com/kv/platform/limits/
- Workers KV pricing: https://developers.cloudflare.com/kv/platform/pricing/
- Durable Objects strong consistency and storage: https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/
- SQLite-backed DO key/value storage API: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- Workers custom domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Turnstile server-side verification: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- GitHub Pages custom 404 and routes: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site
- Google Publisher Policies, low-value inventory: https://support.google.com/adsense/answer/10502938
- AdSense user-generated content: https://support.google.com/adsense/answer/1355699
- Google ad placement best practices: https://support.google.com/adsense/answer/1282097

---

## 15. Agent handoff

> Treat this document as a **proposal**, not an instruction to immediately deploy or create third-party accounts. First perform Phase 0 repository/domain/provider audit and report the lowest-complexity implementation that preserves the current GitHub Pages app, existing editorial Atlas and R2 media workflow. Then implement in small, testable phases. Use a Cloudflare Workers API, strongly consistent Durable Object key/value records for editable beta state and invite redemption, KV only where its consistency is acceptable, and R2 only for V2 optional user images. Keep registration invite-only but public profiles anonymously viewable. Do not introduce user photos or per-pin ads in V1. A profile must have one AdSense placement **when eligible**, not a guaranteed impression per visit. Flag unresolved security, privacy, ad-policy and billing issues before turning on public registration.
