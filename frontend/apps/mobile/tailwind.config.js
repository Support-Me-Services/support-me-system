const preset = require("../../packages/config/tailwind-preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "../../packages/*/src/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset"), preset],
  theme: {
    extend: {},
  },
  plugins: [],
};
