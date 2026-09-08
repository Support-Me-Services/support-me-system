import { buildOidcConfig, type OidcConfig } from "./oidc-config-base";

export type { OidcConfig };
export { getIssuerUrl, getDiscoveryUrl } from "./oidc-config-base";

// TODO: once apps/mobile/app.json's `extra` block is wired up, prefer reading
// via `expo-constants` (`Constants.expoConfig?.extra`) instead of
// `EXPO_PUBLIC_*` env vars, which is friendlier to EAS Build secrets. Left as
// process.env reads for now so this file has no hard dependency on
// expo-constants at module-load time in non-Expo test environments.
export const oidcConfig: OidcConfig = buildOidcConfig({
  authority: process.env.EXPO_PUBLIC_KEYCLOAK_URL,
  realm: process.env.EXPO_PUBLIC_KEYCLOAK_REALM,
  clientId: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID,
  redirectUri: process.env.EXPO_PUBLIC_KEYCLOAK_REDIRECT_URI,
  scope: process.env.EXPO_PUBLIC_KEYCLOAK_SCOPE,
});
