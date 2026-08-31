import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./heels.css";
import { StoreProvider } from "./store-provider";
import { CookieConsent } from "./cookie-consent";
import { StructuredData } from "./structured-data";
import { ScrollReveal } from "./scroll-reveal";
import { MarketingPopup } from "./marketing-popup";
import { AnalyticsTracker } from "./analytics-tracker";
import { GA4EcommerceTracker } from "./ga4-ecommerce-tracker";
import { products, type Product } from "./data";
import { PremiumInteractions } from "./premium-interactions";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ambboutique.online";
const googleAnalyticsId = "G-DWG9XEX8VS";
const defaultTitle = "AMB BOUTIQUE | Women’s Dresses, Rompers & Fashion";
const defaultDescription = "Shop women’s dresses, rompers, skirts, tops, knitwear, bags and heels curated in San Diego. Delivery to the US, Canada, UK, Australia & New Zealand.";

function getStoreCatalog(): Product[] {
  return products.map((product) => {
    const storeProduct = { ...product };
    delete storeProduct.description;
    delete storeProduct.materials;
    delete storeProduct.care;
    delete storeProduct.garmentMeasurements;
    delete storeProduct.stripePriceId;
    delete storeProduct.vendor;
    delete storeProduct.weightOz;
    return storeProduct;
  });
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "AMB BOUTIQUE",
  title: { default: defaultTitle, template: "%s | AMB BOUTIQUE" },
  description: defaultDescription,
  keywords: [
    "women's clothing",
    "women's online boutique",
    "women's dresses",
    "rompers for women",
    "women's playsuits",
    "women's skirts",
    "women's tops",
    "women's knitwear",
    "women's bags",
    "women's heels",
    "San Diego fashion boutique",
    "AMB Boutique",
  ],
  authors: [{ name: "AMB BOUTIQUE", url: siteUrl }],
  creator: "AMB BOUTIQUE",
  publisher: "AMB BOUTIQUE",
  category: "Women’s fashion",
  alternates: { canonical: "/" },
  verification: {
    google: "nHRFB2Xi3i90p-W22D8HHVorNaelyu2-uavpm5INxpY",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "AMB BOUTIQUE",
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    locale: "en_US",
    alternateLocale: ["en_CA", "en_GB", "en_AU", "en_NZ"],
    images: [
      {
        url: "/images/hero-01.webp",
        width: 1774,
        height: 887,
        alt: "AMB BOUTIQUE women’s fashion edit curated in San Diego",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/images/hero-01.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const catalog = getStoreCatalog();

  return (
    <html lang="en">
      <body>
        <Script id="google-analytics-bootstrap" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            var ambConsent = 'denied';
            try {
              var savedConsent = JSON.parse(localStorage.getItem('amb-cookie-consent-v1') || 'null');
              if (savedConsent && savedConsent.value === 'all') ambConsent = 'granted';
            } catch (e) {}
            gtag('consent', 'default', {
              analytics_storage: ambConsent,
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500
            });
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}', { send_page_view: false });
          `}
        </Script>
        <Script
          id="google-analytics-loader"
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <StructuredData />
        <StoreProvider catalog={catalog}>
          {children}
          <AnalyticsTracker />
          <GA4EcommerceTracker catalog={catalog} />
          <ScrollReveal />
          <PremiumInteractions />
          <CookieConsent />
          <MarketingPopup />
        </StoreProvider>
      </body>
    </html>
  );
}
