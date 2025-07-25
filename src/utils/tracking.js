export function trackClickEvent({
  url,
  label = "",
  domain = "",
  category,
  eventName,
}) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname
    const brand = hostname

    // Allow eventName/category to be overridden, else derive based on hostname
    if (!eventName || !category) {
      if (hostname.includes("amazon")) {
        eventName = eventName || "amazon_click"
        category = category || "amazon"
      } else if (hostname.includes("dji")) {
        eventName = eventName || "dji_click"
        category = category || "dji"
      } else if (hostname.includes("sony")) {
        eventName = eventName || "sony_click"
        category = category || "sony"
      } else {
        eventName = eventName || "affiliate_click"
        category = category || "affiliate"
      }
    }

    window.gtag?.("event", eventName, {
      event_category: category,
      event_label: label,
      domain: hostname,
      brand: brand,
      url: url,
    })
  } catch (err) {
    console.warn("Tracking error:", err)
  }
}
