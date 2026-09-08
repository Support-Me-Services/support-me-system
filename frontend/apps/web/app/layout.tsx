import "./globals.css";
import type { Metadata } from "next";
import { Provider } from "@support-me/app";

export const metadata: Metadata = {
  title: "support-me-system",
  description: "support-me-system web app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
