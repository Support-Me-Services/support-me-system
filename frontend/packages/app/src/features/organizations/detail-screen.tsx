"use client";

import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import {
  useGet,
  useUpdateAboutPage,
  useStartDeletion,
  useConfirmDeletion,
  useRequestDeletion,
  useWithdrawDeletionRequest,
  OrganizationResponseDtoType,
  OrganizationResponseDtoStatus,
  type DeletionConfirmationStartedDto,
} from "@support-me/api-client";
import { Badge, Card, RichTextEditor, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";
import { organizationPublicPath, statusBadgeVariant, statusLabel, typeLabel } from "./shared";

export interface OrganizationDetailScreenProps {
  organizationId: string;
}

export function OrganizationDetailScreen({ organizationId }: OrganizationDetailScreenProps) {
  const { data: organization, isLoading, isError, error, refetch } = useGet(organizationId);

  const updateAboutPage = useUpdateAboutPage();
  const startDeletion = useStartDeletion();
  const confirmDeletion = useConfirmDeletion();
  const requestDeletion = useRequestDeletion();
  const withdrawDeletionRequest = useWithdrawDeletionRequest();

  const [aboutDraft, setAboutDraft] = useState("");
  const loadedForId = useRef<string | null>(null);
  useEffect(() => {
    if (organization?.id && loadedForId.current !== organization.id) {
      setAboutDraft(organization.aboutContent ?? "");
      loadedForId.current = organization.id;
    }
  }, [organization?.id, organization?.aboutContent]);

  const [pendingConfirmation, setPendingConfirmation] = useState<DeletionConfirmationStartedDto | null>(null);

  if (isLoading) return <Spinner fill />;
  if (isError || !organization) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="font-sans text-danger">{getErrorMessage(error, "Nie znaleziono organizacji.")}</Text>
      </View>
    );
  }

  const isIndividual = organization.type === OrganizationResponseDtoType.IND;
  const isDeleted = organization.status === OrganizationResponseDtoStatus.DELETED;
  const isPendingDeletion = organization.status === OrganizationResponseDtoStatus.PENDING_DELETION;
  const publicPath = organizationPublicPath(organization);

  const handleSaveAbout = async () => {
    await updateAboutPage.mutateAsync({ id: organizationId, data: { aboutContent: aboutDraft } });
    await refetch();
  };

  const handleStartDeletion = async () => {
    const result = await startDeletion.mutateAsync({ id: organizationId });
    setPendingConfirmation(result);
  };

  const handleConfirmDeletion = async () => {
    if (!pendingConfirmation?.confirmationToken) return;
    await confirmDeletion.mutateAsync({
      id: organizationId,
      data: { confirmationToken: pendingConfirmation.confirmationToken },
    });
    setPendingConfirmation(null);
    await refetch();
  };

  const handleRequestDeletion = async () => {
    await requestDeletion.mutateAsync({ id: organizationId });
    await refetch();
  };

  const handleWithdrawDeletion = async () => {
    await withdrawDeletionRequest.mutateAsync({ id: organizationId });
    await refetch();
  };

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[760px] gap-6 p-6">
        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <Text className="font-serif text-[28px] font-bold text-foreground">{organization.name}</Text>
            <Pressable onPress={() => Linking.openURL(publicPath)}>
              <Text className="font-sans text-[13px] text-primary">{publicPath} ↗</Text>
            </Pressable>
          </View>
          <View className="flex-row gap-2">
            <Badge label={typeLabel(organization.type)} variant="neutral" />
            <Badge label={statusLabel(organization.status)} variant={statusBadgeVariant(organization.status)} />
          </View>
        </View>

        {isDeleted ? (
          <Card>
            <Text className="font-sans text-muted">Ta organizacja została usunięta.</Text>
          </Card>
        ) : (
          <>
            <Card className="gap-4">
              <Text className="font-serif text-[18px] font-bold text-foreground">Wizytówka (strona „O nas”)</Text>
              <RichTextEditor value={aboutDraft} onChangeText={setAboutDraft} placeholder="Opisz swoją organizację…" />
              {updateAboutPage.isError ? (
                <Text className="font-sans text-danger">{getErrorMessage(updateAboutPage.error)}</Text>
              ) : null}
              <Pressable
                onPress={handleSaveAbout}
                disabled={updateAboutPage.isPending}
                className={`items-center justify-center self-start rounded-pill bg-primary px-6 py-3 ${
                  updateAboutPage.isPending ? "opacity-50" : ""
                }`}
              >
                <Text className="font-sans text-[14px] font-semibold text-primary-foreground">
                  {updateAboutPage.isPending ? "Zapisywanie…" : "Zapisz wizytówkę"}
                </Text>
              </Pressable>
            </Card>

            <Card className="gap-3">
              <Text className="font-serif text-[18px] font-bold text-foreground">Usuwanie</Text>

              {isIndividual ? (
                pendingConfirmation ? (
                  <View className="gap-3 rounded-card border border-danger bg-danger/5 p-4">
                    <Text className="font-sans text-[14px] font-semibold text-danger">
                      Na pewno chcesz usunąć tę organizację? Tej operacji nie można cofnąć.
                    </Text>
                    <Text className="font-sans text-[12px] text-muted">
                      Potwierdzenie ważne do{" "}
                      {pendingConfirmation.expiresAt
                        ? new Date(pendingConfirmation.expiresAt).toLocaleTimeString()
                        : "chwili"}
                      .
                    </Text>
                    {confirmDeletion.isError ? (
                      <Text className="font-sans text-danger">{getErrorMessage(confirmDeletion.error)}</Text>
                    ) : null}
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={handleConfirmDeletion}
                        className="rounded-pill bg-danger px-5 py-3"
                      >
                        <Text className="font-sans text-[14px] font-semibold text-white">
                          Tak, usuń na zawsze
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => setPendingConfirmation(null)} className="rounded-pill px-5 py-3">
                        <Text className="font-sans text-[14px] font-semibold text-muted">Anuluj</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleStartDeletion}
                    disabled={startDeletion.isPending}
                    className="self-start rounded-pill border border-danger px-5 py-3"
                  >
                    <Text className="font-sans text-[14px] font-semibold text-danger">Usuń organizację</Text>
                  </Pressable>
                )
              ) : isPendingDeletion ? (
                <View className="gap-2">
                  <Text className="font-sans text-[14px] text-muted">
                    Ta organizacja czeka na zatwierdzenie usunięcia przez Super Administratora.
                    {organization.deletionRequestedAt
                      ? ` Zgłoszono: ${new Date(organization.deletionRequestedAt).toLocaleString()}.`
                      : ""}
                  </Text>
                  <Pressable
                    onPress={handleWithdrawDeletion}
                    disabled={withdrawDeletionRequest.isPending}
                    className="self-start rounded-pill border border-line px-5 py-3"
                  >
                    <Text className="font-sans text-[14px] font-semibold text-foreground">
                      Wycofaj zgłoszenie
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleRequestDeletion}
                  disabled={requestDeletion.isPending}
                  className="self-start rounded-pill border border-danger px-5 py-3"
                >
                  <Text className="font-sans text-[14px] font-semibold text-danger">Zgłoś do usunięcia</Text>
                </Pressable>
              )}
            </Card>
          </>
        )}
      </View>
    </View>
  );
}
