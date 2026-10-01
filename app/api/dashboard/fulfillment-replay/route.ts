import { NextRequest, NextResponse } from "next/server";
import { dashboardAuthenticated } from "../../../dashboard/auth";
import { getAnalyticsSql } from "../../../analytics/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MANAGER_WEBHOOK =
  "https://aliexpress-store-manager-six.vercel.app/api/stores/amb-boutique-store/amb/orders/webhook";


async function replaySession(sessionId: string) {
  const secret =
    process.env.ORDER_FULFILLMENT_WEBHOOK_SECRET?.trim() ||
    process.env.STORE_CONNECTOR_SYNC_TOKEN?.trim() ||
    "";
  if (!secret) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Store Manager authentication is not configured." },
        { status: 503 },
      ),
    };
  }

  const destination =
    process.env.ORDER_FULFILLMENT_WEBHOOK_URL?.trim() || DEFAULT_MANAGER_WEBHOOK;

  const response = await fetch(destination, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "Idempotency-Key": sessionId,
    },
    body: JSON.stringify({
      eventType: "manual.fulfillment.replay",
      sessionId,
    }),
    cache: "no-store",
  });

  const text = await response.text();
  let providerBody: unknown = null;
  try {
    providerBody = text ? JSON.parse(text) : null;
  } catch {
    providerBody = { raw: text.slice(0, 1000) };
  }

  return {
    response: NextResponse.json(
      {
        ok: response.ok,
        managerStatus: response.status,
        manager: providerBody,
      },
      { status: response.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } },
    ),
  };
}

export async function GET() {
  if (!await dashboardAuthenticated()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sql = getAnalyticsSql();
  if (!sql) {
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 });
  }

  const rows = await sql`
    SELECT stripe_session_id
    FROM amb_commerce_journeys
    WHERE status = 'completed'
      AND stripe_session_id IS NOT NULL
    ORDER BY completed_at DESC NULLS LAST, updated_at DESC
    LIMIT 1
  ` as Array<{ stripe_session_id: string }>;

  const sessionId = rows[0]?.stripe_session_id?.trim() || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ ok: false, error: "No completed Stripe order found." }, { status: 404 });
  }

  return (await replaySession(sessionId)).response;
}

export async function POST(request: NextRequest) {
  if (!await dashboardAuthenticated()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { sessionId?: string } | null;
  const sessionId = body?.sessionId?.trim() || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ ok: false, error: "Invalid Stripe session." }, { status: 400 });
  }

  return (await replaySession(sessionId)).response;
}
