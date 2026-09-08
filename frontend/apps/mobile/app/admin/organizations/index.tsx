import { PendingDeletionsScreen, RequireAuth } from "@support-me/app";

export default function AdminOrganizations() {
  return (
    <RequireAuth role="SUPER_ADMIN">
      <PendingDeletionsScreen />
    </RequireAuth>
  );
}
