import { NextRequest, NextResponse } from "next/server";

import {
  ensureTrackingSchema,
  orderReference,
  statusLabel,
  verifyTrackingAccessToken,
} from "../../tracking-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: string | null, max = 255) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function GET(request: NextRequest) {
  const order = clean(request.nextUrl.searchParams.get("order"), 32).toUpperCase();
  const email = clean(request.nextUrl.searchParams.get("email"), 320).toLowerCase();
  const token = clean(request.nextUrl.searchParams.get("token"), 256);

  if (!/^[A-Z0-9_]{6,32}$/.test(order)) {
    return NextResponse.json({ ok: false, error: "Enter a valid order number." }, { status: 400 });
  }

  const sql = await ensureTrackingSchema();
  if (!sql) return NextResponse.json({ ok: false, error: "Tracking is temporarily unavailable." }, { status: 503 });

  const journeys = await sql`
    SELECT stripe_session_id, email, status, completed_at, updated_at
    FROM amb_commerce_journeys
    WHERE upper(stripe_session_id) LIKE ${"%" + order}
      AND status = 'completed'
    ORDER BY completed_at DESC NULLS LAST, updated_at DESC
    LIMIT 3
  ` as Array<{
    stripe_session_id: string;
    email: string | null;
    status: string;
    completed_at: string | null;
    updated_at: string;
  }>;

  const match = journeys.find((row) => {
    const rowEmail = row.email?.trim().toLowerCase() || "";
    if (token && rowEmail) return verifyTrackingAccessToken(row.stripe_session_id, rowEmail, token);
    return Boolean(email && rowEmail && email === rowEmail);
  });

  if (!match) {
    return NextResponse.json(
      { ok: false, error: "We couldn’t match that order number and email." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const snapshots = await sql`
    SELECT public_status, tracking_code, current_location, latest_description,
           estimated_delivery, shipped_at, delivered_at, updated_at
    FROM amb_order_tracking
    WHERE stripe_session_id = ${match.stripe_session_id}
    LIMIT 1
  ` as Array<{
    public_status: string;
    tracking_code: string | null;
    current_location: string | null;
    latest_description: string | null;
    estimated_delivery: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    updated_at: string;
  }>;

  const events = await sql`
    SELECT public_status, description, location, event_at, tracking_code
    FROM amb_order_tracking_events
    WHERE stripe_session_id = ${match.stripe_session_id}
    ORDER BY event_at DESC NULLS LAST, id DESC
    LIMIT 100
  ` as Array<{
    public_status: string;
    description: string;
    location: string | null;
    event_at: string | null;
    tracking_code: string | null;
  }>;

  const snapshot = snapshots[0];
  const publicStatus = snapshot?.public_status || "PREPARING";

  return NextResponse.json({
    ok: true,
    order: orderReference(match.stripe_session_id),
    status: publicStatus,
    statusLabel: statusLabel(publicStatus as Parameters<typeof statusLabel>[0]),
    trackingCode: snapshot?.tracking_code || events[0]?.tracking_code || null,
    currentLocation: snapshot?.current_location || events[0]?.location || null,
    latestDescription: snapshot?.latest_description || events[0]?.description || "Your order is being prepared.",
    estimatedDelivery: snapshot?.estimated_delivery || null,
    updatedAt: snapshot?.updated_at || match.updated_at,
    events: events.map((event) => ({
      status: event.public_status,
      statusLabel: statusLabel(event.public_status as Parameters<typeof statusLabel>[0]),
      description: event.description,
      location: event.location,
      eventAt: event.event_at,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
