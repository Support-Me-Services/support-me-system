/**
 * Shared Tailwind / NativeWind theme preset for the support-me-system design system.
 *
 * This is a PLACEHOLDER. The real design tokens (colors, spacing, typography,
 * radii, shadows) should be extracted from the Figma file's "Variables" /
 * design tokens and slotted in below before any real UI work begins.
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
        // TODO(design-tokens): replace with Figma "Variables" color tokens
        // e.g. primary, secondary, surface, background, danger, success, etc.
        primary: {
          DEFAULT: "#2563eb", // TODO: placeholder blue, replace with brand primary
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#64748b", // TODO: placeholder slate, replace with brand secondary
          foreground: "#ffffff",
        },
        background: "#ffffff", // TODO: replace with token, add dark-mode counterpart
        foreground: "#0f172a", // TODO: replace with token
        muted: "#94a3b8", // TODO: replace with token
        danger: "#dc2626", // TODO: replace with token
      },
      spacing: {
        // TODO(design-tokens): replace with Figma spacing scale once extracted
      },
      borderRadius: {
        // TODO(design-tokens): replace with Figma corner-radius tokens
        sm: "4px",
        md: "8px",
        lg: "16px",
      },
      fontFamily: {
        // TODO(design-tokens): replace with Figma type tokens / custom fonts
        sans: ["System", "sans-serif"],
      },
    },
  },
  plugins: [],
};
