import { FIRST_ORDER_CODE } from "../commerce";
import type { AmbCampaign } from "./campaigns";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character] || character));

export function absoluteUrl(path: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://ambboutique.online").replace(/\/$/, "");
  return path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function trackedUrl(path: string, campaignKey: string, content: string) {
  const url = new URL(absoluteUrl(path));
  url.searchParams.set("utm_source", "resend");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campaignKey);
  url.searchParams.set("utm_content", content);
  return url.toString();
}

function emailFooter(campaignKey: string, unsubscribeUrl: string) {
  const links = [
    ["SHOP", "/collections", "footer-shop"],
    ["OUR STORY", "/about", "footer-story"],
    ["SHIPPING", "/shipping", "footer-shipping"],
    ["RETURNS", "/returns", "footer-returns"],
    ["CONTACT", "/contact", "footer-contact"],
  ];

  return `<tr><td style="padding:34px 42px 26px;background:#171411;color:#fffdfa;text-align:center">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:27px;letter-spacing:.22em;font-weight:700">AMB</div>
    <div style="font-size:8px;letter-spacing:.42em;margin-top:4px">BOUTIQUE</div>
    <p style="margin:20px 0 18px;font-size:11px;line-height:2.1;letter-spacing:.08em">
      ${links.map(([label, path, content]) => `<a href="${escapeHtml(trackedUrl(path, campaignKey, content))}" style="color:#fffdfa;text-decoration:none;white-space:nowrap;margin:0 8px">${label}</a>`).join("")}
    </p>
    <p style="margin:0;color:#cfc5bb;font-size:11px;line-height:1.8">AMB BOUTIQUE · San Diego, California<br><a href="mailto:info@ambboutique.online" style="color:#fffdfa">info@ambboutique.online</a></p>
    <p style="margin:18px 0 0;color:#a99f96;font-size:10px;line-height:1.7">You received this because you subscribed, requested an offer or started an AMB order.<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#fffdfa;text-decoration:underline">Unsubscribe</a> · <a href="${escapeHtml(trackedUrl("/privacy", campaignKey, "footer-privacy"))}" style="color:#fffdfa">Privacy</a> · <a href="${escapeHtml(trackedUrl("/terms", campaignKey, "footer-terms"))}" style="color:#fffdfa">Terms</a></p>
  </td></tr>`;
}

function productCard(product: {
  slug: string;
  name: string;
  price: string;
  image: string;
  label: string;
}, campaignKey: string) {
  const productUrl = trackedUrl(`/products/${product.slug}`, campaignKey, `product-${product.slug}`);
  return `<td class="mobile-product" width="50%" valign="top" style="width:50%;padding:0 7px 24px">
    <a href="${escapeHtml(productUrl)}" style="text-decoration:none;color:#171411">
      <img src="${escapeHtml(absoluteUrl(product.image))}" width="300" alt="${escapeHtml(product.name)}" style="display:block;width:100%;height:auto;border:0;background:#f4eee4">
      <p style="margin:14px 0 4px;color:#a16845;font-size:9px;font-weight:700;letter-spacing:.17em">${escapeHtml(product.label)}</p>
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.3">${escapeHtml(product.name)}</p>
      <p style="margin:7px 0 0;color:#6d6259;font-size:12px">${escapeHtml(product.price)}</p>
    </a>
  </td>`;
}

function renderWelcomeDiscountEmail(options: {
  greeting: string;
  unsubscribeUrl: string;
}) {
  const campaignKey = "welcome-discount";
  const shopUrl = trackedUrl("/collections", campaignKey, "hero-shop");
  const storyUrl = trackedUrl("/about", campaignKey, "founder-story");
  const dressesUrl = trackedUrl("/collections/dresses", campaignKey, "style-formula-dresses");
  const products = [
    { slug: "brielle-satin-maxi-dress", name: "Brielle Satin Maxi Dress", price: "$118 USD", image: "/products/brielle-satin-maxi-dress/01.webp", label: "THE DRESS EDIT" },
    { slug: "cora-square-neck-top", name: "Cora Square-Neck Top", price: "$54 USD", image: "/products/cora-square-neck-top/01.webp", label: "THE TOPS EDIT" },
    { slug: "capri-utility-romper", name: "Capri Utility Romper", price: "$98 USD", image: "/products/capri-utility-romper/01.webp", label: "ONE-PIECE EASE" },
    { slug: "portofino-carryall-burgundy", name: "Portofino Carryall — Burgundy", price: "$79 USD", image: "/editorial/bags/products/portofino-carryall-burgundy/01.webp", label: "THE BAG EDIT" },
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <style>
    @media only screen and (max-width:620px) {
      .email-shell { width:100% !important; }
      .mobile-pad { padding-left:24px !important; padding-right:24px !important; }
      .mobile-title { font-size:36px !important; line-height:1.08 !important; }
      .mobile-product { display:block !important; width:100% !important; box-sizing:border-box !important; padding-left:0 !important; padding-right:0 !important; }
      .mobile-stack { display:block !important; width:100% !important; box-sizing:border-box !important; }
      .mobile-stack-pad { padding:28px 24px !important; }
      .mobile-nav a { display:inline-block !important; margin:4px 7px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eee6db;color:#171411;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your private 10% welcome code and a considered introduction to AMB BOUTIQUE.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#eee6db">
    <tr><td align="center" style="padding:24px 10px">
      <table class="email-shell" role="presentation" width="720" cellspacing="0" cellpadding="0" style="width:100%;max-width:720px;background:#fffdfa;border:1px solid #ddd2c4">
        <tr><td align="center" style="padding:27px 20px 22px;border-bottom:1px solid #e7ded2">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:31px;letter-spacing:.22em;font-weight:700">AMB</div>
          <div style="font-size:8px;letter-spacing:.42em;margin-top:4px">BOUTIQUE</div>
          <p class="mobile-nav" style="margin:18px 0 0;font-size:10px;letter-spacing:.13em">
            <a href="${escapeHtml(trackedUrl("/collections/dresses", campaignKey, "nav-dresses"))}" style="color:#171411;text-decoration:none;margin:0 12px">DRESSES</a>
            <a href="${escapeHtml(trackedUrl("/collections/tops-blouses", campaignKey, "nav-tops"))}" style="color:#171411;text-decoration:none;margin:0 12px">TOPS</a>
            <a href="${escapeHtml(trackedUrl("/collections/bags", campaignKey, "nav-bags"))}" style="color:#171411;text-decoration:none;margin:0 12px">BAGS</a>
            <a href="${escapeHtml(trackedUrl("/collections/heels", campaignKey, "nav-heels"))}" style="color:#171411;text-decoration:none;margin:0 12px">HEELS</a>
          </p>
        </td></tr>

        <tr><td>
          <a href="${escapeHtml(shopUrl)}"><img src="${escapeHtml(absoluteUrl("/images/amb-hero.webp"))}" width="720" alt="The AMB BOUTIQUE edit" style="display:block;width:100%;height:auto;border:0"></a>
        </td></tr>

        <tr><td class="mobile-pad" align="center" style="padding:46px 58px 42px">
          <p style="margin:0 0 22px;color:#4c443e;font-size:14px">${options.greeting}</p>
          <p style="margin:0 0 13px;color:#a16845;font-size:10px;letter-spacing:.23em;font-weight:700">A PRIVATE WELCOME</p>
          <h1 class="mobile-title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:48px;line-height:1.06;font-weight:500;letter-spacing:-.025em">Welcome to a more considered way to get dressed.</h1>
          <p style="margin:23px auto 0;max-width:550px;color:#554d46;font-size:16px;line-height:1.75">Not endless choice. A sharper edit of feminine pieces chosen to make getting dressed easier—from an ordinary morning to the plans worth remembering.</p>
        </td></tr>

        <tr><td class="mobile-pad" align="center" style="padding:0 58px 46px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4eee4;border:1px solid #ded2c3">
            <tr><td align="center" style="padding:27px 20px">
              <p style="margin:0;color:#8e5e40;font-size:9px;letter-spacing:.22em;font-weight:700">10% OFF YOUR FIRST ELIGIBLE FULL-PRICE ORDER</p>
              <p style="margin:13px 0 5px;font-family:Georgia,'Times New Roman',serif;font-size:31px;letter-spacing:.08em">${FIRST_ORDER_CODE}</p>
              <p style="margin:0;color:#6d6259;font-size:11px;line-height:1.6">Enter the code at checkout. The best eligible discount applies; offers do not stack.</p>
            </td></tr>
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:25px auto 0"><tr><td bgcolor="#171411" style="background:#171411"><a href="${escapeHtml(shopUrl)}" style="display:inline-block;color:#fff;text-decoration:none;padding:17px 31px;font-size:11px;font-weight:700;letter-spacing:.15em">EXPLORE THE AMB EDIT</a></td></tr></table>
        </td></tr>

        <tr><td style="border-top:1px solid #e7ded2;border-bottom:1px solid #e7ded2;background:#faf7f2;padding:17px 20px;text-align:center;color:#5d544d;font-size:10px;line-height:1.8;letter-spacing:.05em">SECURE CHECKOUT BY STRIPE &nbsp;·&nbsp; 30-DAY RETURN REQUESTS &nbsp;·&nbsp; REAL HUMAN SUPPORT</td></tr>

        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td class="mobile-stack" width="50%" valign="middle"><a href="${escapeHtml(storyUrl)}"><img src="${escapeHtml(absoluteUrl("/images/newsletter-editorial.webp"))}" width="360" alt="The considered AMB point of view" style="display:block;width:100%;height:auto;border:0"></a></td>
              <td class="mobile-stack mobile-stack-pad" width="50%" valign="middle" style="padding:34px 36px;background:#f4eee4">
                <p style="margin:0 0 11px;color:#a16845;font-size:9px;letter-spacing:.2em;font-weight:700">FROM SAN DIEGO, WITH INTENTION</p>
                <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:1.14;font-weight:500">A boutique built for real life—not just the photograph.</h2>
                <p style="margin:17px 0;color:#554d46;font-size:13px;line-height:1.75">Ana Paula Maciel founded AMB around a simple belief: a beautiful piece should earn its place. It should work more than once, style more than one way and still feel unmistakably like you.</p>
                <a href="${escapeHtml(storyUrl)}" style="color:#171411;font-size:10px;font-weight:700;letter-spacing:.13em;text-decoration:underline">READ THE AMB STORY</a>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:48px 42px 26px">
          <p style="margin:0 0 10px;text-align:center;color:#a16845;font-size:10px;letter-spacing:.22em;font-weight:700">BEGIN WITH WHAT YOUR WARDROBE NEEDS</p>
          <h2 style="margin:0 0 28px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:35px;line-height:1.15;font-weight:500">Four pieces. Four easy ways in.</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>${productCard(products[0], campaignKey)}${productCard(products[1], campaignKey)}</tr>
            <tr>${productCard(products[2], campaignKey)}${productCard(products[3], campaignKey)}</tr>
          </table>
        </td></tr>

        <tr><td><a href="${escapeHtml(dressesUrl)}"><img src="${escapeHtml(absoluteUrl("/images/category-editorial-two.webp"))}" width="720" alt="Tops, knitwear, bags and heels from the AMB edit" style="display:block;width:100%;height:auto;border:0"></a></td></tr>
        <tr><td class="mobile-pad" align="center" style="padding:42px 58px 46px;background:#f4eee4">
          <p style="margin:0 0 10px;color:#a16845;font-size:10px;letter-spacing:.22em;font-weight:700">THE AMB THREE-PIECE FORMULA</p>
          <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.15;font-weight:500">One silhouette. One structured finish. One shoe that changes the mood.</h2>
          <p style="margin:20px auto 0;max-width:540px;color:#554d46;font-size:14px;line-height:1.75">Start with the piece that solves the outfit. Add a bag that gives it structure. Finish with the heel that decides whether the look feels relaxed, polished or ready for after dark.</p>
          <a href="${escapeHtml(dressesUrl)}" style="display:inline-block;margin-top:23px;color:#171411;font-size:10px;font-weight:700;letter-spacing:.14em;text-decoration:underline">START WITH THE DRESS EDIT</a>
        </td></tr>

        <tr><td class="mobile-pad" align="center" style="padding:46px 58px;background:#fffdfa">
          <p style="margin:0 0 10px;color:#a16845;font-size:10px;letter-spacing:.22em;font-weight:700">YOUR PRIVATE WELCOME IS READY</p>
          <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.15;font-weight:500">Choose the piece you will want to wear again.</h2>
          <p style="margin:18px 0 0;color:#554d46;font-size:14px;line-height:1.7">Use <strong>${FIRST_ORDER_CODE}</strong> for 10% off your first eligible full-price order.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:25px auto 0"><tr><td bgcolor="#171411" style="background:#171411"><a href="${escapeHtml(trackedUrl("/collections", campaignKey, "final-shop"))}" style="display:inline-block;color:#fff;text-decoration:none;padding:17px 31px;font-size:11px;font-weight:700;letter-spacing:.15em">SHOP THE EDIT</a></td></tr></table>
          <p style="margin:18px 0 0;color:#796f67;font-size:11px">Questions about fit or delivery? Reply to this email and our team will help.</p>
        </td></tr>

        ${emailFooter(campaignKey, options.unsubscribeUrl)}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function renderAmbEmail(campaign: AmbCampaign, options: {
  firstName?: string;
  recoveryUrl?: string;
  unsubscribeUrl?: string;
  orderReference?: string;
} = {}) {
  const firstName = options.firstName?.trim();
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";
  const unsubscribeUrl = options.unsubscribeUrl || absoluteUrl("/unsubscribe");

  if (campaign.key === "welcome-discount") {
    return renderWelcomeDiscountEmail({ greeting, unsubscribeUrl });
  }

  const ctaUrl = trackedUrl(options.recoveryUrl || campaign.ctaUrl, campaign.key, "primary-cta");
  const reference = options.orderReference
    ? `<p style="margin:20px 0 0;color:#6d6259;font-size:12px;letter-spacing:.08em">ORDER ${escapeHtml(options.orderReference)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"></head>
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
        ${emailFooter(campaign.key, unsubscribeUrl)}
      </table>
    </td></tr>
  </table>
</body></html>`;
}
