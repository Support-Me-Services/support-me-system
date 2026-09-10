import { SentInvitationsScreen, RequireAuth } from "@support-me/app";

export default function SentInvitations() {
  return (
    <RequireAuth>
      <SentInvitationsScreen />
    </RequireAuth>
  );
}
