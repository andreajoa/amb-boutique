"use client";

import { useEffect } from "react";
import { analyticsConsentGranted, ga4Event, type GA4Item } from "./ga4";

export type GA4PurchasePayload = {
  transactionId: string;
  value: number;
  currency: string;
  tax?: number;
  shipping?: number;
  items: GA4Item[];
};

export function GA4Purchase({ purchase }: { purchase: GA4PurchasePayload }) {
  useEffect(() => {
    if (!analyticsConsentGranted()) return;
    const dedupeKey = `amb-ga4-purchase:${purchase.transactionId}`;
    if (window.localStorage.getItem(dedupeKey)) return;

    ga4Event("purchase", {
      transaction_id: purchase.transactionId,
      value: purchase.value,
      currency: purchase.currency,
      tax: purchase.tax,
      shipping: purchase.shipping,
      items: purchase.items,
    });

    window.localStorage.setItem(dedupeKey, new Date().toISOString());
  }, [purchase]);

  return null;
}
