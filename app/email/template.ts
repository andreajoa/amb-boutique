import { FIRST_ORDER_CODE } from "../commerce";
import { products as catalog, type Product } from "../data";
import { allCampaigns, type AmbCampaign } from "./campaigns";

export type AmbOrderEmailItem = {
  name: string;
  quantity: number;
  size?: string;
  color?: string;
  unitAmount?: number;
  preparationNotice?: string;
};

export type AmbEmailCartItem = {
  slug: string;
  name?: string;
  size?: string;
  color?: string;
  quantity?: number;
};

export type AmbOrderEmailDetails = {
  items: AmbOrderEmailItem[];
  currency: string;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  discount?: number;
  total: number;
  deliveryMinBusinessDays: number;
  deliveryMaxBusinessDays: number;
  preparationNotice?: string;
};

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

function emailHeader(campaignKey: string) {
  const links = [
    ["NEW IN", "/collections", "nav-new-in"],
    ["DRESSES", "/collections/dresses", "nav-dresses"],
    ["TOPS", "/collections/tops-blouses", "nav-tops"],
    ["BAGS", "/collections/bags", "nav-bags"],
    ["HEELS", "/collections/heels", "nav-heels"],
  ];

  return `<tr><td align="center" style="padding:28px 20px 22px;background:#1c1a18;color:#fffdfa">
    <a href="${escapeHtml(trackedUrl("/", campaignKey, "header-logo"))}" style="color:#fffdfa;text-decoration:none">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:31px;letter-spacing:.22em;font-weight:700">AMB</div>
      <div style="font-size:8px;letter-spacing:.42em;margin-top:4px">BOUTIQUE</div>
    </a>
    <p class="mobile-nav" style="margin:19px 0 0;font-size:10px;line-height:1.9;letter-spacing:.12em">
      ${links.map(([label, path, content]) => `<a href="${escapeHtml(trackedUrl(path, campaignKey, content))}" style="display:inline-block;color:#fffdfa;text-decoration:none;white-space:nowrap;margin:0 10px">${label}</a>`).join(" ")}
    </p>
  </td></tr>`;
}

function benefitBar(campaignKey: string) {
  const benefits = [
    ["COMPLIMENTARY U.S. SHIPPING", "Orders $99+", "/shipping", "benefit-shipping"],
    ["30-DAY RETURN REQUESTS", "Eligibility applies", "/returns", "benefit-returns"],
    ["SECURE CHECKOUT", "Powered by Stripe", "/faq", "benefit-checkout"],
    ["PERSONAL SUPPORT", "Real human help", "/contact", "benefit-support"],
  ];

  return `<tr><td style="padding:0;background:#f1ede7;border-top:1px solid #ded7ce;border-bottom:1px solid #ded7ce">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>${benefits.map(([title, detail, path, content]) => `<td class="mobile-benefit" width="25%" align="center" valign="top" style="width:25%;padding:22px 9px">
        <a href="${escapeHtml(trackedUrl(path, campaignKey, content))}" style="color:#1c1a18;text-decoration:none">
          <div style="margin:0 auto 9px;width:28px;height:28px;line-height:28px;border:1px solid #9c7b64;border-radius:50%;color:#9c6747;font-family:Georgia,'Times New Roman',serif;font-size:14px">✓</div>
          <strong style="display:block;font-size:9px;line-height:1.45;letter-spacing:.08em">${title}</strong>
          <span style="display:block;margin-top:4px;color:#766d66;font-size:9px;line-height:1.4">${detail}</span>
        </a>
      </td>`).join("")}</tr>
    </table>
  </td></tr>`;
}

function emailFooter(campaignKey: string, unsubscribeUrl: string) {
  const links = [
    ["SHOP", "/collections", "footer-shop"],
    ["OUR STORY", "/about", "footer-story"],
    ["SHIPPING", "/shipping", "footer-shipping"],
    ["RETURNS", "/returns", "footer-returns"],
    ["SIZE GUIDE", "/size-guide", "footer-size-guide"],
    ["FAQ", "/faq", "footer-faq"],
    ["CONTACT", "/contact", "footer-contact"],
  ];

  return `${benefitBar(campaignKey)}
  <tr><td style="padding:39px 34px 31px;background:#1c1a18;color:#fffdfa;text-align:center">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:27px;letter-spacing:.22em;font-weight:700">AMB</div>
    <div style="font-size:8px;letter-spacing:.42em;margin-top:4px">BOUTIQUE</div>
    <p style="margin:20px 0 4px;font-size:11px;line-height:2.2;letter-spacing:.08em">
      ${links.map(([label, path, content]) => `<a href="${escapeHtml(trackedUrl(path, campaignKey, content))}" style="color:#fffdfa;text-decoration:none;white-space:nowrap;margin:0 8px">${label}</a>`).join(" ")}
    </p>
    <p style="margin:19px 0 21px;font-size:11px;letter-spacing:.12em">
      <a href="${escapeHtml(trackedUrl("https://www.instagram.com/ambb.outique/", campaignKey, "footer-instagram"))}" style="color:#fffdfa;text-decoration:underline;margin:0 10px">INSTAGRAM</a>
      <a href="${escapeHtml(trackedUrl("https://www.tiktok.com/@ambb.outique", campaignKey, "footer-tiktok"))}" style="color:#fffdfa;text-decoration:underline;margin:0 10px">TIKTOK</a>
    </p>
    <p style="margin:0;color:#d3cbc3;font-size:11px;line-height:1.8">AMB BOUTIQUE · Operated by Ana Paula Maciel<br><a href="mailto:info@ambboutique.online" style="color:#fffdfa">info@ambboutique.online</a></p>
    <p style="margin:17px auto 0;max-width:560px;color:#aaa19a;font-size:9px;line-height:1.65">Worldwide delivery is available to the United States, Canada, the United Kingdom, Australia and New Zealand. Shipping charges, duties and taxes vary by destination. Prices appear in the currency selected on the website.</p>
    <p style="margin:17px 0 0;color:#aaa19a;font-size:9px;line-height:1.7">You received this email because you subscribed, requested an offer or started an AMB order.<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#fffdfa;text-decoration:underline">Unsubscribe</a> · <a href="${escapeHtml(trackedUrl("/privacy", campaignKey, "footer-privacy"))}" style="color:#fffdfa">Privacy Policy</a> · <a href="${escapeHtml(trackedUrl("/terms", campaignKey, "footer-terms"))}" style="color:#fffdfa">Terms</a> · <a href="${escapeHtml(trackedUrl("/accessibility", campaignKey, "footer-accessibility"))}" style="color:#fffdfa">Accessibility</a></p>
  </td></tr>`;
}

function campaignHero(campaign: AmbCampaign) {
  const key = campaign.key.toLowerCase();
  if (key.includes("bag") || key.includes("gift")) return { image: "/images/journal-handbags.webp", alt: "The AMB bag edit" };
  if (key.includes("new") || key.includes("spring") || key.includes("summer") || key.includes("australia")) return { image: "/images/new-arrivals.webp", alt: "New arrivals from AMB BOUTIQUE" };
  if (key.includes("order-confirmed") || key.includes("founder") || key.includes("brand")) return { image: "/images/newsletter-editorial.webp", alt: "The AMB BOUTIQUE point of view" };
  if (campaign.type === "cart-recovery" || campaign.type === "checkout-recovery" || key.includes("payment")) return { image: "/images/product-banner.webp", alt: "Return to your AMB edit" };
  return { image: "/images/amb-hero.webp", alt: "The AMB BOUTIQUE edit" };
}

function confidenceBlock(campaign: AmbCampaign) {
  if (campaign.type === "cart-recovery" || campaign.type === "checkout-recovery" || campaign.key === "payment-recovery") {
    return {
      eyebrow: "NEED A REAL ANSWER?",
      headline: "We can help before you decide.",
      body: "Questions about fit, payment or delivery? Reply to this email or contact our support team. Clear information should come before checkout.",
      label: "GET PERSONAL SUPPORT",
      path: "/contact",
    };
  }
  if (campaign.key === "order-confirmed") {
    return {
      eyebrow: "WHAT HAPPENS NEXT",
      headline: "We’ll keep you informed.",
      body: "Your order is being prepared. We’ll send another email when tracking becomes available, and our team is here if you need anything in the meantime.",
      label: "VIEW SHIPPING DETAILS",
      path: "/shipping",
    };
  }
  return {
    eyebrow: "SHOP WITH CONFIDENCE",
    headline: "Beautiful choices, backed by clear information.",
    body: "Review product details, sizing, delivery and return eligibility before ordering. If anything is unclear, a real person from AMB is ready to help.",
    label: "READ THE FAQ",
    path: "/faq",
  };
}

// Pieces an email can show: a real single photo (sprite sheets cannot be cropped in email clients) and not sold out.
const emailCatalog = catalog.filter((product) => product.images?.[0] && !product.gallerySprite && product.stock !== 0);

const emailThemes: Array<[RegExp, Product["category"][]]> = [
  [/dress|evening|private/, ["Dresses"]],
  [/tops/, ["Tops", "Knitwear", "Sets"]],
  [/bags|gift/, ["Bags", "Accessories", "Shoes"]],
  [/heels/, ["Shoes"]],
  [/work|style|look/, ["Pants", "Sets", "Skirts", "Tops", "Dresses"]],
  [/weekend|summer|spring|australia|canada-day/, ["Sets", "Shorts", "Playsuits", "Skirts", "Dresses"]],
];

function themedPool(key: string, preferred: Product["category"][] = []) {
  const categories = preferred.length ? preferred : emailThemes.find(([pattern]) => pattern.test(key))?.[1];
  const pool = categories ? emailCatalog.filter((product) => categories.includes(product.category)) : [];
  if (pool.length >= 8) return pool;
  // Mixed edit: alternate categories so a general email never shows eight near-identical dresses.
  const byCategory = new Map<string, Product[]>();
  for (const product of emailCatalog) byCategory.set(product.category, [...(byCategory.get(product.category) || []), product]);
  const lanes = [...byCategory.values()];
  const mixed: Product[] = [];
  for (let index = 0; mixed.length < emailCatalog.length; index += 1) {
    for (const lane of lanes) if (lane[index]) mixed.push(lane[index]);
    if (!lanes.some((lane) => lane[index + 1])) break;
  }
  return [...pool, ...mixed.filter((product) => !pool.includes(product))];
}

// Eight different pieces per email. Each campaign starts at its own block of the pool, so a sequence does not keep
// showing the same products; excluded slugs (the shopper's bag) never appear twice.
export function emailProductPicks(campaignKey: string, exclude: string[] = [], preferred: Product["category"][] = [], count = 8) {
  const pool = themedPool(campaignKey, preferred).filter((product) => !exclude.includes(product.slug));
  if (!pool.length) return [];
  const position = Math.max(0, allCampaigns.findIndex((campaign) => campaign.key === campaignKey));
  const start = (position * count) % pool.length;
  const picks: Product[] = [];
  for (let offset = 0; picks.length < Math.min(count, pool.length); offset += 1) {
    const product = pool[(start + offset) % pool.length];
    if (!picks.includes(product)) picks.push(product);
  }
  return picks;
}

export function emailProductGrid(campaignKey: string, options: {
  exclude?: string[];
  preferred?: Product["category"][];
  eyebrow?: string;
  headline?: string;
} = {}) {
  const picks = emailProductPicks(campaignKey, options.exclude, options.preferred);
  if (!picks.length) return "";
  const cell = (product: Product) => {
    const url = escapeHtml(trackedUrl(`/products/${product.slug}`, campaignKey, `grid-${product.slug}`));
    return `<td width="50%" align="center" valign="top" style="width:50%;padding:0 6px 26px">
      <a href="${url}" style="color:#171411;text-decoration:none">
        <img src="${escapeHtml(absoluteUrl(product.images?.[0] || ""))}" width="300" alt="${escapeHtml(product.name)}" style="display:block;width:100%;height:auto;border:0;background:#f4eee4">
        <span style="display:block;margin:12px 4px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.3">${escapeHtml(product.name)}</span>
      </a>
      <a href="${url}" style="display:inline-block;margin-top:8px;color:#9c6747;font-size:10px;font-weight:700;letter-spacing:.16em;text-decoration:underline">SHOP NOW</a>
    </td>`;
  };
  const rows = [];
  for (let index = 0; index < picks.length; index += 2) rows.push(`<tr>${cell(picks[index])}${picks[index + 1] ? cell(picks[index + 1]) : "<td width=\"50%\"></td>"}</tr>`);
  return `<tr><td style="padding:44px 16px 20px;background:#fffdfa">
    <p style="margin:0 0 9px;text-align:center;color:#9c6747;font-size:10px;font-weight:700;letter-spacing:.2em">${options.eyebrow || "CHOSEN FOR YOU"}</p>
    <h2 style="margin:0 0 26px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;font-weight:500;padding:0 12px">${options.headline || "Pieces we think you’ll love"}</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.join("")}</table>
  </td></tr>`;
}

// The piece(s) the shopper left behind, shown first and large: the recovery email sells that exact item.
function cartBlock(items: AmbEmailCartItem[], ctaUrl: string, ctaLabel: string, campaignKey: string) {
  const lines = items.slice(0, 3).flatMap((item) => {
    const product = catalog.find((candidate) => candidate.slug === item.slug);
    const image = product && !product.gallerySprite ? product.images?.[0] : undefined;
    if (!product) return [];
    const productUrl = escapeHtml(trackedUrl(`/products/${product.slug}`, campaignKey, `bag-${product.slug}`));
    const meta = [item.size ? `Size ${escapeHtml(item.size)}` : "", item.color ? escapeHtml(item.color) : ""].filter(Boolean).join(" · ");
    return [`<tr><td align="center" style="padding:0 0 24px">
      ${image ? `<a href="${productUrl}"><img src="${escapeHtml(absoluteUrl(image))}" width="360" alt="${escapeHtml(product.name)}" style="display:block;width:100%;max-width:360px;height:auto;border:0;margin:0 auto;background:#f4eee4"></a>` : ""}
      <p style="margin:16px 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25">${escapeHtml(item.name || product.name)}</p>
      ${meta ? `<p style="margin:0;color:#6d6259;font-size:12px;letter-spacing:.06em">${meta}</p>` : ""}
    </td></tr>`];
  });
  if (!lines.length) return "";
  return `<tr><td class="mobile-pad" align="center" style="padding:40px 58px 44px;background:#f4eee7;border-top:1px solid #e3dad0;border-bottom:1px solid #e3dad0">
    <p style="margin:0 0 20px;color:#9c6747;font-size:10px;letter-spacing:.22em;font-weight:700">STILL IN YOUR BAG</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${lines.join("")}</table>
    <table class="mobile-button" role="presentation" cellspacing="0" cellpadding="0" style="margin:4px auto 0"><tr><td bgcolor="#1c1a18" style="background:#1c1a18;border-radius:99px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;color:#fffdfa;text-decoration:none;padding:17px 33px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">${escapeHtml(ctaLabel)}</a></td></tr></table>
    <p style="margin:16px 0 0;color:#6d6259;font-size:11px;line-height:1.6">Sizes move quickly. Your bag is saved, but the piece is not reserved.</p>
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
      ${product.price ? `<p style="margin:7px 0 0;color:#6d6259;font-size:12px">${escapeHtml(product.price)}</p>` : ""}
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
      .email-shell { width:100% !important; max-width:100% !important; margin-left:auto !important; margin-right:auto !important; }
      .mobile-pad { padding-left:24px !important; padding-right:24px !important; }
      .mobile-title { font-size:36px !important; line-height:1.08 !important; }
      .mobile-product { display:block !important; width:100% !important; box-sizing:border-box !important; padding-left:0 !important; padding-right:0 !important; }
      .mobile-stack { display:block !important; width:100% !important; box-sizing:border-box !important; }
      .mobile-stack-pad { padding:28px 24px !important; }
      .mobile-nav a { display:inline-block !important; margin:4px 7px !important; }
      .mobile-benefit { display:block !important; width:100% !important; box-sizing:border-box !important; padding:14px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eee6db;color:#171411;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your private 10% welcome code and a considered introduction to AMB BOUTIQUE.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#eee6db">
    <tr><td align="center" style="padding:24px 10px">
      <table class="email-shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:720px;background:#fffdfa;border:1px solid #ddd2c4">
        ${emailHeader(campaignKey)}

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
              <p style="margin:13px 0 5px;font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:.06em">${FIRST_ORDER_CODE}</p>
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
                <p style="margin:0 0 11px;color:#a16845;font-size:9px;letter-spacing:.2em;font-weight:700">CHOSEN WITH INTENTION</p>
                <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:1.14;font-weight:500">A boutique built for real life—not just the photograph.</h2>
                <p style="margin:17px 0;color:#554d46;font-size:13px;line-height:1.75">Ana Paula Maciel founded AMB around a simple belief: a beautiful piece should earn its place. It should work more than once, style more than one way and still feel unmistakably like you.</p>
                <a href="${escapeHtml(storyUrl)}" style="color:#171411;font-size:10px;font-weight:700;letter-spacing:.13em;text-decoration:underline">READ THE AMB STORY</a>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td class="mobile-pad" style="padding:48px 42px 26px">
          <p style="margin:0 0 10px;text-align:center;color:#a16845;font-size:10px;letter-spacing:.22em;font-weight:700">BEGIN WITH WHAT YOUR WARDROBE NEEDS</p>
          <h2 style="margin:0 0 28px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:35px;line-height:1.15;font-weight:500">Eight pieces. Eight easy ways in.</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>${productCard(products[0], campaignKey)}${productCard(products[1], campaignKey)}</tr>
            <tr>${productCard(products[2], campaignKey)}${productCard(products[3], campaignKey)}</tr>
            ${(() => {
              const more = emailProductPicks(campaignKey, products.map((product) => product.slug), [], 4)
                .map((product) => ({ slug: product.slug, name: product.name, price: "", image: product.images?.[0] || "", label: product.category.toUpperCase() }));
              const rows = [];
              for (let index = 0; index < more.length; index += 2) rows.push(`<tr>${productCard(more[index], campaignKey)}${more[index + 1] ? productCard(more[index + 1], campaignKey) : ""}</tr>`);
              return rows.join("");
            })()}
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


function formatOrderMoney(amount: number | undefined, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function renderOrderConfirmationEmail(options: {
  firstName?: string;
  orderReference?: string;
  orderDetails: AmbOrderEmailDetails;
}) {
  const firstName = options.firstName?.trim();
  const greeting = firstName ? `Thank you, ${escapeHtml(firstName)}.` : "Thank you for your order.";
  const details = options.orderDetails;
  const hasPreparation = Boolean(details.preparationNotice || details.items.some((item) => item.preparationNotice));
  const currency = details.currency.toUpperCase();
  const reference = options.orderReference
    ? `<p style="margin:12px 0 0;color:#786f67;font-size:11px;letter-spacing:.12em">ORDER ${escapeHtml(options.orderReference)}</p>`
    : "";

  const itemRows = details.items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const meta = [
      item.size ? `Size: ${escapeHtml(item.size)}` : "",
      item.color ? `Color: ${escapeHtml(item.color)}` : "",
      `Quantity: ${quantity}`,
    ].filter(Boolean).join("<br>");
    const amount = typeof item.unitAmount === "number"
      ? `<td align="right" valign="top" style="padding:22px 0 22px 18px;font-size:14px;font-weight:700;white-space:nowrap">${escapeHtml(formatOrderMoney(item.unitAmount * quantity, currency))}</td>`
      : "";
    return `<tr>
      <td style="padding:22px 0;border-top:1px solid #e4ddd4">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.3">${escapeHtml(item.name)}</div>
        <div style="margin-top:8px;font-size:12px;line-height:1.7;color:#6b655e">${meta}</div>
        ${item.preparationNotice ? `<div style="margin-top:8px;font-size:12px;line-height:1.7;color:#4e4943">${escapeHtml(item.preparationNotice)}</div>` : ""}
      </td>
      ${amount}
    </tr>`;
  }).join("");

  const totalRows = [
    typeof details.subtotal === "number" ? ["Merchandise", details.subtotal] : null,
    typeof details.shipping === "number" ? ["Shipping", details.shipping] : null,
    typeof details.tax === "number" && details.tax > 0 ? ["Tax", details.tax] : null,
    typeof details.discount === "number" && details.discount > 0 ? ["Discount", -details.discount] : null,
  ].filter(Boolean) as Array<[string, number]>;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:#f5efe5;color:#171512;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">We’re preparing your order.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f5efe5">
    <tr><td align="center" style="padding:32px 12px">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#fffefc;border:1px solid #e7dac8">
        <tr><td style="padding:34px 38px 24px;text-align:center;border-bottom:1px solid #e7dac8">
          <a href="${escapeHtml(absoluteUrl("/"))}" style="color:#171512;text-decoration:none">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:.16em;font-weight:600">AMB BOUTIQUE</div>
          </a>
          <div style="margin-top:8px;font-size:9px;letter-spacing:.32em;color:#6b655e">ORDER CONFIRMATION</div>
        </td></tr>
        <tr><td style="padding:40px 38px">
          <div style="font-size:11px;letter-spacing:.16em;font-weight:700;color:#aa8063">ORDER CONFIRMED</div>
          <h1 style="margin:12px 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.05;font-weight:500">${greeting}</h1>
          <p style="margin:0;font-size:14px;line-height:1.75;color:#4e4943">Your order is confirmed and we’re preparing it. We’ll send you another email when tracking information becomes available.</p>
          ${reference}

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;border-bottom:1px solid #e4ddd4">
            ${itemRows}
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;line-height:1.8;margin:28px 0 30px">
            ${totalRows.map(([label, amount]) => `<tr><td style="color:#6b655e">${escapeHtml(label)}</td><td align="right">${escapeHtml(formatOrderMoney(amount, currency))}</td></tr>`).join("")}
            <tr><td style="padding-top:8px;font-weight:700;border-top:1px solid #ded8cf">Total paid</td><td align="right" style="padding-top:8px;font-weight:700;border-top:1px solid #ded8cf">${escapeHtml(formatOrderMoney(details.total, currency))}</td></tr>
          </table>

          <div style="background:#f5efe5;padding:22px 24px;margin-bottom:26px">
            <div style="font-size:10px;letter-spacing:.14em;font-weight:700;margin-bottom:8px">DELIVERY</div>
            ${details.preparationNotice && !details.items.some((item) => item.preparationNotice) ? `<p style="font-size:12px;line-height:1.7;color:#4e4943">${escapeHtml(details.preparationNotice)}</p>` : ""}
            <div style="font-size:13px;line-height:1.7;color:#4e4943">${hasPreparation ? "Estimated transit after preparation and dispatch" : "Estimated delivery window"}: <strong>${details.deliveryMinBusinessDays}–${details.deliveryMaxBusinessDays} business days</strong>. Tracking will be sent separately when it becomes available.</div>
          </div>

          <p style="margin:0;font-size:13px;line-height:1.75;color:#6b655e">Need help with your order? Email <a href="mailto:info@ambboutique.online" style="color:#171512">info@ambboutique.online</a>.</p>
        </td></tr>
        ${emailProductGrid("order-confirmed", { exclude: details.items.flatMap((item) => catalog.find((product) => product.name === item.name)?.slug || []), eyebrow: "COMPLETE THE LOOK", headline: "Pieces that pair beautifully with your order" })}
        <tr><td style="padding:22px 38px;border-top:1px solid #e7dac8;text-align:center;font-size:11px;line-height:1.6;color:#6b655e">
          Thank you for shopping with AMB BOUTIQUE.
        </td></tr>
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
  orderDetails?: AmbOrderEmailDetails;
  cartItems?: AmbEmailCartItem[];
} = {}) {
  const firstName = options.firstName?.trim();
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";
  const unsubscribeUrl = options.unsubscribeUrl || absoluteUrl("/unsubscribe");

  if (campaign.key === "welcome-discount") {
    return renderWelcomeDiscountEmail({ greeting, unsubscribeUrl });
  }

  if (campaign.key === "order-confirmed" && options.orderDetails) {
    return renderOrderConfirmationEmail({
      firstName: options.firstName,
      orderReference: options.orderReference,
      orderDetails: options.orderDetails,
    });
  }

  const ctaUrl = trackedUrl(options.recoveryUrl || campaign.ctaUrl, campaign.key, "primary-cta");
  const recovering = campaign.type === "cart-recovery" || campaign.type === "checkout-recovery" || campaign.key === "payment-recovery";
  const cartSlugs = (options.cartItems || []).map((item) => item.slug);
  const cartCategories = [...new Set(cartSlugs.flatMap((slug) => catalog.find((product) => product.slug === slug)?.category || []))];
  const hero = campaignHero(campaign);
  const confidence = confidenceBlock(campaign);
  const confidenceUrl = trackedUrl(confidence.path, campaign.key, "confidence-link");
  const finalShopUrl = trackedUrl("/collections", campaign.key, "final-shop");
  const reference = options.orderReference
    ? `<p style="margin:20px 0 0;color:#6d6259;font-size:12px;letter-spacing:.08em">ORDER ${escapeHtml(options.orderReference)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <style>
    @media only screen and (max-width:620px) {
      .email-shell { width:100% !important; max-width:100% !important; margin-left:auto !important; margin-right:auto !important; }
      .mobile-pad { padding-left:24px !important; padding-right:24px !important; }
      .mobile-title { font-size:36px !important; line-height:1.08 !important; }
      .mobile-nav a { display:inline-block !important; margin:4px 7px !important; }
      .mobile-benefit { display:block !important; width:100% !important; box-sizing:border-box !important; padding:14px 16px !important; }
      .mobile-button { width:100% !important; }
      .mobile-button a { display:block !important; text-align:center !important; }
      .mobile-stack { display:block !important; width:100% !important; box-sizing:border-box !important; }
      .mobile-stack-pad { padding:24px !important; }
      img { max-width:100% !important; height:auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eee6db;color:#1c1a18;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(campaign.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#eee6db">
    <tr><td align="center" style="padding:24px 10px">
      <table class="email-shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:720px;background:#fffdfa;border:1px solid #ddd2c4">
        ${emailHeader(campaign.key)}

        <tr><td>
          <a href="${escapeHtml(ctaUrl)}"><img src="${escapeHtml(absoluteUrl(hero.image))}" width="720" alt="${escapeHtml(hero.alt)}" style="display:block;width:100%;height:auto;border:0;background:#d7c1ab"></a>
        </td></tr>

        <tr><td class="mobile-pad" align="center" style="padding:44px 58px 48px;background:#fffdfa">
          <p style="margin:0 0 24px;color:#504842;font-size:14px">${greeting}</p>
          <p style="margin:0 0 12px;color:#9c6747;font-size:10px;letter-spacing:.22em;font-weight:700">${escapeHtml(campaign.eyebrow)}</p>
          <h1 class="mobile-title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:46px;line-height:1.06;font-weight:500;letter-spacing:-.025em">${escapeHtml(campaign.headline)}</h1>
          ${reference}
          <p style="margin:22px auto 0;max-width:560px;color:#504842;font-size:16px;line-height:1.72">${escapeHtml(campaign.body)}</p>
          <table class="mobile-button" role="presentation" cellspacing="0" cellpadding="0" style="margin:27px auto 0"><tr><td bgcolor="#1c1a18" style="background:#1c1a18;border-radius:99px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;color:#fffdfa;text-decoration:none;padding:17px 33px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">${escapeHtml(campaign.ctaLabel)}</a></td></tr></table>
        </td></tr>

        <tr><td style="padding:17px 20px;background:#b99a82;color:#fffdfa;text-align:center;font-size:10px;line-height:1.7;letter-spacing:.09em">CURATED BY AMB BOUTIQUE &nbsp;·&nbsp; SECURE CHECKOUT &nbsp;·&nbsp; WORLDWIDE DELIVERY</td></tr>

        ${recovering && options.cartItems?.length ? cartBlock(options.cartItems, ctaUrl, campaign.ctaLabel, campaign.key) : ""}

        ${emailProductGrid(campaign.key, recovering && cartSlugs.length
          ? { exclude: cartSlugs, preferred: cartCategories, eyebrow: "COMPLETE THE LOOK", headline: "Chosen to go with your pick" }
          : {})}

        <tr><td class="mobile-pad" align="center" style="padding:42px 58px 46px;background:#f4eee7;border-top:1px solid #e3dad0">
          <p style="margin:0 0 10px;color:#9c6747;font-size:10px;letter-spacing:.2em;font-weight:700">${confidence.eyebrow}</p>
          <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.15;font-weight:500">${confidence.headline}</h2>
          <p style="margin:18px auto 0;max-width:540px;color:#595049;font-size:14px;line-height:1.7">${confidence.body}</p>
          <a href="${escapeHtml(confidenceUrl)}" style="display:inline-block;margin-top:22px;color:#1c1a18;font-size:10px;font-weight:700;letter-spacing:.13em;text-decoration:underline">${confidence.label}</a>
        </td></tr>

        <tr><td class="mobile-pad" align="center" style="padding:40px 58px 44px;background:#fffdfa">
          <p style="margin:0 0 9px;color:#9c6747;font-size:10px;letter-spacing:.2em;font-weight:700">THE AMB EDIT</p>
          <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.16;font-weight:500">Find the piece you’ll want to wear again.</h2>
          <table class="mobile-button" role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0"><tr><td bgcolor="#1c1a18" style="background:#1c1a18;border-radius:99px"><a href="${escapeHtml(finalShopUrl)}" style="display:inline-block;color:#fffdfa;text-decoration:none;padding:16px 31px;font-size:11px;font-weight:700;letter-spacing:.14em">SHOP ALL COLLECTIONS</a></td></tr></table>
        </td></tr>

        ${emailFooter(campaign.key, unsubscribeUrl)}
      </table>
    </td></tr>
  </table>
</body></html>`;
}
