---
id: gear-system
title: Gear Registry and Journey Usage
kind: architecture
status: implemented
implementation_state: partial
created: 2026-11-14
updated: 2026-11-19
related:
  - content-model
  - gear-ingestion-cli
  - gear-sheet-workflow
  - gear-image-preparation
  - gear-authoring-workflow
  - gear-publishing-implementation
  - photo-exif-gear
  - gear-affiliate-readiness-2026-11-17
supersedes:
  - gear-ingestion-architecture-brief
superseded_by: []
code_paths:
  - scripts/ingest-gear.js
  - scripts/gear-workflow.mjs
  - scripts/ingest-gear-sheet.mjs
  - scripts/generate-gear-workbook.mjs
  - scripts/prepare-gear-image.mjs
  - scripts/publish-gear-image.mjs
  - scripts/upload-media.js
  - scripts/lib/gear-ingestion.js
  - scripts/lib/gear-image-preparation.mjs
  - scripts/lib/gear-remote-image.mjs
  - scripts/lib/gear-image-publication.mjs
  - scripts/lib/image-normalization.js
  - scripts/test-gear-image-preparation.mjs
  - scripts/test-gear-remote-image.mjs
  - scripts/test-gear-image-upload.mjs
  - scripts/test-gear-image-publication.mjs
  - workers/media-upload/src/index.mjs
  - src/content/gear/generated/images.json
  - scripts/lib/gear-tracking-sheet.js
  - templates/roam-with-justin-gear-tracker.xlsx
  - src/content/gear/index.mjs
  - src/content/gear/generated/records.json
  - src/content/commercial-links.js
  - src/content/partners/index.mjs
  - src/content/selectors/gear.mjs
  - src/content/selectors/media.mjs
  - src/content/selectors/projections.mjs
  - src/components/GearGrid.vue
  - src/components/Banner.vue
  - scripts/validate-content.js
verification:
  state: verified
  evidence:
    - npm run gear:test
    - npm run media:worker:check
    - npm run gear:workbook
    - npm run content:validate
---

# Gear registry and Journey usage

Gear identity and contextual usage are separate generated registries. The
ingestor accepts constrained Markdown or strict JSON, requires an explicit
canonical Journey, validates references and links, and performs deterministic
upserts without editing Journey narrative modules.

The same contract is available through a generated Excel workbook and Google
Sheet ingestor. One sortable `Gear` table keeps product identity and one
Journey or Visit usage on the same row. Preview remains read only. Apply is
explicit, validates the complete generated registry, and writes `Published`,
the processed hash, and a timestamp back to hidden automation columns. Stable
Gear IDs are reused across Journey rows rather than copying product identity.
The workbook also provides a same-column-order `Gear Library` that snapshots
canonical products and supports copying a reusable identity row into a new
Journey usage. The importer deliberately ignores the library tab.

The Journey gear selector joins published usage to canonical items, selects a
verified primary link, applies safe `rel` behavior, and exposes disclosure
metadata. Trip projection retains legacy Journey `gearHighlights` only as a
compatibility fallback while records migrate.

Gear merchant links reuse canonical Partner identity and the site's existing
`partner_click` event. A normalized link records `partnerId`, `linkType`,
`trackingMode`, and its allowed public Gear and Journey surfaces. Complete
custom affiliate URLs are retained unchanged after HTTPS, Partner relationship,
and permitted-host validation. Automatic tracking rules fail closed unless a
provider-specific rule is explicitly configured. No Gear rule is configured
at present. Amazon Associates is registered as an owner-supplied affiliate
Partner for complete URLs on `amazon.com`, `amzn.to`, and `a.co`. The ingestor
does not create, shorten, expand, or retag those URLs. Published affiliate
actions use sponsored link qualification and show the canonical Partner
disclosure near the action.

The generated Gear and Usage arrays are currently empty. The CLI and selector
path are implemented and tested, but no example product from a planning brief
was treated as confirmed production input.

The trusted `gear:prepare` path now accepts one reviewed creator-owned JPEG or
PNG without requiring a Journey. The source can be a local file or an
explicitly permitted HTTPS URL paired with one exact approved hostname. Remote
intake resolves and pins publicly routable DNS addresses for every request,
allows at most three same-host redirects, and enforces HTTPS, timeout, response
size, content type, byte signature, decoded format, and pixel limits. It
reuses the media pipeline's Sharp normalization primitive, strips private
source metadata, and produces deterministic 320, 640, and 960 pixel WebP
derivatives plus a Gear-specific manifest. Dry run writes no files, apply is
atomic, and an identical rerun verifies the package as unchanged.

`gear:upload` revalidates that manifest and every local WebP before adapting
the derivatives into the existing authenticated immutable upload transport.
The Worker accepts prepared WebP under the same size, key, checksum, and
create-only constraints as JPEG and PNG. The descriptive Gear batch remains
in the receipt while the content hash is the Worker batch segment embedded in
each immutable key. An exact rerun verifies existing objects and the existing
receipt. Upload still does not change a canonical Gear record.

`gear:publish-image` closes the repository transaction only for an existing
canonical Gear ID. It revalidates the local package and exact checksum receipt,
requires explicit card approval, and writes a Gear-owned generated Media shard
plus that item's `imageAssetId`. The shard is composed through the existing
Media registry, so selectors retain one canonical Media lookup instead of a
second browser image registry. The stable asset ID survives replacement while
immutable R2 objects and receipt-backed batch revisions preserve history. All
three derivatives become a responsive `srcset`. A replacement requires the
separate `--replace-image` acknowledgement. Content validation or optional
build failure restores both generated files.

`gear:workflow` now composes record ingestion and the complete image path from
one versioned local JSON file. A no-write preview validates the canonical
record and renders image derivatives in memory. A remote source causes that
preview to perform the same bounded HTTPS read, but it still writes nothing.
The first apply checkpoint
creates the deterministic local package for review. A second explicitly
approved checkpoint accepts only that existing package, performs authenticated
immutable upload, verifies the receipt, and invokes the existing canonical
image transaction. Record state is restored when a later local or publication
step fails. Uploaded immutable objects are retained for a safe rerun rather
than destructively removed.

The public Gear page now reads only the verified canonical Gear selector. It
shows a concise empty state while the registry is empty. The former
hardcoded product array, third party product photographs, unverified action
links, and blanket affiliate claim are no longer rendered. The sitewide
affiliate banner is now limited to the Gear route and appears only when the
canonical public catalog actually contains an affiliate action. Content
validation also rejects the known placeholder URL shapes before a production
build.

See [Gear ingestion CLI](../reference/gear-ingestion-cli.md) for the exact input
contract and commands.

## Boundaries

- Capture equipment, visible products, and packed/used Journey gear are
  distinct relationships.
- EXIF extraction and automatic camera/lens resolution are not implemented.
- An affiliate URL must be explicitly supplied and verified; ingestion does
  not invent product ownership, usage, retailers, commercial relationships,
  Partner identities, or tracking rules.
- `isCustomTracked` is an authoring compatibility input. Canonical data stores
  the unambiguous `trackingMode` value instead of competing booleans.
- Gear links can render only on their explicit public surfaces. Affiliate
  links require a canonical affiliate Partner and a permitted destination
  host. Ordinary links remain noncommissionable and use `trackingMode: none`.
- Local or authorized remote product-image preparation, receipt-backed R2 upload, and canonical
  Gear image publication are Journey independent and create no fake Journey
  placement.
- Remote intake remains a trusted publisher operation. It requires reviewed
  creator-owned rights and an exact approved source host. It does not scrape a
  retailer, infer permission from public availability, hotlink in the browser,
  or broaden the canonical rights contract.
- Worker source accepts Gear WebP, but the external Cloudflare deployment and
  a first real Gear object upload remain unverified.
- Product identity, usage, links, notes, rights, and the rendered card still
  require owner review. Image publication cannot create a Gear product.
- The workbook Catalog is generated from the repository and is not yet a live
  protected catalog mirror. Regenerate the workbook when choices change.
- Optional AI research and automatic merchant tracking rules are not
  implemented.
- The file-based authoring orchestrator is implemented, but it does not remove
  the owner product, usage, image-rights, merchant, Worker, or card-review
  gates.
- The older `src/data/affiliates.js` page data is a separate legacy commerce
  source and is not canonical Gear identity. Its placeholder Booking record has
  been removed; remaining partner records still require their own relationship
  and destination review.
