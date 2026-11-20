---
id: gear-authoring-workflow
title: Gear Authoring Workflow
kind: reference
status: implemented
implementation_state: partial
created: 2026-11-19
updated: 2026-11-19
related:
  - gear-system
  - gear-ingestion-cli
  - gear-image-preparation
  - gear-publishing-implementation
supersedes: []
superseded_by: []
code_paths:
  - scripts/gear-workflow.mjs
  - scripts/test-gear-workflow.mjs
  - scripts/ingest-gear.js
  - scripts/lib/gear-image-preparation.mjs
  - scripts/lib/gear-remote-image.mjs
  - scripts/upload-media.js
  - scripts/publish-gear-image.mjs
verification:
  state: verified
  evidence:
    - node scripts/test-gear-workflow.mjs
    - npm run gear:test
---

# Gear authoring workflow

`gear:workflow` gives one product record and one reviewed creator-owned image a
single replayable authoring path. The image can be a local JPEG or PNG, or an
explicitly permitted HTTPS source paired with one exact approved hostname. It
composes the existing Gear ingestor,
deterministic image preparer, authenticated immutable uploader, and canonical
image publisher. It does not introduce another Gear registry or bypass any
existing validation.

The workflow deliberately has two apply checkpoints. `prepare` creates the
local product record and deterministic image package. A local source performs
no network request. A remote source performs only the bounded HTTPS intake
described in the Gear image preparation guide. The operator reviews the
generated WebP derivatives and card context.
`publish` accepts only that already prepared package, requires explicit card
approval, uploads immutable objects, verifies the checksum receipt, and runs
the canonical publication transaction.

## Workflow file

Paths are resolved relative to the workflow JSON file. `recordSource` is the
existing constrained Markdown or JSON Gear input and must contain exactly one
item whose Gear ID matches this workflow.

```json
{
  "schemaVersion": 1,
  "gearId": "replace-with-reviewed-product-id",
  "journeyId": "replace-with-canonical-journey-id",
  "recordSource": "./product.json",
  "image": {
    "source": "./product.jpg",
    "output": "./gear-ready",
    "rightsOwner": "roam-with-justin",
    "rightsStatus": "owned",
    "rightsReviewed": true,
    "alt": "Replace with reviewed neutral image alternative text"
  }
}
```

The example is a contract template, not production inventory. Exact product
identity, Journey usage, firsthand notes, image rights, and merchant links
must come from the owner.

For an authorized remote source, replace the local `source` and add the exact
approved hostname:

```json
{
  "source": "https://images.example.com/owned/product.jpg",
  "sourceHost": "images.example.com"
}
```

## Preview

```bash
npm run gear:workflow -- --source ./gear-inbox/product-workflow.json --dry-run --through publish
```

Preview runs canonical record planning and renders every derivative in memory.
It writes nothing and reports that upload and publication remain gated. A
remote source performs its bounded HTTPS download during preview. A local
source makes no network request.

## Prepare checkpoint

```bash
npm run gear:workflow -- --source ./gear-inbox/product-workflow.json --apply --through prepare
```

Apply repeats the preview before it writes. If record application or image
preparation fails, the prior canonical Gear file is restored. The resulting
package is ignored by Git and can be reviewed locally.

## Publish checkpoint

Configure the private `MEDIA_UPLOAD_WORKER_URL` and `MEDIA_UPLOAD_TOKEN`, then
publish only after reviewing the existing package and rendered card context.

```bash
npm run gear:workflow -- --source ./gear-inbox/product-workflow.json --apply --through publish --approve-card --build
```

The publish checkpoint refuses to create and publish a new package in one
step. It requires the deterministic manifest created by the earlier prepare
checkpoint. A changed existing image additionally requires `--replace-image`.
If remote upload completes but canonical publication fails, the local Gear
record is restored and immutable remote objects are retained for a safe rerun.

## Boundaries

- Local and authorized remote intake remain JPEG or PNG with reviewed
  creator-owned rights. Remote intake requires one exact approved HTTPS host
  and does not scrape, hotlink, or infer permission.
- Automatic affiliate tagging, AI research, Git commits, branch promotion,
  and deployment remain outside this command.
- Upload credentials are accepted only through private environment variables.
- The first real publication still needs exact owner inputs and an externally
  deployed upload Worker.
