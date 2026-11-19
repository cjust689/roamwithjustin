const sharp = require("sharp")

const maximumDimension = 2560
const jpegQuality = 82

function normalizedImagePipeline(
  input,
  {
    width = maximumDimension,
    height = maximumDimension,
    fit = "inside",
    withoutEnlargement = true,
  } = {}
) {
  return sharp(input)
    .autoOrient()
    .resize({ width, height, fit, withoutEnlargement })
    .toColourspace("srgb")
}

function compressedPipeline(input, extension) {
  let pipeline = normalizedImagePipeline(input)

  if (extension === ".jpg" || extension === ".jpeg") {
    pipeline = pipeline.jpeg({
      quality: jpegQuality,
      mozjpeg: true,
      progressive: true,
    })
  } else {
    pipeline = pipeline.png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
    })
  }

  return pipeline
}

function gearWebpPipeline(input, width) {
  return normalizedImagePipeline(input, { width, height: width }).webp({
    quality: 82,
    alphaQuality: 90,
    effort: 4,
  })
}

module.exports = {
  compressedPipeline,
  gearWebpPipeline,
  maximumDimension,
  normalizedImagePipeline,
}
