"use client";

import React from "react";
import { FlatList, Text, View } from "react-native";
import { Link } from "solito/link";
import { useListMine } from "@support-me/api-client";
import { Badge, Card, Spinner } from "@support-me/ui";
import { useAuth } from "@support-me/auth";
import { getErrorMessage } from "../../lib/errors";
import type { OrganizationResponseDto } from "@support-me/api-client";
import { organizationPublicPath, typeLabel, statusBadgeVariant, statusLabel } from "./shared";

export function OrganizationsDashboardScreen() {
  const { user } = useAuth();
  const { data: organizations, isLoading, isError, error } = useListMine();

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[760px] gap-6 p-6">
        <View className="flex-row items-center justify-between">
          <Text className="font-serif text-[28px] font-bold text-foreground">
            Moje organizacje
          </Text>
          <Link href="/organizations/new">
            <View className="items-center justify-center rounded-pill bg-primary px-6 py-4">
              <Text className="font-sans text-base font-semibold text-primary-foreground">
                + Nowa organizacja
              </Text>
            </View>
          </Link>
        </View>

        {user?.roles.includes("SUPER_ADMIN") ? (
          <Link href="/admin/organizations">
            <Text className="font-sans text-[14px] font-semibold text-primary">
              Panel Super Administratora →
            </Text>
          </Link>
        ) : null}

        {isLoading ? <Spinner fill /> : null}

        {isError ? (
          <Text className="font-sans text-danger">{getErrorMessage(error)}</Text>
        ) : null}

        {!isLoading && !isError && organizations?.length === 0 ? (
          <Card>
            <Text className="font-sans text-muted">
              Nie masz jeszcze żadnej organizacji. Utwórz pierwszą, żeby uzyskać publiczną
              wizytówkę.
            </Text>
          </Card>
        ) : null}

        <FlatList
          data={organizations ?? []}
          keyExtractor={(item) => item.id ?? item.slug ?? ""}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }: { item: OrganizationResponseDto }) => (
            <Link href={`/organizations/${item.id}`}>
              <Card>
                <View className="flex-row items-center justify-between">
                  <Text className="font-serif text-[20px] font-bold text-foreground">
                    {item.name}
                  </Text>
                  <View className="flex-row gap-2">
                    <Badge label={typeLabel(item.type)} variant="neutral" />
                    <Badge label={statusLabel(item.status)} variant={statusBadgeVariant(item.status)} />
                  </View>
                </View>
                <Text className="font-sans text-[13px] text-muted">
                  {organizationPublicPath(item)}
                </Text>
              </Card>
            </Link>
          )}
        />
      </View>
    </View>
  );
}
