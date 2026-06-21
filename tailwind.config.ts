import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: "#efe3c8",
          light: "#f7eed8",
          dark: "#e3d2ad",
          deep: "#d8c39a",
        },
        ink: {
          DEFAULT: "#5b4a32",
          soft: "#7a6647",
          faint: "#9c8763",
        },
        /** Primary accent — hill & forest greens from the map illustration. */
        primary: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          deep: "var(--color-primary-deep)",
        },
        ember: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          deep: "var(--color-primary-deep)",
        },
        moss: {
          DEFAULT: "#70754a",
          deep: "var(--color-primary-deep)",
        },
        tide: {
          DEFAULT: "#6fa9a3",
          deep: "#4d8a86",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        hand: ["var(--font-hand)", "cursive"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        sheet: "0 -12px 40px -8px rgba(60, 45, 25, 0.35)",
        marker: "0 6px 16px -4px rgba(60, 45, 25, 0.45)",
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
