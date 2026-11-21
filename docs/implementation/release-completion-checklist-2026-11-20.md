---
id: release-completion-checklist-2026-11-20
title: Release Completion Checklist, 2026-11-20
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-20
updated: 2026-11-20
related:
  - docs-index
  - my-atlas-account-state
  - my-atlas-trip-centric-transition
  - my-atlas-location-experience-commerce
  - my-atlas-favorite-travel-image-implementation
  - gear-publishing-implementation
supersedes: []
superseded_by: []
code_paths:
  - workers/my-atlas/wrangler.jsonc
  - workers/my-atlas/src/trips/service.mjs
  - workers/my-atlas/src/trips/store.mjs
  - src/features/my-atlas/components/MyAtlasTrips.vue
  - src/features/my-atlas/views/MyAtlasGeographicProof.vue
  - src/features/my-atlas/planning/sharedTrip.mjs
  - workers/experience-discovery/wrangler.jsonc
  - workers/experience-discovery/destinations.mjs
  - src/content/partners/expedia-flight-links.json
  - src/content/experiences/curated.json
  - src/content/gear/generated/records.json
verification:
  state: verified
  evidence:
    - Source and active checklist audit on 2026-11-20; verification applies to this inventory, not completion of the open work
    - PRs 224 and 225 merged the release into develop and main after successful required validation
    - Pages run 44847083891 succeeded for main a9389dce9134a5d00250dade2ddfd1e158e8e634
    - Live asset /js/478.e45e9ccf.js contains My Atlas tabs and grouping markers; authenticated acceptance remains unverified
    - Staging Worker fc6a784b-7e87-4850-b335-5f292771f276 serves trip routes with migration writes disabled
---

# What still needs completion

Snapshot date: **November 20, 2026**, America/New_York.

The recent release is merged and deployed. Most remaining work is activation,
acceptance, content or unfinished implementation, rather than unpushed code.
This inventory covers My Atlas, its location/experience/commerce workstreams,
and the outstanding Gear publishing slice. Older unrelated proposals are not
treated as staged features. No credentials or private profile data are included.

## Release baseline

- [x] Merge into develop through [PR 224](https://github.com/cjust689/roamwithjustin/pull/224).
- [x] Promote to main through [PR 225](https://github.com/cjust689/roamwithjustin/pull/225).
- [x] Complete [Pages deployment 44847083891](https://github.com/cjust689/roamwithjustin/actions/runs/44847083891).
- [x] Verify live assets contain Overview, Planning, Past and Group destinations.
- [x] Deploy the trip backend routes to the existing staging API used by the site.
- [x] Pass the local production build, 56 Worker runtime tests, targeted lint,
      documentation audit and synthetic responsive browser checks.

Tabs, destination selection, the shared location picker, safe Maps-link intake,
experience-card rendering and the trip workspace are in the released source.
This does not establish authenticated end-to-end success for every feature.
The Git index had no staged changes at the start of this inventory; remaining
local briefs, artwork and debug files are not part of the released feature set.

## 1. Trip grouping and canonical trips

Owner correction after this inventory: destinations must remain ungrouped until
explicitly added to a trip. Local destination-model version 2 implements that
change and removes typed-phrase entry. Staging configuration is now set to enable
the corrected save flow; see the active trip transition record for actual
deployment evidence. The disabled-gate description below records the original
release baseline and is not authority for the newer model. End-to-end remote
account acceptance remains open.

Correction deployment: staging Worker
`21912d9e-652a-4693-ab15-222d0e9eb6b8` now has trip writes enabled for explicit
version-2 requests. The matching frontend correction has passed local build and
browser checks but still needs promotion to develop/main and Pages. Default
Worker configuration remains disabled. No real profile has been migrated by the
agent; successful authenticated owner creation/save/reopen remains to be checked.

The next frontend promotion also includes the sharing/profile organization
correction: Share Your Atlas and story-image creation on Overview; account
links/export/deletion in the profile dropdown; image/location/presentation in
Customize My Atlas. Its layout and handler wiring are locally verified, with
real-account image acceptance still open as listed below.

**State: implemented and deployed, but account writes are disabled. Highest priority.**

`MY_ATLAS_TRIP_WRITES_ENABLED` is `false` in default and staging configuration.
The interface can select destinations and request review. It cannot yet save an
upgrade, combine trips, create canonical trips or save their edits. Legacy
visited-place and planner actions retain their existing separate behavior.

- [ ] Reproduce the reported authenticated trip-loading failure and record its
      actual status/error and request ID. Anonymous 401 and CORS checks only
      establish route recognition, not a working owner collection read.
- [ ] Validate with an explicitly disposable authenticated account in a controlled
      environment with trip writes enabled. Keep ordinary accounts unchanged.
- [ ] Compare upgrade preview with original pins, memories, recaps, dates,
      wishlist, plan endpoints, publication choices and favorite image.
- [ ] Exercise explicit upgrade, ambiguous retry, stale revision, rollback before
      the next saved change, and scheduled legacy-alarm handling remotely.
- [ ] Create Planned and Past trips, including a single stop without home/airport
      endpoints and repeated destinations with independent memories.
- [ ] Group selected destinations, reorder stops, reverse lifecycle, remove a
      content-bearing stop explicitly, export and delete the disposable account.
- [ ] Verify publication choices remain intact and private data stays excluded.
- [ ] Complete phone and keyboard acceptance with real authenticated state.
- [ ] After acceptance, enable the intended deployment's write gate and verify
      normal owner saves. Existing users must still explicitly choose upgrade;
      do not migrate accounts on page load or wipe existing profiles.

See [Trip transition](my-atlas-trip-centric-transition.md) and
[account state](../architecture/my-atlas-account-state.md).

## 2. Trip architecture still requiring implementation

**State: partial implementation, not a deployment switch.**

- [ ] Persist flight and rental details through owner APIs. Current tools are
      browser drafts and reviewed external handoffs, not saved trip logistics.
- [ ] Verify logistics save/reopen, export/deletion and lifecycle preservation.
- [ ] Add per-trip public Atlas publication controls. New canonical trips default
      private; copying a read-only snapshot is a separate sharing mechanism.
- [ ] Add an all-trips route overview and test dense/overlapping occurrences.
      Current canonical map projection selects one trip at a time.
- [ ] Add canonical stop geography editing if required. Legacy custom-pin editing
      exists; the new trip APIs do not edit an existing stop's saved geography.
- [ ] Implement trip-managed media only as a separate scoped feature. The current
      media feature is one account favorite image, not a trip photo collection.

Read-only version 2 links already preserve ordered repeated destinations and
exclude private memories, recaps and logistics. They are transferable snapshots,
without live updates or revocation. Do not describe those additional capabilities
as implemented or assume they are required for the current snapshot release.

## 3. Locations and Maps-link acceptance

**State: code released; real-provider acceptance incomplete.**

- [ ] Test real supported Google/Apple full URLs and short links through the
      deployed resolver, including preview, confirmation and rejected URLs.
- [ ] Verify authenticated mobile custom-pin editing and planner start/finish/stop
      placement against the remote backend, with unchanged map identity and IDs.

Security/contract tests and synthetic map-click checks already pass. No new
geocoding provider or catalog rebuild is required just to run this acceptance.

## 4. Viator discovery

**State: local prototype only; provider access blocked at the last recorded check.**

- [ ] Resolve sandbox API access. The last recorded destination requests returned
      HTTP 401 Invalid API Key; the current key was not retested for this report.
- [ ] Review actual returned market IDs against canonical cities and parents.
      `workers/experience-discovery/destinations.mjs` is currently empty.
- [ ] Verify real product search and the provider-returned referral URL.
- [ ] Complete a separate production integration/placement phase before exposing
      discovery to visitors or the authenticated planner.

`LOCAL_DISCOVERY_ENABLED=false`, `workers_dev=false`, and the prototype's loopback
restrictions remain intentional. Publishing the frontend does not deploy or
activate this Worker. Keep the key server-side; do not add it to this document.

## 5. Expedia destination affiliate links

**State: ingestion tooling released; active destination registry empty.**

- [ ] Supply actual issued destination links and placement approvals in the
      prepared Sheet or supported export.
- [ ] Preview/import reviewed canonical city mappings and check landing pages.
- [ ] Publish approved rows; verify intended public placement and attribution.
- [ ] Obtain and implement explicit private-placement approval before activating
      affiliate links inside My Atlas. Public approval does not cover it.

`src/content/partners/expedia-flight-links.json` currently has zero links.
Ordinary Expedia flight handoffs already work independently of this registry;
existing public banner links are not missing destination-ingestion work.

## 6. Curated editorial experiences

**State: intake and rendering code released; owner-approved content missing.**

- [ ] For Split/Raptor, establish the exact official operator URL and canonical
      Journey/Visit/Place relationship from owner evidence.
- [ ] Supply/register any intended original cover media, or publish without a
      cover when the record is otherwise ready. Do not invent media.
- [ ] Prepare, preview and publish the owner-approved firsthand experience record.
- [ ] Implement Phase 4 related-experience discovery/filtering from canonical
      experiences. This is further product work, not Viator activation.

`src/content/experiences/curated.json` is empty. Private My Atlas recaps do not
automatically become editorial records. Sponsorship and commercial agreements
are separate from recording a firsthand experience. Community/public contributions
remain future moderated work, not an enabled submission feature.

## 7. Favorite travel image

**State: deployed feature; remote acceptance and broader-beta operations incomplete.**

- [ ] Test portrait, landscape, PNG and WebP uploads with a disposable account;
      record source/output dimensions, byte sizes and metadata inspection.
- [ ] Verify replacement, stale revision, removal, sign-out, shared/public image
      visibility and full account deletion against remote staging.
- [ ] Verify identical public not-found behavior for private/empty profiles and
      images kept private.
- [ ] Confirm Images/R2 budget alerts and the orphan-reconciliation procedure
      before expanding the beta. A reconciliation job remains unfinished.
- [ ] Complete phone, keyboard and screen-reader acceptance.

The private R2 bucket and bindings already exist. Per-destination photo work was
superseded by the account favorite-image scope and must not be revived as an
unfinished release task. See [favorite image](my-atlas-favorite-travel-image.md).

## 8. Gear publishing

**State: publishing tools released; first real product and external upload acceptance incomplete.**

- [ ] Verify the external Cloudflare upload Worker deployment and first genuine
      Gear object upload. The active Gear checklist still marks these unverified.
- [ ] Supply the exact product/variant, firsthand usage notes, approved photo and
      official product URL.
- [ ] Supply an approved affiliate URL/program or choose an ordinary link.
- [ ] Preview, review and deliberately publish the first real product, then verify
      its live card, image and outbound analytics behavior.

`src/content/gear/generated/records.json` currently has zero items/usage records.
Automatic Amazon tagging, additional merchant adapters, product detail routes
and AI research are future scope, not staged functionality awaiting a toggle.
See [Gear publishing](gear-publishing.md).

## Recommended completion order

1. Resolve the authenticated trip read and finish controlled upgrade/grouping acceptance.
2. Enable verified trip writes and validate the creator/share flow end to end.
3. Persist flight/rental details and finish per-trip publication controls.
4. Complete real Maps-link and favorite-image acceptance.
5. Publish the first evidence-backed editorial experience and Gear product.
6. Activate Expedia/Viator only when real provider access, mappings and approved
   links exist. Their external dependencies should not block the core trip work.

This file records remaining work. It does not enable gates, deploy Workers,
publish content, retest credentials or mutate accounts.
