import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildEditorialLooks, detectHumanModelPhoto } from "./build-editorial-looks.mjs";

const result = await buildEditorialLooks();
assert.equal(result.looks.length, 4, "Four Looks must always contain exactly 4 items");

const forbiddenMannequins = new Set([
  "vespera-tailored-vest-trouser-set-black",
  "auralie-open-back-sequin-mini-dress-lime",
  "loretta-cold-shoulder-midi-dress-burnt-orange",
  "sorelle-draped-halter-maxi-dress-taupe",
  "orlena-lace-balloon-sleeve-mini-dress-black",
  "serenella-ruffle-corset-three-piece-set-pink",
  "cerelia-lace-corset-mini-dress-white",
  "marena-frayed-hem-denim-shorts-red",
  "nerelle-sleeveless-swing-mini-dress-chestnut-brown",
]);

const families = new Set();
for (const look of result.looks) {
  assert.ok(!forbiddenMannequins.has(look.slug), `Mannequin leaked into Four Looks: ${look.slug}`);
  assert.notEqual(look.category, "Bags");
  assert.notEqual(look.category, "Shoes");
  const family = look.name.split("—")[0].trim().toLowerCase();
  assert.ok(!families.has(family), `Duplicate style family in Four Looks: ${family}`);
  families.add(family);
  const fullImg = path.resolve("public", look.image.split("?")[0].replace(/^\//, ""));
  assert.ok(fs.existsSync(fullImg), `Missing image file for look ${look.slug}: ${fullImg}`);
}

// Verify classifier directly on unseen mannequin vs human model photos
const mannequinCheck = await detectHumanModelPhoto("/products/loretta-cold-shoulder-midi-dress-burnt-orange/front.webp");
assert.equal(mannequinCheck.isModel, false, `Expected mannequin=false, got ${JSON.stringify(mannequinCheck)}`);

const modelCheck = await detectHumanModelPhoto("/products/aster-eyelet-two-piece-set-beige/front.webp");
assert.equal(modelCheck.isModel, true, `Expected model=true, got ${JSON.stringify(modelCheck)}`);

// Verify ordering is strictly newest-first
for (let i = 1; i < result.looks.length; i++) {
  assert.ok(
    result.looks[i - 1].arrivalRank >= result.looks[i].arrivalRank,
    "Four Looks must be ordered newest-first",
  );
}

console.log(JSON.stringify({
  ok: true,
  fourLooks: result.looks.map((l) => ({ slug: l.slug, rank: l.arrivalRank, eyebrow: l.eyebrow })),
  mannequinCheck,
  modelCheck,
}));
