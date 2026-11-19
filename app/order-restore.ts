import "server-only";

import type Stripe from "stripe";
import { getAnalyticsSql, jsonForDatabase } from "./analytics/db";
import { products } from "./data";
import { cancelContactRecoveryEmails, cancelJourneyEmails } from "./email/send";
import { getStripe } from "./stripe-server";

// Stripe is the record of every paid AMB order. These helpers let customer
// tracking survive a lost or rebuilt store database (12 Nov 2026 migration).

export function stripeSessionMatchesReference(sessionId: string, reference: string) {
  const id = sessionId.toUpperCase();
  const ref = reference.trim().toUpperCase();
  if (!ref) return false;
  return id === ref || ((ref.length === 8 || ref.length === 10) && id.endsWith(ref));
}

export async function findPaidStripeSessionsForEmail(email: string) {
  const stripe = getStripe();
  if (!stripe) return [];
  const normalized = email.trim().toLowerCase();
  const list = await stripe.checkout.sessions.list({
    customer_details: { email: normalized },
    status: "complete",
    limit: 20,
  });
  return list.data
    .filter((session) => session.payment_status === "paid" &&
      session.customer_details?.email?.trim().toLowerCase() === normalized)
    .sort((a, b) => b.created - a.created);
}

function expandedProduct(line: Stripe.LineItem) {
  const product = line.price?.product;
  if (!product || typeof product === "string" || ("deleted" in product && product.deleted)) return null;
  return product as Stripe.Product;
}

export async function restoreCompletedJourneyFromStripe(session: Stripe.Checkout.Session) {
  const sql = getAnalyticsSql();
  const stripe = getStripe();
  const email = session.customer_details?.email?.trim().toLowerCase();
  if (!sql || !stripe || !email || session.payment_status !== "paid") return null;

  const lines = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });
  const currency = (session.currency || session.metadata?.currency || "usd").toUpperCase();
  const cart = lines.data.map((line) => {
    const product = expandedProduct(line);
    const meta = product?.metadata || {};
    const catalogue = products.find((item) => item.slug === meta.slug);
    return {
      slug: meta.slug || null,
      name: product?.name || line.description || catalogue?.name || "Purchased item",
      image: catalogue?.images?.[0] || null,
      quantity: line.quantity || 1,
      size: meta.size || null,
      color: meta.color || null,
      offer: meta.offer || "standard",
      unitAmount: typeof line.price?.unit_amount === "number" ? line.price.unit_amount / 100 : undefined,
      currency,
    };
  });

  const firstName = session.customer_details?.name?.trim().split(/\s+/)[0] || null;
  const phone = session.customer_details?.phone || null;
  const market = session.metadata?.market || "US";
  const paidAt = new Date(session.created * 1000).toISOString();

  // Same consent defaults as a checkout: a buyer is not a marketing subscriber.
  const contacts = await sql`
    INSERT INTO amb_contacts (email, phone, first_name, market, source, email_consent, sms_consent)
    VALUES (${email}, ${phone}, ${firstName}, ${market}, 'stripe-checkout', false, false)
    ON CONFLICT (email) DO UPDATE SET
      phone = COALESCE(amb_contacts.phone, EXCLUDED.phone),
      first_name = COALESCE(amb_contacts.first_name, EXCLUDED.first_name),
      updated_at = now()
    RETURNING id
  ` as Array<{ id: number | string }>;
  const contactId = contacts[0]?.id || null;

  const journeys = await sql`
    INSERT INTO amb_commerce_journeys (
      stripe_session_id, visitor_id, contact_id, email, phone, market, currency,
      amount_total, status, cart, metadata, checkout_started_at, completed_at, created_at, updated_at
    ) VALUES (
      ${session.id}, ${session.metadata?.visitor_id || null}, ${contactId}, ${email}, ${phone},
      ${market}, ${currency}, ${session.amount_total ? session.amount_total / 100 : null},
      'completed', ${jsonForDatabase(cart)}::jsonb,
      ${jsonForDatabase({ restoredFrom: "stripe", restoredAt: new Date().toISOString(), orderType: session.metadata?.order_type || "standard" })}::jsonb,
      ${paidAt}, ${paidAt}, ${paidAt}, now()
    )
    ON CONFLICT (stripe_session_id) DO UPDATE SET
      status = 'completed',
      contact_id = COALESCE(amb_commerce_journeys.contact_id, EXCLUDED.contact_id),
      email = COALESCE(amb_commerce_journeys.email, EXCLUDED.email),
      phone = COALESCE(amb_commerce_journeys.phone, EXCLUDED.phone),
      cart = CASE WHEN jsonb_typeof(amb_commerce_journeys.cart) = 'array'
        THEN CASE WHEN jsonb_array_length(amb_commerce_journeys.cart) > 0
          THEN amb_commerce_journeys.cart ELSE EXCLUDED.cart END
        ELSE EXCLUDED.cart END,
      completed_at = COALESCE(amb_commerce_journeys.completed_at, EXCLUDED.completed_at),
      updated_at = now()
    WHERE amb_commerce_journeys.status <> 'completed' OR amb_commerce_journeys.email IS NULL
    RETURNING id
  ` as Array<{ id: number | string }>;

  // A buyer never receives cart or checkout recovery for what they already paid.
  if (journeys[0]?.id) await cancelJourneyEmails(journeys[0].id).catch(() => null);
  await cancelContactRecoveryEmails(email).catch(() => null);
  return session.id;
}
