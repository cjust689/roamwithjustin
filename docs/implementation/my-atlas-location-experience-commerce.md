---
id: my-atlas-location-experience-commerce
title: My Atlas Location, Experience and Destination Link Foundations
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-20
updated: 2026-11-20
related:
  - my-atlas-geography
  - my-atlas-account-state
  - my-atlas-trip-centric-transition
  - monetization-analytics
supersedes: []
superseded_by: []
code_paths:
  - shared/my-atlas-map-links.mjs
  - src/features/my-atlas/components/MyAtlasLocationPicker.vue
  - workers/my-atlas/src/maps/resolve.mjs
  - scripts/test-my-atlas-map-links.mjs
  - shared/my-atlas-experiences.mjs
  - src/features/my-atlas/components/MyAtlasExperiences.vue
  - src/services/expediaDestinationLinks.mjs
  - src/services/expediaFlightRegistry.js
  - src/content/partners/expedia-flight-links.json
  - scripts/affiliates/import-expedia-links.mjs
  - scripts/affiliates/expedia-links-template.csv
  - scripts/lib/expedia-destination-links.mjs
  - scripts/experiences/inspect-viator-destinations.mjs
  - scripts/test-my-atlas-foundations.mjs
  - workers/experience-discovery
  - src/features/my-atlas/components/MyAtlasMap.vue
  - src/features/my-atlas/components/MyAtlasPlanner.vue
  - src/features/my-atlas/components/MyAtlasPinEditor.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - workers/my-atlas/src/account/contracts.mjs
  - workers/my-atlas/src/account/service.mjs
  - workers/my-atlas/src/registration/objects.mjs
verification:
  state: verified
  evidence:
    - npm run build passed with 47 Worker runtime tests, build hash 43c7bd082b08043c and the existing asset-size warnings; local compilation used the established uncommitted parallel-false override
    - npm run lint passed without lint errors
    - npm run docs:audit passed for 74 managed documents with 12 existing unverified-document warnings
    - node scripts/test-my-atlas-foundations.mjs
    - npm run my-atlas:test passed including 47 Durable Object runtime tests
    - npm run experiences:check
    - npm run my-atlas:worker:check:staging
    - Read-only Google Sheet preview returned one disabled generic preparation row and zero active links
    - Synthetic local Chrome checks passed at 320, 390 and 1440 pixels with actual map click coordinates, unchanged map instance, cancellation cleanup and unchanged memory
    - Real Viator sandbox destination requests returned HTTP 401 Invalid API Key; no real product search, destination mapping or attribution is verified
---

# Local phase audit and implementation

The four owner briefs in `codex-context` are inputs, not implementation
evidence. The foundation slice is deployed; the follow-up picker slice is local only. Existing accounts, catalog,
approved banners and private affiliate restrictions are preserved.

## Phase 0 findings

**Locations.** `MyAtlasGeographicProof.vue` already supports named custom visited
pins, prefills the typed search, and sends a custom draft through the shared
visit editor. `MyAtlasMap.vue` uses the MapTiler SDK and actual click coordinates,
with a draggable and keyboard-adjustable temporary marker. The planner already
persists custom wishlist entries and uses them as stop snapshots, and supports
custom start/finish coordinates. Its custom form currently requires manual
coordinates and is disconnected from map placement. Reuse the single existing
map; expose fallback even when results exist or search fails. Blank numeric
inputs must not become zero. No URL importer or short-link proxy exists.

**Visits and recaps.** Owned pins have stable `pinId`, optional dates and one
`memory`. The existing editor preserves those fields through authenticated
`PATCH /v1/me/pins/{pinId}` with account revision and idempotency guards.
One canonical place per account remains the current limit; distinct repeat
visit occurrences and reversible Planned/Past trips are not implemented.
Attach private experience entries to the existing owned pin, never the
geographic ID or stop order. Use semantic add/edit/remove mutations, bounded
optional nested records, and explicit owner projections. Existing public
Durable Object projections enumerate fields and must omit all recap data.
Owner JSON export already serializes owned pins; pin/account deletion removes
their nested data. No migration or writes on read are required.

**Commerce and ingestion.** Canonical `src/content/partners/index.mjs` already
defines Expedia and two reviewed public Utah banner offers. Legacy
`src/data/affiliates.js` is not a destination registry. Existing editorial Google
integration uses Sheets/Drive OAuth, not a dedicated Docs table importer.
Use an owner-exported Docs API JSON table or explicit CSV intermediate as the
first file-based import. Match canonical city IDs, preserve exact issued URLs,
default to preview, refuse missing rows and publish atomically. Keep the
registry empty until real issued links and placement approval are supplied.
Private planner affiliate placement remains disabled; ordinary handoffs stay.

**Viator, initial audit.** No integration, verified destination mapping, key or account approval
was found in source. A separate loopback-only development Worker can implement
a bounded `/products/search` prototype with injected tests. No frontend secret,
production Worker route, planner button, permanent product cache or invented
destination mapping belongs in this phase. Real API acceptance requires an
owner-configured secret and reviewed destination. Official Basic Golden Path
and the technical specification were checked on November 20. The specification
requires development testing against the sandbox. The prototype therefore uses
only `api.sandbox.viator.com`, never the live API.

## Bounded delivery checklist

- [x] Audit current contracts, stable identities, SDK and private/public paths.
- [x] Location Phase 1, prominent search fallback and planner map placement.
- [x] Experience loop Phase 1, private add/edit/remove with unchanged memory.
- [x] Expedia file/Sheet import, deterministic registry, preview/publish and lookup.
- [x] Viator local prototype and honest configuration/approval gates.
- [x] Verify compatibility, ownership, exports/deletion, privacy and mobile UI.
- [x] Update as-built docs and run `npm run docs:audit`.

- [x] Location Phase 2: reuse one picker for the existing custom entry surfaces.
- [x] Location Phase 3: full Google/Apple URL candidate previews and confirmation.
- [x] Location Phase 4: authenticated, rate-limited short-link resolver with security tests.
- [x] Location Phase 5 supported slice: explicit custom visited-pin rename/reposition, preserved IDs and snapshot boundaries.
- [x] Experience loop Phase 2 supported slice: visited-list experience count/shortcut and optional recap invitation after Mark Visited.
- [ ] Canonical trip grouping, repeated visit occurrences and reversible Planned/Past lifecycle acceptance remain in the trip architecture workstream.
- [ ] Real provider short-link expansion remains externally unverified.
- [ ] Viator real search, market mapping and referral verification remain blocked by HTTP 401.
- [ ] Public editorial operator cards and curated related discovery need a separate canonical intake/selector slice with established firsthand content; no private recap promotion.
- [ ] Public/community contributions and commercial activation retain their moderation/approval gates.

Repeat-visit migration, public recaps and Viator planner activation remain
separate work. No automatic collection of private notes, analytics payloads,
provider requests or affiliate tracking is introduced by opening a visit.

## As-built local slice

Recaps use optional `experiences` on the owned visited pin, limited to ten.
`PATCH /v1/me/pins/{pinId}` accepts `experienceChange` with action `add`, `edit`
or `remove` and a stable `exp_` ID. A title is required; operator and HTTPS
website are optional. Server timestamps, private visibility and user-recap
source are fixed. Old pins stay unchanged on read. Updates preserve memories,
dates, geography and plan snapshots. JSON and CSV account exports include the
list. Public projections exclude it, and private changes do not advance public
discovery activity. Pin/account deletion removes recaps. Mutation receipts
store a pin reference rather than private experience snapshots; replay reads
the current pin and cannot resurrect a removed entry. The browser reuses an
attempt's revision and idempotency key after an ambiguous network failure and
keeps the draft on conflicts without silently overwriting another update.

The location work shares the mounted MapTiler map and temporary-marker path.
Visited and planner search always expose custom entry. Planner map clicks
populate the existing custom wishlist/start/finish form; manual coordinates
remain available. No save occurs just from positioning, moving or canceling.
Custom stops continue to use existing wishlist references and plan snapshots.
The existing Mercator latitude limit of 85.051129 degrees is preserved.

The owner supplied a Google Sheet after the initial audit. Dedicated
`Expedia Flights` and `Expedia Instructions` tabs were created and read back;
the original `Sheet1` was preserved. The eight columns match the CSV template.
The generic row is disabled with a blank URL. No fabricated affiliate URL was
created. The importer reads actual single hyperlink targets from Sheet grids
or an exported Docs API table, and supports a plain CSV intermediate. Unknown
cities, mismatched countries, duplicate active placements, unapproved hosts,
ambiguous hyperlinks and disappearing rows fail before publishing. Notes,
credentials and source IDs are excluded from the browser artifact. The
canonical Expedia Partner supplies the host policy; additional tracking-network
hosts require separate review. Only ordinary links resolve in private My Atlas
through the configured wrapper. Existing dated untracked handoffs are unchanged.

The local discovery Worker is disabled by default, refuses non-loopback hosts
even if enabled, permits only same-origin browser requests, limits searches to
six per minute and six results per page, and accepts only reviewed canonical
destination mappings. Body sizes, provider timeout and response size are
bounded. There is no product cache, analytics, booking endpoint or production
route. Provider `productUrl` is validated and returned unchanged. Its separate
local HTML preview is not embedded into the private planner. The key lives only
in ignored `.dev.vars`; the example template is blank. The supplied key and
updated key both received 401 responses. A real destination mapping remains
empty, so the preview correctly disables search rather than inventing results.

## Commands and owner actions

```bash
npm run my-atlas:serve
npm run experiences:serve
npm run my-atlas:foundations:test
npm run experiences:check
node scripts/experiences/inspect-viator-destinations.mjs Split
npm run affiliates:expedia:import -- --file scripts/affiliates/expedia-links-template.csv
npm run affiliates:expedia:import -- --spreadsheet-id YOUR_SHEET_ID
npm run affiliates:expedia:import -- --spreadsheet-id YOUR_SHEET_ID --publish
```

The app remains at `http://localhost:8080/my-atlas`; the discovery prototype is
at `http://127.0.0.1:8789`. Sheet ID can instead be supplied through
`EXPEDIA_LINKS_SPREADSHEET_ID`. Read-only import reuses existing Google Sheets
authorization and never starts a visitor OAuth flow. A catalog outside the
bundled proof can be supplied with `--catalog` for reviewed cities not in the
proof subset. Preview is the default. Publish is an explicit atomic local-file
operation; identical imports do not rewrite the artifact. Restore the previous
reviewed registry file to roll back. Removed source rows must be restored and
disabled explicitly. No source data is fetched at visitor page load.

Owner actions remain: correct/activate sandbox key access, review a returned
Viator market against its canonical city and parent, then verify a real search
and returned referral URL. Expedia needs actual issued URLs and manual landing
checks before enabling rows. Private affiliate placement stays gated even when
a public row is enabled.

## Release and follow-up evidence

Foundation commit `f49c3babe4435fac560503706d96bd1c51746b1f` was pushed,
validated in PR 222, merged to develop and promoted through PR 223. Pages run
44820076141 succeeded for main `e27eca51f2aacd3340c90024e0f032c501b2d220`.
The compatible staging Worker, also used by the production frontend, deployed
as `d3286de9-e52a-4e0e-b39c-3a005e5b911f`. The sandbox key was retried in
this release session and again returned 401 Invalid API Key. No real product
result or merchant acceptance is claimed.

The local follow-up uses `MyAtlasLocationPicker.vue`,
`shared/my-atlas-map-links.mjs`, and `workers/my-atlas/src/maps/resolve.mjs`.
Only explicit user confirmation fills coordinates from a full URL; viewport,
name-only and route links cannot silently replace the selected point. Existing
labels/notes survive method changes and errors. No source URL is persisted.
The resolver's POST endpoint is an owner-authorized read with no account
revision change. Its dedicated limiter must be configured before activation.
Unsafe redirects, cyclic chains, three-hop exhaustion, timeouts and responses
without redirects fail safely. There is no proxy response body or HTML scraping.
Actual provider redirect behavior remains externally unverified.

The custom-pin PATCH extension preserves stable pin/place IDs, dates, memory,
recaps and existing immutable plan snapshots. Same-attempt network retries
reuse the operation key and revision; conflicts keep the draft for explicit
review. The raw custom mutation response is normalized consistently with an
account read. The existing visited list provides an experience-count action
and focuses the private recap editor. Mark Visited offers an optional invitation
with Not now. This does not implement canonical journey grouping or trip status
transitions.

Focused checks: `node scripts/test-my-atlas-map-links.mjs`,
`npm run my-atlas:foundations:test`, `node scripts/test-my-atlas-worker.mjs`
and the 50-test Workers runtime suite passed. Synthetic Chrome checks at 320,
390 and 1440 pixels confirmed preview-before-confirmation, unchanged label and
memory, exact coordinate application, no viewport substitution, unchanged map
instance, Escape cleanup and zero horizontal overflow. Screenshots and report
are under ignored `.state/theme/map-picker-*`; the 390 pixel capture was
visually inspected. No real account was written by these browser checks.

The full local `npm run build` passed with hash `c0ec366b406ac858`, all 50
Workers runtime tests and the existing bundle-size warnings. `npm run lint`
passed. After removing a duplicate map button, the final frontend compile
passed with hash `eba8551f3669e0a2`. The Worker dry-run bundled the new limiter and resolver successfully;
its default log path was outside the sandbox, so a workspace log path was used
for clean verification. The foundation release's root page, API health and
Atlanta catalog search returned 200. The direct `/my-atlas` URL uses the
existing GitHub Pages 404 SPA fallback. Configured-localhost browser readback
still showed the staging API/catalog, no injected local invitation, and an
Atlanta search returning 200. The new resolver and custom-location PATCH
extension require the follow-up Worker deployment before they work against
that shared staging backend; no backend switch or account wipe was performed.

References checked: [Viator technical specification](https://docs.viator.com/partner-api/technical/)
and [Basic Golden Path](https://partnerresources.viator.com/travel-commerce/affiliate/basic-access/golden-path/).
