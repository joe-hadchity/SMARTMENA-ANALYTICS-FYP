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
          "Inter",
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
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
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
        bg: "hsl(var(--bg) / <alpha-value>)",
        "bg-elevated": "hsl(var(--bg-elevated) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-muted": "hsl(var(--surface-muted) / <alpha-value>)",
        "surface-hover": "hsl(var(--surface-hover) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        "border-strong": "hsl(var(--border-strong) / <alpha-value>)",
        fg: "hsl(var(--fg) / <alpha-value>)",
        "fg-muted": "hsl(var(--fg-muted) / <alpha-value>)",
        "fg-subtle": "hsl(var(--fg-subtle) / <alpha-value>)",
        "fg-inverse": "hsl(var(--fg-inverse) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          fg: "hsl(var(--primary-fg) / <alpha-value>)",
          soft: "hsl(var(--primary-soft) / <alpha-value>)",
          hover: "hsl(var(--primary-hover) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          soft: "hsl(var(--success-soft) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          soft: "hsl(var(--warning-soft) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          soft: "hsl(var(--danger-soft) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          soft: "hsl(var(--info-soft) / <alpha-value>)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        // data-viz palette (semantic, theme-aware)
        viz: {
          1: "hsl(var(--viz-1) / <alpha-value>)",
          2: "hsl(var(--viz-2) / <alpha-value>)",
          3: "hsl(var(--viz-3) / <alpha-value>)",
          4: "hsl(var(--viz-4) / <alpha-value>)",
          5: "hsl(var(--viz-5) / <alpha-value>)",
          6: "hsl(var(--viz-6) / <alpha-value>)",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "8px",
        xl: "8px",
        "2xl": "10px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(10, 12, 20, 0.05)",
        sm: "0 1px 2px rgba(10, 12, 20, 0.06), 0 1px 3px rgba(10, 12, 20, 0.04)",
        md: "0 2px 4px rgba(10, 12, 20, 0.06), 0 6px 16px rgba(10, 12, 20, 0.06)",
        lg: "0 10px 30px rgba(10, 12, 20, 0.08), 0 4px 12px rgba(10, 12, 20, 0.06)",
        glow: "0 0 0 4px hsl(var(--primary) / 0.14)",
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
