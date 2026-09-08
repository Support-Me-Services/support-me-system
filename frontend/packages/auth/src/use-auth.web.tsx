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
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: () => void;
  logout: () => void;
}

// react-oidc-context already provides its own context; we re-export a thin
// adapter so consumers depend only on the platform-agnostic shape above,
// never on react-oidc-context's types directly.
const AdapterContext = createContext<AuthContextValue | null>(null);

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

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: oidc.isAuthenticated,
      isLoading: oidc.isLoading,
      user: oidc.user
        ? {
            id: oidc.user.profile.sub,
            email: oidc.user.profile.email,
            name: oidc.user.profile.name,
          }
        : null,
      accessToken: oidc.user?.access_token ?? null,
      login: () => {
        void oidc.signinRedirect();
      },
      logout: () => {
        void oidc.signoutRedirect();
      },
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
