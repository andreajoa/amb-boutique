import "server-only";
import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null | undefined;

export function getAnalyticsSql() {
  if (client !== undefined) return client;
  const connectionString = process.env.DATABASE_URL || process.env.AMB_DATABASE_URL;
  client = connectionString ? neon(connectionString) : null;
  return client;
}

export function analyticsConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.AMB_DATABASE_URL);
}

export function jsonForDatabase(value: unknown, maxLength = 12000) {
  const serialized = JSON.stringify(value ?? {});
  return serialized.length <= maxLength ? serialized : JSON.stringify({ truncated: true });
}
