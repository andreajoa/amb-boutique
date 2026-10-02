import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getAnalyticsSql } from "./analytics/db";

export type PublicTrackingStatus =
  | "PREPARING"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION";

export type TrackingEvent = {
  fingerprint: string;
  status: PublicTrackingStatus;
  description: string;
  location?: string | null;
  eventAt?: string | null;
  trackingCode?: string | null;
};

function secret() {
  return process.env.EMAIL_TOKEN_SECRET?.trim() || process.env.DASHBOARD_SESSION_SECRET?.trim() || "";
}

export function orderReference(sessionId: string) {
  return sessionId.slice(-10).toUpperCase();
}

export function trackingAccessToken(sessionId: string, email: string) {
  const key = secret();
  if (!key) return "";
  const payload = `${sessionId.trim()}|${email.trim().toLowerCase()}`;
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function verifyTrackingAccessToken(sessionId: string, email: string, token: string) {
  const expected = trackingAccessToken(sessionId, email);
  if (!expected || !token || expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export async function ensureTrackingSchema() {
  const sql = getAnalyticsSql();
  if (!sql) return null;

  await sql`
    CREATE TABLE IF NOT EXISTS amb_order_tracking (
      stripe_session_id TEXT PRIMARY KEY,
      customer_email TEXT,
      public_status TEXT NOT NULL DEFAULT 'PREPARING',
      tracking_code TEXT,
      current_location TEXT,
      latest_description TEXT,
      estimated_delivery TEXT,
      shipped_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS amb_order_tracking_events (
      id BIGSERIAL PRIMARY KEY,
      stripe_session_id TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      public_status TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT,
      event_at TIMESTAMPTZ,
      tracking_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (stripe_session_id, fingerprint)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS amb_order_tracking_events_session_idx
    ON amb_order_tracking_events (stripe_session_id, event_at DESC, id DESC)
  `;

  return sql;
}

export function statusLabel(status: PublicTrackingStatus) {
  switch (status) {
    case "SHIPPED": return "Shipped";
    case "IN_TRANSIT": return "In transit";
    case "OUT_FOR_DELIVERY": return "Out for delivery";
    case "DELIVERED": return "Delivered";
    case "EXCEPTION": return "Delivery update";
    default: return "Preparing your order";
  }
}

export function statusHeadline(status: PublicTrackingStatus) {
  switch (status) {
    case "SHIPPED": return "Your AMB order is on the way.";
    case "IN_TRANSIT": return "Your AMB order is moving closer.";
    case "OUT_FOR_DELIVERY": return "Your AMB order is out for delivery.";
    case "DELIVERED": return "Your AMB order has been delivered.";
    case "EXCEPTION": return "There is a new update on your AMB delivery.";
    default: return "Your AMB order is being prepared.";
  }
}
