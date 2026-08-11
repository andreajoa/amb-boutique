import "server-only";
import type Stripe from "stripe";
import { getAnalyticsSql, jsonForDatabase } from "../analytics/db";
import { checkoutRecoveryCampaigns } from "./campaigns";
import { cancelJourneyEmails, scheduleRecoverySequence, sendAmbEmail } from "./send";
import { createJourneyToken } from "./journey-token";

type CheckoutRecord = {
  sessionId: string;
  visitorId?: string;
  market: string;
  currency: string;
  amountTotal: number;
  cart: unknown[];
  metadata?: Record<string, unknown>;
};

export async function recordCheckoutJourney(record: CheckoutRecord) {
  const sql = getAnalyticsSql();
  if (!sql) return null;
  const existing = record.visitorId ? await sql`
    SELECT id FROM amb_commerce_journeys
    WHERE visitor_id = ${record.visitorId} AND status = 'cart'
    ORDER BY updated_at DESC LIMIT 1
  ` as Array<{ id: number | string }> : [];
  if (existing[0]?.id) {
    await cancelJourneyEmails(existing[0].id);
    const rows = await sql`
      UPDATE amb_commerce_journeys SET
        stripe_session_id = ${record.sessionId}, market = ${record.market},
        currency = ${record.currency}, amount_total = ${record.amountTotal},
        status = 'checkout', cart = ${jsonForDatabase(record.cart)}::jsonb,
        metadata = ${jsonForDatabase(record.metadata)}::jsonb,
        checkout_started_at = now(), updated_at = now()
      WHERE id = ${existing[0].id}
      RETURNING id
    ` as Array<{ id: number | string }>;
    return rows[0]?.id || null;
  }
  const rows = await sql`
    INSERT INTO amb_commerce_journeys (
      stripe_session_id, visitor_id, market, currency, amount_total, status,
      cart, metadata, checkout_started_at
    ) VALUES (
      ${record.sessionId}, ${record.visitorId || null}, ${record.market}, ${record.currency},
      ${record.amountTotal}, 'checkout', ${jsonForDatabase(record.cart)}::jsonb,
      ${jsonForDatabase(record.metadata)}::jsonb, now()
    )
    ON CONFLICT (stripe_session_id) DO UPDATE SET
      status = 'checkout', cart = EXCLUDED.cart, amount_total = EXCLUDED.amount_total,
      metadata = EXCLUDED.metadata, updated_at = now()
    RETURNING id
  ` as Array<{ id: number | string }>;
  return rows[0]?.id || null;
}

async function contactForSession(session: Stripe.Checkout.Session) {
  const sql = getAnalyticsSql();
  const email = session.customer_details?.email?.trim().toLowerCase();
  if (!sql || !email) return { sql, email, contact: null };
  const visitorId = session.metadata?.visitor_id || null;
  if (visitorId) {
    await sql`
      INSERT INTO amb_analytics_visitors (visitor_id, last_seen_at, market, email, phone)
      VALUES (${visitorId}, now(), ${session.metadata?.market || "US"}, ${email}, ${session.customer_details?.phone || null})
      ON CONFLICT (visitor_id) DO UPDATE SET
        last_seen_at = now(), email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, amb_analytics_visitors.phone)
    `;
  }
  const contacts = await sql`
    INSERT INTO amb_contacts (visitor_id, email, phone, market, source, email_consent, sms_consent)
    VALUES (
      ${visitorId}, ${email}, ${session.customer_details?.phone || null},
      ${session.metadata?.market || "US"}, 'stripe-checkout', false, false
    )
    ON CONFLICT (email) DO UPDATE SET
      visitor_id = COALESCE(EXCLUDED.visitor_id, amb_contacts.visitor_id),
      phone = COALESCE(EXCLUDED.phone, amb_contacts.phone), updated_at = now()
    RETURNING id, first_name, email_consent, unsubscribed_at
  ` as Array<{ id: number | string; first_name: string | null; email_consent: boolean; unsubscribed_at: string | null }>;
  return { sql, email, contact: contacts[0] || null };
}

export async function completeJourney(session: Stripe.Checkout.Session) {
  const { sql, email, contact } = await contactForSession(session);
  if (!sql) return;
  const journeys = await sql`
    UPDATE amb_commerce_journeys SET
      contact_id = ${contact?.id || null}, email = ${email || null},
      phone = ${session.customer_details?.phone || null}, status = 'completed',
      amount_total = ${session.amount_total ? session.amount_total / 100 : null},
      currency = ${session.currency?.toUpperCase() || session.metadata?.currency || null},
      completed_at = now(), updated_at = now()
    WHERE stripe_session_id = ${session.id}
    RETURNING id, visitor_id
  ` as Array<{ id: number | string; visitor_id: string | null }>;
  const journey = journeys[0];
  if (journey?.id) await cancelJourneyEmails(journey.id);
  if (journey?.id || contact?.id) {
    await sql`
      UPDATE amb_email_messages SET conversion_at = COALESCE(conversion_at, now())
      WHERE (${journey?.id || null} IS NOT NULL AND journey_id = ${journey?.id || null})
         OR (${contact?.id || null} IS NOT NULL AND contact_id = ${contact?.id || null} AND clicked_at IS NOT NULL)
    `;
  }
  if (journey?.visitor_id) {
    await sql`
      UPDATE amb_analytics_sessions SET purchased = true
      WHERE visitor_id = ${journey.visitor_id} AND started_at > now() - interval '30 days'
    `;
    await sql`
      INSERT INTO amb_analytics_events (
        visitor_id, event_type, path, source, market, value_usd, metadata
      ) VALUES (
        ${journey.visitor_id}, 'purchase', '/checkout/success', 'stripe',
        ${session.metadata?.market || "US"},
        ${session.amount_total ? session.amount_total / 100 : null},
        ${jsonForDatabase({ sessionId: session.id, currency: session.currency })}::jsonb
      )
    `;
  }
  if (email) {
    await sendAmbEmail({
      campaign: "order-confirmed",
      to: email,
      contactId: contact?.id,
      journeyId: journey?.id,
      orderReference: session.id.slice(-10).toUpperCase(),
      recoveryUrl: `/checkout/success?session_id=${encodeURIComponent(session.id)}`,
    });
  }
}

export async function failJourney(session: Stripe.Checkout.Session) {
  const { sql, email, contact } = await contactForSession(session);
  if (!sql) return;
  const journeys = await sql`
    UPDATE amb_commerce_journeys SET
      contact_id = ${contact?.id || null}, email = ${email || null}, status = 'failed',
      failed_at = now(), updated_at = now()
    WHERE stripe_session_id = ${session.id}
    RETURNING id
  ` as Array<{ id: number | string }>;
  const journeyId = journeys[0]?.id;
  if (email) {
    const token = journeyId ? createJourneyToken(journeyId) : "";
    await sendAmbEmail({
      campaign: "payment-recovery",
      to: email,
      contactId: contact?.id,
      journeyId,
      recoveryUrl: token ? `/recover-cart/${encodeURIComponent(token)}` : "/checkout",
    });
  }
}

export async function abandonCheckout(session: Stripe.Checkout.Session) {
  const { sql, email, contact } = await contactForSession(session);
  if (!sql) return;
  const journeys = await sql`
    UPDATE amb_commerce_journeys SET
      contact_id = ${contact?.id || null}, email = ${email || null}, status = 'abandoned',
      abandoned_at = now(), updated_at = now()
    WHERE stripe_session_id = ${session.id}
    RETURNING id
  ` as Array<{ id: number | string }>;
  const journeyId = journeys[0]?.id;
  const token = journeyId ? createJourneyToken(journeyId) : "";
  if (email && journeyId && token && contact?.email_consent && !contact.unsubscribed_at) {
    await scheduleRecoverySequence({
      campaigns: checkoutRecoveryCampaigns,
      to: email,
      contactId: contact?.id,
      journeyId,
      recoveryUrl: `/recover-cart/${encodeURIComponent(token)}`,
      firstName: contact?.first_name || undefined,
    });
  }
}
