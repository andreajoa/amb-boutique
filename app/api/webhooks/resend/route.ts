import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { getAnalyticsSql, jsonForDatabase } from "../../../analytics/db";

export const runtime = "nodejs";

type ResendWebhook = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    link?: string;
    tags?: Record<string, string>;
    [key: string]: unknown;
  };
};

const statusMap: Record<string, string> = {
  "email.sent": "sent",
  "email.scheduled": "scheduled",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
  "email.delivery_delayed": "delayed",
};

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") || "",
    "svix-timestamp": request.headers.get("svix-timestamp") || "",
    "svix-signature": request.headers.get("svix-signature") || "",
  };

  try {
    const event = new Webhook(secret).verify(payload, headers) as ResendWebhook;
    const providerId = event.data?.email_id;
    const status = event.type ? statusMap[event.type] : undefined;
    const sql = getAnalyticsSql();
    if (!providerId || !status || !sql) return NextResponse.json({ received: true });

    const occurredAt = event.created_at || new Date().toISOString();
    await sql`
      UPDATE amb_email_messages SET
        status = ${status},
        sent_at = CASE WHEN ${status} = 'sent' THEN COALESCE(sent_at, ${occurredAt}::timestamptz) ELSE sent_at END,
        delivered_at = CASE WHEN ${status} = 'delivered' THEN COALESCE(delivered_at, ${occurredAt}::timestamptz) ELSE delivered_at END,
        opened_at = CASE WHEN ${status} = 'opened' THEN COALESCE(opened_at, ${occurredAt}::timestamptz) ELSE opened_at END,
        clicked_at = CASE WHEN ${status} = 'clicked' THEN COALESCE(clicked_at, ${occurredAt}::timestamptz) ELSE clicked_at END,
        bounced_at = CASE WHEN ${status} = 'bounced' THEN COALESCE(bounced_at, ${occurredAt}::timestamptz) ELSE bounced_at END,
        complained_at = CASE WHEN ${status} = 'complained' THEN COALESCE(complained_at, ${occurredAt}::timestamptz) ELSE complained_at END,
        failed_at = CASE WHEN ${status} IN ('failed', 'suppressed') THEN COALESCE(failed_at, ${occurredAt}::timestamptz) ELSE failed_at END,
        click_url = CASE WHEN ${status} = 'clicked' THEN ${event.data?.link || null} ELSE click_url END,
        metadata = metadata || ${jsonForDatabase({ lastWebhookType: event.type })}::jsonb
      WHERE provider_id = ${providerId}
    `;

    if (status === "bounced" || status === "complained" || status === "suppressed") {
      await sql`
        UPDATE amb_contacts SET
          unsubscribed_at = COALESCE(unsubscribed_at, now()),
          suppression_reason = ${status}, updated_at = now()
        WHERE id IN (SELECT contact_id FROM amb_email_messages WHERE provider_id = ${providerId})
      `;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Invalid webhook.",
    }, { status: 400 });
  }
}

