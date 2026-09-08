const preset = require("../../packages/config/tailwind-preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "../../packages/*/src/**/*.{ts,tsx}",
  ],
  darkMode: "media", // TODO(design-tokens): confirm strategy (media vs class) once Figma defines dark mode
};
