import "server-only";

import type Stripe from "stripe";
import { getStripe } from "../stripe-server";

export type DashboardAddress = {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export type DashboardOrderItem = {
  name: string;
  slug: string | null;
  quantity: number;
  size: string | null;
  color: string | null;
  heelHeightCm: string | null;
  offer: string | null;
  unitAmount: number | null;
  amountTotal: number;
  currency: string;
};

export type DashboardOrder = {
  sessionId: string;
  paymentIntentId: string | null;
  customerId: string | null;
  orderReference: string;
  createdAt: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  market: string;
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  shippingAddress: DashboardAddress | null;
  billingAddress: DashboardAddress | null;
  orderNote: string | null;
  items: DashboardOrderItem[];
};

export type DashboardOrdersResult = {
  orders: DashboardOrder[];
  error: string | null;
};

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === "object" ? value as UnknownRecord : null;

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

function addressFrom(value: unknown, fallbackName?: string | null): DashboardAddress | null {
  const wrapper = asRecord(value);
  if (!wrapper) return null;
  const address = asRecord(wrapper.address) || wrapper;
  const result: DashboardAddress = {
    name: text(wrapper.name) || fallbackName || null,
    line1: text(address.line1),
    line2: text(address.line2),
    city: text(address.city),
    state: text(address.state),
    postalCode: text(address.postal_code),
    country: text(address.country),
  };
  return Object.values(result).some(Boolean) ? result : null;
}

function expandedProductMetadata(line: Stripe.LineItem) {
  const price = asRecord(line.price);
  const product = price ? asRecord(price.product) : null;
  const metadata = product ? asRecord(product.metadata) : null;
  return metadata || {};
}

function expandedProductName(line: Stripe.LineItem) {
  const price = asRecord(line.price);
  const product = price ? asRecord(price.product) : null;
  return text(product?.name) || line.description || "Purchased item";
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id || null;
}

function customerId(session: Stripe.Checkout.Session) {
  if (typeof session.customer === "string") return session.customer;
  return session.customer?.id || null;
}

export async function getDashboardOrders(days: number): Promise<DashboardOrdersResult> {
  const stripe = getStripe();
  if (!stripe) return { orders: [], error: "Stripe is not connected to this deployment." };

  try {
    const created = { gte: Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000) };
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      status: "complete",
      created,
    });

    const paidSessions = sessions.data.filter((session) =>
      session.payment_status === "paid" && session.metadata?.store === "AMB BOUTIQUE"
    );

    const orders = await Promise.all(paidSessions.map(async (session) => {
      const lines = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ["data.price.product"],
      });

      const collected = asRecord((session as unknown as UnknownRecord).collected_information);
      const shippingDetails = collected ? collected.shipping_details : null;
      const customer = session.customer_details;
      const currency = (session.currency || session.metadata?.currency || "usd").toUpperCase();

      const items: DashboardOrderItem[] = lines.data.map((line) => {
        const metadata = expandedProductMetadata(line);
        const price = asRecord(line.price);
        return {
          name: expandedProductName(line),
          slug: text(metadata.slug),
          quantity: line.quantity || 1,
          size: text(metadata.size),
          color: text(metadata.color),
          heelHeightCm: text(metadata.heel_height_cm),
          offer: text(metadata.offer),
          unitAmount: price && typeof price.unit_amount === "number" ? price.unit_amount : null,
          amountTotal: line.amount_total,
          currency: line.currency.toUpperCase(),
        };
      });

      return {
        sessionId: session.id,
        paymentIntentId: paymentIntentId(session),
        customerId: customerId(session),
        orderReference: session.id.slice(-10).toUpperCase(),
        createdAt: session.created * 1000,
        paymentStatus: session.payment_status || "unknown",
        fulfillmentStatus: session.metadata?.fulfillment_status || "unfulfilled",
        market: session.metadata?.market || "US",
        currency,
        subtotal: session.amount_subtotal || 0,
        shipping: session.shipping_cost?.amount_total || 0,
        tax: session.total_details?.amount_tax || 0,
        discount: session.total_details?.amount_discount || 0,
        total: session.amount_total || 0,
        customerName: customer?.name || null,
        email: customer?.email || null,
        phone: customer?.phone || null,
        shippingAddress: addressFrom(shippingDetails, customer?.name || null),
        billingAddress: addressFrom(customer?.address, customer?.name || null),
        orderNote: session.metadata?.order_note || null,
        items,
      } satisfies DashboardOrder;
    }));

    return { orders: orders.sort((a, b) => b.createdAt - a.createdAt), error: null };
  } catch (error) {
    console.error("AMB dashboard Stripe order load failed", error);
    return {
      orders: [],
      error: error instanceof Error ? error.message : "Stripe order data is temporarily unavailable.",
    };
  }
}
