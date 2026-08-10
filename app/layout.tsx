import type { Metadata } from "next";
import "./globals.css";
import "./heels.css";
import { StoreProvider } from "./store-provider";
import { CookieConsent } from "./cookie-consent";
import { StructuredData } from "./structured-data";
import { ScrollReveal } from "./scroll-reveal";
import { MarketingPopup } from "./marketing-popup";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ambboutique.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "AMB BOUTIQUE | Women’s Fashion from San Diego", template: "%s | AMB BOUTIQUE" },
  description: "Contemporary women’s clothing, dresses, tops, bags and shoes curated in San Diego, California by AMB BOUTIQUE.",
  keywords: ["women's clothing", "women's boutique", "dresses", "tops and blouses", "handbags", "women's shoes", "women's heels", "San Diego fashion", "AMB Boutique"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "AMB BOUTIQUE", title: "AMB BOUTIQUE | Women’s Fashion from San Diego", description: "Contemporary women’s fashion curated in San Diego.", url: siteUrl, images: [{ url: "/images/hero-01.webp", width: 1774, height: 887, alt: "AMB BOUTIQUE women’s fashion edit in San Diego" }] },
  twitter: { card: "summary_large_image", title: "AMB BOUTIQUE", description: "Contemporary women’s fashion curated in San Diego.", images: ["/images/hero-01.webp"] },
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
      <body><StructuredData/><StoreProvider>{children}<ScrollReveal/><CookieConsent/><MarketingPopup/></StoreProvider></body>
    </html>
  );
}
