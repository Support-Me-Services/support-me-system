import { AddInvitationScreen, RequireAuth } from "@support-me/app";

export default function AddInvitation() {
  return (
    <RequireAuth>
      <AddInvitationScreen />
    </RequireAuth>
  );
}
