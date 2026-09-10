"use client";

import React from "react";
import { Text, View } from "react-native";
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

/**
 * Persistent left sidebar for the authenticated app area: always offers a way back to the
 * public home page ("/") via the logo/title link, plus the "Organizacje" section (the
 * organizations dashboard and, nested under it, the invitations inbox). Mounted by
 * apps/web/app/organizations/layout.tsx - wraps every /organizations/* page, not the bare
 * landing page (which keeps its own minimal layout).
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? "";

  return (
    <View className="min-h-screen w-full flex-row bg-band">
      <View className="w-[240px] shrink-0 gap-6 border-r border-line bg-background p-6">
        <Link href="/">
          <Text className="font-serif text-[18px] font-bold text-foreground">support-me-system</Text>
        </Link>

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
      </View>

      <View className="min-w-0 flex-1">{children}</View>
    </View>
  );
}
