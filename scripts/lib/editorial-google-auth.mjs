import fs from "node:fs"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { randomBytes } from "node:crypto"
import { spawn } from "node:child_process"
import { OAuth2Client } from "google-auth-library"

export const SHEETS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets.readonly"
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"
export const DRIVE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly"

function normalizeScopes(scopes) {
  return [...new Set(scopes)].sort()
}

function isInside(candidate, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate))
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

export function resolveGoogleConfiguration({
  options = {},
  environment = process.env,
  homeDirectory = os.homedir(),
  projectRoot = process.cwd(),
}) {
  const rawOauthClientPath = String(
    options.oauthClientPath ||
      environment.EDITORIAL_GOOGLE_OAUTH_CLIENT_PATH ||
      ""
  ).trim()
  const oauthClientPath = rawOauthClientPath
    ? path.resolve(rawOauthClientPath)
    : ""
  const tokenPath = path.resolve(
    options.tokenPath ||
      environment.EDITORIAL_GOOGLE_TOKEN_PATH ||
      path.join(
        homeDirectory,
        ".roam-with-justin",
        "editorial-google-token.json"
      )
  )
  const spreadsheetId = String(
    options.spreadsheetId || environment.EDITORIAL_GOOGLE_SPREADSHEET_ID || ""
  ).trim()
  const postsRange = String(
    options.postsRange || environment.EDITORIAL_GOOGLE_POSTS_RANGE || "Posts"
  ).trim()
  const requestedDriveScope = String(
    options.driveScope || environment.EDITORIAL_GOOGLE_DRIVE_SCOPE || "selected"
  )
    .trim()
    .toLowerCase()
  const allowRestrictedScope =
    options.allowRestrictedDriveScope === true ||
    String(environment.EDITORIAL_GOOGLE_ALLOW_RESTRICTED_DRIVE_SCOPE || "")
      .trim()
      .toLowerCase() === "true"

  if (!oauthClientPath) {
    throw new Error(
      "Google OAuth client path is required through --oauth-client or EDITORIAL_GOOGLE_OAUTH_CLIENT_PATH"
    )
  }
  if (!spreadsheetId) {
    throw new Error(
      "Google spreadsheet ID is required through --spreadsheet-id or EDITORIAL_GOOGLE_SPREADSHEET_ID"
    )
  }
  if (!postsRange) throw new Error("Google Posts range cannot be empty")
  if (isInside(oauthClientPath, projectRoot)) {
    throw new Error(
      "Google OAuth client credentials must remain outside the repository"
    )
  }
  if (isInside(tokenPath, projectRoot)) {
    throw new Error(
      "Google refresh-token storage must remain outside the repository"
    )
  }

  let driveScope
  if (["selected", "drive.file"].includes(requestedDriveScope)) {
    driveScope = DRIVE_FILE_SCOPE
  } else if (["readonly", "drive.readonly"].includes(requestedDriveScope)) {
    if (!allowRestrictedScope) {
      throw new Error(
        "drive.readonly is a restricted scope; pass --allow-restricted-drive-scope only after explicit owner approval"
      )
    }
    driveScope = DRIVE_READONLY_SCOPE
  } else {
    throw new Error(
      `Unsupported Drive scope mode "${requestedDriveScope}"; use selected or readonly`
    )
  }

  return {
    oauthClientPath,
    tokenPath,
    spreadsheetId,
    postsRange,
    scopes: normalizeScopes([SHEETS_READONLY_SCOPE, driveScope]),
    driveScope,
  }
}

async function readJson(file) {
  return JSON.parse(await fs.promises.readFile(file, "utf8"))
}

async function readInstalledOAuthClient(oauthClientPath) {
  const keys = await readJson(oauthClientPath)
  const installed = keys.installed
  if (!installed?.client_id || !installed?.client_secret) {
    throw new Error(
      "Google OAuth client file must contain installed desktop-app credentials"
    )
  }
  return installed
}

async function loadSavedClient(tokenPath, scopes) {
  try {
    const stored = await readJson(tokenPath)
    if (
      JSON.stringify(normalizeScopes(stored.scopes || [])) !==
      JSON.stringify(normalizeScopes(scopes))
    ) {
      throw new Error(
        "Saved Google token scopes do not match this read-only request; reauthenticate deliberately"
      )
    }
    if (!stored.client_id || !stored.client_secret || !stored.refresh_token) {
      throw new Error("Saved Google token file is incomplete")
    }
    const client = new OAuth2Client({
      clientId: stored.client_id,
      clientSecret: stored.client_secret,
    })
    client.setCredentials({ refresh_token: stored.refresh_token })
    return client
  } catch (error) {
    if (error.code === "ENOENT") return null
    throw error
  }
}

async function archiveSavedClient(tokenPath) {
  try {
    await fs.promises.access(tokenPath, fs.constants.F_OK)
  } catch (error) {
    if (error.code === "ENOENT") return null
    throw error
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const archivePath = `${tokenPath}.backup-${timestamp}`
  await fs.promises.rename(tokenPath, archivePath)
  return archivePath
}

async function saveClientCredentials({
  client,
  oauthClientPath,
  tokenPath,
  scopes,
}) {
  const key = await readInstalledOAuthClient(oauthClientPath)
  if (!client.credentials?.refresh_token) {
    throw new Error(
      "Google authorization returned no refresh token; revoke the prior grant if a fresh offline grant is required"
    )
  }

  await fs.promises.mkdir(path.dirname(tokenPath), {
    recursive: true,
    mode: 0o700,
  })
  const token = {
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
    scopes: normalizeScopes(scopes),
  }
  const temporaryPath = `${tokenPath}.${process.pid}.tmp`
  await fs.promises.writeFile(
    temporaryPath,
    `${JSON.stringify(token, null, 2)}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    }
  )
  await fs.promises.rename(temporaryPath, tokenPath)
}

function openAuthorizationUrl(authorizationUrl) {
  console.log(`Google account chooser:\n${authorizationUrl}`)
  const platformCommands = {
    win32: ["rundll32", ["url.dll,FileProtocolHandler", authorizationUrl]],
    darwin: ["open", [authorizationUrl]],
    linux: ["xdg-open", [authorizationUrl]],
  }
  const command = platformCommands[process.platform]
  if (!command) return

  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  })
  child.once("error", () => {})
  child.unref()
}

export async function authenticateWithLoopback({
  oauthClientPath,
  scopes,
  launchAuthorization = openAuthorizationUrl,
  timeoutMilliseconds = 5 * 60 * 1000,
}) {
  const installed = await readInstalledOAuthClient(oauthClientPath)
  const client = new OAuth2Client({
    clientId: installed.client_id,
    clientSecret: installed.client_secret,
  })
  const state = randomBytes(32).toString("hex")
  const { codeVerifier, codeChallenge } =
    await client.generateCodeVerifierAsync()

  return new Promise((resolve, reject) => {
    let settled = false
    let timeout

    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      server.close(() => {
        if (error) reject(error)
        else resolve(value)
      })
    }

    const server = http.createServer(async (request, response) => {
      try {
        const requestUrl = new URL(request.url || "/", "http://127.0.0.1")
        if (requestUrl.pathname !== "/oauth2callback") {
          response.writeHead(404, { "Content-Type": "text/plain" })
          response.end("Invalid callback URL.")
          return
        }
        if (requestUrl.searchParams.get("state") !== state) {
          response.writeHead(400, { "Content-Type": "text/plain" })
          response.end("Authorization state did not match.")
          finish(new Error("Google authorization state did not match"))
          return
        }
        const authorizationError = requestUrl.searchParams.get("error")
        if (authorizationError) {
          response.writeHead(400, { "Content-Type": "text/plain" })
          response.end("Google authorization was not granted.")
          finish(
            new Error(`Google authorization failed: ${authorizationError}`)
          )
          return
        }
        const code = requestUrl.searchParams.get("code")
        if (!code) {
          response.writeHead(400, { "Content-Type": "text/plain" })
          response.end("No authorization code was provided.")
          finish(new Error("Google returned no authorization code"))
          return
        }

        const address = server.address()
        if (!address || typeof address === "string") {
          throw new Error("Google authorization callback has no local port")
        }
        const redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`
        const { tokens } = await client.getToken({
          code,
          codeVerifier,
          redirect_uri: redirectUri,
        })
        client.setCredentials(tokens)
        response.writeHead(200, { "Content-Type": "text/plain" })
        response.end("Authorization complete. You can return to the terminal.")
        finish(null, client)
      } catch (error) {
        if (!response.headersSent) {
          response.writeHead(500, { "Content-Type": "text/plain" })
        }
        response.end("Google authorization failed.")
        finish(error)
      }
    })

    server.once("error", error => finish(error))
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        finish(new Error("Could not start the local Google OAuth callback"))
        return
      }
      const redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`
      client.redirectUri = redirectUri
      const authorizationUrl = client.generateAuthUrl({
        access_type: "offline",
        prompt: "select_account consent",
        scope: scopes,
        state,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        redirect_uri: redirectUri,
      })
      try {
        launchAuthorization(authorizationUrl)
      } catch (error) {
        finish(error)
      }
    })

    timeout = setTimeout(() => {
      finish(new Error("Google authorization timed out after five minutes"))
    }, timeoutMilliseconds)
    timeout.unref?.()
  })
}

export async function authorizeGoogleReadOnly(
  configuration,
  {
    interactiveAuthorize = authenticateWithLoopback,
    forceReauthorize = false,
  } = {}
) {
  if (forceReauthorize) {
    await archiveSavedClient(configuration.tokenPath)
  } else {
    const saved = await loadSavedClient(
      configuration.tokenPath,
      configuration.scopes
    )
    if (saved) return saved
  }

  const client = await interactiveAuthorize({
    scopes: configuration.scopes,
    oauthClientPath: configuration.oauthClientPath,
  })
  await saveClientCredentials({
    client,
    oauthClientPath: configuration.oauthClientPath,
    tokenPath: configuration.tokenPath,
    scopes: configuration.scopes,
  })
  return client
}
