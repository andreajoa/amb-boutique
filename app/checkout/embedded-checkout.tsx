"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCartLineThumbnail, useStore } from "../store-provider";

export function EmbeddedCheckoutPanel({ publishableKey }: { publishableKey: string }) {
  const { cart, formatMoney } = useStore();
  const [clientSecret, setClientSecret] = useState("");
  const [ready, setReady] = useState(false);
  const stripePromise = useMemo(() => publishableKey ? loadStripe(publishableKey) : null, [publishableKey]);

  useEffect(() => {
    queueMicrotask(() => {
      setClientSecret(window.sessionStorage.getItem("amb-stripe-client-secret") || "");
      setReady(true);
    });
  }, []);

  if (!ready) return <section className="embedded-checkout-state"><span className="checkout-spinner"/><p>Preparing your secure checkout…</p></section>;
  if (!publishableKey) return <section className="embedded-checkout-state"><h2>Checkout needs the Stripe publishable key.</h2><p>Add STRIPE_PUBLISHABLE_KEY or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in Vercel, then redeploy.</p><Link className="button dark" href="/cart">Return to your bag</Link></section>;
  if (!clientSecret) return <section className="embedded-checkout-state"><h2>Your secure session has expired.</h2><p>Return to your bag to start a fresh encrypted checkout.</p><Link className="button dark" href="/cart">Return to your bag</Link></section>;

  return <section className="embedded-checkout-shell shell">
    <aside className="checkout-order-card">
      <p>YOUR AMB EDIT</p>
      <h2>{cart.length ? `${cart.length} selected style${cart.length === 1 ? "" : "s"}` : "Secure order"}</h2>
      {cart.map((line) => {
        const thumbnail = getCartLineThumbnail(line);
        return <div className="checkout-mini-line" key={line.id}><div className={`cart-thumb checkout-thumb-media${thumbnail.isSprite ? " sprite-media" : ""}${thumbnail.hasImage ? "" : ` sheet-${line.sheet} q${line.quadrant}`}`} style={thumbnail.style} role="img" aria-label={line.name}/><span><strong>{line.name}</strong><small>{line.size} · {line.color} · Qty {line.quantity}</small></span><b>{formatMoney(line.price * line.quantity)}</b></div>;
      })}
      <ul><li>Encrypted payment by Stripe</li><li>Delivery from San Diego, California</li><li>30-day return requests</li><li>No automatic post-purchase charges</li></ul>
      <a href="mailto:info@ambboutique.online">Need help? info@ambboutique.online</a>
    </aside>
    <div className="stripe-checkout-frame"><EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret }}><EmbeddedCheckout/></EmbeddedCheckoutProvider></div>
  </section>;
}
