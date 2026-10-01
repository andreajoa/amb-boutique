import { NextResponse } from "next/server";
import { dashboardAuthenticated } from "../auth";
import { getAnalyticsSql } from "../../analytics/db";
import { cartRecoveryCampaigns, checkoutRecoveryCampaigns } from "../../email/campaigns";
import { scheduleEmailSequence, sendAmbEmail } from "../../email/send";
import { createJourneyToken } from "../../email/journey-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EligibleJourney = {
  id: number | string;
  status: "cart" | "checkout" | "abandoned";
  visitor_id: string | null;
  contact_id: number | string | null;
  email: string;
  first_name: string | null;
  updated_at: string;
};

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

async function eligibleJourneys() {
  const sql = getAnalyticsSql();
  if (!sql) return [] as EligibleJourney[];

  return await sql`
    SELECT
      j.id,
      j.status,
      j.visitor_id,
      chosen.id AS contact_id,
      chosen.email,
      chosen.first_name,
      j.updated_at
    FROM amb_commerce_journeys j
    JOIN LATERAL (
      SELECT c.id, c.email, c.first_name
      FROM amb_contacts c
      WHERE (
          (j.contact_id IS NOT NULL AND c.id = j.contact_id)
          OR (j.visitor_id IS NOT NULL AND c.visitor_id = j.visitor_id)
          OR (j.email IS NOT NULL AND lower(c.email) = lower(j.email))
        )
        AND c.email_consent = true
        AND c.unsubscribed_at IS NULL
        AND c.suppression_reason IS NULL
        AND c.email IS NOT NULL
        AND c.email <> ''
      ORDER BY
        CASE WHEN j.contact_id IS NOT NULL AND c.id = j.contact_id THEN 0 ELSE 1 END,
        c.updated_at DESC
      LIMIT 1
    ) chosen ON true
    WHERE j.status IN ('cart', 'checkout', 'abandoned')
      AND j.updated_at >= now() - interval '30 days'
      AND (
        (j.status = 'cart' AND j.updated_at <= now() - interval '1 hour')
        OR
        (j.status IN ('checkout', 'abandoned') AND j.updated_at <= now() - interval '30 minutes')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM amb_commerce_journeys completed
        WHERE completed.status = 'completed'
          AND completed.completed_at >= j.created_at
          AND (
            (chosen.id IS NOT NULL AND completed.contact_id = chosen.id)
            OR (j.visitor_id IS NOT NULL AND completed.visitor_id = j.visitor_id)
            OR (completed.email IS NOT NULL AND lower(completed.email) = lower(chosen.email))
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM amb_email_messages message
        WHERE message.journey_id = j.id
          AND (message.campaign_key LIKE 'cart-%' OR message.campaign_key LIKE 'checkout-%')
          AND message.status NOT IN ('cancelled', 'failed', 'bounced', 'suppressed')
      )
    ORDER BY j.updated_at DESC
    LIMIT 100
  ` as EligibleJourney[];
}

export async function GET() {
  if (!await dashboardAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getAnalyticsSql();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const rows = await eligibleJourneys();
  const diagnostics = await sql`
    WITH base AS (
      SELECT j.*
      FROM amb_commerce_journeys j
      WHERE j.status IN ('cart', 'checkout', 'abandoned')
        AND j.updated_at >= now() - interval '30 days'
        AND (
          (j.status = 'cart' AND j.updated_at <= now() - interval '1 hour')
          OR
          (j.status IN ('checkout', 'abandoned') AND j.updated_at <= now() - interval '30 minutes')
        )
    ),
    linked AS (
      SELECT
        j.id,
        j.status,
        j.visitor_id,
        j.contact_id,
        j.email AS journey_email,
        j.created_at,
        c.id AS matched_contact_id,
        c.email AS contact_email,
        c.email_consent,
        c.unsubscribed_at,
        c.suppression_reason
      FROM base j
      LEFT JOIN LATERAL (
        SELECT c.*
        FROM amb_contacts c
        WHERE
          (j.contact_id IS NOT NULL AND c.id = j.contact_id)
          OR (j.visitor_id IS NOT NULL AND c.visitor_id = j.visitor_id)
          OR (j.email IS NOT NULL AND lower(c.email) = lower(j.email))
        ORDER BY
          CASE WHEN j.contact_id IS NOT NULL AND c.id = j.contact_id THEN 0 ELSE 1 END,
          c.updated_at DESC
        LIMIT 1
      ) c ON true
    )
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE COALESCE(contact_email, journey_email) IS NOT NULL) AS with_email,
      count(*) FILTER (WHERE email_consent = true) AS with_consent,
      count(*) FILTER (WHERE email_consent = true AND unsubscribed_at IS NULL AND suppression_reason IS NULL) AS consented_active,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM amb_commerce_journeys done
        WHERE done.status = 'completed'
          AND done.completed_at >= linked.created_at
          AND (
            (matched_contact_id IS NOT NULL AND done.contact_id = matched_contact_id)
            OR (linked.visitor_id IS NOT NULL AND done.visitor_id = linked.visitor_id)
            OR (done.email IS NOT NULL AND lower(done.email) = lower(COALESCE(contact_email, journey_email)))
          )
      )) AS later_purchased,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM amb_email_messages m
        WHERE m.journey_id = linked.id
          AND (m.campaign_key LIKE 'cart-%' OR m.campaign_key LIKE 'checkout-%')
          AND m.status NOT IN ('cancelled', 'failed', 'bounced', 'suppressed')
      )) AS existing_recovery
    FROM linked
  ` as Array<Record<string, string | number | null>>;

  return NextResponse.json({
    eligible: rows.length,
    cart: rows.filter((row) => row.status === "cart").length,
    checkout: rows.filter((row) => row.status !== "cart").length,
    diagnostics: diagnostics[0] || {},
    recipients: rows.map((row) => ({
      journeyId: row.id,
      status: row.status,
      email: maskEmail(row.email),
      updatedAt: row.updated_at,
    })),
  });
}

export async function POST() {
  if (!await dashboardAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getAnalyticsSql();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const rows = await eligibleJourneys();
  const results: Array<{
    journeyId: number | string;
    status: string;
    email: string;
    sent: boolean;
    scheduled: number;
    error?: string;
  }> = [];

  for (const row of rows) {
    const campaigns = row.status === "cart" ? cartRecoveryCampaigns : checkoutRecoveryCampaigns;
    const token = createJourneyToken(row.id);
    if (!token || !campaigns.length) {
      results.push({
        journeyId: row.id,
        status: row.status,
        email: maskEmail(row.email),
        sent: false,
        scheduled: 0,
        error: "Recovery token or campaign unavailable",
      });
      continue;
    }

    try {
      await sql`
        UPDATE amb_commerce_journeys
        SET contact_id = ${row.contact_id}, email = ${row.email}, updated_at = updated_at
        WHERE id = ${row.id}
      `;

      const recoveryUrl = `/recover-cart/${encodeURIComponent(token)}`;
      const first = await sendAmbEmail({
        campaign: campaigns[0],
        to: row.email,
        contactId: row.contact_id,
        journeyId: row.id,
        recoveryUrl,
        firstName: row.first_name || undefined,
      });

      const followUps = campaigns.slice(1);
      const scheduled = followUps.length
        ? await scheduleEmailSequence({
            campaigns: followUps,
            to: row.email,
            contactId: row.contact_id,
            journeyId: row.id,
            recoveryUrl,
            firstName: row.first_name || undefined,
            cancelExistingJourneyEmails: false,
          })
        : { scheduled: 0 };

      results.push({
        journeyId: row.id,
        status: row.status,
        email: maskEmail(row.email),
        sent: Boolean(first.sent),
        scheduled: Number(scheduled.scheduled || 0),
      });
    } catch (error) {
      results.push({
        journeyId: row.id,
        status: row.status,
        email: maskEmail(row.email),
        sent: false,
        scheduled: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    eligible: rows.length,
    sent: results.filter((row) => row.sent).length,
    followUpsScheduled: results.reduce((sum, row) => sum + row.scheduled, 0),
    failed: results.filter((row) => row.error).length,
    results,
  });
}
