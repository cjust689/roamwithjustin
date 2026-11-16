import Vue from "vue"
import { createAuth0Client } from "@auth0/auth0-spa-js"
import {
  getMyAtlasAuthConfiguration,
  inspectMyAtlasAuthConfiguration,
} from "../config/auth0.mjs"
import {
  buildAuth0ClientOptions,
  buildLoginOptions,
  buildLogoutOptions,
  completeAuth0Redirect,
  getAudienceAccessToken,
  restoreAuth0Session,
} from "./session.mjs"

const environmentInspection = inspectMyAtlasAuthConfiguration(process.env)

export const myAtlasAuthState = Vue.observable({
  configured: environmentInspection.configured,
  ready: false,
  loading: false,
  authenticated: false,
  user: null,
  error: "",
})

let configuration
let clientPromise

function friendlyAuthError(error) {
  if (error && error.error === "access_denied") {
    return "Google sign in was not completed for this account."
  }
  if (error && error.error === "login_required") {
    return "Please sign in again to continue."
  }
  return "Authentication could not be completed. Please try again."
}

function getConfiguration() {
  if (!configuration) {
    configuration = getMyAtlasAuthConfiguration(
      process.env,
      window.location.origin
    )
  }
  return configuration
}

function getClient() {
  if (!clientPromise) {
    const currentConfiguration = getConfiguration()
    clientPromise = createAuth0Client(
      buildAuth0ClientOptions(currentConfiguration)
    )
  }
  return clientPromise
}

async function refreshAuthState(client) {
  myAtlasAuthState.authenticated = await client.isAuthenticated()
  myAtlasAuthState.user = myAtlasAuthState.authenticated
    ? await client.getUser()
    : null
}

export async function initializeMyAtlasAuth() {
  if (!myAtlasAuthState.configured || myAtlasAuthState.loading) return

  myAtlasAuthState.loading = true
  myAtlasAuthState.error = ""
  try {
    const client = await getClient()
    if (!(await client.isAuthenticated())) {
      await restoreAuth0Session(client)
    }
    await refreshAuthState(client)
    myAtlasAuthState.ready = true
  } catch (error) {
    myAtlasAuthState.error = friendlyAuthError(error)
  } finally {
    myAtlasAuthState.loading = false
  }
}

export async function loginToMyAtlas() {
  myAtlasAuthState.loading = true
  myAtlasAuthState.error = ""
  try {
    const client = await getClient()
    await client.loginWithRedirect(buildLoginOptions(getConfiguration()))
  } catch (error) {
    myAtlasAuthState.loading = false
    myAtlasAuthState.error = friendlyAuthError(error)
  }
}

export async function logoutFromMyAtlas() {
  myAtlasAuthState.loading = true
  myAtlasAuthState.error = ""
  try {
    const client = await getClient()
    await client.logout(buildLogoutOptions(getConfiguration()))
  } catch (error) {
    myAtlasAuthState.loading = false
    myAtlasAuthState.error = friendlyAuthError(error)
  }
}

export async function finishMyAtlasAuthRedirect() {
  myAtlasAuthState.loading = true
  myAtlasAuthState.error = ""
  try {
    const client = await getClient()
    const returnTo = await completeAuth0Redirect(client)
    await refreshAuthState(client)
    myAtlasAuthState.ready = true
    return returnTo
  } catch (error) {
    myAtlasAuthState.error = friendlyAuthError(error)
    throw error
  } finally {
    myAtlasAuthState.loading = false
  }
}

export async function getMyAtlasApiAccessToken() {
  const client = await getClient()
  if (!(await client.isAuthenticated())) {
    throw new Error("My Atlas sign in is required.")
  }
  return getAudienceAccessToken(client, getConfiguration())
}
