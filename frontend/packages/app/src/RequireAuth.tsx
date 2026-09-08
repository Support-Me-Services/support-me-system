"use client";

import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@support-me/auth";
import { Spinner } from "@support-me/ui";

export interface RequireAuthProps {
  children: React.ReactNode;
  /** If given, also requires this Keycloak realm role (e.g. "SUPER_ADMIN") - shows an access-denied message rather than redirecting. */
  role?: string;
}

/**
 * Route guard: redirects to Keycloak login if not authenticated, otherwise renders
 * `children`. This is the first guard in the codebase - no existing pattern to follow, see
 * packages/auth's useAuth() for the underlying isAuthenticated/isLoading/user shape.
 *
 * UI-level gating only: the real enforcement for both auth and roles happens server-side
 * (api-gateway's SecurityConfig) - this just avoids flashing protected content or a broken
 * screen before the redirect/rejection would happen anyway.
 */
export function RequireAuth({ children, role }: RequireAuthProps) {
  const { isAuthenticated, isLoading, user, login } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login();
    }
  }, [isLoading, isAuthenticated, login]);

  if (isLoading || !isAuthenticated) {
    return <Spinner fill />;
  }

  if (role && !user?.roles.includes(role)) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-background p-6">
        <Text className="font-serif text-xl font-bold text-foreground">Brak dostępu</Text>
        <Text className="font-sans text-muted">
          Ta sekcja wymaga roli {role}.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
