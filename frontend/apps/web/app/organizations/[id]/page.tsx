import { OrganizationDetailScreen, RequireAuth } from "@support-me/app";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <OrganizationDetailScreen organizationId={id} />
    </RequireAuth>
  );
}
