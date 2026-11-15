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
