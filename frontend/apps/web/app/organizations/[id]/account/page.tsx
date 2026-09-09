import { AccountSettingsScreen, RequireAuth } from "@support-me/app";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <AccountSettingsScreen organizationId={id} />
    </RequireAuth>
  );
}
