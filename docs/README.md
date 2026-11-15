---
id: docs-index
title: Documentation Index
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-14
updated: 2026-11-15
related:
  - content-model
  - media-pipeline
  - gear-system
  - monetization-analytics
supersedes:
  - documentation-lifecycle-adoption-brief
  - master-plan-ai-context
superseded_by: []
code_paths:
  - docs/README.md
  - scripts/docs-audit.mjs
verification:
  state: verified
  evidence:
    - npm run docs:audit
---

# Roam With Justin documentation

Start here before using an older implementation brief.

The source code and tests determine what exists. Documentation describes that
verified behavior, records active work, or preserves proposals and history.
An old Markdown claim is never implementation evidence.

## How to use these docs

1. Find the subsystem in the system map below.
2. Read its as-built architecture document.
3. Read a linked implementation or proposal only when it is relevant.
4. Inspect the listed code paths and tests before changing behavior.
5. Update the architecture and active-work documents when verified behavior or
   project status changes.

Document metadata uses these meanings:

- `architecture`: behavior verified in current source and tests.
- `implementation`: bounded active work; check its progress and known gaps.
- `proposal`: desired behavior that is not currently available.
- `reference`: stable operational, editorial, or integration guidance.
- `historical`: preserved context that must not be used as current instruction.

`status: implemented` requires `verification.state: verified` and concrete
evidence. Partial delivery remains `in-progress` / `partial`.

## System map

| Subsystem              | As-built authority                                                       | Operational/reference guide                                                                                                                | Verified state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical content      | [Content model](architecture/content-model.md)                           | [Atlas feature guide](../src/features/atlas/README.md)                                                                                     | Media, Places, Journeys, Visits, Partners, selectors, and validation exist. Every Journey has a year-specific canonical ID, public slug, title, and date label; legacy unyeared URLs remain resolvable. Confirmed incomplete Europe, Costa Rica, Utah 2026, Miami, North Georgia, Peoria, and Hungary content is Atlas-visible without exposing editorial status language. Miami includes five chronology-safe story chapters and mapped South Pointe, Everglades, Shark Valley, and Oleta stops; generated batches provide 84 Miami Beach, 18 Everglades, and 9 Oleta images. South Pointe and Shark Valley media plus curated hero choices remain unresolved. Planned-only stops remain excluded. Experiences do not. |
| Media                  | [Media pipeline](architecture/media-pipeline.md)                         | [Journey media implementation](implementation/journey-media-ingestion.md) and [R2 Worker upload](implementation/r2-worker-media-upload.md) | Journey and Place/Visit image optimization plus lossless MP4 pass-through packaging, authenticated manifest-only upload, ingestion, Journey media, location media, and existing-Atlas-pin projection exist. Worker deployment and the first production batch remain unverified.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Gear                   | [Gear system](architecture/gear.md)                                      | [Gear ingestion CLI](reference/gear-ingestion-cli.md)                                                                                      | Canonical generated Gear/Usage ingestion and Journey selectors exist. The generated registry is empty.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Analytics and commerce | [Monetization and analytics](architecture/monetization-and-analytics.md) | [AdSense operations](reference/adsense.md) and [active monetization plan](implementation/monetization-and-analytics.md)                    | GA4 loader and gear-link click tracking exist. A disabled by default manual AdSense integration supports one eligible long story placement plus a separately disabled, session-capped guided Atlas placement after three distinct rich stops. Build validation, ads.txt generation, blocked-unit collapse, and a public privacy notice exist. Live account configuration, dashboard verification, consent setup, and the canonical referral contract remain.                                                                                                                                                                                                                                                            |
| Deployment             | [Project README](../README.md#how-production-works)                      | [Pages workflow](../.github/workflows/deploy-pages.yml)                                                                                    | GitHub Actions builds and deploys the static Vue site to Pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Active work

| Work                                                                       | Status            | What remains                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Journey media ingestion](implementation/journey-media-ingestion.md)       | Partial, verified | Deploy the upload Worker and run the first real R2-backed publication batch; automated Git/deployment remains later work.                                                                                                                                   |
| [R2 Worker media upload](implementation/r2-worker-media-upload.md)         | Partial, verified | Deploy to the owner's Cloudflare account, install the upload secret, and verify the first real immutable image/video batch.                                                                                                                                 |
| [Monetization and analytics](implementation/monetization-and-analytics.md) | Partial, verified | Complete the AdSense site review and ads.txt crawl, verify consent and Auto ads state, create the optional Atlas unit only after the site is Ready, then replace hostname-specific event branching with a stable referral contract and verify partner data. |

## Proposals and backlog

These documents describe future behavior, not available features:

- [Lightroom publishing](proposals/lightroom-publishing.md)
- [Photo EXIF and capture gear](proposals/photo-exif-gear.md)
- [Video metadata pipeline](proposals/video-metadata-pipeline.md)

## Reference and editorial guidance

Before generating or revising public travel content, read the
[Experiential storytelling framework](reference/storytelling-framework.md)
completely, then reconcile the relevant owner-supplied travel context against
canonical source and registered media. The framework governs voice and pacing;
it never turns an unverified detail into fact.

- [Living Atlas content strategy](reference/atlas-content-strategy.md)
- [R2 video delivery](reference/r2-video-delivery.md)
- [AdSense manual placement and activation](reference/adsense.md)
- [Experiential storytelling framework](reference/storytelling-framework.md)
- [Travel context and evidence boundaries](reference/travel-context.md)
- [USVI / St. John source notes](reference/usvi-st-john-source.md)

Reference documents can contain owner-supplied facts, workflows, or external
service guidance. They do not override canonical repository records.

## Audits

- [Documentation inventory and migration](audits/documentation-inventory-2026-11-14.md)
- [External-link audit](audits/external-links-2026-11-14.md)
- [Journey-media inventory snapshot](audits/journey-media-inventory-2026-11-14.md)

## Archive policy

Superseded and completed briefs live under [`archive/`](archive/). Each has an
archived warning and metadata pointing to its current replacement where one
exists. Archived files preserve requirements and rationale but are excluded
from the normal agent reading path.

Do not delete an archived brief merely because its feature shipped. Do not use
an archive document as an implementation instruction without rechecking the
current source and active docs.

## Validation

Run:

```bash
npm run docs:audit
```

The audit checks frontmatter, controlled metadata, document IDs, supersession
links, listed code/evidence paths, and relative Markdown links. It checks
structure only; it cannot prove application behavior.

## Known unknowns

- Cloudflare R2 bucket policy, object metadata, CORS, and credentials are not
  verifiable from this repository.
- The GA4 property configuration and received production events require owner
  or Analytics-console verification.
- Existing affiliate arrangements and the placeholder Booking.com identifier
  require owner validation before they are treated as commercial facts.
- No Lightroom plug-in, durable publishing outbox, EXIF extractor, or automated
  Git publisher exists in the repository.

**Last repository documentation audit:** 2026-11-14.
