import "server-only";

import type { Product } from "./data";
import {
  FIRST_ORDER_CODE,
  convertFromUsd,
  getDiscountState,
  getShippingQuotes,
  type MarketCode,
  type ShippingQuote,
} from "./commerce";
import { bestNonStackingDiscount, protectMargin, type ProfitCheck } from "./profitability";

export type PricedCheckoutItem = {
  lineKey?: string;
  product: Product;
  quantity: number;
  offer?: "cart-bump" | "post-purchase";
};

export type PricedLineResult = {
  lineKey?: string;
  requestedPercent: number;
  margin: ProfitCheck;
  discountedUnitUsd: number;
  unitAmountMinor: number;
  lineSubtotalUsd: number;
  discountedLineUsd: number;
  excludedFromOffers: boolean;
};

export type CartOfferPricing = {
  subtotalUsd: number;
  packedWeightOz: number;
  totalUnits: number;
  reward: ReturnType<typeof getDiscountState>;
  globalOffer: ReturnType<typeof bestNonStackingDiscount>;
  shippingQuotes: ShippingQuote[];
  complimentaryShippingCostUsd: number;
  lines: PricedLineResult[];
  effectiveDiscountUsd: number;
  estimatedTotalUsd: number;
  hasIneligibleItems: boolean;
};

/**
 * Single server-side source of truth for margin-protected cart & checkout totals.
 * Never returns landed cost, unit cost, or margin figures to browser callers.
 */
export function calculateCartOfferPricing(
  items: PricedCheckoutItem[],
  market: MarketCode,
  promotionCode?: string,
  now = Date.now(),
): CartOfferPricing {
  const subtotalUsd = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const packedWeightOz = items.reduce((sum, item) => sum + (item.product.weightOz || 12) * item.quantity, 0);
  const totalUnits = Math.max(1, items.reduce((sum, item) => sum + item.quantity, 0));

  const promoCode = promotionCode?.trim().toUpperCase();
  const reward = getDiscountState(subtotalUsd, now, promoCode);
  const globalOffer = bestNonStackingDiscount(
    reward.percent,
    promoCode === FIRST_ORDER_CODE ? promoCode : undefined,
  );
  const shippingQuotes = getShippingQuotes(market, subtotalUsd, packedWeightOz, now);

  // Free shipping becomes a store cost and enters the discount margin guard.
  const complimentaryShippingCostUsd = shippingQuotes[0].amountUsd !== 0
    ? 0
    : market === "US"
      ? packedWeightOz <= 16 ? 11.95 : packedWeightOz <= 32 ? 17.65 : 22.45
      : getShippingQuotes(market, subtotalUsd, packedWeightOz, 0)[0].amountUsd;

  const lines: PricedLineResult[] = items.map((item) => {
    const requestedPercent = item.offer === "post-purchase"
      ? 15
      : Math.max(globalOffer.percent, item.offer === "cart-bump" ? 10 : 0);
    const margin = protectMargin(
      item.product,
      requestedPercent,
      complimentaryShippingCostUsd / totalUnits,
    );
    const discountedUnitUsd = item.product.price * (1 - margin.approvedPercent / 100);
    const unitAmountMinor = Math.max(50, Math.round(convertFromUsd(discountedUnitUsd, market) * 100));
    const lineSubtotalUsd = item.product.price * item.quantity;
    const discountedLineUsd = discountedUnitUsd * item.quantity;
    return {
      lineKey: item.lineKey,
      requestedPercent,
      margin,
      discountedUnitUsd,
      unitAmountMinor,
      lineSubtotalUsd,
      discountedLineUsd,
      excludedFromOffers: requestedPercent > 0 && margin.approvedPercent === 0,
    };
  });

  const estimatedTotalUsd = lines.reduce((sum, line) => sum + line.discountedLineUsd, 0);
  const effectiveDiscountUsd = Math.max(0, subtotalUsd - estimatedTotalUsd);
  const hasIneligibleItems = lines.some((line) => line.excludedFromOffers);

  return {
    subtotalUsd,
    packedWeightOz,
    totalUnits,
    reward,
    globalOffer,
    shippingQuotes,
    complimentaryShippingCostUsd,
    lines,
    effectiveDiscountUsd,
    estimatedTotalUsd,
    hasIneligibleItems,
  };
}
