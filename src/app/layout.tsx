import type { Metadata, Viewport } from "next";
import "./globals.css";
import OnboardingGuard from "../components/OnboardingGuard";
import PWAInstall from "../components/PWAInstall";
import ThemeProvider from "../components/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://quranhifz.pages.dev"),
  title: "Quran Hifz - Le Duolingo du Coran",
  description: "Memorise le Coran un verset a la fois. Challenge quotidien, progression visuelle, mosquee evolutive.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Quran Hifz - Le Duolingo du Coran",
    description: "Memorise le Coran un verset a la fois. Challenge quotidien, progression visuelle, mosquee evolutive.",
    type: "website",
    locale: "fr_FR",
    siteName: "Quran Hifz",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Quran Hifz" }],
  },
  twitter: {
    card: "summary",
    title: "Quran Hifz - Le Duolingo du Coran",
    description: "Memorise le Coran un verset a la fois. Challenge quotidien, progression visuelle.",
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#1B4332",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <PWAInstall />
          <OnboardingGuard>{children}</OnboardingGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
