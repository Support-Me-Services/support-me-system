/**
 * Shared ESLint config for the support-me-system frontend monorepo.
 * Consuming packages should create an `.eslintrc.js` like:
 *
 *   module.exports = { extends: ['@support-me/config/eslint-preset'] };
 */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "eslint-config-prettier",
  ],
  env: {
    es2020: true,
    node: true,
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".next/",
    ".expo/",
    ".turbo/",
    "generated/",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-imports": "warn",
  },
};
