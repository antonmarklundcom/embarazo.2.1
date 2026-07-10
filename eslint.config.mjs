import { FlatCompat } from "@eslint/eslintrc";

// ESLint flat config (build plan P1.5). Uses the Next.js shared config via
// FlatCompat so `next lint` runs non-interactively in CI. Kept intentionally
// close to next/core-web-vitals defaults.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/sw.js",
      "public/**/*.js",
    ],
  },
];

export default config;
