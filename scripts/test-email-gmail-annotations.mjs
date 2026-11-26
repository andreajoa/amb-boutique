import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const load = createRequire(`${root}/package.json`);
const ts = load("typescript");
const sharp = load("sharp");

for (const ext of [".ts", ".tsx"]) {
  load.extensions[ext] = (mod, filename) => {
    const source = fs.readFileSync(filename, "utf8").replace(/^import "server-only";$/m, "");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: filename,
    });
    mod._compile(outputText, filename);
  };
}

const originalLoad = Module._load;
Module._load = function (name, ...args) {
  if (name === "server-only") return {};
  return originalLoad.call(this, name, ...args);
};

function stub(relPath, exportsObj) {
  const resolved = load.resolve(`${root}${relPath}`);
  load.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exportsObj };
}
stub("/app/analytics/db.ts", { getAnalyticsSql: () => null, jsonForDatabase: JSON.stringify });

const { allCampaigns, findCampaign } = load(`${root}/app/email/campaigns.ts`);
const { renderAmbEmail } = load(`${root}/app/email/template.ts`);
const { renderAmbTrackingUpdateEmail } = load(`${root}/app/email/tracking-update.ts`);
const { GET: emailMediaGet } = load(`${root}/app/email-media/[kind]/[file]/route.ts`);

function extractJsonLd(html, label) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/i);
  assert.ok(head, `${label}: missing <head>`);
  const script = head[1].match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(script, `${label}: missing JSON-LD script in <head>`);
  const parsed = JSON.parse(script[1]);
  assert.ok(Array.isArray(parsed) && parsed.length >= 1, `${label}: JSON-LD must be a non-empty array`);
  return parsed;
}

const transactionalKeys = new Set(["order-confirmed", "order-next-steps", "order-shipped", "payment-recovery"]);
const checkedSlugs = new Set();

for (const campaign of allCampaigns) {
  const html = renderAmbEmail(campaign, {
    firstName: "Andre",
    cartItems: campaign.type === "cart-recovery" ? [{ slug: "brielle-satin-maxi-dress", size: "S", quantity: 1 }] : undefined,
  });
  const data = extractJsonLd(html, campaign.key);
  const org = data.find((entry) => entry["@type"] === "Organization");
  assert.ok(org, `${campaign.key}: missing Organization`);
  assert.equal(org["@context"], "http://schema.org/");
  assert.equal(org.logo, "https://ambboutique.online/logo-512.png");

  const cards = data.filter((entry) => entry["@type"] === "PromotionCard");
  const offer = data.find((entry) => entry["@type"] === "DiscountOffer");

  if (transactionalKeys.has(campaign.key)) {
    assert.equal(cards.length, 0, `${campaign.key}: transactional email should not include PromotionCard`);
    assert.equal(offer, undefined, `${campaign.key}: transactional email should not include DiscountOffer`);
  } else {
    assert.ok(cards.length >= 2 && cards.length <= 10, `${campaign.key}: expected 2-10 PromotionCards, got ${cards.length}`);
    const seenImages = new Set();
    cards.forEach((card, index) => {
      assert.equal(card["@context"], "http://schema.org/");
      assert.equal(card.position, index + 1, `${campaign.key}: position must be 1-based integer`);
      assert.match(card.image, /^https:\/\/ambboutique\.online\/email-media\/product\/[a-z0-9-]+\.jpg$/);
      assert.match(card.url, /^https:\/\/ambboutique\.online\/products\/[a-z0-9-]+\?/);
      assert.ok(card.headline && card.headline.length > 2);
      assert.equal("price" in card, false, `${campaign.key}: AMB PromotionCard must omit price`);
      assert.ok(!seenImages.has(card.image), `${campaign.key}: duplicate card image ${card.image}`);
      seenImages.add(card.image);
      checkedSlugs.add(card.image.split("/").pop().replace(/\.jpg$/, ""));
    });
  }

  if (campaign.key === "welcome-discount") {
    assert.equal(offer?.discountCode, "AMBWELCOME10");
  } else if (campaign.key === "holiday-vip") {
    assert.equal(offer?.discountCode, "AMBVIP");
    assert.ok(offer?.availabilityStarts && offer?.availabilityEnds);
  } else if (["holiday-open", "holiday-bf", "holiday-cyber"].includes(campaign.key)) {
    assert.equal(offer?.description, "20% off the Holiday edit");
    assert.ok(offer?.availabilityStarts && offer?.availabilityEnds);
  } else {
    assert.equal(offer, undefined, `${campaign.key}: non-offer email must not emit fake DiscountOffer`);
  }
}

// Cart recovery puts the shopper's bag piece first in the Gmail carousel
const cartHtml = renderAmbEmail(findCampaign("cart-01"), {
  firstName: "Andre",
  cartItems: [{ slug: "brielle-satin-maxi-dress", size: "S", quantity: 1 }],
});
const cartCards = extractJsonLd(cartHtml, "cart-01").filter((entry) => entry["@type"] === "PromotionCard");
assert.equal(cartCards[0].image, "https://ambboutique.online/email-media/product/brielle-satin-maxi-dress.jpg");

// Transactional order confirmation + tracking update include Organization logo only
const orderHtml = renderAmbEmail(findCampaign("order-confirmed"), {
  firstName: "Andre",
  orderReference: "TEST123456",
  orderDetails: {
    items: [{ name: "Brielle Satin Maxi Dress", quantity: 1, size: "S", unitAmount: 118 }],
    currency: "USD",
    total: 118,
    deliveryMinBusinessDays: 12,
    deliveryMaxBusinessDays: 18,
  },
});
const orderData = extractJsonLd(orderHtml, "order-confirmed-details");
assert.equal(orderData.length, 1);
assert.equal(orderData[0]["@type"], "Organization");

const trackingEmail = renderAmbTrackingUpdateEmail({
  to: "andremuseu@gmail.com",
  firstName: "Andre",
  market: "US",
  snapshot: {
    session_id: "cs_test_1234567890",
    order_reference: "1234567890",
    status: "IN_TRANSIT",
    tracking_code: "AMBTEST123",
    carrier: "USPS",
    events: [],
    items: [],
  },
});
const trackingData = extractJsonLd(trackingEmail.html, "tracking-update");
assert.equal(trackingData.length, 1);
assert.equal(trackingData[0]["@type"], "Organization");

// Verify /email-media/product/<slug>.jpg produces exact 600x600 JPEG & rejects traversal
const sampleSlugs = [...checkedSlugs].slice(0, 6);
for (const slug of sampleSlugs) {
  const response = await emailMediaGet(new Request(`https://ambboutique.online/email-media/product/${slug}.jpg`), {
    params: Promise.resolve({ kind: "product", file: `${slug}.jpg` }),
  });
  assert.equal(response.status, 200, `product media failed for ${slug}`);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  const buffer = Buffer.from(await response.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 600);
  assert.equal(meta.height, 600);
}

const heroRes = await emailMediaGet(new Request("https://ambboutique.online/email-media/hero/amb-hero.jpg"), {
  params: Promise.resolve({ kind: "hero", file: "amb-hero.jpg" }),
});
assert.equal(heroRes.status, 200);
const heroMeta = await sharp(Buffer.from(await heroRes.arrayBuffer())).metadata();
assert.equal(heroMeta.format, "jpeg");
assert.equal(heroMeta.width, 1200);
assert.equal(heroMeta.height, 628);

const badRes = await emailMediaGet(new Request("https://ambboutique.online/email-media/product/..%2F..%2Fpackage.json"), {
  params: Promise.resolve({ kind: "product", file: "../../package.json" }),
});
assert.equal(badRes.status, 404);

// Verify public/bimi-logo.svg conforms to SVG Tiny 1.2 PS rules
const bimiSvg = fs.readFileSync(`${root}/public/bimi-logo.svg`, "utf8");
assert.ok(Buffer.byteLength(bimiSvg, "utf8") < 32 * 1024, "BIMI SVG must be under 32KB");
assert.match(bimiSvg, /version="1\.2"/);
assert.match(bimiSvg, /baseProfile="tiny-ps"/);
assert.match(bimiSvg, /viewBox="0 0 512 512"/);
assert.match(bimiSvg, /<title>AMB BOUTIQUE<\/title>/);
assert.doesNotMatch(bimiSvg, /<text\b|<script\b|<image\b|<style\b|href=|xlink:/i);

console.log(JSON.stringify({
  ok: true,
  campaignsChecked: allCampaigns.length,
  sampleProductJpegsVerified: sampleSlugs.length,
  bimiSvgBytes: Buffer.byteLength(bimiSvg, "utf8"),
}));
