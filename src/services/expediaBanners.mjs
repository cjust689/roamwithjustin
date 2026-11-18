export const EXPEDIA_BANNER_SCRIPT_ID = "rwj-expedia-affiliate-banners"
export const EXPEDIA_BANNER_SCRIPT_URL =
  "https://creator.expediagroup.com/products/banners/assets/eg-affiliate-banners.js"

export function loadExpediaBannerScript({
  documentObject = typeof document === "undefined" ? null : document,
} = {}) {
  if (!documentObject?.createElement) {
    return Promise.reject(new Error("Expedia banners require a browser document."))
  }

  const existing = documentObject.getElementById?.(EXPEDIA_BANNER_SCRIPT_ID)
  existing?.parentNode?.removeChild(existing)

  return new Promise((resolve, reject) => {
    const script = documentObject.createElement("script")
    script.id = EXPEDIA_BANNER_SCRIPT_ID
    script.className = "eg-affiliate-banners-script"
    script.src = EXPEDIA_BANNER_SCRIPT_URL
    script.async = true
    script.onload = () => resolve(script)
    script.onerror = () =>
      reject(new Error("Expedia travel options could not be loaded."))

    const target = documentObject.body || documentObject.head
    if (!target?.appendChild) {
      reject(new Error("Expedia banners require a document target."))
      return
    }
    target.appendChild(script)
  })
}
