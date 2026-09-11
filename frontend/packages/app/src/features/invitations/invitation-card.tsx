"use client";

import React from "react";
import { Text, View } from "react-native";
import { Avatar, Badge, type AvatarTone } from "@support-me/ui";
import type { InvitationResponseDto } from "@support-me/api-client";
import { invitationStatusBadgeVariant, invitationStatusLabel } from "./shared";

export interface InvitationCardProps {
  avatarLabel: string;
  avatarTone?: AvatarTone;
  title: string;
  subtitle?: string;
  status?: InvitationResponseDto["status"];
  dateLabel: string;
  /** Optional note the inviting administrator wrote - shown as a quoted line when present. */
  message?: string | null;
  /** Resolved (ACCEPTED/DECLINED) invitations render dimmed, without actions. */
  archived?: boolean;
  actions?: React.ReactNode;
}

/**
 * Shared "business card" style row for one invitation - used by both the sent and received
 * screens with different data/actions passed in, so the status colors/labels (shared.ts) and
 * the active-vs-archive visual language stay identical across both.
 */
export function InvitationCard({
  avatarLabel,
  avatarTone,
  title,
  subtitle,
  status,
  dateLabel,
  message,
  archived = false,
  actions,
}: InvitationCardProps) {
  return (
    <View
      className={`flex-row gap-4 rounded-card-lg border border-line bg-background p-6 ${
        archived ? "opacity-60" : "shadow-sm"
      }`}
    >
      <Avatar label={avatarLabel} tone={avatarTone ?? (archived ? "neutral" : "accent")} />
      <View className="flex-1 gap-1.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="flex-1 font-serif text-[18px] font-bold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          {status ? (
            <Badge label={invitationStatusLabel(status)} variant={invitationStatusBadgeVariant(status)} />
          ) : null}
        </View>
        {subtitle ? <Text className="font-sans text-[13px] text-muted">{subtitle}</Text> : null}
        <Text className="font-sans text-[13px] text-muted">{dateLabel}</Text>
        {message ? (
          <View className="mt-1 rounded-card bg-secondary/10 px-3 py-2">
            <Text className="font-sans text-[13px] italic text-foreground">"{message}"</Text>
          </View>
        ) : null}
        {actions ? <View className="mt-2 flex-row gap-3">{actions}</View> : null}
      </View>
    </View>
  );
}
