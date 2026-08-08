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

const categoryAliases = { dress: "Dresses", dresses: "Dresses", top: "Tops", tops: "Tops", blouse: "Tops", blouses: "Tops", romper: "Playsuits", rompers: "Playsuits", playsuit: "Playsuits", playsuits: "Playsuits", skirt: "Skirts", skirts: "Skirts", short: "Shorts", shorts: "Shorts", knit: "Knitwear", knitwear: "Knitwear", bag: "Bags", bags: "Bags", shoe: "Shoes", shoes: "Shoes", accessory: "Accessories", accessories: "Accessories" };
const split = (value) => value ? value.split("|").map((item) => item.trim()).filter(Boolean) : [];
const records = parseCsv(await readFile(input, "utf8"));

const products = records.map((record, index) => {
  const slug = record.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const category = categoryAliases[record.category.toLowerCase()];
  if (!slug || !record.name || !category || !Number(record.price)) throw new Error(`Row ${index + 2}: slug, name, supported category and numeric price are required.`);
  const colorParts = split(record.colors).map((item) => { const separator = item.lastIndexOf(":"); return separator > -1 ? { name: item.slice(0, separator), value: item.slice(separator + 1) } : { name: item, value: item }; });
  return { slug, name: record.name, category, price: Number(record.price), ...(record.compare_at ? { compareAt: Number(record.compare_at) } : {}), ...(record.badge ? { badge: record.badge } : {}), sheet: "one", quadrant: 1, colors: colorParts.map((item) => item.value), colorNames: colorParts.map((item) => item.name), sizes: split(record.sizes), description: record.description, materials: record.materials, care: record.care, images: split(record.image_urls), stock: Number(record.stock || 0) };
});

const source = `import type { Product } from "./data";\n\n// Generated from ${input.split("/").pop()}. Edit the CSV, then run npm run import:products.\nexport const generatedProducts: Product[] = ${JSON.stringify(products, null, 2)};\n`;
await writeFile(output, source);
console.log(`Imported ${products.length} products into ${output}`);
