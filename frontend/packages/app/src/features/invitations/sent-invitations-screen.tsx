"use client";

import React from "react";
import { FlatList, Text, View } from "react-native";
import { useListSent, type InvitationResponseDto } from "@support-me/api-client";
import { Badge, Card, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";
import { invitationStatusBadgeVariant, invitationStatusLabel } from "./shared";

/**
 * Every invitation the caller has sent (any status), across every organization they
 * administer - read-only history counterpart to ReceivedInvitationsScreen. Unlike the received
 * list, this includes ACCEPTED/DECLINED ones too (so an admin can see what happened to an
 * invite they sent), and there's no accept/decline action - only the invitee can act on it.
 */
export function SentInvitationsScreen() {
  const { data: invitations, isLoading, isError, error } = useListSent();

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[760px] gap-6 p-6">
        <Text className="font-serif text-[28px] font-bold text-foreground">Wysłane zaproszenia</Text>

        {isLoading ? <Spinner fill /> : null}
        {isError ? <Text className="font-sans text-danger">{getErrorMessage(error)}</Text> : null}

        {!isLoading && !isError && invitations?.length === 0 ? (
          <Card>
            <Text className="font-sans text-muted">Nie wysłałeś jeszcze żadnych zaproszeń.</Text>
          </Card>
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
                Wysłano: {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
              </Text>
            </Card>
          )}
        />
      </View>
    </View>
  );
}
