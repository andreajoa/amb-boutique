import { NextResponse } from "next/server";
import { ambResendApiKey, ambResendFromEmail } from "../../email/resend-config";
import { deliverAmbEmail } from "../../email/transport";

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

  // Resend → Brevo → NovaMail quando o limite do provedor anterior acabar.
  let delivered = true;
  let providerError = "";
  try {
    await deliverAmbEmail({
      from,
      to: ["ambb.outique@proton.me"],
      replyTo: body.email,
      subject: `[AMB BOUTIQUE] ${body.topic || "Customer message"}${body.orderNumber ? ` · ${body.orderNumber}` : ""}`,
      text: `From: ${body.firstName} ${body.lastName || ""}
Email: ${body.email}
Order: ${body.orderNumber || "Not provided"}

${body.message}`,
    }, { followUp: false });
  } catch (error) {
    delivered = false;
    providerError = error instanceof Error ? error.message : String(error);
  }

  if (!delivered) {
    console.error("AMB contact email delivery failed", { providerError });

    return NextResponse.json(
      { error: "We couldn’t send your message right now. Please try again in a few minutes." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
