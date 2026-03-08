import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#faf8f5",
          100: "#f4efe8",
          200: "#e8ddd0",
          300: "#D4A373",
          400: "#C4915F",
          500: "#B07D4F",
          600: "#9A6B3F",
          700: "#7D5633",
          800: "#5E4028",
          900: "#3D2A1A",
          950: "#1F1A12",
        },
        surface: {
          DEFAULT: "#0C1220",
          50:  "#1A2538",
          100: "#1F2A44",
          200: "#2A3A5C",
        }
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "serif"],
        body: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
