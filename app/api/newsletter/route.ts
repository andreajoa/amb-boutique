import { NextResponse } from "next/server";
import { FIRST_ORDER_CODE, isMarketCode } from "../../commerce";
import { getAnalyticsSql, jsonForDatabase } from "../../analytics/db";
import { sendAmbEmail } from "../../email/send";
import { subscribeResendContact } from "../../email/resend-contacts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9()\- .]{7,22}$/;

type CaptureBody = {
  email?: string;
  phone?: string;
  emailConsent?: boolean;
  smsConsent?: boolean;
  market?: unknown;
  visitorId?: string;
  source?: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as CaptureBody | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const phone = body?.phone?.trim() || "";
  const source = (body?.source || "newsletter-form").slice(0, 50);
  const visitorId = (body?.visitorId || "").slice(0, 100);
  const market = isMarketCode(body?.market) ? body.market : "US";

  if (!email || !emailPattern.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (phone && !phonePattern.test(phone)) return NextResponse.json({ error: "Enter a valid mobile number with country code." }, { status: 400 });
  if (source === "welcome-popup" && !body?.emailConsent) return NextResponse.json({ error: "Email consent is required to deliver this welcome offer." }, { status: 400 });
  if (phone && !body?.smsConsent) return NextResponse.json({ error: "SMS consent is required when a mobile number is supplied." }, { status: 400 });

  const emailConsent = Boolean(body?.emailConsent ?? true);
  const smsConsent = Boolean(body?.smsConsent && phone);
  const consentedAt = new Date().toISOString();
  const sql = getAnalyticsSql();
  let contactId: number | string | null = null;

  if (sql) {
    try {
      if (visitorId) {
        await sql`
          INSERT INTO amb_analytics_visitors (visitor_id, last_seen_at, market, email, phone, consent_marketing)
          VALUES (${visitorId}, now(), ${market}, ${email}, ${phone || null}, ${emailConsent || smsConsent})
          ON CONFLICT (visitor_id) DO UPDATE SET
            last_seen_at = now(), market = EXCLUDED.market, email = EXCLUDED.email,
            phone = COALESCE(EXCLUDED.phone, amb_analytics_visitors.phone),
            consent_marketing = amb_analytics_visitors.consent_marketing OR EXCLUDED.consent_marketing
        `;
      }
      const rows = await sql`
        INSERT INTO amb_contacts (
          visitor_id, email, phone, market, source, email_consent, sms_consent,
          consented_at, first_order_code, metadata
        ) VALUES (
          ${visitorId || null}, ${email}, ${phone || null}, ${market}, ${source},
          ${emailConsent}, ${smsConsent}, ${consentedAt}, ${source === "welcome-popup" ? FIRST_ORDER_CODE : null},
          ${jsonForDatabase({ consentVersion: "2026-08-11-v2" })}::jsonb
        )
        ON CONFLICT (email) DO UPDATE SET
          visitor_id = COALESCE(EXCLUDED.visitor_id, amb_contacts.visitor_id),
          phone = COALESCE(EXCLUDED.phone, amb_contacts.phone), market = EXCLUDED.market,
          source = EXCLUDED.source, email_consent = amb_contacts.email_consent OR EXCLUDED.email_consent,
          sms_consent = amb_contacts.sms_consent OR EXCLUDED.sms_consent,
          consented_at = EXCLUDED.consented_at, unsubscribed_at = NULL,
          suppression_reason = NULL, updated_at = now()
        RETURNING id
      ` as Array<{ id: number | string }>;
      contactId = rows[0]?.id || null;
    } catch (error) {
      console.error("AMB contact persistence failed", { error: error instanceof Error ? error.message : "unknown" });
      return NextResponse.json({ error: "We could not save your preferences. Please try again." }, { status: 503 });
    }
  }

  let resendContactConnected = false;
  if (emailConsent) {
    try {
      resendContactConnected = await subscribeResendContact(email);
    } catch (error) {
      console.error("AMB Resend contact sync failed", { error: error instanceof Error ? error.message : "unknown" });
      return NextResponse.json({ error: "We could not add that email. Please try again." }, { status: 502 });
    }
  }

  if (process.env.MARKETING_CAPTURE_WEBHOOK_URL) {
    const response = await fetch(process.env.MARKETING_CAPTURE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.MARKETING_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.MARKETING_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ email, phone: phone || undefined, emailConsent, smsConsent, market, visitorId, source, consentedAt }),
    });
    if (!response.ok) return NextResponse.json({ error: "We could not save your preferences. Please try again." }, { status: 502 });
  }

  const emailResult = emailConsent
    ? await sendAmbEmail({ campaign: source === "welcome-popup" ? "welcome-discount" : "welcome-newsletter", to: email, contactId })
        .catch((error) => {
          console.error("AMB welcome email failed", { error: error instanceof Error ? error.message : "unknown" });
          return { sent: false, preview: true };
        })
    : { sent: false, preview: true };

  return NextResponse.json({
    ok: true,
    code: FIRST_ORDER_CODE,
    preview: !resendContactConnected || !emailResult.sent,
  });
}
