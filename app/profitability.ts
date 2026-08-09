import type { Product } from "./data";

export type ProductEconomics = Pick<Product, "unitCostUsd" | "inboundFreightUsd" | "dutyUsd" | "packagingUsd" | "minimumMarginPercent">;

export type ProfitCheck = {
  costKnown: boolean;
  requestedPercent: number;
  approvedPercent: number;
  landedCostUsd: number | null;
  floorPriceUsd: number | null;
  contributionUsd: number | null;
  marginPercent: number | null;
};

const PAYMENT_FEE_RATE = 0.029;
const PAYMENT_FIXED_FEE_USD = 0.3;
const DEFAULT_MINIMUM_MARGIN_PERCENT = 30;

export function landedCost(product: ProductEconomics) {
  const costs = [product.unitCostUsd, product.inboundFreightUsd, product.dutyUsd, product.packagingUsd];
  if (!costs.every((value) => typeof value === "number" && Number.isFinite(value))) return null;
  return costs.reduce((total, value) => total + (value as number), 0);
}

/** Caps a promotion so the order preserves its configured contribution margin. */
export function protectMargin(product: Product, requestedPercent: number, shippingSubsidyUsd = 0): ProfitCheck {
  const cost = landedCost(product);
  const requested = Math.max(0, Math.min(25, requestedPercent));
  // Unknown cost never receives an automatic discount. This fail-closed rule is
  // deliberate: offers become available only after the imported catalogue has
  // a verified landed cost and minimum contribution margin.
  if (cost === null) return { costKnown: false, requestedPercent: requested, approvedPercent: 0, landedCostUsd: null, floorPriceUsd: null, contributionUsd: null, marginPercent: null };

  const minimumMargin = Math.max(0, Math.min(70, product.minimumMarginPercent ?? DEFAULT_MINIMUM_MARGIN_PERCENT)) / 100;
  const floorPrice = (cost + shippingSubsidyUsd + PAYMENT_FIXED_FEE_USD) / (1 - PAYMENT_FEE_RATE - minimumMargin);
  const maximumPercent = Math.max(0, Math.min(25, (1 - floorPrice / product.price) * 100));
  const approved = Math.min(requested, Math.floor(maximumPercent * 100) / 100);
  const salePrice = product.price * (1 - approved / 100);
  const contribution = salePrice * (1 - PAYMENT_FEE_RATE) - PAYMENT_FIXED_FEE_USD - cost - shippingSubsidyUsd;
  return {
    costKnown: true,
    requestedPercent: requested,
    approvedPercent: approved,
    landedCostUsd: cost,
    floorPriceUsd: floorPrice,
    contributionUsd: contribution,
    marginPercent: salePrice ? (contribution / salePrice) * 100 : 0,
  };
}

export function bestNonStackingDiscount(cartPercent: number, promotionCode?: string) {
  const welcomePercent = promotionCode?.trim().toUpperCase() === "AMBWELCOME10" ? 10 : 0;
  return { percent: Math.max(cartPercent, welcomePercent), source: welcomePercent > cartPercent ? "first-order" : cartPercent ? "cart-reward" : "none" } as const;
}
