import "server-only";

import Stripe from "stripe";

// Kept in a dedicated server-only module so checkout and webhook routes share one client.
let stripeClient: Stripe | null = null;

export function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  if (!stripeClient) stripeClient = new Stripe(secret, { apiVersion: "2026-07-29.dahlia" });
  return stripeClient;
}

export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "";
}
