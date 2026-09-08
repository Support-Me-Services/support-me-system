/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // NOT a static export (`output: "export"`) despite the original architecture note here -
  // reverted after a real failure: SCRUM-183 added genuinely dynamic, runtime-created public
  // routes (organization ids, IND/ORG "about" page slugs that only exist once a user creates
  // them) as dynamic App Router segments (`[id]`, `[slug]`, `[categorySlug]/[nameSlug]`).
  // `output: "export"` requires every dynamic segment to fully enumerate its params via
  // generateStaticParams() - enforced even under `next dev`, not just `next build` - which is
  // fundamentally incompatible with params that don't exist until a user creates them later.
  // Every screen is still a "use client" component doing its own data fetching via TanStack
  // Query/axios (no server-side data fetching/SSR data logic added), so this is otherwise
  // still deployed like an SPA - just via a Node server (`next start`) instead of static
  // files, so these routes can render on demand.
  images: {
    // Next's built-in Image Optimization API needs a Node server and is
    // unavailable in static export. Shared components should prefer
    // react-native's <Image> (via react-native-web, renders a plain
    // <img>) over next/image anyway, to stay usable from apps/mobile too.
    unoptimized: true,
  },

  // Required so Next.js's build pipeline transpiles TSX/JSX from these
  // packages (they ship raw source, no pre-build step) and, critically,
  // so it transpiles react-native / react-native-web / nativewind
  // themselves — they ship untranspiled ESM/Flow-ish syntax that Next
  // otherwise wouldn't process for node_modules.
  transpilePackages: [
    "react-native",
    "react-native-web",
    "nativewind",
    "react-native-css-interop",
    "solito",
    "@support-me/ui",
    "@support-me/app",
    "@support-me/api-client",
    "@support-me/auth",
  ],

  webpack: (config) => {
    // Standard Solito/react-native-web pattern: alias `react-native`
    // imports to `react-native-web` for the web bundle, and prefer
    // `.web.tsx`/`.web.ts` platform-specific files over their bare
    // counterparts.
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "react-native$": "react-native-web",
    };
    config.resolve.extensions = [
      ".web.tsx",
      ".web.ts",
      ".web.jsx",
      ".web.js",
      ...config.resolve.extensions,
    ];
    return config;
  },
};

module.exports = nextConfig;
