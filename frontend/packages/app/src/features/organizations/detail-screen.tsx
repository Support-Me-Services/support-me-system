"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "solito/link";
import {
  useGet,
  useUpdateAboutPage,
  useUpdateContactInfo,
  useStartDeletion,
  useConfirmDeletion,
  useRequestDeletion,
  useWithdrawDeletionRequest,
  OrganizationResponseDtoType,
  OrganizationResponseDtoStatus,
  type DeletionConfirmationStartedDto,
} from "@support-me/api-client";
import { Badge, HtmlContent, Input, RichTextEditor, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";
import { statusBadgeVariant, statusLabel } from "./shared";

export interface OrganizationDetailScreenProps {
  organizationId: string;
}

/**
 * Splits the "about" HTML into a bold title (its first heading, if any) and the rest of the
 * body as HTML. The title is a separate plain field ("Tytuł") that's always bold by virtue of
 * the field it's in; the body keeps its own rich-text formatting (bold/italic/bullets can be
 * mixed within it) via RichTextEditor, same as before - just without a heading option, since
 * "Tytuł" now covers that.
 */
function parseAboutContent(html: string): { title: string; body: string } {
  if (typeof document === "undefined") return { title: "", body: "" };
  const container = document.createElement("div");
  container.innerHTML = html;
  const heading = container.querySelector("h1, h2, h3");
  let title = "";
  if (heading) {
    title = heading.textContent?.trim() ?? "";
    heading.remove();
  }
  return { title, body: container.innerHTML.trim() };
}

/** Inverse of parseAboutContent - rebuilds the HTML `updateAboutPage` stores. */
function buildAboutContent(title: string, bodyHtml: string): string {
  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const titleHtml = title.trim() ? `<h2>${escapeHtml(title.trim())}</h2>` : "";
  return titleHtml + bodyHtml;
}

/** "Zapisano ✓" that fades in, holds briefly, then fades back out on its own. */
function FadingSaved({ trigger }: { trigger: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), 1000);
    return () => clearTimeout(hide);
  }, [trigger]);

  return (
    <Text
      className={`font-sans text-[13px] font-semibold text-accent transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      Zapisano ✓
    </Text>
  );
}

type Tab = "wizytowka" | "kontakt" | "usuwanie";

const NAV_ITEMS: { key: Tab; label: string }[] = [
  { key: "wizytowka", label: "Wizytówka" },
  { key: "kontakt", label: "Informacja kontaktowa" },
  { key: "usuwanie", label: "Usuwanie" },
];

const ROLE_OPTIONS = ["Proboszcz", "Wikariusz", "Kapelan", "Diakon"];

export function OrganizationDetailScreen({ organizationId }: OrganizationDetailScreenProps) {
  const { data: organization, isLoading, isError, error, refetch } = useGet(organizationId);

  const updateAboutPage = useUpdateAboutPage();
  const updateContactInfo = useUpdateContactInfo();
  const startDeletion = useStartDeletion();
  const confirmDeletion = useConfirmDeletion();
  const requestDeletion = useRequestDeletion();
  const withdrawDeletionRequest = useWithdrawDeletionRequest();

  const [activeTab, setActiveTab] = useState<Tab>("wizytowka");

  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const loadedForId = useRef<string | null>(null);
  useEffect(() => {
    if (organization?.id && loadedForId.current !== organization.id) {
      const parsed = parseAboutContent(organization.aboutContent ?? "");
      setTitleDraft(parsed.title);
      setBodyDraft(parsed.body);
      loadedForId.current = organization.id;
    }
  }, [organization?.id, organization?.aboutContent]);

  const [pendingConfirmation, setPendingConfirmation] = useState<DeletionConfirmationStartedDto | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  const [phoneDraft, setPhoneDraft] = useState("");
  const [roleDraft, setRoleDraft] = useState("");
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactJustSaved, setContactJustSaved] = useState(false);
  const loadedContactForId = useRef<string | null>(null);
  useEffect(() => {
    if (organization?.id && loadedContactForId.current !== organization.id) {
      setPhoneDraft(organization.phoneNumber ?? "");
      setRoleDraft(organization.role ?? "");
      loadedContactForId.current = organization.id;
    }
  }, [organization?.id, organization?.phoneNumber, organization?.role]);

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

  const handleSaveAbout = async () => {
    setJustSaved(false);
    await updateAboutPage.mutateAsync({
      id: organizationId,
      data: { aboutContent: buildAboutContent(titleDraft, bodyDraft) },
    });
    await refetch();
    setJustSaved(true);
  };

  const handleAcceptAbout = async () => {
    await handleSaveAbout();
    setIsEditingAbout(false);
  };

  const handleAcceptContact = async () => {
    setContactJustSaved(false);
    // Name fields are re-sent unchanged (from already-loaded data) - updateContactInfo also
    // owns the display name, but this tab only edits the phone number.
    await updateContactInfo.mutateAsync({
      id: organizationId,
      data: isIndividual
        ? {
            firstName: organization.firstName ?? "",
            lastName: organization.lastName ?? "",
            phoneNumber: phoneDraft,
            role: roleDraft,
          }
        : { name: organization.name ?? "", phoneNumber: phoneDraft, role: roleDraft },
    });
    await refetch();
    setContactJustSaved(true);
    setIsEditingContact(false);
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

  if (isDeleted) {
    return (
      <View className="flex-1 bg-background p-6">
        <View className="mx-auto w-full max-w-[900px] gap-1 rounded-card-lg bg-band p-6">
          <Text className="font-sans text-muted">Ta organizacja została usunięta.</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-[900px] gap-4 p-6 py-10">
        <View className="gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Link href="/organizations">
            <Text className="font-sans text-[14px] font-semibold text-accent">
              ← Wróć do Moje organizacje
            </Text>
          </Link>
          <Link href={`/organizations/${organizationId}/account`}>
            <Text className="font-sans text-[14px] font-semibold text-accent">
              Zarządzanie kontem →
            </Text>
          </Link>
        </View>

        <View className="gap-6 sm:flex-row sm:gap-10">
        {/* Left menu - this organization's own sections. Stacked full-width above the
            content on narrow screens; a fixed-width column beside it from sm: up. */}
        <View className="gap-1 sm:w-[220px]">
          <Text className="mb-2 font-serif text-[17px] font-bold text-foreground">
            {organization.name}
          </Text>
          <View className="flex-row flex-wrap gap-2 sm:flex-col sm:flex-nowrap sm:gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.key === activeTab;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setActiveTab(item.key)}
                  className={`self-start rounded-pill px-3 py-2 ${active ? "bg-accent/10" : ""}`}
                >
                  <Text
                    className={`font-sans text-[14px] ${
                      active ? "font-semibold text-accent" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 gap-4">

          {activeTab === "wizytowka" ? (
            <View className="gap-4 rounded-card-lg bg-background p-6 shadow-sm">
              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="font-serif text-[20px] font-bold text-foreground">
                  {organization.name}
                </Text>
                {organization.role ? <Badge label={organization.role} variant="neutral" /> : null}
                <Badge label={statusLabel(organization.status)} variant={statusBadgeVariant(organization.status)} />
              </View>

              {isEditingAbout ? (
                <View className="gap-3">
                  <Input
                    label="Tytuł"
                    value={titleDraft}
                    onChangeText={(text) => {
                      setTitleDraft(text);
                      setJustSaved(false);
                    }}
                    placeholder="Np. Fundacja Pomocna Dłoń"
                    bold
                  />
                  <View className="gap-[7px]">
                    <Text className="font-sans text-[14px] font-semibold text-foreground">Opis</Text>
                    <RichTextEditor
                      value={bodyDraft}
                      onChangeText={(html) => {
                        setBodyDraft(html);
                        setJustSaved(false);
                      }}
                      placeholder="Opisz swoją organizację…"
                    />
                  </View>
                </View>
              ) : titleDraft || bodyDraft ? (
                <View className="gap-2">
                  {titleDraft ? (
                    <Text className="font-serif text-[18px] font-bold text-foreground">{titleDraft}</Text>
                  ) : null}
                  {bodyDraft ? <HtmlContent html={bodyDraft} /> : null}
                </View>
              ) : (
                <Text className="font-sans text-[14px] text-muted">
                  Brak opisu - kliknij „Zmień”, aby dodać.
                </Text>
              )}

              {updateAboutPage.isError ? (
                <Text className="font-sans text-danger">{getErrorMessage(updateAboutPage.error)}</Text>
              ) : null}

              <View className="flex-row items-center gap-3">
                {isEditingAbout ? (
                  <Pressable
                    onPress={handleAcceptAbout}
                    disabled={updateAboutPage.isPending}
                    className={`items-center justify-center self-start rounded-pill bg-accent px-6 py-3 ${
                      updateAboutPage.isPending ? "opacity-50" : ""
                    }`}
                  >
                    <Text className="font-sans text-[14px] font-semibold text-accent-foreground">
                      {updateAboutPage.isPending ? "Zapisywanie…" : "Zaakceptuj"}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => setIsEditingAbout(true)}
                    className="items-center justify-center self-start rounded-pill border border-accent px-6 py-3"
                  >
                    <Text className="font-sans text-[14px] font-semibold text-accent">Zmień</Text>
                  </Pressable>
                )}
                {!isEditingAbout ? <FadingSaved trigger={justSaved} /> : null}
              </View>
            </View>
          ) : null}

          {activeTab === "kontakt" ? (
            <View className="gap-4 rounded-card-lg bg-background p-6 shadow-sm">
              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="font-serif text-[20px] font-bold text-foreground">
                  {organization.name}
                </Text>
                <Badge label={statusLabel(organization.status)} variant={statusBadgeVariant(organization.status)} />
              </View>

              <View className="gap-1.5">
                <Text className="font-sans text-[12px] font-medium text-muted">Rola</Text>
                {isEditingContact ? (
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
                          <Text
                            className={`font-sans text-[14px] ${
                              selected ? "font-semibold text-accent" : "text-foreground"
                            }`}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="font-sans text-[15px] text-foreground">
                    {roleDraft || "Brak danych"}
                  </Text>
                )}
              </View>

              {isEditingContact ? (
                <Input
                  label="Numer telefonu"
                  value={phoneDraft}
                  onChangeText={setPhoneDraft}
                  placeholder="+48 600 123 456"
                  keyboardType="phone-pad"
                />
              ) : (
                <View className="gap-1.5">
                  <Text className="font-sans text-[12px] font-medium text-muted">Numer telefonu</Text>
                  <Text className="font-sans text-[15px] text-foreground">
                    {phoneDraft || "Brak danych"}
                  </Text>
                </View>
              )}

              {updateContactInfo.isError ? (
                <Text className="font-sans text-danger">{getErrorMessage(updateContactInfo.error)}</Text>
              ) : null}

              <View className="flex-row items-center gap-3">
                {isEditingContact ? (
                  <Pressable
                    onPress={handleAcceptContact}
                    disabled={updateContactInfo.isPending}
                    className={`items-center justify-center self-start rounded-pill bg-accent px-6 py-3 ${
                      updateContactInfo.isPending ? "opacity-50" : ""
                    }`}
                  >
                    <Text className="font-sans text-[14px] font-semibold text-accent-foreground">
                      {updateContactInfo.isPending ? "Zapisywanie…" : "Zaakceptuj"}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => setIsEditingContact(true)}
                    className="items-center justify-center self-start rounded-pill border border-accent px-6 py-3"
                  >
                    <Text className="font-sans text-[14px] font-semibold text-accent">Zmień</Text>
                  </Pressable>
                )}
                {!isEditingContact ? <FadingSaved trigger={contactJustSaved} /> : null}
              </View>
            </View>
          ) : null}

          {activeTab === "usuwanie" ? (
            <View className="gap-4 rounded-card-lg bg-background p-6 shadow-sm">
              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="font-serif text-[20px] font-bold text-foreground">
                  {organization.name}
                </Text>
                <Badge label={statusLabel(organization.status)} variant={statusBadgeVariant(organization.status)} />
              </View>

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
            </View>
          ) : null}
        </View>
        </View>
      </View>
    </View>
  );
}
