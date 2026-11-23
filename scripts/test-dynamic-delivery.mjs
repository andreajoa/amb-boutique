import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const cache = new Map();
function loadMod(rel) {
  const full = path.resolve(rel);
  if (cache.has(full)) return cache.get(full);
  if (full.endsWith(".json")) {
    const data = JSON.parse(fs.readFileSync(full, "utf8"));
    const exp = { __esModule: true, default: data, ...data };
    cache.set(full, exp);
    return exp;
  }
  const src = fs.readFileSync(full, "utf8").replace(/^import "server-only";$/m, "");
  const out = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  cache.set(full, mod.exports);
  const fn = new Function("exports", "require", "module", "__filename", "__dirname", out);
  const localReq = (spec) => {
    if (spec.startsWith(".")) {
      const base = path.resolve(path.dirname(full), spec);
      if (fs.existsSync(base) && fs.statSync(base).isFile()) return loadMod(path.relative(process.cwd(), base));
      for (const ext of [".ts", ".tsx", ".json", "/index.ts"]) {
        if (fs.existsSync(base + ext)) return loadMod(path.relative(process.cwd(), base + ext));
      }
    }
    return {};
  };
  fn(mod.exports, localReq, mod, full, path.dirname(full));
  cache.set(full, mod.exports);
  return mod.exports;
}

const deliveryShared = loadMod("app/product-delivery-shared.ts");
const fit = loadMod("app/fit-engine.ts");
const seed = JSON.parse(fs.readFileSync(path.resolve("imports/product-delivery-seed.json"), "utf8"));

const nov23 = Date.UTC(2026, 10, 23, 12); // Mon Nov 23, 2026

// 1. Fast supplier (5 days) + 5-day Stripe payout/prep buffer -> 10-12 days total, Faster Delivery = true
const fast5 = fit.estimateDeliveryWindow("US", {
  nowMs: nov23,
  supplierWindow: { minDays: 5, maxDays: 5, source: "supplier-quote" },
  eventDateIso: "2026-12-08",
});
assert.equal(fast5.isSupplierLinked, true);
assert.equal(fast5.isFast, true);
assert.equal(fast5.unit, "calendar");
assert.equal(fast5.prepMinDays, 5);
assert.equal(fast5.windowLabel, "10–12 days");
assert.equal(fast5.minDateIso, "2026-12-03"); // Nov 23 + 5 prep + 5 transit
assert.equal(fast5.maxDateIso, "2026-12-05"); // Nov 23 + 5 prep + 7 transit
assert.equal(fast5.eventStatus, "on-time");
assert.match(fast5.eventLabel, /3 days before Dec 8/);

// 2. Medium supplier (10 days) + 5-day buffer -> 15-18 days total, Faster Delivery = false
const med10 = fit.estimateDeliveryWindow("US", {
  nowMs: nov23,
  supplierWindow: { minDays: 10, maxDays: 10, source: "supplier-quote" },
  eventDateIso: "2026-12-09",
});
assert.equal(med10.isSupplierLinked, true);
assert.equal(med10.isFast, false);
assert.equal(med10.windowLabel, "15–18 days");
assert.equal(med10.minDateIso, "2026-12-08"); // Nov 23 + 5 + 10
assert.equal(med10.maxDateIso, "2026-12-11"); // Nov 23 + 5 + 13
assert.equal(med10.eventStatus, "tight");

// 3. Slow supplier (28 days) + 5-day buffer -> honestly shows 33-37 days total
const slow28 = fit.estimateDeliveryWindow("US", {
  nowMs: nov23,
  supplierWindow: { minDays: 28, maxDays: 28, source: "supplier-quote" },
  eventDateIso: "2026-12-20",
});
assert.equal(slow28.isSupplierLinked, true);
assert.equal(slow28.isFast, false);
assert.equal(slow28.windowLabel, "33–37 days");
assert.equal(slow28.eventStatus, "too-soon");

// 4. Missing supplier window (null/undefined) -> seamless fallback to market business-day default
const fallbackUk = fit.estimateDeliveryWindow("UK", { nowMs: nov23, supplierWindow: null });
assert.equal(fallbackUk.isSupplierLinked, false);
assert.equal(fallbackUk.isFast, false);
assert.equal(fallbackUk.unit, "business");
assert.equal(fallbackUk.windowLabel, "10–21 business days");

// 5. Extended preparation notice overrides Fast Dispatch flag safely
const fastWithPrep = fit.estimateDeliveryWindow("US", {
  nowMs: nov23,
  supplierWindow: { minDays: 5, maxDays: 5 },
  preparationNotice: "Made to order — 5 to 8 business days preparation.",
});
assert.equal(fastWithPrep.isFast, false);
assert.equal(fastWithPrep.hasExtendedPrep, true);
assert.ok(fastWithPrep.minDateIso > fast5.maxDateIso, "Extended prep must push dates out cleanly");

// 6. Sanitization strips all forbidden supplier/carrier/cost fields
const dirtyInput = {
  "Valid-Dress-Slug": {
    markets: {
      US: { minDays: 6, maxDays: 8, source: "supplier-quote", sellerName: "AliExpress Secret", freightCost: 4.99, serviceName: "CAINIAO" },
      GB: { minDays: 9, maxDays: 11 },
      XX: { minDays: 2, maxDays: 3 },
    },
    sourceProductId: "32568123456",
  },
  "bad slug!": { US: { minDays: 5, maxDays: 5 } },
};
const clean = deliveryShared.sanitizeDeliveryWindowsMap(dirtyInput);
assert.ok(clean["valid-dress-slug"]?.US?.minDays === 6);
assert.ok(clean["valid-dress-slug"]?.UK?.minDays === 9, "GB must normalize to UK");
assert.equal(clean["valid-dress-slug"]?.XX, undefined);
assert.equal(clean["bad slug!"], undefined);
const cleanText = JSON.stringify(clean).toLowerCase();
for (const forbidden of ["aliexpress", "cainiao", "seller", "freight", "32568123456", "4.99"]) {
  assert.ok(!cleanText.includes(forbidden), `Sanitized map leaked forbidden field: ${forbidden}`);
}

// 7. Seed file integrity & zero leakage
const seedSlugs = Object.keys(seed);
assert.ok(seedSlugs.length >= 5, `Expected at least 5 seeded products, got ${seedSlugs.length}`);
const seedText = JSON.stringify(seed).toLowerCase();
for (const forbidden of ["aliexpress", "yunexpress", "cainiao", "seller", "cost", "sourceproductid"]) {
  assert.ok(!seedText.includes(forbidden), `Seed leaked forbidden token: ${forbidden}`);
}

console.log(JSON.stringify({
  ok: true,
  fast5: { range: fast5.rangeLabel, label: fast5.windowLabel, isFast: fast5.isFast },
  med10: { range: med10.rangeLabel, label: med10.windowLabel, status: med10.eventStatus },
  slow28: { range: slow28.rangeLabel, label: slow28.windowLabel, status: slow28.eventStatus },
  fallbackUk: { range: fallbackUk.rangeLabel, label: fallbackUk.windowLabel },
  seededProducts: seedSlugs.length,
}));
