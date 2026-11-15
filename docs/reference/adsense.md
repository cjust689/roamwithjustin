---
id: adsense-operations
title: AdSense Manual Placement and Activation
kind: reference
status: implemented
implementation_state: partial
updated: 2026-11-15
related:
  - monetization-analytics
  - monetization-analytics-plan
supersedes: []
superseded_by: []
code_paths:
  - src/config/adsense.mjs
  - src/services/adsense.mjs
  - src/components/AdSlot.vue
  - src/views/roam/RoamTripOverview.vue
  - src/features/atlas/config/atlasAdEligibility.mjs
  - src/features/atlas/views/AtlasView.vue
  - src/features/atlas/components/AtlasDetailPanel.vue
  - src/views/roam/Privacy.vue
  - scripts/validate-adsense-config.mjs
  - scripts/lib/adsense-build-env.js
  - scripts/prepare-pages.js
  - .github/workflows/deploy-pages.yml
verification:
  state: verified
  evidence:
    - npm run adsense:test
    - npm run adsense:validate
    - npm run lint
    - npm run build
---

# AdSense manual placement and activation

The repository contains a conservative manual AdSense integration. It is
disabled by default. The verified public publisher ID is present only in the
homepage verification meta tag; no ad slot ID is committed. Live ads cannot
appear until the owner supplies the remaining exact account values and
explicitly enables every safety gate.

## Where ads may appear

There are two independently gated manual placements.

The story placement is named `travel-story-inline-1`. It renders only when all
of these conditions are true:

1. The app is a production build.
2. AdSense is explicitly enabled.
3. Privacy readiness is explicitly acknowledged.
4. Auto ads being off is explicitly acknowledged.
5. The publisher and slot IDs have valid shapes.
6. The Journey is published and contains at least three story chapters.

The unit appears after the full itinerary and before the media gallery.

The optional Atlas placement is named `atlas-guided-journey-inline-1`. It is
disabled separately and renders only when all of these additional conditions
are true:

1. A numeric Atlas slot ID is configured.
2. The visitor is using the guided Journey player, not free map exploration.
3. The visitor has arrived at three distinct guided stops.
4. The Journey has at least five mapped stops and is published.
5. The current stop has at least 180 characters across its summary and personal
   note plus at least one media item.
6. No Atlas ad was already requested for this Journey in the browser-tab
   session.

The Atlas unit appears below the stop's notes and media and above its actions.
It does not appear on the map canvas, markers, guided controls, incomplete
Journeys, or thin stops. Its tab-scoped `sessionStorage` reservation prevents
replay, backward navigation, and later stops from requesting additional ads.

Neither placement renders on the home page, story hero, gallery, lightbox,
video player, location dialog, navigation, or footer. The component does not
track ad impressions or clicks. An empty unit collapses after Google marks it
`data-ad-status="unfilled"` or `data-ad-status="unfill-optimized"`. It also
collapses when a browser, extension, or network privacy filter blocks the
AdSense loader, including when that failure occurred earlier in the SPA
session.

## Required GitHub repository variables

Configure these under **Settings, Secrets and variables, Actions, Variables**:

| Variable | Value |
| --- | --- |
| `ADSENSE_ENABLED` | `true` only when the remaining checklist is complete |
| `ADSENSE_PRIVACY_READY` | `true` only after the privacy and consent review |
| `ADSENSE_AUTO_ADS_OFF_CONFIRMED` | `true` after Auto ads is off for the site |
| `ADSENSE_CLIENT_ID` | Exact `ca-pub-...` value from the account code |
| `ADSENSE_STORY_SLOT_ID` | Numeric ID from one responsive display ad unit |
| `ADSENSE_ATLAS_ENABLED` | `true` only when the optional Atlas unit should be active |
| `ADSENSE_ATLAS_SLOT_ID` | Numeric ID from the separate responsive Atlas display unit |
| `ADSENSE_GOOGLE_ADS_TXT_LINE` | Exact Google seller line supplied by AdSense |

These identifiers are public configuration, not private API credentials. The
workflow maps them into the Vue build. `ADSENSE_GOOGLE_ADS_TXT_LINE` is used by
the postbuild step to create `/ads.txt` at the deployed site root.

The homepage also contains Google's supported publisher verification meta tag
for `ca-pub-5275158408075125`. This proves the public account association
without loading the AdSense JavaScript on the home page, Atlas, or other routes
that do not contain the manual ad unit. In AdSense, select **Meta tag** as the
site verification method. The account code script Google displays is already
created by `src/services/adsense.mjs` when the eligible story unit mounts and
must not also be pasted into `public/index.html`.

## Owner dashboard checklist

1. In the AdSense Sites view, select **Meta tag** for `roamwithjustin.com`,
   deploy the site, and ask Google to verify it. Approval and readiness are
   separate from ownership verification and can take longer.
2. Open **Ads**, select the site, and switch **Auto ads off**. This is required
   because the SPA keeps the loader in the document after a visitor leaves a
   story for the Atlas.
3. Under **By ad unit**, create one responsive display unit named something
   recognizable, such as `travel-story-inline-1`.
4. Set `ADSENSE_CLIENT_ID` to `ca-pub-5275158408075125` and copy the numeric
   `data-ad-slot` value into `ADSENSE_STORY_SLOT_ID`. Do not paste the full
   script into `index.html`.
5. Copy the exact Google line from the AdSense ads.txt instructions into
   `ADSENSE_GOOGLE_ADS_TXT_LINE`.
6. Configure a Google certified consent management platform for traffic where
   it is required. Google's European regulations message is one supported
   option available through **Privacy and messaging**.
7. Review and approve the public `/privacy` notice. Add a different contact
   method if Instagram should not be the privacy contact.
8. Review Brand safety controls and the Ad review center. Blocking categories
   can reduce demand and cannot guarantee a particular visual style.
9. Set the shared activation values and story ID, run the production
   deployment, and inspect a published long story on desktop and mobile.
10. After the site is Ready and story performance has been reviewed, create a
    separate responsive unit named `atlas-guided-journey-inline-1`. Set its
    numeric ID in `ADSENSE_ATLAS_SLOT_ID`, set `ADSENSE_ATLAS_ENABLED=true`,
    redeploy, and verify that only the first eligible guided stop renders it.

## Local verification

Normal development never loads real AdSense. Validate configuration with:

```bash
npm run adsense:test
npm run adsense:validate
npm run build
```

To verify a real configuration safely, use a production build with the exact
values in `.env.production.local`, which is ignored by Git. The validation and
postbuild scripts read the same production environment files as the Vue build.
Never commit an invented publisher or slot ID.

## Operational boundaries

- Do not add the AdSense loader to `public/index.html`. The shared loader adds
  it once, only when an eligible story actually mounts the unit.
- Do not enable Auto ads. Code cannot reliably prevent dashboard controlled
  Auto ads from entering Atlas or other immersive SPA routes after loading.
- Do not turn the Atlas placement into a per-stop unit. Its tab-scoped
  reservation is a policy and experience boundary, not an optimization knob.
- Do not refresh units programmatically or emit GA4 events for AdSense
  impressions or clicks.
- Keep the account values and ads.txt declaration synchronized. The production
  build fails when live advertising is requested with incomplete or mismatched
  configuration.

Official implementation references:

- [Set up ads on your site](https://support.google.com/adsense/answer/7037624)
- [Create a display ad unit](https://support.google.com/adsense/answer/9274025)
- [Hide unfilled ad units](https://support.google.com/adsense/answer/10762946)
- [Consent management requirements](https://support.google.com/adsense/answer/13554116)
- [Resolve ads.txt issues](https://support.google.com/adsense/answer/12171244)
