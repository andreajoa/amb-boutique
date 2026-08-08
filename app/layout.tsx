import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "./store-provider";
import { CookieConsent } from "./cookie-consent";
import { StructuredData } from "./structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ambboutique.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "AMB BOUTIQUE | Women’s Fashion from San Diego", template: "%s | AMB BOUTIQUE" },
  description: "Contemporary women’s clothing, dresses, tops, bags and shoes curated in San Diego, California by AMB BOUTIQUE.",
  keywords: ["women's clothing", "women's boutique", "dresses", "tops and blouses", "handbags", "women's shoes", "San Diego fashion", "AMB Boutique"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "AMB BOUTIQUE", title: "AMB BOUTIQUE | Women’s Fashion from San Diego", description: "Contemporary women’s fashion curated in San Diego.", url: siteUrl, images: [{ url: "/images/amb-hero.webp", width: 1600, height: 900 }] },
  twitter: { card: "summary_large_image", title: "AMB BOUTIQUE", description: "Contemporary women’s fashion curated in San Diego.", images: ["/images/amb-hero.webp"] },
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><StructuredData/><StoreProvider>{children}<CookieConsent /></StoreProvider></body>
    </html>
  );
}
