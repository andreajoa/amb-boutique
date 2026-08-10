import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = resolve(process.argv[2] || "imports/products.csv");
const output = resolve("app/generated-products.ts");

function parseCsv(source) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"' && quoted && source[index + 1] === '"') { field += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && source[index + 1] === "\n") index++; row.push(field); if (row.some((cell) => cell.trim())) rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map((header) => header.trim().toLowerCase());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] || "").trim()])));
}

const categoryAliases = { dress: "Dresses", dresses: "Dresses", top: "Tops", tops: "Tops", blouse: "Tops", blouses: "Tops", romper: "Playsuits", rompers: "Playsuits", playsuit: "Playsuits", playsuits: "Playsuits", skirt: "Skirts", skirts: "Skirts", pant: "Pants", pants: "Pants", trouser: "Pants", trousers: "Pants", short: "Shorts", shorts: "Shorts", knit: "Knitwear", knitwear: "Knitwear", bag: "Bags", bags: "Bags", shoe: "Shoes", shoes: "Shoes", accessory: "Accessories", accessories: "Accessories" };
const split = (value) => value ? value.split("|").map((item) => item.trim()).filter(Boolean) : [];
const optionalNumber = (value) => value === "" || value == null ? undefined : Number(value);
const optionalBoolean = (value) => value === "" || value == null ? undefined : !["false", "0", "no", "off"].includes(String(value).toLowerCase());
const records = parseCsv(await readFile(input, "utf8"));

const products = records.map((record, index) => {
  const slug = record.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const category = categoryAliases[record.category.toLowerCase()];
  if (!slug || !record.name || !category || !Number(record.price)) throw new Error(`Row ${index + 2}: slug, name, supported category and numeric price are required.`);
  const colorParts = split(record.colors).map((item) => { const separator = item.lastIndexOf(":"); return separator > -1 ? { name: item.slice(0, separator), value: item.slice(separator + 1) } : { name: item, value: item }; });
  const economics = ["weight_oz", "unit_cost_usd", "inbound_freight_usd", "duty_usd", "packaging_usd", "minimum_margin_percent"].map((key) => optionalNumber(record[key]));
  if (economics.some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) throw new Error(`Row ${index + 2}: weight and cost fields must be non-negative numbers.`);
  const heelHeightCm = optionalNumber(record.heel_height_cm);
  if (heelHeightCm !== undefined && (!Number.isFinite(heelHeightCm) || heelHeightCm < 0)) throw new Error(`Row ${index + 2}: heel_height_cm must be a non-negative number.`);
  const styleEligible = optionalBoolean(record.style_eligible);
  return {
    slug,
    name: record.name,
    vendor: record.vendor || "AMB BOUTIQUE",
    category,
    ...(record.subcategory ? { subcategory: record.subcategory } : {}),
    price: Number(record.price),
    ...(record.compare_at ? { compareAt: Number(record.compare_at) } : {}),
    ...(record.badge ? { badge: record.badge } : {}),
    sheet: "one",
    quadrant: 1,
    colors: colorParts.map((item) => item.value),
    colorNames: colorParts.map((item) => item.name),
    sizes: split(record.sizes),
    description: record.description,
    materials: record.materials,
    care: record.care,
    images: split(record.image_urls),
    stock: Number(record.stock || 0),
    ...(economics[0] !== undefined ? { weightOz: economics[0] } : {}),
    ...(economics[1] !== undefined ? { unitCostUsd: economics[1] } : {}),
    ...(economics[2] !== undefined ? { inboundFreightUsd: economics[2] } : {}),
    ...(economics[3] !== undefined ? { dutyUsd: economics[3] } : {}),
    ...(economics[4] !== undefined ? { packagingUsd: economics[4] } : {}),
    ...(economics[5] !== undefined ? { minimumMarginPercent: economics[5] } : {}),
    ...(record.complementary_slugs ? { complementarySlugs: split(record.complementary_slugs) } : {}),
    ...(record.stripe_price_id ? { stripePriceId: record.stripe_price_id } : {}),
    ...(heelHeightCm !== undefined ? { heelHeightCm } : {}),
    ...(styleEligible !== undefined ? { styleEligible } : {}),
  };
});

const source = `import type { Product } from "./data";\n\n// Generated from ${input.split("/").pop()}. Edit the CSV, then run npm run import:products.\nexport const generatedProducts: Product[] = ${JSON.stringify(products, null, 2)};\n`;
await writeFile(output, source);
console.log(`Imported ${products.length} products into ${output}`);
