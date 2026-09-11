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
        background: "#fafafa",
        "background-secondary": "#f1f5f9",
        surface: "#ffffff",
        "surface-raised": "#f8fafc",
        "surface-overlay": "#f1f5f9",
        "glass-surface": "rgba(0, 0, 0, 0.02)",
        "glass-surface-hover": "rgba(0, 0, 0, 0.04)",
        "glass-border": "rgba(0, 0, 0, 0.08)",
        "glass-border-hover": "rgba(0, 0, 0, 0.16)",
        border: "#e2e8f0",
        "border-subtle": "#f1f5f9",
        "border-hover": "#cbd5e1",
        foreground: "#09090b",
        muted: "#64748b",
        "muted-dark": "#94a3b8",
        brand: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#64748b",
          500: "#0f172a",
          600: "#09090b",
          700: "#000000",
        },
        rating: "#f59e0b",
        accent: {
          emerald: "#16a34a",
          cyan: "#0284c7",
          rose: "#f43f5e",
          indigo: "#4f46e5",
          amber: "#d97706",
          purple: "#7c3aed",
          sky: "#0284c7",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "var(--font-sans)",
          "SF Pro Display",
          "Inter",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "SF Pro Mono",
          "JetBrains Mono",
          "Fira Code",
          "Menlo",
          "Monaco",
          "monospace",
        ],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
        "3xl": "28px",
        full: "9999px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        glow: "0 0 25px -5px rgba(22, 163, 74, 0.15)",
        "glow-amber": "0 0 25px -5px rgba(217, 119, 6, 0.18)",
        "subtle-card": "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        elevated: "0 12px 28px -6px rgba(0, 0, 0, 0.08), 0 8px 12px -6px rgba(0, 0, 0, 0.04)",
        "glass-specular": "0 4px 16px 0 rgba(0, 0, 0, 0.05)",
        "glass-pill": "0 2px 8px -2px rgba(0, 0, 0, 0.08)",
        "glass-modal": "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
      },
      backdropBlur: {
        xs: "2px",
        "2xl": "40px",
        "3xl": "60px",
      },
      animation: {
        "liquid-drift": "drift 12s ease-in-out infinite alternate",
        "shimmer-slide": "shimmer 3s ease-in-out infinite",
      },
      keyframes: {
        drift: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(20px, -15px) scale(1.05)" },
          "100%": { transform: "translate(-15px, 15px) scale(0.95)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
      },
      gridTemplateRows: {
        "7": "repeat(7, minmax(0, 1fr))",
      },
    },
  },
  plugins: [],
};

export default config;
