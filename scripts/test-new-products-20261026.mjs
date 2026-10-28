import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
// Evaluate the baseline catalog in an independent process using its Git sources.
// Nothing is checked out or written into another worker's checkout.
const baselineLoader = `
const fs=require('fs'),path=require('path'),cp=require('child_process'),ts=require('typescript');
const root=process.cwd(),ref=process.env.AMB_CATALOG_BASE_REF||'origin/main';
global.fetch=()=>{throw Error('Network forbidden in catalog comparison')};
require.extensions['.ts']=(m,f)=>{const relative=path.relative(root,f).split(path.sep).join('/');
 const source=cp.execFileSync('git',['show',ref+':'+relative],{encoding:'utf8'});
 m._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f)};
process.stdout.write(JSON.stringify(require('./app/data.ts').products));`;
const baseline = JSON.parse(execFileSync(process.execPath, ["-e", baselineLoader], {
  cwd: root, env: process.env, maxBuffer: 16 * 1024 * 1024, encoding: "utf8",
}));
const { products } = load("../app/data.ts");
const { stockForSize } = load("../app/product-inventory.ts");
const plan = JSON.parse(fs.readFileSync(path.join(root, "imports/catalog-20261026-new-products-bindings.json"), "utf8"));
const additions = plan.products.filter(binding => !baseline.some(product => product.slug === binding.slug));
assert.equal(products.length, baseline.length + additions.length);
assert.equal(new Set(products.map(p => p.slug)).size, products.length);
const protectedSlugs = new Set(baseline.filter(p => p.images?.some(i => i.includes("-20261025"))).map(p => p.slug));
const protectedCount = protectedSlugs.size;
assert.equal(protectedCount, 93, "Reconcile the protected set if the base catalog changes");
const refresh = JSON.parse(fs.readFileSync(path.join(root, "imports/catalog-20261028-stock-cap-refresh.json"), "utf8"));
assert.deepEqual(refresh.changes.map(c => [c.slug,c.size,c.sourceSkuId,c.stockBefore,c.stockAfter]), [
  ["ameixa-velvet-cowl-dress","L","12000053435360222",65,64],
  ["evelisse-cowl-neck-velvet-mini-dress-champagne-style-05","XXL","12000053435360200",64,63],
  ["vionelle-lace-sleeve-asymmetric-mini-dress-burgundy-style-17","XXL","12000053435360272",65,64],
]);
const baselinePlan = JSON.parse(execFileSync("git", ["show", `${process.env.AMB_CATALOG_BASE_REF || "origin/main"}:imports/catalog-20261026-new-products-bindings.json`], { cwd:root, encoding:"utf8" }));
let refreshedExisting = 0;
for (const old of baseline) {
  const change = refresh.changes.find(c => c.slug === old.slug);
  let expected = old;
  if (change) {
    assert.ok(!protectedSlugs.has(old.slug), "A protected Claude product cannot receive this refresh");
    assert.equal(change.productStockBefore-change.productStockAfter, change.stockBefore-change.stockAfter);
    const previous = baselinePlan.products.find(p => p.slug === old.slug);
    assert.ok(previous);assert.equal(previous.sourceSkuIdsBySize[change.size],change.sourceSkuId);
    if (old.stock === change.productStockBefore) {
      assert.equal(previous.stockBySize[change.size],change.stockBefore);
      expected = {...old, stock:change.productStockAfter};refreshedExisting++;
    } else {
      assert.equal(old.stock,change.productStockAfter);
      assert.equal(previous.stockBySize[change.size],change.stockAfter);
    }
  }
  assert.deepEqual(JSON.parse(JSON.stringify(products.find(p => p.slug === old.slug))), expected, `Unapproved existing product change: ${old.slug}`);
}
for (const previous of baselinePlan.products) {
  const change = refresh.changes.find(c => c.slug === previous.slug);
  const expected = change ? {...previous, stockBySize:{...previous.stockBySize,[change.size]:change.stockAfter}} : previous;
  assert.deepEqual(plan.products.find(p => p.slug === previous.slug),expected,`Existing binding changed beyond reviewed stock cap: ${previous.slug}`);
}
for (const binding of plan.products) {
  const p = products.find(p => p.slug === binding.slug);
  assert.equal(p.sourceProductId, binding.sourceProductId);
  assert.equal(p.sourceColor, binding.sourceColor);
  assert.deepEqual(p.sizes.slice().sort(), Object.keys(binding.sourceSkuIdsBySize).sort());
  assert.equal(p.stock, Object.values(binding.stockBySize).reduce((a, b) => a + b, 0));
  for (const size of p.sizes) {
    assert.ok(binding.stockBySize[size] > 0);
    assert.equal(stockForSize(p, size), binding.stockBySize[size]);
    assert.ok(Math.round(p.price * 100) >= Math.round(binding.landedCostUsdBySize[size] * 100) * 3, `Markup below3x: ${size}`);
  }
  for (const size of ["S", "M", "L", "XL", "XXL", "XXXL", "XS", "XS（old）"]) {
    if (!p.sizes.includes(size)) assert.equal(stockForSize(p, size), 0, "Unavailable source size must not be offered");
  }
  assert.equal(p.images.length, 4);
  const hashes = [];
  for (const [index, view] of ["front", "back", "left", "right"].entries()) {
    assert.ok(p.images[index].endsWith(`/${view}-20261026.webp`));
    const bytes = fs.readFileSync(path.join(root, "public", p.images[index]));
    const info = await sharp(bytes).metadata();
    assert.equal(info.width, 1600); assert.equal(info.height, 1600);
    assert.equal(info.space, "srgb"); assert.ok(info.icc?.length);
    hashes.push(crypto.createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(new Set(hashes).size, 4, "Duplicate gallery views");
}
console.log(JSON.stringify({ before: baseline.length, after: products.length, unchangedExistingProducts: baseline.length-refreshedExisting, existingStockCapsRefreshed:refreshedExisting,
  protectedClaudeProducts: protectedCount, newProducts: additions.length, priceRule: "at least3x confirmed landed cost", gallery: "4 unique1600px sRGB views" }));
