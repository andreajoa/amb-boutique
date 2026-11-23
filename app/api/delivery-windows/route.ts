import { NextRequest, NextResponse } from "next/server";

import {
  getDeliveryWindowsMap,
  getProductDeliveryWindows,
  syncDeliveryWindowsFromManager,
  type DeliverySyncResult,
} from "../../product-delivery";

export const runtime = "nodejs";
export const maxDuration = 60;

const POST_SYNC_COOLDOWN_MS = 30_000;
let lastPostSyncAt = 0;
let lastPostResult: { syncedProducts: number; syncedRows: number; timestamp: string } | null = null;
let inflightPostSync: Promise<DeliverySyncResult> | null = null;

/**
 * Public, customer-safe delivery window map (slug -> market -> { minDays, maxDays }).
 * Never exposes supplier identity, carrier names, URLs, or costs.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ ok: false, error: "Invalid product slug" }, { status: 400 });
    }
    const productWindows = await getProductDeliveryWindows(slug);
    return NextResponse.json(
      { ok: true, windows: productWindows ? { [slug]: productWindows } : {} },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  }

  const windows = await getDeliveryWindowsMap();
  return NextResponse.json(
    { ok: true, count: Object.keys(windows).length, windows },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
  );
}

/**
 * Rate-limited refresh trigger for delivery dates.
 * Accepts no untrusted payload: AMB always pulls directly from Store Manager
 * using its own server-side Bearer token + Ed25519 signature.
 */
export async function POST() {
  const now = Date.now();
  if (!inflightPostSync && lastPostResult && now - lastPostSyncAt < POST_SYNC_COOLDOWN_MS) {
    return NextResponse.json(
      {
        ok: true,
        syncedProducts: lastPostResult.syncedProducts,
        syncedRows: lastPostResult.syncedRows,
        throttled: true,
        timestamp: lastPostResult.timestamp,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const pending = inflightPostSync ?? syncDeliveryWindowsFromManager();
  if (!inflightPostSync) {
    inflightPostSync = pending.finally(() => {
      inflightPostSync = null;
    });
  }

  const result = await pending;
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.reason || "Delivery sync failed",
        timestamp: result.timestamp,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  lastPostSyncAt = Date.now();
  lastPostResult = {
    syncedProducts: result.syncedProducts,
    syncedRows: result.syncedRows,
    timestamp: result.timestamp,
  };

  return NextResponse.json(
    {
      ok: true,
      syncedProducts: result.syncedProducts,
      syncedRows: result.syncedRows,
      throttled: false,
      timestamp: result.timestamp,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
