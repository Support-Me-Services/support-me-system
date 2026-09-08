"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@support-me/auth";

/**
 * Single shared provider tree used by BOTH apps/web (Next.js App Router
 * layout) and apps/mobile (Expo Router root layout).
 *
 * Per Solito's convention, this package stays router-agnostic — it does NOT
 * import React Navigation or Next.js APIs. Each app wraps its own routing
 * shell around <Provider>, not the other way around.
 */
export function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // TODO(tuning): revisit once real API latency/characteristics
            // are known.
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
