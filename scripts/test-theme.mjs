import assert from "node:assert/strict"
import fs from "node:fs/promises"
import vm from "node:vm"

const source = await fs.readFile(
  new URL("../public/theme-preference.js", import.meta.url),
  "utf8"
)
function browser({ saved = null, blocked = false } = {}) {
  const listeners = new Map()
  const attributes = new Map()
  const favicon = new Map()
  const storage = new Map(saved === null ? [] : [["rwj:theme:v1", saved]])
  const window = {
    localStorage: {
      getItem(key) {
        if (blocked) throw Error("blocked")
        return storage.get(key) ?? null
      },
      setItem(key, value) {
        if (blocked) throw Error("blocked")
        storage.set(key, value)
      },
    },
    addEventListener(name, handler) {
      listeners.set(name, handler)
    },
    dispatchEvent(event) {
      listeners.get(event.type)?.(event)
    },
    matchMedia() {
      throw Error("OS theme must not be consulted")
    },
  }
  const context = vm.createContext({
    window,
    document: {
      getElementById: id =>
        id === "rwj-favicon"
          ? { setAttribute: (key, value) => favicon.set(key, value) }
          : null,
      documentElement: {
        setAttribute: (key, value) => attributes.set(key, value),
      },
    },
    CustomEvent: class {
      constructor(type) {
        this.type = type
      }
    },
  })
  const boot = () => vm.runInContext(source, context)
  boot()
  return { window, attributes, favicon, storage, boot }
}

for (const saved of [null, "", "dark", "EXPLORER", "system", "{}", "current"]) {
  const { window, attributes } = browser({ saved })
  assert.equal(window.RWJTheme.get(), "current")
  assert.equal(attributes.get("data-theme"), "current")
}
const selected = browser({ saved: "explorer" })
assert.equal(selected.favicon.get("href"), "/favicon-explorer.svg")
assert.equal(
  selected.attributes.get("data-theme"),
  "explorer",
  "stored choice is applied during head bootstrap"
)
selected.storage.set("unrelated:account", "preserved")
selected.window.RWJTheme.set("current")
assert.equal(selected.favicon.get("href"), "/favicon.svg")
assert.equal(selected.storage.get("rwj:theme:v1"), "current")
selected.window.RWJTheme.set("explorer")
selected.boot()
assert.equal(
  selected.window.RWJTheme.get(),
  "explorer",
  "choice survives reload"
)
assert.equal(selected.storage.get("unrelated:account"), "preserved")
selected.window.RWJTheme.set("invalid")
assert.equal(selected.window.RWJTheme.get(), "current")
const blocked = browser({ blocked: true })
assert.equal(blocked.window.RWJTheme.get(), "current")
blocked.window.RWJTheme.set("explorer")
assert.equal(
  blocked.attributes.get("data-theme"),
  "explorer",
  "blocked persistence still allows in-tab switching"
)
blocked.boot()
assert.equal(blocked.window.RWJTheme.get(), "current")
selected.window.dispatchEvent({
  type: "storage",
  key: "rwj:theme:v1",
  newValue: "explorer",
})
assert.equal(selected.window.RWJTheme.get(), "explorer")
selected.window.dispatchEvent({
  type: "storage",
  key: "unrelated",
  newValue: "current",
})
assert.equal(selected.window.RWJTheme.get(), "explorer")
selected.window.dispatchEvent({ type: "storage", key: null })
assert.equal(selected.window.RWJTheme.get(), "current")

const css = await fs.readFile(
  new URL("../src/styles/themes.css", import.meta.url),
  "utf8"
)
const palette = Object.fromEntries(
  [...css.matchAll(/--(color-[\w-]+):\s*(#[a-f0-9]{6})/g)].map(m => [
    m[1],
    m[2],
  ])
)
function luminance(hex) {
  const rgb = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
for (const background of [
  "color-page",
  "color-surface",
  "color-surface-raised",
]) {
  for (const foreground of [
    "color-text",
    "color-text-muted",
    "color-text-subtle",
    "color-accent",
    "color-accent-soft",
    "color-error",
    "color-success",
    "color-info",
  ]) {
    assert.ok(
      contrast(palette[foreground], palette[background]) >= 4.5,
      `${foreground} on ${background} must pass AA body text`
    )
  }
  assert.ok(contrast(palette["color-focus"], palette[background]) >= 3)
  assert.ok(contrast(palette["color-control-border"], palette[background]) >= 3)
}
assert.ok(
  contrast(palette["color-accent-contrast"], palette["color-accent"]) >= 4.5
)
const html = await fs.readFile(
  new URL("../public/index.html", import.meta.url),
  "utf8"
)
assert.ok(
  html.indexOf('src="<%= BASE_URL %>theme-preference.js"') <
    html.indexOf("<body>")
)
assert.doesNotMatch(
  html.match(/<script[^>]+theme-preference[^>]+>/)?.[0] || "",
  /\b(?:defer|async)\b/
)
console.log(
  "Theme preference, early initialization, storage recovery, cross-tab sync and Explorer contrast checks passed."
)
