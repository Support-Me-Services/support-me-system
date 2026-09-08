import React from "react";
import { Pressable, Text } from "react-native";

/**
 * Example / pattern component for the shared design system.
 *
 * This is intentionally the ONLY component scaffolded here — it exists to
 * establish the pattern (NativeWind `className` styling, works on both
 * React Native and react-native-web, typed variant props) that the rest of
 * the design system should follow once real components are built from the
 * Figma component library.
 *
 * TODO(design-system): replace ad-hoc className strings below with real
 * Figma-derived tokens from `@support-me/config/tailwind-preset` once
 * design tokens are extracted (colors, spacing, radii, typography).
 */

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps {
  /** Called when the button is pressed / clicked. */
  onPress: () => void;
  /** Visible text label. */
  label: string;
  /** Visual style variant. Defaults to "primary". */
  variant?: ButtonVariant;
  /** Disables interaction and dims the button. */
  disabled?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary active:bg-primary/80",
  secondary: "bg-secondary active:bg-secondary/80",
  danger: "bg-danger active:bg-danger/80",
};

export function Button({
  onPress,
  label,
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`items-center justify-center rounded-md px-4 py-3 ${VARIANT_CLASSES[variant]} ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Text className="text-base font-medium text-primary-foreground">
        {label}
      </Text>
    </Pressable>
  );
}
