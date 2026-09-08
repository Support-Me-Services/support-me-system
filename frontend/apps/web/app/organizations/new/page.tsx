import { CreateOrganizationScreen, RequireAuth } from "@support-me/app";

export default function Page() {
  return (
    <RequireAuth>
      <CreateOrganizationScreen />
    </RequireAuth>
  );
}
