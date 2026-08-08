import { NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  if (!body?.email || !emailPattern.test(body.email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_AUDIENCE_ID) return NextResponse.json({ error: "The AMB list is prepared and will open before launch." }, { status: 503 });
  const response = await fetch(`https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: body.email, unsubscribed: false }) });
  if (!response.ok) return NextResponse.json({ error: "We could not add that email. Please try again." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
