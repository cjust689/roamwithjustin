/* Runs synchronously in <head>, before the app and its styles paint. */
;(function () {
  var key = "rwj:theme:v1"
  var theme = "current"
  function normalize(value) {
    return value === "explorer" ? "explorer" : "current"
  }
  function apply(value) {
    theme = normalize(value)
    document.documentElement.setAttribute("data-theme", theme)
    var favicon = document.getElementById("rwj-favicon")
    if (favicon) {
      favicon.setAttribute(
        "href",
        theme === "explorer" ? "/favicon-explorer.svg" : "/favicon.svg"
      )
    }
  }
  try {
    theme = normalize(window.localStorage.getItem(key))
  } catch (error) {
    // Storage may be blocked. Classic remains the first-visit default.
  }
  apply(theme)
  window.RWJTheme = Object.freeze({
    get: function () {
      return theme
    },
    set: function (value) {
      apply(value)
      try {
        window.localStorage.setItem(key, theme)
      } catch (error) {
        // The choice still applies for this tab when persistence is unavailable.
      }
      window.dispatchEvent(new CustomEvent("rwj:theme-change"))
    },
  })
  window.addEventListener("storage", function (event) {
    if (event.key === key || event.key === null) {
      apply(event.key === null ? "current" : event.newValue)
      window.dispatchEvent(new CustomEvent("rwj:theme-change"))
    }
  })
})()
