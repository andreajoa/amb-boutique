import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
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
    if (fs.existsSync(base) && fs.statSync(base).isFile()) return loadTsModule(path.relative(root, base));
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
 * Permanent AMB Boutique Bag Gallery Rule:
 * Every Bag product MUST include an interior view showing how the bag looks inside:
 * - Legacy editorial bag galleries use /editorial/bags/products/<slug>/04.webp.
 * - New /products/<slug>/ bag galleries MUST include an explicit inside*.webp view
 *   (e.g. /products/<slug>/inside.webp) existing on disk.
 *
 * A frozen pending allowlist exists solely for the 14 virelle-woven-crossbody-bag-*
 * SKUs queued on 2026-11-23; any new bag without an interior view fails the build.
 */
const pendingFile = path.join(root, "imports", "bags-pending-interior-20261123.json");
const pendingList = fs.existsSync(pendingFile)
  ? new Set(JSON.parse(fs.readFileSync(pendingFile, "utf8")).pendingSlugs || [])
  : new Set();

const { products } = loadTsModule("app/data.ts");
const bags = products.filter((product) => product.category === "Bags");
const violations = [];
let verifiedCount = 0;
let pendingCount = 0;

for (const bag of bags) {
  const images = (bag.images || []).map((img) => img.split("?")[0]);
  const hasEditorialInterior = images.some((img) => /^\/editorial\/bags\/products\/.+\/04\.webp$/i.test(img));
  const explicitInside = images.find((img) => /\/inside[^/]*\.webp$/i.test(img));
  const hasInterior = hasEditorialInterior || Boolean(explicitInside);

  if (!hasInterior) {
    if (pendingList.has(bag.slug)) {
      pendingCount++;
      continue;
    }
    violations.push(`${bag.slug}: missing inside view image (expected /products/${bag.slug}/inside.webp)`);
    continue;
  }

  const interiorImg = explicitInside || images.find((img) => /^\/editorial\/bags\/products\/.+\/04\.webp$/i.test(img));
  const fullPath = path.join(root, "public", interiorImg.replace(/^\//, ""));
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size < 2000) {
    violations.push(`${bag.slug}: interior image file missing or invalid at ${interiorImg}`);
    continue;
  }

  if (pendingList.has(bag.slug)) {
    violations.push(`${bag.slug}: now has an interior view — remove it from imports/bags-pending-interior-20261123.json`);
    continue;
  }

  verifiedCount++;
}

if (violations.length > 0) {
  console.error(`Bag interior check failed (${violations.length} violation(s)):`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`bag interiors verified: ${verifiedCount}/${bags.length} bags show an inside view (${pendingCount} frozen pending)`);
