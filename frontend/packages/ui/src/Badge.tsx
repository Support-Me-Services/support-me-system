import React from "react";
import { Text, View } from "react-native";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-secondary/10",
  success: "bg-primary/10",
  warning: "bg-[#fff0b3]",
  danger: "bg-danger/10",
};

const TEXT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "text-secondary",
  success: "text-primary",
  warning: "text-[#946200]",
  danger: "text-danger",
};

/** Small rounded status label - e.g. organization status (ACTIVE/PENDING_DELETION/DELETED). */
export function Badge({ label, variant = "neutral" }: BadgeProps) {
  return (
    <View
      className={`self-start rounded-pill px-3 py-1 ${VARIANT_CLASSES[variant]}`}
    >
      <Text className={`font-sans text-[13px] font-semibold ${TEXT_CLASSES[variant]}`}>
        {label}
      </Text>
    </View>
  );
}
