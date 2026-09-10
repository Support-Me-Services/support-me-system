"use client";

import React from "react";
import { FlatList, Text, View } from "react-native";
import { Link } from "solito/link";
import { useListMine } from "@support-me/api-client";
import { Badge, Spinner } from "@support-me/ui";
import { useAuth } from "@support-me/auth";
import { getErrorMessage } from "../../lib/errors";
import type { OrganizationResponseDto } from "@support-me/api-client";
import { organizationPublicPath, typeLabel, statusBadgeVariant, statusLabel } from "./shared";

export function OrganizationsDashboardScreen() {
  const { user } = useAuth();
  const { data: organizations, isLoading, isError, error } = useListMine();

  return (
    <View className="flex-1 bg-band">
      <View className="mx-auto w-full max-w-[900px] gap-4 p-6 py-12">
        <View className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Text className="font-serif text-[28px] font-bold text-foreground sm:text-[32px]">
            Moje organizacje
          </Text>
          <Link href="/organizations/new">
            <View className="items-center justify-center self-start rounded-pill bg-accent px-6 py-4 sm:self-auto">
              <Text className="font-sans text-base font-semibold text-accent-foreground">
                + Nowa organizacja
              </Text>
            </View>
          </Link>
        </View>

        {user?.roles.includes("SUPER_ADMIN") ? (
          <Link href="/admin/organizations">
            <Text className="font-sans text-[14px] font-semibold text-accent">
              Panel Super Administratora →
            </Text>
          </Link>
        ) : null}

        {isLoading ? <Spinner fill /> : null}

        {isError ? (
          <Text className="font-sans text-danger">{getErrorMessage(error)}</Text>
        ) : null}

        {!isLoading && !isError && organizations?.length === 0 ? (
          <View className="w-full gap-1 rounded-card-lg bg-background p-6 shadow-sm">
            <Text className="font-sans text-muted">
              Nie masz jeszcze żadnej organizacji. Utwórz pierwszą, żeby uzyskać publiczną
              wizytówkę.
            </Text>
          </View>
        ) : null}

        <FlatList
          data={organizations ?? []}
          keyExtractor={(item) => item.id ?? item.slug ?? ""}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }: { item: OrganizationResponseDto }) => (
            <Link href={`/organizations/${item.id}`}>
              <View className="w-full gap-3 rounded-card-lg bg-background p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <View className="gap-1">
                  <Text className="font-serif text-[20px] font-bold text-foreground">
                    {item.name}
                  </Text>
                  <Text className="font-sans text-[13px] text-muted">
                    {organizationPublicPath(item)}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Badge label={typeLabel(item.type)} variant="neutral" />
                  <Badge label={statusLabel(item.status)} variant={statusBadgeVariant(item.status)} />
                </View>
              </View>
            </Link>
          )}
        />
      </View>
    </View>
  );
}
