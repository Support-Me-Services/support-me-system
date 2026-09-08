const preset = require("../../packages/config/tailwind-preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // nativewind/preset must come first: it registers the transforms NativeWind
  // needs to turn `className` into cross-platform styles (see next.config.js's
  // transpilePackages + tsconfig's jsxImportSource for the other two required
  // pieces - all three were missing, confirmed by a real render with none of
  // our Tailwind classes applied).
  presets: [require("nativewind/preset"), preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "../../packages/*/src/**/*.{ts,tsx}",
  ],
  darkMode: "media", // TODO(design-tokens): confirm strategy (media vs class) once Figma defines dark mode
};
