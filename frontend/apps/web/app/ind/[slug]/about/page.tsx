import { PublicAboutScreen } from "@support-me/app";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicAboutScreen type="IND" slug={slug} />;
}
