import { PendingDeletionsScreen, RequireAuth } from "@support-me/app";

export default function Page() {
  return (
    <RequireAuth role="SUPER_ADMIN">
      <PendingDeletionsScreen />
    </RequireAuth>
  );
}
