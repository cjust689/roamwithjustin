import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const folderMimeType = "application/vnd.google-apps.folder"
const supportedMimeTypes = new Set(["image/jpeg", "image/png", "video/mp4"])
const fileIdPattern = /^[A-Za-z0-9_-]{10,}$/

function createDriveApi(auth) {
  if (!auth?.request) {
    throw new Error("Authenticated Google client is required for Drive reads")
  }
  return {
    files: {
      get: request => {
        const url = new URL(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(request.fileId)}`
        )
        url.searchParams.set(
          "supportsAllDrives",
          String(request.supportsAllDrives)
        )
        url.searchParams.set("fields", request.fields)
        return auth.request({ method: "GET", url: url.toString() })
      },
      getMedia: request => {
        const url = new URL(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(request.fileId)}`
        )
        url.searchParams.set("supportsAllDrives", "true")
        url.searchParams.set("alt", "media")
        return auth.request({
          method: "GET",
          url: url.toString(),
          responseType: "arraybuffer",
        })
      },
      list: request => {
        const url = new URL("https://www.googleapis.com/drive/v3/files")
        for (const [key, value] of Object.entries(request)) {
          if (value !== undefined) url.searchParams.set(key, String(value))
        }
        return auth.request({ method: "GET", url: url.toString() })
      },
    },
  }
}

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value).sort())
}

export function driveInventoryFingerprint(inventory) {
  const digest = crypto.createHash("sha256")
  digest.update(String(inventory?.folder?.id || ""))
  for (const file of inventory?.files || []) {
    digest.update("\0")
    digest.update(
      stableJson({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        byteSize: file.byteSize,
        modifiedTime: file.modifiedTime,
        version: file.version,
        md5Checksum: file.md5Checksum,
        sha1Checksum: file.sha1Checksum,
        sha256Checksum: file.sha256Checksum,
      })
    )
  }
  return digest.digest("hex")
}

function extensionFor(file) {
  if (file.mimeType === "image/jpeg") return ".jpg"
  if (file.mimeType === "image/png") return ".png"
  if (file.mimeType === "video/mp4") return ".mp4"
  throw new Error(`Unsupported Drive media type: ${file.mimeType}`)
}

function bufferFromResponse(data) {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  }
  throw new Error("Google Drive download returned an unsupported response body")
}

export async function snapshotDriveFolder({
  auth,
  inventory,
  outputDirectory,
  driveApi = null,
}) {
  if (!inventory?.folder?.id || !Array.isArray(inventory.files)) {
    throw new Error("A verified Drive folder inventory is required")
  }
  if (!inventory.files.length) throw new Error("Drive folder contains no files")
  const unsupported = inventory.files.filter(file => !file.supported)
  if (unsupported.length) {
    throw new Error(
      `Drive folder contains unsupported file(s): ${unsupported.map(file => file.name).join(", ")}`
    )
  }
  const blocked = inventory.files.filter(file => !file.canDownload)
  if (blocked.length) {
    throw new Error(
      `Drive folder contains file(s) that cannot be downloaded: ${blocked.map(file => file.name).join(", ")}`
    )
  }
  const target = path.resolve(outputDirectory)
  if (fs.existsSync(target)) {
    throw new Error(`Drive snapshot already exists: ${target}`)
  }
  const parent = path.dirname(target)
  await fs.promises.mkdir(parent, { recursive: true })
  const staging = await fs.promises.mkdtemp(
    path.join(parent, `${path.basename(target)}-staging-`)
  )
  const api = driveApi || createDriveApi(auth)
  const counters = { image: 0, video: 0 }
  const records = []
  try {
    await fs.promises.mkdir(path.join(staging, "images"), { recursive: true })
    await fs.promises.mkdir(path.join(staging, "videos"), { recursive: true })
    for (const file of inventory.files) {
      const kind = file.kind
      counters[kind] += 1
      const localFilename = `${String(counters[kind]).padStart(3, "0")}${extensionFor(file)}`
      const relativePath = `${kind === "image" ? "images" : "videos"}/${localFilename}`
      const response = await api.files.getMedia({ fileId: file.id })
      const bytes = bufferFromResponse(response.data)
      const sha256 = crypto.createHash("sha256").update(bytes).digest("hex")
      if (file.byteSize !== null && Number(file.byteSize) !== bytes.length) {
        throw new Error(`Drive file size changed during download: ${file.name}`)
      }
      if (file.sha256Checksum && file.sha256Checksum !== sha256) {
        throw new Error(`Drive file checksum changed during download: ${file.name}`)
      }
      await fs.promises.writeFile(path.join(staging, relativePath), bytes, {
        flag: "wx",
      })
      records.push({
        id: file.id,
        sourceName: file.name,
        mimeType: file.mimeType,
        byteSize: bytes.length,
        version: file.version,
        modifiedTime: file.modifiedTime,
        sha256,
        relativePath,
      })
    }
    const snapshot = {
      schemaVersion: 1,
      folder: inventory.folder,
      inventoryFingerprint: driveInventoryFingerprint(inventory),
      files: records,
      counts: { images: counters.image, videos: counters.video },
    }
    await fs.promises.writeFile(
      path.join(staging, "drive-snapshot.json"),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      { flag: "wx" }
    )
    await fs.promises.rename(staging, target)
    return snapshot
  } catch (error) {
    await fs.promises.rm(staging, { recursive: true, force: true })
    throw error
  }
}

function requireFileId(value) {
  if (!fileIdPattern.test(value || "")) {
    throw new Error("Drive folder link does not contain a valid folder ID")
  }
  return value
}

export function parseDriveFolderId(value) {
  const input = String(value || "").trim()
  let url
  try {
    url = new URL(input)
  } catch {
    throw new Error("Drive folder must be an approved Google Drive URL")
  }

  if (url.protocol !== "https:" || url.hostname !== "drive.google.com") {
    throw new Error("Drive folder URL must use https://drive.google.com")
  }

  const folderMatch = url.pathname.match(
    /^\/drive\/(?:u\/\d+\/)?folders\/([^/]+)\/?$/
  )
  if (folderMatch) return requireFileId(folderMatch[1])
  if (url.pathname === "/open") return requireFileId(url.searchParams.get("id"))

  throw new Error("Unsupported Google Drive folder URL form")
}

export async function inventoryDriveFolder({
  auth,
  folderUrl,
  driveApi = null,
}) {
  const folderId = parseDriveFolderId(folderUrl)
  const api = driveApi || createDriveApi(auth)
  const folderResponse = await api.files.get({
    fileId: folderId,
    supportsAllDrives: true,
    fields: "id,name,mimeType,capabilities(canListChildren)",
  })
  const folder = folderResponse.data || {}
  if (folder.mimeType !== folderMimeType) {
    throw new Error("Drive link resolved to a file instead of a folder")
  }
  if (folder.capabilities?.canListChildren === false) {
    throw new Error("Authorized Google account cannot list this Drive folder")
  }

  const files = []
  let pageToken = null
  do {
    const response = await api.files.list({
      q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 1000,
      pageToken: pageToken || undefined,
      fields:
        "nextPageToken,files(id,name,mimeType,size,modifiedTime,version,md5Checksum,sha1Checksum,sha256Checksum,capabilities(canDownload),shortcutDetails)",
    })
    files.push(...(response.data?.files || []))
    pageToken = response.data?.nextPageToken || null
  } while (pageToken)

  const inventory = files
    .map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      byteSize: file.size || null,
      modifiedTime: file.modifiedTime || null,
      version: file.version || null,
      md5Checksum: file.md5Checksum || null,
      sha1Checksum: file.sha1Checksum || null,
      sha256Checksum: file.sha256Checksum || null,
      canDownload: file.capabilities?.canDownload !== false,
      supported: supportedMimeTypes.has(file.mimeType),
      kind: file.mimeType?.startsWith("image/")
        ? "image"
        : file.mimeType === "video/mp4"
          ? "video"
          : "unsupported",
    }))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, undefined, { numeric: true }) ||
        left.id.localeCompare(right.id)
    )

  return {
    folder: {
      id: folder.id,
      name: folder.name,
    },
    files: inventory,
    summary: {
      total: inventory.length,
      supported: inventory.filter(file => file.supported).length,
      unsupported: inventory.filter(file => !file.supported).length,
      images: inventory.filter(file => file.kind === "image").length,
      videos: inventory.filter(file => file.kind === "video").length,
      blockedDownloads: inventory.filter(
        file => file.supported && !file.canDownload
      ).length,
    },
  }
}
