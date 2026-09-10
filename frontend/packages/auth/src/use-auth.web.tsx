"use client";

import React, { createContext, useContext, useMemo } from "react";
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
  type AuthProviderProps,
} from "react-oidc-context";

import { getIssuerUrl, oidcConfig } from "./config";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  /** Keycloak realm roles (from the access token's `realm_access.roles`), e.g. "SUPER_ADMIN". */
  roles: string[];
}

function decodeAccessTokenRoles(accessToken: string | undefined): string[] {
  if (!accessToken) return [];
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) return [];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { realm_access?: { roles?: string[] } };
    return Array.isArray(claims.realm_access?.roles)
      ? claims.realm_access.roles
      : [];
  } catch {
    return [];
  }
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: () => void;
  logout: () => void;
  /** Set when react-oidc-context reports an error (e.g. a failed callback) - null otherwise. */
  authError: string | null;
}

// react-oidc-context already provides its own context; we re-export a thin
// adapter so consumers depend only on the platform-agnostic shape above,
// never on react-oidc-context's types directly.
const AdapterContext = createContext<AuthContextValue | null>(null);

// Non-hook token accessors for `@support-me/api-client`'s axios instance,
// which runs outside React and can't call `useAuth()` itself. `AdapterBridge`
// is always mounted (packages/app's <Provider> wraps every screen), so these
// module-level values stay in sync with the latest oidc state for the
// lifetime of the app.
let latestAccessToken: string | null = null;
let latestSigninSilent: (() => Promise<unknown>) | null = null;

export async function getAccessToken(): Promise<string | null> {
  return latestAccessToken;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!latestSigninSilent) return null;
  try {
    const user = await latestSigninSilent();
    const token =
      (user as { access_token?: string } | null)?.access_token ?? null;
    latestAccessToken = token;
    return token;
  } catch {
    return null;
  }
}

const oidcProviderSettings: AuthProviderProps = {
  authority: getIssuerUrl(oidcConfig),
  client_id: oidcConfig.clientId,
  redirect_uri: oidcConfig.redirectUri,
  // Without this, oidc.signoutRedirect() sends the browser to Keycloak's
  // end-session endpoint with no way back — the user is logged out but
  // stranded there instead of returning to the app. Reuses redirectUri since
  // this is a single-page app with no dedicated logout-landing route.
  post_logout_redirect_uri: oidcConfig.redirectUri,
  scope: oidcConfig.scope,
  // TODO: tune once Keycloak client is finalized (silent renew, post-logout
  // redirect, response_mode, etc.)
  onSigninCallback: () => {
    // Strip OIDC params from the URL after a successful login redirect.
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

function AdapterBridge({ children }: { children: React.ReactNode }) {
  const oidc = useOidcAuth();

  latestAccessToken = oidc.user?.access_token ?? null;
  latestSigninSilent = () => oidc.signinSilent();

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: oidc.isAuthenticated,
      isLoading: oidc.isLoading,
      user: oidc.user
        ? {
            id: oidc.user.profile.sub,
            email: oidc.user.profile.email,
            name: oidc.user.profile.name,
            roles: decodeAccessTokenRoles(oidc.user.access_token),
          }
        : null,
      accessToken: oidc.user?.access_token ?? null,
      login: () => {
        void oidc.signinRedirect();
      },
      logout: () => {
        void oidc.signoutRedirect();
      },
      authError: oidc.error?.message ?? null,
    }),
    [oidc],
  );

  return (
    <AdapterContext.Provider value={value}>{children}</AdapterContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <OidcAuthProvider {...oidcProviderSettings}>
      <AdapterBridge>{children}</AdapterBridge>
    </OidcAuthProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AdapterContext);
  if (!ctx) {
    throw new Error("useAuth() must be used within <AuthProvider>");
  }
  return ctx;
}
