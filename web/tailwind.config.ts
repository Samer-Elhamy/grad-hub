import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",

  theme: {
    extend: {
      // ── Custom Colors ──
      colors: {
        // Primary brand — calm blue
        primary: {
          DEFAULT: "#3B82F6",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // Secondary accent — purple
        secondary: {
          DEFAULT: "#8B5CF6",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        // Surface colors
        surface: {
          light: "#FFFFFF",
          DEFAULT: "#F9FAFB",
          dark: "#0D1117",
          "dark-alt": "#161B22",
        },
        // Text colors
        text: {
          primary: {
            light: "#111827",
            DEFAULT: "#F0F6FC",
          },
          secondary: {
            light: "#6B7280",
            DEFAULT: "#8B949E",
          },
        },
        // Semantic colors
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",
        info: "#3B82F6",
        // Border colors
        border: {
          light: "#E5E7EB",
          DEFAULT: "#30363D",
        },
      },

      // ── Custom Spacing (4px base) ──
      spacing: {
        px: "1px",
        0: "0px",
        0.5: "0.125rem", // 2px
        1: "0.25rem", // 4px
        1.5: "0.375rem", // 6px
        2: "0.5rem", // 8px
        3: "0.75rem", // 12px
        4: "1rem", // 16px
        5: "1.25rem", // 20px
        6: "1.5rem", // 24px
        8: "2rem", // 32px
        10: "2.5rem", // 40px
        12: "3rem", // 48px
        16: "4rem", // 64px
        20: "5rem", // 80px
        24: "6rem", // 96px
      },

      // ── Font Families ──
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },

      // ── Font Size Scale ──
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
        base: ["1rem", { lineHeight: "1.5rem" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
        "5xl": ["3rem", { lineHeight: "1.2" }], // 48px
      },

      // ── Font Weights ──
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },

      // ── Border Radius ──
      borderRadius: {
        none: "0px",
        sm: "0.25rem", // 4px
        DEFAULT: "0.375rem", // 6px
        md: "0.5rem", // 8px
        lg: "0.75rem", // 12px
        xl: "1rem", // 16px — card rounding
        "2xl": "1.5rem", // 24px
        full: "9999px",
      },

      // ── Shadows ──
      boxShadow: {
        // Small elevation
        sm: "0 1px 2px 0px rgba(0, 0, 0, 0.05)",
        // Default card
        DEFAULT: "0 1px 3px 0px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        // Medium — card hover
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        // Large — floating
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
        // XL — modals
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        // Card stack — used for elevated card
        card: "0 4px 12px rgba(0, 0, 0, 0.12)",
        "card-hover": "0 8px 24px rgba(0, 0, 0, 0.16)",
        // Dark mode shadows
        "dark-sm": "0 1px 2px 0px rgba(0, 0, 0, 0.4)",
        "dark-md": "0 4px 12px rgba(0, 0, 0, 0.6)",
      },

      // ── Transitions ──
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "350ms",
      },

      transitionTimingFunction: {
        "in-expo": "cubic-bezier(0.4, 0, 1, 1)",
        "out-expo": "cubic-bezier(0, 0, 0.2, 1)",
        "out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      // ── Keyframes for Card Stack Animations ──
      keyframes: {
        // Swipe right: card flies off to the right with rotation
        "swipe-right": {
          "0%": { transform: "translateX(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateX(500px) rotate(15deg)", opacity: "0" },
        },
        // Swipe left: card flies off to the left with rotation
        "swipe-left": {
          "0%": { transform: "translateX(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateX(-500px) rotate(-15deg)", opacity: "0" },
        },
        // Card stack entry (next card slides up)
        "card-enter": {
          "0%": { transform: "scale(0.95) translateY(8px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        // Page fade in
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Scale bounce for micro-interactions
        "scale-pulse": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
      },

      animation: {
        "swipe-right": "swipe-right 300ms ease-out forwards",
        "swipe-left": "swipe-left 300ms ease-out forwards",
        "card-enter": "card-enter 350ms ease-out forwards",
        "fade-in": "fade-in 200ms ease-out forwards",
        "scale-pulse": "scale-pulse 150ms ease-out",
      },

      // ── Max width for card container ──
      maxWidth: {
        card: "400px",
      },

      // ── Height for card ──
      height: {
        card: "480px",
      },
    },
  },

  plugins: [],
};

export default config;
