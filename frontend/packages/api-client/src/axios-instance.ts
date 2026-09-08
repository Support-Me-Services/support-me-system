import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

/**
 * Shared axios instance used by the Orval-generated hooks (as the custom
 * `mutator`, see orval.config.ts) as well as any hand-written API calls.
 *
 * Responsibilities:
 *   1. Resolve the API base URL per platform (web: process.env, native:
 *      Expo Constants / EXPO_PUBLIC_ env vars).
 *   2. Request interceptor: attach the current OIDC access token as a
 *      Bearer Authorization header.
 *   3. Response interceptor: on a 401, attempt a single token refresh and
 *      retry the original request; if refresh fails, propagate the error
 *      (the app-level auth state will reflect the user as logged out).
 *
 * TODO(auth-integration): the calls into `@support-me/auth` below are left
 * as clearly-marked TODOs because the exact shape of the token
 * getter/refresher depends on finalizing packages/auth (see that package's
 * README "TODO" section). Once finalized, replace the placeholder
 * `getAccessToken` / `refreshAccessToken` functions with real imports, e.g.:
 *
 *   import { getStoredAccessToken, refreshAccessToken } from '@support-me/auth';
 */

function resolveBaseUrl(): string {
  // Web (Next.js): inlined at build time, must be NEXT_PUBLIC_-prefixed.
  const webBaseUrl =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined;

  // Native (Expo): EXPO_PUBLIC_ vars are inlined by the Expo/Metro bundler
  // in the same way NEXT_PUBLIC_ vars are by Next.js.
  const nativeBaseUrl =
    typeof process !== "undefined"
      ? process.env.EXPO_PUBLIC_API_BASE_URL
      : undefined;

  return (
    webBaseUrl ??
    nativeBaseUrl ??
    // TODO(local-dev): confirm the api-gateway's local dev port.
    "http://localhost:8080"
  );
}

// TODO(auth-integration): replace with the real accessor once
// packages/auth exposes a non-hook way to read the current token (the
// `useAuth()` hook itself can't be called outside of React). One option:
// have packages/auth also export a small subscribable token store that
// both the React hook and this axios instance read from.
async function getAccessToken(): Promise<string | null> {
  return null;
}

// TODO(auth-integration): replace with the real refresh call — on native
// this should call the `refreshAsync` flow implemented in
// packages/auth/src/use-auth.native.tsx (currently kept internal to that
// module); on web this should call `oidc.signinSilent()` from
// react-oidc-context. Both need to be exposed from packages/auth in a
// framework-agnostic way (see that package's TODOs).
async function refreshAccessToken(): Promise<string | null> {
  return null;
}

export const axiosInstance = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15_000,
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
);

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  pendingRequests.push(cb);
}

function onRefreshed(token: string | null) {
  pendingRequests.forEach((cb) => cb(token));
  pendingRequests = [];
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Another request already triggered a refresh; wait for it instead
      // of firing a second one.
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${token}`,
          };
          resolve(axiosInstance(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      onRefreshed(newToken);
      if (!newToken) {
        return Promise.reject(error);
      }
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      };
      return axiosInstance(originalRequest);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
