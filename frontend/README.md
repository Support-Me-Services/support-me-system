# support-me-system — frontend

A "write once, run everywhere" monorepo: one React codebase shared between a
Next.js web app and Expo (iOS/Android) apps, using
[Solito](https://solito.dev) to share routing/navigation logic between
Expo Router (native) and Next.js App Router (web).

## Stack

| Concern | Choice |
| --- | --- |
| Cross-platform framework | Expo + Next.js + Solito |
| Build orchestration | Turborepo |
| Package manager | pnpm (workspaces) |
| Server state / data fetching | TanStack Query v5 |
| API client generation | Orval (generates TanStack Query hooks from the `api-gateway` OpenAPI spec) |
| HTTP client | Axios (with auth interceptors) |
| Forms / validation | React Hook Form + Zod |
| Styling | NativeWind v4 (Tailwind syntax, works on RN + web via react-native-web) |
| Components | Custom design system (`packages/ui`), no third-party UI library |
| Auth | OIDC against Keycloak — `react-oidc-context` (web) / `expo-auth-session` (native), unified behind `useAuth()` |
| Rendering mode (web) | Client-rendered app served by `next start` (a real Next.js server) — data via REST, but genuinely dynamic routes need per-request rendering, not `output: "export"` |
| Language | TypeScript, strict mode |

## Rendering mode: server-rendered routing shell, not SSR data fetching

**Reverted from `output: "export"` (SCRUM-183)** — confirmed by a real failure: `output:
"export"` requires every dynamic App Router segment (`[id]`, `[slug]`, ...) to fully
enumerate its params via `generateStaticParams()`, enforced even under `next dev`, not just
`next build`. SCRUM-183 added routes whose params are genuinely created at runtime by users
(an organization's id, an IND/ORG "about" page slug) - there is no list to enumerate ahead of
time, so static export is fundamentally incompatible with these routes.

`apps/web` is now built and run as a normal Next.js server (`next build` + `next start`,
or `next dev` locally) instead of a static `out/` export. This is **not** a switch to
server-side data fetching, though: every screen is still a `"use client"` component doing its
own data fetching via TanStack Query/axios straight to the `api-gateway` REST API, exactly as
before - the only thing that changed is that route resolution for dynamic segments now happens
per-request on a live server instead of being fully pre-baked at build time. Next.js is still
used mainly for its file-based router, which is what lets Solito share routing/navigation code
with `apps/mobile`'s Expo Router.

### NativeWind + Next.js: three required pieces, easy to miss one

Confirmed by an actual broken render (page loaded, but every Tailwind class was
silently dropped — react-native-web only applied its own generated atomic
classes, none of ours). NativeWind on Next.js needs **all three** of these, or
`className` is a no-op on RN components:

1. `apps/web/tsconfig.json` (via `packages/config/tsconfig/nextjs.json`) —
   `compilerOptions.jsxImportSource: "nativewind"`. This is the actual switch:
   it routes JSX through NativeWind's own runtime instead of React's default,
   which is what makes `className` do anything at all. Next's SWC compiler
   reads this directly — no `babel.config.js` needed.
2. `apps/web/next.config.js` — `transpilePackages` must include
   `"react-native-css-interop"` (NativeWind's runtime dependency), not just
   `"nativewind"` itself.
3. `apps/web/tailwind.config.js` — `presets` must include
   `require("nativewind/preset")`, not just this repo's own shared preset.

If you add another Next.js app later, or a screen renders unstyled again,
check these three first.

Two consequences to keep in mind when writing shared code in `packages/*`:
- Prefer `Image` from `react-native` (renders as a plain `<img>` via
  react-native-web) over `next/image` in any component meant to run on both
  web and mobile — `next/image`'s optimization API doesn't exist in static
  export anyway (`images.unoptimized: true` is set to make this explicit).
- Every screen/provider that uses hooks or context needs a `"use client"`
  directive at the top of the file (see `packages/app/src/provider.tsx` and
  `packages/app/src/features/home/screen.tsx` for the pattern) — Next.js App
  Router components are Server Components by default.

## Directory structure

```
frontend/
  apps/
    web/        Next.js 15 App Router app
    mobile/     Expo Router app (iOS/Android)
  packages/
    config/     Shared ESLint/Tailwind/tsconfig presets
    ui/         Design-system components (NativeWind-styled, cross-platform)
    app/        Solito convention: shared screens + providers (router-agnostic)
    api-client/ Orval-generated API hooks + axios instance/interceptors
    auth/       Shared OIDC useAuth()/AuthProvider abstraction
```

Each `packages/*` is consumed as raw TypeScript source (no build step) by
both `apps/web` (via Next.js `transpilePackages`) and `apps/mobile` (via
Metro, which transpiles workspace packages by default). This is the
standard pattern for Expo + Next.js + Solito monorepos and keeps iteration
fast — there is nothing to rebuild when you edit a shared package.

## Getting started

```bash
# from frontend/
pnpm install

# run everything (web + mobile dev servers) via Turborepo
pnpm dev

# or target one app
pnpm --filter @support-me/web dev
pnpm --filter @support-me/mobile dev

# build (web only produces a meaningful "build"; mobile uses `expo export`)
pnpm build

# lint / test / typecheck across the workspace
pnpm lint
pnpm test
pnpm typecheck
```

### Generating the API client

The API client (`packages/api-client`) is generated by
[Orval](https://orval.dev) from the OpenAPI spec produced by the backend
`api-gateway` service. Until there is a shared pipeline for this, copy the
generated `openapi.json` from the backend build into
`backend/api-gateway-openapi.json` (relative to the repo root), then run:

```bash
pnpm generate:api
```

See `packages/api-client/orval.config.ts` for details.

### Environment variables

Each app needs Keycloak OIDC + API base URL environment variables. See
`packages/auth/README.md` for the full list and `.env.example` values.

## Known TODOs for a human

- [ ] `packages/config/tailwind-preset.js` — replace placeholder colors /
      spacing / radii / fonts with real design tokens extracted from the
      Figma file's Variables, once the Figma design system is finalized.
- [ ] `packages/auth` — finalize the token-refresh wiring between
      `packages/auth` and `packages/api-client`'s axios response
      interceptor (see TODO comments in both packages).
- [ ] `packages/api-client/orval.config.ts` — replace the manual
      "copy the OpenAPI spec by hand" step with an automated fetch/CI step
      once the backend `api-gateway` build pipeline exists.
- [ ] `apps/mobile/app.json` — replace placeholder bundle identifiers
      (`com.supportmesystem.app`) and add real app icon / splash assets
      before any real build.
- [ ] Add real app icons/splash images under `apps/mobile/assets/` (omitted
      from this skeleton to avoid referencing missing files).
- [ ] Decide and wire up an actual test runner (Jest/Vitest + React Native
      Testing Library) — the `test` Turborepo task is defined but no test
      tooling is installed yet in this skeleton.
