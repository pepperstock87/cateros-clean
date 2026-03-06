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
          50:  "#fdf8f0",
          100: "#faefd9",
          200: "#f5d9a8",
          300: "#eebb6d",
          400: "#e59c3a",
          500: "#d4801f",
          600: "#b86316",
          700: "#964c14",
          800: "#793d17",
          900: "#633317",
          950: "#371809",
        },
        surface: {
          DEFAULT: "#0f0d0b",
          50:  "#1c1814",
          100: "#251f19",
          200: "#2e271f",
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
