import type { Product } from "../data";
import { deliveryWindows, discountTiers, FIRST_ORDER_CODE, FIRST_ORDER_DISCOUNT_PERCENT } from "../commerce";

export type HolidayPhase = "preview" | "black-friday" | "gifts" | "new-year" | "after";

// Datas em Nova York (a loja vende para os EUA). Black Friday 27/11, Cyber Monday 30/11.
const YEAR = 2026;
const at = (month: number, day: number) => Date.UTC(YEAR, month - 1, day, 5); // 00:00 em NY (EST)
const BLACK_FRIDAY_START = at(11, 20);
const GIFTS_START = at(12, 1);
const NEW_YEAR_START = at(12, 9);
const AFTER = Date.UTC(YEAR + 1, 0, 1, 5);

const US_MAX_DAYS = deliveryWindows.US.max;
// Último dia de pedido com entrega nos EUA até 24/12 no prazo máximo.
const christmasCutoff = new Date(Date.UTC(YEAR, 11, 24 - US_MAX_DAYS, 5));
const cutoffLabel = christmasCutoff.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });

export function holidayPhase(now = Date.now()): HolidayPhase {
  if (now < BLACK_FRIDAY_START) return "preview";
  if (now < GIFTS_START) return "black-friday";
  if (now < NEW_YEAR_START) return "gifts";
  if (now < AFTER) return "new-year";
  return "after";
}

export function christmasDeliveryOpen(now = Date.now()) {
  return now < christmasCutoff.getTime() + 24 * 3600 * 1000;
}

const topTier = discountTiers.at(-1)!;
const spendOffer = `Spend $${discountTiers[0].threshold} and save ${discountTiers[0].percent}%, up to ${topTier.percent}% off at $${topTier.threshold}`;

export function holidayCopy(phase: HolidayPhase, now = Date.now()) {
  const christmas = christmasDeliveryOpen(now)
    ? `Order by ${cutoffLabel} for US delivery before Christmas.`
    : "Christmas delivery cut-off has passed for most pieces; gift them for the New Year.";
  switch (phase) {
    case "preview":
      return { eyebrow: "THE HOLIDAY EDIT", title: "Holiday Season", subtitle: "Black Friday week opens November 20. Dinner dresses, gift-ready bags and New Year's Eve looks, curated in one place.", notice: `${spendOffer}. New here? Use ${FIRST_ORDER_CODE} for ${FIRST_ORDER_DISCOUNT_PERCENT}% off your first order.` };
    case "black-friday":
      return { eyebrow: "BLACK FRIDAY WEEK", title: "Black Friday", subtitle: "November 20 to Cyber Monday, November 30. Our most-loved pieces for the season ahead.", notice: `${spendOffer}. ${christmas}` };
    case "gifts":
      return { eyebrow: "THE GIFT GUIDE", title: "Gifts She'll Keep", subtitle: "Bags, accessories and easy pieces chosen to be given.", notice: christmas };
    case "new-year":
      return { eyebrow: "NEW YEAR'S EVE", title: "Your New Year's Eve Look", subtitle: "Evening dresses, satin and statement pieces for the last night of the year.", notice: `${spendOffer}.` };
    default:
      return { eyebrow: "THE AMB EDIT", title: "The Winter Edit", subtitle: "Fresh pieces for the new season.", notice: undefined };
  }
}

const EVENING = /satin|gown|maxi|velvet|sequin|slit|cowl|corset|halter|mesh/i;

// Ordem por fase: o mesmo endereço muda o destaque, sem esconder o resto da loja.
export function holidayProducts(all: Product[], phase: HolidayPhase): Product[] {
  const score = (p: Product) => {
    if (phase === "gifts") return p.category === "Bags" || p.category === "Accessories" ? 2 : p.category === "Knitwear" ? 1 : 0;
    if (phase === "new-year") return p.category === "Dresses" && EVENING.test(p.name) ? 2 : p.category === "Dresses" || p.category === "Sets" ? 1 : 0;
    return p.category === "Dresses" ? 2 : p.category === "Bags" || p.category === "Sets" ? 1 : 0;
  };
  return all
    .filter((p) => typeof p.stock === "number" && p.stock > 0)
    .map((p, i) => ({ p, i, s: score(p) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(({ p }) => p);
}
