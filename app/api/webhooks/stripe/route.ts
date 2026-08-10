import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "../../../stripe-server";
import { finalizeInventory, releaseInventory } from "../../../inventory";

export const runtime = "nodejs";

async function forwardForFulfillment(session: Stripe.Checkout.Session, eventType: string) {
  const destination = process.env.ORDER_FULFILLMENT_WEBHOOK_URL;
  if (!destination) {
    console.info("AMB paid order received", { sessionId: session.id, eventType, paymentStatus: session.payment_status });
    return;
  }
  const response = await fetch(destination, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": session.id,
      ...(process.env.ORDER_FULFILLMENT_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.ORDER_FULFILLMENT_WEBHOOK_SECRET}` } : {}),
    },
    body: JSON.stringify({ eventType, sessionId: session.id, paymentIntentId: session.payment_intent, customerId: session.customer, customer: session.customer_details, shipping: session.collected_information?.shipping_details, amountTotal: session.amount_total, currency: session.currency, metadata: session.metadata }),
  });
  if (!response.ok) throw new Error(`Fulfillment destination returned ${response.status}.`);
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !webhookSecret || !signature) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhook signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
      await finalizeInventory(event.data.object.id, event.id, event.type);
      await forwardForFulfillment(event.data.object, event.type);
    }
    if (event.type === "checkout.session.async_payment_succeeded") {
      await finalizeInventory(event.data.object.id, event.id, event.type);
      await forwardForFulfillment(event.data.object, event.type);
    }
    if (event.type === "checkout.session.async_payment_failed") {
      await releaseInventory(event.data.object.id, event.id, event.type, "released");
      console.warn("AMB asynchronous payment failed", { sessionId: event.data.object.id });
    }
    if (event.type === "checkout.session.expired") {
      await releaseInventory(event.data.object.id, event.id, event.type, "expired");
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("AMB Stripe webhook processing failed", { eventId: event.id, eventType: event.type, error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, { status: 500 });
  }
}
