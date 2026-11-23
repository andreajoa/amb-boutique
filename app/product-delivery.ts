import "server-only";

import seedDeliveryRaw from "../imports/product-delivery-seed.json";
import { getAnalyticsSql } from "./analytics/db";
import { isMarketCode, type MarketCode } from "./commerce";
import { signAmbFulfillmentPayload } from "./fulfillment-signing";
import {
  mergeDeliveryWindowsMaps,
  sanitizeDeliveryWindowsMap,
  type DeliveryWindowsMap,
  type ProductDeliveryWindows,
  type SupplierDeliveryWindow,
} from "./product-delivery-shared";
import { storeManagerSyncToken } from "./store-manager-auth";

const SEED_WINDOWS: DeliveryWindowsMap = sanitizeDeliveryWindowsMap(seedDeliveryRaw);
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_SYNC_THRESHOLD_MS = 6 * 60 * 60 * 1000;

let schemaReadyPromise: Promise<void> | null = null;
let memoryCache: { expiresAt: number; syncedAtMs: number; windows: DeliveryWindowsMap } | null = null;
let inflightBackgroundSync: Promise<unknown> | null = null;

export async function ensureProductDeliverySchema() {
  const sql = getAnalyticsSql();
  if (!sql) return;
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS amb_product_delivery_windows (
          slug TEXT NOT NULL,
          market TEXT NOT NULL,
          min_days INTEGER NOT NULL,
          max_days INTEGER NOT NULL,
          source TEXT NOT NULL DEFAULT 'supplier-quote',
          source_updated_at TIMESTAMPTZ,
          synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (slug, market)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_amb_product_delivery_synced
        ON amb_product_delivery_windows (synced_at DESC)
      `;
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }
  await schemaReadyPromise;
}

function storeManagerBaseUrl() {
  return (
    process.env.STORE_MANAGER_BASE_URL?.trim() ||
    "https://store-manager.nexaclouds.online"
  ).replace(/\/+$/, "");
}

export type DeliverySyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  linkedCount?: number;
  syncedProducts: number;
  syncedRows: number;
  removedRows: number;
  timestamp: string;
};

/**
 * Pulls sanitized per-product delivery days from Store Manager and persists them in Neon.
 * Uses the exact Bearer + Ed25519 signing bridge shared with fulfillment tracking.
 */
export async function syncDeliveryWindowsFromManager(): Promise<DeliverySyncResult> {
  const timestampIso = new Date().toISOString();
  const sql = getAnalyticsSql();
  if (!sql) {
    return { ok: false, skipped: true, reason: "Database unavailable", syncedProducts: 0, syncedRows: 0, removedRows: 0, timestamp: timestampIso };
  }
  const token = storeManagerSyncToken();
  if (!token) {
    return { ok: false, skipped: true, reason: "Store Manager token unavailable", syncedProducts: 0, syncedRows: 0, removedRows: 0, timestamp: timestampIso };
  }

  const endpointPath = "/api/stores/amb-boutique-store/amb/delivery-windows";
  const ts = String(Date.now());
  const canonical = ["GET", endpointPath, "delivery-windows", ts].join("\n");
  const signed = signAmbFulfillmentPayload(canonical);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (signed) {
    headers["x-amb-key-id"] = signed.keyId;
    headers["x-amb-signature"] = signed.signature;
    headers["x-amb-timestamp"] = ts;
  }

  const response = await fetch(`${storeManagerBaseUrl()}${endpointPath}`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const body = await response.json().catch(() => null) as {
    ok?: boolean;
    error?: string;
    linkedCount?: number;
    products?: Record<string, { markets?: Record<string, { minDays?: number; maxDays?: number; source?: string; updatedAt?: string | null }>; updatedAt?: string | null }>;
  } | null;

  if (!response.ok || !body || body.ok !== true || !body.products) {
    return {
      ok: false,
      reason: body?.error || `Store Manager HTTP ${response.status}`,
      syncedProducts: 0,
      syncedRows: 0,
      removedRows: 0,
      timestamp: timestampIso,
    };
  }

  const sanitized = sanitizeDeliveryWindowsMap(body.products);
  const rawProducts = body.products;
  await ensureProductDeliverySchema();

  const validKeys = new Set<string>();
  let syncedRows = 0;

  for (const [slug, marketMap] of Object.entries(sanitized)) {
    const rawEntry = rawProducts[slug];
    for (const [market, win] of Object.entries(marketMap) as Array<[MarketCode, SupplierDeliveryWindow]>) {
      const sourceUpdatedRaw = rawEntry?.markets?.[market]?.updatedAt ?? rawEntry?.updatedAt ?? null;
      const sourceUpdatedAt = sourceUpdatedRaw && Number.isFinite(Date.parse(sourceUpdatedRaw))
        ? new Date(sourceUpdatedRaw).toISOString()
        : null;

      await sql`
        INSERT INTO amb_product_delivery_windows (slug, market, min_days, max_days, source, source_updated_at, synced_at)
        VALUES (${slug}, ${market}, ${win.minDays}, ${win.maxDays}, ${win.source || "supplier-quote"}, ${sourceUpdatedAt}, now())
        ON CONFLICT (slug, market) DO UPDATE SET
          min_days = EXCLUDED.min_days,
          max_days = EXCLUDED.max_days,
          source = EXCLUDED.source,
          source_updated_at = EXCLUDED.source_updated_at,
          synced_at = now()
      `;
      validKeys.add(`${slug}:${market}`);
      syncedRows++;
    }
  }

  // Prune stale rows only when Store Manager confirmed linked products exist
  let removedRows = 0;
  if ((body.linkedCount ?? 0) > 0) {
    const existingRows = await sql`
      SELECT slug, market FROM amb_product_delivery_windows
    ` as Array<{ slug: string; market: string }>;
    for (const row of existingRows) {
      if (!validKeys.has(`${row.slug}:${row.market}`)) {
        await sql`
          DELETE FROM amb_product_delivery_windows
          WHERE slug = ${row.slug} AND market = ${row.market}
        `;
        removedRows++;
      }
    }
  }

  // Refresh in-memory cache immediately
  const merged = mergeDeliveryWindowsMaps(SEED_WINDOWS, sanitized);
  memoryCache = {
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
    syncedAtMs: Date.now(),
    windows: merged,
  };

  return {
    ok: true,
    linkedCount: body.linkedCount ?? 0,
    syncedProducts: Object.keys(sanitized).length,
    syncedRows,
    removedRows,
    timestamp: timestampIso,
  };
}

function triggerBackgroundRefreshIfConfigured() {
  if (inflightBackgroundSync || !storeManagerSyncToken()) return;
  inflightBackgroundSync = syncDeliveryWindowsFromManager()
    .catch(() => null)
    .finally(() => {
      inflightBackgroundSync = null;
    });
}

async function loadDatabaseDeliveryWindows(): Promise<{ windows: DeliveryWindowsMap; latestSyncedAtMs: number }> {
  const sql = getAnalyticsSql();
  if (!sql) return { windows: {}, latestSyncedAtMs: 0 };

  try {
    await ensureProductDeliverySchema();
    const rows = await sql`
      SELECT slug, market, min_days, max_days, source, synced_at
      FROM amb_product_delivery_windows
    ` as Array<{
      slug: string;
      market: string;
      min_days: number;
      max_days: number;
      source: string | null;
      synced_at: string | Date | null;
    }>;

    const map: DeliveryWindowsMap = {};
    let latestSyncedAtMs = 0;

    for (const row of rows) {
      const slug = String(row.slug || "").trim().toLowerCase();
      const market = String(row.market || "").trim().toUpperCase();
      if (!slug || !isMarketCode(market)) continue;
      if (!map[slug]) map[slug] = {};
      map[slug][market] = {
        minDays: Number(row.min_days),
        maxDays: Number(row.max_days),
        source: row.source === "manual" ? "manual" : "supplier-quote",
      };
      const syncedMs = row.synced_at ? new Date(row.synced_at).getTime() : 0;
      if (Number.isFinite(syncedMs) && syncedMs > latestSyncedAtMs) {
        latestSyncedAtMs = syncedMs;
      }
    }

    return { windows: sanitizeDeliveryWindowsMap(map), latestSyncedAtMs };
  } catch {
    return { windows: {}, latestSyncedAtMs: 0 };
  }
}

export async function getDeliveryWindowsMap(): Promise<DeliveryWindowsMap> {
  const now = Date.now();
  if (memoryCache && now < memoryCache.expiresAt) {
    if (now - memoryCache.syncedAtMs > STALE_SYNC_THRESHOLD_MS) {
      triggerBackgroundRefreshIfConfigured();
    }
    return memoryCache.windows;
  }

  const { windows: dbWindows, latestSyncedAtMs } = await loadDatabaseDeliveryWindows();
  const merged = mergeDeliveryWindowsMaps(SEED_WINDOWS, dbWindows);
  memoryCache = {
    expiresAt: now + MEMORY_CACHE_TTL_MS,
    syncedAtMs: latestSyncedAtMs,
    windows: merged,
  };

  if (latestSyncedAtMs === 0 || now - latestSyncedAtMs > STALE_SYNC_THRESHOLD_MS) {
    triggerBackgroundRefreshIfConfigured();
  }

  return merged;
}

export async function getProductDeliveryWindows(slug: string): Promise<ProductDeliveryWindows | undefined> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return undefined;
  const all = await getDeliveryWindowsMap();
  return all[clean];
}

export async function getDeliverySyncStatus(): Promise<{ syncedProducts: number; lastSyncedAt: string | null }> {
  const sql = getAnalyticsSql();
  if (!sql) return { syncedProducts: Object.keys(SEED_WINDOWS).length, lastSyncedAt: null };
  try {
    await ensureProductDeliverySchema();
    const rows = await sql`
      SELECT count(DISTINCT slug) AS products, max(synced_at) AS last_synced_at
      FROM amb_product_delivery_windows
    ` as Array<{ products: string | number; last_synced_at: string | Date | null }>;
    const row = rows[0];
    return {
      syncedProducts: Number(row?.products || 0),
      lastSyncedAt: row?.last_synced_at ? new Date(row.last_synced_at).toISOString() : null,
    };
  } catch {
    return { syncedProducts: Object.keys(SEED_WINDOWS).length, lastSyncedAt: null };
  }
}
