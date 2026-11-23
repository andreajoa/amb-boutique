// Builds imports/product-delivery-seed.json: customer-safe fallback delivery
// windows extracted from existing reviewed quote proofs in imports/.
// Live Store Manager sync (Neon) overrides these values at runtime.
// Strictly strips all supplier identities, carrier names, and costs.
import fs from "node:fs";

const root = new URL("..", import.meta.url);
const importsDir = new URL("imports/", root);

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(new URL(relPath, root), "utf8"));
}

function parseDeliveryDays(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = Math.round(raw);
    return d >= 1 && d <= 60 ? { minDays: d, maxDays: d } : null;
  }
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;
  const range = text.match(/(\d{1,2})\s*(?:-|–|—|to|~)\s*(\d{1,2})/i);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (a >= 1 && a <= 60 && b >= 1 && b <= 60) {
      return { minDays: Math.min(a, b), maxDays: Math.max(a, b) };
    }
  }
  const single = text.match(/^(\d{1,2})\s*(?:days?|d)?$/i) || text.match(/\b(\d{1,2})\s*days?\b/i);
  if (single) {
    const d = Number(single[1]);
    if (d >= 1 && d <= 60) return { minDays: d, maxDays: d };
  }
  return null;
}

function normalizeMarket(code) {
  const c = String(code || "US").trim().toUpperCase();
  if (c === "GB" || c === "UK") return "UK";
  if (["US", "CA", "AU", "NZ"].includes(c)) return c;
  return "US";
}

// 1. Build sourceProductId -> [slugs] index from committed binding manifests
const slugsBySourceId = new Map();
function linkSlug(sourceProductId, slug) {
  const sid = String(sourceProductId || "").trim();
  const s = String(slug || "").trim().toLowerCase();
  if (!sid || !s) return;
  if (!slugsBySourceId.has(sid)) slugsBySourceId.set(sid, new Set());
  slugsBySourceId.get(sid).add(s);
}

for (const file of fs.readdirSync(importsDir).filter((name) => name.endsWith(".json")).sort()) {
  if (!file.includes("bindings")) continue;
  const doc = readJson(`imports/${file}`);
  const list = Array.isArray(doc.products) ? doc.products : [];
  for (const item of list) {
    if (item && typeof item === "object") {
      linkSlug(item.sourceProductId, item.slug);
    }
  }
}

// 2. Scan quote/proof JSON files for freight.estimatedDeliveryTime
const seed = {};
function recordWindow(slug, market, parsed) {
  const cleanSlug = String(slug || "").trim().toLowerCase();
  if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug) || !parsed) return;
  if (!seed[cleanSlug]) seed[cleanSlug] = {};
  seed[cleanSlug][market] = {
    minDays: parsed.minDays,
    maxDays: parsed.maxDays,
    source: "supplier-quote",
  };
}

function extractSnapshot(snapshot, targetSlugs) {
  if (!snapshot || typeof snapshot !== "object") return;
  const freight = snapshot.freight;
  if (!freight || typeof freight !== "object") return;
  const parsed = parseDeliveryDays(freight.estimatedDeliveryTime);
  if (!parsed) return;
  const market = normalizeMarket(snapshot.countryCode);
  for (const slug of targetSlugs) {
    recordWindow(slug, market, parsed);
  }
}

for (const file of fs.readdirSync(importsDir).filter((name) => name.endsWith(".json")).sort()) {
  if (file === "product-delivery-seed.json") continue;
  const rawText = fs.readFileSync(new URL(`imports/${file}`, root), "utf8");
  if (!rawText.includes("estimatedDeliveryTime")) continue;
  const doc = JSON.parse(rawText);

  // Pattern A: { slug, officialQuote: { costSnapshot } }
  if (typeof doc.slug === "string" && doc.officialQuote?.costSnapshot) {
    extractSnapshot(doc.officialQuote.costSnapshot, [doc.slug]);
  }

  // Pattern B: { sourceProductId, costSnapshot } or { body: { sourceProductId, costSnapshot } }
  const directBody = doc.body && typeof doc.body === "object" ? doc.body : doc;
  if (directBody.costSnapshot && directBody.sourceProductId) {
    const slugs = [...(slugsBySourceId.get(String(directBody.sourceProductId)) || [])];
    if (slugs.length) extractSnapshot(directBody.costSnapshot, slugs);
  }

  // Pattern C: { products: { [slug]: { response: { body: { costSnapshot } } } } }
  if (doc.products && typeof doc.products === "object" && !Array.isArray(doc.products)) {
    for (const [slug, entry] of Object.entries(doc.products)) {
      const snap = entry?.response?.body?.costSnapshot || entry?.costSnapshot;
      if (snap) extractSnapshot(snap, [slug]);
    }
  }

  // Pattern D: { quotes: { [slug]: { costSnapshot } | { body: { costSnapshot } } } }
  if (doc.quotes && typeof doc.quotes === "object" && !Array.isArray(doc.quotes)) {
    for (const [key, entry] of Object.entries(doc.quotes)) {
      const snap = entry?.costSnapshot || entry?.body?.costSnapshot || entry?.response?.body?.costSnapshot;
      if (!snap) continue;
      const explicitSlug = typeof entry?.slug === "string" ? [entry.slug] : [];
      const linked = entry?.sourceProductId ? [...(slugsBySourceId.get(String(entry.sourceProductId)) || [])] : [];
      const keySlug = /^[a-z0-9-]+$/.test(key) ? [key] : [];
      const targets = new Set([...explicitSlug, ...linked, ...keySlug]);
      extractSnapshot(snap, [...targets]);
    }
  }
}

const sortedSeed = Object.fromEntries(
  Object.entries(seed).sort((a, b) => a[0].localeCompare(b[0])),
);
const output = `${JSON.stringify(sortedSeed, null, 2)}\n`;
const target = new URL("imports/product-delivery-seed.json", root);

if (process.argv.includes("--check")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== output) {
    console.error("imports/product-delivery-seed.json is stale: run node scripts/build-product-delivery.mjs");
    process.exit(1);
  }
  console.log(`product-delivery-seed.json up to date (${Object.keys(sortedSeed).length} products)`);
} else {
  fs.writeFileSync(target, output);
  console.log(`product-delivery-seed.json written (${Object.keys(sortedSeed).length} products)`);
}
