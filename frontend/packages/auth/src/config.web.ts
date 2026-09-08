import { buildOidcConfig, type OidcConfig } from "./oidc-config-base";

export type { OidcConfig };
export { getIssuerUrl, getDiscoveryUrl } from "./oidc-config-base";

// NEXT_PUBLIC_ vars are statically inlined by Next.js at build time.
export const oidcConfig: OidcConfig = buildOidcConfig({
  authority: process.env.NEXT_PUBLIC_KEYCLOAK_URL,
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM,
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
  redirectUri: process.env.NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI,
  scope: process.env.NEXT_PUBLIC_KEYCLOAK_SCOPE,
});
