import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import {
  AuthRequest,
  type AuthRequestConfig,
  type DiscoveryDocument,
  exchangeCodeAsync,
  fetchDiscoveryAsync,
  makeRedirectUri,
  refreshAsync,
  useAutoDiscovery,
} from "expo-auth-session";

import { getDiscoveryUrl, oidcConfig } from "./config";

// Required so the auth session browser tab closes itself after redirecting
// back to the app via the custom scheme.
WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  /** Keycloak realm roles (from the access token's `realm_access.roles`), e.g. "SUPER_ADMIN". */
  roles: string[];
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: () => void;
  logout: () => void;
  /** Set when the last login attempt failed (or couldn't start) - null otherwise. Diagnostic
   *  aid for standalone builds, which have no Metro/dev-client console attached. */
  authError: string | null;
}

const LOG_PREFIX = "[auth]";

const SECURE_STORE_KEYS = {
  accessToken: "support_me.access_token",
  refreshToken: "support_me.refresh_token",
} as const;

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    // atob is available in Hermes/RN >= 0.74; falls back gracefully otherwise.
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const discoveryUrl = getDiscoveryUrl(oidcConfig);
  const discovery: DiscoveryDocument | null = useAutoDiscovery(discoveryUrl);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Diagnostic only - a standalone/preview build has no Metro console attached, so this is
  // otherwise invisible. Logs once on mount (config never changes at runtime) and again
  // whenever the discovery document's fetch resolves, since a failed/never-resolving fetch
  // (e.g. EXPO_PUBLIC_KEYCLOAK_URL wasn't actually baked into this build) is the most likely
  // cause of "nothing happens" when tapping Log in - see login()'s `if (!discovery)` guard.
  useEffect(() => {
    console.log(`${LOG_PREFIX} oidcConfig`, {
      authority: oidcConfig.authority,
      realm: oidcConfig.realm,
      clientId: oidcConfig.clientId,
      redirectUri: oidcConfig.redirectUri || "(unset - falls back to makeRedirectUri)",
      scope: oidcConfig.scope,
      discoveryUrl,
    });
  }, [discoveryUrl]);

  useEffect(() => {
    console.log(`${LOG_PREFIX} discovery document ${discovery ? "loaded" : "not yet loaded"}`, {
      discoveryUrl,
      authorizationEndpoint: discovery?.authorizationEndpoint,
    });
  }, [discovery, discoveryUrl]);

  // Restore any persisted session on mount.
  useEffect(() => {
    (async () => {
      const [storedAccess, storedRefresh] = await Promise.all([
        SecureStore.getItemAsync(SECURE_STORE_KEYS.accessToken),
        SecureStore.getItemAsync(SECURE_STORE_KEYS.refreshToken),
      ]);
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
      setIsLoading(false);
      console.log(`${LOG_PREFIX} restored session from SecureStore`, {
        hadAccessToken: Boolean(storedAccess),
        hadRefreshToken: Boolean(storedRefresh),
      });
    })();
  }, []);

  const persistTokens = useCallback(
    async (newAccessToken: string | null, newRefreshToken: string | null) => {
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      if (newAccessToken) {
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.accessToken,
          newAccessToken,
        );
      } else {
        await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.accessToken);
      }
      if (newRefreshToken) {
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.refreshToken,
          newRefreshToken,
        );
      } else {
        await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.refreshToken);
      }
    },
    [],
  );

  const login = useCallback(() => {
    setAuthError(null);
    console.log(`${LOG_PREFIX} login() called`, { discoveryReady: Boolean(discovery) });

    if (!discovery) {
      // Previously silently did nothing here - the single most confusing failure mode to
      // diagnose from a standalone build, since tapping the button looked like it did
      // literally nothing. Now at least visible via authError + this log line.
      const message =
        "Konfiguracja logowania jeszcze się nie załadowała (brak połączenia z serwerem " +
        `Keycloak pod adresem ${discoveryUrl}?). Spróbuj ponownie za chwilę.`;
      console.warn(`${LOG_PREFIX} login() aborted - discovery document not loaded yet`, {
        discoveryUrl,
      });
      setAuthError(message);
      return;
    }

    (async () => {
      try {
        const redirectUri =
          oidcConfig.redirectUri || makeRedirectUri({ scheme: "supportme" });
        console.log(`${LOG_PREFIX} starting auth request`, { redirectUri });

        const requestConfig: AuthRequestConfig = {
          clientId: oidcConfig.clientId,
          scopes: oidcConfig.scope.split(" "),
          redirectUri,
          // PKCE is enabled by default by AuthRequest (usePKCE: true).
          usePKCE: true,
        };

        const request = new AuthRequest(requestConfig);
        const result = await request.promptAsync(discovery);
        console.log(`${LOG_PREFIX} promptAsync result`, { type: result.type });

        const code = result.type === "success" ? result.params.code : undefined;
        if (result.type !== "success") {
          // type is "cancel" (user closed the browser tab) or "dismiss" - not an error, just
          // not proceeding; surfaced anyway since from the button's point of view it also
          // looks like "nothing happened".
          setAuthError(`Logowanie nie zostało ukończone (${result.type}).`);
          return;
        }
        if (!code || !request.codeVerifier) {
          setAuthError("Serwer logowania nie zwrócił oczekiwanego kodu autoryzacji.");
          console.warn(`${LOG_PREFIX} success result missing code/codeVerifier`, result);
          return;
        }

        console.log(`${LOG_PREFIX} exchanging code for tokens`);
        const tokenResult = await exchangeCodeAsync(
          {
            clientId: oidcConfig.clientId,
            code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier },
          },
          discovery,
        );

        await persistTokens(
          tokenResult.accessToken,
          tokenResult.refreshToken ?? null,
        );
        console.log(`${LOG_PREFIX} login complete, tokens persisted`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${LOG_PREFIX} login() failed`, error);
        setAuthError(`Logowanie nie powiodło się: ${message}`);
      }
    })();
  }, [discovery, discoveryUrl, persistTokens]);

  const logout = useCallback(() => {
    void persistTokens(null, null);
    // TODO: also call Keycloak's end-session endpoint
    // (`${issuer}/protocol/openid-connect/logout`) via WebBrowser to fully
    // clear the Keycloak SSO session, not just local tokens.
  }, [persistTokens]);

  // Token refresh for API calls is handled by the standalone
  // `refreshAccessToken()` below (reads/writes SecureStore directly, so it
  // works from `@support-me/api-client`'s axios instance outside React).
  // in-component state (`accessToken`/`refreshToken`) is only reloaded from
  // SecureStore on next mount/focus - acceptable since a 401-triggered
  // refresh mid-session is transparent to the UI either way.

  const user = useMemo<AuthUser | null>(() => {
    if (!accessToken) return null;
    const claims = decodeJwtPayload(accessToken);
    if (!claims) return null;
    const realmAccess = claims.realm_access as { roles?: unknown } | undefined;
    return {
      id: String(claims.sub ?? ""),
      email: typeof claims.email === "string" ? claims.email : undefined,
      name: typeof claims.name === "string" ? claims.name : undefined,
      roles: Array.isArray(realmAccess?.roles)
        ? (realmAccess.roles as string[])
        : [],
    };
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(accessToken),
      isLoading,
      user,
      accessToken,
      login,
      logout,
      authError,
    }),
    [accessToken, isLoading, user, login, logout, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be used within <AuthProvider>");
  }
  return ctx;
}

// Non-hook token accessors for `@support-me/api-client`'s axios instance,
// which runs outside React and can't call `useAuth()` itself. Reads/writes
// SecureStore directly rather than component state, since SecureStore is
// already the source of truth `AuthProvider` restores from on mount.
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_STORE_KEYS.accessToken);
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(
    SECURE_STORE_KEYS.refreshToken,
  );
  if (!refreshToken) return null;
  try {
    const discovery = await fetchDiscoveryAsync(getDiscoveryUrl(oidcConfig));
    const tokenResult = await refreshAsync(
      { clientId: oidcConfig.clientId, refreshToken },
      discovery,
    );
    await SecureStore.setItemAsync(
      SECURE_STORE_KEYS.accessToken,
      tokenResult.accessToken,
    );
    if (tokenResult.refreshToken) {
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.refreshToken,
        tokenResult.refreshToken,
      );
    }
    return tokenResult.accessToken;
  } catch (error) {
    console.error(`${LOG_PREFIX} refreshAccessToken() failed`, error);
    return null;
  }
}
