"use client";

import Link from "next/link";
import { useState } from "react";
import { products } from "./data";
import { protectMargin } from "./profitability";
import { rankRecommendations } from "./recommendations";
import { useStore } from "./store-provider";

type EligibleOffer = { product: (typeof products)[number]; approvedPercent: number };

function percentage(value: number) {
  return value.toFixed(value % 1 ? 1 : 0);
}

export function PostPurchaseOffer({ sessionId, purchasedSlugs }: { sessionId: string; purchasedSlugs: string[] }) {
  const { buyNow, formatMoney, checkoutError } = useStore();
  const [showDownsell, setShowDownsell] = useState(false);
  const purchased = purchasedSlugs.map((slug) => products.find((product) => product.slug === slug)).filter((product): product is (typeof products)[number] => Boolean(product));
  const ranked = rankRecommendations(products, purchasedSlugs, [], purchased);
  const primary = ranked.map((product) => ({ product, margin: protectMargin(product, 15) }))
    .find(({ margin }) => margin.costKnown && margin.approvedPercent > 0);
  const downsell = ranked.filter((product) => product.slug !== primary?.product.slug)
    .map((product) => ({ product, margin: protectMargin(product, 10) }))
    .filter(({ margin }) => margin.costKnown && margin.approvedPercent > 0)
    .sort((a, b) => a.product.price - b.product.price)[0];

  const active: EligibleOffer | null = showDownsell
    ? downsell ? { product: downsell.product, approvedPercent: downsell.margin.approvedPercent } : null
    : primary ? { product: primary.product, approvedPercent: primary.margin.approvedPercent } : null;
  if (!active) return null;

  const privatePrice = active.product.price * (1 - active.approvedPercent / 100);
  return <section className="post-purchase-offer">
    <div className={`post-purchase-image sheet-${active.product.sheet} q${active.product.quadrant}`} style={active.product.images?.[0] ? { backgroundImage: `url(${active.product.images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}/>
    <div><p>{showDownsell ? "A SMALLER THANK-YOU" : "PRIVATE THANK-YOU EDIT"}</p><h2>{showDownsell ? "One last finishing touch." : "A considered match for your new look."}</h2><span>{active.product.name} complements what you just purchased. Receive {percentage(active.approvedPercent)}% off in a separate secure checkout; the discount has already passed AMB’s margin guard.</span><div className="post-purchase-price"><del>{formatMoney(active.product.price)}</del><strong>{formatMoney(privatePrice)}</strong></div><button className="button dark" type="button" onClick={() => void buyNow(active.product, { size: active.product.sizes?.[0] || "One Size", color: active.product.colorNames?.[0] || "Selected", quantity: 1, offer: "post-purchase" }, { parentSessionId: sessionId })}>Add the Private Offer</button>{!showDownsell && downsell ? <button className="post-offer-decline" type="button" onClick={() => setShowDownsell(true)}>No thanks, show me a smaller option</button> : <Link href="/collections">No thanks, keep browsing</Link>}{checkoutError && <p className="form-message error" role="alert">{checkoutError}</p>}<small>This is a follow-on order, never an automatic charge. Stripe shows the final price before payment. The offer expires 24 hours after the original purchase.</small></div>
  </section>;
}
