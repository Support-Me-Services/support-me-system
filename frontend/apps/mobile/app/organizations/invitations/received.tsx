import { ReceivedInvitationsScreen, RequireAuth } from "@support-me/app";

export default function ReceivedInvitations() {
  return (
    <RequireAuth>
      <ReceivedInvitationsScreen />
    </RequireAuth>
  );
}
