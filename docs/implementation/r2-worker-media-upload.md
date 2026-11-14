---
id: r2-worker-media-upload-implementation
title: R2 Worker Media Upload
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-14
updated: 2026-11-14
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
local publication-manifest.json
        |
        v
scripts/upload-media.js
  - validates canonical manifest
  - verifies every local image, dimension, size, and SHA-256
  - uploads only manifest-listed files with bounded concurrency/retries
        |
        v
authenticated upload-only Worker
  - accepts PUT /v1/objects/<manifest-key>
  - restricts keys to images/
  - accepts JPEG/PNG only
  - enforces size, batch ID, and SHA-256
  - uses an atomic create-only R2 write
  - verifies stored R2 checksum/metadata
        |
        v
local r2-verification.json
        |
        v
existing media:ingest transaction
```

The Worker exposes no object download, delete, list, arbitrary bucket, or
canonical-publication endpoint. Upload success does not edit the repository or
publish a placement. The existing ingestor remains the only generated-record
writer.

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
- `images/` is the permitted object-key prefix.
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

## Retry and conflict behavior

- The uploader retries network errors, HTTP 429, and HTTP 5xx responses with
  bounded exponential backoff.
- Rerunning the same package is the resume mechanism. Objects with the exact
  stored R2 SHA-256, size, and MIME type return `already_present`.
- An existing key with different or unverifiable metadata returns HTTP 409 and
  is never overwritten.
- R2 receives an atomic `If-None-Match: *` condition, preventing a race from
  replacing an immutable object after the Worker's initial existence check.
- A changed local file fails before upload.
- A checksum mismatch during R2 write fails without a success receipt.
- The default per-image limit is 25 MiB and can be changed through the
  non-secret `MAX_UPLOAD_BYTES` Worker variable after reviewing Cloudflare and
  project requirements.

## Credential recovery

- Lost local upload token: generate a new value, replace the Worker secret,
  and update the local environment. Existing objects and manifests are
  unaffected.
- Exposed upload token: rotate it immediately with `media:worker:secret`; the
  Worker still permits only constrained immutable image keys and has no delete
  or list endpoint.
- Exposed Cloudflare API token: revoke it in Cloudflare, issue a least-privilege
  replacement, and review deployment/audit history. It is not used by
  `media:upload`.
- Wrong bucket binding: correct `bucket_name`, redeploy, and do not ingest a
  receipt until the intended bucket has been verified.

## Official Cloudflare references

- [R2 Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [R2 Worker bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers authorization](https://developers.cloudflare.com/workers/authorization/)
