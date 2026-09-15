// No AsyncStorage dependency in this codebase yet - falls back to an in-memory value, so
// switching still works for the lifetime of the app process, it just doesn't survive a real
// app restart on native. Add @react-native-async-storage/async-storage and swap this out if
// cross-restart persistence on native is needed later.
let lastActiveOrganizationId: string | null = null;

export function readLastActiveOrganizationId(): string | null {
  return lastActiveOrganizationId;
}

export function writeLastActiveOrganizationId(organizationId: string): void {
  lastActiveOrganizationId = organizationId;
}
