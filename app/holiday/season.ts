import type { Product } from "../data";
import { BLACK_FRIDAY, BLACK_FRIDAY_INTL_FREE_SHIPPING, blackFridayTiers, christmasOrderCutoff, discountTiers, FIRST_ORDER_CODE, FIRST_ORDER_DISCOUNT_PERCENT } from "../commerce";
import { protectMargin } from "../profitability";

export type HolidayPhase = "preview" | "black-friday" | "gifts" | "new-year" | "after";

// Datas em Nova York (a loja vende para os EUA). Black Friday 27/11, Cyber Monday 30/11.
const GIFTS_START = BLACK_FRIDAY.end;
const NEW_YEAR_START = Date.UTC(2026, 11, 9, 5);
const AFTER = Date.UTC(2027, 0, 1, 5);

// Prazo de Natal nos EUA: entrega em dias úteis (12–18), por isso o corte cai antes de dezembro.
const cutoff = christmasOrderCutoff("US");
const cutoffEndsAt = cutoff.getTime() + 29 * 3600 * 1000; // fim do dia em NY
const cutoffLabel = cutoff.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

export function holidayPhase(now = Date.now()): HolidayPhase {
  if (now < BLACK_FRIDAY.start) return "preview";
  if (now < GIFTS_START) return "black-friday";
  if (now < NEW_YEAR_START) return "gifts";
  if (now < AFTER) return "new-year";
  return "after";
}

export function christmasDeliveryOpen(now = Date.now()) {
  return now < cutoffEndsAt;
}

const [bfAll, bfHigh] = blackFridayTiers;
const bfOffer = `${bfAll.percent}% off our regular prices on every piece in this edit, ${bfHigh.percent}% off orders over $${bfHigh.threshold}`;
const topTier = discountTiers.at(-1)!;
const spendOffer = `Every piece here: spend $${discountTiers[0].threshold} and save ${discountTiers[0].percent}%, up to ${topTier.percent}% off at $${topTier.threshold}`;
const RETURNS = "30-day returns";

export function holidayCopy(phase: HolidayPhase, now = Date.now()) {
  const christmas = christmasDeliveryOpen(now)
    ? `US orders placed by ${cutoffLabel} arrive before Christmas, or we refund your order.`
    : "The Christmas delivery cut-off has passed; pieces ordered now arrive for New Year's.";
  switch (phase) {
    case "preview":
      return { eyebrow: "THE HOLIDAY EDIT", title: "Holiday Season", subtitle: `Black Friday opens November 20: ${bfOffer}. Join the list for 24-hour early access on November 19.`, notice: `${christmas} ${RETURNS}. New here? Use ${FIRST_ORDER_CODE} for ${FIRST_ORDER_DISCOUNT_PERCENT}% off your first order.`, signup: true };
    case "black-friday":
      return { eyebrow: "BLACK FRIDAY · NOV 20–30", title: "Black Friday", subtitle: `${bfOffer}. Free shipping to Canada, the UK, Australia and New Zealand over $${BLACK_FRIDAY_INTL_FREE_SHIPPING.thresholdUsd} for most parcels. Applied automatically at checkout.`, notice: `${christmas} ${RETURNS}.`, signup: false };
    case "gifts":
      return { eyebrow: "THE GIFT GUIDE", title: "Gifts She'll Keep", subtitle: "Bags, accessories and easy pieces chosen to be given.", notice: `${christmas} ${RETURNS}. ${spendOffer}.`, signup: false };
    case "new-year":
      return { eyebrow: "NEW YEAR'S EVE", title: "Your New Year's Eve Look", subtitle: "Evening dresses, satin and statement pieces for the last night of the year.", notice: `${spendOffer}. ${RETURNS}.`, signup: false };
    default:
      return { eyebrow: "THE AMB EDIT", title: "The Winter Edit", subtitle: "Fresh pieces for the new season.", notice: undefined, signup: false };
  }
}

const EVENING = /satin|gown|maxi|velvet|sequin|slit|cowl|corset|halter|mesh/i;

/** Só peças em estoque que aceitam o desconto máximo da Black Friday: a promessa da página vale para todas. */
export function holidayEligible(product: Product) {
  return typeof product.stock === "number" && product.stock > 0 && protectMargin(product, bfHigh.percent).approvedPercent >= bfHigh.percent;
}

// Ordem por fase: o mesmo endereço muda o destaque.
export function holidayProducts(all: Product[], phase: HolidayPhase): Product[] {
  const score = (p: Product) => {
    if (phase === "gifts") return p.category === "Bags" || p.category === "Accessories" ? 2 : p.category === "Knitwear" ? 1 : 0;
    if (phase === "new-year") return p.category === "Dresses" && EVENING.test(p.name) ? 2 : p.category === "Dresses" || p.category === "Sets" ? 1 : 0;
    return p.category === "Dresses" ? 2 : p.category === "Bags" || p.category === "Sets" ? 1 : 0;
  };
  return all
    .filter(holidayEligible)
    .map((p, i) => ({ p, i, s: score(p) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(({ p }) => p);
}
