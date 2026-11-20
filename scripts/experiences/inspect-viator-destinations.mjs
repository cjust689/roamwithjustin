import fs from "node:fs/promises"
import dotenv from "dotenv"

try {
  const variables = dotenv.parse(
    await fs.readFile("workers/experience-discovery/.dev.vars")
  )
  const key = variables.VIATOR_API_KEY?.trim()
  if (!key)
    throw Error(
      "Configure VIATOR_API_KEY in workers/experience-discovery/.dev.vars first"
    )
  const query = process.argv[2]?.trim()
  if (!query || query.length > 100)
    throw Error("Supply a public destination name, for example Split")
  const response = await fetch(
    "https://api.sandbox.viator.com/partner/destinations",
    {
      headers: {
        "exp-api-key": key,
        Accept: "application/json;version=2.0",
        "Accept-Language": "en-US",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    }
  )
  if (!response.ok)
    throw Error(
      `Viator sandbox rejected the destination request (${response.status}); check key validity, activation and sandbox access in your Viator account`
    )
  const reader = response.body.getReader()
  const parts = []
  let bytes = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > 15_000_000) {
      await reader.cancel()
      throw Error("Destination response exceeded local limit")
    }
    parts.push(value)
  }
  const payload = JSON.parse(Buffer.concat(parts).toString("utf8"))
  if (!Array.isArray(payload.destinations))
    throw Error("Unexpected destination response format")
  const records = payload.destinations
  const matches = records.filter(
    row =>
      String(row.name).toLocaleLowerCase("en-US") ===
      query.toLocaleLowerCase("en-US")
  )
  const select = row => ({
    destinationId: row.destinationId,
    name: row.name,
    type: row.type || row.destinationType,
    parentDestinationId: row.parentDestinationId,
  })
  console.log(
    JSON.stringify(
      {
        environment: "sandbox",
        candidates: matches.map(row => ({
          ...select(row),
          parent: records.find(
            parent => parent.destinationId === row.parentDestinationId
          )
            ? select(
                records.find(
                  parent => parent.destinationId === row.parentDestinationId
                )
              )
            : null,
        })),
      },
      null,
      2
    )
  )
} catch (error) {
  console.error(
    error.code === "ENOENT"
      ? "Local Viator secret file is missing; copy .dev.vars.example to .dev.vars and configure the key locally."
      : error instanceof TypeError
        ? "Viator destination request failed; check network access and retry."
        : error.message
  )
  process.exitCode = 1
}
