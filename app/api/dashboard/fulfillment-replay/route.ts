import { NextRequest, NextResponse } from "next/server";
import { dashboardAuthenticated } from "../../../dashboard/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MANAGER_WEBHOOK =
  "https://aliexpress-store-manager-six.vercel.app/api/stores/amb-boutique-store/amb/orders/webhook";

export async function POST(request: NextRequest) {
  if (!await dashboardAuthenticated()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { sessionId?: string } | null;
  const sessionId = body?.sessionId?.trim() || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ ok: false, error: "Invalid Stripe session." }, { status: 400 });
  }

  const secret =
    process.env.ORDER_FULFILLMENT_WEBHOOK_SECRET?.trim() ||
    process.env.STORE_CONNECTOR_SYNC_TOKEN?.trim() ||
    "";
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Store Manager authentication is not configured." },
      { status: 503 },
    );
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

  const providerBody = await response.json().catch(async () => ({
    raw: (await response.text().catch(() => "")).slice(0, 1000),
  }));

  return NextResponse.json(
    {
      ok: response.ok,
      managerStatus: response.status,
      manager: providerBody,
    },
    { status: response.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } },
  );
}
