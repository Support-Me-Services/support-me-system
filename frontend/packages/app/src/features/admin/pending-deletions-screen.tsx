"use client";

import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useApproveDeletion, useListPendingDeletion, type OrganizationResponseDto } from "@support-me/api-client";
import { Card, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";

/** Super Administrator dashboard: system-wide ORG deletion approval (SCRUM-183). Route-gated by RequireAuth role="SUPER_ADMIN". */
export function PendingDeletionsScreen() {
  const { data: organizations, isLoading, isError, error, refetch } = useListPendingDeletion();
  const approveDeletion = useApproveDeletion();

  const handleApprove = async (id: string) => {
    await approveDeletion.mutateAsync({ id });
    await refetch();
  };

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[760px] gap-6 p-6">
        <Text className="font-serif text-[28px] font-bold text-foreground">
          Organizacje do usunięcia
        </Text>

        {isLoading ? <Spinner fill /> : null}
        {isError ? <Text className="font-sans text-danger">{getErrorMessage(error)}</Text> : null}

        {!isLoading && !isError && organizations?.length === 0 ? (
          <Card>
            <Text className="font-sans text-muted">Brak organizacji oczekujących na usunięcie.</Text>
          </Card>
        ) : null}

        {approveDeletion.isError ? (
          <Text className="font-sans text-danger">{getErrorMessage(approveDeletion.error)}</Text>
        ) : null}

        <FlatList
          data={organizations ?? []}
          keyExtractor={(item) => item.id ?? ""}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }: { item: OrganizationResponseDto }) => (
            <Card className="gap-2">
              <Text className="font-serif text-[18px] font-bold text-foreground">{item.name}</Text>
              <Text className="font-sans text-[13px] text-muted">
                Kategoria: {item.category} · Zgłoszono:{" "}
                {item.deletionRequestedAt ? new Date(item.deletionRequestedAt).toLocaleString() : "-"}
              </Text>
              <Pressable
                onPress={() => item.id && handleApprove(item.id)}
                disabled={approveDeletion.isPending}
                className="mt-2 self-start rounded-pill bg-danger px-5 py-3"
              >
                <Text className="font-sans text-[14px] font-semibold text-white">
                  Zatwierdź usunięcie
                </Text>
              </Pressable>
            </Card>
          )}
        />
      </View>
    </View>
  );
}
