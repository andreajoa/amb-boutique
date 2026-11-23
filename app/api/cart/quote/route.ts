import { NextResponse } from "next/server";
import { products } from "../../../data";
import { productForSize } from "../../../product-pricing";
import { resolveShoeProductSlug } from "../../../shoe-products";
import { isMarketCode } from "../../../commerce";
import { calculateCartOfferPricing, type PricedCheckoutItem } from "../../../checkout-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuoteItem = {
  id?: string;
  slug?: string;
  quantity?: number;
  size?: string;
  heelHeightCm?: number;
  offer?: "cart-bump" | "post-purchase";
};

type QuoteBody = {
  items?: QuoteItem[];
  market?: unknown;
  promotionCode?: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as QuoteBody | null;
  if (!body || !Array.isArray(body.items) || body.items.length > 30) {
    return NextResponse.json(
      { error: "Invalid cart quote request." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const market = isMarketCode(body.market) ? body.market : "US";
  const normalized: PricedCheckoutItem[] = [];

  for (const item of body.items) {
    const requestedHeel = item.heelHeightCm === undefined ? undefined : Number(item.heelHeightCm);
    const resolvedSlug = item.slug ? resolveShoeProductSlug(item.slug, requestedHeel) : undefined;
    const product = products.find((candidate) => candidate.slug === resolvedSlug);
    if (!product) continue;

    const size = typeof item.size === "string" ? item.size.trim() : "";
    let pricedProduct = product;
    try {
      pricedProduct = productForSize(product, size || undefined);
    } catch {
      continue;
    }

    const quantity = Math.max(1, Math.min(10, Math.floor(Number(item.quantity) || 1)));
    const offer = item.offer === "cart-bump" || item.offer === "post-purchase" ? item.offer : undefined;
    normalized.push({
      lineKey: typeof item.id === "string" ? item.id.slice(0, 200) : product.slug,
      product: pricedProduct,
      quantity,
      offer,
    });
  }

  if (!normalized.length) {
    return NextResponse.json(
      {
        subtotalUsd: 0,
        effectiveDiscountUsd: 0,
        estimatedTotalUsd: 0,
        shippingUsd: 0,
        shippingLabel: "",
        requestedPercent: 0,
        hasIneligibleItems: false,
        lines: {},
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const pricing = calculateCartOfferPricing(normalized, market, body.promotionCode);
  const lines: Record<string, { approvedPercent: number; discountedLineUsd: number; excluded: boolean }> = {};
  for (const line of pricing.lines) {
    if (!line.lineKey) continue;
    lines[line.lineKey] = {
      approvedPercent: line.margin.approvedPercent,
      discountedLineUsd: Number(line.discountedLineUsd.toFixed(2)),
      excluded: line.excludedFromOffers,
    };
  }

  return NextResponse.json(
    {
      subtotalUsd: Number(pricing.subtotalUsd.toFixed(2)),
      effectiveDiscountUsd: Number(pricing.effectiveDiscountUsd.toFixed(2)),
      estimatedTotalUsd: Number(pricing.estimatedTotalUsd.toFixed(2)),
      shippingUsd: pricing.shippingQuotes[0]?.amountUsd ?? 0,
      shippingLabel: pricing.shippingQuotes[0]?.label ?? "",
      requestedPercent: pricing.globalOffer.percent,
      hasIneligibleItems: pricing.hasIneligibleItems,
      lines,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
