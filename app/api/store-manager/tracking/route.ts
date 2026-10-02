import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getAnalyticsSql } from "../../../analytics/db";
import { sendAmbEmail } from "../../../email/send";
import { storeManagerRequestAuthorized } from "../../../store-manager-auth";
import {
  ensureTrackingSchema,
  orderReference,
  statusHeadline,
  trackingAccessToken,
  type PublicTrackingStatus,
} from "../../../tracking-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingEvent = {
  status?: string;
  description?: string;
  location?: string | null;
  eventAt?: string | null;
  trackingCode?: string | null;
};

const allowedStatuses = new Set<PublicTrackingStatus>([
  "PREPARING",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
]);

function clean(value: unknown, max = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function publicCopy(value: string) {
  return value
    .replace(/AliExpress/gi, "AMB Boutique")
    .replace(/Cainiao/gi, "our delivery partner")
    .replace(/Myshuee\s*Store/gi, "our delivery partner")
    .replace(/seller/gi, "delivery partner")
    .replace(/supplier/gi, "delivery partner");
}

function validStatus(value: unknown): PublicTrackingStatus {
  const candidate = clean(value, 32).toUpperCase() as PublicTrackingStatus;
  return allowedStatuses.has(candidate) ? candidate : "IN_TRANSIT";
}

function eventFingerprint(input: {
  sessionId: string;
  status: string;
  description: string;
  location: string;
  eventAt: string;
  trackingCode: string;
}) {
  return createHash("sha256")
    .update([input.sessionId, input.status, input.description, input.location, input.eventAt, input.trackingCode].join("|"))
    .digest("hex");
}

function subjectFor(status: PublicTrackingStatus) {
  switch (status) {
    case "SHIPPED": return "Your AMB order is on the way";
    case "OUT_FOR_DELIVERY": return "Your AMB order is out for delivery";
    case "DELIVERED": return "Your AMB order has been delivered";
    case "EXCEPTION": return "An update on your AMB delivery";
    default: return "Your AMB order has a new delivery update";
  }
}

export async function POST(request: NextRequest) {
  if (!storeManagerRequestAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    sessionId?: string;
    publicStatus?: string;
    trackingCode?: string | null;
    currentLocation?: string | null;
    latestDescription?: string | null;
    estimatedDelivery?: string | null;
    events?: IncomingEvent[];
  } | null;

  const sessionId = clean(body?.sessionId, 255);
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ ok: false, error: "Invalid order session." }, { status: 400 });
  }

  const sql = await ensureTrackingSchema();
  if (!sql) return NextResponse.json({ ok: false, error: "Database unavailable." }, { status: 503 });

  const journeyRows = await sql`
    SELECT j.id, j.email, j.contact_id, c.first_name
    FROM amb_commerce_journeys j
    LEFT JOIN amb_contacts c ON c.id = j.contact_id
    WHERE j.stripe_session_id = ${sessionId}
    ORDER BY j.updated_at DESC
    LIMIT 1
  ` as Array<{
    id: number | string;
    email: string | null;
    contact_id: number | string | null;
    first_name: string | null;
  }>;

  const journey = journeyRows[0];
  if (!journey) {
    return NextResponse.json({ ok: false, error: "AMB order not found." }, { status: 404 });
  }

  const publicStatus = validStatus(body?.publicStatus);
  const trackingCode = clean(body?.trackingCode, 160) || null;
  const currentLocation = publicCopy(clean(body?.currentLocation, 300)) || null;
  const latestDescription = publicCopy(clean(body?.latestDescription, 600)) || null;
  const estimatedDelivery = clean(body?.estimatedDelivery, 120) || null;

  const rawEvents = Array.isArray(body?.events) ? body!.events!.slice(0, 100) : [];
  const normalizedEvents = rawEvents.map((event) => {
    const status = validStatus(event.status || publicStatus);
    const description = publicCopy(clean(event.description, 600)) || statusHeadline(status);
    const location = publicCopy(clean(event.location, 300));
    const eventAtRaw = clean(event.eventAt, 80);
    const eventAt = eventAtRaw && !Number.isNaN(Date.parse(eventAtRaw)) ? new Date(eventAtRaw).toISOString() : "";
    const code = clean(event.trackingCode || trackingCode, 160);
    const fingerprint = eventFingerprint({
      sessionId,
      status,
      description,
      location,
      eventAt,
      trackingCode: code,
    });
    return { status, description, location, eventAt, trackingCode: code, fingerprint };
  });

  if (trackingCode && normalizedEvents.length === 0 && ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(publicStatus)) {
    const description = latestDescription || statusHeadline(publicStatus);
    normalizedEvents.push({
      status: publicStatus,
      description,
      location: currentLocation || "",
      eventAt: new Date().toISOString(),
      trackingCode,
      fingerprint: eventFingerprint({
        sessionId,
        status: publicStatus,
        description,
        location: currentLocation || "",
        eventAt: "",
        trackingCode,
      }),
    });
  }

  const inserted: typeof normalizedEvents = [];
  for (const event of normalizedEvents.sort((a, b) => (a.eventAt || "").localeCompare(b.eventAt || ""))) {
    const rows = await sql`
      INSERT INTO amb_order_tracking_events (
        stripe_session_id, fingerprint, public_status, description, location, event_at, tracking_code
      ) VALUES (
        ${sessionId}, ${event.fingerprint}, ${event.status}, ${event.description},
        ${event.location || null}, ${event.eventAt || null}, ${event.trackingCode || null}
      )
      ON CONFLICT (stripe_session_id, fingerprint) DO NOTHING
      RETURNING id
    ` as Array<{ id: number }>;
    if (rows[0]) inserted.push(event);
  }

  const latest = normalizedEvents
    .slice()
    .sort((a, b) => (b.eventAt || "").localeCompare(a.eventAt || ""))[0];

  await sql`
    INSERT INTO amb_order_tracking (
      stripe_session_id, customer_email, public_status, tracking_code,
      current_location, latest_description, estimated_delivery,
      shipped_at, delivered_at, updated_at
    ) VALUES (
      ${sessionId}, ${journey.email}, ${publicStatus}, ${trackingCode},
      ${currentLocation || latest?.location || null},
      ${latestDescription || latest?.description || null},
      ${estimatedDelivery},
      ${["SHIPPED","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED"].includes(publicStatus) ? new Date().toISOString() : null},
      ${publicStatus === "DELIVERED" ? new Date().toISOString() : null},
      now()
    )
    ON CONFLICT (stripe_session_id) DO UPDATE SET
      customer_email = COALESCE(EXCLUDED.customer_email, amb_order_tracking.customer_email),
      public_status = EXCLUDED.public_status,
      tracking_code = COALESCE(EXCLUDED.tracking_code, amb_order_tracking.tracking_code),
      current_location = COALESCE(EXCLUDED.current_location, amb_order_tracking.current_location),
      latest_description = COALESCE(EXCLUDED.latest_description, amb_order_tracking.latest_description),
      estimated_delivery = COALESCE(EXCLUDED.estimated_delivery, amb_order_tracking.estimated_delivery),
      shipped_at = COALESCE(amb_order_tracking.shipped_at, EXCLUDED.shipped_at),
      delivered_at = COALESCE(amb_order_tracking.delivered_at, EXCLUDED.delivered_at),
      updated_at = now()
  `;

  const email = journey.email?.trim().toLowerCase() || "";
  if (email && inserted.length > 0) {
    const ref = orderReference(sessionId);
    const token = trackingAccessToken(sessionId, email);
    const directUrl = `/track-order?order=${encodeURIComponent(ref)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

    for (const event of inserted) {
      const locationSentence = event.location ? ` Current location: ${event.location}.` : "";
      await sendAmbEmail({
        campaign: {
          key: `tracking-${event.fingerprint.slice(0, 20)}`,
          type: "lifecycle",
          name: "Order tracking update",
          subjectA: subjectFor(event.status),
          preview: event.description,
          eyebrow: "DELIVERY UPDATE",
          headline: statusHeadline(event.status),
          body: `${event.description}${locationSentence} We’ll keep monitoring your delivery and update you as it moves.`,
          ctaLabel: "Track my order",
          ctaUrl: "/track-order",
        },
        to: email,
        contactId: journey.contact_id,
        journeyId: journey.id,
        firstName: journey.first_name || undefined,
        recoveryUrl: directUrl,
        orderReference: ref,
      }).catch((error) => {
        console.error("AMB tracking email failed", {
          sessionId,
          fingerprint: event.fingerprint,
          error: error instanceof Error ? error.message : "unknown",
        });
      });
    }
  }

  return NextResponse.json({
    ok: true,
    sessionId,
    received: normalizedEvents.length,
    inserted: inserted.length,
    status: publicStatus,
  }, { headers: { "Cache-Control": "no-store" } });
}
