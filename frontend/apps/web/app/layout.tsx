import "./globals.css";
import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import { Provider } from "@support-me/app";

// Matches packages/config/tailwind-preset.js's fontFamily.sans/serif tokens
// (extracted from the Figma component library: Inter for body/UI, Libre
// Baskerville for headings). `variable` + globals.css wires these into the
// `font-sans`/`font-serif` Tailwind utilities used throughout the app.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${libreBaskerville.variable}`}>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
