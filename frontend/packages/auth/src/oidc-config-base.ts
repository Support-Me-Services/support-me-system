/**
 * Shared OIDC (Keycloak) config shape + pure helpers.
 *
 * This file must stay platform-agnostic (no `window`/`document`/`process.env`
 * reads) — resolving the actual `oidcConfig` value happens per-platform in
 * `config.web.ts` / `config.native.ts`, following the same `.web`/`.native`
 * file-suffix convention as `use-auth.web.tsx` / `use-auth.native.tsx`
 * (resolved automatically by Next's webpack config on web and by Metro's
 * built-in platform resolution on native — see this package's README).
 */

export interface OidcConfig {
  /** Base URL of the Keycloak server, e.g. https://auth.example.com */
  authority: string;
  /** Keycloak realm name. */
  realm: string;
  /** OIDC client id registered in Keycloak for this app. */
  clientId: string;
  /** Redirect URI Keycloak should send the user back to after login.
   *  Web: an https URL (e.g. http://localhost:3000/auth/callback).
   *  Native: a custom scheme URI (e.g. supportme://auth/callback), matching
   *  the `scheme` configured in apps/mobile/app.json. */
  redirectUri: string;
  /** OIDC scopes to request. */
  scope: string;
}

const DEFAULT_SCOPE = "openid profile email";

/** Fills in defaults for any fields missing from env-sourced config. */
export function buildOidcConfig(raw: Partial<OidcConfig>): OidcConfig {
  return {
    authority: raw.authority ?? "",
    realm: raw.realm ?? "",
    clientId: raw.clientId ?? "",
    redirectUri: raw.redirectUri ?? "",
    scope: raw.scope ?? DEFAULT_SCOPE,
  };
}

/** Full Keycloak realm issuer URL, e.g. https://auth.example.com/realms/support-me */
export function getIssuerUrl(config: OidcConfig): string {
  return `${config.authority.replace(/\/$/, "")}/realms/${config.realm}`;
}

/** Keycloak's OIDC discovery document URL for the configured realm. */
export function getDiscoveryUrl(config: OidcConfig): string {
  return `${getIssuerUrl(config)}/.well-known/openid-configuration`;
}
