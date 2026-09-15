"use client";

import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Link } from "solito/link";
import { useRouter } from "solito/navigation";
import { Button, Spinner } from "@support-me/ui";
import { useAuth } from "@support-me/auth";
import { useActiveOrganization } from "../organizations/active-organization";

/**
 * Minimal cross-platform screen, rendered by both:
 *   - apps/web/app/page.tsx        (Next.js App Router)
 *   - apps/mobile/app/index.tsx    (Expo Router)
 *
 * Router-agnostic per Solito's pattern: no navigation logic lives here.
 * Once more than one screen exists, use `solito/link` / `solito/router`
 * for cross-platform navigation between screens defined in this package.
 *
 * A signed-in user is sent straight into their last-active organization's context (see
 * ActiveOrganizationProvider) instead of landing here - this screen is then only ever seen
 * signed out, or for the brief moment before that redirect fires (shown as a spinner) or if the
 * user has no organizations yet (sent to /organizations, which prompts to create one).
 */
export function HomeScreen() {
  const { isAuthenticated, user, login, logout, authError } = useAuth();
  const router = useRouter();
  const { organizations, activeOrganizationId, isLoading: orgsLoading } = useActiveOrganization();

  const redirecting = isAuthenticated && (orgsLoading || activeOrganizationId !== null || organizations.length === 0);

  useEffect(() => {
    if (!isAuthenticated || orgsLoading) return;
    if (activeOrganizationId) {
      router.push(`/organizations/${activeOrganizationId}`);
    } else if (organizations.length === 0) {
      router.push("/organizations");
    }
  }, [isAuthenticated, orgsLoading, activeOrganizationId, organizations.length, router]);

  if (redirecting) {
    return <Spinner fill />;
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <Text className="text-2xl font-semibold text-foreground">
        support-me-system
      </Text>
      <Text className="text-base text-muted">
        {isAuthenticated
          ? `Signed in as ${user?.name ?? user?.email ?? user?.id}`
          : "Not signed in"}
      </Text>
      <Button
        label={isAuthenticated ? "Log out" : "Log in"}
        onPress={isAuthenticated ? logout : login}
      />
      {authError ? (
        <Text className="max-w-[320px] text-center text-sm text-danger">{authError}</Text>
      ) : null}
      {isAuthenticated ? (
        <Link href="/organizations">
          <Text className="font-sans text-[14px] font-semibold text-primary">
            Moje organizacje →
          </Text>
        </Link>
      ) : null}
    </View>
  );
}
