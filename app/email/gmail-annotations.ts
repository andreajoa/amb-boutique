import { BLACK_FRIDAY, FIRST_ORDER_CODE } from "../commerce";

export type GmailAnnotationProduct = {
  slug: string;
  name: string;
  image?: string;
};

type GmailOrganization = {
  "@context": "http://schema.org/";
  "@type": "Organization";
  name: string;
  logo: string;
};

type GmailDiscountOffer = {
  "@context": "http://schema.org/";
  "@type": "DiscountOffer";
  description: string;
  discountCode?: string;
  availabilityStarts?: string;
  availabilityEnds?: string;
};

type GmailPromotionCard = {
  "@context": "http://schema.org/";
  "@type": "PromotionCard";
  image: string;
  url: string;
  headline: string;
  position: number;
};

export type GmailAnnotationEntry = GmailOrganization | GmailDiscountOffer | GmailPromotionCard;

const PUBLIC_EMAIL_ORIGIN = "https://ambboutique.online";
const MAX_CAROUSEL_CARDS = 10;

export function emailPublicOrigin() {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (/^https:\/\/(?:www\.)?ambboutique\.online$/i.test(configured)) {
    return PUBLIC_EMAIL_ORIGIN;
  }
  return PUBLIC_EMAIL_ORIGIN;
}

export function emailBrandLogoUrl() {
  return `${emailPublicOrigin()}/logo-512.png`;
}

export function emailProductCardImageUrl(slug: string) {
  return `${emailPublicOrigin()}/email-media/product/${encodeURIComponent(slug)}.jpg`;
}

function productCardTargetUrl(slug: string, campaignKey: string) {
  const url = new URL(`/products/${encodeURIComponent(slug)}`, emailPublicOrigin());
  url.searchParams.set("utm_source", "resend");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campaignKey);
  url.searchParams.set("utm_content", `gmail-card-${slug}`);
  return url.toString();
}

function discountOfferForCampaign(campaignKey: string): GmailDiscountOffer | null {
  if (campaignKey === "welcome-discount") {
    return {
      "@context": "http://schema.org/",
      "@type": "DiscountOffer",
      description: "10% off your first order",
      discountCode: FIRST_ORDER_CODE,
    };
  }
  if (campaignKey === "holiday-vip") {
    return {
      "@context": "http://schema.org/",
      "@type": "DiscountOffer",
      description: "20% off the Holiday edit",
      discountCode: BLACK_FRIDAY.vipCode,
      availabilityStarts: "2026-11-19T00:00:00-05:00",
      availabilityEnds: "2026-11-30T23:59:59-05:00",
    };
  }
  if (campaignKey === "holiday-open" || campaignKey === "holiday-bf" || campaignKey === "holiday-cyber") {
    return {
      "@context": "http://schema.org/",
      "@type": "DiscountOffer",
      description: "20% off the Holiday edit",
      availabilityStarts: "2026-11-20T00:00:00-05:00",
      availabilityEnds: "2026-11-30T23:59:59-05:00",
    };
  }
  return null;
}

export function buildGmailAnnotations(options: {
  campaignKey: string;
  products?: GmailAnnotationProduct[];
  transactional?: boolean;
}): GmailAnnotationEntry[] {
  const entries: GmailAnnotationEntry[] = [
    {
      "@context": "http://schema.org/",
      "@type": "Organization",
      name: "AMB BOUTIQUE",
      logo: emailBrandLogoUrl(),
    },
  ];

  if (options.transactional) return entries;

  const offer = discountOfferForCampaign(options.campaignKey);
  if (offer) entries.push(offer);

  const seen = new Set<string>();
  const cards: GmailPromotionCard[] = [];
  for (const product of options.products || []) {
    if (!product.slug || seen.has(product.slug)) continue;
    if (product.image !== undefined && !product.image.startsWith("/")) continue;
    seen.add(product.slug);
    cards.push({
      "@context": "http://schema.org/",
      "@type": "PromotionCard",
      image: emailProductCardImageUrl(product.slug),
      url: productCardTargetUrl(product.slug, options.campaignKey),
      headline: product.name,
      position: cards.length + 1,
    });
    if (cards.length >= MAX_CAROUSEL_CARDS) break;
  }

  return [...entries, ...cards];
}

export function buildGmailAnnotationsScript(options: {
  campaignKey: string;
  products?: GmailAnnotationProduct[];
  transactional?: boolean;
}) {
  const data = buildGmailAnnotations(options);
  const serialized = JSON.stringify(data).replaceAll("</", "<\\/");
  return `<script type="application/ld+json">${serialized}</script>`;
}
