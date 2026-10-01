import "server-only";

export function ambResendApiKey() {
  return process.env.AMB_RESEND_API_KEY?.trim() || "";
}

export function ambResendFromEmail() {
  return process.env.AMB_RESEND_FROM_EMAIL?.trim() || "AMB BOUTIQUE <orders@ambboutique.online>";
}

export function ambResendWebhookSecret() {
  return process.env.AMB_RESEND_WEBHOOK_SECRET?.trim() || "";
}

export function ambResendSegmentId() {
  return process.env.AMB_RESEND_SEGMENT_ID?.trim() || "";
}
