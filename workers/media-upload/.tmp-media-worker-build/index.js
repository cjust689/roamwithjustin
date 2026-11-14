var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.mjs
var idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var checksumPattern = /^[a-f0-9]{64}$/;
var allowedMimeTypes = /* @__PURE__ */ new Set(["image/jpeg", "image/png"]);
var defaultPrefix = "images/";
var defaultMaximumBytes = 25 * 1024 * 1024;
function jsonResponse(value, status = 200, requestId = null) {
  const headers = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8"
  };
  if (requestId) headers["x-request-id"] = requestId;
  return new Response(JSON.stringify(value), { status, headers });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(status, code, message, requestId) {
  return jsonResponse({ error: code, message, requestId }, status, requestId);
}
__name(errorResponse, "errorResponse");
function bytesToHex(value) {
  if (!value) return null;
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(bytesToHex, "bytesToHex");
function hexToArrayBuffer(value) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes.buffer;
}
__name(hexToArrayBuffer, "hexToArrayBuffer");
async function tokensMatch(actual, expected) {
  if (!actual || !expected) return false;
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected))
  ]);
  const left = new Uint8Array(actualHash);
  const right = new Uint8Array(expectedHash);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0;
}
__name(tokensMatch, "tokensMatch");
function parsePositiveInteger(value) {
  if (!/^\d+$/.test(value || "")) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
__name(parsePositiveInteger, "parsePositiveInteger");
function normalizedPrefix(value) {
  const prefix = String(value || defaultPrefix).replace(/^\/+/, "");
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}
__name(normalizedPrefix, "normalizedPrefix");
function safeKey(key, allowedPrefix) {
  if (!key || !key.startsWith(allowedPrefix) || key.startsWith("/") || key.includes("\\") || /[\u0000-\u001f]/.test(key)) {
    return false;
  }
  return !key.split("/").some((part) => !part || part === "." || part === "..");
}
__name(safeKey, "safeKey");
function decodeObjectKey(pathname) {
  const routePrefix = "/v1/objects/";
  if (!pathname.startsWith(routePrefix)) return null;
  const encodedSegments = pathname.slice(routePrefix.length).split("/");
  if (!encodedSegments.length || encodedSegments.some((segment) => !segment)) {
    return null;
  }
  try {
    const segments = encodedSegments.map((segment) => decodeURIComponent(segment));
    if (segments.some((segment) => segment.includes("/") || segment.includes("\\"))) {
      return null;
    }
    return segments.join("/");
  } catch {
    return null;
  }
}
__name(decodeObjectKey, "decodeObjectKey");
function storedSha256(object) {
  return bytesToHex(object?.checksums?.sha256);
}
__name(storedSha256, "storedSha256");
function storedObjectMatches(object, expected) {
  return Boolean(
    object && object.size === expected.byteSize && storedSha256(object) === expected.sha256 && object.httpMetadata?.contentType === expected.mimeType
  );
}
__name(storedObjectMatches, "storedObjectMatches");
function objectResult(outcome, object, expected, requestId) {
  return {
    schemaVersion: 1,
    outcome,
    key: expected.key,
    byteSize: object.size,
    mimeType: expected.mimeType,
    sha256: expected.sha256,
    etag: object.etag,
    version: object.version || null,
    digestVerified: true,
    requestId
  };
}
__name(objectResult, "objectResult");
async function handleRequest(request, env) {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    return jsonResponse(
      { service: "roamwithjustin-media-upload", status: "ok" },
      200,
      requestId
    );
  }
  if (!env?.MEDIA_BUCKET || !env?.MEDIA_UPLOAD_TOKEN) {
    return errorResponse(
      500,
      "worker_not_configured",
      "Required Worker bindings are unavailable.",
      requestId
    );
  }
  const authorization = request.headers.get("authorization") || "";
  const suppliedToken = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!await tokensMatch(suppliedToken, env.MEDIA_UPLOAD_TOKEN)) {
    return errorResponse(
      401,
      "unauthorized",
      "Valid upload authorization is required.",
      requestId
    );
  }
  const key = decodeObjectKey(url.pathname);
  if (request.method !== "PUT" || !key) {
    return errorResponse(
      404,
      "route_not_found",
      "Only the object upload route is available.",
      requestId
    );
  }
  const prefix = normalizedPrefix(env.ALLOWED_R2_PREFIX);
  if (!safeKey(key, prefix)) {
    return errorResponse(
      422,
      "invalid_object_key",
      "The requested object key is outside the allowed media prefix.",
      requestId
    );
  }
  const mimeType = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  const sha256 = (request.headers.get("x-media-sha256") || "").toLowerCase();
  const batchId = request.headers.get("x-media-batch-id") || "";
  const declaredSize = parsePositiveInteger(
    request.headers.get("x-media-byte-size")
  );
  const contentLength = parsePositiveInteger(
    request.headers.get("content-length")
  );
  const maximumBytes = parsePositiveInteger(String(env.MAX_UPLOAD_BYTES || "")) || defaultMaximumBytes;
  if (!allowedMimeTypes.has(mimeType)) {
    return errorResponse(
      415,
      "unsupported_media_type",
      "Only prepared JPEG and PNG images are accepted.",
      requestId
    );
  }
  if (!checksumPattern.test(sha256)) {
    return errorResponse(
      422,
      "invalid_checksum",
      "A lowercase hexadecimal SHA-256 digest is required.",
      requestId
    );
  }
  if (!idPattern.test(batchId)) {
    return errorResponse(
      422,
      "invalid_batch",
      "A valid media batch ID is required.",
      requestId
    );
  }
  if (!declaredSize || !contentLength || declaredSize !== contentLength) {
    return errorResponse(
      422,
      "invalid_content_length",
      "Content-Length must match the declared manifest byte size.",
      requestId
    );
  }
  if (declaredSize > maximumBytes) {
    return errorResponse(
      413,
      "object_too_large",
      `Prepared object exceeds the configured ${maximumBytes}-byte limit.`,
      requestId
    );
  }
  if (!request.body) {
    return errorResponse(
      422,
      "missing_body",
      "The prepared object body is required.",
      requestId
    );
  }
  const expected = { key, byteSize: declaredSize, mimeType, sha256 };
  const existing = await env.MEDIA_BUCKET.head(key);
  if (existing) {
    if (storedObjectMatches(existing, expected)) {
      return jsonResponse(
        objectResult("already_present", existing, expected, requestId),
        200,
        requestId
      );
    }
    return errorResponse(
      409,
      "object_conflict",
      "An object already exists at this immutable key with different verified metadata.",
      requestId
    );
  }
  let uploaded;
  try {
    uploaded = await env.MEDIA_BUCKET.put(key, request.body, {
      onlyIf: new Headers({ "if-none-match": "*" }),
      httpMetadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000, immutable"
      },
      customMetadata: {
        batchId,
        sha256
      },
      sha256: hexToArrayBuffer(sha256)
    });
  } catch (error) {
    const checksumFailure = /checksum|digest|hash/i.test(error?.message || "");
    return errorResponse(
      checksumFailure ? 422 : 502,
      checksumFailure ? "checksum_mismatch" : "r2_upload_failed",
      checksumFailure ? "R2 rejected the object because its bytes did not match the manifest digest." : "R2 did not accept the prepared object.",
      requestId
    );
  }
  if (!uploaded) {
    const racedObject = await env.MEDIA_BUCKET.head(key);
    if (storedObjectMatches(racedObject, expected)) {
      return jsonResponse(
        objectResult("already_present", racedObject, expected, requestId),
        200,
        requestId
      );
    }
    return errorResponse(
      409,
      "object_conflict",
      "A competing upload claimed this immutable object key.",
      requestId
    );
  }
  const stored = await env.MEDIA_BUCKET.head(key);
  if (!storedObjectMatches(stored, expected)) {
    return errorResponse(
      502,
      "remote_verification_failed",
      "The stored R2 object did not match the manifest after upload.",
      requestId
    );
  }
  return jsonResponse(
    objectResult("uploaded", stored, expected, requestId),
    201,
    requestId
  );
}
__name(handleRequest, "handleRequest");
var index_default = {
  fetch: handleRequest
};
export {
  index_default as default,
  handleRequest
};
//# sourceMappingURL=index.js.map
