import assert from "node:assert/strict"
import path from "node:path"
import {
  DRIVE_FILE_SCOPE,
  DRIVE_READONLY_SCOPE,
  SHEETS_READONLY_SCOPE,
  resolveGoogleConfiguration,
} from "./lib/editorial-google-auth.mjs"
import {
  inventoryDriveFolder,
  parseDriveFolderId,
} from "./lib/editorial-google-drive.mjs"
import {
  normalizeSheetValues,
  readPostsSheet,
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
