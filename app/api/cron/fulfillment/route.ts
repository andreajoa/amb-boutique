import { NextRequest, NextResponse } from "next/server";

import { getAnalyticsSql } from "../../../analytics/db";
import {
  completeTrackingNotification,
  ensureFulfillmentTrackingSchema,
  releaseTrackingNotification,
  reserveTrackingNotification,
  saveManagerTrackingStatus,
  type ManagerFulfillmentStatus,
} from "../../../fulfillment-tracking";
import { sendAmbTrackingUpdateEmail } from "../../../email/tracking-update";
import { storeManagerSyncToken } from "../../../store-manager-auth";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() || "";
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sql = getAnalyticsSql();
  if (!sql) {
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 });
  }
  const token = storeManagerSyncToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Store Manager token unavailable" }, { status: 503 });
  }

  await ensureFulfillmentTrackingSchema();

  const orders = await sql`
    SELECT
      j.stripe_session_id,
      j.email,
      c.first_name
    FROM amb_commerce_journeys j
    LEFT JOIN amb_contacts c ON c.id = j.contact_id
    LEFT JOIN amb_fulfillment_tracking t ON t.session_id = j.stripe_session_id
    WHERE j.status = 'completed'
      AND j.stripe_session_id IS NOT NULL
      AND j.email IS NOT NULL
      AND COALESCE(t.fulfillment_status, '') <> 'DELIVERED'
      AND COALESCE(j.completed_at, j.updated_at) >= now() - interval '120 days'
    ORDER BY COALESCE(j.completed_at, j.updated_at) DESC
    LIMIT 100
  ` as Array<{
    stripe_session_id: string;
    email: string;
    first_name: string | null;
  }>;

  const managerBase = (
    process.env.STORE_MANAGER_BASE_URL ||
    "https://aliexpress-store-manager-six.vercel.app"
  ).replace(/\/+$/, "");

  const results: Array<Record<string, unknown>> = [];

  for (const order of orders) {
    const sessionId = order.stripe_session_id;
    try {
      const response = await fetch(
        `${managerBase}/api/stores/amb-boutique-store/amb/orders/status?session_id=${encodeURIComponent(sessionId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const body = await response.json().catch(() => null) as ManagerFulfillmentStatus | { error?: string } | null;
      if (!response.ok || !body || !("ok" in body) || body.ok !== true) {
        results.push({
          sessionId,
          ok: false,
          managerStatus: response.status,
          error: body && "error" in body ? body.error : "Manager lookup failed",
        });
        continue;
      }

      const saved = await saveManagerTrackingStatus(body);
      const shouldNotify =
        saved.changed &&
        saved.phase !== "PREPARING" &&
        Boolean(body.trackingCode || saved.latestEvent || body.fulfillmentStatus === "DELIVERED");

      let notified = false;
      let subject: string | null = null;

      if (shouldNotify) {
        const reserved = await reserveTrackingNotification({
          sessionId,
          eventKey: saved.eventKey,
          notificationType: saved.phase,
        });

        if (reserved) {
          try {
            const sent = await sendAmbTrackingUpdateEmail({
              to: order.email,
              firstName: order.first_name,
              sessionId,
              phase: saved.phase,
              trackingCode: body.trackingCode,
              latestEvent: saved.latestEvent,
              timeline: saved.timeline,
            });
            await completeTrackingNotification({
              sessionId,
              eventKey: saved.eventKey,
              providerId: sent.id,
            });
            notified = true;
            subject = sent.subject;
          } catch (error) {
            await releaseTrackingNotification({ sessionId, eventKey: saved.eventKey });
            throw error;
          }
        }
      }

      results.push({
        sessionId,
        ok: true,
        fulfillmentStatus: body.fulfillmentStatus,
        trackingCode: body.trackingCode,
        changed: saved.changed,
        phase: saved.phase,
        notified,
        subject,
      });
    } catch (error) {
      results.push({
        sessionId,
        ok: false,
        error: error instanceof Error ? error.message : "Tracking sync failed",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: results.length,
    changed: results.filter((item) => item.changed === true).length,
    notified: results.filter((item) => item.notified === true).length,
    failed: results.filter((item) => item.ok === false).length,
    results,
    timestamp: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
