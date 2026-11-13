const fs = require("fs")
const path = require("path")

const distDirectory = path.resolve(__dirname, "..", "dist")
const indexFile = path.join(distDirectory, "index.html")
const notFoundFile = path.join(distDirectory, "404.html")

if (!fs.existsSync(indexFile)) {
  throw new Error(`Cannot prepare GitHub Pages: ${indexFile} does not exist`)
}

fs.copyFileSync(indexFile, notFoundFile)

console.log("Prepared GitHub Pages fallback: dist/404.html")
