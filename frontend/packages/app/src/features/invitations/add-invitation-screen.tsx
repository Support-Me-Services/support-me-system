"use client";

import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Input } from "@support-me/ui";

/**
 * Own "Zaproszenia" nav entry (separate from Wysłane/Odebrane): a plain two-field form -
 * organization name and a free-text note. Unlike InviteMembersPanel (which looks up a real,
 * already-registered user by id and calls POST /organizations/{id}/invitations), this doesn't
 * target an existing organization or a searchable user - there's no backend endpoint yet for
 * "invite someone/some org not already in the system", so this screen only captures the two
 * fields for now and doesn't submit anywhere. Wire up the actual send once that's decided.
 */
export function AddInvitationScreen() {
  const [organizationName, setOrganizationName] = useState("");
  const [message, setMessage] = useState("");

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[760px] gap-6 p-6">
        <Text className="font-serif text-[28px] font-bold text-foreground">Dodaj zaproszenie</Text>

        <View className="gap-4 rounded-card-lg bg-background p-6 shadow-sm">
          <Input
            label="Organizacja"
            value={organizationName}
            onChangeText={setOrganizationName}
            placeholder="Nazwa organizacji lub osoby"
          />

          <Input
            label="Wiadomość"
            value={message}
            onChangeText={setMessage}
            placeholder="Napisz kilka słów..."
            multiline
          />

          <Pressable className="self-start rounded-pill bg-accent px-5 py-3">
            <Text className="font-sans text-[13px] font-semibold text-accent-foreground">
              Wyślij zaproszenie
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
