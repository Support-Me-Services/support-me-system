/**
 * Shared Tailwind / NativeWind theme preset for the support-me-system design system.
 *
 * Tokens below are extracted from the Figma file "Aktualny dyzajn - desktop - mobile"
 * (component library page: Header, Button/Gradient, Button/DarkModal, FormField,
 * AmountTile, and the "10 - Strona zbiorki" screen for the card/heading pattern).
 * The Figma file itself only covers the public marketing site + a component library -
 * it has no dedicated screens for organization management, so screens built on top of
 * these tokens (dashboard, forms, admin panel) are new compositions in this same
 * visual language, not a 1:1 port of an existing Figma frame.
 *
 * Usage in an app's tailwind.config.js:
 *
 *   const preset = require('@support-me/config/tailwind-preset');
 *   module.exports = {
 *     presets: [preset],
 *     content: [...],
 *   };
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary accent ("--blue-b" in Figma) - CTAs, links, active states.
        primary: {
          DEFAULT: "#1473c0",
          foreground: "#ffffff",
        },
        // Dark navy used for the "DarkModal" button style and emphasis chips.
        secondary: {
          DEFAULT: "#24324a",
          foreground: "#f5f5f5",
        },
        background: "#ffffff",
        // "--band-bg" - light section/card background (e.g. amount tiles, page bands).
        band: "#f6f9fb",
        // "--ink" - primary text color.
        foreground: "#24324a",
        // "--muted" - secondary/placeholder text.
        muted: "#5b6678",
        // "--line" - default border color.
        line: "#e6eaf0",
        // "--error".
        danger: "#b3261e",
      },
      spacing: {},
      borderRadius: {
        // "--radius-pill" - fully-rounded buttons/badges.
        pill: "999px",
        // "--radius-card" - inputs, small cards, tiles.
        card: "14px",
        // "--radius-card-lg" - larger content cards.
        "card-lg": "18px",
      },
      fontFamily: {
        // CSS vars set by next/font/google in apps/web/app/layout.tsx (self-hosted at
        // build time, no external font request at runtime). Falls back to the literal
        // family name / a system font where the var isn't defined - i.e. on native,
        // where RN's style system doesn't resolve CSS custom properties at all; Expo
        // would need its own expo-font setup to load these there, not done here since
        // this pass is scoped to web.
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        // Headings/titles (org names, page titles) - "Libre Baskerville" in Figma.
        serif: ["var(--font-libre-baskerville)", "Libre Baskerville", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
