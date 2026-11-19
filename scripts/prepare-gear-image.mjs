#!/usr/bin/env node

import {
  gearImageUsage,
  parseGearImageArguments,
  prepareGearImage,
} from "./lib/gear-image-preparation.mjs"

async function main() {
  const options = parseGearImageArguments(process.argv.slice(2))
  if (options.help) {
    console.log(gearImageUsage())
    return
  }
  await prepareGearImage(options)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
