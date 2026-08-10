import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = resolve(process.argv[2] || "imports/inventory-variants.csv");
const output = resolve("app/generated-inventory.ts");

function parseCsv(source) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"' && quoted && source[index + 1] === '"') { field += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] || "").trim()])));
}

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const records = parseCsv(await readFile(input, "utf8"));
const seenSkus = new Set();
const seenSelections = new Set();

const variants = records.map((record, index) => {
  const row = index + 2;
  const productSlug = slugify(record.product_slug || "");
  const productName = record.product_name?.trim();
  const sku = record.sku?.trim();
  const color = record.color?.trim();
  const size = record.size?.trim();
  const stock = Number(record.stock);
  const unitCostUsd = record.unit_cost_usd === "" ? undefined : Number(record.unit_cost_usd);
  const active = !["false", "0", "no"].includes((record.active || "true").toLowerCase());

  if (!productSlug || !productName || !sku || !color || !size) {
    throw new Error(`Row ${row}: product_slug, product_name, sku, color and size are required.`);
  }
  if (/aliexpress|ali express/i.test(`${productName} ${productSlug} ${color} ${size}`)) {
    throw new Error(`Row ${row}: supplier branding is not allowed in AMB customer-facing inventory.`);
  }
  if (!Number.isInteger(stock) || stock < 0) throw new Error(`Row ${row}: stock must be a non-negative whole number.`);
  if (unitCostUsd !== undefined && (!Number.isFinite(unitCostUsd) || unitCostUsd < 0)) throw new Error(`Row ${row}: unit_cost_usd must be a non-negative number.`);
  if (seenSkus.has(sku)) throw new Error(`Row ${row}: duplicate SKU ${sku}.`);
  const selectionKey = `${productSlug}\u0000${color.toLowerCase()}\u0000${size.toLowerCase()}`;
  if (seenSelections.has(selectionKey)) throw new Error(`Row ${row}: duplicate color and size selection for ${productSlug}.`);
  seenSkus.add(sku);
  seenSelections.add(selectionKey);
  return { productSlug, productName, sku, color, size, stock, active, ...(unitCostUsd !== undefined ? { unitCostUsd } : {}) };
});

const source = `// Generated from ${input.split("/").pop()}.
// Supplier-facing identifiers remain internal and are never rendered in the storefront.
export type GeneratedInventoryVariant = {
  productSlug: string;
  productName: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  active: boolean;
  unitCostUsd?: number;
};

export const generatedInventoryVariants: GeneratedInventoryVariant[] = ${JSON.stringify(variants, null, 2)};
`;

await writeFile(output, source);
console.log(`Imported ${variants.length} inventory variants into ${output}`);
