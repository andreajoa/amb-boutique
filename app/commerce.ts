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
