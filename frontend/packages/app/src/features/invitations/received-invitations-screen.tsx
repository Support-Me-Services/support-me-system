"use client";

import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useAccept, useDecline, useListMine1, type InvitationResponseDto } from "@support-me/api-client";
import { Card, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";
import { InvitationCard } from "./invitation-card";

/**
 * SCRUM-189: every PENDING invitation addressed to the caller, across all organizations, with
 * accept/decline actions. Mirrors PendingDeletionsScreen's list+action+refetch pattern - an
 * accepted/declined item disappears because useListMine1() only ever returns PENDING ones, so
 * there is no data source yet for a real "archive" section below (see the placeholder there -
 * a backend endpoint returning all statuses, mirroring useListSent, would be needed first).
 *
 * The DTO doesn't carry who sent the invitation (invitedByUserId isn't exposed on
 * InvitationResponseDto - see shared.ts), so the card says that plainly instead of the old
 * hardcoded "Zaproszono przez: Administrator" placeholder, which wasn't real data.
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

  const renderCard = ({ item }: { item: InvitationResponseDto }) => (
    <InvitationCard
      avatarLabel={item.organizationName?.trim().charAt(0).toUpperCase() || "?"}
      title={item.organizationName ?? "-"}
      subtitle="Kto zaprosił: dane niedostępne"
      status={item.status}
      dateLabel={`Otrzymano: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}`}
      message={item.message}
      actions={
        <>
          <Pressable
            onPress={() => item.id && handleAccept(item.id)}
            disabled={accept.isPending || decline.isPending}
            className="self-start rounded-pill bg-accent px-5 py-3"
          >
            <Text className="font-sans text-[14px] font-semibold text-accent-foreground">Akceptuj</Text>
          </Pressable>
          <Pressable
            onPress={() => item.id && handleDecline(item.id)}
            disabled={accept.isPending || decline.isPending}
            className="self-start rounded-pill border border-line px-5 py-3"
          >
            <Text className="font-sans text-[14px] font-semibold text-foreground">Odrzuć</Text>
          </Pressable>
        </>
      }
    />
  );

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[760px] gap-6 p-6">
        <Text className="font-serif text-[28px] font-bold text-foreground">Odebrane zaproszenia</Text>

        {isLoading ? <Spinner fill /> : null}
        {isError ? <Text className="font-sans text-danger">{getErrorMessage(error)}</Text> : null}
        {accept.isError ? <Text className="font-sans text-danger">{getErrorMessage(accept.error)}</Text> : null}
        {decline.isError ? (
          <Text className="font-sans text-danger">{getErrorMessage(decline.error)}</Text>
        ) : null}

        {!isLoading && !isError ? (
          <View className="gap-3">
            <Text className="font-serif text-[18px] font-bold text-foreground">Oczekujące</Text>
            {invitations?.length === 0 ? (
              <Card>
                <Text className="font-sans text-muted">Nie masz żadnych oczekujących zaproszeń.</Text>
              </Card>
            ) : (
              <FlatList
                data={invitations ?? []}
                keyExtractor={(item) => item.id ?? ""}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
                renderItem={renderCard}
              />
            )}
          </View>
        ) : null}

        <View className="gap-3">
          <Text className="font-serif text-[18px] font-bold text-foreground">Archiwum</Text>
          <Card>
            <Text className="font-sans text-muted">Historia będzie dostępna wkrótce.</Text>
          </Card>
        </View>
      </View>
    </View>
  );
}
