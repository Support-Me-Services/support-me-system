"use client";

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "solito/link";
import { usePathname } from "solito/navigation";

export interface AppShellProps {
  children: React.ReactNode;
}

interface NavLink {
  href: string;
  label: string;
}

const ORGANIZATIONS_HREF = "/organizations";
const INVITATIONS_HREF = "/organizations/invitations";
const INVITATIONS_LINKS: NavLink[] = [
  { href: "/organizations/invitations/sent", label: "Wysłane" },
  { href: "/organizations/invitations/received", label: "Odebrane" },
];

/** Is `pathname` this link's page, or a sub-page of it (e.g. "/organizations/abc-123")? */
function isLinkActive(pathname: string, href: string): boolean {
  if (href === ORGANIZATIONS_HREF) {
    // "Organizacje" owns every /organizations/* route except the ones under the separate
    // "Zaproszenia" group below.
    return pathname === href || (pathname.startsWith(href + "/") && !pathname.startsWith(INVITATIONS_HREF));
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLinkRow({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <View className={`rounded-pill px-3 py-2 ${active ? "bg-accent/10" : ""}`}>
        <Text className={`font-sans text-[14px] ${active ? "font-semibold text-accent" : "text-foreground"}`}>
          {label}
        </Text>
      </View>
    </Link>
  );
}

function NavSections({ pathname }: { pathname: string }) {
  return (
    <View className="gap-2">
      <Text className="font-sans text-[12px] font-semibold uppercase tracking-wide text-muted">
        Organizacje
      </Text>
      <View className="gap-1">
        <NavLinkRow href={ORGANIZATIONS_HREF} label="Organizacje" active={isLinkActive(pathname, ORGANIZATIONS_HREF)} />

        <Text className="px-3 pt-2 font-sans text-[14px] text-foreground">Zaproszenia</Text>
        <View className="gap-1 pl-3">
          {INVITATIONS_LINKS.map((item) => (
            <NavLinkRow
              key={item.href}
              href={item.href}
              label={item.label}
              active={isLinkActive(pathname, item.href)}
            />
          ))}
        </View>
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

  return (
    <View className="min-h-screen w-full bg-band sm:flex-row">
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

        {menuOpen ? (
          <View className="gap-6 border-t border-line p-4">
            <NavSections pathname={pathname} />
          </View>
        ) : null}
      </View>

      <View
        className={`hidden shrink-0 border-r border-line bg-background sm:flex ${
          collapsed ? "w-[56px] items-center gap-4 p-3" : "w-[240px] gap-6 p-6"
        }`}
      >
        <View className={collapsed ? "items-center gap-4" : "flex-row items-center justify-between gap-2"}>
          {!collapsed ? (
            <Link href="/">
              <Text className="font-serif text-[18px] font-bold text-foreground">support-me-system</Text>
            </Link>
          ) : null}
          <Pressable
            onPress={() => setCollapsed((c) => !c)}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? "Rozwiń nawigację" : "Zwiń nawigację"}
            className="rounded-pill p-2"
          >
            <Text className="font-sans text-[16px] text-foreground">{collapsed ? "»" : "«"}</Text>
          </Pressable>
        </View>

        {!collapsed ? <NavSections pathname={pathname} /> : null}
      </View>

      <View className="min-w-0 flex-1">{children}</View>
    </View>
  );
}
