import type { AmbCampaign } from "./campaigns";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character] || character));

export function absoluteUrl(path: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://ambboutique.online").replace(/\/$/, "");
  return path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function renderAmbEmail(campaign: AmbCampaign, options: {
  firstName?: string;
  recoveryUrl?: string;
  unsubscribeUrl?: string;
  orderReference?: string;
} = {}) {
  const firstName = options.firstName?.trim();
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";
  const ctaUrl = absoluteUrl(options.recoveryUrl || campaign.ctaUrl);
  const unsubscribeUrl = options.unsubscribeUrl || absoluteUrl("/unsubscribe");
  const reference = options.orderReference
    ? `<p style="margin:20px 0 0;color:#6d6259;font-size:12px;letter-spacing:.08em">ORDER ${escapeHtml(options.orderReference)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4eee4;color:#171411;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(campaign.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4eee4">
    <tr><td align="center" style="padding:28px 14px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffdfa;border:1px solid #ddd2c4">
        <tr><td align="center" style="padding:30px 24px 24px;border-bottom:1px solid #e7ded2">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:.22em;font-weight:700">AMB</div>
          <div style="font-size:9px;letter-spacing:.42em;margin-top:4px">BOUTIQUE</div>
          <div style="font-size:10px;letter-spacing:.18em;color:#9b6847;margin-top:12px">SAN DIEGO, CALIFORNIA</div>
        </td></tr>
        <tr><td style="padding:44px 48px 12px">
          <p style="margin:0 0 28px;font-size:15px;color:#4c443e">${greeting}</p>
          <p style="margin:0 0 12px;color:#a16845;font-size:11px;letter-spacing:.2em;font-weight:700">${escapeHtml(campaign.eyebrow)}</p>
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.08;font-weight:500;letter-spacing:-.02em">${escapeHtml(campaign.headline)}</h1>
          ${reference}
        </td></tr>
        <tr><td style="padding:20px 48px 42px">
          <p style="margin:0 0 28px;color:#4c443e;font-size:16px;line-height:1.75">${escapeHtml(campaign.body)}</p>
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#171411;color:#fff;text-decoration:none;padding:16px 28px;font-size:12px;letter-spacing:.12em;text-transform:uppercase">${escapeHtml(campaign.ctaLabel)}</a>
        </td></tr>
        <tr><td style="padding:26px 48px;background:#f7f1e8;border-top:1px solid #e7ded2">
          <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:20px">A considered note from AMB</p>
          <p style="margin:0;color:#6d6259;font-size:13px;line-height:1.6">Useful style first. Clear offers second. Never pressure for the sake of a click.</p>
        </td></tr>
        <tr><td style="padding:28px 48px;color:#756c65;font-size:11px;line-height:1.7">
          <p style="margin:0">AMB BOUTIQUE · San Diego, California · info@ambboutique.online</p>
          <p style="margin:8px 0 0">You received this because you subscribed, requested an offer or started an AMB order. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#171411">Unsubscribe</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

