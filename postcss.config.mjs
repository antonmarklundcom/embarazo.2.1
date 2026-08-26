/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind v4 ships as its own PostCSS plugin, and it does the vendor
    // prefixing itself (Lightning CSS), so `autoprefixer` is gone from both
    // this chain and package.json rather than left in as a no-op.
    "@tailwindcss/postcss": {},
  },
};

export default config;
