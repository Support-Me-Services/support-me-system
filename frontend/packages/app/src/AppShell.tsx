"use client";

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "solito/link";
import { usePathname, useRouter } from "solito/navigation";
import {
  InvitationResponseDtoStatus,
  OrganizationResponseDtoMyRole,
  OrganizationResponseDtoType,
  useListMine1,
  useListSent,
} from "@support-me/api-client";
import { useAuth } from "@support-me/auth";
import { useActiveOrganization, type OrgSectionTab } from "./features/organizations/active-organization";

export interface AppShellProps {
  children: React.ReactNode;
}

interface NavLink {
  href: string;
  label: string;
}

/** Which invitation count (see useInvitationCounts below) a given nav row displays. */
interface InvitationNavLink extends NavLink {
  countKind: "sent" | "received";
}

const INVITATIONS_LINKS: InvitationNavLink[] = [
  { href: "/organizations/invitations/sent", label: "Wysłane", countKind: "sent" },
  { href: "/organizations/invitations/received", label: "Odebrane", countKind: "received" },
];
const ADD_INVITATION_LINK: NavLink = { href: "/organizations/invitations/new", label: "Dodaj zaproszenie" };

const ORG_SECTION_ITEMS: { key: OrgSectionTab; label: string }[] = [
  { key: "wizytowka", label: "Wizytówka" },
  { key: "czlonkowie", label: "Członkowie" },
  { key: "zarzadzanie", label: "Zarządzanie" },
];

/** Is `pathname` this link's page, or a sub-page of it (e.g. "/organizations/abc-123")? */
function isLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLinkRow({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  /** Pending-invitation count shown as a trailing pill, incl. 0; omitted entirely renders no pill. */
  count?: number;
}) {
  return (
    <Link href={href}>
      <View className={`flex-row items-center justify-between rounded-pill px-3 py-2 ${active ? "bg-accent/10" : ""}`}>
        {/* font-medium stays constant across states - only color changes - so the label's
            glyph width (and the pill around it) doesn't shift when the active item changes. */}
        <Text className={`font-sans text-[14px] font-medium ${active ? "text-accent" : "text-foreground"}`}>
          {label}
        </Text>
        {count !== undefined ? <CountPill count={count} /> : null}
      </View>
    </Link>
  );
}

/**
 * Small numeric pill for a pending-invitation count. Reuses the same amber palette
 * `invitationStatusBadgeVariant` uses for the "Oczekujące" (PENDING) status Badge elsewhere in the
 * app, so "amber = pending" reads consistently between the nav and the invitations screens
 * themselves, rather than introducing a second, unrelated color for the same meaning.
 */
function CountPill({ count }: { count: number }) {
  return (
    <View className="min-w-[20px] items-center justify-center rounded-pill bg-[#fff0b3] px-1.5 py-0.5">
      <Text className="font-sans text-[11px] font-bold text-[#946200]">{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

/**
 * Pending-invitation counts for the two "Zaproszenia" rows: "received" mirrors
 * ReceivedInvitationsScreen (useListMine1() only ever returns the caller's PENDING invitations, so
 * its length is exactly the "needs your action" count); "sent" narrows SentInvitationsScreen's
 * useListSent() (every status, for history) down to PENDING, since an accepted/declined sent
 * invitation isn't "pending" anymore. Both hooks share their query key with the two screens, so
 * accepting/declining there updates this badge too without any extra invalidation here.
 */
function useInvitationCounts() {
  const { data: received } = useListMine1();
  const { data: sent } = useListSent();
  return {
    received: received?.length ?? 0,
    sent: sent?.filter((invitation) => invitation.status === InvitationResponseDtoStatus.PENDING).length ?? 0,
  };
}

/**
 * Which organization the signed-in user is currently "in" (see ActiveOrganizationProvider),
 * with a way to switch to any other one they own/administer or belong to, and to create a new
 * one ("+ Nowa organizacja" footer row) - there's no separate "Organizacje" nav link any more,
 * this picker replaces it.
 */
function OrgSwitcher() {
  const router = useRouter();
  const { organizations, activeOrganization, activeOrganizationId, setActiveOrganizationId } =
    useActiveOrganization();
  const [open, setOpen] = React.useState(false);

  if (organizations.length === 0) return null;
  const canSwitch = organizations.length > 1;

  const handleSelect = (organizationId?: string) => {
    if (!organizationId) return;
    setActiveOrganizationId(organizationId);
    setOpen(false);
    router.push(`/organizations/${organizationId}`);
  };

  return (
    <View className="gap-1">
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        className="flex-row items-center justify-between gap-2 rounded-card-lg border border-line bg-band px-3 py-2"
      >
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted">
            Organizacja
          </Text>
          <Text className="font-sans text-[14px] font-semibold text-foreground" numberOfLines={1}>
            {activeOrganization?.name ?? "Wybierz organizację"}
          </Text>
        </View>
        <Text className="font-sans text-[11px] text-muted">{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open ? (
        <View className="gap-0.5 rounded-card-lg border border-line bg-background p-1 shadow-sm">
          {canSwitch
            ? organizations.map((org) => {
                const isActive = org.id === activeOrganizationId;
                const isMember = org.myRole === OrganizationResponseDtoMyRole.MEMBER;
                return (
                  <Pressable
                    key={org.id}
                    onPress={() => handleSelect(org.id)}
                    className={`flex-row items-center justify-between gap-2 rounded-card px-2 py-2 ${
                      isActive ? "bg-accent/10" : ""
                    }`}
                  >
                    <Text
                      className={`min-w-0 flex-1 font-sans text-[13px] font-medium ${
                        isActive ? "text-accent" : "text-foreground"
                      }`}
                      numberOfLines={1}
                    >
                      {org.name}
                    </Text>
                    <Text className="font-sans text-[11px] text-muted">
                      {isMember ? "Członek" : "Administrator"}
                    </Text>
                  </Pressable>
                );
              })
            : null}
          <View className={canSwitch ? "mt-0.5 border-t border-line pt-0.5" : undefined}>
            <Link href="/organizations/new" onClick={() => setOpen(false)}>
              <View className="rounded-card px-2 py-2">
                <Text className="font-sans text-[13px] font-medium text-accent">+ Nowa organizacja</Text>
              </View>
            </Link>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The active organization's OWN section (Wizytówka/Członkowie/Zarządzanie) - merged into this
 * same persistent sidebar instead of OrganizationDetailScreen rendering a second, separate
 * side-menu of its own (the "podwójne menu" this replaces). Deliberately exactly 3 buttons in
 * ONE bordered block - no sub-groups - so on an organization's own page this is the ONLY block
 * shown (see NavSections: it hides the global "Zaproszenia" block below instead of showing both
 * at once). Returns null off that organization's detail page: elsewhere (the dashboard list,
 * "add organization"...) these tabs wouldn't apply to anything on screen.
 */
function OrgSectionNav({ pathname }: { pathname: string }) {
  const { activeOrganization, activeOrganizationId, orgSectionTab, setOrgSectionTab } = useActiveOrganization();

  if (!isOnOwnDetailPage(pathname, activeOrganizationId)) return null;

  const isIndividual = activeOrganization?.type === OrganizationResponseDtoType.IND;
  const isAdmin = activeOrganization?.myRole !== OrganizationResponseDtoMyRole.MEMBER;
  const items = ORG_SECTION_ITEMS.filter(
    (item) => (item.key !== "czlonkowie" || (!isIndividual && isAdmin)) && (item.key !== "zarzadzanie" || isAdmin),
  );

  return (
    <View className="gap-1 rounded-card border border-line bg-band p-2">
      {items.map((item) => {
        const active = item.key === orgSectionTab;
        return (
          <Pressable
            key={item.key}
            onPress={() => setOrgSectionTab(item.key)}
            className={`flex-row items-center rounded-pill px-3 py-2 ${active ? "bg-accent/10" : ""}`}
          >
            <Text className={`font-sans text-[14px] font-medium ${active ? "text-accent" : "text-foreground"}`}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Is `pathname` the active organization's own detail page (where OrgSectionNav takes over)? */
function isOnOwnDetailPage(pathname: string, activeOrganizationId: string | null): boolean {
  return Boolean(activeOrganizationId) && pathname === `/organizations/${activeOrganizationId}`;
}

function NavSections({ pathname }: { pathname: string }) {
  const invitationCounts = useInvitationCounts();
  const { activeOrganizationId } = useActiveOrganization();
  const onOrgDetailPage = isOnOwnDetailPage(pathname, activeOrganizationId);

  return (
    <View className="gap-2">
      <OrgSwitcher />

      <OrgSectionNav pathname={pathname} />

      {/* Its own bordered block, not just an indented label under the switcher - this is a
          distinct inbox/outbox, not a sub-page of any one organization, and giving it a visual
          boundary (plus the pending-count pills above) is what makes it read as one. Hidden on
          an organization's own detail page, where OrgSectionNav's "Członkowie" button already
          covers per-org invitations - showing both there would be exactly the redundant "2
          sections" this single-block design replaced. */}
      {!onOrgDetailPage ? (
        <View className="gap-1 rounded-card border border-line bg-band p-2">
          <Text className="px-1 pb-1 font-sans text-[12px] font-semibold uppercase tracking-wide text-muted">
            Zaproszenia
          </Text>
          <NavLinkRow
            href={ADD_INVITATION_LINK.href}
            label={ADD_INVITATION_LINK.label}
            active={isLinkActive(pathname, ADD_INVITATION_LINK.href)}
          />
          {INVITATIONS_LINKS.filter((item) => item.countKind !== "received" || invitationCounts.received > 0).map(
            (item) => (
              <NavLinkRow
                key={item.href}
                href={item.href}
                label={item.label}
                active={isLinkActive(pathname, item.href)}
                count={invitationCounts[item.countKind]}
              />
            ),
          )}
        </View>
      ) : null}

      <LogoutRow />
    </View>
  );
}

/**
 * The only sign-out control in the app (HomeScreen's own logout button is no longer reachable
 * while signed in, now that it redirects straight into the active organization's context - see
 * ActiveOrganizationProvider) - lives here since AppShell is mounted on every authenticated page.
 */
function LogoutRow() {
  const { logout } = useAuth();
  return (
    <Pressable onPress={logout} className="self-start rounded-pill px-3 py-2">
      <Text className="font-sans text-[14px] font-medium text-muted">Wyloguj</Text>
    </Pressable>
  );
}

/**
 * Navigation for the authenticated app area: a way back to the public home page ("/") via the
 * logo/title link, the organization switcher (also the only way to reach the full organizations
 * list or create a new one - see OrgSwitcher), that organization's own section tabs when its
 * detail page is open (OrgSectionNav - merged in here rather than OrganizationDetailScreen
 * rendering a second side-menu of its own), the invitations inbox, and sign-out. Mounted by
 * apps/web/app/organizations/layout.tsx - wraps every /organizations/* page, not the bare
 * landing page (which keeps its own minimal layout).
 *
 * `sm` and up, this whole shell is pinned to exactly the viewport height with the sidebar itself
 * never scrolling - only `children` (the page content) scrolls internally - so the nav stays on
 * screen, permanently visible, no matter how long the current page is or what it's doing. Below
 * `sm` the persistent 240px sidebar (built for a desktop-width viewport) would otherwise squeeze
 * the page content into a sliver next to it, so it's replaced by a compact top bar with a menu
 * button that expands into a full-width dropdown of the same links, and the page scrolls
 * normally.
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Web only (no physical Escape key on a touch device) - closes the floating mobile menu,
  // same as tapping the backdrop below.
  React.useEffect(() => {
    if (!menuOpen || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <View className="w-full bg-band sm:h-screen sm:overflow-hidden">
      <View className="border-b border-line bg-background sm:hidden">
        <View className="flex-row items-center justify-between p-4">
          <Link href="/">
            <Text className="font-serif text-[18px] font-bold text-foreground">support-me-system</Text>
          </Link>
          <Pressable
            onPress={() => setMenuOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={menuOpen ? "Zamknij menu" : "Otwórz menu"}
            className="rounded-pill p-2"
          >
            <Text className="font-sans text-[20px] text-foreground">{menuOpen ? "✕" : "☰"}</Text>
          </Pressable>
        </View>
      </View>

      {/*
       * This wrapper (not the header above) is the shared positioning root for the floating
       * mobile menu: the backdrop, the sliding panel, the desktop sidebar and the page content
       * are all DIRECT children of it. That's load-bearing, not incidental - every
       * react-native-web View is `position: relative; z-index: 0` by default, so it creates its
       * own stacking context; nesting the panel one level deeper (e.g. inside the header above)
       * would cap its z-index comparisons to that header's own stacking context instead of this
       * one, and the backdrop (a sibling of the header, not a child of it) would then paint OVER
       * the whole header - which is exactly the "menu shows as a gray screen, no links visible"
       * bug an earlier version of this had. Keeping backdrop/panel/content as siblings here
       * means their z-index values (20/10/auto) are compared directly against each other.
       *
       * Both the backdrop and the panel stay mounted at all times and are shown/hidden via
       * opacity(+translateY for the panel) rather than conditional rendering, so both the
       * entrance AND the exit are an actual transition, not an instant mount/unmount;
       * `pointerEvents` and the accessibility flags keep them inert (untappable, unfocusable,
       * invisible to screen readers) while closed. Tapping the dimmed backdrop, tapping a link,
       * navigating, or pressing Escape (web) all close it. The panel never pushes the content
       * beside/behind it - it's `position: absolute`, so the page layout doesn't shift at all.
       *
       * The animated opacity/translateY VALUES are set via inline `style`, not conditional
       * Tailwind classes (`opacity-0`/`opacity-100` etc.) - only the *static*, never-changing
       * `transition-opacity` class below is a Tailwind class. NativeWind doesn't reliably pick up
       * a Tailwind opacity/translate utility that flips on every re-render of the same element
       * (verified in-browser: the class list updates correctly but the rendered style doesn't);
       * driving the actual value through plain `style` sidesteps that while still letting the
       * static transition-property class animate it.
       *
       * 200ms/ease-out rather than the project's usual 500ms "confirmation" fade (see
       * FadingSaved above and apps/web/app/template.tsx) - this is an interactive control that
       * should feel immediate, not a save-confirmation fade, but the panel still needs enough
       * travel+time (16px) to read as sliding into place rather than just fading.
       */}
      <View className="relative flex-1 sm:h-full sm:flex-row">
        <Pressable
          onPress={() => setMenuOpen(false)}
          pointerEvents={menuOpen ? "auto" : "none"}
          accessibilityRole="button"
          accessibilityLabel="Zamknij menu"
          accessibilityElementsHidden={!menuOpen}
          importantForAccessibility={menuOpen ? "auto" : "no-hide-descendants"}
          aria-hidden={!menuOpen}
          style={{ opacity: menuOpen ? 1 : 0 }}
          className="absolute inset-0 z-10 bg-foreground/10 transition-opacity duration-200 ease-out sm:hidden"
        />

        <View
          pointerEvents={menuOpen ? "auto" : "none"}
          accessibilityElementsHidden={!menuOpen}
          importantForAccessibility={menuOpen ? "auto" : "no-hide-descendants"}
          accessibilityViewIsModal={menuOpen}
          // react-native-web doesn't turn the two RN accessibility props above into any DOM
          // attribute (verified in-browser), so screen readers on web would still see the
          // links while the menu is closed without this - RNW does forward plain `aria-*` props
          // straight through, and it's a harmless extra attribute on native.
          aria-hidden={!menuOpen}
          style={{ opacity: menuOpen ? 1 : 0, transform: [{ translateY: menuOpen ? 0 : -16 }] }}
          className="absolute left-0 right-0 top-0 z-20 gap-6 border-b border-line bg-background p-4 shadow-sm transition-opacity duration-200 ease-out sm:hidden"
        >
          <NavSections pathname={pathname} />
        </View>

        {/* Permanent sidebar: always exactly 240px, in normal flow, `sm` and up - no collapse
            toggle any more, so it's never hidden and `children` never has to reflow around it
            changing width. */}
        <View className="hidden w-[240px] shrink-0 gap-6 border-r border-line bg-background p-6 sm:flex sm:h-full sm:overflow-y-auto">
          <NavSections pathname={pathname} />
        </View>

        <View className="min-w-0 flex-1 sm:h-full sm:overflow-y-auto">{children}</View>
      </View>
    </View>
  );
}
