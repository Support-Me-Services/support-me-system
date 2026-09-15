"use client";

import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDelete,
  useListSent,
  getListSentQueryKey,
  InvitationResponseDtoStatus,
  type InvitationResponseDto,
} from "@support-me/api-client";
import { Card, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";
import { InvitationCard } from "./invitation-card";
import { shortenUserId } from "./shared";

export interface OrgSentInvitationsPanelProps {
  organizationId: string;
}

/**
 * ORG administrator's view of invitations sent for THIS organization specifically - a
 * scoped-down counterpart to the global SentInvitationsScreen (which spans every organization
 * the caller administers). Adds the one action that screen doesn't have: deleting a sent
 * invitation, regardless of its status (see InvitationController.delete / InvitationService.delete
 * - admin-only, works on PENDING/ACCEPTED/DECLINED alike).
 */
export function OrgSentInvitationsPanel({ organizationId }: OrgSentInvitationsPanelProps) {
  const queryClient = useQueryClient();
  const { data: allSent, isLoading, isError, error } = useListSent();
  const deleteInvitation = useDelete({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSentQueryKey() }),
    },
  });

  const invitations = (allSent ?? []).filter((item) => item.organizationId === organizationId);

  const handleDelete = async (id?: string) => {
    if (!id) return;
    await deleteInvitation.mutateAsync({ id });
  };

  return (
    <View className="gap-3 rounded-card-lg bg-background p-6 shadow-sm">
      <Text className="font-serif text-[20px] font-bold text-foreground">Wysłane zaproszenia</Text>

      {isLoading ? <Spinner /> : null}
      {isError ? <Text className="font-sans text-danger">{getErrorMessage(error)}</Text> : null}
      {deleteInvitation.isError ? (
        <Text className="font-sans text-danger">{getErrorMessage(deleteInvitation.error)}</Text>
      ) : null}

      {!isLoading && !isError && invitations.length === 0 ? (
        <Card>
          <Text className="font-sans text-muted">Ta organizacja nie wysłała jeszcze żadnych zaproszeń.</Text>
        </Card>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id ?? ""}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }: { item: InvitationResponseDto }) => (
            <InvitationCard
              avatarLabel="?"
              avatarTone="neutral"
              title={shortenUserId(item.invitedUserId)}
              status={item.status}
              dateLabel={`Wysłano: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}`}
              message={item.message}
              archived={item.status !== InvitationResponseDtoStatus.PENDING}
              actions={
                <Pressable
                  onPress={() => handleDelete(item.id)}
                  disabled={deleteInvitation.isPending}
                  className={`self-start rounded-pill border border-danger px-5 py-3 ${
                    deleteInvitation.isPending ? "opacity-50" : ""
                  }`}
                >
                  <Text className="font-sans text-[13px] font-semibold text-danger">Usuń</Text>
                </Pressable>
              }
            />
          )}
        />
      )}
    </View>
  );
}
