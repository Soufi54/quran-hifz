import type { Metadata, Viewport } from "next";
import "./globals.css";
import OnboardingGuard from "../components/OnboardingGuard";

export const metadata: Metadata = {
  title: "QuranDuel",
  description: "Le Duolingo du Coran - Memorise, revise, progresse",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1B4332",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <OnboardingGuard>{children}</OnboardingGuard>
      </body>
    </html>
  );
}
