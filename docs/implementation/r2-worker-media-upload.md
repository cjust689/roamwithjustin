---
id: r2-worker-media-upload-implementation
title: R2 Worker Media Upload
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-14
updated: 2026-11-18
related:
  - media-pipeline
  - journey-media-ingestion
  - content-model
supersedes:
  - r2-worker-media-upload
superseded_by: []
code_paths:
  - scripts/upload-media.js
  - scripts/test-media-upload.js
  - scripts/test-gear-image-upload.mjs
  - scripts/lib/gear-image-preparation.mjs
  - workers/media-upload/src/index.mjs
  - workers/media-upload/wrangler.jsonc
  - workers/media-upload/.dev.vars.example
  - package.json
verification:
  state: verified
  evidence:
    - npm run media:upload:test
    - npm run media:worker:check
    - npm run media:test
    - npm run content:validate
    - npm run build
---

# R2 Worker media upload

The repository now implements the upload step between `media:prepare` and
`media:ingest`. Local tests and a Wrangler dry-run verify the source and bundle.
The Worker has not yet been deployed to the owner's Cloudflare account, and no
production object upload has been performed from this implementation.

## Implemented boundary

```text
local Journey or Gear image manifest
        |
        v
scripts/upload-media.js
  - validates the selected Journey or Gear manifest contract
  - verifies every local image/MP4 signature, size, and SHA-256
  - uploads only manifest-listed files with bounded concurrency/retries
  - automatically chunks MP4s above 64 MiB into fixed multipart parts
        |
        v
authenticated upload-only Worker
  - accepts single PUT and constrained multipart actions for a manifest key
  - restricts keys to images/ and videos/
  - accepts JPEG, PNG, WebP, and MP4 only
  - enforces object/part size, batch ID, and SHA-256 contracts
  - uses R2 native multipart for larger MP4s
  - verifies the completed object before returning success
        |
        v
local checksum receipt
        |
        v
existing media:ingest or later reviewed Gear publication
```

The Worker exposes no object download, delete, list, arbitrary bucket, or
canonical-publication endpoint. Upload success does not edit the repository or
publish a placement. The existing ingestor remains the only generated-record
writer for Journey media. Gear receipt-backed canonical publication remains a
separate unimplemented step.

The authenticated object route supports these internal actions. The local CLI
constructs them; normal use does not require calling them directly.

| Method and action | Purpose |
| --- | --- |
| `PUT /v1/objects/<key>` | Single-request image or smaller MP4 upload |
| `POST ?action=multipart-create` | Create an R2 multipart session for an MP4 |
| `PUT ?action=multipart-part` | Validate and upload one numbered part |
| `POST ?action=multipart-complete` | Complete and verify the immutable object |
| `DELETE ?action=multipart-abort` | Best-effort cleanup after a failed upload |

## Credentials and configuration

There are two unrelated secrets. Never reuse one value for both purposes.

| Setting | Purpose | Where it lives | Required when |
| --- | --- | --- | --- |
| Wrangler OAuth login | Lets a human deploy/configure the Worker | Wrangler's private user configuration | Interactive deployment |
| `CLOUDFLARE_API_TOKEN` | Headless alternative to Wrangler OAuth | Private shell/CI secret | Non-interactive deployment only |
| `CLOUDFLARE_ACCOUNT_ID` | Selects the account for an API-token deployment | Private shell/CI secret | With `CLOUDFLARE_API_TOKEN` |
| `MEDIA_UPLOAD_TOKEN` | Authenticates object uploads to this Worker | Cloudflare Worker secret and local uploader environment | Worker runtime and real uploads |
| `MEDIA_UPLOAD_WORKER_URL` | Tells the local CLI where the deployed Worker lives | Local uploader environment | Real uploads |

These are not credentials:

- `MEDIA_BUCKET` is the Worker binding name.
- `roamwithjustin-media` is the configured R2 bucket name.
- `images/` and `videos/` are the permitted object-key prefixes.
- `media.roamwithjustin.com` is the public delivery origin, not the upload
  endpoint.

No R2 access-key ID or R2 secret-access key is needed. The Cloudflare Worker
binding gives the deployed Worker access to its configured bucket.

### Deployment permission choices

For a one-time interactive deployment, use Wrangler OAuth:

```bash
npx wrangler login
```

For headless/CI deployment, set an account-owned Cloudflare API token and
account ID in the private environment. Current Cloudflare authorization rules
require Workers product **Admin** to create this new Worker. After creation,
deploying code and managing its secret require **Editor** on this Worker (or
Workers product Editor). Deploying a Worker with an R2 binding does not by
itself require separate direct R2-object permissions.

Never put `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, or either upload
setting in a `VUE_APP_*` variable. Vue embeds those variables in the public
browser bundle.

## Before the first deployment

1. Confirm the production bucket is exactly `roamwithjustin-media`. If it is
   different, change `bucket_name` in
   `workers/media-upload/wrangler.jsonc` before deploying.
2. Confirm the account already owns that bucket. This implementation does not
   create or delete buckets.
3. Generate a unique upload token locally. A 32-byte random value is suitable:

```bash
export MEDIA_UPLOAD_TOKEN="$(openssl rand -hex 32)"
```

In Git Bash, do not type the displayed shell prompt `$` and do not add a
trailing backslash. Calling `node` through a local `winpty` alias inside
`$(...)` can fail with `stdout is not a tty`; OpenSSL avoids that wrapper and
is included with standard Git for Windows installations. Confirm the variable
contains 64 characters without printing the secret:

```bash
printf '%s' "$MEDIA_UPLOAD_TOKEN" | wc -c
```

Keep that shell private. Do not paste the resulting value into chat, source,
issues, logs, screenshots, or documentation.

## Validate and deploy

The checked-in Wrangler version and Worker bundle can be verified without a
Cloudflare deployment:

```bash
npm run media:worker:check
```

Redeploy the Worker after pulling video or multipart-pipeline changes. Updating
only the local CLI is insufficient because an older deployed Worker does not
provide the multipart action routes:

```bash
npm run media:worker:deploy
```

Deploy the Worker. The first deployment may briefly be unconfigured and will
return a safe `worker_not_configured` error until the secret is installed:

```bash
npm run media:worker:deploy
printf '%s' "$MEDIA_UPLOAD_TOKEN" | npm run media:worker:secret
```

Wrangler prints the deployed `workers.dev` URL. Store it only in the current
private shell or another private machine configuration:

```bash
export MEDIA_UPLOAD_WORKER_URL="https://<deployed-worker-host>"
```

The non-sensitive health check is:

```bash
curl "$MEDIA_UPLOAD_WORKER_URL/health"
```

The upload token can be rotated without changing object keys or content:

```bash
export MEDIA_UPLOAD_TOKEN="$(openssl rand -hex 32)"
printf '%s' "$MEDIA_UPLOAD_TOKEN" | npm run media:worker:secret
```

Update the local uploader environment at the same time. A revoked/incorrect
token receives HTTP 401 and cannot write R2 objects.

## Optional local Worker development

Wrangler uses a local R2 store by default, so this does not touch production:

```bash
cp workers/media-upload/.dev.vars.example workers/media-upload/.dev.vars
npm run media:worker:dev
```

Replace the example token only in the ignored `.dev.vars` file, and export the
same local value as `MEDIA_UPLOAD_TOKEN`. Point `MEDIA_UPLOAD_WORKER_URL` to the
local URL printed by Wrangler. Do not set the R2 binding to remote unless a
deliberate production-bucket test has been authorized.

## Upload a prepared local package

First verify local bytes and the complete plan without credentials or network
writes:

```bash
npm run media:upload -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/publication-manifest.json" --dry-run
```

Then upload. Only files listed by the manifest are read or sent:

```bash
npm run media:upload -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/publication-manifest.json"
```

On complete remote verification, the CLI atomically creates
`r2-verification.json` beside the manifest. It never fabricates a receipt for a
partial or dry-run upload. The next commands are:

```bash
npm run media:ingest -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/publication-manifest.json" --verification-receipt "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/r2-verification.json" --dry-run
npm run media:ingest -- --manifest "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/publication-manifest.json" --verification-receipt "O:/WebWorksMedia/Davinci Edits/USVI/r2-ready/usvi-waterlemon-cay/r2-verification.json"
```

For a reviewed Gear package, use its explicit adapter:

```bash
npm run gear:upload -- --manifest ./gear-ready/camera-accessory-<content-hash>/gear-image-manifest.json --dry-run
npm run gear:upload -- --manifest ./gear-ready/camera-accessory-<content-hash>/gear-image-manifest.json
```

The Gear adapter produces `gear-r2-verification.json`. It does not run
`media:ingest` or update a Gear record. After receipt and card review,
`gear:publish-image` is the separate canonical transaction:

```bash
npm run gear:publish-image -- --gear-id camera-accessory --manifest ./gear-ready/camera-accessory-<content-hash>/gear-image-manifest.json --receipt ./gear-ready/camera-accessory-<content-hash>/gear-r2-verification.json --dry-run
```

The checked-in Worker source accepts the prepared WebP contract, but the
external Worker deployment and first real Gear object upload remain
unverified.

## Retry and conflict behavior

- The uploader retries network errors, HTTP 429, and HTTP 5xx responses with
  bounded exponential backoff.
- Rerunning the same package is the object-level resume mechanism. Objects with
  the exact verified digest metadata, size, and MIME type return
  `already_present`. A process restart begins a new multipart session rather
  than trying to reuse an interrupted upload ID.
- An existing key with different or unverifiable metadata returns HTTP 409 and
  is never overwritten.
- R2 receives an atomic `If-None-Match: *` condition, preventing a race from
  replacing an immutable object during a single PUT. Multipart completion is
  constrained to content-derived keys and checks for an existing object before
  publishing.
- A changed local file fails before upload.
- A checksum mismatch during R2 write fails without a success receipt.
- The default per-image limit is 25 MiB through
  `MAX_IMAGE_UPLOAD_BYTES`. The default MP4 object limit is 190 MiB through
  `MAX_VIDEO_UPLOAD_BYTES`. The maximum accepted multipart part is 16 MiB
  through `MAX_MULTIPART_PART_BYTES`. All three are non-secret Worker
  variables.
- MP4s above the uploader's 64 MiB threshold use multipart automatically.
  Every part is at least 5 MiB except the final part, carries its own SHA-256,
  and is checked against its returned R2 ETag. Upload failure triggers a
  best-effort abort; R2 also expires abandoned sessions.
- The Worker does not transcode or recompress video. An MP4 above the configured
  190 MiB object policy must be re-exported or accepted through a deliberate
  configuration change.

## Credential recovery

- Lost local upload token: generate a new value, replace the Worker secret,
  and update the local environment. Existing objects and manifests are
  unaffected.
- Exposed upload token: rotate it immediately with `media:worker:secret`; the
  Worker still permits only constrained immutable media keys and has no delete
  or list endpoint.
- Exposed Cloudflare API token: revoke it in Cloudflare, issue a least-privilege
  replacement, and review deployment/audit history. It is not used by
  `media:upload`.
- Wrong bucket binding: correct `bucket_name`, redeploy, and do not ingest a
  receipt until the intended bucket has been verified.

## Official Cloudflare references

- [R2 Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [R2 multipart uploads from Workers](https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/)
- [R2 object upload guidance](https://developers.cloudflare.com/r2/objects/upload-objects/)
- [R2 Worker bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers authorization](https://developers.cloudflare.com/workers/authorization/)
