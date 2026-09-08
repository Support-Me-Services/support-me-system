import { useLocalSearchParams } from "expo-router";
import { PublicAboutScreen } from "@support-me/app";

export default function IndividualAboutPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <PublicAboutScreen type="IND" slug={slug} />;
}
