import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` throws outside a React Server Component, which is the
      // point in the app but makes lib/server/* untestable. Stub it so the
      // server modules can be unit-tested; the real guard still applies to
      // every Next.js build (BUILD-PLAN A1).
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
});
