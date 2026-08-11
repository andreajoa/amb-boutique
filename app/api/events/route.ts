import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isMarketCode } from "../../commerce";
import { getAnalyticsSql, jsonForDatabase } from "../../analytics/db";

export const runtime = "nodejs";

const allowedEvents = new Set([
  "session_start", "session_end", "page_view", "click", "scroll_depth", "heartbeat",
  "product_view", "size_guide_open", "add_to_cart", "cart_open", "style_look_add",
  "checkout_start", "checkout_error", "newsletter_signup", "popup_signup", "purchase",
]);

type EventBody = {
  event?: string;
  visitorId?: string;
  sessionId?: string;
  market?: unknown;
  slug?: string;
  category?: string;
  source?: string;
  valueUsd?: number;
  path?: string;
  target?: string;
  referrer?: string;
  scrollDepth?: number;
  durationSeconds?: number;
  utm?: Record<string, unknown>;
  device?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

const text = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : "";
const number = (value: unknown, max: number) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Number(value))) : 0;

function geo(request: NextRequest) {
  return {
    country: text(request.headers.get("x-vercel-ip-country"), 2) || null,
    region: text(request.headers.get("x-vercel-ip-country-region"), 80) || null,
    city: text(request.headers.get("x-vercel-ip-city"), 120) || null,
  };
}

function anonymizedIp(request: NextRequest) {
  const ip = text(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), 80);
  const salt = process.env.ANALYTICS_HASH_SALT;
  return ip && salt ? createHash("sha256").update(`${salt}:${ip}`).digest("hex") : null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as EventBody | null;
  if (!body?.event || !allowedEvents.has(body.event) || !body.visitorId) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  const eventType = body.event;
  const visitorId = text(body.visitorId, 100);
  const sessionId = text(body.sessionId, 100) || `session-${visitorId}`;
  const market = isMarketCode(body.market) ? body.market : "US";
  const path = text(body.path, 500) || "/";
  const place = geo(request);
  const utm = typeof body.utm === "object" && body.utm ? body.utm : {};
  const device = typeof body.device === "object" && body.device ? body.device : {};
  const metadata = typeof body.metadata === "object" && body.metadata ? body.metadata : {};
  const durationSeconds = Math.round(number(body.durationSeconds, 86400));
  const scrollDepth = Math.round(number(body.scrollDepth, 100));
  const sql = getAnalyticsSql();

  if (sql) {
    try {
      await sql`
        INSERT INTO amb_analytics_visitors (
          visitor_id, last_seen_at, market, country, region, city, consent_analytics,
          first_referrer, first_utm, device, ip_hash
        ) VALUES (
          ${visitorId}, now(), ${market}, ${place.country}, ${place.region}, ${place.city}, true,
          ${text(body.referrer, 500) || null}, ${jsonForDatabase(utm)}::jsonb,
          ${jsonForDatabase(device)}::jsonb, ${anonymizedIp(request)}
        )
        ON CONFLICT (visitor_id) DO UPDATE SET
          last_seen_at = now(), market = EXCLUDED.market,
          country = COALESCE(amb_analytics_visitors.country, EXCLUDED.country),
          region = COALESCE(amb_analytics_visitors.region, EXCLUDED.region),
          city = COALESCE(amb_analytics_visitors.city, EXCLUDED.city),
          consent_analytics = true
      `;
      await sql`
        INSERT INTO amb_analytics_sessions (
          session_id, visitor_id, entry_path, exit_path, referrer, market, country, region, city,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          device_type, browser, os, last_activity_at
        ) VALUES (
          ${sessionId}, ${visitorId}, ${path}, ${path}, ${text(body.referrer, 500) || null},
          ${market}, ${place.country}, ${place.region}, ${place.city},
          ${text(utm.source, 160) || null}, ${text(utm.medium, 160) || null},
          ${text(utm.campaign, 160) || null}, ${text(utm.content, 160) || null},
          ${text(utm.term, 160) || null}, ${text(device.type, 50) || null},
          ${text(device.browser, 80) || null}, ${text(device.os, 80) || null}, now()
        )
        ON CONFLICT (session_id) DO UPDATE SET
          last_activity_at = now(), exit_path = EXCLUDED.exit_path,
          duration_seconds = GREATEST(amb_analytics_sessions.duration_seconds, ${durationSeconds}),
          pageviews = amb_analytics_sessions.pageviews + CASE WHEN ${eventType} = 'page_view' THEN 1 ELSE 0 END,
          click_count = amb_analytics_sessions.click_count + CASE WHEN ${eventType} = 'click' THEN 1 ELSE 0 END,
          max_scroll = GREATEST(amb_analytics_sessions.max_scroll, ${scrollDepth}),
          added_to_cart = amb_analytics_sessions.added_to_cart OR ${eventType} = 'add_to_cart',
          started_checkout = amb_analytics_sessions.started_checkout OR ${eventType} = 'checkout_start',
          purchased = amb_analytics_sessions.purchased OR ${eventType} = 'purchase',
          ended_at = CASE WHEN ${eventType} = 'session_end' THEN now() ELSE amb_analytics_sessions.ended_at END
      `;
      await sql`
        INSERT INTO amb_analytics_events (
          session_id, visitor_id, event_type, path, target, slug, category, source,
          market, value_usd, scroll_depth, duration_seconds, metadata
        ) VALUES (
          ${sessionId}, ${visitorId}, ${eventType}, ${path}, ${text(body.target, 300) || null},
          ${text(body.slug, 160) || null}, ${text(body.category, 80) || null},
          ${text(body.source, 80) || "storefront"}, ${market},
          ${Number.isFinite(body.valueUsd) ? Math.max(0, Number(body.valueUsd)) : null},
          ${scrollDepth || null}, ${durationSeconds || null}, ${jsonForDatabase(metadata)}::jsonb
        )
      `;
    } catch (error) {
      console.error("AMB analytics persistence failed", {
        eventType,
        error: error instanceof Error ? error.message : "unknown",
      });
      return NextResponse.json({ error: "Analytics persistence unavailable." }, { status: 503 });
    }
  }

  if (process.env.BEHAVIOR_EVENT_WEBHOOK_URL) {
    void fetch(process.env.BEHAVIOR_EVENT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.BEHAVIOR_EVENT_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.BEHAVIOR_EVENT_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ ...body, visitorId, sessionId, market, occurredAt: new Date().toISOString() }),
    }).catch(() => undefined);
  }

  return NextResponse.json({ accepted: true, persisted: Boolean(sql) }, { status: sql ? 200 : 202 });
}

