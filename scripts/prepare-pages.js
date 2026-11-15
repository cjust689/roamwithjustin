const fs = require("fs")
const path = require("path")
const { loadAdSenseBuildEnvironment } = require("./lib/adsense-build-env.js")

const projectRoot = path.resolve(__dirname, "..")
const distDirectory = path.join(projectRoot, "dist")
const indexFile = path.join(distDirectory, "index.html")
const notFoundFile = path.join(distDirectory, "404.html")
const adsTextFile = path.join(distDirectory, "ads.txt")

if (!fs.existsSync(indexFile)) {
  throw new Error(`Cannot prepare GitHub Pages: ${indexFile} does not exist`)
}

fs.copyFileSync(indexFile, notFoundFile)

console.log("Prepared GitHub Pages fallback: dist/404.html")

const adsTextLine = String(
  loadAdSenseBuildEnvironment(projectRoot, process.env)
    .ADSENSE_GOOGLE_ADS_TXT_LINE || ""
).trim()
if (adsTextLine) {
  fs.writeFileSync(adsTextFile, adsTextLine + "\n", "utf8")
  console.log("Prepared AdSense seller declaration: dist/ads.txt")
}
