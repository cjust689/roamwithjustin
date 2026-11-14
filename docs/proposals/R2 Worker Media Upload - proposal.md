---
id: r2-worker-media-upload
title: R2 Worker Upload for Prepared Media
kind: proposal
status: proposed
implementation_state: not-started
created: 2026-11-14
updated: 2026-11-14
related:
  - media-pipeline
  - journey-media-ingestion
  - content-model
supersedes: []
superseded_by: []
code_paths:
  - scripts/optimize-images.js
  - scripts/ingest-media.js
  - scripts/lib/media-ingestion.js
  - src/content/media/generated/records.json
verification:
  state: not-verified
  evidence: []
---

# Proposal: Cloudflare R2 Worker + `media:upload` for prepared journey media

> **Coding-agent instruction:** This is a *proposal*, not evidence of a completed implementation. Read `docs/README.md`, the current `docs/architecture/media-pipeline.md`, and the journey media ingestion implementation guide first. Inspect the actual repository, CLI flags, package/manifest schema, R2 configuration, and receipt validation code before changing anything. Keep this proposal in the repository's designated `docs/proposals/` directory and update document metadata/index as work progresses. Do not assume paths or commands below exist until verified.

## 1. Problem and desired outcome

The existing pipeline already does the difficult content preparation:

- `media:prepare` resolves a **canonical Journey**, creates a collision-safe local package, optimizes and numbers images, assigns versioned **R2 object keys**, and writes a measured `publication-manifest.json` with explicit rights.
- `media:ingest` validates the local files and publication manifest, accepts a checksum receipt or acknowledged public-HEAD policy, plans idempotent media assets/placements, and atomically updates `src/content/media/generated/records.json` only after validation.
- The application's `getJourneyPublishedMedia()` selector renders published Journey-level media inside the root Journey's **All photography** section, without replacing curated heroes or galleries.

**Missing step:** The operator currently must upload `media:prepare` output to R2 manually. The intended experience is to run a command that uploads the *exact prepared objects*, validates remote integrity, produces a receipt already understood by (or deliberately integrated into) `media:ingest`, and then optionally invokes ingestion.

Target workflow:

```text
npm run media:prepare -- <existing actual CLI flags>
              |
              v
  local prepared package + publication-manifest.json
              |
              v
npm run media:upload -- --manifest <path> [--dry-run]
              |
              v
  authenticated Cloudflare Worker upload endpoint
              |
              v
 Cloudflare R2: exact predeclared manifest keys
              |
              v
 signed/verified upload receipt (local; not public)
              |
              v
npm run media:ingest -- --manifest <path> --receipt <path>
              |
              v
 canonical registry + Journey-level All photography
```

These are conceptual command forms; derive final syntax from existing code and document the exact operator commands. **The Worker uploads; it does not independently publish Media records, alter a Journey, or trigger an unaudited Git push.**

### Non-goals for MVP

- Building a browser-based admin panel, new CMS, or public upload service.
- Replacing `media:prepare`, renaming prepared files, or generating new R2 keys during upload.
- Automatic place/visit/experience assignments inferred from filenames or R2 prefixes.
- EXIF/Gear enrichment, Lightroom plugin, multi-rendition generation, automatic deploy, or public write credentials.
- Treating an HTTP 200 from a Worker as sufficient proof that uploaded bytes match the manifest.

## 2. Architectural decision to make *after* code audit

**Preferred proposal:** A small, authenticated **upload-only Cloudflare Worker with an R2 bucket binding**, plus a local Node CLI `media:upload` that reads prepared manifests and sends upload requests. The Worker authorizes keys/prefixes, enforces allowed types/sizes, writes to R2, and reports server-observed object metadata. The local client verifies all uploads and emits the ingestion-compatible receipt.

**Alternative worth evaluating:** The Node CLI uploads straight to R2 via AWS S3-compatible SDK using machine-local, restricted R2 credentials. This may be **simpler** for a single trusted publishing computer and avoids a public HTTP upload endpoint and Worker upload-body limits. Document this tradeoff before implementing. Choose the Worker if centralized auth, future multiple machines, credential isolation, or future Lightroom integration genuinely justify it. The user requests a Worker, so implement that path unless the audit reveals a compelling blocker, and explain any adjustment.

**Another option for larger media:** An authenticated Worker issues short-lived **presigned PUT URLs** for direct client-to-R2 upload; a separate server-side verification endpoint confirms the stored object. Presigning requires S3 API signing credentials (an R2 binding alone does not create presigned URLs). This pattern bypasses Worker body limits but increases credential/endpoint complexity. Consider as a later enhancement or if the current image size regime requires it. Never expose signing secrets to the site bundle.

## 3. Trust boundaries and ownership

| Component | Responsibility | Does **not** do |
|---|---|---|
| `media:prepare` | Resolve Journey, generate immutable/monotonic versioned keys, optimize files, calculate measurements/hashes, manifest and rights | Upload or mutate canonical Media registry |
| Local `media:upload` | Read/validate manifest, authenticate to Worker, upload exact bytes, verify results, save durable receipt, resume/retry safely | Guess journey from filenames, silently reassign IDs, publish editorial placements |
| Upload Worker | Authenticate uploader, constrain R2 keys/content, write and stat objects, return trusted object facts | Accept arbitrary public writes, modify repo/Git, grant anonymous list/delete |
| R2 | Store versioned objects by manifest key | Act as source of truth for which Journey/Place an object belongs to |
| `media:ingest` | Validate manifest + uploaded-object evidence; idempotently register Media and Journey placement; preserve curation | Upload or regenerate images |
| Atlas | Resolve canonical records and render Journey-level All photography | Scan bucket prefixes to discover unpublished photos |

**Authoritative information:** Use manifest's `journeyId`, stable asset identity/revision, R2 key, expected byte length, checksum, MIME type, rights, and local path as defined by the actual code. Preserve existing receipt schema if possible. Never assume that the human-readable file name is the asset ID.

## 4. Proposed package and R2 layout

**Illustrative only** — inspect real `media:prepare` output before freezing the structure:

```text
prepared/
  usvi-<batch-id>/
    publication-manifest.json
    images/
      usvi-001.webp
      usvi-002.webp
    upload-receipt.json       # created only after successful remote verification
```

R2 object names are exactly those **already specified in the manifest**, e.g. illustrative `images/usvi/<batch-id>/usvi-001.webp`. The uploader must not infer or recompute object names from folder names. The published delivery host continues to be `https://media.roamwithjustin.com` unless the existing `VUE_APP_MEDIA_BASE_URL` override is set at build time; this host is **not** the authenticated upload endpoint.

Ensure JSON manifests/receipts are not accidentally uploaded into the public image prefix unless the current storage contract expressly requires it. The content registry stays in Git, not in the R2 directory.

## 5. Worker API (proposed contract, adapt to existing schema)

Prefer a minimal versioned API. Do not add broad bucket administration endpoints.

### `PUT /v1/objects/<encoded-allowed-key>`

- Authorization: `Authorization: Bearer <upload-only-secret>` initially; store secret using Wrangler secrets, not source control. Use a constant-time-equivalent validation pattern appropriate to Workers; no browser CORS access required. If adopting Cloudflare Access or stronger machine auth, document setup and keep the same least-privilege principle.
- Body: streaming bytes from the prepared file; explicitly cap allowed content length and timeouts.
- Required trusted request metadata: key, expected size, SHA-256 digest, MIME type, manifest batch ID / asset ID / revision where supported by existing manifest. Request metadata remains *claims* until verified.
- Validate a strict R2 key prefix allowlist (derived from manifest and allowed publication area), MIME allowlist (`image/webp`, other formats only if the existing pipeline supports them), path normalization, and reject `..`, empty segments, arbitrary buckets, and unexpected key formats. Never accept user-supplied public hostnames.
- Detect existing object before write. If same key with matching **verified** size/hash, return `already_present`; if key exists but differs, return a non-destructive conflict (409). **No overwrite** of published revisions by default.
- Stream to R2 with its bucket binding (`env.MEDIA_BUCKET.put(...)`) rather than buffering entire files in memory. Make size and digest verification explicit: a claimed SHA-256 header is not proof unless the Worker computes/validates it or the uploader independently verifies via a trusted stored checksum. Use supported R2 metadata/checksum mechanisms after inspecting APIs.
- Store a verifiable content digest as object custom metadata if supported by actual R2 use, and return canonical object key, byte size, ETag, digest-verification status, and request ID. **ETag is not universally equivalent to SHA-256 and must never be treated as one.**
- Return structured JSON errors (401/403/409/413/422/5xx), with no bearer secrets, presigned URLs, or private paths in logs.

### `POST /v1/objects/verify` (optional if needed by receipt contract)

- Given a restricted list of exact manifest keys, query the bound bucket for object metadata and compare expected length and stored server-verified digest.
- Authenticate identically. Enforce a small batch size and no arbitrary bucket listing.
- Return signed/otherwise tamper-resistant verification facts only if `media:ingest` genuinely needs cryptographic provenance. For a local trusted workflow, an authenticated receipt containing independently confirmed metadata may suffice, but the agent must document trust assumptions and preserve the ingestor's current security contract.

### `GET /health`

Return a non-sensitive status only; no bucket inventory, secrets, or deployment internals.

**Do not expose GET-object, DELETE-object, list-bucket, or generic path-proxy routes in MVP.** Existing public delivery through `media.roamwithjustin.com` is a separate channel.

## 6. Worker size limits and upload strategy

Cloudflare's current documented incoming Worker request-body limit depends on the Cloudflare zone plan (commonly **100 MB** on Free/Pro; confirm current plan and documentation). Prepared optimized photographs should usually fit, but **the CLI must preflight sizes** and fail with clear guidance if a file exceeds the configured limit. Do not accidentally advertise support for videos or large originals through a single Worker PUT.

For large future files, use a deliberately designed multipart upload path or direct-to-R2 signed PUT/multipart approach. Multipart requires bounded part sizes, upload session cleanup, retry strategy, and the same end-to-end receipt verification. Avoid building multipart unless proven necessary for the first real batches.

## 7. Local CLI `media:upload`

Expected user operations (illustrative syntax):

```bash
npm run media:upload -- --manifest ./prepared/usvi-batch/publication-manifest.json --dry-run
npm run media:upload -- --manifest ./prepared/usvi-batch/publication-manifest.json
npm run media:upload -- --manifest ./prepared/usvi-batch/publication-manifest.json --resume
```

Requirements:

1. **Reuse manifest parsing/validation** from `scripts/lib/media-ingestion.js` or a shared non-circular helper instead of creating a divergent schema validator.
2. Require an exact, existing prepared file for each manifest entry. Validate allowed local file paths stay within the package, expected byte length, and SHA-256 before attempting network upload.
3. Resolve auth and endpoint from environment or private machine config (`MEDIA_UPLOAD_WORKER_URL`, `MEDIA_UPLOAD_TOKEN` examples); never write secrets to the public Vue build or commit `.env` containing secrets.
4. Upload in bounded concurrency (e.g. 2–4 files), with retry on network/429/5xx using capped exponential backoff; do not retry invalid authentication, checksum mismatches, or 409 overwrite conflicts.
5. Support **idempotence**: rerun the exact package without duplicate writes; treat verified pre-existing identical objects as success. On a partial failure, keep successful R2 objects intact and retry only missing/unverified ones.
6. Report per-file and total outcomes (`uploaded`, `already_present`, `conflict`, `failed`, bytes transferred) and exit nonzero unless the whole package is remotely verified.
7. `--dry-run` displays resolved Journey, batch, keys, object sizes, expected rights/associations, and planned uploads with **no writes** to R2 or canonical content. It must never fabricate a success receipt.
8. Output a durable `upload-receipt.json` (or existing receipt filename/shape) **atomically only after full verification**. Include schema version, batch identity, manifest fingerprint, object key, expected and remotely validated size/digest, ETag where useful, verified timestamp, endpoint identity (non-secret), and verification method; honor the existing ingestor contract.
9. Do **not** auto-run `media:ingest` by default until integrity verification and rollback behavior are tested. Consider a later `media:publish` orchestration command (`prepare` → `upload` → `ingest`) that reuses these existing commands, not a second implementation.
10. Never upload unselected source photos, `.env` files, unrelated files in the directory, or arbitrary content not present in the manifest.

## 8. Critical integration: receipts and canonical ingestion

The uploaded `media-pipeline.md` states that `media:ingest` **already requires a checksum receipt or an explicitly acknowledged public-HEAD policy**. The Agent must inspect its exact receipt schema and verification behavior; the easiest correct path is to make `media:upload` produce the receipt the current ingestor accepts.

- If the receipt schema is inadequate, version/migrate it deliberately and add tests; **do not weaken** ingest validation to accept a generic `uploaded: true` flag.
- Verify that the bytes stored in R2 correspond to the manifest's local content. A successful PUT, a file-size match, a custom metadata digest copied from the request, and an ETag alone are **not equivalent** to independent checksum verification.
- Prefer supported R2 checksums or server-computed digest where feasible; if not feasible with streaming Worker constraints, specify a trusted alternative (e.g. direct R2 metadata verification plus checksum-authenticated upload protocol), label assurance honestly, and do not silently call it checksum-verified.
- Never publish an incomplete batch. Ensure `media:ingest` remains atomic and that a failure leaves generated registry unchanged.
- No automatic Place, visit, gallery, capture-gear, or visible-gear associations. Journey-level **All photography** is the minimal useful publication surface.
- Re-running the same batch is idempotent. Reprocessing a changed image uses the **next valid revision/key** per existing monotonic revision rules; do not overwrite previous revisions in place.

## 9. Security and operational boundaries

- The Worker write endpoint is **private to the trusted local publisher**, not exposed from the public Atlas UI; protect routes from unauthenticated access regardless of obscurity of URL.
- Keep all Worker secrets in Cloudflare's secure secret storage and local machine environment; add `.env.example` with **names only**. Do not log tokens, authorization headers, file bytes, full presigned URLs, or sensitive EXIF.
- Bind the Worker to the intended R2 bucket; don't accept client-selected bucket names or unrestricted object keys.
- Use least privileges and rotate credentials without touching content data. Distinguish a Worker bearer token from R2 S3 API credentials; an R2 binding can avoid distributing R2 credentials to the publishing machine.
- Limit request size, concurrency, rate, content types, and keys. Consider Cloudflare Access or IP restrictions later, but not as substitutes for authentication.
- Retain a meaningful immutable audit trail: local batch receipt and Worker request IDs. Return clear errors without leaking internal metadata.
- Verify public R2 delivery separately (where appropriate) without equating visibility with publication; upload success must not imply automatic inclusion in site content.
- Explicitly document data retention of local receipts, failed upload state, and what happens when a secret is revoked.

## 10. Proposed source changes (only after inspecting the repo)

Keep additions minimal:

```text
workers/media-upload/            # or existing Workers workspace, if present
  src/index.ts                    # narrow authenticated upload handler
  wrangler.jsonc                  # R2 binding and non-secret vars
scripts/upload-media.js           # or .mjs to match project conventions
scripts/lib/...                   # shared manifest and receipt helper only if needed
tests/...                         # Worker and local CLI tests
.docs?                            # NO: use established docs/ hierarchy
```

Preserve existing code conventions: JavaScript/TypeScript double-quoted strings, **no semicolons**, no unnecessary abstractions. Use actual repository paths instead of mechanically creating the layout above. Add `media:upload` to `package.json` and add an operator runbook. Do not touch public `VUE_APP_*` settings for private upload authentication.

## 11. Test matrix and acceptance criteria

Build tests with mocked R2 bucket / Worker bindings and local test manifests; do not require production credentials in CI.

| Case | Required outcome |
|---|---|
| Valid USVI prepared package | Upload exact keys, verify all bytes/metadata, emit accepted receipt |
| Correct receipt + existing `media:ingest` | Registers one asset per media identity and Journey placement; appears via selector |
| Re-run same manifest | No extra registry entries or harmful overwrite; identical objects skipped |
| Interrupted mid-batch | Retry/resume remaining objects; no partial canonical publication |
| Same key, different bytes | 409 conflict, no overwrite, no success receipt |
| Wrong/missing auth | 401/403; no R2 writes |
| Invalid key/path traversal/prefix | Rejected before any R2 write |
| Altered local file after `media:prepare` | Client checksum failure before upload |
| Digest not verified remotely | Explicit failure or clearly designated lower-assurance policy; no false checksum receipt |
| Worker size exceeded | Preflight failure with actionable remediation |
| Missing rights / unknown Journey / bad schema | Reject using existing preparation/ingestion validation |
| `--dry-run` | No R2 mutations, no receipt, no registry mutation |
| `media:ingest` validation fails | Generated registry remains unchanged |
| Curated hero/gallery exists | New journey All photography updates without replacing editorial curation |

Run the repo's actual checks, including `npm run media:test`, `npm run content:validate`, and `npm run build` (as applicable), plus new Worker/CLI tests. Report results separately from any untested production upload.

## 12. Delivery phases

### Phase A — contract audit and decision

1. Read manifest format, key policy, hash algorithm, revision logic, receipt format, CLI arguments, current Cloudflare configuration, and existing tests.
2. Confirm Worker versus direct S3 uploads with practical rationale and upload-size ceiling.
3. Define exact Worker API and receipt fields in a short contract test/fixture before writing the handler.

### Phase B — secure upload vertical slice

1. Add Worker binding/auth/key constraints and one streaming image PUT endpoint.
2. Add Node `media:upload` with dry-run, integrity checks, bounded retries, verified skip, and atomic receipt.
3. Use the existing ingest receipt contract; only extend it with versioned migration/tests when necessary.
4. Confirm with a test bucket or test key namespace, **not unreviewed live production assets**.

### Phase C — end-to-end publication verification

1. Prepare a small real Journey batch (e.g. canonical USVI journey, after ID confirmed).
2. Upload via Worker and inspect R2 keys and returned metadata.
3. Run `media:ingest` with verified receipt, then content validation and build.
4. Confirm images appear under the right Journey's **All photography**; verify no Place claim or curated-gallery mutation.
5. Document exact CLI invocations, environment configuration, rollback/retry steps, and observed results.

### Phase D — optional conveniences (later)

- `media:publish` orchestrator, progress display, automatic Git commit/deploy option behind explicit flag, presigned/multipart video support, durable job queue/outbox, Lightroom Publish Service integration. Do **not** expand MVP to include these.

## 13. Agent deliverables and documentation lifecycle

Return:

1. A brief inventory of **existing** implementation and what was missing.
2. Architecture decision and security rationale (Worker streaming vs alternatives).
3. File-by-file change summary and exact `package.json` command.
4. Required manual Cloudflare setup: bucket name/binding, Worker deployment, secret, endpoint, optional domain; never fabricate IDs or credentials.
5. Tested end-to-end steps: `media:prepare` → `media:upload` → `media:ingest` → `content:validate` → `build`.
6. Proof/limitations of remote content verification, including what checksums are *actually* validated.
7. Regression tests, failure scenarios and clear operator recovery steps.
8. Update `docs/architecture/media-pipeline.md` with verified behavior **only after implementation**; update `docs/README.md` and this proposal's status; move/mark proposal completed according to the established lifecycle, preserving history.

**Definition of done:** A prepared batch can be uploaded to R2 with one local command; uploaded objects have the exact manifest keys and verified contents; the resulting receipt passes the existing `media:ingest` validation without weakening security; repeating/resuming the upload does not cause duplicates; after ingestion images appear in the matched Journey's All photography collection while manual editorial curation remains untouched.

## 14. Official references (recheck at implementation time)

- [Cloudflare R2 — Upload objects](https://developers.cloudflare.com/r2/objects/upload-objects/)
- [Cloudflare R2 — Workers bucket bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- [Cloudflare R2 — Multipart uploads from Workers](https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/)
- [Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare Workers — Platform/request-body limits](https://developers.cloudflare.com/workers/platform/limits/)

## 15. One-paragraph instruction for Codex

> Audit the existing `media:prepare` manifest, `media:ingest` receipt validation, canonical Media/Journey model and Cloudflare setup. Add a secure upload-only Cloudflare Worker with an R2 binding and a local `media:upload` command. The CLI must accept an existing prepared package, preserve every R2 key and stable asset identity, validate local bytes, upload with bounded concurrency/retries, reject conflicting overwrites, remotely verify uploaded objects and atomically create an ingestion-compatible receipt. Do not publish assets from filenames or R2 scans. Preserve `media:ingest`'s idempotency, explicit revision monotonicity and rollback, and keep Journey All photography automatic without disrupting curated galleries. Add tests, an operator runbook, Cloudflare setup instructions, and update the documentation index and architecture only when the behavior is verified. Explain if direct S3 upload is materially simpler for this single trusted publishing machine before finalizing the Worker approach.
