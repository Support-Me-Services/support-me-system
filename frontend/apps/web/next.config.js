/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // This app is a pure client-rendered SPA: no SEO requirement, no
  // server-side data fetching. `output: "export"` makes `next build`
  // emit a static apps/web/out/ folder (index.html + JS/CSS bundles) that
  // the browser loads ONCE; every screen is a "use client" component, so
  // all data/images after that initial load go through TanStack
  // Query/axios straight to the REST api-gateway. Deploy `out/` to any
  // static host or CDN — no Node server required in production.
  output: "export",
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
