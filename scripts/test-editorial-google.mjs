import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  DRIVE_FILE_SCOPE,
  DRIVE_READONLY_SCOPE,
  SHEETS_READONLY_SCOPE,
  SHEETS_SCOPE,
  resolveGoogleConfiguration,
  savedScopesSatisfy,
} from "./lib/editorial-google-auth.mjs"
import {
  driveInventoryFingerprint,
  inventoryDriveFolder,
  parseDriveFolderId,
  snapshotDriveFolder,
} from "./lib/editorial-google-drive.mjs"
import {
  normalizeSheetValues,
  readPostsSheet,
  resolveSheetTitle,
} from "./lib/editorial-google-sheets.mjs"

const projectRoot = process.cwd()
const outsideDirectory = path.resolve(
  projectRoot,
  "..",
  ".editorial-google-test"
)
const configuration = resolveGoogleConfiguration({
  options: {
    oauthClientPath: path.join(outsideDirectory, "oauth-client.json"),
    tokenPath: path.join(outsideDirectory, "token.json"),
    spreadsheetId: "sheet-id",
    postsRange: "Posts",
    driveScope: "selected",
  },
  environment: {},
  homeDirectory: outsideDirectory,
  projectRoot,
})
assert.deepEqual(configuration.scopes, [
  DRIVE_FILE_SCOPE,
  SHEETS_READONLY_SCOPE,
])

const writeConfiguration = resolveGoogleConfiguration({
  options: {
    oauthClientPath: path.join(outsideDirectory, "oauth-client.json"),
    tokenPath: path.join(outsideDirectory, "write-token.json"),
    spreadsheetId: "sheet-id",
    sheetsAccess: "write",
  },
  environment: {},
  homeDirectory: outsideDirectory,
  projectRoot,
})
assert.equal(writeConfiguration.sheetsScope, SHEETS_SCOPE)
assert.deepEqual(writeConfiguration.scopes, [DRIVE_FILE_SCOPE, SHEETS_SCOPE])
assert.equal(
  savedScopesSatisfy(
    [DRIVE_FILE_SCOPE, SHEETS_SCOPE],
    [DRIVE_FILE_SCOPE, SHEETS_READONLY_SCOPE]
  ),
  true
)
assert.equal(
  savedScopesSatisfy(
    [DRIVE_FILE_SCOPE, SHEETS_READONLY_SCOPE],
    [DRIVE_FILE_SCOPE, SHEETS_SCOPE]
  ),
  false
)

assert.throws(
  () =>
    resolveGoogleConfiguration({
      options: { spreadsheetId: "sheet-id" },
      environment: {},
      homeDirectory: outsideDirectory,
      projectRoot,
    }),
  /OAuth client path is required/
)

const resolvedSheetTitle = await resolveSheetTitle({
  auth: null,
  spreadsheetId: "sheet-id",
  sheetId: "87724606",
  sheetsApi: {
    spreadsheets: {
      get: async request => {
        assert.equal(request.spreadsheetId, "sheet-id")
        return {
          data: {
            sheets: [
              {
                properties: {
                  sheetId: 87724606,
                  title: "Content Calendar",
                  index: 0,
                  hidden: false,
                },
              },
            ],
          },
        }
      },
    },
  },
})
assert.equal(resolvedSheetTitle, "Content Calendar")
await assert.rejects(
  () =>
    resolveSheetTitle({
      auth: null,
      spreadsheetId: "sheet-id",
      sheetId: "not-a-number",
    }),
  /non-negative integer/
)

assert.throws(
  () =>
    resolveGoogleConfiguration({
      options: {
        oauthClientPath: path.join(outsideDirectory, "oauth-client.json"),
        tokenPath: path.join(outsideDirectory, "token.json"),
        spreadsheetId: "sheet-id",
        driveScope: "readonly",
      },
      environment: {},
      homeDirectory: outsideDirectory,
      projectRoot,
    }),
  /restricted scope/
)

const readonlyConfiguration = resolveGoogleConfiguration({
  options: {
    oauthClientPath: path.join(outsideDirectory, "oauth-client.json"),
    tokenPath: path.join(outsideDirectory, "token.json"),
    spreadsheetId: "sheet-id",
    driveScope: "readonly",
    allowRestrictedDriveScope: true,
  },
  environment: {},
  homeDirectory: outsideDirectory,
  projectRoot,
})
assert.equal(readonlyConfiguration.driveScope, DRIVE_READONLY_SCOPE)

assert.throws(
  () =>
    resolveGoogleConfiguration({
      options: {
        oauthClientPath: path.join(projectRoot, "oauth-client.json"),
        spreadsheetId: "sheet-id",
      },
      environment: {},
      homeDirectory: outsideDirectory,
      projectRoot,
    }),
  /outside the repository/
)

assert.throws(
  () =>
    resolveGoogleConfiguration({
      options: {
        oauthClientPath: path.join(outsideDirectory, "oauth-client.json"),
        tokenPath: path.join(projectRoot, "token.json"),
        spreadsheetId: "sheet-id",
      },
      environment: {},
      homeDirectory: outsideDirectory,
      projectRoot,
    }),
  /refresh-token storage must remain outside the repository/
)

assert.equal(
  parseDriveFolderId(
    "https://drive.google.com/drive/folders/1Abcdefghij_Example-123"
  ),
  "1Abcdefghij_Example-123"
)
assert.equal(
  parseDriveFolderId(
    "https://drive.google.com/drive/u/0/folders/1Abcdefghij_Example-123"
  ),
  "1Abcdefghij_Example-123"
)
assert.throws(
  () => parseDriveFolderId("https://example.com/folders/1Abcdefghij"),
  /drive.google.com/
)

const sheetCalls = []
const sheet = await readPostsSheet({
  auth: null,
  spreadsheetId: "sheet-id",
  postsRange: "Posts",
  sheetsApi: {
    spreadsheets: {
      values: {
        batchGet: async request => {
          sheetCalls.push(request)
          return {
            data: {
              valueRanges: [
                {
                  values: [
                    ["Location", "Account", "Atlas Journey"],
                    ["Split", "Roam", "Europe (2026)"],
                  ],
                },
              ],
            },
          }
        },
      },
    },
  },
})
assert.equal(sheetCalls.length, 1)
assert.deepEqual(sheetCalls[0].ranges, ["'Posts'!A:ZZ"])
assert.equal(sheet.rows[0].Location, "Split")
assert.throws(
  () => normalizeSheetValues([["Location", "Location"]]),
  /duplicate header/
)

const sheetRestCalls = []
await readPostsSheet({
  auth: {
    request: async request => {
      sheetRestCalls.push(request)
      return { data: { valueRanges: [{ values: [["Location"]] }] } }
    },
  },
  spreadsheetId: "sheet/id",
  postsRange: "Posts 2026",
})
assert.equal(sheetRestCalls[0].method, "GET")
const sheetRestUrl = new URL(sheetRestCalls[0].url)
assert.equal(
  sheetRestUrl.pathname,
  "/v4/spreadsheets/sheet%2Fid/values:batchGet"
)
assert.equal(sheetRestUrl.searchParams.get("ranges"), "'Posts 2026'!A:ZZ")

const driveCalls = { get: [], list: [] }
const drive = await inventoryDriveFolder({
  auth: null,
  folderUrl: "https://drive.google.com/drive/folders/1Abcdefghij_Example-123",
  driveApi: {
    files: {
      get: async request => {
        driveCalls.get.push(request)
        return {
          data: {
            id: request.fileId,
            name: "Reviewed post",
            mimeType: "application/vnd.google-apps.folder",
            capabilities: { canListChildren: true },
          },
        }
      },
      list: async request => {
        driveCalls.list.push(request)
        if (!request.pageToken) {
          return {
            data: {
              nextPageToken: "page-2",
              files: [
                {
                  id: "file-video-0001",
                  name: "02-clip.mp4",
                  mimeType: "video/mp4",
                  size: "200",
                  capabilities: { canDownload: true },
                },
              ],
            },
          }
        }
        return {
          data: {
            files: [
              {
                id: "file-image-0001",
                name: "01-photo.jpg",
                mimeType: "image/jpeg",
                size: "100",
                sha256Checksum: "abc",
                capabilities: { canDownload: true },
              },
              {
                id: "file-document-1",
                name: "notes.txt",
                mimeType: "text/plain",
                size: "10",
                capabilities: { canDownload: true },
              },
            ],
          },
        }
      },
    },
  },
})
assert.equal(driveCalls.get.length, 1)
assert.equal(driveCalls.list.length, 2)
assert.deepEqual(
  drive.files.map(file => file.name),
  ["01-photo.jpg", "02-clip.mp4", "notes.txt"]
)
assert.deepEqual(drive.summary, {
  total: 3,
  supported: 2,
  unsupported: 1,
  images: 1,
  videos: 1,
  blockedDownloads: 0,
})
assert.equal(driveInventoryFingerprint(drive).length, 64)

const snapshotRoot = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-drive-"))
try {
  const imageBytes = Buffer.from("image-bytes")
  const videoBytes = Buffer.from("video-bytes")
  const snapshot = await snapshotDriveFolder({
    auth: null,
    inventory: {
      folder: { id: "folder-1", name: "Reviewed" },
      files: [
        {
          id: "image-1",
          name: "photo.jpg",
          mimeType: "image/jpeg",
          byteSize: String(imageBytes.length),
          modifiedTime: "2026-01-01T00:00:00Z",
          version: "1",
          sha256Checksum: crypto
            .createHash("sha256")
            .update(imageBytes)
            .digest("hex"),
          canDownload: true,
          supported: true,
          kind: "image",
        },
        {
          id: "video-1",
          name: "clip.mp4",
          mimeType: "video/mp4",
          byteSize: String(videoBytes.length),
          modifiedTime: "2026-01-01T00:00:00Z",
          version: "1",
          sha256Checksum: null,
          canDownload: true,
          supported: true,
          kind: "video",
        },
      ],
    },
    outputDirectory: path.join(snapshotRoot, "snapshot"),
    driveApi: {
      files: {
        getMedia: async ({ fileId }) => ({
          data: fileId === "image-1" ? imageBytes : videoBytes,
        }),
      },
    },
  })
  assert.deepEqual(snapshot.counts, { images: 1, videos: 1 })
  assert.equal(
    fs.readFileSync(path.join(snapshotRoot, "snapshot", "images", "001.jpg"), "utf8"),
    "image-bytes"
  )
  await assert.rejects(
    () =>
      snapshotDriveFolder({
        auth: null,
        inventory: { folder: { id: "folder-1" }, files: [] },
        outputDirectory: path.join(snapshotRoot, "empty"),
      }),
    /contains no files/
  )
} finally {
  fs.rmSync(snapshotRoot, { recursive: true, force: true })
}

const driveRestCalls = []
await inventoryDriveFolder({
  auth: {
    request: async request => {
      driveRestCalls.push(request)
      const requestUrl = new URL(request.url)
      if (requestUrl.pathname.includes("/files/")) {
        return {
          data: {
            id: "1Abcdefghij_Example-123",
            name: "Reviewed post",
            mimeType: "application/vnd.google-apps.folder",
            capabilities: { canListChildren: true },
          },
        }
      }
      return { data: { files: [] } }
    },
  },
  folderUrl: "https://drive.google.com/drive/folders/1Abcdefghij_Example-123",
})
assert.equal(driveRestCalls.length, 2)
assert.match(driveRestCalls[0].url, /supportsAllDrives=true/)
const driveListUrl = new URL(driveRestCalls[1].url)
assert.equal(driveListUrl.searchParams.get("pageSize"), "1000")
assert.equal(
  driveListUrl.searchParams.get("q"),
  "'1Abcdefghij_Example-123' in parents and trashed = false"
)

console.log("Editorial Google client tests passed with mocked APIs.")
