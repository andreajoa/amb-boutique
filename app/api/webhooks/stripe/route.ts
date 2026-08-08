import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !webhookSecret || !signature) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  try {
    const stripe = new Stripe(secret, { apiVersion: "2026-07-29.dahlia" });
    const event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.info("AMB checkout completed", { sessionId: session.id, customerEmail: session.customer_details?.email, paymentStatus: session.payment_status });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhook." }, { status: 400 });
  }
}
