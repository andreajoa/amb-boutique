// Server-only by use: no client component may import this module, because it
// carries landed costs. The browser receives offerCeilingByPrice instead.
import { products, type Product } from "./data";
import costEvidence from "../imports/cost-evidence.json";
import { offerPriceKey } from "./offer-ceiling";

export type ProductEconomics = Pick<Product, "unitCostUsd" | "inboundFreightUsd" | "dutyUsd" | "packagingUsd" | "minimumMarginPercent" | "minimumCostMultiplier"> & { slug?: string };

const provenCost: Record<string, { landedCostUsd: number }> = costEvidence.products;

export type ProfitCheck = {
  costKnown: boolean;
  requestedPercent: number;
  approvedPercent: number;
  landedCostUsd: number | null;
  floorPriceUsd: number | null;
  contributionUsd: number | null;
  marginPercent: number | null;
};

// Economics live on the canonical catalogue objects as non-enumerable fields, so
// copies made with a spread ({ ...product, price }) do not carry them. Read the
// copy's own value first and fall back to the canonical product by slug.
let canonicalBySlug: Map<string, Product> | null = null;
function economicsField<K extends keyof ProductEconomics>(product: ProductEconomics, key: K): ProductEconomics[K] {
  if (product[key] !== undefined || !product.slug) return product[key];
  canonicalBySlug ||= new Map(products.map((item) => [item.slug, item]));
  return canonicalBySlug.get(product.slug)?.[key as keyof Product] as ProductEconomics[K];
}

const PAYMENT_FEE_RATE = 0.029;
const PAYMENT_FIXED_FEE_USD = 0.3;
const DEFAULT_MINIMUM_MARGIN_PERCENT = 30;

export function landedCost(product: ProductEconomics) {
  // Só há custo quando uma fonte datada o comprova (imports/cost-evidence.json: produto + frete EUA).
  // Vale o maior entre a prova e o cadastro, para um custo antigo nunca liberar desconto demais.
  const proven = product.slug ? provenCost[product.slug]?.landedCostUsd : undefined;
  if (typeof proven !== "number") return null;
  const unitCostUsd = economicsField(product, "unitCostUsd");
  const unit = typeof unitCostUsd === "number" && Number.isFinite(unitCostUsd) ? Math.max(unitCostUsd, proven) : proven;
  const extras = [economicsField(product, "inboundFreightUsd"), economicsField(product, "dutyUsd"), economicsField(product, "packagingUsd")];
  if (extras.some((value) => value !== undefined && !Number.isFinite(value))) return null;
  return extras.reduce<number>((total, value) => total + (value ?? 0), unit);
}

/** Caps a promotion so the order preserves its configured contribution margin. */
export function protectMargin(product: Product, requestedPercent: number, shippingSubsidyUsd = 0): ProfitCheck {
  const cost = landedCost(product);
  const requested = Math.max(0, Math.min(25, requestedPercent));
  // Unknown cost never receives an automatic discount. This fail-closed rule is
  // deliberate: offers become available only after the imported catalogue has
  // a verified landed cost and minimum contribution margin.
  if (cost === null) return { costKnown: false, requestedPercent: requested, approvedPercent: 0, landedCostUsd: null, floorPriceUsd: null, contributionUsd: null, marginPercent: null };

  const minimumMargin = Math.max(0, Math.min(70, economicsField(product, "minimumMarginPercent") ?? DEFAULT_MINIMUM_MARGIN_PERCENT)) / 100;
  const marginFloor = (cost + shippingSubsidyUsd + PAYMENT_FIXED_FEE_USD) / (1 - PAYMENT_FEE_RATE - minimumMargin);
  const multiplier = economicsField(product, "minimumCostMultiplier");
  const costFloor = typeof multiplier === "number" && Number.isFinite(multiplier) && multiplier >= 1 ? cost * multiplier : 0;
  const floorPrice = Math.max(marginFloor, costFloor);
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

/**
 * The most the margin guard approves for each price of a product (requested 25%,
 * the cap). For any request r in 0–25, protectMargin(p, r).approvedPercent is
 * exactly min(r, ceiling), so the browser can apply offers without the cost.
 */
export function offerCeilingsFor(product: Product): Record<string, number> {
  const prices = new Set([product.price, ...Object.values(product.sizePrices || {})]);
  return Object.fromEntries([...prices]
    .filter((price) => Number.isFinite(price) && price > 0)
    .map((price) => [offerPriceKey(price), protectMargin({ ...product, price }, 25).approvedPercent]));
}

export function bestNonStackingDiscount(cartPercent: number, promotionCode?: string) {
  const welcomePercent = promotionCode?.trim().toUpperCase() === "AMBWELCOME10" ? 10 : 0;
  return { percent: Math.max(cartPercent, welcomePercent), source: welcomePercent > cartPercent ? "first-order" : cartPercent ? "cart-reward" : "none" } as const;
}
