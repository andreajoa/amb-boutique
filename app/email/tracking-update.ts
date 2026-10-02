import "server-only";

import { Resend } from "resend";
import { ambResendApiKey, ambResendFromEmail } from "./resend-config";
import { createPublicTrackingToken, type AmbTrackingEvent } from "../fulfillment-tracking";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function siteUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.ambboutique.online").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function copyForPhase(phase: string) {
  if (phase === "DELIVERED") {
    return {
      subject: "Your AMB order has been delivered",
      eyebrow: "DELIVERED",
      headline: "Your AMB order has arrived.",
      body: "Your delivery is marked as complete. We hope you love your AMB piece.",
    };
  }
  if (phase === "OUT_FOR_DELIVERY") {
    return {
      subject: "Your AMB order is arriving soon",
      eyebrow: "OUT FOR DELIVERY",
      headline: "Your AMB order is on its final stretch.",
      body: "Your package is with the local delivery network and may arrive today. Please keep an eye on your delivery location.",
    };
  }
  if (phase === "CUSTOMS") {
    return {
      subject: "A delivery update for your AMB order",
      eyebrow: "DELIVERY UPDATE",
      headline: "Your AMB order is moving through the delivery network.",
      body: "Your package has a new customs or clearance update. We’ll continue watching it for you and keep you informed.",
    };
  }
  return {
    subject: "Your AMB order has a new delivery update",
    eyebrow: "ORDER IN TRANSIT",
    headline: "Your AMB order is moving closer to you.",
    body: "We’re following your delivery and will continue to update you as it moves through the network.",
  };
}

export async function sendAmbTrackingUpdateEmail(input: {
  to: string;
  firstName?: string | null;
  sessionId: string;
  phase: string;
  trackingCode: string | null;
  latestEvent: AmbTrackingEvent | null;
  timeline: AmbTrackingEvent[];
}) {
  const apiKey = ambResendApiKey();
  if (!apiKey) throw new Error("AMB Resend is not configured.");
  const resend = new Resend(apiKey);
  const copy = copyForPhase(input.phase);
  const token = createPublicTrackingToken(input.sessionId, input.to);
  const trackingPath = token
    ? `/track-order?token=${encodeURIComponent(token)}`
    : "/track-order";
  const trackingUrl = siteUrl(trackingPath);
  const firstName = input.firstName?.trim();
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";
  const orderReference = input.sessionId.slice(-10).toUpperCase();

  const latest = input.latestEvent;
  const latestDescription = latest?.eventDesc || latest?.status || "Your order has a new delivery update.";
  const latestLocation = latest?.address || "";
  const latestDate = latest?.eventDate || "";

  const recent = input.timeline.slice(-4).reverse();
  const timelineHtml = recent.length
    ? recent.map((event) => `
      <tr>
        <td style="padding:12px 0;border-top:1px solid #e7dfd6;vertical-align:top">
          <div style="font-size:12px;font-weight:700;color:#171512">${escapeHtml(event.eventDesc || event.status || "Delivery update")}</div>
          ${event.address ? `<div style="margin-top:4px;font-size:12px;color:#6b655e">${escapeHtml(event.address)}</div>` : ""}
          ${event.eventDate ? `<div style="margin-top:4px;font-size:11px;color:#8b8279">${escapeHtml(event.eventDate)}</div>` : ""}
        </td>
      </tr>`).join("")
    : "";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5efe5;color:#171512;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(copy.headline)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5efe5;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffefc;border:1px solid #e7dac8">
        <tr><td style="padding:34px 38px 24px;text-align:center;border-bottom:1px solid #e7dac8">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:.16em;font-weight:600">AMB BOUTIQUE</div>
          <div style="margin-top:8px;font-size:9px;letter-spacing:.28em;color:#6b655e">DELIVERY UPDATE</div>
        </td></tr>
        <tr><td style="padding:40px 38px">
          <div style="font-size:11px;letter-spacing:.16em;font-weight:700;color:#aa8063">${escapeHtml(copy.eyebrow)}</div>
          <h1 style="margin:12px 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.08;font-weight:500">${escapeHtml(copy.headline)}</h1>
          <p style="margin:0 0 10px;font-size:14px;line-height:1.7">${greeting}</p>
          <p style="margin:0 0 26px;font-size:14px;line-height:1.75;color:#4e4943">${escapeHtml(copy.body)}</p>

          <div style="background:#f5efe5;padding:22px 24px;margin-bottom:24px">
            <div style="font-size:10px;letter-spacing:.14em;font-weight:700;margin-bottom:10px">LATEST UPDATE</div>
            <div style="font-size:15px;font-weight:700;line-height:1.45">${escapeHtml(latestDescription)}</div>
            ${latestLocation ? `<div style="margin-top:7px;font-size:13px;color:#575049">${escapeHtml(latestLocation)}</div>` : ""}
            ${latestDate ? `<div style="margin-top:5px;font-size:12px;color:#7b736b">${escapeHtml(latestDate)}</div>` : ""}
            ${input.trackingCode ? `<div style="margin-top:14px;font-size:11px;color:#6b655e">Tracking code: <strong>${escapeHtml(input.trackingCode)}</strong></div>` : ""}
          </div>

          ${timelineHtml ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:26px">
            <tr><td style="padding-bottom:8px;font-size:10px;letter-spacing:.14em;font-weight:700">RECENT JOURNEY</td></tr>
            ${timelineHtml}
          </table>` : ""}

          <div style="text-align:center;margin:30px 0">
            <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#171512;color:#fff;text-decoration:none;padding:14px 24px;font-size:12px;letter-spacing:.08em;font-weight:700">TRACK MY AMB ORDER</a>
          </div>

          <p style="margin:0;font-size:12px;line-height:1.7;color:#6b655e">Order reference: ${escapeHtml(orderReference)}<br>We’ll continue monitoring your delivery and send another update when its status changes.</p>
        </td></tr>
        <tr><td style="padding:22px 38px;border-top:1px solid #e7dac8;text-align:center;font-size:11px;line-height:1.6;color:#6b655e">
          AMB BOUTIQUE · Customer Care<br>
          <a href="mailto:info@ambboutique.online" style="color:#171512">info@ambboutique.online</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const result = await resend.emails.send({
    from: ambResendFromEmail(),
    to: [input.to],
    replyTo: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@ambboutique.online",
    subject: copy.subject,
    html,
    tags: [
      { name: "campaign", value: "order-tracking-update" },
      { name: "type", value: "lifecycle" },
    ],
  });
  if (result.error || !result.data?.id) {
    throw new Error(result.error?.message || "Email provider did not accept tracking update.");
  }
  return { id: result.data.id, subject: copy.subject, trackingUrl };
}
