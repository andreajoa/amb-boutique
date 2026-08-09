export const marketCodes = ["US", "CA", "UK", "AU", "NZ"] as const;
export type MarketCode = (typeof marketCodes)[number];

type Market = {
  code: MarketCode;
  country: string;
  currency: "USD" | "CAD" | "GBP" | "AUD" | "NZD";
  locale: string;
  flag: string;
  rate: number;
};

const envRate = (configured: string | undefined, fallback: number) => {
  const value = Number(configured);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// Preview rates are configurable so launch-day rates can be updated without UI changes.
export const markets: Record<MarketCode, Market> = {
  US: { code: "US", country: "United States", currency: "USD", locale: "en-US", flag: "🇺🇸", rate: 1 },
  CA: { code: "CA", country: "Canada", currency: "CAD", locale: "en-CA", flag: "🇨🇦", rate: envRate(process.env.NEXT_PUBLIC_RATE_CAD, 1.38) },
  UK: { code: "UK", country: "United Kingdom", currency: "GBP", locale: "en-GB", flag: "🇬🇧", rate: envRate(process.env.NEXT_PUBLIC_RATE_GBP, 0.75) },
  AU: { code: "AU", country: "Australia", currency: "AUD", locale: "en-AU", flag: "🇦🇺", rate: envRate(process.env.NEXT_PUBLIC_RATE_AUD, 1.53) },
  NZ: { code: "NZ", country: "New Zealand", currency: "NZD", locale: "en-NZ", flag: "🇳🇿", rate: envRate(process.env.NEXT_PUBLIC_RATE_NZD, 1.7) },
};

export const discountTiers = [
  { threshold: 100, percent: 5 },
  { threshold: 200, percent: 10 },
  { threshold: 300, percent: 15 },
  { threshold: 400, percent: 20 },
  { threshold: 500, percent: 25 },
] as const;

export const US_FREE_SHIPPING_THRESHOLD_USD = 99;
export const FIRST_ORDER_CODE = "AMBWELCOME10";
export const FIRST_ORDER_DISCOUNT_PERCENT = 10;

export type ShippingQuote = {
  id: string;
  label: string;
  detail: string;
  amountUsd: number;
  minBusinessDays: number;
  maxBusinessDays: number;
  source: "store-flat" | "usps-retail-preview";
};

const internationalRetailBands: Record<Exclude<MarketCode, "US">, Array<{ maxOz: number; amountUsd: number }>> = {
  CA: [
    { maxOz: 8, amountUsd: 19.4 },
    { maxOz: 16, amountUsd: 26 },
    { maxOz: 32, amountUsd: 29.05 },
    { maxOz: 48, amountUsd: 38.5 },
    { maxOz: 64, amountUsd: 47.6 },
  ],
  UK: [
    { maxOz: 8, amountUsd: 23.05 },
    { maxOz: 16, amountUsd: 31.95 },
    { maxOz: 32, amountUsd: 35.7 },
    { maxOz: 48, amountUsd: 49.25 },
    { maxOz: 64, amountUsd: 64.25 },
  ],
  AU: [
    { maxOz: 8, amountUsd: 24.8 },
    { maxOz: 16, amountUsd: 41.25 },
    { maxOz: 32, amountUsd: 46.05 },
    { maxOz: 48, amountUsd: 65.25 },
    { maxOz: 64, amountUsd: 79.1 },
  ],
  NZ: [
    { maxOz: 8, amountUsd: 24.8 },
    { maxOz: 16, amountUsd: 41.25 },
    { maxOz: 32, amountUsd: 46.05 },
    { maxOz: 48, amountUsd: 65.25 },
    { maxOz: 64, amountUsd: 79.1 },
  ],
};

/**
 * Launch-safe preview quotes. International bands mirror January 2026 USPS
 * First-Class Package International retail tables and must be replaced by a
 * live carrier quote when origin ZIP, packed dimensions and negotiated rates
 * are known. International complimentary delivery is deliberately disabled
 * until landed margin can be verified.
 */
export function getShippingQuotes(market: MarketCode, subtotalUsd: number, packedWeightOz: number): ShippingQuote[] {
  if (market === "US") {
    const standard = subtotalUsd >= US_FREE_SHIPPING_THRESHOLD_USD ? 0 : packedWeightOz <= 16 ? 9.95 : packedWeightOz <= 32 ? 13.95 : 17.95;
    return [
      { id: "us-standard", label: standard ? "Standard U.S. delivery" : "Complimentary U.S. delivery", detail: "Estimated 3–7 business days", amountUsd: standard, minBusinessDays: 3, maxBusinessDays: 7, source: "store-flat" },
      { id: "us-priority", label: "Priority U.S. delivery", detail: "Estimated 2–4 business days", amountUsd: packedWeightOz <= 16 ? 15.95 : 21.95, minBusinessDays: 2, maxBusinessDays: 4, source: "store-flat" },
    ];
  }

  const band = internationalRetailBands[market].find((item) => packedWeightOz <= item.maxOz);
  const amountUsd = band?.amountUsd ?? internationalRetailBands[market].at(-1)!.amountUsd;
  const detail = packedWeightOz > 64
    ? "Preview only · live carrier rate required for parcels over 4 lb"
    : market === "AU" || market === "NZ" ? "Estimated 10–21 business days" : "Estimated 7–15 business days";
  return [{
    id: `${market.toLowerCase()}-tracked`,
    label: `Tracked delivery to ${markets[market].country}`,
    detail,
    amountUsd,
    minBusinessDays: market === "AU" || market === "NZ" ? 10 : 7,
    maxBusinessDays: market === "AU" || market === "NZ" ? 21 : 15,
    source: "usps-retail-preview",
  }];
}

export function isMarketCode(value: unknown): value is MarketCode {
  return typeof value === "string" && marketCodes.includes(value as MarketCode);
}

export function convertFromUsd(value: number, market: MarketCode) {
  return value * markets[market].rate;
}

export function formatMarketPrice(valueUsd: number, market: MarketCode) {
  const config = markets[market];
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertFromUsd(valueUsd, market));
}

export function getDiscountState(subtotalUsd: number) {
  const earned = [...discountTiers].reverse().find((tier) => subtotalUsd >= tier.threshold);
  const next = discountTiers.find((tier) => subtotalUsd < tier.threshold);
  const percent = earned?.percent || 0;
  const rate = percent / 100;
  const discountUsd = subtotalUsd * rate;

  return {
    percent,
    rate,
    discountUsd,
    totalUsd: subtotalUsd - discountUsd,
    next,
    amountToNextUsd: next ? Math.max(0, next.threshold - subtotalUsd) : 0,
    progress: Math.min(100, (subtotalUsd / discountTiers.at(-1)!.threshold) * 100),
  };
}
