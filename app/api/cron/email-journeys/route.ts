import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsSql } from "../../../analytics/db";
import { holidayCampaigns, newsletterCampaigns } from "../../../email/campaigns";
import { automationEnabled, sendAmbEmail } from "../../../email/send";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Follow-up journey: once a contact's welcome, cart or checkout sequence has finished (nothing still scheduled), the
// contact keeps receiving the newsletter series in order, one email every few days, never repeating a campaign.
const GAP_DAYS = 3;
const BATCH = 150;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() || "";
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getAnalyticsSql();
  if (!sql || !automationEnabled()) return NextResponse.json({ sent: 0, preview: true });

  // Consent, or a U.S. shopper who gave their email at checkout (CAN-SPAM opt-out model); QA addresses excluded.
  // E-mails da temporada com data: no dia, vão a todo contato com consentimento que ainda não recebeu (passam na frente da série).
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const dated = holidayCampaigns.filter((campaign) => campaign.sendOn === today);
  const datedResults: Array<{ contact: number | string; campaign: string; sent?: boolean; error?: string }> = [];
  for (const campaign of dated) {
    const audience = await sql`
      SELECT c.id, c.email, c.first_name FROM amb_contacts c
      WHERE c.unsubscribed_at IS NULL AND c.suppression_reason IS NULL
        AND (c.email_consent = true OR (COALESCE(c.market, 'US') = 'US' AND c.source = 'stripe-checkout'))
        AND c.email NOT LIKE '%@example.com'
        AND NOT EXISTS (SELECT 1 FROM amb_email_messages m WHERE m.contact_id = c.id AND m.campaign_key = ${campaign.key})
      ORDER BY c.id
      LIMIT 2000
    ` as Array<{ id: number | string; email: string; first_name: string | null }>;
    for (const contact of audience) {
      try {
        const result = await sendAmbEmail({ campaign, to: contact.email, contactId: contact.id, firstName: contact.first_name || undefined });
        datedResults.push({ contact: contact.id, campaign: campaign.key, sent: result.sent });
      } catch (error) {
        datedResults.push({ contact: contact.id, campaign: campaign.key, error: error instanceof Error ? error.message : "unknown" });
      }
    }
  }

  const contacts = await sql`
    SELECT c.id, c.email, c.first_name, COALESCE(c.market, 'US') AS market,
      ARRAY(SELECT DISTINCT m.campaign_key FROM amb_email_messages m WHERE m.contact_id = c.id) AS received
    FROM amb_contacts c
    WHERE c.unsubscribed_at IS NULL AND c.suppression_reason IS NULL
      AND (c.email_consent = true OR (COALESCE(c.market, 'US') = 'US' AND c.source = 'stripe-checkout'))
      AND c.email NOT LIKE '%@example.com'
      AND NOT EXISTS (
        SELECT 1 FROM amb_email_messages m
        WHERE m.contact_id = c.id AND m.status = 'scheduled' AND m.scheduled_for > now()
      )
      AND NOT EXISTS (
        SELECT 1 FROM amb_email_messages m
        WHERE m.contact_id = c.id
          AND COALESCE(m.scheduled_for, m.created_at) > now() - (${GAP_DAYS} * interval '1 day')
      )
    ORDER BY c.id
    LIMIT ${BATCH}
  ` as Array<{ id: number | string; email: string; first_name: string | null; market: string; received: string[] | null }>;

  const results: Array<{ contact: number | string; campaign?: string; sent?: boolean; error?: string }> = [];
  for (const contact of contacts) {
    const received = new Set(contact.received || []);
    const next = newsletterCampaigns.find((campaign) =>
      !received.has(campaign.key) && (!campaign.market || campaign.market === "ALL" || campaign.market === contact.market));
    if (!next) continue;
    try {
      const result = await sendAmbEmail({ campaign: next, to: contact.email, contactId: contact.id, firstName: contact.first_name || undefined });
      results.push({ contact: contact.id, campaign: next.key, sent: result.sent });
    } catch (error) {
      results.push({ contact: contact.id, campaign: next.key, error: error instanceof Error ? error.message : "unknown" });
    }
  }
  return NextResponse.json({
    dated: { campaigns: dated.map((campaign) => campaign.key), sent: datedResults.filter((item) => item.sent).length, failed: datedResults.filter((item) => item.error).length },
    checked: contacts.length,
    sent: results.filter((item) => item.sent).length,
    failed: results.filter((item) => item.error).length,
    results,
  });
}
