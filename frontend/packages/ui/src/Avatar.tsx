import React from "react";
import { Text, View } from "react-native";

export type AvatarTone = "accent" | "neutral";

export interface AvatarProps {
  /** Single letter or short glyph shown in the circle - e.g. an initial, or "?" when identity is unknown. */
  label: string;
  /** "accent" for a known/real identity, "neutral" for a placeholder/unknown one. */
  tone?: AvatarTone;
}

const TONE_CLASSES: Record<AvatarTone, { bg: string; text: string }> = {
  accent: { bg: "bg-accent/10", text: "text-accent" },
  neutral: { bg: "bg-secondary/10", text: "text-secondary" },
};

/** Round initial/glyph avatar - used where a card needs to show "who" at a glance (org or person). */
export function Avatar({ label, tone = "accent" }: AvatarProps) {
  const { bg, text } = TONE_CLASSES[tone];
  return (
    <View className={`h-12 w-12 shrink-0 items-center justify-center rounded-full ${bg}`}>
      <Text className={`font-serif text-[18px] font-bold ${text}`}>{label}</Text>
    </View>
  );
}
