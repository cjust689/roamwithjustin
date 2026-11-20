import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const check = process.argv.includes("--check")
const variants = { amber: "#0b1114", orange: "#07152b" }
const exports = new Map()
for (const [name, background] of Object.entries(variants)) {
  const supplied = (
    await fs.readFile(
      path.join(root, `public/img/icons/SVG/${name}.svg`),
      "utf8"
    )
  ).replace(/\r\n/g, "\n")
  assert.doesNotMatch(
    supplied,
    /<(?:script|image|foreignObject)\b|(?:href|onload)\s*=/i
  )
  assert.match(supplied, /viewBox="0 0 530\.67 520\.17"/)
  assert.ok(supplied.includes(name === "amber" ? "#fbab44" : "#f68a1f"))
  const body = supplied.slice(
    supplied.indexOf(">", supplied.indexOf("<svg")) + 1,
    supplied.lastIndexOf("</svg>")
  )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="192" fill="${background}"/><svg x="96" y="96" width="832" height="832" viewBox="0 0 530.67 520.17">${body}</svg></svg>\n`
  exports.set(
    name === "amber" ? "favicon.svg" : "favicon-explorer.svg",
    Buffer.from(svg)
  )
  if (name !== "amber") continue
  for (const size of [16, 32, 48, 96, 180, 192, 512]) {
    // Opaque square rasters also work on browser/OS surfaces that ignore SVG.
    const png = await sharp(Buffer.from(svg), { density: 192 })
      .resize(size, size)
      .flatten({ background })
      .png()
      .toBuffer()
    exports.set(
      size === 180
        ? "apple-touch-icon.png"
        : size === 192 || size === 512
          ? `android-chrome-${size}x${size}.png`
          : `favicon-${size}x${size}.png`,
      png
    )
  }
  exports.set(
    "web-app-manifest-192x192.png",
    exports.get("android-chrome-192x192.png")
  )
  exports.set(
    "web-app-manifest-512x512.png",
    exports.get("android-chrome-512x512.png")
  )
  const sizes = [16, 32, 48]
  const images = sizes.map(size => exports.get(`favicon-${size}x${size}.png`))
  const header = Buffer.alloc(6 + 16 * sizes.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)
  let offset = header.length
  images.forEach((data, index) => {
    const entry = 6 + index * 16
    header[entry] = sizes[index]
    header[entry + 1] = sizes[index]
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  exports.set("favicon.ico", Buffer.concat([header, ...images]))
}

for (const [name, data] of exports) {
  const target = path.join(root, "public", name)
  if (!check) {
    await fs.writeFile(target, data)
    continue
  }
  const existing = await fs.readFile(target)
  if (name.endsWith(".svg"))
    assert.equal(
      existing.toString().replace(/\r\n/g, "\n"),
      data.toString(),
      `${name} must match the supplied master`
    )
  else if (name.endsWith(".png")) {
    const expected = await sharp(data).metadata()
    const actual = await sharp(existing).metadata()
    assert.equal(actual.width, expected.width, name)
    assert.equal(actual.height, expected.height, name)
    const { data: pixels, info } = await sharp(existing)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    let white = 0,
      amber = 0
    for (let i = 0; i < pixels.length; i += info.channels) {
      if (pixels[i] > 220 && pixels[i + 1] > 220 && pixels[i + 2] > 220) white++
      if (
        pixels[i] > 180 &&
        pixels[i + 1] > 90 &&
        pixels[i + 1] < 210 &&
        pixels[i + 2] < 100
      )
        amber++
    }
    assert.ok(
      white > 0 && amber > 0,
      `${name} must contain the white R and amber mountain`
    )
  } else {
    assert.equal(existing.readUInt16LE(2), 1)
    assert.equal(existing.readUInt16LE(4), 3)
    for (let i = 0; i < 3; i++) {
      const entry = 6 + i * 16
      const size = existing.readUInt32LE(entry + 8),
        offset = existing.readUInt32LE(entry + 12)
      const metadata = await sharp(
        existing.subarray(offset, offset + size)
      ).metadata()
      assert.equal(metadata.width, [16, 32, 48][i])
      assert.equal(metadata.height, [16, 32, 48][i])
    }
  }
}
console.log(
  `${check ? "Verified" : "Generated"} ${exports.size} brand icon assets from the supplied amber and orange SVG masters.`
)
