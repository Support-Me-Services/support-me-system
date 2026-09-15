"use client";

import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSearch,
  useSendInvitation,
  getListSentQueryKey,
  type UserSearchResultDto,
} from "@support-me/api-client";
import { Avatar, Badge, Input, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";

export interface InviteMembersPanelProps {
  organizationId: string;
}

/** Debounces `value` by `delayMs` - avoids firing a search request on every keystroke. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}

/**
 * SCRUM-188: ORG administrator searches users by email/name and invites them. Server-side,
 * OrganizationController.sendInvitation already blocks non-administrators and duplicate
 * invites/memberships (see OrganizationDetailScreen, which only renders this tab for ORG
 * organizations) - this is just the UI for it.
 */
export function InviteMembersPanel({ organizationId }: InviteMembersPanelProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<UserSearchResultDto | null>(null);
  const [message, setMessage] = useState("");

  const {
    data: results,
    isFetching,
    isError,
    error,
  } = useSearch(
    { query: debouncedQuery },
    { query: { enabled: debouncedQuery.length >= 2 } },
  );

  const sendInvitation = useSendInvitation({
    mutation: {
      // Without this, OrgSentInvitationsPanel (this same "Zaproszenia" tab, just below) and the
      // global SentInvitationsScreen keep serving their cached list until it goes stale, so a
      // just-sent invitation doesn't show up there until a manual refresh.
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSentQueryKey() }),
    },
  });

  const handleSend = async () => {
    if (!selectedUser?.id) return;
    await sendInvitation.mutateAsync({
      id: organizationId,
      data: { invitedUserId: selectedUser.id, message: message.trim() || undefined },
    });
    setSentTo((prev) => new Set(prev).add(selectedUser.id!));
    setSelectedUser(null);
    setMessage("");
  };

  const selectUser = (user: UserSearchResultDto) => {
    setSelectedUser((prev) => (prev?.id === user.id ? null : user));
    sendInvitation.reset();
  };

  return (
    <View className="gap-4 rounded-card-lg bg-background p-6 shadow-sm">
      <Text className="font-serif text-[20px] font-bold text-foreground">Zaproś do organizacji</Text>

      <Input
        label="Szukaj po e-mailu lub nazwie"
        value={query}
        onChangeText={setQuery}
        placeholder="jan.kowalski@example.com"
      />

      <Input
        label="Wiadomość (opcjonalnie)"
        value={message}
        onChangeText={setMessage}
        placeholder="Napisz kilka słów do tej osoby..."
        multiline
      />

      {debouncedQuery.length > 0 && debouncedQuery.length < 2 ? (
        <Text className="font-sans text-[13px] text-muted">Wpisz co najmniej 2 znaki.</Text>
      ) : null}

      {isFetching ? <Spinner /> : null}
      {isError ? <Text className="font-sans text-danger">{getErrorMessage(error)}</Text> : null}
      {sendInvitation.isError ? (
        <Text className="font-sans text-danger">{getErrorMessage(sendInvitation.error)}</Text>
      ) : null}

      {!isFetching && debouncedQuery.length >= 2 && results?.length === 0 ? (
        <Text className="font-sans text-[14px] text-muted">
          Brak użytkowników pasujących do wyszukiwania.
        </Text>
      ) : null}

      <View className="gap-2">
        {(results ?? []).map((user) => {
          const alreadySent = Boolean(user.id && sentTo.has(user.id));
          const isSelected = Boolean(user.id && selectedUser?.id === user.id);
          const initial = user.name?.trim().charAt(0).toUpperCase() || "?";
          return (
            <Pressable
              key={user.id}
              onPress={() => !alreadySent && selectUser(user)}
              disabled={alreadySent}
              className={`flex-row items-center gap-3 rounded-card-lg border px-4 py-3 shadow-sm ${
                isSelected ? "border-accent bg-accent/5" : "border-line bg-background"
              }`}
            >
              <Avatar label={initial} tone="accent" />
              <View className="flex-1 gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                <View className="sm:min-w-0 sm:flex-1">
                  <Text
                    className="font-sans text-[14px] font-semibold text-foreground"
                    numberOfLines={1}
                  >
                    {user.name}
                  </Text>
                </View>
                <View className="sm:min-w-0 sm:flex-1">
                  <Text className="font-sans text-[13px] text-muted" numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              </View>
              {alreadySent ? (
                <Badge label="Zaproszenie wysłane ✓" variant="success" />
              ) : isSelected ? (
                <Badge label="Wybrano" variant="accent" />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View className="gap-2">
        <Pressable
          onPress={handleSend}
          disabled={!selectedUser || sendInvitation.isPending}
          className={`self-start rounded-pill bg-accent px-5 py-3 ${
            !selectedUser || sendInvitation.isPending ? "opacity-50" : ""
          }`}
        >
          <Text className="font-sans text-[13px] font-semibold text-accent-foreground">
            Wyślij zaproszenie
          </Text>
        </Pressable>
        {!selectedUser && results?.length ? (
          <Text className="font-sans text-[13px] text-muted">
            Wybierz osobę z listy powyżej, aby wysłać zaproszenie.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
