import React from "react";
import { View, type ViewProps } from "react-native";

/** Bordered content container - matches Figma's "Give card" pattern (rounded-card-lg, --line border). */
export interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...viewProps }: CardProps) {
  return (
    <View
      {...viewProps}
      className={`w-full gap-1 rounded-card-lg border border-line bg-background p-6 ${className ?? ""}`}
    >
      {children}
    </View>
  );
}
