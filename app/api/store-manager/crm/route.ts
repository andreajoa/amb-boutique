import { NextRequest, NextResponse } from "next/server";
import { storeManagerRequestAuthorized } from "../../../store-manager-auth";
import { crmSql } from "../../../crm/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
const reply = (value: unknown, status=200) => NextResponse.json(value,{status,headers});
type Json = Record<string, unknown>;
const object = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);
const email = (v: unknown) => typeof v === "string" && v.length<=320 && v===v.trim().toLowerCase() && /^[^\s@]+@[^\s@]+$/.test(v);
const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v)>=0;
const time = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));

export async function GET(request: NextRequest) {
  if (!storeManagerRequestAuthorized(request.headers.get("authorization"))) return reply({ok:false,error:"Unauthorized"},401);
  try {
    const sql = await crmSql();
    const entity = request.nextUrl.searchParams.get("entity") || "health";
    if (entity === "health") {
      const counts = await sql`SELECT count(*) AS contacts FROM amb_prospector_contacts`;
      const schema = await sql`SELECT table_name,column_name,data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name IN ('amb_contacts','amb_analytics_events','amb_email_messages','amb_commerce_journeys') ORDER BY table_name,ordinal_position`;
      return reply({ok:true,version:1,counts:counts[0],schema});
    }
    if (entity === "events") {
      // A page view changes last_seen_at, not identity. Advance this watermark
      // only when the store really identifies a visitor or changes its email.
      // Old anonymous events are then exported once with explicit evidence.
      await sql`INSERT INTO amb_prospector_visitor_identity(visitor_id,email)
        SELECT visitor_id,lower(trim(email)) FROM amb_analytics_visitors
        WHERE email IS NOT NULL AND trim(email)<>''
        ON CONFLICT(visitor_id) DO UPDATE SET email=excluded.email,observed_at=now()
        WHERE amb_prospector_visitor_identity.email IS DISTINCT FROM excluded.email`;
    }
    // JSON projection accommodates existing schema versions without changing store tables.
    const queries: Record<string, string> = {
      contacts: `SELECT c.id::text AS key, lower(c.email) AS email,
        COALESCE((to_jsonb(c)->>'updated_at')::timestamptz,(to_jsonb(c)->>'created_at')::timestamptz,c.consented_at,'1970-01-01'::timestamptz) AS at,
        to_jsonb(c) AS payload FROM amb_contacts c`,
      journeys: `SELECT j.id::text AS key,lower(COALESCE(j.email,c.email)) AS email,j.updated_at AS at,
        to_jsonb(j) AS payload FROM amb_commerce_journeys j LEFT JOIN amb_contacts c ON c.id=j.contact_id`,
      events: `SELECT e.id::text AS key,lower(trim(v.email)) AS email,
        GREATEST(e.occurred_at,i.observed_at) AS at,
        CASE WHEN i.email=lower(trim(v.email)) THEN jsonb_build_object(
          'source','amb_analytics_visitors','visitor_id',v.visitor_id,
          'email',i.email,'observed_at',i.observed_at) ELSE NULL END AS identity,
        to_jsonb(e) AS payload FROM amb_analytics_events e LEFT JOIN amb_analytics_visitors v ON v.visitor_id=e.visitor_id
        LEFT JOIN amb_prospector_visitor_identity i ON i.visitor_id=e.visitor_id AND i.email=lower(trim(v.email))
        WHERE e.event_type IN ('product_view','add_to_cart','cart_open','checkout_start','checkout_error','newsletter_signup','popup_signup','purchase','click')`,
      messages: `SELECT m.id::text AS key,lower(c.email) AS email,
        GREATEST(m.created_at,(to_jsonb(m)->>'sent_at')::timestamptz,m.delivered_at,m.opened_at,m.clicked_at,m.bounced_at,m.complained_at) AS at,
        to_jsonb(m) AS payload FROM amb_email_messages m LEFT JOIN amb_contacts c ON c.id=m.contact_id`,
    };
    if (!queries[entity]) return reply({ok:false,error:"Unknown entity"},400);
    const afterAt = request.nextUrl.searchParams.get("afterAt") || "1970-01-01T00:00:00Z";
    const afterKey = request.nextUrl.searchParams.get("afterKey") || "";
    if (!time(afterAt) || afterKey.length>100) return reply({ok:false,error:"Invalid cursor"},400);
    const rows = await sql.query(`SELECT * FROM (${queries[entity]}) exported
      WHERE (at,key)>($1::timestamptz,$2::text) ORDER BY at,key LIMIT 501`, [afterAt,afterKey]);
    const page = rows.slice(0,500);
    const last = page.at(-1);
    return reply({ok:true,entity,rows:page,has_more:rows.length>500,cursor:last ? {at:last.at,key:last.key} : null});
  } catch {
    console.error("AMB CRM export failed");
    return reply({ok:false,error:"CRM export temporarily unavailable"},503);
  }
}

export async function POST(request: NextRequest) {
  if (!storeManagerRequestAuthorized(request.headers.get("authorization"))) return reply({ok:false,error:"Unauthorized"},401);
  if (Number(request.headers.get("content-length") || 0)>3_000_000) return reply({ok:false,error:"Batch too large"},413);
  const raw = await request.text();
  if (Buffer.byteLength(raw)>3_000_000) return reply({ok:false,error:"Batch too large"},413);
  let body: unknown;
  try { body=JSON.parse(raw); } catch { return reply({ok:false,error:"Invalid JSON"},400); }
  if (!object(body)) return reply({ok:false,error:"Invalid batch"},400);
  const contacts = body.contacts ?? [], events = body.events ?? [];
  if (!Array.isArray(contacts) || !Array.isArray(events) || contacts.length>500 || events.length>500) return reply({ok:false,error:"Invalid batch size"},400);
  for (const c of contacts) {
    if (!object(c) || !email(c.email) || typeof c.country!=="string" || c.country.length>50 ||
      typeof c.blocked!=="boolean" || typeof c.eligible!=="boolean" || !Array.isArray(c.reasons) ||
      ![c.sent,c.pending,c.opens,c.clicks,c.legacy_engagement].every(integer)) return reply({ok:false,error:"Invalid contact"},400);
  }
  for (const e of events) {
    if (!object(e) || typeof e.key!=="string" || !e.key || e.key.length>600 ||
      (e.email!==null && !email(e.email)) || typeof e.kind!=="string" || e.kind.length>80 ||
      typeof e.source!=="string" || e.source.length>80 || !time(e.observed_at) ||
      (e.occurred_at!==null && !time(e.occurred_at)) || !object(e.payload)) return reply({ok:false,error:"Invalid event"},400);
  }
  try {
    const sql = await crmSql();
    const queries = [];
    if (contacts.length) queries.push(sql`INSERT INTO amb_prospector_contacts
      (email,country,blocked,eligible,sent,pending,opens,clicks,legacy_engagement,payload)
      SELECT email,country,blocked,eligible,sent,pending,opens,clicks,legacy_engagement,payload
      FROM jsonb_to_recordset(${JSON.stringify(contacts.map(c=>({...c,payload:c})))}::jsonb)
        AS batch(email text,country text,blocked boolean,eligible boolean,sent integer,pending integer,opens integer,clicks integer,legacy_engagement integer,payload jsonb)
      ON CONFLICT(email) DO UPDATE SET country=excluded.country,blocked=amb_prospector_contacts.blocked OR excluded.blocked,
        eligible=excluded.eligible,sent=excluded.sent,pending=excluded.pending,opens=excluded.opens,clicks=excluded.clicks,
        legacy_engagement=excluded.legacy_engagement,payload=excluded.payload,synced_at=now()
      WHERE amb_prospector_contacts.payload IS DISTINCT FROM excluded.payload`);
    if (events.length) queries.push(sql`INSERT INTO amb_prospector_events(key,email,kind,source,occurred_at,observed_at,payload)
      SELECT key,email,kind,source,occurred_at,observed_at,payload
      FROM jsonb_to_recordset(${JSON.stringify(events)}::jsonb)
        AS batch(key text,email text,kind text,source text,occurred_at timestamptz,observed_at timestamptz,payload jsonb)
      ON CONFLICT(key) DO NOTHING`);
    if (object(body.status)) queries.push(sql`INSERT INTO amb_prospector_sync(key,payload) VALUES('vm',${JSON.stringify(body.status)}::jsonb)
      ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated_at=now()`);
    if (queries.length) await sql.transaction(queries);
    return reply({ok:true,contacts:contacts.length,events:events.length});
  } catch {
    console.error("AMB CRM ingestion failed");
    return reply({ok:false,error:"CRM ingestion temporarily unavailable"},503);
  }
}
