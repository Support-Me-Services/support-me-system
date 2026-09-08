import { useLocalSearchParams } from "expo-router";
import { PublicAboutScreen } from "@support-me/app";

export default function OrgAboutPage() {
  const { categorySlug, nameSlug } = useLocalSearchParams<{
    categorySlug: string;
    nameSlug: string;
  }>();
  return <PublicAboutScreen type="ORG" categorySlug={categorySlug} nameSlug={nameSlug} />;
}
