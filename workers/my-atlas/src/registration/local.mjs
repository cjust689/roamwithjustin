import {
  readRegistrationConfiguration,
  RegistrationConfigurationError,
} from "./contracts.mjs"
import { hashInviteCode } from "./hashing.mjs"
import {
  REGISTRY_OBJECT_NAME,
  registerBetaAccount,
  RegistrationServiceError,
} from "./service.mjs"
import { verifyTurnstile } from "./turnstile.mjs"

export function isLocalRegistrationRequest(requestUrl, environment) {
  const url = new URL(requestUrl)
  return (
    environment.MY_ATLAS_LOCAL_REGISTRATION === "true" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    environment.TURNSTILE_SECRET_KEY === "1x0000000000000000000000000000000AA"
  )
}

export async function registerLocalBetaAccount(options) {
  const { environment, input, requestUrl } = options
  if (!isLocalRegistrationRequest(requestUrl, environment))
    throw new RegistrationConfigurationError(
      "Local registration is restricted to loopback development."
    )
  const configuration = readRegistrationConfiguration(environment)
  if (input.inviteCode === environment.LOCAL_REGISTRATION_INVITE_CODE) {
    const registry =
      environment.MY_ATLAS_REGISTRY.getByName(REGISTRY_OBJECT_NAME)
    const result = await registry.issueInvitation({
      digest: await hashInviteCode(
        input.inviteCode,
        configuration.inviteHashPepper
      ),
      maxUses: 100,
      createdAt: environment.LOCAL_REGISTRATION_INVITE_CREATED,
      expiresAt: environment.LOCAL_REGISTRATION_INVITE_EXPIRES,
    })
    if (!result.ok)
      throw new RegistrationServiceError(
        "The local invitation could not be prepared."
      )
  }
  return registerBetaAccount({
    ...options,
    turnstileVerifier: args =>
      verifyTurnstile({
        ...args,
        allowLocalTestResponse: true,
        fetchImpl: options.turnstileFetchImpl,
      }),
  })
}
