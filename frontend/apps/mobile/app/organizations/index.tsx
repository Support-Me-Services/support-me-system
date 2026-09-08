import { OrganizationsDashboardScreen, RequireAuth } from "@support-me/app";

export default function OrganizationsIndex() {
  return (
    <RequireAuth>
      <OrganizationsDashboardScreen />
    </RequireAuth>
  );
}
