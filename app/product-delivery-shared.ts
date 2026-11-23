import { deliveryWindows, isMarketCode, marketCodes, type MarketCode } from "./commerce";

export type SupplierDeliveryWindow = {
  minDays: number;
  maxDays: number;
  source?: "manual" | "supplier-quote";
};

export type ProductDeliveryWindows = Partial<Record<MarketCode, SupplierDeliveryWindow>>;
export type DeliveryWindowsMap = Record<string, ProductDeliveryWindows>;

// Includes the 5-day order processing and settlement cycle before supplier dispatch.
export const ORDER_PROCESSING_BUFFER_DAYS = 5;

export type ResolvedCustomerDeliveryWindow = {
  transitMin: number;
  transitMax: number;
  prepMin: number;
  prepMax: number;
  totalMinDays: number;
  totalMaxDays: number;
  unit: "calendar" | "business";
  isSupplierLinked: boolean;
  isFast: boolean;
  windowLabel: string;
};

function clampInt(value: unknown, min: number, max: number): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

export function sanitizeDeliveryWindow(value: unknown): SupplierDeliveryWindow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const minDays = clampInt(record.minDays, 1, 60);
  const maxDays = clampInt(record.maxDays ?? record.minDays, 1, 60);
  if (!minDays || !maxDays) return null;

  const low = Math.min(minDays, maxDays);
  const high = Math.max(minDays, maxDays);
  const source = record.source === "manual" ? "manual" : "supplier-quote";
  return { minDays: low, maxDays: high, source };
}

/**
 * Strips any unexpected fields so only sanitized slug -> market -> { minDays, maxDays } ever crosses API boundaries.
 */
export function sanitizeDeliveryWindowsMap(input: unknown): DeliveryWindowsMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: DeliveryWindowsMap = {};

  for (const [rawSlug, rawMarkets] of Object.entries(input as Record<string, unknown>)) {
    const slug = rawSlug.trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) continue;
    if (!rawMarkets || typeof rawMarkets !== "object" || Array.isArray(rawMarkets)) continue;

    const marketsObj = rawMarkets as Record<string, unknown>;
    const candidateMarkets =
      marketsObj.markets && typeof marketsObj.markets === "object" && !Array.isArray(marketsObj.markets)
        ? (marketsObj.markets as Record<string, unknown>)
        : marketsObj;

    const cleanMarkets: ProductDeliveryWindows = {};
    for (const [rawMarket, rawWindow] of Object.entries(candidateMarkets)) {
      const market = rawMarket.trim().toUpperCase() === "GB" ? "UK" : rawMarket.trim().toUpperCase();
      if (!isMarketCode(market)) continue;
      const clean = sanitizeDeliveryWindow(rawWindow);
      if (clean) cleanMarkets[market] = clean;
    }

    if (Object.keys(cleanMarkets).length > 0) {
      result[slug] = cleanMarkets;
    }
  }

  return result;
}

/**
 * Converts a linked supplier transit estimate (calendar days) into a customer-safe window
 * with a realistic safety buffer so fast suppliers clearly stand out while packages still arrive early.
 * Falls back transparently to AMB's market business-day table when unlinked.
 */
export function resolveCustomerDeliveryWindow(
  market: MarketCode,
  supplierWindow?: SupplierDeliveryWindow | null,
): ResolvedCustomerDeliveryWindow {
  const clean = sanitizeDeliveryWindow(supplierWindow);
  if (clean) {
    const transitMin = Math.max(2, Math.min(45, clean.minDays));
    const safetyBuffer = transitMin <= 7 ? 2 : transitMin <= 15 ? 3 : 4;
    const transitMax = Math.min(55, Math.max(clean.maxDays, transitMin + safetyBuffer));
    const prepMin = ORDER_PROCESSING_BUFFER_DAYS;
    const prepMax = ORDER_PROCESSING_BUFFER_DAYS;
    const totalMinDays = prepMin + transitMin;
    const totalMaxDays = prepMax + transitMax;
    const isFast = totalMaxDays <= 15;

    return {
      transitMin,
      transitMax,
      prepMin,
      prepMax,
      totalMinDays,
      totalMaxDays,
      unit: "calendar",
      isSupplierLinked: true,
      isFast,
      windowLabel: `${totalMinDays}–${totalMaxDays} days`,
    };
  }

  const fallback = deliveryWindows[market] || deliveryWindows.US;
  return {
    transitMin: fallback.min,
    transitMax: fallback.max,
    prepMin: ORDER_PROCESSING_BUFFER_DAYS,
    prepMax: ORDER_PROCESSING_BUFFER_DAYS,
    totalMinDays: ORDER_PROCESSING_BUFFER_DAYS + fallback.min,
    totalMaxDays: ORDER_PROCESSING_BUFFER_DAYS + fallback.max,
    unit: "business",
    isSupplierLinked: false,
    isFast: false,
    windowLabel: `${fallback.min}–${fallback.max} business days`,
  };
}

export function mergeDeliveryWindowsMaps(
  base: DeliveryWindowsMap,
  override: DeliveryWindowsMap,
): DeliveryWindowsMap {
  const merged: DeliveryWindowsMap = {};
  const slugs = new Set([...Object.keys(base), ...Object.keys(override)]);
  for (const slug of slugs) {
    const baseMarkets = base[slug] || {};
    const overrideMarkets = override[slug] || {};
    const combined: ProductDeliveryWindows = {};
    for (const market of marketCodes) {
      const chosen = overrideMarkets[market] || baseMarkets[market];
      if (chosen) combined[market] = chosen;
    }
    if (Object.keys(combined).length > 0) {
      merged[slug] = combined;
    }
  }
  return merged;
}
