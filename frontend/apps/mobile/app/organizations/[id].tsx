import { useLocalSearchParams } from "expo-router";
import { OrganizationDetailScreen, RequireAuth } from "@support-me/app";

export default function OrganizationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireAuth>
      <OrganizationDetailScreen organizationId={id} />
    </RequireAuth>
  );
}
