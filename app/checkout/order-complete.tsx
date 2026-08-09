"use client";

import { useEffect } from "react";
import { useStore } from "../store-provider";

export function OrderComplete({ confirmed }: { confirmed: boolean }) {
  const { clearCart } = useStore();
  useEffect(() => {
    if (!confirmed) return;
    queueMicrotask(() => {
      clearCart();
      window.sessionStorage.removeItem("amb-stripe-client-secret");
      window.sessionStorage.removeItem("amb-stripe-session-id");
    });
  }, [clearCart, confirmed]);
  return null;
}
