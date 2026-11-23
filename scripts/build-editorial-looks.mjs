import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import ts from "typescript";

const root = process.cwd();
const overridesPath = path.join(root, "imports", "editorial-model-overrides.json");
const outputPath = path.join(root, "imports", "editorial-four-looks.json");

const ELIGIBLE_CATEGORIES = new Set(["Dresses", "Sets", "Playsuits", "Tops", "Skirts", "Pants", "Knitwear"]);
const FACE_EDGE_THRESHOLD = 40;

const moduleCache = new Map();
function loadTsModule(relPath) {
  const full = path.resolve(root, relPath);
  if (moduleCache.has(full)) return moduleCache.get(full);
  if (full.endsWith(".json")) {
    const data = JSON.parse(fs.readFileSync(full, "utf8"));
    const exp = { __esModule: true, default: data, ...data };
    moduleCache.set(full, exp);
    return exp;
  }
  const source = fs.readFileSync(full, "utf8").replace(/^import "server-only";$/m, "");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  moduleCache.set(full, mod.exports);
  const localRequire = (spec) => {
    if (!spec.startsWith(".")) return {};
    const base = path.resolve(path.dirname(full), spec);
    if (fs.existsSync(base) && fs.statSync(base).isFile()) {
      return loadTsModule(path.relative(root, base));
    }
    for (const ext of [".ts", ".tsx", ".json", "/index.ts"]) {
      if (fs.existsSync(base + ext)) return loadTsModule(path.relative(root, base + ext));
    }
    return {};
  };
  new Function("exports", "require", "module", "__filename", "__dirname", transpiled)(
    mod.exports,
    localRequire,
    mod,
    full,
    path.dirname(full),
  );
  moduleCache.set(full, mod.exports);
  return mod.exports;
}

/**
 * Deterministic cross-platform (macOS + Linux) visual classifier distinguishing
 * full-body human model shots from headless dress-form/plastic mannequins and
 * waist-cropped photos using the head-oval luminance edge signature right below
 * the figure's crown (`yTop + 4..13` on a 160x160 grid).
 */
export async function detectHumanModelPhoto(publicImagePath) {
  const cleanRel = publicImagePath.split("?")[0].replace(/^\//, "");
  const fullPath = path.join(root, "public", cleanRel);
  if (!fs.existsSync(fullPath)) return { isModel: false, eyeEdge: 0, reason: "missing-file" };

  const { data } = await sharp(fullPath)
    .resize(160, 160, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bgR = data[(6 * 160 + 6) * 3];
  const bgG = data[(6 * 160 + 6) * 3 + 1];
  const bgB = data[(6 * 160 + 6) * 3 + 2];

  const distBg = (x, y) => {
    const i = (y * 160 + x) * 3;
    return Math.abs(data[i] - bgR) + Math.abs(data[i + 1] - bgG) + Math.abs(data[i + 2] - bgB);
  };
  const lumAt = (x, y) => {
    const i = (y * 160 + x) * 3;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };

  let yTop = -1;
  for (let y = 0; y < 40; y++) {
    let fg = 0;
    for (let x = 62; x < 98; x++) {
      if (distBg(x, y) > 28) fg++;
    }
    if (fg >= 5) {
      yTop = y;
      break;
    }
  }
  if (yTop < 0) return { isModel: false, eyeEdge: 0, reason: "no-top-figure" };

  let edgeSum = 0;
  let pixels = 0;
  for (let y = yTop + 4; y < Math.min(158, yTop + 13); y++) {
    for (let x = 70; x < 90; x++) {
      const l = lumAt(x, y);
      edgeSum += Math.abs(l - lumAt(x + 1, y)) + Math.abs(l - lumAt(x, y + 1));
      pixels++;
    }
  }
  const eyeEdge = pixels > 0 ? edgeSum / pixels : 0;
  return {
    isModel: eyeEdge >= FACE_EDGE_THRESHOLD,
    eyeEdge: Math.round(eyeEdge * 10) / 10,
    reason: eyeEdge >= FACE_EDGE_THRESHOLD ? "detected-model" : "detected-mannequin",
  };
}

function deriveEyebrow(product, index) {
  const text = `${product.name} ${product.description || ""}`.toLowerCase();
  if (/\b(black|evening|gown|velvet|sequin|slit)\b/.test(text)) return "AFTER DARK";
  if (/\b(eyelet|linen|cotton|resort|cover-up|beach|coastal)\b/.test(text)) return "SUNLIT EASE";
  if (/\b(set|two-piece|trouser|tailored|blazer)\b/.test(text)) return "MODERN TAILORING";
  if (/\b(floral|print|abstract|polka|botanical)\b/.test(text)) return "THE PRINT EDIT";
  const fallbacks = ["NEW ARRIVAL", "THE SOFT STATEMENT", "CONFIDENT COLOR", "SAN DIEGO EDIT"];
  return fallbacks[index % fallbacks.length];
}

function deriveCopy(product) {
  const raw = (product.description || "").trim();
  if (!raw) return "Thoughtfully curated in San Diego for effortless movement and modern polish.";
  const firstSentence = raw.split(/(?<=[.!?])\s+/)[0] || raw;
  return firstSentence.length > 135 ? `${firstSentence.slice(0, 132).trim()}…` : firstSentence;
}

function styleFamilyKey(product) {
  return product.name.split("—")[0].trim().toLowerCase();
}

export async function buildEditorialLooks() {
  const overrides = fs.existsSync(overridesPath)
    ? JSON.parse(fs.readFileSync(overridesPath, "utf8"))
    : { mannequin: [], model: [], curatedCopy: {} };
  const mannequinSet = new Set(overrides.mannequin || []);
  const modelSet = new Set(overrides.model || []);
  const curatedCopy = overrides.curatedCopy || {};

  const { storefrontNewArrivals, arrivalRank } = loadTsModule("app/storefront-products.ts");
  const selected = [];
  const usedFamilies = new Set();

  for (const product of storefrontNewArrivals) {
    if (selected.length >= 4) break;
    if (!ELIGIBLE_CATEGORIES.has(product.category)) continue;
    const primaryImage = product.images?.[0];
    if (!primaryImage) continue;

    const family = styleFamilyKey(product);
    if (usedFamilies.has(family)) continue;

    if (mannequinSet.has(product.slug)) continue;

    let classification;
    if (modelSet.has(product.slug)) {
      classification = { isModel: true, eyeEdge: null, reason: "verified-model" };
    } else {
      classification = await detectHumanModelPhoto(primaryImage);
    }

    if (!classification.isModel) continue;

    usedFamilies.add(family);
    const custom = curatedCopy[product.slug];
    selected.push({
      slug: product.slug,
      name: product.name,
      image: primaryImage,
      eyebrow: custom?.eyebrow || deriveEyebrow(product, selected.length),
      copy: custom?.copy || deriveCopy(product),
      category: product.category,
      arrivalRank: arrivalRank(product.slug),
      classification: classification.reason,
    });
  }

  if (selected.length < 4) {
    throw new Error(`Expected 4 human-model looks for Four Looks editorial, found only ${selected.length}`);
  }

  const payload = {
    rule: "Automatically selects the 4 newest distinct human-model apparel arrivals (excluding mannequins, bags, shoes and cropped shorts).",
    looks: selected,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`editorial-four-looks.json written (${selected.map((l) => l.slug).join(", ")})`);
  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildEditorialLooks();
}
