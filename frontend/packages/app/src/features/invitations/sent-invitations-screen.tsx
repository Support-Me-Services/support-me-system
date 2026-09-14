"use client";

import React from "react";
import { FlatList, Text, View } from "react-native";
import {
  useListSent,
  InvitationResponseDtoStatus,
  type InvitationResponseDto,
} from "@support-me/api-client";
import { Card, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";
import { InvitationCard } from "./invitation-card";
import { shortenUserId } from "./shared";

/**
 * Every invitation the caller has sent (any status), across every organization they
 * administer - read-only history counterpart to ReceivedInvitationsScreen. Unlike the received
 * list, this includes ACCEPTED/DECLINED ones too (so an admin can see what happened to an
 * invite they sent), and there's no accept/decline action - only the invitee can act on it.
 * Sending a new one lives on its own "Dodaj zaproszenie" nav entry (AddInvitationScreen), not
 * here - this screen is history/read-only.
 *
 * The DTO only carries invitedUserId (no email/name - see InvitationResponseDto), so "who this
 * is going to" can't be shown as a real name yet; the card says so explicitly instead of
 * pretending an id is a name.
 */
export function SentInvitationsScreen() {
  const { data: invitations, isLoading, isError, error } = useListSent();

  const pending = invitations?.filter((item) => item.status === InvitationResponseDtoStatus.PENDING) ?? [];
  const archive = invitations?.filter((item) => item.status !== InvitationResponseDtoStatus.PENDING) ?? [];

  const renderCard = (archived: boolean) =>
    function renderItem({ item }: { item: InvitationResponseDto }) {
      return (
        <InvitationCard
          avatarLabel="?"
          avatarTone="neutral"
          title={shortenUserId(item.invitedUserId)}
          subtitle={`Brak danych kontaktowych · Organizacja: ${item.organizationName ?? "-"}`}
          status={item.status}
          dateLabel={`Wysłano: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}`}
          message={item.message}
          archived={archived}
        />
      );
    };

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[760px] gap-6 p-6">
        <Text className="font-serif text-[28px] font-bold text-foreground">Wysłane zaproszenia</Text>

        {isLoading ? <Spinner fill /> : null}
        {isError ? <Text className="font-sans text-danger">{getErrorMessage(error)}</Text> : null}

        {!isLoading && !isError ? (
          <>
            <View className="gap-3">
              {pending.length === 0 ? (
                <Card>
                  <Text className="font-sans text-muted">Nie masz żadnych wysłanych zaproszeń.</Text>
                </Card>
              ) : (
                <FlatList
                  data={pending}
                  keyExtractor={(item) => item.id ?? ""}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: 12 }}
                  renderItem={renderCard(false)}
                />
              )}
            </View>

            <View className="gap-3">
              <Text className="font-serif text-[18px] font-bold text-foreground">Archiwum</Text>
              {archive.length === 0 ? (
                <Card>
                  <Text className="font-sans text-muted">
                    Nie masz jeszcze żadnych rozstrzygniętych zaproszeń.
                  </Text>
                </Card>
              ) : (
                <FlatList
                  data={archive}
                  keyExtractor={(item) => item.id ?? ""}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: 12 }}
                  renderItem={renderCard(true)}
                />
              )}
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
