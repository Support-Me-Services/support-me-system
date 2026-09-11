"use client";

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "solito/link";
import { usePathname } from "solito/navigation";
import { InvitationResponseDtoStatus, useListMine1, useListSent } from "@support-me/api-client";

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

const ORGANIZATIONS_HREF = "/organizations";
const INVITATIONS_HREF = "/organizations/invitations";
const INVITATIONS_LINKS: InvitationNavLink[] = [
  { href: "/organizations/invitations/sent", label: "Wysłane", countKind: "sent" },
  { href: "/organizations/invitations/received", label: "Odebrane", countKind: "received" },
];
const ADD_INVITATION_LINK: NavLink = { href: "/organizations/invitations/new", label: "Dodaj zaproszenie" };

/** Is `pathname` this link's page, or a sub-page of it (e.g. "/organizations/abc-123")? */
function isLinkActive(pathname: string, href: string): boolean {
  if (href === ORGANIZATIONS_HREF) {
    // "Organizacje" owns every /organizations/* route except the ones under the separate
    // "Zaproszenia" group below.
    return pathname === href || (pathname.startsWith(href + "/") && !pathname.startsWith(INVITATIONS_HREF));
  }
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

function NavSections({ pathname }: { pathname: string }) {
  const invitationCounts = useInvitationCounts();

  return (
    <View className="gap-2">
      <NavLinkRow href={ORGANIZATIONS_HREF} label="Organizacje" active={isLinkActive(pathname, ORGANIZATIONS_HREF)} />

      {/* Its own bordered block, not just an indented label under "Organizacje" - this is a
          distinct inbox/outbox, not a sub-page of the organizations list, and giving it a visual
          boundary (plus the pending-count pills above) is what makes it read as one now that the
          old redundant "ORGANIZACJE" eyebrow above the "Organizacje" link itself is gone. */}
      <View className="gap-1 rounded-card border border-line bg-band p-2">
        <Text className="px-1 pb-1 font-sans text-[12px] font-semibold uppercase tracking-wide text-muted">
          Zaproszenia
        </Text>
        <NavLinkRow
          href={ADD_INVITATION_LINK.href}
          label={ADD_INVITATION_LINK.label}
          active={isLinkActive(pathname, ADD_INVITATION_LINK.href)}
        />
        {INVITATIONS_LINKS.map((item) => (
          <NavLinkRow
            key={item.href}
            href={item.href}
            label={item.label}
            active={isLinkActive(pathname, item.href)}
            count={invitationCounts[item.countKind]}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Navigation for the authenticated app area: always offers a way back to the public home page
 * ("/") via the logo/title link, plus the "Organizacje" section (the organizations dashboard
 * and, nested under it, the invitations inbox). Mounted by apps/web/app/organizations/layout.tsx
 * - wraps every /organizations/* page, not the bare landing page (which keeps its own minimal
 * layout).
 *
 * Below the `sm` breakpoint the persistent 240px sidebar (built for a desktop-width viewport)
 * would otherwise squeeze the page content into a sliver next to it, so it's replaced by a
 * compact top bar with a menu button that expands into a full-width dropdown of the same links.
 *
 * From `sm` up, the sidebar itself can also be collapsed to a slim rail via the «/» toggle -
 * useful on an organization page, which has its own sub-navigation right next to it.
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

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
    <View className="min-h-screen w-full bg-band">
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
      <View className="relative flex-1 sm:flex-row">
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

        {/* Desktop rail: ALWAYS exactly 56px and in normal flow, in both states - this is what
            the content next to it sizes against, so expanding the nav never resizes this box,
            never reflows `children`, and the letters/cards there never shift. (An earlier version
            instead resized this same box between 56px/240px, which is exactly what pushed the
            page content around.) */}
        <View className="hidden w-[56px] shrink-0 items-center gap-4 border-r border-line bg-background p-3 sm:flex">
          <Pressable
            onPress={() => setCollapsed((c) => !c)}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? "Rozwiń nawigację" : "Zwiń nawigację"}
            className="rounded-pill p-2"
          >
            <Text className="font-sans text-[16px] text-foreground">{collapsed ? "»" : "«"}</Text>
          </Pressable>
        </View>

        {/* Expanded nav: a `position: absolute` overlay the same width (240px, constant - never
            toggled) the whole time, that floats OVER the rail and the page content instead of
            growing the rail above - so it can slide in/out without ever touching the content's
            layout. `translateX`/`opacity` are inline `style`, not conditional classes, for the
            same NativeWind-re-render reason noted on the mobile menu above. */}
        <View
          pointerEvents={collapsed ? "none" : "auto"}
          accessibilityElementsHidden={collapsed}
          importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
          aria-hidden={collapsed}
          style={{ opacity: collapsed ? 0 : 1, transform: [{ translateX: collapsed ? -24 : 0 }] }}
          className="absolute bottom-0 left-0 top-0 z-20 hidden w-[240px] gap-6 border-r border-line bg-background p-6 shadow-lg transition-all duration-200 ease-out sm:flex"
        >
          <View className="flex-row items-center justify-between gap-2">
            <Link href="/">
              <Text className="font-serif text-[18px] font-bold text-foreground">support-me-system</Text>
            </Link>
            <Pressable
              onPress={() => setCollapsed(true)}
              accessibilityRole="button"
              accessibilityLabel="Zwiń nawigację"
              className="rounded-pill p-2"
            >
              <Text className="font-sans text-[16px] text-foreground">«</Text>
            </Pressable>
          </View>

          <NavSections pathname={pathname} />
        </View>

        <View className="min-w-0 flex-1">{children}</View>
      </View>
    </View>
  );
}
