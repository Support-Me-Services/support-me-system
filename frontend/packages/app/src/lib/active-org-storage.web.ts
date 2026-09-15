const STORAGE_KEY = "support-me:lastActiveOrganizationId";

/** Per-browser only (see ActiveOrganizationProvider's doc comment) - backed by localStorage. */
export function readLastActiveOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeLastActiveOrganizationId(organizationId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, organizationId);
  } catch {
    // Private browsing / storage disabled - the switcher still works for this session, it just
    // won't be remembered on the next login.
  }
}
