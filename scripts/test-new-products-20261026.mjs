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
assert.equal(products.length, baseline.length + plan.products.length);
assert.equal(new Set(products.map(p => p.slug)).size, products.length);
for (const old of baseline) assert.deepEqual(JSON.parse(JSON.stringify(products.find(p => p.slug === old.slug))), old, `Existing product changed: ${old.slug}`);
const protectedCount = baseline.filter(p => p.images?.some(i => i.includes("-20261025"))).length;
assert.equal(protectedCount, 93, "Reconcile the protected set if the base catalog changes");
for (const binding of plan.products) {
  assert.ok(!baseline.some(p => p.slug === binding.slug), "Addition already published");
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
  assert.equal(stockForSize(p, "L"), 0, "Unavailable source size must not be offered");
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
console.log(JSON.stringify({ before: baseline.length, after: products.length, unchangedExistingProducts: baseline.length,
  protectedClaudeProducts: protectedCount, newProducts: plan.products.length, priceRule: "at least3x confirmed landed cost", gallery: "4 unique1600px sRGB views" }));
