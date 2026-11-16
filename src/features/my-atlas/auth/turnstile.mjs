const SCRIPT_ID = "my-atlas-turnstile-script"
const SCRIPT_SOURCE =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

let loader

export function loadMyAtlasTurnstile({
  windowRef = window,
  documentRef = document,
} = {}) {
  if (windowRef.turnstile?.render) return Promise.resolve(windowRef.turnstile)
  if (loader) return loader

  loader = new Promise((resolve, reject) => {
    const existing = documentRef.getElementById(SCRIPT_ID)
    const script = existing || documentRef.createElement("script")
    const loaded = () => {
      if (windowRef.turnstile?.render) resolve(windowRef.turnstile)
      else reject(new Error("Turnstile did not initialize."))
    }
    const failed = () => reject(new Error("Turnstile could not be loaded."))

    script.addEventListener("load", loaded, { once: true })
    script.addEventListener("error", failed, { once: true })
    if (!existing) {
      script.id = SCRIPT_ID
      script.src = SCRIPT_SOURCE
      script.async = true
      script.defer = true
      documentRef.head.appendChild(script)
    }
  }).catch(error => {
    loader = null
    throw error
  })

  return loader
}
