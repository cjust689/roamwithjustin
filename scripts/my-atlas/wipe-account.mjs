#!/usr/bin/env node

import { pathToFileURL } from "node:url"
import {
  deleteMyAtlasAccountWithRevisionRecovery,
  fetchMyAtlasProfile,
} from "../../src/features/my-atlas/api/client.mjs"

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/
const DEFAULT_API_BASE = "http://127.0.0.1:8787"

function usage() {
  return `Usage:
  npm run my-atlas:account:wipe -- --handle <handle>
  npm run my-atlas:account:wipe -- --all
  npm run my-atlas:account:wipe -- --all --apply --confirm "WIPE ALL USER MY ATLAS ACCOUNTS"
  npm run my-atlas:account:wipe -- --handle <handle> --apply --confirm "WIPE USER MY ATLAS @<handle>"

Options:
  --api-base <url>   My Atlas Worker base URL. Defaults to ${DEFAULT_API_BASE}
  --allow-remote     Permit an HTTPS API base outside the local computer
  --apply            Perform the deletion. Without this flag the command is a dry run
  --confirm <text>   Exact account specific confirmation required with --apply
  --help             Show this help

Set MY_ATLAS_WIPE_ACCESS_TOKEN in the process environment. The command never prints it.`
}

export function parseWipeArguments(argv) {
  const options = {
    apiBaseUrl: DEFAULT_API_BASE,
    allowRemote: false,
    apply: false,
    confirmation: "",
    handle: "",
    all: false,
    help: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--allow-remote") options.allowRemote = true
    else if (argument === "--all") options.all = true
    else if (argument === "--apply") options.apply = true
    else if (argument === "--help") options.help = true
    else if (["--api-base", "--confirm", "--handle"].includes(argument)) {
      const value = argv[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`)
      }
      index += 1
      if (argument === "--api-base") options.apiBaseUrl = value
      if (argument === "--confirm") options.confirmation = value
      if (argument === "--handle") options.handle = value
    } else {
      throw new Error(`Unknown option ${argument}.`)
    }
  }
  return Object.freeze(options)
}

export function validateWipeOptions(options) {
  if (options.help) return options
  if (options.all && options.handle) {
    throw new Error("Choose --all or --handle, not both.")
  }
  if (!options.all && !HANDLE_PATTERN.test(options.handle)) {
    throw new Error("Provide the exact My Atlas account handle with --handle.")
  }
  let apiUrl
  try {
    apiUrl = new URL(options.apiBaseUrl)
  } catch {
    throw new Error("The My Atlas API base URL is invalid.")
  }
  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"])
  const isLocal = localHosts.has(apiUrl.hostname)
  if (!isLocal && !options.allowRemote) {
    throw new Error(
      "A remote API requires --allow-remote. Review the target before retrying."
    )
  }
  if (!isLocal && apiUrl.protocol !== "https:") {
    throw new Error("A remote My Atlas API must use HTTPS.")
  }
  if (apiUrl.pathname !== "/" || apiUrl.search || apiUrl.hash) {
    throw new Error(
      "The API base URL cannot include a path, query, or fragment."
    )
  }
  if (
    options.apply &&
    options.confirmation !==
      (options.all
        ? "WIPE ALL USER MY ATLAS ACCOUNTS"
        : `WIPE USER MY ATLAS @${options.handle}`)
  ) {
    throw new Error(
      `Deletion requires --confirm "WIPE USER MY ATLAS @${options.handle}".`
    )
  }
  return Object.freeze({
    ...options,
    apiBaseUrl: apiUrl.origin,
  })
}

export async function runWipeAccount({
  options,
  accessToken,
  fetchImpl = fetch,
  log = console.log,
}) {
  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error(
      "Set MY_ATLAS_WIPE_ACCESS_TOKEN before running this command."
    )
  }
  if (options.all) {
    return runGlobalWipe({ options, accessToken, fetchImpl, log })
  }
  const profile = await fetchMyAtlasProfile({
    apiBaseUrl: options.apiBaseUrl,
    accessToken,
    fetchImpl,
  })
  if (profile.handle !== options.handle) {
    throw new Error(
      `The signed in account is @${profile.handle}, not @${options.handle}. Nothing was deleted.`
    )
  }

  log(`Target: user My Atlas account @${profile.handle}`)
  log(`API: ${options.apiBaseUrl}`)
  log(
    "Scope: profile, visited places, wishlist, plans, favorite image, and My Atlas registration"
  )
  log(
    "Excluded: the curated Roam With Justin Atlas, repository travel content, Google account, and Auth0 identity"
  )
  if (!options.apply) {
    log("Dry run complete. No data was deleted.")
    return Object.freeze({ deleted: false, profile })
  }

  const result = await deleteMyAtlasAccountWithRevisionRecovery({
    apiBaseUrl: options.apiBaseUrl,
    accessToken,
    revision: profile.revision,
    idempotencyKey: crypto.randomUUID(),
    fetchImpl,
  })
  log(
    `Deleted user My Atlas account @${profile.handle} at ${result.deletedAt}.`
  )
  log("The curated Roam With Justin Atlas was not changed.")
  return result
}

async function runGlobalWipe({ options, accessToken, fetchImpl, log }) {
  const request = async apply => {
    const response = await fetchImpl(
      `${options.apiBaseUrl}/v1/admin/accounts/wipe`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          apply,
          ...(apply ? { confirmation: options.confirmation } : {}),
        }),
        cache: "no-store",
      }
    )
    const result = await response.json()
    if (!response.ok)
      throw new Error(
        `Global wipe failed with HTTP ${response.status}. Run again to resume.`
      )
    return result
  }
  const preview = await request(false)
  if (!Array.isArray(preview.handles))
    throw new Error("Invalid global wipe preview.")
  log(`API: ${options.apiBaseUrl}`)
  log(
    `User My Atlas handles: ${preview.handles.map(handle => `@${handle}`).join(", ") || "none"}`
  )
  log(
    "The curated Roam With Justin Atlas, Google accounts, and Auth0 identities are excluded."
  )
  if (!options.apply) {
    log(
      "Dry run complete. Global mode requires an admin:my-atlas access token."
    )
    return { deleted: false }
  }
  let deletedCount = 0
  for (;;) {
    const result = await request(true)
    if (result.complete === true) break
    if (result.deleted !== true || typeof result.handle !== "string") {
      throw new Error("Invalid global wipe result. Stop and inspect the API.")
    }
    deletedCount += 1
    log(`Deleted user My Atlas @${result.handle}.`)
  }
  log(`Global My Atlas wipe complete. Deleted ${deletedCount} accounts.`)
  return { deleted: true, deletedCount }
}

async function main() {
  try {
    const parsed = parseWipeArguments(process.argv.slice(2))
    if (parsed.help) {
      console.log(usage())
      return
    }
    const options = validateWipeOptions(parsed)
    await runWipeAccount({
      options,
      accessToken: process.env.MY_ATLAS_WIPE_ACCESS_TOKEN || "",
    })
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Account wipe failed."
    )
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
