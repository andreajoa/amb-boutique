"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { convertFromUsd, markets, type MarketCode } from "./commerce";
import type { Product } from "./data";
import { analyticsConsentGranted, ga4Event, type GA4Item } from "./ga4";
import { useStore, type CartLine } from "./store-provider";

const cartStorageKey = "amb-boutique-cart-v2";

function money(valueUsd: number, market: MarketCode) {
  return Number(convertFromUsd(valueUsd, market).toFixed(2));
}

function variant(line: Pick<CartLine, "size" | "color" | "heelHeightCm">) {
  return [line.color, line.size, line.heelHeightCm ? `${line.heelHeightCm}cm heel` : ""].filter(Boolean).join(" / ");
}

function cartItem(line: CartLine, product: Product | undefined, market: MarketCode, quantity = line.quantity): GA4Item {
  return {
    item_id: line.slug,
    item_name: line.name,
    item_category: product?.category,
    item_variant: variant(line) || undefined,
    price: money(line.price, market),
    quantity,
  };
}

function productItem(product: Product, market: MarketCode): GA4Item {
  return {
    item_id: product.slug,
    item_name: product.name,
    item_category: product.category,
    price: money(product.price, market),
    quantity: 1,
  };
}

function cartSnapshot(lines: CartLine[]) {
  return new Map(lines.map((line) => [line.id, { ...line }]));
}

function storedCartSnapshot() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(cartStorageKey) || "[]");
    return Array.isArray(parsed) ? cartSnapshot(parsed as CartLine[]) : new Map<string, CartLine>();
  } catch {
    return new Map<string, CartLine>();
  }
}

export function GA4EcommerceTracker({ catalog }: { catalog: Product[] }) {
  const pathname = usePathname();
  const { cart, cartOpen, market, estimatedTotal, promoCode } = useStore();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const previousCart = useRef<Map<string, CartLine> | null>(null);
  const previousCartOpen = useRef(false);
  const lastViewedProduct = useRef("");
  const catalogBySlug = useMemo(() => new Map(catalog.map((product) => [product.slug, product])), [catalog]);

  useEffect(() => {
    const update = () => setAnalyticsEnabled(analyticsConsentGranted());
    update();
    window.addEventListener("amb-consent-change", update);
    return () => window.removeEventListener("amb-consent-change", update);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const match = pathname.match(/^\/products\/([^/]+)$/);
    if (!match) {
      lastViewedProduct.current = "";
      return;
    }
    const slug = decodeURIComponent(match[1]);
    const product = catalogBySlug.get(slug);
    if (!analyticsEnabled || !product || lastViewedProduct.current === slug) return;
    lastViewedProduct.current = slug;
    ga4Event("view_item", {
      currency: markets[market].currency,
      value: money(product.price, market),
      items: [productItem(product, market)],
    });
  }, [analyticsEnabled, catalogBySlug, market, pathname]);

  useEffect(() => {
    if (previousCart.current === null) {
      previousCart.current = storedCartSnapshot();
      return;
    }

    const before = previousCart.current;
    const after = cartSnapshot(cart);

    if (analyticsEnabled) {
      for (const [id, line] of after) {
        const oldQuantity = before.get(id)?.quantity || 0;
        const delta = line.quantity - oldQuantity;
        if (delta > 0) {
          const product = catalogBySlug.get(line.slug);
          ga4Event("add_to_cart", {
            currency: markets[market].currency,
            value: money(line.price * delta, market),
            items: [cartItem(line, product, market, delta)],
          });
        }
      }

      for (const [id, line] of before) {
        const newQuantity = after.get(id)?.quantity || 0;
        const delta = line.quantity - newQuantity;
        if (delta > 0) {
          const product = catalogBySlug.get(line.slug);
          ga4Event("remove_from_cart", {
            currency: markets[market].currency,
            value: money(line.price * delta, market),
            items: [cartItem(line, product, market, delta)],
          });
        }
      }
    }

    previousCart.current = after;
  }, [analyticsEnabled, cart, catalogBySlug, market]);

  useEffect(() => {
    if (cartOpen && !previousCartOpen.current && analyticsEnabled && cart.length) {
      ga4Event("view_cart", {
        currency: markets[market].currency,
        value: money(estimatedTotal, market),
        items: cart.map((line) => cartItem(line, catalogBySlug.get(line.slug), market)),
      });
    }
    previousCartOpen.current = cartOpen;
  }, [analyticsEnabled, cart, cartOpen, catalogBySlug, estimatedTotal, market]);

  useEffect(() => {
    if (!analyticsEnabled || pathname !== "/checkout" || !cart.length) return;
    const sessionId = window.sessionStorage.getItem("amb-stripe-session-id") || "checkout";
    const dedupeKey = `amb-ga4-begin-checkout:${sessionId}`;
    if (window.sessionStorage.getItem(dedupeKey)) return;

    ga4Event("begin_checkout", {
      currency: markets[market].currency,
      value: money(estimatedTotal, market),
      coupon: promoCode || undefined,
      items: cart.map((line) => cartItem(line, catalogBySlug.get(line.slug), market)),
    });
    window.sessionStorage.setItem(dedupeKey, "1");
  }, [analyticsEnabled, cart, catalogBySlug, estimatedTotal, market, pathname, promoCode]);

  return null;
}
