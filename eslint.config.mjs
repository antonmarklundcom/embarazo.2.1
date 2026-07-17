import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

// P1.5 (BUILD-PLAN.md): non-interactive flat config so `next lint` runs in
// CI instead of hitting the setup prompt.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/sw.js",
      "public/swe-worker-*.js",
      "playwright-report/**",
      "test-results/**",
    ],
  },
];

export default eslintConfig;
