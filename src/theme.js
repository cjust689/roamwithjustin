import Vue from "vue"

// Theme stays in the document shell, independent of routes, auth and map state.
export const themeState = Vue.observable({
  current: window.RWJTheme ? window.RWJTheme.get() : "current",
})

window.addEventListener("rwj:theme-change", () => {
  themeState.current = window.RWJTheme.get()
})

export function selectTheme(theme) {
  if (window.RWJTheme) window.RWJTheme.set(theme)
}
