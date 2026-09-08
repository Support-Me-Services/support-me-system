import React from "react";
import { Text } from "react-native";

export interface HtmlContentProps {
  html: string;
}

/**
 * Native fallback: strips tags down to plain text. No HTML rendering library is wired up for
 * RN yet (e.g. react-native-render-html) - out of scope for this pass, which targets web.
 */
export function HtmlContent({ html }: HtmlContentProps) {
  const plainText = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return <Text className="font-sans text-[16px] leading-6 text-foreground">{plainText}</Text>;
}
