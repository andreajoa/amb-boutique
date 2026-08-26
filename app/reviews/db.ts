import "server-only";
import { getAnalyticsSql } from "../analytics/db";

let schemaReady: Promise<void> | null = null;

export async function getReviewsSql() {
  const sql = getAnalyticsSql();
  if (!sql) return null;

  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS amb_product_reviews (
          id BIGSERIAL PRIMARY KEY,
          product_slug TEXT NOT NULL,
          product_name TEXT NOT NULL,
          product_image TEXT,
          customer_name TEXT NOT NULL,
          rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          review_body TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
          ip_hash TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          moderated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS amb_product_reviews_product_status_idx ON amb_product_reviews (product_slug, status, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS amb_product_reviews_status_idx ON amb_product_reviews (status, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS amb_product_reviews_ip_idx ON amb_product_reviews (ip_hash, created_at DESC)`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
  return sql;
}
