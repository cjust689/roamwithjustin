import { decorativeConnections } from "../catalog/atlasInsights.mjs"
import { geoEquirectangular, geoPath } from "d3-geo"
import { feature as topojsonFeature } from "topojson-client"
import worldLandTopology from "world-atlas/land-110m.json"

const WIDTH = 1080
const HEIGHT = 1920
const MAP_FRAME = Object.freeze({ x: 60, y: 400, width: 960, height: 930 })
const MAP_BOUNDS = Object.freeze({
  left: 90,
  right: 990,
  top: 575,
  bottom: 1075,
})
const WORLD_LAND = topojsonFeature(
  worldLandTopology,
  worldLandTopology.objects.land
)
const WORLD_PROJECTION = geoEquirectangular().fitExtent(
  [
    [MAP_BOUNDS.left, MAP_BOUNDS.top],
    [MAP_BOUNDS.right, MAP_BOUNDS.bottom],
  ],
  WORLD_LAND
)

function roundedRectangle(context, x, y, width, height, radius) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function mapPoint(coordinates) {
  const [x, y] = WORLD_PROJECTION(coordinates)
  return { x, y }
}

function drawBackground(context) {
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT)
  gradient.addColorStop(0, "#081416")
  gradient.addColorStop(0.52, "#102528")
  gradient.addColorStop(1, "#071012")
  context.fillStyle = gradient
  context.fillRect(0, 0, WIDTH, HEIGHT)

  const glow = context.createRadialGradient(860, 260, 10, 860, 260, 620)
  glow.addColorStop(0, "rgba(230, 186, 104, 0.22)")
  glow.addColorStop(1, "rgba(230, 186, 104, 0)")
  context.fillStyle = glow
  context.fillRect(0, 0, WIDTH, 900)
}

function traceLand(context) {
  context.beginPath()
  geoPath(WORLD_PROJECTION, context)(WORLD_LAND)
}

function drawMap(context) {
  roundedRectangle(
    context,
    MAP_FRAME.x,
    MAP_FRAME.y,
    MAP_FRAME.width,
    MAP_FRAME.height,
    52
  )
  const ocean = context.createLinearGradient(
    MAP_FRAME.x,
    MAP_FRAME.y,
    MAP_FRAME.x,
    MAP_FRAME.y + MAP_FRAME.height
  )
  ocean.addColorStop(0, "rgba(8, 24, 27, 0.96)")
  ocean.addColorStop(1, "rgba(4, 14, 17, 0.96)")
  context.fillStyle = ocean
  context.fill()
  context.strokeStyle = "rgba(232, 244, 239, 0.09)"
  context.lineWidth = 2
  context.stroke()

  context.save()
  roundedRectangle(
    context,
    MAP_FRAME.x,
    MAP_FRAME.y,
    MAP_FRAME.width,
    MAP_FRAME.height,
    52
  )
  context.clip()
  context.strokeStyle = "rgba(232, 244, 239, 0.065)"
  context.lineWidth = 2
  for (let longitude = -150; longitude <= 150; longitude += 30) {
    const point = mapPoint([longitude, 0])
    context.beginPath()
    context.moveTo(point.x, MAP_FRAME.y + 38)
    context.lineTo(point.x, MAP_FRAME.y + MAP_FRAME.height - 38)
    context.stroke()
  }
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const point = mapPoint([0, latitude])
    context.beginPath()
    context.moveTo(MAP_FRAME.x + 30, point.y)
    context.lineTo(MAP_FRAME.x + MAP_FRAME.width - 30, point.y)
    context.stroke()
  }

  traceLand(context)
  const land = context.createLinearGradient(
    0,
    MAP_BOUNDS.top,
    0,
    MAP_BOUNDS.bottom
  )
  land.addColorStop(0, "#31514a")
  land.addColorStop(0.55, "#23423e")
  land.addColorStop(1, "#18332f")
  context.fillStyle = land
  context.shadowColor = "rgba(0, 0, 0, 0.42)"
  context.shadowBlur = 22
  context.fill("evenodd")
  context.shadowColor = "transparent"
  context.strokeStyle = "rgba(240, 201, 120, 0.34)"
  context.lineWidth = 2
  context.stroke()
  context.restore()
}

function drawConnections(context, places) {
  context.save()
  context.strokeStyle = "rgba(230, 186, 104, 0.38)"
  context.lineWidth = 4
  context.setLineDash([15, 17])
  for (const edge of decorativeConnections(places)) {
    const from = mapPoint(edge.from.coordinates)
    const to = mapPoint(edge.to.coordinates)
    const lift = Math.min(130, Math.abs(to.x - from.x) * 0.18 + 30)
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.quadraticCurveTo(
      (from.x + to.x) / 2,
      Math.min(from.y, to.y) - lift,
      to.x,
      to.y
    )
    context.stroke()
  }
  context.restore()
}

function drawPins(context, places) {
  for (const place of places) {
    const point = mapPoint(place.coordinates)
    context.beginPath()
    context.arc(point.x, point.y, 19, 0, Math.PI * 2)
    context.fillStyle = "rgba(230, 186, 104, 0.22)"
    context.fill()
    context.beginPath()
    context.arc(point.x, point.y, 8, 0, Math.PI * 2)
    context.fillStyle = "#f0c978"
    context.fill()
    context.strokeStyle = "#fff4d9"
    context.lineWidth = 3
    context.stroke()
  }
}

function drawStat(context, x, y, value, label) {
  roundedRectangle(context, x, y, 222, 178, 28)
  context.fillStyle = "rgba(255, 255, 255, 0.055)"
  context.fill()
  context.strokeStyle = "rgba(255, 255, 255, 0.1)"
  context.stroke()
  context.fillStyle = "#f0c978"
  context.font = "700 62px Poppins, Arial, sans-serif"
  context.fillText(String(value), x + 24, y + 78)
  context.fillStyle = "#a9bbb5"
  context.font = "600 24px Poppins, Arial, sans-serif"
  context.fillText(label.toUpperCase(), x + 24, y + 126)
}

export function createMyAtlasStoryCanvas({
  displayName,
  filterLabel = "All destinations",
  handle,
  places,
  stats,
}) {
  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext("2d")
  drawBackground(context)

  context.fillStyle = "#f0c978"
  context.font = "700 25px Poppins, Arial, sans-serif"
  context.fillText("MY ATLAS", 62, 82)
  context.fillStyle = "#f4fbf7"
  context.font = "700 78px 'Russo One', Poppins, Arial, sans-serif"
  context.fillText(displayName || "My travels", 62, 188, 920)
  context.fillStyle = "#a9bbb5"
  context.font = "500 28px Poppins, Arial, sans-serif"
  context.fillText(handle ? `@${handle}` : filterLabel, 64, 244)
  context.fillStyle = "#d5e2dd"
  context.font = "600 32px Poppins, Arial, sans-serif"
  context.fillText(filterLabel, 64, 330)

  drawMap(context)
  drawConnections(context, places)
  drawPins(context, places)

  drawStat(context, 60, 1390, stats.places, "Places")
  drawStat(context, 306, 1390, stats.countries, "Countries")
  drawStat(context, 552, 1390, stats.continents, "Continents")
  drawStat(
    context,
    798,
    1390,
    stats.spots || stats.capitals,
    stats.spots ? "Spots" : "Capitals"
  )

  context.fillStyle = "#f4fbf7"
  context.font = "700 34px Poppins, Arial, sans-serif"
  const range = stats.firstYear
    ? stats.firstYear === stats.latestYear
      ? String(stats.firstYear)
      : `${stats.firstYear} to ${stats.latestYear}`
    : "Dates are optional"
  context.fillText(range, 64, 1655)
  context.fillStyle = "#93a7a0"
  context.font = "500 24px Poppins, Arial, sans-serif"
  context.fillText(
    stats.spanMiles
      ? `${stats.spanMiles.toLocaleString()} mile map span, not travel distance`
      : "Build your personal map one place at a time",
    64,
    1700
  )

  context.fillStyle = "#f0c978"
  context.font = "700 31px Poppins, Arial, sans-serif"
  context.fillText("My Atlas by RoamWithJustin.com", 64, 1842)
  context.fillStyle = "#728780"
  context.font = "500 20px Poppins, Arial, sans-serif"
  context.fillText(
    "Decorative connections do not represent a travel route. Land: Natural Earth.",
    64,
    1883
  )
  return canvas
}

export function downloadMyAtlasStory(options) {
  const canvas = createMyAtlasStoryCanvas(options)
  const link = document.createElement("a")
  link.download = `my-atlas-${options.handle || "story"}.png`
  link.href = canvas.toDataURL("image/png")
  link.click()
}
