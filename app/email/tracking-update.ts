import "server-only";

import { Resend } from "resend";
import { ambResendApiKey, ambResendFromEmail } from "./resend-config";
import { createPublicTrackingToken, type AmbTrackingSnapshot } from "../fulfillment-tracking";
import { emailProductGrid } from "./template";
import { formatTrackingInstant, marketTimeZone, trackingEventIso } from "../tracking-time";
import { buildTrackingView } from "../tracking-view";

// The tracking e-mail repeats the /track-order page block by block (items,
// status, progress, journey) from the same view, and its button opens that
// page already signed in to this order: the customer never types anything.

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function siteUrl(path: string) {
  if (/^https:\/\//.test(path)) return path;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.ambboutique.online").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function copyForPhase(phase: string) {
  if (phase === "DELIVERED") {
    return {
      subject: "Your AMB order has been delivered",
      intro: "your order has been delivered. We hope you love your AMB piece.",
    };
  }
  if (phase === "OUT_FOR_DELIVERY") {
    return {
      subject: "Your AMB order is arriving soon",
      intro: "your order is out for delivery and may arrive today.",
    };
  }
  if (phase === "CUSTOMS") {
    return {
      subject: "A delivery update for your AMB order",
      intro: "your order has a new customs update.",
    };
  }
  if (phase === "SHIPPED") {
    return {
      subject: "Your AMB order has shipped",
      intro: "your order has shipped.",
    };
  }
  if (phase === "IN_TRANSIT") {
    return {
      subject: "Your AMB order is on the way",
      intro: "your order is on the way.",
    };
  }
  return {
    subject: "Your AMB order has a new delivery update",
    intro: "your order has a new delivery update.",
  };
}

const CARD = `bgcolor="#fffefc" style="background-color:#fffefc;border:1px solid #dfd5ca"`;
const SPACER = `<tr><td height="20" style="height:20px;line-height:20px;font-size:0">&nbsp;</td></tr>`;

export function renderAmbTrackingUpdateEmail(input: {
  to: string;
  firstName?: string | null;
  market?: string | null;
  snapshot: AmbTrackingSnapshot;
}) {
  const view = buildTrackingView(input.snapshot);
  const copy = copyForPhase(view.phase);
  const token = createPublicTrackingToken(input.snapshot.session_id, input.to);
  const trackingUrl = siteUrl(token ? `/track-order?token=${encodeURIComponent(token)}` : "/track-order");
  const timeZone = marketTimeZone(input.market);
  const when = (value: string | null | undefined) => {
    const iso = trackingEventIso(value);
    return iso ? formatTrackingInstant(iso, { timeZone, showZone: true }) : value || "";
  };
  const firstName = input.firstName?.trim();
  const intro = `${firstName ? `Hi ${firstName}, ` : "Hello, "}${copy.intro} This is exactly what your live tracking page shows right now.`;
  const estimatedDelivery = view.estimatedDelivery
    ? formatTrackingInstant(view.estimatedDelivery, { timeZone, dateOnly: true })
    : "";
  const latestWhen = view.latestEvent ? when(view.latestEvent.eventDate) : "";

  const itemsHtml = view.items.length ? `
    <tr><td ${CARD}>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px">
        <div style="font-size:12px;letter-spacing:.14em;font-weight:700;margin:0 0 20px">ITEMS IN YOUR ORDER</div>
        ${view.items.map((item) => `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:12px"><tr>
          <td width="108" valign="middle" bgcolor="#f5efe5" style="width:108px;background-color:#f5efe5">
            ${item.image
              ? `<img src="${escapeHtml(siteUrl(item.image))}" width="108" height="135" alt="${escapeHtml(item.name)}" style="display:block;width:108px;height:135px;border:0;object-fit:contain">`
              : `<div style="width:108px;height:135px;line-height:135px;text-align:center;font-size:11px;color:#796d63">Image unavailable</div>`}
          </td>
          <td valign="middle" style="padding-left:18px;font-size:14px;line-height:1.8;color:#171512">
            <strong style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700">${escapeHtml(item.name)}</strong>
            ${item.color ? `<div>Color: ${escapeHtml(item.color)}</div>` : ""}
            ${item.size ? `<div>Size: ${escapeHtml(item.size)}</div>` : ""}
            <div>Quantity: ${item.quantity}</div>
          </td>
        </tr></table>`).join("")}
      </td></tr></table>
    </td></tr>${SPACER}` : "";

  const statusHtml = `
    <tr><td ${CARD}>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:30px">
        <div style="font-size:11px;letter-spacing:.16em;font-weight:700;color:#9a755c">${escapeHtml(view.statusLabel)}</div>
        <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:500;margin:10px 0 12px;color:#171512">${escapeHtml(view.headline)}</h2>
        ${view.latestDetail || latestWhen ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3a35">${escapeHtml(view.latestDetail)}${view.latestDetail && latestWhen ? " · " : ""}${latestWhen ? `<span style="color:#756d65;font-size:13px">${escapeHtml(latestWhen)}</span>` : ""}</p>` : ""}
        ${estimatedDelivery ? `<p style="margin:0 0 16px;font-size:14px;color:#171512">Estimated delivery: <strong>by ${escapeHtml(estimatedDelivery)}</strong></p>` : ""}
        <div style="font-size:13px;line-height:1.9;color:#5c554e">
          Order reference: <strong>${escapeHtml(view.orderReference)}</strong><br>
          ${view.trackingCode ? `Tracking code: <strong>${escapeHtml(view.trackingCode)}</strong><br>` : ""}
          Delivery service: <strong>${escapeHtml(view.deliveryService)}</strong>
        </div>
      </td></tr></table>
    </td></tr>${SPACER}`;

  const progressHtml = `
    <tr><td ${CARD}>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 30px">
        <div style="font-size:11px;letter-spacing:.15em;font-weight:700;margin-bottom:20px">DELIVERY PROGRESS</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
          ${view.progress.map((step, index) => `
          <td width="25%" valign="top" style="width:25%;${index ? "padding-left:8px;" : ""}">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
              <td height="5" bgcolor="${step.reached ? "#9a755c" : "#e8dfd5"}" style="height:5px;line-height:5px;font-size:0;background-color:${step.reached ? "#9a755c" : "#e8dfd5"};border-radius:8px">&nbsp;</td>
            </tr></table>
            <div style="margin-top:10px;font-size:11px;color:${step.reached ? "#171512" : "#867e75"};font-weight:${step.reached ? 700 : 400}">${escapeHtml(step.label)}</div>
          </td>`).join("")}
        </tr></table>
        ${view.trackingCode ? `<p style="margin:18px 0 0;font-size:12px;color:#5c554e">Tracking number: <strong>${escapeHtml(view.trackingCode)}</strong></p>` : ""}
      </td></tr></table>
    </td></tr>${SPACER}`;

  const journeyHtml = `
    <tr><td ${CARD}>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:30px">
        <div style="font-size:11px;letter-spacing:.16em;font-weight:700;margin-bottom:18px">DELIVERY JOURNEY</div>
        ${view.events.length ? view.events.map((event, index) => `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"${index ? ` style="border-top:1px solid #e7dfd6"` : ""}><tr>
          <td width="22" valign="top" style="width:22px;padding:21px 0 16px">
            <table role="presentation" cellspacing="0" cellpadding="0"><tr><td width="10" height="10" bgcolor="${index === 0 ? "#9a755c" : "#d5c9bb"}" style="width:10px;height:10px;line-height:10px;font-size:0;background-color:${index === 0 ? "#9a755c" : "#d5c9bb"};border-radius:50%">&nbsp;</td></tr></table>
          </td>
          <td valign="top" style="padding:16px 0">
            ${event.status && event.status !== event.eventDesc ? `<div style="font-size:10px;letter-spacing:.12em;font-weight:700;color:#9a755c;margin-bottom:4px;text-transform:uppercase">${escapeHtml(event.status)}</div>` : ""}
            <div style="font-size:14px;font-weight:700;line-height:1.45;color:#171512">${escapeHtml(event.eventDesc || event.status || "Delivery update")}</div>
            ${event.address ? `<div style="margin-top:5px;color:#5c554e;font-size:13px">${escapeHtml(event.address)}</div>` : ""}
            ${event.eventDate ? `<div style="margin-top:5px;color:#827a72;font-size:12px">${escapeHtml(when(event.eventDate))}</div>` : ""}
          </td>
        </tr></table>`).join("") : `<p style="margin:0;line-height:1.7;color:#5c554e">Tracking events are not available from the delivery network right now. Your purchase is confirmed, but we cannot verify its current shipping stage yet.</p>`}
      </td></tr></table>
    </td></tr>${SPACER}`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5efe5;color:#171512;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(`${view.headline}${view.latestDetail ? ` · ${view.latestDetail}` : ""}${estimatedDelivery ? ` · Estimated delivery by ${estimatedDelivery}` : ""}`)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f5efe5" style="width:100%;background-color:#f5efe5">
    <tr><td align="center" style="padding:32px 12px 44px">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px">
        <tr><td align="center" style="padding:6px 0 28px;border-bottom:1px solid #dfd5ca">
          <a href="${escapeHtml(siteUrl("/"))}" style="color:#171512;text-decoration:none">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:.16em;font-weight:600">AMB BOUTIQUE</div>
          </a>
        </td></tr>
        <tr><td style="padding:34px 0 28px">
          <p style="font-size:11px;letter-spacing:.18em;font-weight:700;color:#9a755c;margin:0">AMB BOUTIQUE DELIVERY</p>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:44px;line-height:1.08;font-weight:500;margin:12px 0 12px;color:#171512">Track your order</h1>
          <p style="line-height:1.7;color:#5c554e;margin:0 0 24px;font-size:15px">${escapeHtml(intro)}</p>
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td bgcolor="#171512" style="background-color:#171512"><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:15px 24px;font-size:12px;letter-spacing:.08em;font-weight:700">VIEW LIVE TRACKING</a></td>
          </tr></table>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${itemsHtml}${statusHtml}${progressHtml}${journeyHtml}
          </table>
        </td></tr>
        <tr><td style="padding:4px 0 30px">
          <p style="font-size:12px;line-height:1.7;color:#6b655e;margin:0 0 22px">We monitor active AMB deliveries automatically and update your tracking page when new information becomes available. The button below always opens your order, no login or order number needed.</p>
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td bgcolor="#171512" style="background-color:#171512"><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:15px 24px;font-size:12px;letter-spacing:.08em;font-weight:700">TRACK MY ORDER</a></td>
          </tr></table>
        </td></tr>
        <tr><td bgcolor="#fffdfa" style="background-color:#fffdfa;border:1px solid #dfd5ca">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${emailProductGrid("order-shipped", { eyebrow: view.phase === "DELIVERED" ? "YOUR NEXT FAVORITE" : "WHILE YOU WAIT", headline: view.phase === "DELIVERED" ? "Pieces to wear with your new favorite" : "A few pieces we think you’ll love" })}
          </table>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;font-size:11px;line-height:1.7;color:#6b655e">
          AMB BOUTIQUE · Customer Care<br>
          <a href="mailto:info@ambboutique.online" style="color:#171512">info@ambboutique.online</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    "AMB BOUTIQUE DELIVERY",
    "Track your order",
    intro,
    "",
    ...(view.items.length ? ["ITEMS IN YOUR ORDER", ...view.items.map((item) =>
      [item.name, item.color ? `Color: ${item.color}` : "", item.size ? `Size: ${item.size}` : "", `Quantity: ${item.quantity}`]
        .filter(Boolean).join(" · ")), ""] : []),
    view.statusLabel,
    view.headline,
    [view.latestDetail, latestWhen].filter(Boolean).join(" · "),
    estimatedDelivery ? `Estimated delivery: by ${estimatedDelivery}` : "",
    `Order reference: ${view.orderReference}`,
    view.trackingCode ? `Tracking code: ${view.trackingCode}` : "",
    `Delivery service: ${view.deliveryService}`,
    "",
    `DELIVERY PROGRESS: ${view.progress.map((step) => `${step.reached ? "[x]" : "[ ]"} ${step.label}`).join("  ")}`,
    "",
    "DELIVERY JOURNEY",
    ...view.events.map((event) => `- ${[event.status !== event.eventDesc ? event.status : "", event.eventDesc, event.address, when(event.eventDate)].filter(Boolean).join(" · ")}`),
    "",
    `View live tracking: ${trackingUrl}`,
    "",
    "AMB BOUTIQUE · Customer Care · info@ambboutique.online",
  ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n");

  return { subject: copy.subject, html, text, trackingUrl, view };
}

export async function sendAmbTrackingUpdateEmail(input: {
  to: string;
  firstName?: string | null;
  market?: string | null;
  snapshot: AmbTrackingSnapshot;
}) {
  const apiKey = ambResendApiKey();
  if (!apiKey) throw new Error("AMB Resend is not configured.");
  const resend = new Resend(apiKey);
  const email = renderAmbTrackingUpdateEmail(input);

  const result = await resend.emails.send({
    from: ambResendFromEmail(),
    to: [input.to],
    replyTo: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@ambboutique.online",
    subject: email.subject,
    html: email.html,
    text: email.text,
    tags: [
      { name: "campaign", value: "order-tracking-update" },
      { name: "type", value: "lifecycle" },
    ],
  });
  if (result.error || !result.data?.id) {
    throw new Error(result.error?.message || "Email provider did not accept tracking update.");
  }
  return { id: result.data.id, subject: email.subject, trackingUrl: email.trackingUrl };
}
