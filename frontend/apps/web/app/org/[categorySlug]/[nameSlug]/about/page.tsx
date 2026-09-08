import { PublicAboutScreen } from "@support-me/app";

export default async function Page({
  params,
}: {
  params: Promise<{ categorySlug: string; nameSlug: string }>;
}) {
  const { categorySlug, nameSlug } = await params;
  return <PublicAboutScreen type="ORG" categorySlug={categorySlug} nameSlug={nameSlug} />;
}
