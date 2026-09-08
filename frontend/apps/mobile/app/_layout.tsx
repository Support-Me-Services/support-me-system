import "../global.css";
import { Stack } from "expo-router";
import { Provider } from "@support-me/app";

export default function RootLayout() {
  return (
    <Provider>
      <Stack screenOptions={{ headerShown: false }} />
    </Provider>
  );
}
