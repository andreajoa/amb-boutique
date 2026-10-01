import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "../../../stripe-server";
import { abandonCheckout, completeJourney, failJourney } from "../../../email/commerce-lifecycle";

export const runtime = "nodejs";

async function forwardForFulfillment(session: Stripe.Checkout.Session, eventType: string) {
  const destination =
    process.env.ORDER_FULFILLMENT_WEBHOOK_URL?.trim() ||
    "https://aliexpress-store-manager-six.vercel.app/api/stores/amb-boutique-store/amb/orders/webhook";
  const secret =
    process.env.ORDER_FULFILLMENT_WEBHOOK_SECRET?.trim() ||
    process.env.STORE_CONNECTOR_SYNC_TOKEN?.trim() ||
    "";

  if (!secret) {
    throw new Error("Store Manager fulfillment authentication is not configured.");
  }

  const response = await fetch(destination, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": session.id,
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      eventType,
      sessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      amountTotal: session.amount_total,
      currency: session.currency,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Fulfillment destination returned ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}.`,
    );
  }
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !webhookSecret || !signature) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  try {
    const event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
    if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
      await Promise.all([
        forwardForFulfillment(event.data.object, event.type),
        completeJourney(event.data.object),
      ]);
    }
    if (event.type === "checkout.session.async_payment_succeeded") {
      await Promise.all([
        forwardForFulfillment(event.data.object, event.type),
        completeJourney(event.data.object),
      ]);
    }
    if (event.type === "checkout.session.async_payment_failed") {
      console.warn("AMB asynchronous payment failed", { sessionId: event.data.object.id });
      await failJourney(event.data.object);
    }
    if (event.type === "checkout.session.expired") {
      await abandonCheckout(event.data.object);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("AMB Stripe webhook failed", {
      error: error instanceof Error ? error.message : "Invalid webhook.",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhook." }, { status: 400 });
  }
}
