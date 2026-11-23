// Builds imports/reviewed-stock.json: the only part of the reviewed supplier
// snapshots the storefront needs (stock per size and the purchasable flag).
// The full snapshots carry supplier identity and costs and must never be
// bundled for the browser. Run with --check to fail when the file is stale.
import fs from "node:fs";

const root = new URL("..", import.meta.url);
const read = (path) => JSON.parse(fs.readFileSync(new URL(path, root), "utf8"));
const corrections = read("imports/catalog-corrections-20261024.json");
const additions = read("imports/catalog-20261026-new-products-bindings.json");
const orlena = read("imports/catalog-20261117-orlena-bindings.json");

// Same precedence as before: corrections first, then additions replace by slug.
const reviewed = {};
for (const [slug, entry] of Object.entries(corrections.products)) {
  reviewed[slug] = {
    stockBySize: entry.stockBySize,
    ...(entry.purchasable !== undefined ? { purchasable: entry.purchasable } : {}),
  };
}
for (const product of [...additions.products, ...orlena.products]) reviewed[product.slug] = { stockBySize: product.stockBySize };

const output = `${JSON.stringify(reviewed, null, 1)}\n`;
const target = new URL("imports/reviewed-stock.json", root);
if (process.argv.includes("--check")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== output) {
    console.error("imports/reviewed-stock.json is stale: run node scripts/build-reviewed-stock.mjs");
    process.exit(1);
  }
  console.log(`reviewed-stock.json up to date (${Object.keys(reviewed).length} products)`);
} else {
  fs.writeFileSync(target, output);
  console.log(`reviewed-stock.json written (${Object.keys(reviewed).length} products)`);
}
