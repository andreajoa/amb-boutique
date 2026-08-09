import { NextResponse } from "next/server";
import { isMarketCode } from "../../commerce";

const allowedEvents = new Set(["product_view", "size_guide_open", "add_to_cart", "cart_open", "style_look_add", "checkout_start"]);

type EventBody = { event?: string; visitorId?: string; market?: unknown; slug?: string; category?: string; source?: string; valueUsd?: number };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as EventBody | null;
  if (!body?.event || !allowedEvents.has(body.event) || !body.visitorId) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const event = {
    event: body.event,
    visitorId: body.visitorId.slice(0, 100),
    market: isMarketCode(body.market) ? body.market : "US",
    slug: (body.slug || "").slice(0, 120),
    category: (body.category || "").slice(0, 50),
    source: (body.source || "storefront").slice(0, 50),
    valueUsd: Number.isFinite(body.valueUsd) ? Math.max(0, Number(body.valueUsd)) : undefined,
    occurredAt: new Date().toISOString(),
  };
  if (!process.env.BEHAVIOR_EVENT_WEBHOOK_URL) return NextResponse.json({ accepted: true, preview: true }, { status: 202 });
  const response = await fetch(process.env.BEHAVIOR_EVENT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.BEHAVIOR_EVENT_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.BEHAVIOR_EVENT_WEBHOOK_SECRET}` } : {}) },
    body: JSON.stringify(event),
  });
  if (!response.ok) return NextResponse.json({ error: "Event destination unavailable." }, { status: 502 });
  return NextResponse.json({ accepted: true });
}
