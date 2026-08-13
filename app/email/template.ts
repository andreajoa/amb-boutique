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
      ${links.map(([label, path, content]) => `<a href="${escapeHtml(trackedUrl(path, campaignKey, content))}" style="display:inline-block;color:#fffdfa;text-decoration:none;white-space:nowrap;margin:0 10px">${label}</a>`).join("")}
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
      ${links.map(([label, path, content]) => `<a href="${escapeHtml(trackedUrl(path, campaignKey, content))}" style="color:#fffdfa;text-decoration:none;white-space:nowrap;margin:0 8px">${label}</a>`).join("")}
    </p>
    <p style="margin:19px 0 21px;font-size:11px;letter-spacing:.12em">
      <a href="${escapeHtml(trackedUrl("https://www.instagram.com/ambb.outique/", campaignKey, "footer-instagram"))}" style="color:#fffdfa;text-decoration:underline;margin:0 10px">INSTAGRAM</a>
      <a href="${escapeHtml(trackedUrl("https://www.tiktok.com/@ambb.outique", campaignKey, "footer-tiktok"))}" style="color:#fffdfa;text-decoration:underline;margin:0 10px">TIKTOK</a>
    </p>
    <p style="margin:0;color:#d3cbc3;font-size:11px;line-height:1.8">AMB BOUTIQUE · Operated by Ana Paula Maciel<br>San Diego, California, United States<br><a href="mailto:info@ambboutique.online" style="color:#fffdfa">info@ambboutique.online</a></p>
    <p style="margin:17px auto 0;max-width:560px;color:#aaa19a;font-size:9px;line-height:1.65">Worldwide delivery is available to the United States, Canada, the United Kingdom, Australia and New Zealand. Shipping charges, duties and taxes vary by destination. Prices appear in the currency selected on the website.</p>
    <p style="margin:17px 0 0;color:#aaa19a;font-size:9px;line-height:1.7">You received this email because you subscribed, requested an offer or started an AMB order.<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#fffdfa;text-decoration:underline">Unsubscribe</a> · <a href="${escapeHtml(trackedUrl("/privacy", campaignKey, "footer-privacy"))}" style="color:#fffdfa">Privacy Policy</a> · <a href="${escapeHtml(trackedUrl("/terms", campaignKey, "footer-terms"))}" style="color:#fffdfa">Terms</a> · <a href="${escapeHtml(trackedUrl("/accessibility", campaignKey, "footer-accessibility"))}" style="color:#fffdfa">Accessibility</a></p>
  </td></tr>`;
}

const emailCategories = [
  { label: "DRESSES", path: "/collections/dresses", image: "/products/brielle-satin-maxi-dress/01.webp" },
  { label: "TOPS", path: "/collections/tops-blouses", image: "/products/cora-square-neck-top/01.webp" },
  { label: "ROMPERS", path: "/collections/rompers-playsuits", image: "/products/capri-utility-romper/01.webp" },
  { label: "PANTS", path: "/collections/pants", image: "/products/palais-flare-trousers/01.webp" },
  { label: "BAGS", path: "/collections/bags", image: "/editorial/bags/products/portofino-carryall-burgundy/01.webp" },
  { label: "NEW IN", path: "/collections", image: "/products/selene-satin-maxi-dress/01.webp" },
];

function categoryGrid(campaignKey: string) {
  const rows = [emailCategories.slice(0, 3), emailCategories.slice(3, 6)];
  return `<tr><td class="mobile-pad" style="padding:44px 22px 38px;background:#fffdfa">
    <p style="margin:0 0 9px;text-align:center;color:#9c6747;font-size:10px;font-weight:700;letter-spacing:.2em">FIND YOUR WAY INTO THE EDIT</p>
    <h2 style="margin:0 0 26px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.15;font-weight:500">Shop by category</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${rows.map((row) => `<tr>${row.map((category) => {
        const url = trackedUrl(category.path, campaignKey, `category-${category.label.toLowerCase().replace(/\s+/g, "-")}`);
        return `<td width="33.333%" align="center" valign="top" style="width:33.333%;padding:0 5px 18px">
          <a href="${escapeHtml(url)}" style="color:#1c1a18;text-decoration:none">
            <img src="${escapeHtml(absoluteUrl(category.image))}" width="210" alt="Shop ${escapeHtml(category.label.toLowerCase())}" style="display:block;width:100%;height:auto;border:0;background:#eee7df">
            <strong style="display:block;margin-top:11px;font-size:11px;letter-spacing:.1em">${category.label}</strong>
          </a>
        </td>`;
      }).join("")}</tr>`).join("")}
    </table>
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
      body: "Questions about fit, payment or delivery? Reply to this email or contact our San Diego team. Clear information should come before checkout.",
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
      .mobile-benefit { display:inline-block !important; width:50% !important; box-sizing:border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eee6db;color:#171411;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your private 10% welcome code and a considered introduction to AMB BOUTIQUE.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#eee6db">
    <tr><td align="center" style="padding:24px 10px">
      <table class="email-shell" role="presentation" width="720" cellspacing="0" cellpadding="0" style="width:100%;max-width:720px;background:#fffdfa;border:1px solid #ddd2c4">
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
      .email-shell { width:100% !important; }
      .mobile-pad { padding-left:24px !important; padding-right:24px !important; }
      .mobile-title { font-size:36px !important; line-height:1.08 !important; }
      .mobile-nav a { display:inline-block !important; margin:4px 7px !important; }
      .mobile-benefit { display:inline-block !important; width:50% !important; box-sizing:border-box !important; }
      .mobile-button { width:100% !important; }
      .mobile-button a { display:block !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eee6db;color:#1c1a18;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(campaign.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#eee6db">
    <tr><td align="center" style="padding:24px 10px">
      <table class="email-shell" role="presentation" width="720" cellspacing="0" cellpadding="0" style="width:100%;max-width:720px;background:#fffdfa;border:1px solid #ddd2c4">
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

        <tr><td style="padding:17px 20px;background:#b99a82;color:#fffdfa;text-align:center;font-size:10px;line-height:1.7;letter-spacing:.09em">CURATED IN SAN DIEGO &nbsp;·&nbsp; SECURE CHECKOUT &nbsp;·&nbsp; WORLDWIDE DELIVERY</td></tr>

        ${categoryGrid(campaign.key)}

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
