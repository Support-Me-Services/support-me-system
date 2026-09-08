import { CreateOrganizationScreen, RequireAuth } from "@support-me/app";

export default function NewOrganization() {
  return (
    <RequireAuth>
      <CreateOrganizationScreen />
    </RequireAuth>
  );
}
