import { defineConfig } from "vitest/config";
import path from "node:path";

// `.mts`, not `.ts`, and `import.meta.dirname`, not `__dirname`.
//
// vitest 4 warns that a `.ts` config carrying ESM syntax is being loaded as
// CommonJS, and that Vite's native config loader — which cannot do that — is
// planned to become the default. Renaming makes the file genuinely ESM, which
// is what it always looked like, and removes the warning from every test run
// rather than silencing it with VITE_CONFIG_NATIVE_IGNORE_WARNING.
//
// The one consequence is that `__dirname` does not exist in ESM.
// `import.meta.dirname` is its equivalent (Node >=20.11; `engines` already
// requires >=22.6.0), and the two aliases below are load-bearing — `@/` is
// every import in the suite, and the `server-only` stub is what makes
// `lib/server/*` testable at all — so they are covered by the whole suite
// passing, not by inspection.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      // `server-only` throws outside a React Server Component, which is the
      // point in the app but makes lib/server/* untestable. Stub it so the
      // server modules can be unit-tested; the real guard still applies to
      // every Next.js build (BUILD-PLAN A1).
      "server-only": path.resolve(import.meta.dirname, "test/stubs/server-only.ts"),
    },
  },
});
