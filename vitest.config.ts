import path from "path"
import { defineConfig } from "vitest/config"

// Tests cover the pure logic in src/lib (API mapping, errors, stream downloads, paths); no browser needed.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
