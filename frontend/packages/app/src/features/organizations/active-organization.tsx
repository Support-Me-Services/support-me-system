"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useListMine, type OrganizationResponseDto } from "@support-me/api-client";
import { useAuth } from "@support-me/auth";
import { readLastActiveOrganizationId, writeLastActiveOrganizationId } from "../../lib/active-org-storage";

/**
 * The active organization's own section, shown in AppShell's single merged sidebar (see
 * AppShell's OrgSectionNav) and read by OrganizationDetailScreen to pick which panel to render.
 * "czlonkowie" (Członkowie) covers inviting/managing members; "zarzadzanie" (Zarządzanie) covers
 * contact info and deletion - deliberately just 3 buttons, one section, no separate sub-groups.
 */
export type OrgSectionTab = "wizytowka" | "czlonkowie" | "zarzadzanie";

export interface ActiveOrganizationContextValue {
  /** Every organization the caller owns/administers or is a member of. */
  organizations: OrganizationResponseDto[];
  activeOrganization: OrganizationResponseDto | null;
  activeOrganizationId: string | null;
  /** Switches context and remembers the choice for next time (see active-org-storage). */
  setActiveOrganizationId: (organizationId: string) => void;
  isLoading: boolean;
  orgSectionTab: OrgSectionTab;
  setOrgSectionTab: (tab: OrgSectionTab) => void;
}

const ActiveOrganizationContext = createContext<ActiveOrganizationContextValue | undefined>(undefined);

/**
 * Tracks which organization the signed-in user is currently "in" - remembered across sessions
 * (per-browser, see active-org-storage) so the next login lands them back where they left off,
 * rather than always starting from the bare "Moje organizacje" list. Mounted once, at the root
 * <Provider> tree, so both the auto-redirect-after-login logic (HomeScreen) and the sidebar
 * switcher (AppShell) share one query and one notion of "current org".
 *
 * Auto-selection only runs once per mount (hasInitialized): after that, switching is only ever
 * explicit (setActiveOrganizationId), and losing access to the active org (deleted, membership
 * revoked) falls back to the first remaining organization rather than re-consulting storage.
 */
export function ActiveOrganizationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data: organizations, isLoading } = useListMine({ query: { enabled: isAuthenticated } });
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [orgSectionTab, setOrgSectionTab] = useState<OrgSectionTab>("wizytowka");

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveOrganizationIdState(null);
    }
  }, [isAuthenticated]);

  // Keeps activeOrganizationId valid as `organizations` changes for any reason - first load,
  // creating the user's first organization (empty -> non-empty), or losing access to the
  // currently-active one (deleted, membership revoked). A no-op whenever the current id is
  // still present in the list, so it never fights an explicit setActiveOrganizationId call.
  useEffect(() => {
    if (!isAuthenticated || !organizations) return;
    if (activeOrganizationId && organizations.some((org) => org.id === activeOrganizationId)) return;

    if (organizations.length === 0) {
      setActiveOrganizationIdState(null);
      return;
    }
    const stored = readLastActiveOrganizationId();
    const chosenId = (stored && organizations.some((org) => org.id === stored) ? stored : organizations[0]?.id) ?? null;
    setActiveOrganizationIdState(chosenId);
    if (chosenId) writeLastActiveOrganizationId(chosenId);
  }, [isAuthenticated, organizations, activeOrganizationId]);

  const setActiveOrganizationId = (organizationId: string) => {
    if (organizationId !== activeOrganizationId) setOrgSectionTab("wizytowka");
    setActiveOrganizationIdState(organizationId);
    writeLastActiveOrganizationId(organizationId);
  };

  const activeOrganization = useMemo(
    () => organizations?.find((org) => org.id === activeOrganizationId) ?? null,
    [organizations, activeOrganizationId],
  );

  const value: ActiveOrganizationContextValue = {
    organizations: organizations ?? [],
    activeOrganization,
    activeOrganizationId,
    setActiveOrganizationId,
    isLoading,
    orgSectionTab,
    setOrgSectionTab,
  };

  return <ActiveOrganizationContext.Provider value={value}>{children}</ActiveOrganizationContext.Provider>;
}

export function useActiveOrganization(): ActiveOrganizationContextValue {
  const context = useContext(ActiveOrganizationContext);
  if (!context) {
    throw new Error("useActiveOrganization must be used within an ActiveOrganizationProvider");
  }
  return context;
}
