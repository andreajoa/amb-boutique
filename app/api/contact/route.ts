import { NextResponse } from "next/server";
import { ambResendApiKey, ambResendFromEmail } from "../../email/resend-config";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, string> | null;

  if (!body || !body.firstName?.trim() || !emailPattern.test(body.email || "") || !body.message?.trim()) {
    return NextResponse.json(
      { error: "Please complete your name, email and message." },
      { status: 400 },
    );
  }

  const apiKey = ambResendApiKey();
  const from = ambResendFromEmail();

  if (!apiKey) {
    return NextResponse.json(
      { error: "We couldn’t send your message right now. Please try again in a few minutes." },
      { status: 503 },
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [process.env.AMB_CONTACT_TO_EMAIL?.trim() || "andremuseu@gmail.com"],
      reply_to: body.email,
      subject: `[AMB BOUTIQUE] ${body.topic || "Customer message"}${body.orderNumber ? ` · ${body.orderNumber}` : ""}`,
      text: `From: ${body.firstName} ${body.lastName || ""}
Email: ${body.email}
Order: ${body.orderNumber || "Not provided"}

${body.message}`,
    }),
  });

  if (!response.ok) {
    const providerError = await response.text().catch(() => "");
    console.error("AMB contact email delivery failed", {
      status: response.status,
      providerError,
    });

    return NextResponse.json(
      { error: "We couldn’t send your message right now. Please try again in a few minutes." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
