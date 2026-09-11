"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Link } from "solito/link";
import { useAuth } from "@support-me/auth";
import { useGet, useUpdateContactInfo, OrganizationResponseDtoType } from "@support-me/api-client";
import { Badge, Input, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";

export interface AccountSettingsScreenProps {
  /** When set, "Profil" shows this organization's name instead of the user's. */
  organizationId?: string;
}

const ROLE_OPTIONS = ["Proboszcz", "Wikariusz", "Kapelan", "Diakon"];

/** Read-only display row. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans text-[12px] font-medium text-muted">{label}</Text>
      <View className="rounded-card border border-line bg-background px-3.5 py-3">
        <Text className="font-sans text-[15px] text-foreground">{value}</Text>
      </View>
    </View>
  );
}

export function AccountSettingsScreen({ organizationId }: AccountSettingsScreenProps) {
  const { user } = useAuth();
  const { data: organization, isLoading, refetch } = useGet(organizationId ?? "", {
    query: { enabled: Boolean(organizationId) },
  });
  const updateContactInfo = useUpdateContactInfo();

  const isIndividual = organization?.type === OrganizationResponseDtoType.IND;
  const profileTitle = !organizationId
    ? "Profil"
    : isIndividual
      ? "Profil Indywidualny"
      : "Profil Organizacji";
  const profileFieldLabel = !organizationId
    ? "Imię i nazwisko"
    : isIndividual
      ? "Imię i nazwisko"
      : "Nazwa organizacji";

  // Editable drafts - kept in sync with fresh data whenever a *different* organization loads,
  // same guarded pattern as the Wizytówka tab (organization-detail's detail-screen.tsx) so an
  // in-progress edit never gets clobbered by an unrelated refetch.
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [roleDraft, setRoleDraft] = useState("");
  const loadedForId = useRef<string | null>(null);
  useEffect(() => {
    if (organization?.id && loadedForId.current !== organization.id) {
      setNameDraft(
        isIndividual
          ? [organization.firstName, organization.lastName].filter(Boolean).join(" ")
          : (organization.name ?? ""),
      );
      setPhoneDraft(organization.phoneNumber ?? "");
      setRoleDraft(organization.role ?? "");
      loadedForId.current = organization.id;
    }
  }, [
    organization?.id,
    organization?.name,
    organization?.firstName,
    organization?.lastName,
    organization?.phoneNumber,
    organization?.role,
    isIndividual,
  ]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  const buildContactInfoPayload = () => {
    if (isIndividual) {
      const [firstName, ...rest] = nameDraft.trim().split(/\s+/);
      return { firstName: firstName ?? "", lastName: rest.join(" "), phoneNumber: phoneDraft, role: roleDraft };
    }
    return { name: nameDraft, phoneNumber: phoneDraft, role: roleDraft };
  };

  const handleAcceptProfile = async () => {
    if (!organizationId) return;
    await updateContactInfo.mutateAsync({
      id: organizationId,
      data: buildContactInfoPayload(),
    });
    await refetch();
    setIsEditingProfile(false);
  };

  const handleAcceptContact = async () => {
    if (!organizationId) return;
    await updateContactInfo.mutateAsync({
      id: organizationId,
      data: buildContactInfoPayload(),
    });
    await refetch();
    setIsEditingContact(false);
  };

  return (
    <View className="flex-1 bg-band">
      <View className="mx-auto w-full max-w-[700px] gap-5 p-6 py-12">
        <Link href={organizationId ? `/organizations/${organizationId}` : "/organizations"}>
          <Text className="font-sans text-[14px] font-semibold text-accent">
            ← Wróć do organizacji
          </Text>
        </Link>

        <Text className="font-serif text-[32px] font-bold text-foreground">
          Zarządzanie kontem
        </Text>

        <View className="w-full gap-4 rounded-card-lg bg-background p-7 shadow-sm">
          <Text className="font-serif text-[20px] font-bold text-foreground">
            {profileTitle}
          </Text>
          {organizationId && isLoading ? (
            <Spinner />
          ) : organizationId ? (
            isEditingProfile ? (
              <Input label={profileFieldLabel} value={nameDraft} onChangeText={setNameDraft} />
            ) : (
              <InfoRow label={profileFieldLabel} value={nameDraft || "—"} />
            )
          ) : (
            <InfoRow label={profileFieldLabel} value={user?.name || "—"} />
          )}
          <View className="gap-1.5">
            <Text className="font-sans text-[12px] font-medium text-muted">Rola / status</Text>
            {organizationId && isEditingProfile ? (
              <View className="flex-row flex-wrap gap-2">
                {ROLE_OPTIONS.map((option) => {
                  const selected = roleDraft === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setRoleDraft(option)}
                      className={`rounded-pill border px-4 py-2 ${
                        selected ? "border-accent bg-accent/10" : "border-line"
                      }`}
                    >
                      {/* font-medium stays constant across states - only color changes - so an
                          option's glyph width doesn't shift and reflow its neighbors in this
                          flex-wrap row when the selection changes. */}
                      <Text
                        className={`font-sans text-[14px] font-medium ${
                          selected ? "text-accent" : "text-foreground"
                        }`}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {organizationId && roleDraft ? <Badge label={roleDraft} variant="neutral" /> : null}
                <Badge label="Aktywny" variant="accent" />
              </View>
            )}
          </View>
          {organizationId ? (
            <>
              {updateContactInfo.isError ? (
                <Text className="font-sans text-danger">{getErrorMessage(updateContactInfo.error)}</Text>
              ) : null}
              <Pressable
                onPress={isEditingProfile ? handleAcceptProfile : () => setIsEditingProfile(true)}
                disabled={updateContactInfo.isPending}
                className={`items-center justify-center self-start rounded-pill px-6 py-3 ${
                  isEditingProfile ? "bg-accent" : "border border-accent"
                } ${updateContactInfo.isPending ? "opacity-50" : ""}`}
              >
                <Text
                  className={`font-sans text-[14px] font-semibold ${
                    isEditingProfile ? "text-accent-foreground" : "text-accent"
                  }`}
                >
                  {isEditingProfile
                    ? updateContactInfo.isPending
                      ? "Zapisywanie…"
                      : "Zaakceptuj"
                    : "Zmień"}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>

        <View className="w-full gap-4 rounded-card-lg bg-background p-7 shadow-sm">
          <Text className="font-serif text-[20px] font-bold text-foreground">
            {isIndividual ? "Dane indywidualne" : "Dane organizacji"}
          </Text>
          <View className="gap-4 sm:flex-row">
            <View className="gap-1.5 sm:flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-[12px] font-medium text-muted">Adres e-mail</Text>
              </View>
              <View className="rounded-card border border-line bg-background px-3.5 py-3">
                <Text className="font-sans text-[15px] text-foreground">{user?.email ?? "—"}</Text>
              </View>
            </View>

            <View className="gap-1.5 sm:flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-[12px] font-medium text-muted">Numer telefonu</Text>
                {organizationId ? (
                  <Pressable
                    onPress={isEditingContact ? handleAcceptContact : () => setIsEditingContact(true)}
                    disabled={updateContactInfo.isPending}
                  >
                    <Text className="font-sans text-[12px] font-semibold text-accent">
                      {isEditingContact
                        ? updateContactInfo.isPending
                          ? "Zapisywanie…"
                          : "Zaakceptuj"
                        : "Zmień"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {organizationId && isEditingContact ? (
                <View className="rounded-card border border-accent bg-background px-3.5 py-1">
                  <TextInput
                    value={phoneDraft}
                    onChangeText={setPhoneDraft}
                    keyboardType="phone-pad"
                    className="h-11 w-full font-sans text-[15px] text-foreground outline-none"
                  />
                </View>
              ) : (
                <View className="rounded-card border border-line bg-background px-3.5 py-3">
                  <Text className="font-sans text-[15px] text-foreground">
                    {phoneDraft || "Brak danych"}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {updateContactInfo.isError ? (
            <Text className="font-sans text-danger">{getErrorMessage(updateContactInfo.error)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
