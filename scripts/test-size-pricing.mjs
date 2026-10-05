import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { productPrice, productForSize, hasPriceRange } = load("../app/product-pricing.ts");
const catalog = load("../app/data.ts").products;
const legacy = catalog[0];
assert.equal(productForSize(legacy, undefined), legacy, "Legacy selection behavior must remain unchanged");
assert.equal(productPrice(legacy, "unmapped-size"), legacy.price);

const striped = {
  ...legacy,
  slug: "size-pricing-test-dress",
  name: "Striped Dress",
  sizes: ["S", "M", "L"],
  price: 111.9,
  sizePrices: { S: 111.9, M: 115.9, L: 115.9 },
  unitCostUsd: undefined,
  inboundFreightUsd: undefined,
  dutyUsd: undefined,
  packagingUsd: undefined,
};
assert.equal(productPrice(striped), 111.9);
assert.equal(productPrice(striped, "M"), 115.9);
assert.equal(productForSize(striped, "L").price, 115.9);
assert.equal(striped.price, 111.9, "Resolving a variant must not mutate the catalogue");
assert.equal(hasPriceRange(striped), true);
for (const size of [undefined, "XL", "__proto__", "toString"]) {
  assert.throws(() => productForSize(striped, size));
}
assert.throws(() => productPrice({ price: 1, sizePrices: { S: NaN } }, "S"));
assert.throws(() => productPrice({ price: 1, sizePrices: Object.create({ S: 1 }) }, "S"));

// Exercise the real checkout handler, replacing only payment/persistence boundaries.
// No payment session, email, database write or external network request is made.
const sessions = [];
const journeys = [];
function stub(path, exports) {
  const filename = load.resolve(path);
  load.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stub("../app/data.ts", { products: [striped, legacy] });
stub("../app/generated-products.ts", { generatedProducts: [striped, legacy] });
stub("../app/stripe-server.ts", {
  getStripe: () => ({ checkout: { sessions: { create: async (params) => {
    sessions.push(params);
    return { id: "cs_test_fixture", client_secret: "fixture-only" };
  } } } }),
});
stub("../app/email/commerce-lifecycle.ts", { recordCheckoutJourney: async (journey) => { journeys.push(journey); } });
const { POST } = load("../app/api/checkout/route.ts");

async function checkout(items) {
  return POST({ json: async () => ({ items, market: "US" }), nextUrl: { origin: "https://amb.example" } });
}
for (const [size, expectedMinor] of [["S", 11190], ["M", 11590], ["L", 11590]]) {
  const response = await checkout([{ slug: striped.slug, size, quantity: 2, price: 0.01 }]);
  assert.equal(response.status, 200);
  const params = sessions.at(-1);
  assert.equal(params.line_items[0].price_data.unit_amount, expectedMinor, "Submitted prices must be ignored");
  assert.equal(params.line_items[0].quantity, 2);
  assert.equal(params.line_items[0].price_data.product_data.metadata.size, size);
  assert.equal(journeys.at(-1).cart[0].priceUsd, expectedMinor / 100);
  assert.equal(journeys.at(-1).amountTotal, expectedMinor / 100 * 2);
}
for (const size of [undefined, "XL", "__proto__"]) {
  const count = sessions.length;
  const response = await checkout([{ slug: striped.slug, size, quantity: 1 }]);
  assert.equal(response.status, 400);
  assert.equal(sessions.length, count, "Invalid or missing size must never reach payment");
}
const legacyResponse = await checkout([{ slug: legacy.slug, quantity: 1 }]);
assert.equal(legacyResponse.status, 200);
assert.equal(sessions.at(-1).line_items[0].price_data.unit_amount, Math.round(legacy.price * 100));
console.log(JSON.stringify({ sizePrices: "passed", invalidSelections: "rejected before payment", forgedClientPrice: "ignored", checkoutAndJourneyParity: "passed", legacyBehavior: "preserved", externalActions: 0 }));
