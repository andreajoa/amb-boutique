import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getAnalyticsSql, jsonForDatabase } from "./analytics/db";
import { signAmbFulfillmentPayload } from "./fulfillment-signing";
import { storeManagerSyncToken } from "./store-manager-auth";
import { products } from "./data";
import { findPaidStripeSessionsForEmail, restoreCompletedJourneyFromStripe, stripeSessionMatchesReference } from "./order-restore";
import { trackingEventTime } from "./tracking-time";

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
  estimatedDeliveryAt?: string | null;
  batches: Array<{
    id: string;
    status: string;
    trackingCode: string | null;
    customerCarrier: string;
    events: AmbTrackingEvent[];
    estimatedDeliveryAt?: string | null;
    syncError: string | null;
  }>;
  checkedAt: string;
};

export type AmbPurchasedItem = { name: string; image: string | null; size: string | null; color: string | null; quantity: number };
export type AmbTrackingSnapshot = {
  purchasedItems?: AmbPurchasedItem[];
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
  estimated_delivery_at: string | null;
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

// Customers only ever see AMB Boutique: no marketplace, supplier or
// marketplace-carrier names in anything shown on the page or in e-mails.
export function customerSafeTrackingText(value: string | null | undefined) {
  return (value || "")
    .replace(/a\s*l\s*i\s*[-\s]?\s*e\s*x\s*p\s*r\s*e\s*s\s*s/gi, "AMB Boutique")
    .replace(/\b(?:alibaba|taobao|tmall)\b/gi, "AMB Boutique")
    .replace(/\bcainiao\b/gi, "delivery network")
    .replace(/\bgo\s?fast\b/gi, "AMB Boutique Delivery")
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

const OUT_FOR_DELIVERY_EVENT = /out for delivery|with courier for delivery|delivery today|courier is delivering/;
const DELIVERED_EVENT = /\bdelivered\b|delivery successful|signed for|received by recipient/;
const NOT_DELIVERED_EVENT = /not delivered|undeliver|attempt|failed|out for delivery/;
const IN_TRANSIT_EVENT = /in transit|awaiting flight|heading to the destination|airport|departed|departure|flight|sorting center|leaving origin|left (?:the )?(?:carrier )?facility|carrier facility|domestic transit|local carrier|customs clearance complete|leaving customs/;
const SHIPPED_EVENT = /collected by carrier|picked ?up|shipped|dispatched/;

function customsInProgress(value: string) {
  return /customs|clearance/.test(value) && !/complete|completed|cleared/.test(value);
}

function eventText(event?: AmbTrackingEvent | null) {
  return `${event?.status || ""} ${event?.eventDesc || ""}`.toLowerCase();
}

// Phases follow the AliExpress tracking page milestones: "Order shipped" /
// "Collected by carrier" -> SHIPPED, then transit, customs and the last mile.
export function trackingPhase(input: {
  fulfillmentStatus: string;
  latestEvent?: AmbTrackingEvent | null;
  timeline?: AmbTrackingEvent[] | null;
}) {
  if (input.fulfillmentStatus === "DELIVERED") return "DELIVERED" as const;
  const latest = eventText(input.latestEvent);
  if (DELIVERED_EVENT.test(latest) && !NOT_DELIVERED_EVENT.test(latest)) return "DELIVERED" as const;
  if (OUT_FOR_DELIVERY_EVENT.test(latest)) return "OUT_FOR_DELIVERY" as const;
  if (customsInProgress(latest)) return "CUSTOMS" as const;
  const all = (input.timeline?.length ? input.timeline : input.latestEvent ? [input.latestEvent] : []).map(eventText);
  if (all.some((value) => IN_TRANSIT_EVENT.test(value) || customsInProgress(value) || OUT_FOR_DELIVERY_EVENT.test(value))) {
    return "IN_TRANSIT" as const;
  }
  if (all.some((value) => SHIPPED_EVENT.test(value)) || ["SHIPPED", "IN_TRANSIT"].includes(input.fulfillmentStatus)) {
    return "SHIPPED" as const;
  }
  return "PREPARING" as const;
}

export function latestTrackingEvent(timeline: AmbTrackingEvent[] | null | undefined) {
  if (!timeline?.length) return null;
  const dated = timeline.filter((event) => Number.isFinite(trackingEventTime(event.eventDate)));
  if (dated.length) return dated.reduce((latest, event) =>
    trackingEventTime(event.eventDate) > trackingEventTime(latest.eventDate) ? event : latest);
  return timeline[timeline.length - 1];
}

let trackingSchemaReady: Promise<void> | null = null;

export async function ensureFulfillmentTrackingSchema() {
  trackingSchemaReady ||= createFulfillmentTrackingSchema().catch((error) => {
    trackingSchemaReady = null;
    throw error;
  });
  return trackingSchemaReady;
}

async function createFulfillmentTrackingSchema() {
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

  await sql`
    ALTER TABLE amb_fulfillment_tracking
    ADD COLUMN IF NOT EXISTS estimated_delivery_at TEXT
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

// The AliExpress tracking-page feed names every milestone ("Collected by
// carrier"); the legacy logistics feed never does (empty status). When the page
// feed fails for a moment the Store Manager falls back to the legacy one, and its
// wording ("Package PickedUp") must not replace what the customer already sees.
export function isAliExpressPageFeed(events: AmbTrackingEvent[]) {
  return events.some((event) => Boolean(event.status?.trim()));
}

export function chooseTrackingTimeline(input: {
  incoming: AmbTrackingEvent[];
  previous: AmbTrackingEvent[] | null;
}) {
  const previous = input.previous || [];
  // An empty refresh is not evidence that previously observed events vanished.
  if (!input.incoming.length && previous.length) return previous;
  // A legacy-feed refresh never overwrites a timeline from the page feed.
  if (input.incoming.length && !isAliExpressPageFeed(input.incoming) && isAliExpressPageFeed(previous)) return previous;
  return input.incoming;
}

export async function saveManagerTrackingStatus(status: ManagerFulfillmentStatus) {
  const sql = getAnalyticsSql();
  if (!sql) throw new Error("Database unavailable.");
  await ensureFulfillmentTrackingSchema();

  let timeline = cleanTimeline(status.batches.flatMap((batch) => batch.events || []));
  const previous = await sql`
    SELECT latest_event_key, fulfillment_status, tracking_code, timeline
    FROM amb_fulfillment_tracking WHERE session_id = ${status.sessionId} LIMIT 1
  ` as Array<{
    latest_event_key: string | null;
    fulfillment_status: string;
    tracking_code: string | null;
    timeline: AmbTrackingEvent[];
  }>;
  const old = previous[0];
  const trackingCode = status.trackingCode || old?.tracking_code || null;
  if (!status.batches.length || (!trackingCode && !timeline.length &&
      !status.shippedAt && !status.deliveredAt)) {
    throw new Error("Store Manager returned no verifiable shipment information.");
  }
  timeline = chooseTrackingTimeline({
    incoming: timeline,
    previous: old?.tracking_code === trackingCode && Array.isArray(old?.timeline) ? old.timeline : null,
  });
  const fulfillmentStatus = status.fulfillmentStatus === "ORDERED" &&
    ["SHIPPED", "DELIVERED"].includes(old?.fulfillment_status || "")
    ? old!.fulfillment_status : status.fulfillmentStatus;
  const latestEvent = latestTrackingEvent(timeline);
  const estimatedDeliveryAt = status.estimatedDeliveryAt ||
    status.batches.find((batch) => batch.estimatedDeliveryAt)?.estimatedDeliveryAt || null;
  const eventKey = trackingEventKey({
    fulfillmentStatus, trackingCode, latestEvent,
  });

  await sql`
    INSERT INTO amb_fulfillment_tracking (
      session_id, fulfillment_status, tracking_code, latest_event_key,
      latest_event_desc, latest_event_status, latest_event_address, latest_event_date,
      timeline, shipped_at, delivered_at, estimated_delivery_at, checked_at, updated_at
    ) VALUES (
      ${status.sessionId}, ${fulfillmentStatus}, ${trackingCode},
      ${eventKey}, ${latestEvent?.eventDesc || null}, ${latestEvent?.status || null},
      ${latestEvent?.address || null}, ${latestEvent?.eventDate || null},
      ${jsonForDatabase(timeline, 50000)}::jsonb,
      ${status.shippedAt || null}, ${status.deliveredAt || null}, ${estimatedDeliveryAt},
      ${status.checkedAt}, now()
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
      estimated_delivery_at = COALESCE(EXCLUDED.estimated_delivery_at, amb_fulfillment_tracking.estimated_delivery_at),
      checked_at = EXCLUDED.checked_at,
      updated_at = now()
  `;

  const changed = !previous[0] ||
    previous[0].latest_event_key !== eventKey ||
    previous[0].fulfillment_status !== fulfillmentStatus ||
    previous[0].tracking_code !== trackingCode;

  return {
    changed,
    eventKey,
    latestEvent,
    timeline,
    phase: trackingPhase({ fulfillmentStatus, latestEvent, timeline }),
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

const SNAPSHOT_COLUMNS_SQL = "session_id, fulfillment_status, tracking_code, latest_event_key, latest_event_desc, latest_event_status, latest_event_address, latest_event_date, timeline, shipped_at, delivered_at, estimated_delivery_at, updated_at";

async function findTrackingSnapshot(email: string, reference: string) {
  const sql = getAnalyticsSql();
  if (!sql) return null;
  // An order must remain trackable even before the first fulfillment sync.
  // The completed checkout journey is the source of truth for identity;
  // fulfillment records are optional until the carrier provides updates.
  // Customers may type the order reference or the carrier tracking number.
  const rows = await sql`
    SELECT
      j.stripe_session_id AS session_id,
      COALESCE(t.fulfillment_status, 'PROCESSING') AS fulfillment_status,
      t.tracking_code,
      t.latest_event_key,
      t.latest_event_desc,
      t.latest_event_status,
      t.latest_event_address,
      t.latest_event_date,
      COALESCE(t.timeline, '[]'::jsonb) AS timeline,
      t.shipped_at,
      t.delivered_at,
      t.estimated_delivery_at,
      COALESCE(t.updated_at, j.updated_at) AS updated_at
    FROM amb_commerce_journeys j
    LEFT JOIN amb_fulfillment_tracking t ON t.session_id = j.stripe_session_id
    WHERE lower(j.email) = ${email}
      AND j.status = 'completed'
      AND j.stripe_session_id IS NOT NULL
      AND (
        j.stripe_session_id = ${reference}
        OR upper(right(j.stripe_session_id, 8)) = upper(${reference})
        OR upper(right(j.stripe_session_id, 10)) = upper(${reference})
        OR upper(t.tracking_code) = upper(${reference})
      )
    ORDER BY COALESCE(t.updated_at, j.updated_at) DESC
    LIMIT 1
  ` as AmbTrackingSnapshot[];
  return rows[0] || null;
}

async function fetchManagerTrackingStatus(sessionId: string) {
  const token = storeManagerSyncToken();
  const statusPath = "/api/stores/amb-boutique-store/amb/orders/status";
  const timestamp = String(Date.now());
  const signature = signAmbFulfillmentPayload(["GET", statusPath, sessionId, timestamp].join("\n"));
  if (!token || !signature) return null;
  const managerBase = (process.env.STORE_MANAGER_BASE_URL || "https://aliexpress-store-manager-six.vercel.app").replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(`${managerBase}${statusPath}?session_id=${encodeURIComponent(sessionId)}`, {
      headers: {
        authorization: `Bearer ${token}`,
        "x-amb-key-id": signature.keyId,
        "x-amb-signature": signature.signature,
        "x-amb-timestamp": timestamp,
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    console.error("AMB tracking sync request failed", { httpStatus: response.status, orderReference: sessionId.slice(-10) });
    return null;
  }
  const manager = await response.json() as ManagerFulfillmentStatus;
  if (!manager.ok || manager.sessionId !== sessionId || !Array.isArray(manager.batches)) {
    console.error("AMB tracking sync response invalid", { orderReference: sessionId.slice(-10) });
    return null;
  }
  return manager;
}

// The store database was rebuilt on 12 Nov 2026 and lost earlier orders. Stripe
// remains the record of every paid order, so a lookup the database cannot answer
// is checked there and the completed journey is restored for future lookups.
async function restoreOrderForLookup(email: string, reference: string) {
  const sessions = await findPaidStripeSessionsForEmail(email).catch((error) => {
    console.error("AMB tracking Stripe lookup failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return [];
  });
  if (!sessions.length) return null;

  const direct = sessions.find((session) => stripeSessionMatchesReference(session.id, reference));
  if (direct) {
    await restoreCompletedJourneyFromStripe(direct);
    return direct.id;
  }

  // A carrier tracking number is only known to the Store Manager. Orders whose
  // number is already stored were compared by the database query above.
  if (!/^[A-Za-z0-9-]{8,40}$/.test(reference)) return null;
  const sql = getAnalyticsSql();
  const known = sql ? await sql`
    SELECT j.stripe_session_id FROM amb_commerce_journeys j
    JOIN amb_fulfillment_tracking t ON t.session_id = j.stripe_session_id
    WHERE j.status = 'completed' AND t.tracking_code IS NOT NULL
      AND j.stripe_session_id = ANY(${sessions.map((session) => session.id)})
  ` as Array<{ stripe_session_id: string }> : [];
  const alreadyCompared = new Set(known.map((row) => row.stripe_session_id));
  for (const session of sessions.filter((item) => !alreadyCompared.has(item.id)).slice(0, 5)) {
    const manager = await fetchManagerTrackingStatus(session.id).catch(() => null);
    const codes = [manager?.trackingCode, ...(manager?.batches || []).map((batch) => batch.trackingCode)]
      .filter((code): code is string => Boolean(code))
      .map((code) => code.toUpperCase());
    if (manager && codes.includes(reference.toUpperCase())) {
      await restoreCompletedJourneyFromStripe(session);
      await saveManagerTrackingStatus(manager).catch(() => null);
      return session.id;
    }
  }
  return null;
}

async function purchasedItemsFor(sessionId: string, email: string): Promise<AmbPurchasedItem[]> {
  const sql = getAnalyticsSql();
  if (!sql) return [];
  const cartRows = await sql`
    SELECT cart FROM amb_commerce_journeys
    WHERE stripe_session_id = ${sessionId} AND lower(email) = ${email} AND status = 'completed'
    LIMIT 1
  ` as Array<{cart: unknown}>;
  const cart = Array.isArray(cartRows[0]?.cart) ? cartRows[0].cart : [];
  return cart.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const slug = typeof item.slug === "string" ? item.slug : "";
    const catalogueProduct = products.find((product) => product.slug === slug);
    const rawImage = typeof item.image === "string" ? item.image : catalogueProduct?.images?.[0];
    const image = rawImage && ((rawImage.startsWith("/") && !rawImage.startsWith("//")) || rawImage.startsWith("https://")) ? rawImage : null;
    const quantity = Number(item.quantity);
    return [{
      name: typeof item.name === "string" ? item.name : catalogueProduct?.name || "Purchased item",
      image,
      color: typeof item.color === "string" ? item.color : null,
      size: typeof item.size === "string" ? item.size : null,
      quantity: Number.isFinite(quantity) ? Math.min(99, Math.max(1, quantity)) : 1,
    }];
  });
}

// What the tracking page shows for this order right now, read from the store
// database only (the caller has just synchronised it with the Store Manager).
export async function trackingSnapshotForSession(sessionId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  await ensureFulfillmentTrackingSchema();
  const snapshot = await findTrackingSnapshot(normalizedEmail, sessionId);
  if (!snapshot) return null;
  return { ...snapshot, purchasedItems: await purchasedItemsFor(snapshot.session_id, normalizedEmail) };
}

export async function trackingLookupByEmailAndReference(email: string, reference: string) {
  const sql = getAnalyticsSql();
  if (!sql) return null;
  await ensureFulfillmentTrackingSchema();

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedReference = reference.trim();
  if (!normalizedEmail.includes("@") || normalizedReference.length < 8 || normalizedReference.length > 120) return null;

  let snapshot = await findTrackingSnapshot(normalizedEmail, normalizedReference);
  if (!snapshot) {
    const restoredSessionId = await restoreOrderForLookup(normalizedEmail, normalizedReference);
    if (restoredSessionId) snapshot = await findTrackingSnapshot(normalizedEmail, restoredSessionId);
  }
  if (!snapshot) return null;
  const purchasedItems = await purchasedItemsFor(snapshot.session_id, normalizedEmail);
  const enriched = { ...snapshot, purchasedItems };

  // An authenticated checkout lookup can refresh stale tracking server-side.
  // Never disclose the connector credentials or trust user-supplied tracking IDs.
  const age = snapshot.updated_at ? Date.now() - new Date(snapshot.updated_at).getTime() : Infinity;
  if (age < 15 * 60 * 1000 && snapshot.tracking_code) return enriched;

  try {
    const manager = await fetchManagerTrackingStatus(snapshot.session_id);
    if (!manager) return enriched;
    await saveManagerTrackingStatus(manager);
    // Retrieve the persisted and sanitized timeline, never present raw provider data.
    const refreshed = await sql.query(
      `SELECT ${SNAPSHOT_COLUMNS_SQL} FROM amb_fulfillment_tracking WHERE session_id = $1 LIMIT 1`,
      [snapshot.session_id],
    ) as AmbTrackingSnapshot[];
    return refreshed[0] ? { ...refreshed[0], purchasedItems } : enriched;
  } catch (error) {
    console.error("AMB tracking sync failed", {
      orderReference: snapshot.session_id.slice(-10),
      error: error instanceof Error ? error.message : "Unknown synchronization error",
    });
    return enriched;
  }
}
