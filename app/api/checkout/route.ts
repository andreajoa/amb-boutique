import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { products } from "../../data";

export const runtime = "nodejs";

type RequestedLine = { slug?: string; quantity?: number; size?: string; color?: string };

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Secure checkout is prepared and will be activated when payment credentials are connected." }, { status: 503 });

  const body = await request.json().catch(() => null) as { items?: RequestedLine[] } | null;
  if (!body?.items?.length || body.items.length > 20) return NextResponse.json({ error: "Your bag is empty or contains too many separate items." }, { status: 400 });

  try {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = body.items.map((line) => {
      const product = products.find((item) => item.slug === line.slug);
      const quantity = Math.max(1, Math.min(10, Math.floor(Number(line.quantity) || 1)));
      if (!product) throw new Error("One of the selected products is no longer available.");
      return { quantity, price_data: { currency: "usd", unit_amount: Math.round(product.price * 100), product_data: { name: product.name, description: [`Size ${line.size || "Selected at checkout"}`, `Color ${line.color || "Selected at checkout"}`].join(" · "), metadata: { slug: product.slug, size: line.size || "", color: line.color || "" } } } };
    });
    const stripe = new Stripe(secret, { apiVersion: "2026-07-29.dahlia" });
    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ"] },
      customer_creation: "always",
      phone_number_collection: { enabled: true },
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: { store: "AMB BOUTIQUE", fulfillment_status: "unfulfilled" },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout could not be started." }, { status: 400 });
  }
}
