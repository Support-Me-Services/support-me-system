import React from "react";
import { ActivityIndicator, View } from "react-native";

export interface SpinnerProps {
  /** Centers the spinner in the available space; use for full-screen/section loading states. */
  fill?: boolean;
}

export function Spinner({ fill = false }: SpinnerProps) {
  const indicator = <ActivityIndicator color="#1473c0" size="large" />;
  if (!fill) return indicator;
  return <View className="flex-1 items-center justify-center p-8">{indicator}</View>;
}
