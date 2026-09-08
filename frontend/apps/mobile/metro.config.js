const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Monorepo root (frontend/), two levels up from apps/mobile.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo, not just apps/mobile.
config.watchFolders = [workspaceRoot];

// 2. Let Metro resolve node_modules from both the app dir and the
// workspace root (needed because pnpm hoists to the workspace root
// node_modules — see the root .npmrc `node-linker=hoisted` setting, which
// makes the pnpm layout Metro-friendly).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Force Metro to resolve duplicate packages (react, react-native, etc.)
// from a single location to avoid "Invalid hook call" / multiple-copies
// issues common in monorepos.
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: "./global.css" });
