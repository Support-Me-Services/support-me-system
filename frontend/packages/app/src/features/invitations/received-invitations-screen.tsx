"use client";

import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useAccept, useDecline, useListMine1, type InvitationResponseDto } from "@support-me/api-client";
import { Badge, Card, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";
import { invitationStatusBadgeVariant, invitationStatusLabel } from "./shared";

/**
 * SCRUM-189: every PENDING invitation addressed to the caller, across all organizations, with
 * accept/decline actions. Mirrors PendingDeletionsScreen's list+action+refetch pattern - an
 * accepted/declined item disappears because useListMine1() only ever returns PENDING ones.
 */
export function ReceivedInvitationsScreen() {
  const { data: invitations, isLoading, isError, error, refetch } = useListMine1();
  const accept = useAccept();
  const decline = useDecline();

  const handleAccept = async (id: string) => {
    await accept.mutateAsync({ id });
    await refetch();
  };

  const handleDecline = async (id: string) => {
    await decline.mutateAsync({ id });
    await refetch();
  };

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[760px] gap-6 p-6">
        <Text className="font-serif text-[28px] font-bold text-foreground">Odebrane zaproszenia</Text>

        {isLoading ? <Spinner fill /> : null}
        {isError ? <Text className="font-sans text-danger">{getErrorMessage(error)}</Text> : null}

        {!isLoading && !isError && invitations?.length === 0 ? (
          <Card>
            <Text className="font-sans text-muted">Nie masz żadnych oczekujących zaproszeń.</Text>
          </Card>
        ) : null}

        {accept.isError ? <Text className="font-sans text-danger">{getErrorMessage(accept.error)}</Text> : null}
        {decline.isError ? (
          <Text className="font-sans text-danger">{getErrorMessage(decline.error)}</Text>
        ) : null}

        <FlatList
          data={invitations ?? []}
          keyExtractor={(item) => item.id ?? ""}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }: { item: InvitationResponseDto }) => (
            <Card className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="font-serif text-[18px] font-bold text-foreground">
                  {item.organizationName}
                </Text>
                <Badge
                  label={invitationStatusLabel(item.status)}
                  variant={invitationStatusBadgeVariant(item.status)}
                />
              </View>
              <Text className="font-sans text-[13px] text-muted">
                Zaproszono przez: Administrator ·{" "}
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
              </Text>
              <View className="mt-2 flex-row gap-3">
                <Pressable
                  onPress={() => item.id && handleAccept(item.id)}
                  disabled={accept.isPending || decline.isPending}
                  className="self-start rounded-pill bg-accent px-5 py-3"
                >
                  <Text className="font-sans text-[14px] font-semibold text-accent-foreground">
                    Akceptuj
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => item.id && handleDecline(item.id)}
                  disabled={accept.isPending || decline.isPending}
                  className="self-start rounded-pill border border-line px-5 py-3"
                >
                  <Text className="font-sans text-[14px] font-semibold text-foreground">Odrzuć</Text>
                </Pressable>
              </View>
            </Card>
          )}
        />
      </View>
    </View>
  );
}
