import { AccountSettingsScreen, RequireAuth } from "@support-me/app";

export default function Page() {
  return (
    <RequireAuth>
      <AccountSettingsScreen />
    </RequireAuth>
  );
}
