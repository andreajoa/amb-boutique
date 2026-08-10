import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = resolve(process.argv[2] || "imports/supplemental-products.csv");
const output = resolve("app/generated-supplemental-products.ts");

function parseCsv(source) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' && quoted && source[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map((header) => header.trim().toLowerCase());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] || "").trim()])));
}

const categoryAliases = { dress: "Dresses", dresses: "Dresses", top: "Tops", tops: "Tops", blouse: "Tops", blouses: "Tops", romper: "Playsuits", rompers: "Playsuits", playsuit: "Playsuits", playsuits: "Playsuits", skirt: "Skirts", skirts: "Skirts", pant: "Pants", pants: "Pants", trouser: "Pants", trousers: "Pants", short: "Shorts", shorts: "Shorts", knit: "Knitwear", knitwear: "Knitwear", bag: "Bags", bags: "Bags", shoe: "Shoes", shoes: "Shoes", accessory: "Accessories", accessories: "Accessories" };
const split = (value) => value ? value.split("|").map((item) => item.trim()).filter(Boolean) : [];
const optionalNumber = (value) => value === "" || value == null ? undefined : Number(value);
const records = parseCsv(await readFile(input, "utf8"));

const seenSlugs = new Set();
const seenNames = new Set();
const isTrue = (value) => ["true", "1", "yes"].includes((value || "").trim().toLowerCase());

const products = records.map((record, index) => {
  const row = index + 2;
  const slug = (record.slug || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const category = categoryAliases[(record.category || "").toLowerCase()];
  const price = Number(record.price);
  const stock = Number(record.stock || 0);
  const gallerySprite = isTrue(record.gallery_sprite);
  const interiorVerified = isTrue(record.interior_verified);

  if (!slug || !record.name || !category || !Number.isFinite(price) || price <= 0) {
    throw new Error(`Row ${row}: slug, name, supported category and a positive numeric price are required.`);
  }
  const visibleText = [slug, record.name, record.description, record.materials, record.care].join(" ");
  if (/ali\s*express/i.test(visibleText)) {
    throw new Error(`Row ${row}: marketplace branding is not allowed in the AMB catalog.`);
  }
  const normalizedName = record.name.trim().toLowerCase();
  if (seenSlugs.has(slug)) throw new Error(`Row ${row}: duplicate product slug ${slug}.`);
  if (seenNames.has(normalizedName)) throw new Error(`Row ${row}: every color product needs its own unique AMB name.`);
  seenSlugs.add(slug);
  seenNames.add(normalizedName);

  const colorParts = split(record.colors).map((item) => {
    const separator = item.lastIndexOf(":");
    return separator > -1
      ? { name: item.slice(0, separator).trim(), value: item.slice(separator + 1).trim() }
      : { name: item.trim(), value: item.trim() };
  });
  if (colorParts.length !== 1 || !colorParts[0].name || !colorParts[0].value) {
    throw new Error(`Row ${row}: publish exactly one color per product with its own elegant AMB name.`);
  }

  const imageUrls = split(record.image_urls);
  if (!imageUrls.length) throw new Error(`Row ${row}: at least one product image is required.`);
  if (gallerySprite && imageUrls.length !== 1) {
    throw new Error(`Row ${row}: a gallery sprite must use exactly one four-angle image file.`);
  }
  if (category === "Bags" && !interiorVerified) {
    throw new Error(`Row ${row}: bags require a verified interior view showing compartments and pockets.`);
  }
  if (category === "Bags" && !gallerySprite && imageUrls.length < 4) {
    throw new Error(`Row ${row}: bags require front, back, side and interior gallery images.`);
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error(`Row ${row}: stock must be a non-negative whole number.`);
  }

  const economics = ["weight_oz", "unit_cost_usd", "inbound_freight_usd", "duty_usd", "packaging_usd", "minimum_margin_percent"].map((key) => optionalNumber(record[key]));
  if (economics.some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) {
    throw new Error(`Row ${row}: weight and cost fields must be non-negative numbers.`);
  }

  return {
    slug,
    name: record.name,
    vendor: "AMB BOUTIQUE",
    category,
    price,
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
    images: imageUrls,
    ...(gallerySprite ? { gallerySprite: true } : {}),
    stock,
    ...(economics[0] !== undefined ? { weightOz: economics[0] } : {}),
    ...(economics[1] !== undefined ? { unitCostUsd: economics[1] } : {}),
    ...(economics[2] !== undefined ? { inboundFreightUsd: economics[2] } : {}),
    ...(economics[3] !== undefined ? { dutyUsd: economics[3] } : {}),
    ...(economics[4] !== undefined ? { packagingUsd: economics[4] } : {}),
    ...(economics[5] !== undefined ? { minimumMarginPercent: economics[5] } : {}),
    ...(record.complementary_slugs ? { complementarySlugs: split(record.complementary_slugs) } : {}),
    ...(record.stripe_price_id ? { stripePriceId: record.stripe_price_id } : {}),
  };
});

const source = `import type { Product } from "./data";\n\n// Generated from ${input.split("/").pop()}. Supplier-facing identifiers are never rendered.\nexport const generatedSupplementalProducts: Product[] = ${JSON.stringify(products, null, 2)};\n`;
await writeFile(output, source);
console.log(`Imported ${products.length} supplemental products into ${output}`);
