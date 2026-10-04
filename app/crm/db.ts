import "server-only";
import { getAnalyticsSql } from "../analytics/db";
import type { NeonQueryFunction } from "@neondatabase/serverless";

let setup: Promise<void> | undefined;
export async function crmSql() {
  const sql = getAnalyticsSql() as NeonQueryFunction<false,false> | null;
  if (!sql) throw new Error("CRM database is not configured");
  if (!setup) setup = sql.transaction([
    sql`SELECT pg_advisory_xact_lock(76108420)`,
    sql`CREATE TABLE IF NOT EXISTS amb_prospector_contacts (
      email text PRIMARY KEY, country text NOT NULL DEFAULT '',
      blocked boolean NOT NULL DEFAULT false, eligible boolean NOT NULL DEFAULT false,
      sent integer NOT NULL DEFAULT 0 CHECK (sent >= 0),
      pending integer NOT NULL DEFAULT 0 CHECK (pending >= 0),
      opens integer NOT NULL DEFAULT 0 CHECK (opens >= 0),
      clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
      legacy_engagement integer NOT NULL DEFAULT 0 CHECK (legacy_engagement >= 0),
      payload jsonb NOT NULL, synced_at timestamptz NOT NULL DEFAULT now())`,
    sql`CREATE INDEX IF NOT EXISTS amb_prospector_segments ON amb_prospector_contacts(blocked,eligible,email)`,
    sql`CREATE INDEX IF NOT EXISTS amb_prospector_engagement ON amb_prospector_contacts(clicks,opens,email)`,
    sql`CREATE TABLE IF NOT EXISTS amb_prospector_events (
      key text PRIMARY KEY, email text, kind text NOT NULL, source text NOT NULL,
      occurred_at timestamptz, observed_at timestamptz NOT NULL, payload jsonb NOT NULL)`,
    sql`CREATE INDEX IF NOT EXISTS amb_prospector_event_contact ON amb_prospector_events(email,observed_at DESC,key)`,
    sql`CREATE TABLE IF NOT EXISTS amb_prospector_sync (
      key text PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`,
    sql`CREATE TABLE IF NOT EXISTS amb_prospector_visitor_identity (
      visitor_id text PRIMARY KEY, email text NOT NULL,
      observed_at timestamptz NOT NULL DEFAULT now())`,
  ]).then(() => undefined).catch((error) => { setup = undefined; throw error; });
  await setup;
  return sql;
}

export async function crmSummary() {
  const sql = await crmSql();
  const [rows, sync] = await Promise.all([
    sql`SELECT count(*) AS contacts,
      count(*) FILTER (WHERE blocked) AS blocked,
      count(*) FILTER (WHERE opens>0 OR clicks>0 OR legacy_engagement>0) AS engaged,
      count(*) FILTER (WHERE sent>0 AND opens=0 AND clicks=0 AND legacy_engagement=0) AS no_signal
      FROM amb_prospector_contacts`,
    sql`SELECT payload,updated_at FROM amb_prospector_sync WHERE key='vm'`,
  ]);
  return { counts: rows[0], sync: sync[0] || null };
}

export const segments = [
  ["all", "Todos"], ["engaged", "Interagiram"], ["no-signal", "Sem abertura registrada"],
  ["clicked", "Clicaram"], ["recurring", "Interação recorrente"],
  ["blocked", "Bloqueados / saíram"], ["subscribed", "Inscritos"],
  ["cart", "Carrinho"], ["checkout", "Checkout"], ["purchased", "Compraram"],
] as const;

const segmentPredicates: Record<string, string> = {
  all: "true", engaged: "(p.opens>0 OR p.clicks>0 OR p.legacy_engagement>0)",
  "no-signal": "p.sent>0 AND p.opens=0 AND p.clicks=0 AND p.legacy_engagement=0",
  clicked: "p.clicks>0", recurring: "p.opens+p.clicks>1", blocked: "(p.blocked OR s.unsubscribed_at IS NOT NULL OR s.suppression_reason IS NOT NULL)",
  subscribed: "(s.email_consent=true OR p.payload->>'marketing_status'='subscribed') AND s.unsubscribed_at IS NULL AND s.suppression_reason IS NULL AND NOT COALESCE(p.blocked,false)",
  cart: "EXISTS (SELECT 1 FROM amb_commerce_journeys j WHERE lower(j.email)=c.email AND j.status='cart')",
  checkout: "EXISTS (SELECT 1 FROM amb_commerce_journeys j WHERE lower(j.email)=c.email AND j.status='checkout')",
  purchased: "EXISTS (SELECT 1 FROM amb_commerce_journeys j WHERE lower(j.email)=c.email AND j.status='completed' AND j.completed_at IS NOT NULL)",
};

export async function listContacts(search: string, segment: string, after: string) {
  const sql = await crmSql();
  const where = segmentPredicates[segment] || segmentPredicates.all;
  // Store contacts are visible immediately, including before the first VM sync.
  // Fixed allowlisted predicates; all visitor input is bound as parameters.
  return sql.query(`WITH identities AS (
      SELECT email FROM amb_prospector_contacts UNION SELECT lower(email) FROM amb_contacts WHERE email IS NOT NULL
    ) SELECT c.email, p.country, p.sent, p.pending, p.opens, p.clicks,p.legacy_engagement,
      p.payload->>'marketing_status' AS marketing_status,p.payload->>'marketing_source' AS marketing_source,
      COALESCE(p.blocked,false) OR s.unsubscribed_at IS NOT NULL OR s.suppression_reason IS NOT NULL AS blocked,
      s.email_consent,s.source,s.consented_at,s.unsubscribed_at,s.suppression_reason,
      (SELECT count(*) FROM amb_commerce_journeys j WHERE lower(j.email)=c.email AND j.status='completed' AND j.completed_at IS NOT NULL) AS purchases,
      (SELECT count(*) FROM amb_commerce_journeys j WHERE lower(j.email)=c.email AND j.status='cart') AS carts,
      (SELECT count(*) FROM amb_commerce_journeys j WHERE lower(j.email)=c.email AND j.status='checkout') AS checkouts
    FROM identities c LEFT JOIN amb_prospector_contacts p ON p.email=c.email
    LEFT JOIN amb_contacts s ON lower(s.email)=c.email
    WHERE c.email>$1 AND position($2 in c.email)>0 AND (${where}) ORDER BY c.email LIMIT 51`, [after,search]);
}
