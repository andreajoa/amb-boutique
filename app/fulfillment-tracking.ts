import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getAnalyticsSql, jsonForDatabase } from "./analytics/db";

export type AmbTrackingEvent = {
  eventDesc: string;
  status: string;
  address: string | null;
  eventDate: string | null;
};

export type ManagerFulfillmentStatus = {
  ok: boolean;
  sessionId: string;
  status: string;
  fulfillmentStatus: string;
  trackingCode: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  batches: Array<{
    id: string;
    status: string;
    trackingCode: string | null;
    customerCarrier: string;
    events: AmbTrackingEvent[];
    syncError: string | null;
  }>;
  checkedAt: string;
};

export type AmbTrackingSnapshot = {
  session_id: string;
  fulfillment_status: string;
  tracking_code: string | null;
  latest_event_key: string | null;
  latest_event_desc: string | null;
  latest_event_status: string | null;
  latest_event_address: string | null;
  latest_event_date: string | null;
  timeline: AmbTrackingEvent[];
  shipped_at: string | null;
  delivered_at: string | null;
  updated_at: string;
};

function trackingSecret() {
  return process.env.EMAIL_TOKEN_SECRET || process.env.DASHBOARD_SESSION_SECRET || "";
}

export function createPublicTrackingToken(sessionId: string, email: string) {
  const secret = trackingSecret();
  if (!secret) return "";
  const payload = Buffer.from(JSON.stringify({
    s: sessionId,
    e: email.trim().toLowerCase(),
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPublicTrackingToken(token: string) {
  const [payload, signature] = token.split(".");
  const secret = trackingSecret();
  if (!payload || !signature || !secret) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { s?: string; e?: string };
    if (!parsed.s?.startsWith("cs_") || !parsed.e?.includes("@")) return null;
    return { sessionId: parsed.s, email: parsed.e.trim().toLowerCase() };
  } catch {
    return null;
  }
}

export function customerSafeTrackingText(value: string | null | undefined) {
  return (value || "")
    .replace(/aliexpress/gi, "AMB Boutique")
    .replace(/cainiao/gi, "delivery network")
    .replace(/myshuee\s*store/gi, "delivery partner")
    .replace(/\s+/g, " ")
    .trim();
}

export function trackingEventKey(input: {
  fulfillmentStatus: string;
  trackingCode: string | null;
  latestEvent?: AmbTrackingEvent | null;
}) {
  const event = input.latestEvent;
  const raw = [
    input.fulfillmentStatus,
    input.trackingCode || "",
    event?.eventDate || "",
    event?.status || "",
    event?.address || "",
    event?.eventDesc || "",
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function trackingPhase(input: {
  fulfillmentStatus: string;
  latestEvent?: AmbTrackingEvent | null;
}) {
  if (input.fulfillmentStatus === "DELIVERED") return "DELIVERED" as const;
  const latest = input.latestEvent;
  const value = `${latest?.status || ""} ${latest?.eventDesc || ""}`.toLowerCase();
  if (/out for delivery|with courier for delivery|delivery today|courier is delivering/.test(value)) {
    return "OUT_FOR_DELIVERY" as const;
  }
  if (/customs|clearance|import clearance/.test(value)) return "CUSTOMS" as const;
  if (input.fulfillmentStatus === "SHIPPED") return "IN_TRANSIT" as const;
  return "PREPARING" as const;
}

export async function ensureFulfillmentTrackingSchema() {
  const sql = getAnalyticsSql();
  if (!sql) throw new Error("Database unavailable.");

  await sql`
    CREATE TABLE IF NOT EXISTS amb_fulfillment_tracking (
      session_id TEXT PRIMARY KEY,
      fulfillment_status TEXT NOT NULL DEFAULT 'PROCESSING',
      tracking_code TEXT,
      latest_event_key TEXT,
      latest_event_desc TEXT,
      latest_event_status TEXT,
      latest_event_address TEXT,
      latest_event_date TEXT,
      timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
      shipped_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS amb_tracking_notifications (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_key TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      provider_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(session_id, event_key)
    )
  `;
}

function cleanTimeline(events: AmbTrackingEvent[]) {
  return events.map((event) => ({
    eventDesc: customerSafeTrackingText(event.eventDesc),
    status: customerSafeTrackingText(event.status),
    address: event.address ? customerSafeTrackingText(event.address) : null,
    eventDate: event.eventDate || null,
  }));
}

export async function saveManagerTrackingStatus(status: ManagerFulfillmentStatus) {
  const sql = getAnalyticsSql();
  if (!sql) throw new Error("Database unavailable.");
  await ensureFulfillmentTrackingSchema();

  const timeline = cleanTimeline(
    status.batches.flatMap((batch) => batch.events || []),
  );
  const latestEvent = timeline.length ? timeline[timeline.length - 1] : null;
  const eventKey = trackingEventKey({
    fulfillmentStatus: status.fulfillmentStatus,
    trackingCode: status.trackingCode,
    latestEvent,
  });

  const previous = await sql`
    SELECT latest_event_key, fulfillment_status, tracking_code
    FROM amb_fulfillment_tracking
    WHERE session_id = ${status.sessionId}
    LIMIT 1
  ` as Array<{
    latest_event_key: string | null;
    fulfillment_status: string;
    tracking_code: string | null;
  }>;

  await sql`
    INSERT INTO amb_fulfillment_tracking (
      session_id, fulfillment_status, tracking_code, latest_event_key,
      latest_event_desc, latest_event_status, latest_event_address, latest_event_date,
      timeline, shipped_at, delivered_at, checked_at, updated_at
    ) VALUES (
      ${status.sessionId}, ${status.fulfillmentStatus}, ${status.trackingCode},
      ${eventKey}, ${latestEvent?.eventDesc || null}, ${latestEvent?.status || null},
      ${latestEvent?.address || null}, ${latestEvent?.eventDate || null},
      ${jsonForDatabase(timeline, 50000)}::jsonb,
      ${status.shippedAt || null}, ${status.deliveredAt || null}, ${status.checkedAt}, now()
    )
    ON CONFLICT (session_id) DO UPDATE SET
      fulfillment_status = EXCLUDED.fulfillment_status,
      tracking_code = EXCLUDED.tracking_code,
      latest_event_key = EXCLUDED.latest_event_key,
      latest_event_desc = EXCLUDED.latest_event_desc,
      latest_event_status = EXCLUDED.latest_event_status,
      latest_event_address = EXCLUDED.latest_event_address,
      latest_event_date = EXCLUDED.latest_event_date,
      timeline = EXCLUDED.timeline,
      shipped_at = EXCLUDED.shipped_at,
      delivered_at = EXCLUDED.delivered_at,
      checked_at = EXCLUDED.checked_at,
      updated_at = now()
  `;

  const changed = !previous[0] ||
    previous[0].latest_event_key !== eventKey ||
    previous[0].fulfillment_status !== status.fulfillmentStatus ||
    previous[0].tracking_code !== status.trackingCode;

  return {
    changed,
    eventKey,
    latestEvent,
    timeline,
    phase: trackingPhase({ fulfillmentStatus: status.fulfillmentStatus, latestEvent }),
    previous: previous[0] || null,
  };
}

export async function reserveTrackingNotification(input: {
  sessionId: string;
  eventKey: string;
  notificationType: string;
}) {
  const sql = getAnalyticsSql();
  if (!sql) return false;
  await ensureFulfillmentTrackingSchema();
  const rows = await sql`
    INSERT INTO amb_tracking_notifications (
      session_id, event_key, notification_type, status
    ) VALUES (
      ${input.sessionId}, ${input.eventKey}, ${input.notificationType}, 'pending'
    )
    ON CONFLICT (session_id, event_key) DO NOTHING
    RETURNING id
  ` as Array<{ id: number }>;
  return Boolean(rows[0]);
}

export async function completeTrackingNotification(input: {
  sessionId: string;
  eventKey: string;
  providerId: string;
}) {
  const sql = getAnalyticsSql();
  if (!sql) return;
  await sql`
    UPDATE amb_tracking_notifications
    SET provider_id = ${input.providerId}, status = 'sent', updated_at = now()
    WHERE session_id = ${input.sessionId} AND event_key = ${input.eventKey}
  `;
}

export async function releaseTrackingNotification(input: {
  sessionId: string;
  eventKey: string;
}) {
  const sql = getAnalyticsSql();
  if (!sql) return;
  await sql`
    DELETE FROM amb_tracking_notifications
    WHERE session_id = ${input.sessionId}
      AND event_key = ${input.eventKey}
      AND status = 'pending'
  `;
}

export async function trackingLookupByToken(token: string) {
  const verified = verifyPublicTrackingToken(token);
  if (!verified) return null;
  return trackingLookupByEmailAndReference(verified.email, verified.sessionId);
}

export async function trackingLookupByEmailAndReference(email: string, reference: string) {
  const sql = getAnalyticsSql();
  if (!sql) return null;
  await ensureFulfillmentTrackingSchema();

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedReference = reference.trim();
  if (!normalizedEmail || !normalizedReference) return null;

  const rows = await sql`
    SELECT
      t.session_id,
      t.fulfillment_status,
      t.tracking_code,
      t.latest_event_key,
      t.latest_event_desc,
      t.latest_event_status,
      t.latest_event_address,
      t.latest_event_date,
      t.timeline,
      t.shipped_at,
      t.delivered_at,
      t.updated_at
    FROM amb_fulfillment_tracking t
    JOIN amb_commerce_journeys j ON j.stripe_session_id = t.session_id
    WHERE lower(j.email) = ${normalizedEmail}
      AND (
        t.session_id = ${normalizedReference}
        OR upper(right(t.session_id, 8)) = upper(${normalizedReference})
        OR upper(right(t.session_id, 10)) = upper(${normalizedReference})
      )
    ORDER BY t.updated_at DESC
    LIMIT 1
  ` as AmbTrackingSnapshot[];

  return rows[0] || null;
}
