import { NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, string> | null;
  if (!body || !body.firstName?.trim() || !emailPattern.test(body.email || "") || !body.message?.trim()) return NextResponse.json({ error: "Please complete your name, email and message." }, { status: 400 });
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return NextResponse.json({ error: "The contact form is prepared but email delivery will be activated before launch. For now, email info@ambboutique.online." }, { status: 503 });
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: ["info@ambboutique.online"], reply_to: body.email, subject: `[AMB BOUTIQUE] ${body.topic || "Customer message"}${body.orderNumber ? ` · ${body.orderNumber}` : ""}`, text: `From: ${body.firstName} ${body.lastName || ""}\nEmail: ${body.email}\nOrder: ${body.orderNumber || "Not provided"}\n\n${body.message}` }) });
  if (!response.ok) return NextResponse.json({ error: "We could not send that message. Please email info@ambboutique.online." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
