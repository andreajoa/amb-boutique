import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { generatedInventoryVariants } from "./generated-inventory";

export type InventoryRequest = {
  slug: string;
  color: string;
  size: string;
  quantity: number;
};

export type ResolvedInventoryLine = InventoryRequest & {
  sku: string;
  available: number;
};

type QueryRow = Record<string, unknown>;

let database: NeonQueryFunction<false, false> | null = null;

export class InventoryError extends Error {
  status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "InventoryError";
    this.status = status;
  }
}

function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new InventoryError("Live inventory is temporarily unavailable. Please try again shortly.", 503);
  }
  if (!database) database = neon(connectionString);
  return database;
}

function uniqueRequests(requests: InventoryRequest[]) {
  const grouped = new Map<string, InventoryRequest>();
  for (const request of requests) {
    const slug = request.slug.trim();
    const color = request.color.trim();
    const size = request.size.trim();
    const quantity = Math.max(1, Math.floor(request.quantity));
    const key = `${slug}\u0000${color.toLowerCase()}\u0000${size.toLowerCase()}`;
    const current = grouped.get(key);
    grouped.set(key, { slug, color, size, quantity: (current?.quantity || 0) + quantity });
  }
  return [...grouped.values()];
}

export async function ensureInventoryForProducts(productSlugs: string[]) {
  const wanted = new Set(productSlugs);
  const variants = generatedInventoryVariants.filter((variant) => wanted.has(variant.productSlug));
  if (!variants.length) return;
  const sql = getDatabase();
  await sql.query(`
    INSERT INTO inventory_variants
      (sku, product_slug, product_name, color, size, stock_on_hand, active, supplier_unit_cost_usd)
    SELECT sku, product_slug, product_name, color, size, stock, active, unit_cost_usd
    FROM jsonb_to_recordset($1::jsonb) AS item(
      sku text,
      product_slug text,
      product_name text,
      color text,
      size text,
      stock integer,
      active boolean,
      unit_cost_usd numeric
    )
    ON CONFLICT (sku) DO UPDATE
    SET product_slug = EXCLUDED.product_slug,
        product_name = EXCLUDED.product_name,
        color = EXCLUDED.color,
        size = EXCLUDED.size,
        active = EXCLUDED.active,
        supplier_unit_cost_usd = EXCLUDED.supplier_unit_cost_usd,
        updated_at = NOW()
  `, [JSON.stringify(variants.map((variant) => ({
    sku: variant.sku,
    product_slug: variant.productSlug,
    product_name: variant.productName,
    color: variant.color,
    size: variant.size,
    stock: variant.stock,
    active: variant.active,
    unit_cost_usd: variant.unitCostUsd,
  })))]);
}

export async function releaseExpiredInventory() {
  const sql = getDatabase();
  await sql.query(`
    WITH expired AS (
      UPDATE inventory_reservations
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending' AND expires_at <= NOW()
      RETURNING checkout_session_id
    ), quantities AS (
      SELECT line.sku, SUM(line.quantity)::int AS quantity
      FROM inventory_reservation_lines AS line
      JOIN expired USING (checkout_session_id)
      GROUP BY line.sku
    )
    UPDATE inventory_variants AS variant
    SET stock_reserved = GREATEST(0, variant.stock_reserved - quantities.quantity),
        updated_at = NOW()
    FROM quantities
    WHERE variant.sku = quantities.sku
  `);
}

export async function resolveInventoryLines(requests: InventoryRequest[]): Promise<ResolvedInventoryLine[]> {
  const sql = getDatabase();
  const grouped = uniqueRequests(requests);
  if (!grouped.length) throw new InventoryError("Your bag does not contain a valid item.", 400);

  const rows = await sql.query(`
    WITH requested AS (
      SELECT product_slug, color, size, quantity
      FROM jsonb_to_recordset($1::jsonb)
        AS item(product_slug text, color text, size text, quantity integer)
    )
    SELECT
      requested.product_slug,
      requested.color AS requested_color,
      requested.size AS requested_size,
      requested.quantity,
      variant.sku,
      variant.color,
      variant.size,
      (variant.stock_on_hand - variant.stock_reserved)::int AS available
    FROM requested
    LEFT JOIN inventory_variants AS variant
      ON variant.product_slug = requested.product_slug
      AND LOWER(variant.color) = LOWER(requested.color)
      AND LOWER(variant.size) = LOWER(requested.size)
      AND variant.active = TRUE
  `, [JSON.stringify(grouped.map((item) => ({
    product_slug: item.slug,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
  })))]);

  if (rows.length !== grouped.length) {
    throw new InventoryError("One of the selected options is no longer available.");
  }

  return rows.map((raw) => {
    const row = raw as QueryRow;
    const sku = typeof row.sku === "string" ? row.sku : "";
    const available = Number(row.available);
    const quantity = Number(row.quantity);
    if (!sku) throw new InventoryError("This color and size combination is being updated. Please choose another option.");
    if (!Number.isFinite(available) || available < quantity) {
      throw new InventoryError(available > 0
        ? `Only ${available} unit${available === 1 ? " is" : "s are"} available in this size.`
        : "This size has just sold out.");
    }
    return {
      slug: String(row.product_slug),
      color: String(row.color),
      size: String(row.size),
      quantity,
      sku,
      available,
    };
  });
}

export async function reserveInventory(
  checkoutSessionId: string,
  expiresAt: Date,
  lines: Array<Pick<ResolvedInventoryLine, "sku" | "quantity">>,
) {
  const sql = getDatabase();
  const requested = lines.map((line) => ({ sku: line.sku, quantity: line.quantity }));
  const rows = await sql.query(`
    WITH requested AS (
      SELECT sku, SUM(quantity)::int AS quantity
      FROM jsonb_to_recordset($3::jsonb) AS item(sku text, quantity integer)
      GROUP BY sku
    ), availability AS (
      SELECT
        COUNT(variant.sku) = (SELECT COUNT(*) FROM requested)
        AND COALESCE(BOOL_AND(variant.active AND (variant.stock_on_hand - variant.stock_reserved) >= requested.quantity), FALSE) AS ok
      FROM requested
      LEFT JOIN inventory_variants AS variant USING (sku)
    ), created AS (
      INSERT INTO inventory_reservations (checkout_session_id, expires_at)
      SELECT $1, $2::timestamptz FROM availability WHERE ok
      ON CONFLICT (checkout_session_id) DO NOTHING
      RETURNING checkout_session_id
    ), held AS (
      UPDATE inventory_variants AS variant
      SET stock_reserved = variant.stock_reserved + requested.quantity,
          updated_at = NOW()
      FROM requested, availability, created
      WHERE availability.ok AND variant.sku = requested.sku
      RETURNING variant.sku
    ), saved AS (
      INSERT INTO inventory_reservation_lines (checkout_session_id, sku, quantity)
      SELECT created.checkout_session_id, requested.sku, requested.quantity
      FROM requested, created
      RETURNING sku
    )
    SELECT
      availability.ok
      AND EXISTS (SELECT 1 FROM created)
      AND (SELECT COUNT(*) FROM held) = (SELECT COUNT(*) FROM requested)
      AND (SELECT COUNT(*) FROM saved) = (SELECT COUNT(*) FROM requested) AS reserved
    FROM availability
  `, [checkoutSessionId, expiresAt.toISOString(), JSON.stringify(requested)]);

  if (!(rows[0] as QueryRow | undefined)?.reserved) {
    throw new InventoryError("One of these items was just reserved by another customer. Please review your bag.");
  }
}

export async function finalizeInventory(checkoutSessionId: string, stripeEventId: string, eventType: string) {
  const sql = getDatabase();
  const rows = await sql.query(`
    WITH accepted_event AS (
      INSERT INTO inventory_events (stripe_event_id, event_type, checkout_session_id)
      VALUES ($2, $3, $1)
      ON CONFLICT (stripe_event_id) DO NOTHING
      RETURNING stripe_event_id
    ), paid_reservation AS (
      UPDATE inventory_reservations
      SET status = 'paid', updated_at = NOW()
      WHERE checkout_session_id = $1
        AND status = 'pending'
        AND EXISTS (SELECT 1 FROM accepted_event)
      RETURNING checkout_session_id
    ), deducted AS (
      UPDATE inventory_variants AS variant
      SET stock_on_hand = variant.stock_on_hand - line.quantity,
          stock_reserved = variant.stock_reserved - line.quantity,
          updated_at = NOW()
      FROM inventory_reservation_lines AS line, paid_reservation
      WHERE line.checkout_session_id = paid_reservation.checkout_session_id
        AND variant.sku = line.sku
      RETURNING variant.sku
    )
    SELECT
      (SELECT status FROM inventory_reservations WHERE checkout_session_id = $1) AS status,
      (SELECT COUNT(*)::int FROM deducted) AS deducted_count
  `, [checkoutSessionId, stripeEventId, eventType]);

  if ((rows[0] as QueryRow | undefined)?.status !== "paid") {
    throw new Error(`Paid order ${checkoutSessionId} has no active inventory reservation.`);
  }
}

export async function releaseInventory(
  checkoutSessionId: string,
  stripeEventId: string,
  eventType: string,
  status: "released" | "expired",
) {
  const sql = getDatabase();
  await sql.query(`
    WITH accepted_event AS (
      INSERT INTO inventory_events (stripe_event_id, event_type, checkout_session_id)
      VALUES ($2, $3, $1)
      ON CONFLICT (stripe_event_id) DO NOTHING
      RETURNING stripe_event_id
    ), released_reservation AS (
      UPDATE inventory_reservations
      SET status = $4, updated_at = NOW()
      WHERE checkout_session_id = $1
        AND status = 'pending'
        AND EXISTS (SELECT 1 FROM accepted_event)
      RETURNING checkout_session_id
    )
    UPDATE inventory_variants AS variant
    SET stock_reserved = GREATEST(0, variant.stock_reserved - line.quantity),
        updated_at = NOW()
    FROM inventory_reservation_lines AS line, released_reservation
    WHERE line.checkout_session_id = released_reservation.checkout_session_id
      AND variant.sku = line.sku
  `, [checkoutSessionId, stripeEventId, eventType, status]);
}

export async function getVariantAvailability(slug: string, color: string, size: string) {
  const sql = getDatabase();
  const rows = await sql.query(`
    SELECT sku, (stock_on_hand - stock_reserved)::int AS available
    FROM inventory_variants
    WHERE product_slug = $1
      AND LOWER(color) = LOWER($2)
      AND LOWER(size) = LOWER($3)
      AND active = TRUE
    LIMIT 1
  `, [slug, color, size]);
  const row = rows[0] as QueryRow | undefined;
  return row ? { managed: true, sku: String(row.sku), available: Number(row.available) } : { managed: false, available: 0 };
}
