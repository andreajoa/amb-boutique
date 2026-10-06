import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import ts from "typescript";

// Exercise real handlers/renderers with payment, database and email boundaries
// replaced. No external request, session, order, payment or email is created.
globalThis.fetch = async () => { throw new Error("External requests forbidden in this test"); };
const load = createRequire(import.meta.url);
const compile = (source, filename) => ts.transpileModule(source.replace(/^import "server-only";$/m, ""), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  fileName: filename,
}).outputText;
for (const extension of [".ts", ".tsx"]) {
  load.extensions[extension] = (module, filename) => module._compile(compile(fs.readFileSync(filename, "utf8"), filename), filename);
}
function stub(path, exports) {
  const filename = load.resolve(path);
  load.cache[filename] = { id: filename, filename, loaded: true, exports };
}
function baseline(path) {
  const filename = load.resolve(path);
  const relative = filename.slice(process.cwd().length + 1);
  const source = execFileSync("git", ["show", `3835c8ce5979941c69c25742a232a3c2d66695a7:${relative}`], { encoding: "utf8" });
  const compiledModule = new Module(filename);
  compiledModule.filename = filename;
  compiledModule.paths = load.resolve.paths(path);
  compiledModule._compile(compile(source, filename), filename);
  return compiledModule.exports;
}

const { getPreparationNotice } = load("../app/product-fulfillment.ts");
const normal = { slug: "fixture-standard", name: "Standard", category: "Dresses", price: 120, unitCostUsd: 35, minimumMarginPercent: 40, stock: 50, weightOz: 12, sizes: ["S", "M"], colors: ["#000000"], sheet: "one", quadrant: 1 };
const gownNotice = "Made to order. Please allow approximately 10–30 days for production before dispatch. Delivery time is additional.";
const suitNotice = "Extended preparation. Please allow approximately 3–15 business days before dispatch. Delivery time is additional.";
const gown = { ...normal, slug: "fixture-gown", name: "Gown", price: 330.9, unitCostUsd: 109.98, weightOz: 70.55, fulfillment: { kind: "made-to-order", notice: gownNotice } };
const suit = { ...normal, slug: "fixture-suit", name: "Suit", price: 447.9, unitCostUsd: 149.24, weightOz: 70.55, fulfillment: { kind: "extended-preparation", notice: suitNotice } };
assert.equal(getPreparationNotice(undefined), undefined);
assert.equal(getPreparationNotice(normal), undefined);
assert.equal(getPreparationNotice({ fulfillment: { kind: "made-to-order", notice: "  " } }), undefined);
assert.equal(getPreparationNotice(gown), gownNotice);
const catalog = [normal, gown, suit];
stub("../app/data.ts", { products: catalog });
stub("../app/generated-products.ts", { generatedProducts: catalog });
const sessions = [], journeys = [];
stub("../app/stripe-server.ts", { getStripe: () => ({ checkout: { sessions: { create: async (params) => {
  sessions.push(params);
  return { id: "cs_fixture_only", client_secret: "fixture-not-a-real-secret" };
} } } }) });
stub("../app/email/commerce-lifecycle.ts", { recordCheckoutJourney: async (journey) => journeys.push(journey) });
const { POST } = load("../app/api/checkout/route.ts");
const oldCheckout = baseline("../app/api/checkout/route.ts").POST;
const now = Date.now;
Date.now = () => 1791200000000;
const request = (items, market = "US") => ({ json: async () => ({ items, market }), nextUrl: { origin: "https://offline.example" } });
const line = (product) => ({ slug: product.slug, size: "S", color: "Selected", quantity: 1, preparationNotice: "Ships today", fulfillment: { notice: "Ships today" } });
const { getShippingQuotes } = load("../app/commerce.ts");

for (const market of ["US", "CA", "UK", "AU", "NZ"]) {
  const items = [line(normal)];
  assert.equal((await oldCheckout(request(items, market))).status, 200);
  const previousParams = sessions.at(-1), previousJourney = journeys.at(-1);
  assert.equal((await POST(request(items, market))).status, 200);
  assert.deepEqual(sessions.at(-1), previousParams, "Normal checkout params must remain identical to published baseline");
  assert.deepEqual(journeys.at(-1), previousJourney, "Normal checkout persistence must remain identical");
}

for (const selected of [[gown], [suit], [normal, gown], [normal, suit], [normal, gown, suit]]) {
  const items = selected.map(line);
  assert.equal((await oldCheckout(request(items))).status, 200);
  const oldParams = sessions.at(-1);
  assert.equal((await POST(request(items))).status, 200);
  const params = sessions.at(-1), journey = journeys.at(-1);
  assert.equal(params.shipping_options[0].shipping_rate_data.delivery_estimate, undefined);
  const { delivery_estimate, ...oldRate } = oldParams.shipping_options[0].shipping_rate_data;
  assert.ok(delivery_estimate);
  assert.deepEqual(params.shipping_options[0].shipping_rate_data, oldRate, "Only unsupported timing changes; shipping charges/service remain identical");
  assert.match(params.custom_text.shipping_address.message, /before dispatch/);
  for (const [index, product] of selected.entries()) {
    const price = params.line_items[index].price_data;
    assert.equal(price.unit_amount, oldParams.line_items[index].price_data.unit_amount, "Offers and prices must remain unchanged");
    const expected = getPreparationNotice(product);
    assert.equal(price.product_data.metadata.preparation_notice, expected);
    assert.equal(journey.cart[index].preparationNotice, expected);
    assert.equal(price.product_data.description.includes("Ships today"), false, "Client timing must never override catalog");
    if (expected) assert.ok(price.product_data.description.includes(expected));
  }
  assert.equal(journey.amountTotal, selected.reduce((sum, product) => sum + product.price, 0));
  assert.ok(params.metadata.preparation_notice.includes(getPreparationNotice(selected.find((product) => product.fulfillment))));
  const quote = getShippingQuotes("US", journey.amountTotal, selected.reduce((sum, product) => sum + product.weightOz, 0))[0];
  assert.equal(params.shipping_options[0].shipping_rate_data.fixed_amount.amount, Math.round(quote.amountUsd * 100));
}
for (const market of ["CA", "UK", "AU", "NZ"]) {
  const count = sessions.length;
  const response = await POST(request([line(gown)], market));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /live carrier quote/);
  assert.equal(sessions.length, count, "64oz guard must reject before payment boundary");
}
Date.now = now;

// The real PDP server page must suppress its default short handling window.
stub("../app/products/[slug]/product-detail.tsx", { default: () => null });
const ProductPage = load("../app/products/[slug]/page.tsx").default;
const OldProductPage = baseline("../app/products/[slug]/page.tsx").default;
const structuredData = async (page, product) => {
  const tree = await page({ params: Promise.resolve({ slug: product.slug }), searchParams: Promise.resolve({ size: "S" }) });
  const script = tree.props.children.find((child) => child?.props?.type === "application/ld+json");
  return JSON.parse(script.props.dangerouslySetInnerHTML.__html);
};
assert.deepEqual(await structuredData(ProductPage, normal), await structuredData(OldProductPage, normal));
for (const product of [gown, suit]) {
  const data = await structuredData(ProductPage, product);
  assert.equal(data.offers.shippingDetails.deliveryTime, undefined);
  assert.equal(data.offers.price, product.price.toFixed(2));
  assert.equal(data.offers.availability, "https://schema.org/InStock");
}

// Complete the real lifecycle using in-memory SQL/email boundaries and verify
// its saved preparation text survives a changed catalog and reaches renderer.
const deliveries = [];
let storedCart = journeys.at(-1).cart;
// Next resolves the server-only bundler marker; this isolated Node compiler
// omits only that marker while database and send implementations stay stubbed.
stub("../app/analytics/db.ts", { jsonForDatabase: JSON.stringify, getAnalyticsSql: () => async (parts) => {
  const query = parts.join("?");
  if (query.includes("INSERT INTO amb_contacts")) return [{ id: 1, first_name: "Offline", email_consent: false, unsubscribed_at: null }];
  if (query.includes("RETURNING id, visitor_id, cart")) return [{ id: 1, visitor_id: null, cart: storedCart }];
  return [];
} });
stub("../app/email/send.ts", { cancelJourneyEmails: async () => {}, scheduleEmailSequence: async () => {}, scheduleRecoverySequence: async () => {}, sendAmbEmail: async (details) => deliveries.push(details) });
delete load.cache[load.resolve("../app/email/commerce-lifecycle.ts")];
const { completeJourney } = load("../app/email/commerce-lifecycle.ts");
const session = { id: "cs_fixture_only", currency: "usd", amount_total: 10000, customer_details: { email: "offline@example.test" }, metadata: { market: "US", preparation_notice: sessions.at(-1).metadata.preparation_notice } };
gown.fulfillment.notice = "Future catalog wording must not replace paid-order snapshot";
await completeJourney(session);
const details = deliveries.at(-1).orderDetails;
assert.equal(details.items.find((item) => item.name === "Gown").preparationNotice, gownNotice);
const { renderAmbEmail } = load("../app/email/template.ts");
const oldRender = baseline("../app/email/template.ts").renderAmbEmail;
const campaign = { key: "order-confirmed" };
const html = renderAmbEmail(campaign, { orderDetails: details });
assert.ok(html.includes(gownNotice));
assert.ok(html.includes(suitNotice));
assert.match(html, /Estimated transit after preparation and dispatch/);
assert.equal(html.includes("Estimated delivery window:"), false);
assert.equal(html.includes(gown.fulfillment.notice), false);
storedCart = [];
await completeJourney(session);
assert.ok(renderAmbEmail(campaign, { orderDetails: deliveries.at(-1).orderDetails }).includes(gownNotice), "Session metadata is a fallback if journey lines are missing");
const normalDetails = { ...details, items: [{ name: "Standard", quantity: 1, unitAmount: 120 }], preparationNotice: undefined };
assert.equal(renderAmbEmail(campaign, { orderDetails: normalDetails }).replace(/\s+/g, " "), oldRender(campaign, { orderDetails: normalDetails }).replace(/\s+/g, " "), "Normal confirmation behavior remains unchanged");
const escaped = renderAmbEmail(campaign, { orderDetails: { ...normalDetails, preparationNotice: "<dispatch & delivery>" } });
assert.ok(escaped.includes("&lt;dispatch &amp; delivery&gt;"));
assert.equal(escaped.includes("<dispatch & delivery>"), false);
console.log(JSON.stringify({ helper: "PASS", checkout: "standard5markets + extended/mixed5baskets PASS", canonicalNotices: "PASS", shippingAndPricesUnchanged: "PASS", international64ozGuard: "PASS", jsonLd: "PASS", confirmationSnapshotAndFallback: "PASS", normalPublishedBaselineParity: "PASS", externalActions: 0 }));
