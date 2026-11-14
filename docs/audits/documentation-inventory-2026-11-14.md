---
id: documentation-inventory-2026-11-14
title: Documentation Inventory and Migration Audit
kind: reference
status: implemented
implementation_state: complete
created: 2026-11-14
updated: 2026-11-14
related:
  - docs-index
supersedes: []
superseded_by: []
code_paths:
  - README.md
  - package.json
  - src/content
  - scripts
  - .github/workflows/deploy-pages.yml
verification:
  state: verified
  evidence:
    - npm run docs:audit
    - npm run content:validate
---

# Documentation inventory and migration audit

This audit records the pre-migration path, evidence-backed classification, and
applied destination. Source and tests—not claims inside the inventoried file—
determined implementation status.

## Repository evidence

| Area                | Verified source evidence                                                                    | Finding                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Content             | `src/content/**`, `scripts/validate-content.js`                                             | Canonical Media, Places, Journeys, Visits, Partners, Atlas presentation, selectors, and validation exist. No Experience registry exists. |
| Media ingest        | `scripts/optimize-images.js`, `scripts/ingest-media.js`, generated Media JSON, selectors/UI | Package/manifest/verification/placement workflow exists; generated registry is empty and upload is manual.                               |
| Gear ingest         | `scripts/ingest-gear.js`, Gear generated JSON and selectors                                 | Ingest/validation/projection exists; generated registry is empty.                                                                        |
| Lightroom           | repository-wide source search                                                               | No Lua plug-in, Lightroom API integration, durable outbox, or automated publisher exists.                                                |
| EXIF/video metadata | repository-wide source search                                                               | No ExifTool/ffprobe ingestion or Behind-the-Shot model/UI exists.                                                                        |
| Analytics           | `public/index.html`, `public/404.html`, tracking utility and GearGrid                       | GA4 loader and gear-click events exist; production receipt cannot be verified locally.                                                   |
| AdSense             | repository-wide source search                                                               | No AdSense script, ID, slot, or component exists.                                                                                        |
| Deployment          | `.github/workflows/deploy-pages.yml`                                                        | Main pushes build with Node 22 and deploy the static artifact to GitHub Pages.                                                           |

## File-by-file migration

| Original path                                                                              | Subject / role                   | Applied destination                                          | Status and evidence                                         | Action / overlap                                                            |
| ------------------------------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `README.md`                                                                                | Project operations               | `README.md`                                                  | Current; build/CI paths verified                            | Keep and link to docs index.                                                |
| `GEAR_INGESTION.md`                                                                        | Implemented CLI reference        | `docs/reference/gear-ingestion-cli.md`                       | Implemented; CLI/library/tests exist                        | Move; supersedes Gear planning brief operationally.                         |
| `MEDIA_INGESTION.md`                                                                       | Active media workflow            | `docs/implementation/journey-media-ingestion.md`             | Partial; code/tests exist, production batch absent          | Move; retain active gaps.                                                   |
| `src/features/atlas/README.md`                                                             | Feature-local architecture       | Same path                                                    | Implemented but stale legacy-path statements found          | Keep near code and correct against current selectors/routes.                |
| `codex-context/Roam_With_Justin_Atlas_Asset_Architecture_README.md`                        | Completed migration/design brief | `docs/archive/atlas-asset-architecture-brief.md`             | Superseded by concise verified architecture                 | Archive; unique migration rationale preserved.                              |
| `codex-context/Roam_With_Justin_Atlas_Content_Strategy.md`                                 | Product/editorial strategy       | `docs/reference/atlas-content-strategy.md`                   | Reference; not implementation evidence                      | Move and label reference.                                                   |
| `codex-context/Roam_With_Justin_Atlas_R2_Video_README.md`                                  | R2 delivery/setup guidance       | `docs/reference/r2-video-delivery.md`                        | Partial/external settings unverified                        | Move; current media architecture owns source facts.                         |
| `codex-context/Roam_With_Justin_Documentation_Lifecycle_Adoption_Codex_Brief.md`           | This migration brief             | `docs/archive/documentation-lifecycle-adoption-brief.md`     | Completed as a process adoption                             | Archive with pointer to index/audit.                                        |
| `codex-context/Roam_With_Justin_External_Link_Audit.md`                                    | Source audit                     | `docs/audits/external-links-2026-11-14.md`                   | Source paths verified; live URLs not rechecked              | Move as dated audit.                                                        |
| `codex-context/Roam_With_Justin_Gear_Ingestion_and_Journey_Linking_Architecture.md`        | Gear proposal                    | `docs/archive/gear-ingestion-architecture-brief.md`          | Core CLI shipped; broader EXIF/media ideas remain elsewhere | Archive; link current Gear architecture/reference.                          |
| `codex-context/Roam_With_Justin_Journey_Media_Ingestion_Architecture.md`                   | Media-ingest proposal            | `docs/archive/journey-media-ingestion-architecture-brief.md` | Core pipeline shipped; future publishing remains proposed   | Archive; link active implementation and as-built media doc.                 |
| `codex-context/Roam_With_Justin_Journey_Media_Inventory_and_Interim_Lightroom_Workflow.md` | Dated operational snapshot       | `docs/audits/journey-media-inventory-2026-11-14.md`          | Counts can become stale                                     | Move as audit, not current authority.                                       |
| `codex-context/Roam_With_Justin_Lightroom_to_Atlas_Publishing_Architecture.md`             | Future publishing architecture   | `docs/proposals/lightroom-publishing.md`                     | Not implemented                                             | Move as active proposal.                                                    |
| `codex-context/Roam_With_Justin_Master_Plan_AI_Context.md`                                 | Overlapping AI orientation       | `docs/archive/master-plan-ai-context.md`                     | Mixed historical claims/future work                         | Archive; docs index replaces its routing role.                              |
| `codex-context/roam_with_justin_monetization_analytics_adsense_codex_brief_UPDATED.md`     | Mixed GA4/AdSense plan           | `docs/implementation/monetization-and-analytics.md`          | Partial; GA4 exists, AdSense absent                         | Move as active implementation plan; split verified state into architecture. |
| `codex-context/Roam_With_Justin_Photo_EXIF_Gear_Integration_README.md`                     | EXIF/capture-Gear proposal       | `docs/proposals/photo-exif-gear.md`                          | Not implemented                                             | Move as proposal; canonical Gear CLI is separate.                           |
| `codex-context/Roam_With_Justin_Storytelling_Framework_AI_Ingestion.md`                    | Editorial guidance               | `docs/reference/storytelling-framework.md`                   | Not an application feature                                  | Move as reference.                                                          |
| `codex-context/roam_with_justin_travel_context.md`                                         | Owner-supplied facts/plans       | `docs/reference/travel-context.md`                           | Mixed confidence; canonical source records win              | Move as evidence reference.                                                 |
| `codex-context/Roam_With_Justin_USVI_St_John_Trip_Ingestion_UPDATED.md`                    | Journey source brief             | `docs/reference/usvi-st-john-source.md`                      | Much content exists; source note retains open evidence      | Move as Journey-specific reference.                                         |
| `codex-context/Roam_With_Justin_Video_Metadata_Pipeline_README.md`                         | Video metadata proposal          | `docs/proposals/video-metadata-pipeline.md`                  | Not implemented                                             | Move as proposal.                                                           |

## Conflicts resolved

- Older instructions to edit `trips.js` or `atlasData.js` are superseded;
  neither retired authority exists.
- Planning claims that media/gear/Lightroom/AdSense workflows are complete are
  replaced by code-backed partial/not-implemented statuses.
- The docs index replaces both `codex-context/` discovery and the old master
  plan's claim to be the mandatory AI entry point.
- Generated registries remain authoritative machine-owned output; proposals do
  not create parallel databases.

## Applied lifecycle infrastructure

- `docs/README.md` is the single navigation/status entry point.
- Four concise architecture documents describe only verified current behavior.
- Active implementation, proposals, references, dated audits, and historical
  briefs have distinct directories and metadata.
- `AGENTS.md` requires source verification and documentation reconciliation for
  future feature work.
- `scripts/docs-audit.mjs` and `npm run docs:audit` validate document structure;
  the production build runs this check before application content validation.

## Verification report

Commands run after migration:

| Command                    | Result                                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run docs:audit`       | Passed: 24 managed documents, 24 unique IDs, no broken metadata/links/paths; six intentional unverified warnings.                             |
| `npm run content:validate` | Passed: 111 media, 0 generated gear items/usages, 0 generated media placements, 45 places, 5 journeys, 38 visits, 29 Atlas nodes.             |
| `npm run gear:test`        | Passed.                                                                                                                                       |
| `npm run media:test`       | Passed.                                                                                                                                       |
| `npm run lint`             | Passed with the repository's existing stale Browserslist notice.                                                                              |
| `npm run build`            | Passed, including docs/content validation and Pages fallback generation; existing MapLibre dynamic-dependency and asset-size warnings remain. |
| `git diff --check`         | Passed.                                                                                                                                       |

The six structural-audit warnings are intentional: the Journey media snapshot,
Lightroom proposal, Photo EXIF proposal, video-metadata proposal, R2 delivery
reference, and broad travel-context reference remain explicitly unverified.
No application source behavior was changed by this documentation migration.

## Unresolved owner/external questions

- Confirm live R2 configuration and whether a checksum-capable upload receipt
  can be produced routinely.
- Confirm GA4 events in the Analytics property and the intended consent policy.
- Confirm actual affiliate relationships and replace/remove placeholder IDs.
- Decide when Lightroom, EXIF, and video metadata proposals should enter active
  implementation.
