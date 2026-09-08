/**
 * Public entry point for `@support-me/auth`.
 *
 * `useAuth` and `AuthProvider` are resolved automatically by the bundler at
 * build time via platform-specific file extensions:
 *   - Next.js (web) / webpack resolve `./use-auth.web.tsx`
 *   - Metro (Expo/React Native) resolve `./use-auth.native.tsx`
 *
 * Both files export the SAME shape (see `AuthContextValue` below), so every
 * consumer — apps/web, apps/mobile, and shared packages/app screens — can
 * call `useAuth()` uniformly without ever branching on platform.
 */
export { useAuth, AuthProvider } from "./use-auth";
export type { AuthContextValue, AuthUser } from "./use-auth";

export { oidcConfig, getIssuerUrl, getDiscoveryUrl } from "./config";
export type { OidcConfig } from "./config";
