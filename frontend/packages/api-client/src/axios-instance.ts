import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import {
  getAccessToken,
  refreshAccessToken,
} from "@support-me/auth";

/**
 * Shared axios instance used by the Orval-generated hooks (as the custom
 * `mutator`, see orval.config.ts) as well as any hand-written API calls.
 *
 * Responsibilities:
 *   1. Resolve the API base URL per platform (web: process.env, native:
 *      Expo Constants / EXPO_PUBLIC_ env vars).
 *   2. Request interceptor: attach the current OIDC access token as a
 *      Bearer Authorization header (via @support-me/auth's non-hook
 *      getAccessToken() - this module runs outside React and can't call
 *      useAuth() itself).
 *   3. Response interceptor: on a 401, attempt a single token refresh and
 *      retry the original request; if refresh fails, propagate the error
 *      (the app-level auth state will reflect the user as logged out).
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

  return webBaseUrl ?? nativeBaseUrl ?? "http://localhost:8080";
}

const AXIOS_INSTANCE = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15_000,
});

AXIOS_INSTANCE.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  pendingRequests.push(cb);
}

function onRefreshed(token: string | null) {
  pendingRequests.forEach((cb) => cb(token));
  pendingRequests = [];
}

AXIOS_INSTANCE.interceptors.response.use(
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
          resolve(AXIOS_INSTANCE(originalRequest));
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
      return AXIOS_INSTANCE(originalRequest);
    } finally {
      isRefreshing = false;
    }
  },
);

/**
 * Orval's axios mutator contract: a function taking the generated request
 * config and returning `Promise<T>` of the response *data* (not the full
 * AxiosResponse). This is what every generated hook in `src/generated/`
 * actually calls - the configured `AXIOS_INSTANCE` above is an
 * implementation detail behind it, not the mutator itself.
 */
export const axiosInstance = <T,>(config: AxiosRequestConfig): Promise<T> => {
  return AXIOS_INSTANCE(config).then((response) => response.data);
};

export default axiosInstance;
