import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "../../email/send";
import { getAnalyticsSql } from "../../analytics/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string } | null;
  const email = verifyUnsubscribeToken(body?.token || "");
  if (!email) return NextResponse.json({ error: "This unsubscribe link is invalid or incomplete." }, { status: 400 });
  const sql = getAnalyticsSql();
  if (sql) {
    await sql`
      UPDATE amb_contacts SET
        unsubscribed_at = now(), suppression_reason = 'customer-unsubscribed',
        email_consent = false, updated_at = now()
      WHERE email = ${email}
    `;
  }
  if (process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID) {
    await fetch(`https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ unsubscribed: true }),
    }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}

