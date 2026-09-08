import { OrganizationsDashboardScreen, RequireAuth } from "@support-me/app";

export default function Page() {
  return (
    <RequireAuth>
      <OrganizationsDashboardScreen />
    </RequireAuth>
  );
}
