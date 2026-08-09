"use client";

import Link from "next/link";
import { products } from "./data";
import { useStore } from "./store-provider";

export function PostPurchaseOffer() {
  const { buyNow, formatMoney } = useStore();
  const product = products.find((item) => item.category === "Bags" || item.category === "Accessories") || products[0];
  if (!product) return null;
  const privatePrice = product.price * .85;
  return <section className="post-purchase-offer">
    <div className={`post-purchase-image sheet-${product.sheet} q${product.quadrant}`} style={product.images?.[0] ? { backgroundImage: `url(${product.images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}/>
    <div><p>PRIVATE THANK-YOU EDIT</p><h2>A finishing touch for your new look.</h2><span>Add {product.name} in a separate secure checkout and receive up to 15% off when the margin guard approves it.</span><div className="post-purchase-price"><del>{formatMoney(product.price)}</del><strong>{formatMoney(privatePrice)}</strong></div><button className="button dark" type="button" onClick={() => void buyNow(product, { size: product.sizes?.[0] || "One Size", color: product.colorNames?.[0] || "Selected", quantity: 1, offer: "post-purchase" })}>Add the Private Offer</button><Link href="/collections">No thanks, keep browsing</Link><small>This is a follow-on order, not an automatic charge. The final approved price is shown before payment.</small></div>
  </section>;
}
