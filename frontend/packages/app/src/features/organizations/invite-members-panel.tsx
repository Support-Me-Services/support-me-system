"use client";

import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSearch, useSendInvitation, type UserSearchResultDto } from "@support-me/api-client";
import { Input, Spinner } from "@support-me/ui";
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
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const {
    data: results,
    isFetching,
    isError,
    error,
  } = useSearch(
    { query: debouncedQuery },
    { query: { enabled: debouncedQuery.length >= 2 } },
  );

  const sendInvitation = useSendInvitation();

  const handleInvite = async (user: UserSearchResultDto) => {
    if (!user.id) return;
    await sendInvitation.mutateAsync({ id: organizationId, data: { invitedUserId: user.id } });
    setSentTo((prev) => new Set(prev).add(user.id!));
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
          return (
            <View
              key={user.id}
              className="flex-row items-center justify-between rounded-card border border-line px-4 py-3"
            >
              <View className="gap-0.5">
                <Text className="font-sans text-[14px] font-semibold text-foreground">{user.name}</Text>
                <Text className="font-sans text-[13px] text-muted">{user.email}</Text>
              </View>
              {alreadySent ? (
                <Text className="font-sans text-[13px] font-semibold text-accent">
                  Zaproszenie wysłane ✓
                </Text>
              ) : (
                <Pressable
                  onPress={() => handleInvite(user)}
                  disabled={sendInvitation.isPending}
                  className={`rounded-pill bg-accent px-4 py-2 ${sendInvitation.isPending ? "opacity-50" : ""}`}
                >
                  <Text className="font-sans text-[13px] font-semibold text-accent-foreground">Zaproś</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
