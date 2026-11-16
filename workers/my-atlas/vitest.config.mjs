import { cloudflareTest } from "@cloudflare/vitest-plugin"
import { defineConfig } from "vitest/config"

process.env.WRANGLER_WRITE_LOGS = "false"

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./workers/my-atlas/wrangler.jsonc",
      },
    }),
  ],
  test: {
    include: ["workers/my-atlas/test/**/*.test.mjs"],
  },
})
