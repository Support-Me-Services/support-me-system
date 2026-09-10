import { SentInvitationsScreen, RequireAuth } from "@support-me/app";

export default function Page() {
  return (
    <RequireAuth>
      <SentInvitationsScreen />
    </RequireAuth>
  );
}
