"use client";

export type GA4Item = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

type GA4Params = Record<string, unknown>;
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const consentKey = "amb-cookie-consent-v1";

export function analyticsConsentGranted() {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(window.localStorage.getItem(consentKey) || "null")?.value === "all";
  } catch {
    return false;
  }
}

function getGtag(): Gtag | null {
  if (typeof window === "undefined") return null;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }
  return window.gtag;
}

export function updateGA4Consent(value: "essential" | "all") {
  const gtag = getGtag();
  if (!gtag) return;
  gtag("consent", "update", {
    analytics_storage: value === "all" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function ga4Event(eventName: string, params: GA4Params = {}) {
  if (!analyticsConsentGranted()) return;
  const gtag = getGtag();
  if (!gtag) return;
  gtag("event", eventName, params);
}
