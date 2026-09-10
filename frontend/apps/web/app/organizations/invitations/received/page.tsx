import { ReceivedInvitationsScreen, RequireAuth } from "@support-me/app";

export default function Page() {
  return (
    <RequireAuth>
      <ReceivedInvitationsScreen />
    </RequireAuth>
  );
}
