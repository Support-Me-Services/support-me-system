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
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: () => void;
  logout: () => void;
}

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
  const discovery: DiscoveryDocument | null = useAutoDiscovery(
    getDiscoveryUrl(oidcConfig),
  );

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!discovery) return;

    (async () => {
      const redirectUri =
        oidcConfig.redirectUri || makeRedirectUri({ scheme: "supportme" });

      const requestConfig: AuthRequestConfig = {
        clientId: oidcConfig.clientId,
        scopes: oidcConfig.scope.split(" "),
        redirectUri,
        // PKCE is enabled by default by AuthRequest (usePKCE: true).
        usePKCE: true,
      };

      const request = new AuthRequest(requestConfig);
      const result = await request.promptAsync(discovery);

      const code = result.type === "success" ? result.params.code : undefined;
      if (code && request.codeVerifier) {
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
      }
    })();
  }, [discovery, persistTokens]);

  const logout = useCallback(() => {
    void persistTokens(null, null);
    // TODO: also call Keycloak's end-session endpoint
    // (`${issuer}/protocol/openid-connect/logout`) via WebBrowser to fully
    // clear the Keycloak SSO session, not just local tokens.
  }, [persistTokens]);

  // TODO: wire this into packages/api-client's axios response interceptor so
  // a 401 triggers `refreshAsync` here and retries the original request.
  const refresh = useCallback(async () => {
    if (!discovery || !refreshToken) return null;
    const tokenResult = await refreshAsync(
      { clientId: oidcConfig.clientId, refreshToken },
      discovery,
    );
    await persistTokens(
      tokenResult.accessToken,
      tokenResult.refreshToken ?? refreshToken,
    );
    return tokenResult.accessToken;
  }, [discovery, refreshToken, persistTokens]);

  // Expose refresh on the module scope so api-client can eventually import
  // it directly if needed (kept internal/undocumented for now).
  void refresh;

  const user = useMemo<AuthUser | null>(() => {
    if (!accessToken) return null;
    const claims = decodeJwtPayload(accessToken);
    if (!claims) return null;
    return {
      id: String(claims.sub ?? ""),
      email: typeof claims.email === "string" ? claims.email : undefined,
      name: typeof claims.name === "string" ? claims.name : undefined,
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
    }),
    [accessToken, isLoading, user, login, logout],
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
