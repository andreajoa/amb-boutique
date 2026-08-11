import { NextResponse } from "next/server";
import { cancelContactEmails, verifyUnsubscribeToken } from "../../email/send";
import { unsubscribeResendContact } from "../../email/resend-contacts";
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
  await cancelContactEmails(email).catch((error) => {
    console.error("AMB scheduled email cancellation failed", { error: error instanceof Error ? error.message : "unknown" });
  });
  await unsubscribeResendContact(email).catch((error) => {
    console.error("AMB Resend unsubscribe sync failed", { error: error instanceof Error ? error.message : "unknown" });
  });
  return NextResponse.json({ ok: true });
}
