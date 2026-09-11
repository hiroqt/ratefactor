import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#090a0f",
        surface: "#0f1219",
        "surface-raised": "#151a24",
        "surface-overlay": "#1c2331",
        border: "#202736",
        "border-subtle": "#171c26",
        "border-hover": "#364154",
        foreground: "#f0f4f8",
        muted: "#828fa3",
        "muted-dark": "#4a5568",
        brand: {
          50: "#fffbeb",
          100: "#fef3c7",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        rating: "#f59e0b",
        accent: {
          emerald: "#10b981",
          cyan: "#06b6d4",
          rose: "#f43f5e",
          purple: "#a855f7",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(245, 158, 11, 0.25)",
        "subtle-card": "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
        elevated: "0 12px 30px -10px rgba(0, 0, 0, 0.8)",
      },
    },
  },
  plugins: [],
};

export default config;
