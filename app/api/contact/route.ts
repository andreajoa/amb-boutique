import { NextResponse } from "next/server";
import { ambResendApiKey, ambResendFromEmail } from "../../email/resend-config";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, string> | null;
  if (!body || !body.firstName?.trim() || !emailPattern.test(body.email || "") || !body.message?.trim()) return NextResponse.json({ error: "Please complete your name, email and message." }, { status: 400 });
  const apiKey = ambResendApiKey();
  const from = ambResendFromEmail();
  if (!apiKey) return NextResponse.json({ error: "Email delivery is being configured. For now, email info@ambboutique.online." }, { status: 503 });
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: ["info@ambboutique.online"], reply_to: body.email, subject: `[AMB BOUTIQUE] ${body.topic || "Customer message"}${body.orderNumber ? ` · ${body.orderNumber}` : ""}`, text: `From: ${body.firstName} ${body.lastName || ""}\nEmail: ${body.email}\nOrder: ${body.orderNumber || "Not provided"}\n\n${body.message}` }) });
  if (!response.ok) return NextResponse.json({ error: "We could not send that message. Please email info@ambboutique.online." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
