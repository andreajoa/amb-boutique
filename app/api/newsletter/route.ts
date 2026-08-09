import { NextResponse } from "next/server";
import { FIRST_ORDER_CODE, isMarketCode } from "../../commerce";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9()\- .]{7,22}$/;

type CaptureBody = { email?: string; phone?: string; emailConsent?: boolean; smsConsent?: boolean; market?: unknown; visitorId?: string; source?: string };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as CaptureBody | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const phone = body?.phone?.trim() || "";
  if (!email || !emailPattern.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (phone && !phonePattern.test(phone)) return NextResponse.json({ error: "Enter a valid mobile number with country code." }, { status: 400 });
  if (body?.source === "welcome-popup" && !body.emailConsent) return NextResponse.json({ error: "Email consent is required to deliver this welcome offer." }, { status: 400 });
  if (phone && !body?.smsConsent) return NextResponse.json({ error: "SMS consent is required when a mobile number is supplied." }, { status: 400 });

  const consentRecord = {
    email,
    phone: phone || undefined,
    emailConsent: Boolean(body?.emailConsent ?? true),
    smsConsent: Boolean(body?.smsConsent && phone),
    market: isMarketCode(body?.market) ? body.market : "US",
    visitorId: (body?.visitorId || "").slice(0, 100),
    source: (body?.source || "newsletter-form").slice(0, 50),
    consentedAt: new Date().toISOString(),
    consentVersion: "2026-08-08-v1",
  };

  let connected = false;
  if (process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID && consentRecord.emailConsent) {
    const response = await fetch(`https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, unsubscribed: false }),
    });
    if (!response.ok) return NextResponse.json({ error: "We could not add that email. Please try again." }, { status: 502 });
    connected = true;
  }

  if (process.env.MARKETING_CAPTURE_WEBHOOK_URL) {
    const response = await fetch(process.env.MARKETING_CAPTURE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.MARKETING_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.MARKETING_WEBHOOK_SECRET}` } : {}) },
      body: JSON.stringify(consentRecord),
    });
    if (!response.ok) return NextResponse.json({ error: "We could not save your preferences. Please try again." }, { status: 502 });
    connected = true;
  }

  return NextResponse.json({ ok: true, code: FIRST_ORDER_CODE, preview: !connected });
}
