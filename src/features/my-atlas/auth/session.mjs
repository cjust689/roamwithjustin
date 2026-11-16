export const MY_ATLAS_HOME_PATH = "/my-atlas"

export function buildAuth0ClientOptions(configuration) {
  return {
    domain: configuration.domain,
    clientId: configuration.clientId,
    cacheLocation: "memory",
    useRefreshTokens: false,
    authorizationParams: {
      audience: configuration.audience,
      scope: configuration.scope,
      redirect_uri: configuration.callbackUri,
    },
  }
}

export function buildLoginOptions(configuration) {
  return {
    appState: {
      returnTo: MY_ATLAS_HOME_PATH,
    },
    authorizationParams: {
      audience: configuration.audience,
      scope: configuration.scope,
      redirect_uri: configuration.callbackUri,
      connection: "google-oauth2",
    },
  }
}

export function buildLogoutOptions(configuration) {
  return {
    logoutParams: {
      returnTo: configuration.logoutUri,
    },
  }
}

export function hasAuth0RedirectResponse(search = "") {
  const parameters = new URLSearchParams(search)
  return (
    parameters.has("state") &&
    (parameters.has("code") || parameters.has("error"))
  )
}

export function safeMyAtlasReturnPath(value) {
  return value === MY_ATLAS_HOME_PATH ? value : MY_ATLAS_HOME_PATH
}

export async function completeAuth0Redirect(client) {
  const result = await client.handleRedirectCallback()
  return safeMyAtlasReturnPath(result && result.appState?.returnTo)
}

export async function getAudienceAccessToken(client, configuration) {
  return client.getTokenSilently({
    authorizationParams: {
      audience: configuration.audience,
      scope: configuration.scope,
      redirect_uri: configuration.callbackUri,
    },
  })
}

export async function restoreAuth0Session(client) {
  try {
    await client.checkSession()
  } catch (error) {
    if (error?.error !== "login_required") throw error
  }
}
