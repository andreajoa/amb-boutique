import "server-only";
import { createHash, createHmac } from "node:crypto";
import { Resend } from "resend";
import type { AmbCampaign } from "./campaigns";
import { findCampaign } from "./campaigns";
import { renderAmbEmail, absoluteUrl } from "./template";
import { getAnalyticsSql, jsonForDatabase } from "../analytics/db";

let resendClient: Resend | null | undefined;

function getResend() {
  if (resendClient !== undefined) return resendClient;
  resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  return resendClient;
}

export function automationEnabled() {
  return process.env.EMAIL_AUTOMATION_ENABLED === "true" && Boolean(process.env.RESEND_API_KEY);
}

function unsubscribeToken(email: string) {
  const secret = process.env.EMAIL_TOKEN_SECRET || process.env.DASHBOARD_SESSION_SECRET;
  if (!secret) return "";
  const normalized = email.trim().toLowerCase();
  return `${Buffer.from(normalized).toString("base64url")}.${createHmac("sha256", secret).update(normalized).digest("base64url")}`;
}

export function verifyUnsubscribeToken(token: string) {
  const [encoded, signature] = token.split(".");
  const secret = process.env.EMAIL_TOKEN_SECRET || process.env.DASHBOARD_SESSION_SECRET;
  if (!encoded || !signature || !secret) return null;
  const email = Buffer.from(encoded, "base64url").toString("utf8").trim().toLowerCase();
  const expected = createHmac("sha256", secret).update(email).digest("base64url");
  return signature.length === expected.length && cryptoSafeEqual(signature, expected) ? email : null;
}

function cryptoSafeEqual(left: string, right: string) {
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function ensureCampaign(campaign: AmbCampaign) {
  const sql = getAnalyticsSql();
  if (!sql) return;
  await sql`
    INSERT INTO amb_email_campaigns (
      campaign_key, campaign_type, sequence_step, name, market, subject_a, subject_b,
      preview_text, template_key, send_rule, content
    ) VALUES (
      ${campaign.key}, ${campaign.type}, ${campaign.step || null}, ${campaign.name},
      ${campaign.market || "ALL"}, ${campaign.subjectA}, ${campaign.subjectB || null},
      ${campaign.preview}, 'amb-clean-v1',
      ${jsonForDatabase({ delayHours: campaign.delayHours })}::jsonb,
      ${jsonForDatabase({ eyebrow: campaign.eyebrow, headline: campaign.headline, body: campaign.body, ctaLabel: campaign.ctaLabel, ctaUrl: campaign.ctaUrl })}::jsonb
    )
    ON CONFLICT (campaign_key) DO UPDATE SET
      name = EXCLUDED.name, subject_a = EXCLUDED.subject_a, subject_b = EXCLUDED.subject_b,
      preview_text = EXCLUDED.preview_text, content = EXCLUDED.content, updated_at = now()
  `;
}

export async function sendAmbEmail(options: {
  campaign: AmbCampaign | string;
  to: string;
  contactId?: number | string | null;
  journeyId?: number | string | null;
  firstName?: string;
  recoveryUrl?: string;
  scheduledAt?: string;
  orderReference?: string;
}) {
  const campaign = typeof options.campaign === "string" ? findCampaign(options.campaign) : options.campaign;
  await ensureCampaign(campaign);
  const resend = getResend();
  if (!automationEnabled() || !resend) return { sent: false, preview: true, campaign: campaign.key };

  const token = unsubscribeToken(options.to);
  const unsubscribeUrl = token ? absoluteUrl(`/unsubscribe?token=${encodeURIComponent(token)}`) : absoluteUrl("/unsubscribe");
  const html = renderAmbEmail(campaign, {
    firstName: options.firstName,
    recoveryUrl: options.recoveryUrl,
    unsubscribeUrl,
    orderReference: options.orderReference,
  });
  const from = process.env.RESEND_FROM_EMAIL || "AMB BOUTIQUE <info@ambboutique.online>";
  const result = await resend.emails.send({
    from,
    to: [options.to],
    replyTo: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@ambboutique.online",
    subject: campaign.subjectA,
    html,
    scheduledAt: options.scheduledAt,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    tags: [
      { name: "campaign", value: campaign.key },
      { name: "type", value: campaign.type },
    ],
  });
  if (result.error || !result.data?.id) throw new Error(result.error?.message || "Email provider did not accept the message.");

  const sql = getAnalyticsSql();
  if (sql) {
    await sql`
      INSERT INTO amb_email_messages (
        contact_id, journey_id, campaign_key, provider_id, recipient_hash,
        subject_variant, status, scheduled_for, metadata
      ) VALUES (
        ${options.contactId || null}, ${options.journeyId || null}, ${campaign.key},
        ${result.data.id}, ${createHash("sha256").update(options.to.trim().toLowerCase()).digest("hex")},
        'A', ${options.scheduledAt ? "scheduled" : "sent"}, ${options.scheduledAt || null},
        ${jsonForDatabase({ recoveryUrl: options.recoveryUrl || campaign.ctaUrl })}::jsonb
      )
      ON CONFLICT (provider_id) DO NOTHING
    `;
  }
  return { sent: true, preview: false, id: result.data.id, campaign: campaign.key };
}

export async function scheduleRecoverySequence(options: {
  campaigns: AmbCampaign[];
  to: string;
  contactId?: number | string | null;
  journeyId?: number | string | null;
  recoveryUrl: string;
  firstName?: string;
}) {
  if (!automationEnabled()) return { scheduled: 0, preview: true };
  await cancelJourneyEmails(options.journeyId);
  const now = Date.now();
  const results = [];
  for (const campaign of options.campaigns) {
    const scheduledAt = new Date(now + (campaign.delayHours || 1) * 60 * 60 * 1000).toISOString();
    results.push(await sendAmbEmail({ ...options, campaign, scheduledAt }));
  }
  return { scheduled: results.filter((item) => item.sent).length, preview: false };
}

export async function cancelJourneyEmails(journeyId?: number | string | null) {
  if (!journeyId) return;
  const sql = getAnalyticsSql();
  const resend = getResend();
  if (!sql || !resend) return;
  const rows = await sql`
    SELECT id, provider_id FROM amb_email_messages
    WHERE journey_id = ${journeyId} AND status = 'scheduled' AND provider_id IS NOT NULL
  ` as Array<{ id: number; provider_id: string }>;
  for (const row of rows) {
    await resend.emails.cancel(row.provider_id).catch(() => undefined);
    await sql`UPDATE amb_email_messages SET status = 'cancelled' WHERE id = ${row.id}`;
  }
}
