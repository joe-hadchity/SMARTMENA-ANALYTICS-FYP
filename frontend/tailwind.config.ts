import type { Config } from "tailwindcss";

/**
 * SmartMENA design tokens.
 *
 * We expose two layers of colour:
 *   1. A literal brand/ink scale for cases where a specific shade is needed
 *      (illustrations, data viz gradients, etc.).
 *   2. Semantic tokens (`bg`, `surface`, `fg`, `muted`, `primary`, ...) that
 *      resolve to CSS variables. globals.css sets those variables once for
 *      the light theme and overrides them under `html.dark` for dark mode,
 *      so every component below automatically flips theme without any
 *      conditional classes.
 *
 * Data-viz colours are intentionally named by role (`viz-1`..`viz-6`) so
 * charts stay consistent across the product and swap cleanly between
 * themes via CSS variables.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: [
          "'IBM Plex Sans'",
          "system-ui",
          "-apple-system",
          "'Segoe UI'",
          "sans-serif",
        ],
        arabic: [
          "'IBM Plex Sans Arabic'",
          "'Noto Sans Arabic'",
          "Tajawal",
          "system-ui",
          "sans-serif",
        ],
        mono: ["'IBM Plex Mono'", "'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // ------- brand (literal scale) -------
        brand: {
          50: "#eef6ff",
          100: "#d8ebff",
          200: "#b5d7ff",
          300: "#85bcff",
          400: "#4f99ff",
          500: "#2577ff",
          600: "#0f5af0",
          700: "#0c47c2",
          800: "#0d3c9a",
          900: "#0f367a",
          950: "#0a2149",
        },
        // ------- ink (neutral literal scale, used in marketing / illustrations) -------
        ink: {
          50: "#f7f8fa",
          100: "#eef0f5",
          200: "#dde1eb",
          300: "#c5cbda",
          400: "#98a0b5",
          500: "#6c7489",
          600: "#525a6f",
          700: "#404758",
          800: "#2b3040",
          900: "#161925",
          950: "#0a0c14",
        },
        // ------- semantic tokens (CSS vars -> auto dark mode) -------
        bg: "oklch(var(--bg) / <alpha-value>)",
        "bg-elevated": "oklch(var(--bg-elevated) / <alpha-value>)",
        surface: "oklch(var(--surface) / <alpha-value>)",
        "surface-muted": "oklch(var(--surface-muted) / <alpha-value>)",
        "surface-hover": "oklch(var(--surface-hover) / <alpha-value>)",
        border: "oklch(var(--border) / <alpha-value>)",
        "border-strong": "oklch(var(--border-strong) / <alpha-value>)",
        fg: "oklch(var(--fg) / <alpha-value>)",
        "fg-muted": "oklch(var(--fg-muted) / <alpha-value>)",
        "fg-subtle": "oklch(var(--fg-subtle) / <alpha-value>)",
        "fg-inverse": "oklch(var(--fg-inverse) / <alpha-value>)",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          fg: "oklch(var(--primary-fg) / <alpha-value>)",
          soft: "oklch(var(--primary-soft) / <alpha-value>)",
          hover: "oklch(var(--primary-hover) / <alpha-value>)",
        },
        success: {
          DEFAULT: "oklch(var(--success) / <alpha-value>)",
          soft: "oklch(var(--success-soft) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "oklch(var(--warning) / <alpha-value>)",
          soft: "oklch(var(--warning-soft) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "oklch(var(--danger) / <alpha-value>)",
          soft: "oklch(var(--danger-soft) / <alpha-value>)",
        },
        info: {
          DEFAULT: "oklch(var(--info) / <alpha-value>)",
          soft: "oklch(var(--info-soft) / <alpha-value>)",
        },
        ring: "oklch(var(--ring) / <alpha-value>)",
        // data-viz palette (semantic, theme-aware)
        viz: {
          1: "oklch(var(--viz-1) / <alpha-value>)",
          2: "oklch(var(--viz-2) / <alpha-value>)",
          3: "oklch(var(--viz-3) / <alpha-value>)",
          4: "oklch(var(--viz-4) / <alpha-value>)",
          5: "oklch(var(--viz-5) / <alpha-value>)",
          6: "oklch(var(--viz-6) / <alpha-value>)",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(10, 12, 20, 0.05)",
        sm: "0 1px 2px rgba(10, 12, 20, 0.06), 0 1px 3px rgba(10, 12, 20, 0.04)",
        md: "0 2px 4px rgba(10, 12, 20, 0.06), 0 6px 16px rgba(10, 12, 20, 0.06)",
        lg: "0 10px 30px rgba(10, 12, 20, 0.08), 0 4px 12px rgba(10, 12, 20, 0.06)",
        glow: "0 0 0 4px oklch(var(--primary) / 0.14)",
        "inner-top": "inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "scale-in": "scale-in 160ms ease-out",
        "slide-in-right": "slide-in-right 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-left": "slide-in-left 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
