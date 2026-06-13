import type { Config } from "tailwindcss";

// Design language §3 — warm wellness palette, implemented exactly.
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
          DEFAULT: "#1F5F5B",
          dark: "#16433F",
        },
        terracotta: "#D9714B",
        rose: "#E0A4A0",
        sage: "#8FAE86",
        ink: "#2A2724",
        muted: "#7E766C",
        whatsapp: "#25D366",
        sand: {
          bg: "#F6E4C2",
          text: "#854F0B",
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
