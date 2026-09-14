import { AddInvitationScreen, RequireAuth } from "@support-me/app";

export default function Page() {
  return (
    <RequireAuth>
      <AddInvitationScreen />
    </RequireAuth>
  );
}
