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

const { products } = loadMod("app/data.ts");
const fit = loadMod("app/fit-engine.ts");

// 1. Verify all 61 real catalog size tokens normalize without throwing
let normalizedApparel = 0;
let normalizedOther = 0;
for (const p of products) {
  for (const s of p.sizes || []) {
    const res = fit.normalizeApparelSizeToken(s);
    assert.ok(res && res.kind, `Failed to normalize size token ${s}`);
    if (res.kind === "apparel") normalizedApparel++;
    else normalizedOther++;
  }
}
assert.equal(fit.normalizeApparelSizeToken("XS（old）").us, 2);
assert.equal(fit.normalizeApparelSizeToken("US 8").us, 8);
assert.equal(fit.normalizeApparelSizeToken("18 W").us, 18);
assert.equal(fit.normalizeApparelSizeToken("2XL").us, 16);
assert.equal(fit.normalizeApparelSizeToken("One size fits all").kind, "one-size");
assert.equal(fit.normalizeApparelSizeToken("39").kind, "shoe");

// 2. Verify quick mode & measurements mode across real AMB dresses
const prado = products.find((p) => p.slug === "prado-vneck-print-midi-dress");
const emerald = products.find((p) => p.slug === "evelisse-cowl-neck-velvet-mini-dress-emerald-style-07");
const burgundy = products.find((p) => p.slug === "evelisse-cowl-neck-velvet-mini-dress-burgundy-style-23");
const fioDourado = products.find((p) => p.slug === "fio-dourado-swing-midi-dress");
const calla = products.find((p) => p.slug === "calla-maxi-dress");
assert.ok(prado && emerald && burgundy && fioDourado && calla, "All 4 Dressing Room dresses and Calla Maxi must exist in catalog");

const petiteProfile = {
  mode: "quick",
  heightCm: 157, // 5'2"
  weightKg: 52,
  usualSystem: "US",
  usualSize: "4",
  bodyShape: "petite",
  fitPreference: "true",
};
const petiteCalla = fit.recommendSizeForProduct(calla, petiteProfile);
assert.equal(petiteCalla.supported, true);
assert.equal(petiteCalla.recommendedSize, "S");
assert.match(petiteCalla.hemline.label, /Floor-sweeping/i);

const tallMeasurements = {
  mode: "measurements",
  heightCm: 178, // 5'10"
  weightKg: 70,
  usualSystem: "US",
  usualSize: "10",
  bodyShape: "tall",
  fitPreference: "true",
  bustIn: 38,
  waistIn: 30,
  hipIn: 40.5,
};
const tallCalla = fit.recommendSizeForProduct(calla, tallMeasurements);
assert.ok(["M", "L"].includes(tallCalla.recommendedSize), `Expected M or L, got ${tallCalla.recommendedSize}`);
assert.match(tallCalla.hemline.label, /Ankle-length/i);

// 3. Shoes & Bags handled honestly without fake dress sizing
const shoe = products.find((p) => p.category === "Shoes");
const bag = products.find((p) => p.category === "Bags");
assert.equal(fit.recommendSizeForProduct(shoe, petiteProfile).supported, false);
assert.equal(fit.recommendSizeForProduct(bag, petiteProfile).isOneSize, true);

// 4. Calendar delivery estimation & event date check
const nov23 = Date.UTC(2026, 10, 23, 12); // Mon Nov 23, 2026
const usDelivery = fit.estimateDeliveryWindow("US", { nowMs: nov23, eventDateIso: "2026-12-24" });
assert.equal(usDelivery.market, "US");
assert.equal(usDelivery.eventStatus, "on-time");
assert.match(usDelivery.eventLabel, /before Dec 24/i);

const tooSoon = fit.estimateDeliveryWindow("US", { nowMs: nov23, eventDateIso: "2026-12-01" });
assert.equal(tooSoon.eventStatus, "too-soon");

// 5. Personal Fit Studio catalog ranker returns rich in-stock matches
const ranked = fit.rankProductsForStylist(products, {
  profile: {
    mode: "quick",
    heightCm: 165,
    weightKg: 64,
    usualSystem: "US",
    usualSize: "8",
    bodyShape: "pear",
    fitPreference: "true",
  },
  occasion: "wedding-guest",
  lengthPref: "midi",
  colorPref: "any",
  limit: 12,
});
assert.ok(ranked.length >= 8, `Expected at least 8 ranked midi wedding-guest matches, got ${ranked.length}`);
assert.ok(ranked.every((r) => r.recommendation.supported && r.matchReasons.length >= 1));

// 6. Verify 4 Dressing Room WebP assets exist and are valid non-empty WebPs
for (const n of ["01", "02", "03", "04"]) {
  const file = path.resolve(`public/editorial/dressing-room/look-${n}.webp`);
  assert.ok(fs.existsSync(file), `Missing Dressing Room image: ${file}`);
  assert.ok(fs.statSync(file).size > 15_000, `Dressing Room image too small: ${file}`);
}

console.log(JSON.stringify({
  ok: true,
  productsChecked: products.length,
  normalizedApparel,
  normalizedOther,
  usDeliveryRange: usDelivery.rangeLabel,
  rankedSampleTop3: ranked.slice(0, 3).map((r) => ({ slug: r.product.slug, size: r.recommendation.recommendedSize, score: r.matchScore })),
}));
