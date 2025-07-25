export function trackClickEvent({ url, label = "", extra = {} }) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname

    // Dynamic domain-based classification
    let category = "affiliate"
    let eventName = "affiliate_click"

    if (hostname.includes("amazon")) {
      category = "amazon"
      eventName = "amazon_click"
    } else if (hostname.includes("djiglobal") || hostname.includes("dji")) {
      category = "dji"
      eventName = "dji_click"
    } else if (hostname.includes("sony")) {
      category = "sony"
      eventName = "sony_click"
    }

    // Track in Google Analytics (GA4-style)
    window.gtag?.("event", eventName, {
      event_category: category,
      event_label: label || hostname,
      domain: hostname,
      ...extra, // you can pass extra data if needed
    })

    // You could also push to your own event log system here if needed

    console.log(`[TRACKED] ${eventName}`, {
      category,
      label,
      domain: hostname,
    })
  } catch (err) {
    console.warn("Invalid URL in tracking:", url)
  }
}
