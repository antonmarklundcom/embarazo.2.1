import type { Config } from "tailwindcss";

// "Mi Bebé" design language — docs/REDESIGN-PLAN.md §1 (canvas 1d).
// Legacy token names keep working: values were updated in place.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FBF7F1",
        petrol: {
          DEFAULT: "#2F5D50",
          dark: "#24463D",
        },
        terracotta: "#C96342",
        // rose/sage stay mid-tone: used as text color in ~20 places.
        rose: "#E0A4A0",
        sage: "#6F8A66",
        ink: "#322E29",
        muted: "#7A7369",
        line: "#EDE5DA",
        whatsapp: "#25D366",
        sand: {
          bg: "#F8E2CB",
          text: "#8A5A2E",
        },
        pastel: {
          rosa: "#F3DAD4",
          celeste: "#D9E5EC",
          salvia: "#DFE8D8",
          lavanda: "#E6E0F0",
          arena: "#F8E2CB",
        },
      },
      borderRadius: {
        card: "16px",
        tile: "14px",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 3px rgba(42, 39, 36, 0.06), 0 1px 2px rgba(42, 39, 36, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
