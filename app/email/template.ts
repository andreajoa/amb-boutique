import type { Product } from "../data";
import { products } from "../data";
import type { AmbCampaign } from "./campaigns";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character] || character));

export function absoluteUrl(path: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.ambboutique.online").replace(/\/$/, "");
  return path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export type AmbEmailProduct = Pick<Product, "slug" | "name" | "price" | "images" | "category" | "colorNames"> & {
  size?: string;
  quantity?: number;
};

type RenderOptions = {
  firstName?: string;
  recoveryUrl?: string;
  unsubscribeUrl?: string;
  orderReference?: string;
  currency?: string;
  products?: AmbEmailProduct[];
};

const campaignProductSlugs: Record<string, string[]> = {
  "welcome-newsletter": ["noemi-midi-dress", "maris-belted-romper", "siena-signature-satchel-kangaroo-brown", "selene-satin-maxi-dress", "colette-midi-dress", "florence-mini-backpack-apricot"],
  "welcome-discount": ["selene-satin-maxi-dress", "vesper-belted-romper", "florence-mini-backpack-apricot", "noemi-midi-dress", "siena-signature-satchel-kangaroo-brown", "maris-belted-romper"],
  "brand-01": ["noemi-midi-dress", "maris-belted-romper", "siena-signature-satchel-kangaroo-brown", "selene-satin-maxi-dress", "colette-midi-dress", "florence-mini-backpack-apricot"],
  "dress-04": ["noemi-midi-dress", "colette-midi-dress", "selene-satin-maxi-dress", "amara-midi-dress", "juliette-midi-dress", "aurelia-midi-dress"],
  "bags-06": ["siena-signature-satchel-kangaroo-brown", "portofino-carryall-black", "florence-mini-backpack-apricot", "celeste-chain-crossbody-black", "marina-structured-tote-brown", "avery-bow-satchel-pink"],
  "new-11": ["selene-satin-maxi-dress", "maris-belted-romper", "siena-signature-satchel-kangaroo-brown", "noemi-midi-dress", "colette-midi-dress", "florence-mini-backpack-apricot"],
  "private-29": ["noemi-midi-dress", "maris-belted-romper", "portofino-carryall-burgundy", "selene-satin-maxi-dress", "siena-signature-satchel-kangaroo-brown", "colette-midi-dress"],
};

const defaultEditorialSlugs = ["noemi-midi-dress", "maris-belted-romper", "siena-signature-satchel-kangaroo-brown", "selene-satin-maxi-dress", "colette-midi-dress", "florence-mini-backpack-apricot"];
const recoveryPreviewSlugs = ["vesper-belted-romper"];

function productBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

function emailProducts(campaign: AmbCampaign, provided?: AmbEmailProduct[]) {
  if (provided?.length) return provided.slice(0, 3);
  const slugs = campaign.type === "cart-recovery" || campaign.type === "checkout-recovery" || campaign.key === "payment-recovery"
    ? recoveryPreviewSlugs
    : campaignProductSlugs[campaign.key] || defaultEditorialSlugs;
  return slugs.map(productBySlug).filter((product): product is Product => Boolean(product)).slice(0, 6);
}

function trackedUrl(path: string, campaign: AmbCampaign, content: string) {
  const url = new URL(absoluteUrl(path));
  url.searchParams.set("utm_source", "amb_email");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campaign.key);
  url.searchParams.set("utm_content", content);
  return url.toString();
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function productImage(product: AmbEmailProduct) {
  return absoluteUrl(product.images?.[0] || "/images/newsletter-editorial.webp");
}

function renderProductGrid(items: AmbEmailProduct[], campaign: AmbCampaign, currency: string) {
  if (!items.length) return "";
  const rows: AmbEmailProduct[][] = [];
  for (let index = 0; index < items.length; index += 2) rows.push(items.slice(index, index + 2));

  return `<tr><td class="section-pad" style="padding:10px 36px 42px">
    <p style="margin:0 0 9px;color:#9f6847;font-size:10px;letter-spacing:.22em;font-weight:700;text-align:center">THE AMB EDIT</p>
    <h2 style="margin:0 0 25px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;font-weight:500;text-align:center">Pieces worth a closer look</h2>
    ${rows.map((row) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
      ${row.map((product) => {
        const href = trackedUrl(`/products/${product.slug}`, campaign, `product-${product.slug}`);
        return `<td class="product-col" width="50%" valign="top" style="padding:0 7px 28px">
          <a href="${escapeHtml(href)}" style="text-decoration:none;color:#171411">
            <img class="product-image" src="${escapeHtml(productImage(product))}" width="272" alt="${escapeHtml(product.name)}" style="display:block;width:100%;height:auto;background:#f3ede3;border:0">
            <p style="margin:14px 2px 4px;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.25;color:#171411">${escapeHtml(product.name)}</p>
            <p style="margin:0 2px;color:#6f655d;font-size:12px">${escapeHtml(formatMoney(product.price, currency))}</p>
            <p style="margin:9px 2px 0;color:#171411;font-size:10px;letter-spacing:.12em;text-transform:uppercase;text-decoration:underline">View piece</p>
          </a>
        </td>`;
      }).join("")}${row.length === 1 ? '<td class="product-col" width="50%"></td>' : ""}
    </tr></table>`).join("")}
  </td></tr>`;
}

function editorialCopy(campaign: AmbCampaign) {
  if (campaign.key === "dress-04") {
    return {
      heading: "One dress, many plans.",
      body: "The most useful dresses do more than make an entrance. They move easily through the day, feel considered without feeling overdone, and leave room for your own point of view.",
      left: "Soft structure",
      right: "Effortless movement",
      quote: "I look for pieces that feel special the first time you wear them—and remain useful long after the occasion has passed.",
    };
  }
  return {
    heading: "The San Diego state of mind.",
    body: "Warm light, clean lines and the confidence to keep things effortless. Our edit is built around pieces that feel polished without trying too hard—ready for work, weekends and everything in between.",
    left: "Polished ease",
    right: "Considered details",
    quote: "I created AMB to make getting dressed feel more inspiring and less complicated. Every edit should offer beauty, versatility and a clear reason to belong in your wardrobe.",
  };
}

function renderEditorialStory(items: AmbEmailProduct[], campaign: AmbCampaign) {
  const storyItems = items.slice(0, 2);
  if (!storyItems.length) return "";
  const copy = editorialCopy(campaign);

  return `<tr><td class="content-pad" style="padding:20px 48px 44px;background:#f4ede3">
    <p style="margin:0 0 11px;color:#9f6847;font-size:10px;letter-spacing:.22em;font-weight:700">THE JOURNAL</p>
    <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:1.13;font-weight:500">${escapeHtml(copy.heading)}</h2>
    <p style="margin:0 0 28px;color:#5f554d;font-size:14px;line-height:1.8">${escapeHtml(copy.body)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
      ${storyItems.map((product, index) => {
        const href = trackedUrl(`/products/${product.slug}`, campaign, `journal-${product.slug}`);
        const label = index === 0 ? copy.left : copy.right;
        return `<td class="story-col" width="50%" valign="top" style="padding:${index === 0 ? "0 7px 0 0" : "0 0 0 7px"}">
          <a href="${escapeHtml(href)}" style="text-decoration:none;color:#171411">
            <img class="story-image" src="${escapeHtml(productImage(product))}" width="265" alt="${escapeHtml(product.name)}" style="display:block;width:100%;height:auto;background:#efe5d8;border:0">
            <p style="margin:12px 0 3px;color:#9f6847;font-size:9px;letter-spacing:.17em;font-weight:700;text-transform:uppercase">${escapeHtml(label)}</p>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.3">${escapeHtml(product.name)}</p>
          </a>
        </td>`;
      }).join("")}
    </tr></table>
  </td></tr>`;
}

function renderFounderNote(campaign: AmbCampaign) {
  const copy = editorialCopy(campaign);
  return `<tr><td class="content-pad" style="padding:42px 48px;background:#fffdfa;border-top:1px solid #e4d9cc">
    <p style="margin:0 0 11px;color:#9f6847;font-size:10px;letter-spacing:.22em;font-weight:700">A NOTE FROM ANA PAULA</p>
    <p style="margin:0 0 19px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.35;font-style:italic;color:#2a241f">“${escapeHtml(copy.quote)}”</p>
    <p style="margin:0;color:#6d6259;font-size:11px;letter-spacing:.12em;text-transform:uppercase">Ana Paula Maciel · Founder, AMB Boutique</p>
  </td></tr>`;
}

function renderRecoveryItems(items: AmbEmailProduct[], campaign: AmbCampaign, currency: string, recoveryUrl: string) {
  if (!items.length) return "";
  return `<tr><td class="content-pad" style="padding:0 48px 34px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2d8cb;border-bottom:1px solid #e2d8cb">
      ${items.map((product, index) => {
        const href = trackedUrl(recoveryUrl, campaign, `recovery-product-${product.slug}`);
        const details = [product.colorNames?.[0], product.size ? `Size ${product.size}` : null, product.quantity && product.quantity > 1 ? `Qty ${product.quantity}` : null].filter(Boolean).join(" · ");
        return `<tr>
          <td width="108" valign="middle" style="padding:${index ? "18px 0" : "22px 0"}">
            <a href="${escapeHtml(href)}"><img src="${escapeHtml(productImage(product))}" width="96" alt="${escapeHtml(product.name)}" style="display:block;width:96px;height:auto;background:#f3ede3;border:0"></a>
          </td>
          <td valign="middle" style="padding:18px 14px">
            <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.25">${escapeHtml(product.name)}</p>
            ${details ? `<p style="margin:0 0 7px;color:#756a61;font-size:12px">${escapeHtml(details)}</p>` : ""}
            <p style="margin:0;color:#171411;font-size:13px">${escapeHtml(formatMoney(product.price, currency))}</p>
          </td>
        </tr>`;
      }).join("")}
    </table>
  </td></tr>`;
}

function heroImageFor(campaign: AmbCampaign, items: AmbEmailProduct[]) {
  if (campaign.type === "cart-recovery" || campaign.type === "checkout-recovery" || campaign.key === "payment-recovery") {
    return items[0] ? productImage(items[0]) : absoluteUrl("/images/newsletter-editorial.webp");
  }
  if (campaign.key === "bags-06") return productImage(items[0]);
  return absoluteUrl("/images/newsletter-editorial.webp");
}

function footer(unsubscribeUrl: string) {
  const link = (path: string, label: string) => `<a href="${escapeHtml(absoluteUrl(path))}" style="color:#e7dfd5;text-decoration:none">${label}</a>`;
  return `<tr><td class="footer-pad" style="padding:36px 42px 30px;background:#171411;color:#e7dfd5">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td class="footer-col" width="48%" valign="top" style="padding:0 28px 24px 0">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:.12em">AMB BOUTIQUE</p>
          <p style="margin:13px 0 0;color:#bdb3a9;font-size:11px;line-height:1.7">Contemporary women’s style, thoughtfully curated in San Diego by founder Ana Paula Maciel.</p>
          <p style="margin:13px 0 0;color:#b88664;font-size:9px;letter-spacing:.16em;font-weight:700">SAN DIEGO, CALIFORNIA</p>
        </td>
        <td class="footer-col" width="26%" valign="top" style="padding:0 12px 24px">
          <p style="margin:0 0 11px;color:#fff;font-size:10px;letter-spacing:.15em;font-weight:700">CUSTOMER CARE</p>
          <p style="margin:0;font-size:11px;line-height:1.9">${link("/contact", "Contact us")}<br>${link("/shipping", "Shipping")}<br>${link("/returns", "Returns")}<br>${link("/size-guide", "Size guide")}</p>
        </td>
        <td class="footer-col" width="26%" valign="top" style="padding:0 0 24px 12px">
          <p style="margin:0 0 11px;color:#fff;font-size:10px;letter-spacing:.15em;font-weight:700">ABOUT &amp; LEGAL</p>
          <p style="margin:0;font-size:11px;line-height:1.9">${link("/our-story", "Our story")}<br>${link("/privacy", "Privacy")}<br>${link("/terms", "Terms")}<br>${link("/accessibility", "Accessibility")}</p>
        </td>
      </tr>
    </table>
    <div style="border-top:1px solid #3a342f;margin:4px 0 20px"></div>
    <p style="margin:0;color:#c7bdb3;font-size:10px;line-height:1.8">Secure checkout powered by Stripe · Complimentary U.S. shipping on orders $99+<br>Serving the United States, Canada, the United Kingdom, Australia and New Zealand.</p>
    <p style="margin:15px 0 0;color:#8f857d;font-size:9px;line-height:1.7">AMB BOUTIQUE · San Diego, California, United States · info@ambboutique.online<br>You received this email because you subscribed, requested an offer or started an AMB order. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#e7dfd5">Unsubscribe</a> or manage your preferences.</p>
  </td></tr>`;
}

export function renderAmbEmail(campaign: AmbCampaign, options: RenderOptions = {}) {
  const firstName = options.firstName?.trim();
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";
  const recoveryPath = options.recoveryUrl || campaign.ctaUrl;
  const ctaUrl = trackedUrl(recoveryPath, campaign, "primary-cta");
  const unsubscribeUrl = options.unsubscribeUrl || absoluteUrl("/unsubscribe");
  const reference = options.orderReference
    ? `<p style="margin:20px 0 0;color:#6d6259;font-size:11px;letter-spacing:.1em">ORDER ${escapeHtml(options.orderReference)}</p>`
    : "";
  const currency = options.currency || "USD";
  const items = emailProducts(campaign, options.products);
  const recovery = campaign.type === "cart-recovery" || campaign.type === "checkout-recovery" || campaign.key === "payment-recovery";
  const heroHref = trackedUrl(recoveryPath, campaign, "hero-image");
  const heroImage = heroImageFor(campaign, items);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media screen and (max-width:600px){
      .email-shell{width:100%!important}.outer-pad{padding:0!important}.logo-pad{padding:24px 20px 20px!important}
      .hero-image{width:100%!important;height:auto!important}.content-pad{padding-left:24px!important;padding-right:24px!important}
      .section-pad{padding-left:18px!important;padding-right:18px!important}.product-col{display:block!important;width:100%!important;padding:0 0 24px!important}
      .product-image{width:100%!important;max-width:420px!important;margin:0 auto!important}.footer-pad{padding:30px 24px!important}
      .story-col{display:block!important;width:100%!important;padding:0 0 28px!important}.story-image{width:100%!important;max-width:420px!important;margin:0 auto!important}
      .footer-col{display:block!important;width:100%!important;padding:0 0 24px!important}.headline{font-size:34px!important}
    }
  </style>
</head>
<body style="margin:0;background:#eee7de;color:#171411;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(campaign.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee7de">
    <tr><td class="outer-pad" align="center" style="padding:28px 14px">
      <table class="email-shell" role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:100%;background:#fffdfa;border:1px solid #d9cfc2">
        <tr><td align="center" style="padding:10px 18px;background:#f0e7da;color:#5f554e;font-size:9px;letter-spacing:.12em">COMPLIMENTARY U.S. SHIPPING ON ORDERS $99+ &nbsp;·&nbsp; SECURE CHECKOUT</td></tr>
        <tr><td class="logo-pad" align="center" style="padding:30px 24px 24px">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:31px;letter-spacing:.24em;font-weight:700">AMB</div>
          <div style="font-size:8px;letter-spacing:.46em;margin-top:4px">BOUTIQUE</div>
        </td></tr>
        <tr><td>
          <a href="${escapeHtml(heroHref)}"><img class="hero-image" src="${escapeHtml(heroImage)}" width="640" alt="${escapeHtml(campaign.headline)}" style="display:block;width:100%;height:auto;max-height:520px;object-fit:cover;background:#f3ede3;border:0"></a>
        </td></tr>
        <tr><td class="content-pad" style="padding:42px 48px 12px">
          <p style="margin:0 0 24px;font-size:14px;color:#514942">${greeting}</p>
          <p style="margin:0 0 12px;color:#a16845;font-size:10px;letter-spacing:.22em;font-weight:700">${escapeHtml(campaign.eyebrow)}</p>
          <h1 class="headline" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1.04;font-weight:500;letter-spacing:-.025em">${escapeHtml(campaign.headline)}</h1>
          ${reference}
        </td></tr>
        <tr><td class="content-pad" style="padding:18px 48px 34px">
          <p style="margin:0 0 27px;color:#514942;font-size:15px;line-height:1.75">${escapeHtml(campaign.body)}</p>
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#171411;color:#fff;text-decoration:none;padding:16px 27px;font-size:10px;letter-spacing:.14em;text-transform:uppercase">${escapeHtml(campaign.ctaLabel)}</a>
        </td></tr>
        ${recovery
          ? renderRecoveryItems(items, campaign, currency, recoveryPath)
          : `${renderEditorialStory(items, campaign)}${renderProductGrid(items.slice(2).length ? items.slice(2) : items, campaign, currency)}${renderFounderNote(campaign)}`}
        <tr><td class="content-pad" style="padding:27px 48px;background:#f4ede3;border-top:1px solid #e4d9cc">
          <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:21px">Style with intention</p>
          <p style="margin:0;color:#6d6259;font-size:12px;line-height:1.7">Thoughtful edits, useful styling and offers with a clear reason to exist. Never noise for the sake of sending.</p>
        </td></tr>
        ${footer(unsubscribeUrl)}
      </table>
    </td></tr>
  </table>
</body></html>`;
}
