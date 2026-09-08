"use client";

import React from "react";
import { Text, View } from "react-native";
import { useGetIndividualAboutPage, useGetOrgAboutPage } from "@support-me/api-client";
import { HtmlContent, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";

export type PublicAboutScreenProps =
  | { type: "IND"; slug: string }
  | { type: "ORG"; categorySlug: string; nameSlug: string };

/**
 * Guest-facing "wizytowka" (about) page - no authentication, matches SCRUM-183's public URL
 * structure. Backed by api-gateway's permitAll /api/v1/public/** endpoints.
 */
export function PublicAboutScreen(props: PublicAboutScreenProps) {
  const indQuery = useGetIndividualAboutPage(props.type === "IND" ? props.slug : "", {
    query: { enabled: props.type === "IND" },
  });
  const orgQuery = useGetOrgAboutPage(
    props.type === "ORG" ? props.categorySlug : "",
    props.type === "ORG" ? props.nameSlug : "",
    { query: { enabled: props.type === "ORG" } },
  );

  const { data: page, isLoading, isError, error } = props.type === "IND" ? indQuery : orgQuery;

  if (isLoading) return <Spinner fill />;

  if (isError || !page) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-background p-6">
        <Text className="font-serif text-xl font-bold text-foreground">Nie znaleziono</Text>
        <Text className="font-sans text-muted">
          {getErrorMessage(error, "Ta wizytówka nie istnieje albo została usunięta.")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[820px] gap-6 p-6 py-16">
        <Text className="font-serif text-[34px] font-bold leading-[1.12] text-foreground">
          {page.name}
        </Text>
        <HtmlContent html={page.aboutContent ?? ""} />
      </View>
    </View>
  );
}
