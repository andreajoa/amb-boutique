import { deliveryWindows, markets, type MarketCode } from "./commerce";
import type { Product } from "./data";
import { stockForSize } from "./product-inventory";

export type FitMode = "quick" | "measurements";
export type SizeSystem = "US" | "UK" | "EU" | "ALPHA";
export type BodyShape = "hourglass" | "pear" | "apple" | "athletic" | "petite" | "tall";
export type FitPreference = "sculpted" | "true" | "relaxed";
export type OccasionKey = "all" | "daytime" | "brunch" | "work" | "cocktail" | "wedding-guest" | "evening" | "vacation" | "holiday";
export type LengthPreference = "any" | "mini" | "midi" | "maxi";
export type ColorPreference = "any" | "ivory" | "black" | "neutral" | "blue" | "rose" | "red" | "green" | "floral";
export type ZoneRating = "Fitted" | "True" | "Easy";

export type FitProfile = {
  mode: FitMode;
  heightCm: number;
  weightKg: number;
  usualSystem: SizeSystem;
  usualSize: string;
  bodyShape: BodyShape;
  fitPreference: FitPreference;
  bustIn?: number;
  waistIn?: number;
  hipIn?: number;
  updatedAt?: string;
};

export const DEFAULT_FIT_PROFILE: FitProfile = {
  mode: "quick",
  heightCm: 165, // 5'5"
  weightKg: 62, // ~137 lb
  usualSystem: "US",
  usualSize: "6",
  bodyShape: "hourglass",
  fitPreference: "true",
};

export type SizeLadderRow = {
  us: number;
  uk: number;
  eu: number;
  alpha: string;
  bust: number;
  waist: number;
  hip: number;
  bmiMid: number;
};

export const SIZE_LADDER: readonly SizeLadderRow[] = [
  { us: 2, uk: 6, eu: 34, alpha: "XS", bust: 33, waist: 25, hip: 35.5, bmiMid: 18.8 },
  { us: 4, uk: 8, eu: 36, alpha: "S", bust: 34, waist: 26, hip: 36.5, bmiMid: 20.3 },
  { us: 6, uk: 10, eu: 38, alpha: "S", bust: 35, waist: 27, hip: 37.5, bmiMid: 21.8 },
  { us: 8, uk: 12, eu: 40, alpha: "M", bust: 36.5, waist: 28.5, hip: 39, bmiMid: 23.4 },
  { us: 10, uk: 14, eu: 42, alpha: "M", bust: 38, waist: 30, hip: 40.5, bmiMid: 25.1 },
  { us: 12, uk: 16, eu: 44, alpha: "L", bust: 39.5, waist: 31.5, hip: 42, bmiMid: 26.8 },
  { us: 14, uk: 18, eu: 46, alpha: "XL", bust: 41.5, waist: 33.5, hip: 44, bmiMid: 28.8 },
  { us: 16, uk: 20, eu: 48, alpha: "XXL", bust: 43.5, waist: 35.5, hip: 46, bmiMid: 31.0 },
  { us: 18, uk: 22, eu: 50, alpha: "XXXL", bust: 46, waist: 38, hip: 48.5, bmiMid: 33.5 },
  { us: 20, uk: 24, eu: 52, alpha: "4XL", bust: 48.5, waist: 40.5, hip: 51, bmiMid: 36.0 },
  { us: 22, uk: 26, eu: 54, alpha: "5XL", bust: 51, waist: 43, hip: 53.5, bmiMid: 38.5 },
  { us: 24, uk: 28, eu: 56, alpha: "5XL", bust: 53.5, waist: 45.5, hip: 56, bmiMid: 41.0 },
  { us: 26, uk: 30, eu: 58, alpha: "5XL", bust: 56, waist: 48, hip: 58.5, bmiMid: 43.5 },
] as const;

export const BODY_SHAPE_META: Record<BodyShape, { label: string; summary: string; bestCuts: string }> = {
  hourglass: { label: "Hourglass", summary: "Balanced bust & hips with a defined waist", bestCuts: "Wrap, belted, sculpted and bias-cut silhouettes" },
  pear: { label: "Pear", summary: "Fuller hips & thighs with narrower shoulders", bestCuts: "A-line skirts, halter & puff-sleeve bodices, wrap waists" },
  apple: { label: "Apple", summary: "Fuller through the bust & midsection with slim legs", bestCuts: "V-necklines, empire/cinched waists and fluid A-line drape" },
  athletic: { label: "Athletic", summary: "Even shoulders, waist & hips with straighter lines", bestCuts: "Pleated skirts, waist ties, cowl & lantern-sleeve details" },
  petite: { label: "Petite", summary: "Shorter torso or frame (under 5'4\")", bestCuts: "Elongating V-necks, high waists, minis & slit midis" },
  tall: { label: "Tall", summary: "Longer torso or legs (5'8\"+)", bestCuts: "Sweeping maxis, midis, wide-leg sets and tailored columns" },
};

export const OCCASION_OPTIONS: ReadonlyArray<{ key: OccasionKey; label: string; detail: string }> = [
  { key: "all", label: "Any Plan", detail: "Best overall matches across AMB" },
  { key: "daytime", label: "Everyday & Coastal", detail: "Polished ease from coffee to afternoon" },
  { key: "brunch", label: "Brunch & Daytime Event", detail: "Soft tailoring, florals & light midis" },
  { key: "cocktail", label: "Cocktail & Date Night", detail: "Sculpted satin, halters & confident minis" },
  { key: "wedding-guest", label: "Wedding Guest", detail: "Elevated midis & fluid floor-sweeping maxis" },
  { key: "evening", label: "Black-Tie & Evening", detail: "Dramatic slits, corsets & luminous gowns" },
  { key: "holiday", label: "Holiday & NYE", detail: "Velvet, satin & winter celebration pieces" },
  { key: "vacation", label: "Resort & Getaway", detail: "Breathable cotton, resort prints & playsuits" },
  { key: "work", label: "Smart & Tailored", detail: "Shirt dresses, crisp blazers & wide-leg sets" },
];

export type GarmentAnalysis = {
  silhouette: "fitted" | "tailored" | "wrap" | "a-line" | "relaxed";
  stretch: "non-stretch" | "subtle" | "stretch";
  lengthType: "mini" | "midi" | "maxi" | "jumpsuit" | "top" | "bottom" | "accessory";
  features: string[];
  occasions: OccasionKey[];
  colorFamily: Exclude<ColorPreference, "any">;
};

export type SizeRecommendation = {
  supported: boolean;
  isOneSize: boolean;
  recommendedSize: string;
  alternativeSize?: string;
  inStockInSize: boolean;
  confidence: number;
  headline: string;
  fitNote: string;
  sizeUpTip?: string;
  zoneFit: { bust: ZoneRating; waist: ZoneRating; hip: ZoneRating };
  hemline: { label: string; bodyPercent: number; note: string };
  garment: GarmentAnalysis;
};

export type DeliveryDateEstimate = {
  market: MarketCode;
  country: string;
  minBusinessDays: number;
  maxBusinessDays: number;
  minDateIso: string;
  maxDateIso: string;
  rangeLabel: string;
  shortRangeLabel: string;
  hasExtendedPrep: boolean;
  eventStatus?: "on-time" | "tight" | "too-soon";
  eventLabel?: string;
  bufferDays?: number;
};

export type RankedFitMatch = {
  product: Product;
  recommendation: SizeRecommendation;
  matchScore: number;
  matchReasons: string[];
};

const ALPHA_TO_US: Record<string, number> = {
  XXS: 0,
  XS: 2,
  S: 5,
  M: 9,
  L: 12,
  XL: 14,
  XXL: 16,
  "2XL": 16,
  XXXL: 18,
  "3XL": 18,
  "4XL": 20,
  "5XL": 22,
};

/**
 * Normalizes any of the 61 real AMB catalog size tokens (including "XS（old）",
 * "US 8", "18 W", "2XL", "One size fits all", etc.) into a canonical US numeric
 * scale so deterministic matching works reliably across the entire catalog.
 */
export function normalizeApparelSizeToken(token: string): { kind: "apparel"; us: number; label: string } | { kind: "one-size" } | { kind: "shoe"; eu: number } | { kind: "custom" } {
  const cleaned = token
    .replace(/（.*?）|\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  if (!cleaned || /ONE SIZE|FREE SIZE|FITS ALL/.test(cleaned)) return { kind: "one-size" };
  if (/CUSTOM/.test(cleaned)) return { kind: "custom" };
  if (/^LARGE/.test(cleaned)) return { kind: "one-size" }; // e.g., "Large(Max Length>50cm)" bag sizing

  if (cleaned in ALPHA_TO_US) {
    return { kind: "apparel", us: ALPHA_TO_US[cleaned], label: cleaned };
  }

  const plusMatch = cleaned.match(/^(?:US\s*)?(\d{1,2})\s*W$/);
  if (plusMatch) {
    const num = Number(plusMatch[1]);
    return { kind: "apparel", us: Math.min(26, Math.max(14, num)), label: `${num}W` };
  }

  const usMatch = cleaned.match(/^US\s*(\d{1,2})$/);
  if (usMatch) {
    const num = Number(usMatch[1]);
    return { kind: "apparel", us: num, label: `US ${num}` };
  }

  const pureNum = cleaned.match(/^(\d{1,2})$/);
  if (pureNum) {
    const num = Number(pureNum[1]);
    if (num >= 32 && num <= 47) return { kind: "shoe", eu: num };
    if (num >= 0 && num <= 28) return { kind: "apparel", us: num, label: `US ${num}` };
  }

  return { kind: "custom" };
}

export function convertUsualSizeToUs(system: SizeSystem, usualSize: string): number {
  const raw = usualSize.trim().toUpperCase();
  if (system === "ALPHA") return ALPHA_TO_US[raw] ?? 8;
  const parsed = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed)) return 8;
  if (system === "US") return Math.max(2, Math.min(26, parsed));
  if (system === "UK") return Math.max(2, Math.min(26, parsed - 4));
  // EU 34 -> US 2, EU 38 -> US 6, EU 40 -> US 8, etc.
  return Math.max(2, Math.min(26, parsed - 32));
}

export function formatHeightImperial(cm: number): string {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462);
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 10) / 10;
}

export function analyzeGarment(product: Pick<Product, "name" | "category" | "subcategory" | "description" | "materials" | "colorNames">): GarmentAnalysis {
  const text = `${product.name} ${product.subcategory || ""} ${product.description || ""} ${product.materials || ""}`.toLowerCase();
  const colorText = `${product.name} ${(product.colorNames || []).join(" ")} ${product.description || ""}`.toLowerCase();

  let silhouette: GarmentAnalysis["silhouette"] = "tailored";
  if (/\b(corset|bodycon|sheath|column|pencil|sculpted|mermaid|bandage|form-fitting|close-fitting|slim fit)\b/.test(text)) {
    silhouette = "fitted";
  } else if (/\b(wrap|tie waist|waist tie|belted|cinched tie|self-tie|sash)\b/.test(text)) {
    silhouette = "wrap";
  } else if (/\b(a-line|flared|swing|pleated|tiered|smocked|babydoll|sweeping|full skirt)\b/.test(text)) {
    silhouette = "a-line";
  } else if (/\b(relaxed|oversized|flowy|blouson|loose|wide-leg|shift|kaftan|caftan|breezy)\b/.test(text)) {
    silhouette = "relaxed";
  }

  let stretch: GarmentAnalysis["stretch"] = "subtle";
  if (/\b(knit|jersey|ribbed|stretch|spandex|elastane|mesh|ruched|smocked|sweater)\b/.test(text)) {
    stretch = "stretch";
  } else if (/\b(satin|silk|chiffon|linen|poplin|tweed|crisp|structured|sequin|corset|tailored|woven|cotton|denim|lace)\b/.test(text)) {
    stretch = "non-stretch";
  }

  let lengthType: GarmentAnalysis["lengthType"] = "midi";
  if (product.category === "Bags" || product.category === "Shoes" || product.category === "Accessories") {
    lengthType = "accessory";
  } else if (product.category === "Tops" || product.category === "Knitwear") {
    lengthType = "top";
  } else if (product.category === "Pants" || product.category === "Shorts") {
    lengthType = "bottom";
  } else if (product.category === "Playsuits" || /\b(jumpsuit|romper|playsuit)\b/.test(text)) {
    lengthType = /\b(romper|playsuit|short)\b/.test(text) ? "mini" : "jumpsuit";
  } else if (/\b(maxi|floor-length|floor length|gown|full-length|ankle-length)\b/.test(text)) {
    lengthType = "maxi";
  } else if (/\b(mini|short dress|above-the-knee|above knee|micro)\b/.test(text)) {
    lengthType = "mini";
  } else if (/\b(midi|mid-calf|tea-length|knee-length)\b/.test(text)) {
    lengthType = "midi";
  } else if (product.category === "Skirts") {
    lengthType = /\bmini\b/.test(text) ? "mini" : /\bmaxi\b/.test(text) ? "maxi" : "midi";
  } else if (product.category === "Sets") {
    lengthType = /\b(short|mini)\b/.test(text) ? "mini" : /\b(trouser|pant|maxi|wide-leg)\b/.test(text) ? "maxi" : "midi";
  }

  const features: string[] = [];
  if (/\bv-neck|v neck|plunge|wrap neck/.test(text)) features.push("v-neck");
  if (/\bhalter|high neck|mock neck/.test(text)) features.push("halter");
  if (/\bsquare neck/.test(text)) features.push("square-neck");
  if (/\bcowl|draped/.test(text)) features.push("draped");
  if (/\boff-shoulder|one-shoulder|strapless/.test(text)) features.push("open-shoulder");
  if (/\bpuff|lantern|balloon|ruffle sleeve/.test(text)) features.push("statement-sleeve");
  if (/\bslit\b/.test(text)) features.push("slit");
  if (/\bbackless|open back|low back/.test(text)) features.push("open-back");
  if (/\bbelt|tie waist|waist tie|cinched/.test(text)) features.push("defined-waist");
  if (/\bpleat/.test(text)) features.push("pleated");

  const occasions = new Set<OccasionKey>();
  if (/\b(gown|evening|formal|corset|slit|backless|velvet|sequin|black-tie)\b/.test(text) || (lengthType === "maxi" && /\b(black|satin|chiffon|draped)\b/.test(text))) {
    occasions.add("evening");
    occasions.add("wedding-guest");
  }
  if (/\b(satin|cocktail|party|date|halter|bodycon|mini|cowl|cutout|lace)\b/.test(text)) {
    occasions.add("cocktail");
    occasions.add("holiday");
  }
  if (/\b(floral|brunch|garden|midi|chiffon|pleated|pastel|sky blue|lavender|blush|rose)\b/.test(text)) {
    occasions.add("brunch");
    occasions.add("wedding-guest");
  }
  if (/\b(shirt dress|blazer|tailored|trouser|wide-leg|poplin|collared|office|tweed)\b/.test(text)) {
    occasions.add("work");
    occasions.add("daytime");
  }
  if (/\b(cotton|linen|eyelet|resort|beach|vacation|playsuit|romper|print|sundress|tropical)\b/.test(text)) {
    occasions.add("vacation");
    occasions.add("daytime");
  }
  if (/\b(velvet|sequin|gold|champagne|crimson|burgundy|emerald|ruby|wine|satin|black)\b/.test(text)) {
    occasions.add("holiday");
  }
  if (occasions.size === 0) {
    occasions.add("daytime");
    occasions.add("brunch");
  }

  let colorFamily: GarmentAnalysis["colorFamily"] = "neutral";
  if (/\b(floral|flower|bloom|botanical|iris|print|tie-dye|ombre)\b/.test(colorText)) colorFamily = "floral";
  else if (/\b(black|noir|obsidian|midnight|onyx)\b/.test(colorText)) colorFamily = "black";
  else if (/\b(white|ivory|cream|ecru|pearl)\b/.test(colorText)) colorFamily = "ivory";
  else if (/\b(red|crimson|burgundy|wine|ruby|terracotta|rust|coral)\b/.test(colorText)) colorFamily = "red";
  else if (/\b(rose|pink|blush|mauve|fuchsia)\b/.test(colorText)) colorFamily = "rose";
  else if (/\b(blue|navy|cobalt|sky|denim|azure|teal)\b/.test(colorText)) colorFamily = "blue";
  else if (/\b(green|sage|emerald|olive|meadow|mint|forest)\b/.test(colorText)) colorFamily = "green";
  else if (/\b(champagne|beige|apricot|camel|mocha|coffee|brown|chocolate|tan|khaki|gold|taupe)\b/.test(colorText)) colorFamily = "neutral";

  return { silhouette, stretch, lengthType, features, occasions: [...occasions], colorFamily };
}

function interpolateUsFromMeasurement(value: number, key: "bust" | "waist" | "hip"): number {
  const first = SIZE_LADDER[0];
  const last = SIZE_LADDER[SIZE_LADDER.length - 1];
  if (value <= first[key]) return first.us;
  if (value >= last[key]) return last.us;
  for (let i = 0; i < SIZE_LADDER.length - 1; i++) {
    const a = SIZE_LADDER[i];
    const b = SIZE_LADDER[i + 1];
    if (value >= a[key] && value <= b[key]) {
      const ratio = (value - a[key]) / Math.max(0.1, b[key] - a[key]);
      return a.us + ratio * (b.us - a.us);
    }
  }
  return 8;
}

function estimateZoneSizes(profile: FitProfile): { bustUs: number; waistUs: number; hipUs: number; baseConfidence: number } {
  const hasMeasurements = profile.mode === "measurements"
    && Number.isFinite(profile.bustIn) && (profile.bustIn ?? 0) >= 26
    && Number.isFinite(profile.waistIn) && (profile.waistIn ?? 0) >= 20
    && Number.isFinite(profile.hipIn) && (profile.hipIn ?? 0) >= 30;

  if (hasMeasurements) {
    return {
      bustUs: interpolateUsFromMeasurement(profile.bustIn!, "bust"),
      waistUs: interpolateUsFromMeasurement(profile.waistIn!, "waist"),
      hipUs: interpolateUsFromMeasurement(profile.hipIn!, "hip"),
      baseConfidence: 95,
    };
  }

  const usualUs = convertUsualSizeToUs(profile.usualSystem, profile.usualSize);
  const heightM = Math.max(1.4, Math.min(2.0, profile.heightCm / 100));
  const bmi = profile.weightKg / (heightM * heightM);

  let bmiUs = SIZE_LADDER[0].us;
  if (bmi >= SIZE_LADDER[SIZE_LADDER.length - 1].bmiMid) {
    bmiUs = SIZE_LADDER[SIZE_LADDER.length - 1].us;
  } else {
    for (let i = 0; i < SIZE_LADDER.length - 1; i++) {
      const a = SIZE_LADDER[i];
      const b = SIZE_LADDER[i + 1];
      if (bmi >= a.bmiMid && bmi <= b.bmiMid) {
        const ratio = (bmi - a.bmiMid) / Math.max(0.1, b.bmiMid - a.bmiMid);
        bmiUs = a.us + ratio * (b.us - a.us);
        break;
      }
    }
  }

  // Weight shopper's lived usual size (68%) alongside height/weight proportion check (32%)
  const blended = usualUs * 0.68 + bmiUs * 0.32;
  const shapeOffsets: Record<BodyShape, { bust: number; waist: number; hip: number }> = {
    hourglass: { bust: 0.25, waist: -0.5, hip: 0.35 },
    pear: { bust: -0.45, waist: -0.25, hip: 0.9 },
    apple: { bust: 0.45, waist: 0.85, hip: -0.35 },
    athletic: { bust: -0.2, waist: 0.3, hip: -0.2 },
    petite: { bust: -0.2, waist: -0.2, hip: -0.2 },
    tall: { bust: 0.1, waist: 0.1, hip: 0.1 },
  };
  const off = shapeOffsets[profile.bodyShape] || shapeOffsets.hourglass;
  const diff = Math.abs(usualUs - bmiUs);
  const baseConfidence = Math.round(Math.max(82, Math.min(93, 93 - diff * 1.4)));

  return {
    bustUs: Math.max(2, Math.min(26, blended + off.bust)),
    waistUs: Math.max(2, Math.min(26, blended + off.waist)),
    hipUs: Math.max(2, Math.min(26, blended + off.hip)),
    baseConfidence,
  };
}

export function estimateHemlineForHeight(lengthType: GarmentAnalysis["lengthType"], heightCm: number): { label: string; bodyPercent: number; note: string } {
  const heightLabel = formatHeightImperial(heightCm);
  // Reference studio model height is ~170cm (5'7")
  const deltaCm = heightCm - 170;

  if (lengthType === "mini") {
    if (deltaCm <= -8) return { label: "Just above the knee", bodyPercent: 60, note: `At ${heightLabel}, this mini hits comfortably just above the knee.` };
    if (deltaCm >= 8) return { label: "Upper-to-mid thigh", bodyPercent: 52, note: `At ${heightLabel}, expect a higher thigh-grazing mini length.` };
    return { label: "Mid-thigh mini", bodyPercent: 56, note: `At ${heightLabel}, hits classic mid-thigh — effortless with flats or heels.` };
  }

  if (lengthType === "midi") {
    if (deltaCm <= -8) return { label: "Lower calf / ankle-grazing", bodyPercent: 80, note: `At ${heightLabel}, this midi falls closer to lower calf — pairs beautifully with a slight heel.` };
    if (deltaCm >= 8) return { label: "Below the knee", bodyPercent: 69, note: `At ${heightLabel}, falls cleanly just below the knee to upper calf.` };
    return { label: "Classic mid-calf", bodyPercent: 75, note: `At ${heightLabel}, hits classic mid-calf right where it's designed to balance.` };
  }

  if (lengthType === "maxi") {
    if (deltaCm <= -8) return { label: "Floor-sweeping (wear with heels)", bodyPercent: 96, note: `At ${heightLabel}, expect floor-grazing length — plan for 2–3" heels or a quick hem.` };
    if (deltaCm >= 8) return { label: "Ankle-length maxi", bodyPercent: 88, note: `At ${heightLabel}, falls around the ankle bone — works easily with flats or strappy sandals.` };
    return { label: "Ankle-to-floor maxi", bodyPercent: 93, note: `At ${heightLabel}, skims just past the ankle for an elongated evening line.` };
  }

  if (lengthType === "jumpsuit") {
    if (deltaCm <= -8) return { label: "Full length (heels recommended)", bodyPercent: 94, note: `At ${heightLabel}, full-length legs pair best with a block heel or wedge.` };
    if (deltaCm >= 8) return { label: "Ankle-cropped length", bodyPercent: 86, note: `At ${heightLabel}, hits right at the ankle for a clean tailored line.` };
    return { label: "Full ankle length", bodyPercent: 90, note: `At ${heightLabel}, tailored to skim cleanly over sandals or pumps.` };
  }

  if (lengthType === "top") {
    return { label: "High-hip length", bodyPercent: 45, note: `At ${heightLabel}, sits neatly around the natural waist to high hip for easy tucking.` };
  }

  if (lengthType === "bottom") {
    return { label: "Tailored rise & drape", bodyPercent: 86, note: `At ${heightLabel}, high-waist rise balances easily with heels or clean flats.` };
  }

  return { label: "One-size accessory", bodyPercent: 50, note: "Proportioned to carry cleanly with day or evening looks." };
}

function zoneRating(garmentUs: number, bodyZoneUs: number, generousZone = false): ZoneRating {
  const ease = garmentUs - bodyZoneUs + (generousZone ? 1.8 : 0);
  if (ease >= 1.2) return "Easy";
  if (ease <= -0.65) return "Fitted";
  return "True";
}

export function recommendSizeForProduct(
  product: Pick<Product, "slug" | "name" | "category" | "subcategory" | "description" | "materials" | "colorNames" | "sizes" | "stock">,
  profile: FitProfile,
): SizeRecommendation {
  const garment = analyzeGarment(product);
  const hemline = estimateHemlineForHeight(garment.lengthType, profile.heightCm);
  const availableSizes = product.sizes?.length ? product.sizes : ["2", "4", "6", "8", "10", "12"];

  if (product.category === "Shoes") {
    return {
      supported: false,
      isOneSize: false,
      recommendedSize: availableSizes[0] || "38",
      inStockInSize: true,
      confidence: 85,
      headline: "Use foot-length sizing for shoes",
      fitNote: "AMB shoes follow numbered EU sizing — measure foot length against our Shoe Size Guide for the best pair.",
      zoneFit: { bust: "True", waist: "True", hip: "True" },
      hemline,
      garment,
    };
  }

  const parsedSizes = availableSizes.map((raw) => ({
    raw,
    parsed: normalizeApparelSizeToken(raw),
    stock: stockForSize({ slug: product.slug, stock: product.stock }, raw),
  }));

  const apparelOptions = parsedSizes.filter((item): item is { raw: string; parsed: { kind: "apparel"; us: number; label: string }; stock: number | undefined } => item.parsed.kind === "apparel");

  if (product.category === "Bags" || product.category === "Accessories" || apparelOptions.length === 0) {
    const firstAvailable = parsedSizes.find((s) => s.stock === undefined || s.stock > 0) || parsedSizes[0];
    return {
      supported: true,
      isOneSize: true,
      recommendedSize: firstAvailable?.raw || "One Size",
      inStockInSize: firstAvailable ? (firstAvailable.stock === undefined || firstAvailable.stock > 0) : true,
      confidence: 96,
      headline: `${firstAvailable?.raw || "One Size"} · Designed to fit universally`,
      fitNote: product.category === "Bags"
        ? "Structured boutique proportions designed to pair across every dress size."
        : "Flexible one-size construction designed with comfortable ease.",
      zoneFit: { bust: "Easy", waist: "Easy", hip: "Easy" },
      hemline,
      garment,
    };
  }

  const zones = estimateZoneSizes(profile);
  const prefOffset = profile.fitPreference === "sculpted" ? -0.45 : profile.fitPreference === "relaxed" ? 0.65 : 0;

  // Choose governing body zone(s) based on real garment silhouette!
  let governingUs: number;
  if (garment.silhouette === "fitted") {
    // Corsets, satin bias & bodycon must accommodate fullest measurement
    governingUs = Math.max(zones.bustUs, zones.waistUs, zones.hipUs);
  } else if (garment.silhouette === "a-line" || garment.silhouette === "wrap") {
    // Flared/wrap skirts give generous room at hips; bust & waist govern
    governingUs = Math.max(zones.bustUs, zones.waistUs) * 0.8 + zones.hipUs * 0.2;
  } else if (garment.lengthType === "top") {
    governingUs = Math.max(zones.bustUs, zones.waistUs);
  } else if (garment.lengthType === "bottom") {
    governingUs = Math.max(zones.waistUs, zones.hipUs);
  } else {
    governingUs = zones.bustUs * 0.35 + zones.waistUs * 0.35 + zones.hipUs * 0.3;
  }

  // Non-stretch structured fabrics warrant a gentle upward bias when between sizes
  const fabricAdjustment = garment.stretch === "non-stretch" && (garment.silhouette === "fitted" || garment.silhouette === "tailored")
    ? 0.45
    : garment.stretch === "stretch"
      ? -0.2
      : 0;

  const targetUs = Math.max(2, Math.min(26, governingUs + prefOffset + fabricAdjustment));

  const sorted = [...apparelOptions].sort((a, b) => {
    const da = Math.abs(a.parsed.us - targetUs);
    const db = Math.abs(b.parsed.us - targetUs);
    if (Math.abs(da - db) <= 0.35) {
      // Tie-breaker: prefer in-stock, and for non-stretch prefer slightly roomier size
      const aStock = a.stock === undefined || a.stock > 0 ? 1 : 0;
      const bStock = b.stock === undefined || b.stock > 0 ? 1 : 0;
      if (aStock !== bStock) return bStock - aStock;
      return garment.stretch === "non-stretch" ? b.parsed.us - a.parsed.us : a.parsed.us - b.parsed.us;
    }
    return da - db;
  });

  const best = sorted[0];
  const second = sorted[1];
  const distance = Math.abs(best.parsed.us - targetUs);
  const isBetweenSizes = Boolean(second && Math.abs(second.parsed.us - targetUs) - distance < 1.15);
  const inStockInSize = best.stock === undefined || best.stock > 0;
  const confidence = Math.round(Math.max(78, Math.min(96, zones.baseConfidence - distance * 2.2 - (isBetweenSizes ? 2 : 0))));

  const generousHips = garment.silhouette === "a-line" || garment.silhouette === "wrap" || garment.silhouette === "relaxed";
  const generousWaist = garment.silhouette === "relaxed";
  const zoneFit = {
    bust: zoneRating(best.parsed.us, zones.bustUs, garment.silhouette === "relaxed"),
    waist: zoneRating(best.parsed.us, zones.waistUs, generousWaist),
    hip: zoneRating(best.parsed.us, zones.hipUs, generousHips),
  };

  let fitNote = "";
  if (garment.silhouette === "fitted" && garment.stretch === "non-stretch") {
    fitNote = "Structured silhouette with minimal stretch — fits closest through waist and hips.";
  } else if (garment.silhouette === "wrap") {
    fitNote = "Adjustable waist tie lets you cinch or ease the fit across your torso.";
  } else if (garment.silhouette === "a-line") {
    fitNote = "Shaped through the bodice with a forgiving flared skirt that moves freely over the hips.";
  } else if (garment.stretch === "stretch") {
    fitNote = "Flexible fabric with gentle recovery — holds its line comfortably true to size.";
  } else {
    fitNote = "Clean tailored drape designed to sit comfortably true to size.";
  }

  let sizeUpTip: string | undefined;
  if (isBetweenSizes && second) {
    const bigger = second.parsed.us > best.parsed.us ? second.raw : best.raw;
    const smaller = second.parsed.us > best.parsed.us ? best.raw : second.raw;
    sizeUpTip = garment.stretch === "non-stretch"
      ? `Between ${smaller} and ${bigger}? Because this piece has structured woven drape, ${bigger} gives easier movement.`
      : `Between ${smaller} and ${bigger}? Choose ${smaller} for a closer line or ${bigger} for relaxed ease.`;
  } else if (!inStockInSize) {
    const nextInStock = sorted.find((opt) => opt.stock === undefined || opt.stock > 0);
    if (nextInStock) {
      sizeUpTip = `Size ${best.raw} is currently sold out; closest available option is ${nextInStock.raw}.`;
    }
  }

  return {
    supported: true,
    isOneSize: false,
    recommendedSize: best.raw,
    alternativeSize: isBetweenSizes ? second?.raw : undefined,
    inStockInSize,
    confidence,
    headline: `Size ${best.raw} · ${confidence}% match`,
    fitNote,
    sizeUpTip,
    zoneFit,
    hemline,
    garment,
  };
}

const US_HOLIDAYS = new Set([
  "2026-11-26",
  "2026-12-25",
  "2027-01-01",
  "2027-05-31",
  "2027-07-05",
  "2027-09-06",
  "2027-11-25",
  "2027-12-24",
  "2027-12-25",
]);

function isBusinessDayUtc(date: Date): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !US_HOLIDAYS.has(date.toISOString().slice(0, 10));
}

function addBusinessDaysUtc(startMs: number, businessDays: number): Date {
  const cursor = new Date(startMs);
  cursor.setUTCHours(12, 0, 0, 0);
  let counted = 0;
  while (counted < businessDays) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isBusinessDayUtc(cursor)) counted++;
  }
  return cursor;
}

function formatCalendarDate(date: Date, includeMonth = true): string {
  return date.toLocaleDateString("en-US", {
    ...(includeMonth ? { month: "short" } : {}),
    day: "numeric",
    timeZone: "UTC",
  });
}

export function estimateDeliveryWindow(
  market: MarketCode,
  options?: { nowMs?: number; preparationNotice?: string; eventDateIso?: string },
): DeliveryDateEstimate {
  const nowMs = options?.nowMs ?? Date.now();
  const win = deliveryWindows[market] || deliveryWindows.US;
  const country = markets[market]?.country || "United States";

  // Standard dispatch prep is 1-3 business days; extended preparation adds conservative buffer
  const prepText = options?.preparationNotice || "";
  const extraPrepMatch = prepText.match(/(\d+)\s*(?:to|–|-)\s*(\d+)\s*business days/i);
  const prepMin = extraPrepMatch ? Number(extraPrepMatch[1]) : prepText ? 5 : 1;
  const prepMax = extraPrepMatch ? Number(extraPrepMatch[2]) : prepText ? 8 : 3;

  const minDate = addBusinessDaysUtc(nowMs, prepMin + win.min);
  const maxDate = addBusinessDaysUtc(nowMs, prepMax + win.max);
  const sameMonth = minDate.getUTCMonth() === maxDate.getUTCMonth();

  const rangeLabel = `${formatCalendarDate(minDate, true)} – ${formatCalendarDate(maxDate, !sameMonth)}`;
  const shortRangeLabel = sameMonth
    ? `${formatCalendarDate(minDate, true)}–${formatCalendarDate(maxDate, false)}`
    : `${formatCalendarDate(minDate, true)} – ${formatCalendarDate(maxDate, true)}`;

  const result: DeliveryDateEstimate = {
    market,
    country,
    minBusinessDays: win.min,
    maxBusinessDays: win.max,
    minDateIso: minDate.toISOString().slice(0, 10),
    maxDateIso: maxDate.toISOString().slice(0, 10),
    rangeLabel,
    shortRangeLabel,
    hasExtendedPrep: Boolean(prepText),
  };

  if (options?.eventDateIso && /^\d{4}-\d{2}-\d{2}$/.test(options.eventDateIso)) {
    const eventMs = Date.parse(`${options.eventDateIso}T12:00:00Z`);
    if (Number.isFinite(eventMs)) {
      const eventDate = new Date(eventMs);
      const eventLabelShort = formatCalendarDate(eventDate, true);
      const diffFromMaxDays = Math.round((eventMs - maxDate.getTime()) / 86400000);
      const diffFromMinDays = Math.round((eventMs - minDate.getTime()) / 86400000);
      result.bufferDays = diffFromMaxDays;

      if (diffFromMaxDays >= 0) {
        result.eventStatus = "on-time";
        result.eventLabel = diffFromMaxDays === 0
          ? `Estimated to arrive right in time for ${eventLabelShort}`
          : `Estimated to arrive ${diffFromMaxDays} day${diffFromMaxDays === 1 ? "" : "s"} before ${eventLabelShort}`;
      } else if (diffFromMinDays >= 0) {
        result.eventStatus = "tight";
        result.eventLabel = `Tight for ${eventLabelShort} — estimated ${rangeLabel} (carrier timing varies)`;
      } else {
        result.eventStatus = "too-soon";
        result.eventLabel = `Likely arrives after ${eventLabelShort} — allow ${win.min}–${win.max} business days after dispatch`;
      }
    }
  }

  return result;
}

function shapeFlatteryAnalysis(shape: BodyShape, garment: GarmentAnalysis): { bonus: number; reason?: string } {
  if (shape === "pear") {
    if (garment.silhouette === "a-line" || garment.silhouette === "wrap") {
      return { bonus: 18, reason: "Flared & wrap waistlines skim the hips effortlessly for Pear proportions" };
    }
    if (garment.features.includes("statement-sleeve") || garment.features.includes("halter") || garment.features.includes("open-shoulder")) {
      return { bonus: 14, reason: "Draws visual balance upward to the neckline and shoulders" };
    }
  }

  if (shape === "hourglass") {
    if (garment.silhouette === "wrap" || garment.silhouette === "fitted" || garment.features.includes("defined-waist")) {
      return { bonus: 18, reason: "Highlights a natural waist while following Hourglass lines cleanly" };
    }
    if (garment.features.includes("v-neck") || garment.features.includes("draped")) {
      return { bonus: 12, reason: "Soft draping complements balanced bust and hip proportions" };
    }
  }

  if (shape === "apple") {
    if (garment.features.includes("v-neck") || garment.silhouette === "a-line" || garment.silhouette === "relaxed") {
      return { bonus: 18, reason: "Open neckline and fluid drape lengthen the torso without clinging" };
    }
    if (garment.silhouette === "wrap") {
      return { bonus: 14, reason: "Adjustable wrap line defines the waist cleanly and comfortably" };
    }
  }

  if (shape === "athletic") {
    if (garment.features.includes("defined-waist") || garment.features.includes("pleated") || garment.features.includes("statement-sleeve")) {
      return { bonus: 18, reason: "Sculpted waist detail and movement create soft curves on an Athletic frame" };
    }
    if (garment.features.includes("draped") || garment.features.includes("halter")) {
      return { bonus: 12, reason: "Highlights shoulders with fluid drape through the body" };
    }
  }

  if (shape === "petite") {
    if (garment.lengthType === "mini" || garment.features.includes("v-neck") || garment.features.includes("slit")) {
      return { bonus: 18, reason: "Elongating vertical lines and clean hemline flatter Petite proportions" };
    }
    if (garment.silhouette === "wrap" || garment.features.includes("defined-waist")) {
      return { bonus: 12, reason: "Defined waist raises the visual proportion on frames under 5'4\"" };
    }
  }

  if (shape === "tall") {
    if (garment.lengthType === "maxi" || garment.lengthType === "midi" || garment.lengthType === "jumpsuit") {
      return { bonus: 18, reason: "Sweeping length showcases Tall proportions with effortless drape" };
    }
  }

  return { bonus: 4 };
}

export function rankProductsForStylist(
  catalog: Product[],
  query: {
    profile: FitProfile;
    occasion: OccasionKey;
    lengthPref: LengthPreference;
    colorPref: ColorPreference;
    limit?: number;
  },
): RankedFitMatch[] {
  const { profile, occasion, lengthPref, colorPref, limit = 18 } = query;

  const candidates = catalog.filter((product) => {
    if (product.category === "Bags" || product.category === "Shoes" || product.category === "Accessories") return false;
    if (typeof product.stock === "number" && product.stock <= 0) return false;
    if (!product.images?.length) return false;
    return true;
  });

  const scored: RankedFitMatch[] = [];

  for (const product of candidates) {
    const recommendation = recommendSizeForProduct(product, profile);
    if (!recommendation.supported) continue;
    const g = recommendation.garment;

    // Hard filter on explicit user length/color preferences if chosen
    if (lengthPref !== "any" && g.lengthType !== lengthPref) continue;
    if (colorPref !== "any" && g.colorFamily !== colorPref) continue;

    let score = recommendation.confidence * 0.55;
    const reasons: string[] = [];

    if (recommendation.inStockInSize) {
      score += 20;
      reasons.push(`In stock in your recommended ${recommendation.recommendedSize}`);
    } else {
      score -= 18;
    }

    if (occasion !== "all") {
      if (g.occasions.includes(occasion)) {
        score += 24;
        const occLabel = OCCASION_OPTIONS.find((o) => o.key === occasion)?.label || occasion;
        reasons.push(`Curated for ${occLabel}`);
      } else {
        score -= 14;
      }
    }

    const flattery = shapeFlatteryAnalysis(profile.bodyShape, g);
    score += flattery.bonus;
    if (flattery.reason) reasons.push(flattery.reason);

    if (product.images && product.images.length >= 4 && product.images[0]?.endsWith(".webp")) {
      score += 6;
    }

    if (reasons.length < 2) {
      reasons.push(recommendation.hemline.note);
    }

    scored.push({
      product,
      recommendation,
      matchScore: Math.round(Math.max(60, Math.min(99, score))),
      matchReasons: reasons.slice(0, 3),
    });
  }

  return scored
    .sort((a, b) => {
      if (a.recommendation.inStockInSize !== b.recommendation.inStockInSize) {
        return a.recommendation.inStockInSize ? -1 : 1;
      }
      return b.matchScore - a.matchScore || b.recommendation.confidence - a.recommendation.confidence;
    })
    .slice(0, limit);
}
