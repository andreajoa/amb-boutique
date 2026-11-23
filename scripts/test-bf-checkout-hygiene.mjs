import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const load = createRequire(root + "/package.json");
const ts = load("typescript");

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

let capturedCheckout = null;
function stub(relPath, exportsObj) {
  const resolved = load.resolve(root + relPath);
  load.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exportsObj };
}
stub("/app/stripe-server.ts", {
  getStripe: () => ({
    checkout: {
      sessions: {
        create: async (params) => {
          capturedCheckout = params;
          return { id: "cs_fixture_bf_hygiene", client_secret: "secret_fixture" };
        },
      },
    },
  }),
});
stub("/app/email/commerce-lifecycle.ts", { recordCheckoutJourney: async () => {} });
stub("/app/analytics/db.ts", { getAnalyticsSql: () => null, jsonForDatabase: JSON.stringify });

const { products } = load(root + "/app/data.ts");
const { getMerchantImage, getMerchantAdditionalImages } = load(root + "/app/merchant.ts");
const { POST: quotePost } = load(root + "/app/api/cart/quote/route.ts");
const { POST: checkoutPost } = load(root + "/app/api/checkout/route.ts");
const legacyUnproven = new Set(JSON.parse(fs.readFileSync(root + "/imports/cost-unproven-legacy-20261028.json", "utf8")).slugs);

// 1. Zero alicdn URLs across all products in merchant helpers + local cropped files exist
for (const product of products) {
  const primary = getMerchantImage(product);
  const additional = getMerchantAdditionalImages(product);
  for (const url of [primary, ...additional].filter(Boolean)) {
    assert.ok(!/alicdn|aliexpress/i.test(url), `Supplier CDN leaked for ${product.slug}: ${url}`);
  }
}
for (const slug of ["solene-woven-slingback", "monaco-buckle-slingback", "onyx-buckle-pump"]) {
  const product = products.find((item) => item.slug === slug);
  assert.ok(product, `Expected shoe product ${slug}`);
  const img = getMerchantImage(product);
  assert.equal(img, `https://ambboutique.online/products/${slug}/merchant-primary.webp`);
  assert.ok(fs.existsSync(`${root}/public/products/${slug}/merchant-primary.webp`));
}

// 2. Quote endpoint matches Checkout penny-for-penny when Black Friday + complimentary shipping subsidy caps approvedPercent
const { protectMargin } = load(root + "/app/profitability.ts");
const subsidyImpacted = products.find((p) => {
  if (!(p.stock > 0 && p.price > 0 && p.sizes?.length && p.colorNames?.length)) return false;
  const qty = Math.max(1, Math.ceil(200 / p.price));
  if (qty > Math.min(10, p.stock)) return false;
  const weightOz = (p.weightOz || 12) * qty;
  if (weightOz > 64) return false;
  const shippingUsd = weightOz <= 16 ? 11.95 : weightOz <= 32 ? 17.65 : 22.45;
  return protectMargin(p, 25, 0).approvedPercent > protectMargin(p, 25, shippingUsd / qty).approvedPercent;
});
assert.ok(subsidyImpacted, "Expected a proven product whose 25% Black Friday discount is capped by complimentary US shipping subsidy");
const qtyA = Math.max(1, Math.ceil(200 / subsidyImpacted.price));
const lineA = {
  id: `${subsidyImpacted.slug}:${subsidyImpacted.sizes[0]}:${subsidyImpacted.colorNames[0]}:no-heel-variant:standard`,
  slug: subsidyImpacted.slug,
  quantity: qtyA,
  size: subsidyImpacted.sizes[0],
  color: subsidyImpacted.colorNames[0],
};

const quoteRes = await quotePost(new Request("http://127.0.0.1:3000/api/cart/quote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ market: "US", promotionCode: "AMBWELCOME10", items: [lineA] }),
}));
assert.equal(quoteRes.status, 200);
const quoteText = await quoteRes.text();
for (const forbidden of ["landedCost", "unitCost", "floorPrice", "marginPercent", "sourceProductId", "sourceColor"]) {
  assert.ok(!quoteText.includes(forbidden), `Quote response leaked ${forbidden}`);
}
const quoteBody = JSON.parse(quoteText);

const checkoutReq = new Request("http://127.0.0.1:3000/api/checkout", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ market: "US", promotionCode: "AMBWELCOME10", items: [lineA] }),
});
checkoutReq.nextUrl = new URL("http://127.0.0.1:3000/api/checkout");
const checkoutRes = await checkoutPost(checkoutReq);
assert.equal(checkoutRes.status, 200);
assert.ok(capturedCheckout, "Checkout session should be created");

const stripeLineTotalUsd = Number(((capturedCheckout.line_items[0].price_data.unit_amount * qtyA) / 100).toFixed(2));
assert.ok(Math.abs(quoteBody.estimatedTotalUsd - stripeLineTotalUsd) <= 0.03, `Cart quote (${quoteBody.estimatedTotalUsd}) must match Stripe Checkout (${stripeLineTotalUsd})`);
assert.ok(quoteBody.lines[lineA.id].approvedPercent < 25, "Subsidy-capped percent should reflect shipping cost (< 25%)");
assert.equal(quoteBody.lines[lineA.id].excluded, false);

// 3. Unproven legacy product is flagged as excluded when an offer is active
const unproven = products.find((p) => legacyUnproven.has(p.slug) && p.stock > 0 && p.sizes?.length && p.colorNames?.length);
assert.ok(unproven, "Expected at least one legacy unproven product");
const legacyLine = {
  id: `${unproven.slug}:${unproven.sizes[0]}:${unproven.colorNames[0]}:no-heel-variant:standard`,
  slug: unproven.slug,
  quantity: 1,
  size: unproven.sizes[0],
  color: unproven.colorNames[0],
};
const legacyQuoteRes = await quotePost(new Request("http://127.0.0.1:3000/api/cart/quote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ market: "US", promotionCode: "AMBWELCOME10", items: [legacyLine] }),
}));
const legacyQuote = await legacyQuoteRes.json();
assert.equal(legacyQuote.hasIneligibleItems, true);
assert.equal(legacyQuote.lines[legacyLine.id].excluded, true);
assert.equal(legacyQuote.effectiveDiscountUsd, 0);

// 4. Privacy & brand hygiene static source checks
const trackPageSource = fs.readFileSync(root + "/app/track-order/page.tsx", "utf8");
assert.ok(!trackPageSource.includes("3VTGBXIJUB"), "Hardcoded real order reference must be removed");
const merchantSource = fs.readFileSync(root + "/app/merchant.ts", "utf8");
assert.ok(!/alicdn|aliexpress/i.test(merchantSource), "merchant.ts must not contain supplier CDN URLs");
const storeProviderSource = fs.readFileSync(root + "/app/store-provider.tsx", "utf8");
assert.ok(storeProviderSource.includes("setCartOpen(false)") && storeProviderSource.includes('pathname !== "/checkout"'));

console.log(JSON.stringify({
  ok: true,
  productsChecked: products.length,
  quoteMatchesStripeUsd: stripeLineTotalUsd,
  quoteApprovedPercent: quoteBody.lines[lineA.id].approvedPercent,
  legacyExcludedDetected: true,
  alicdnMatches: 0,
}));
