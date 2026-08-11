"use client";

import { useEffect } from "react";

export function RecoverCartClient({ cart }: { cart: unknown[] }) {
  useEffect(() => {
    window.localStorage.setItem("amb-boutique-cart-v2", JSON.stringify(cart));
    const timer = window.setTimeout(() => window.location.replace("/collections/all?open_cart=1"), 650);
    return () => window.clearTimeout(timer);
  }, [cart]);
  return <main style={{ minHeight: "65vh", display: "grid", placeItems: "center", padding: "40px" }}>
    <div style={{ textAlign: "center", maxWidth: 520 }}>
      <p style={{ letterSpacing: ".2em", fontSize: 11 }}>YOUR AMB EDIT</p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 44, margin: "12px 0" }}>Restoring your bag…</h1>
      <p>Your exact pieces are being restored.</p>
    </div>
  </main>;
}
