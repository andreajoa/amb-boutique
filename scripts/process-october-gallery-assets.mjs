import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Packaging only: generation/editing is performed with the built-in image tool.
const root = path.resolve("output/imagegen/amb-oct04");
const files = (await fs.readdir(root)).filter((name) => name === "generation-manifest.json" || name.endsWith("-batch.json"));
const records = new Map();
for (const file of files) {
  for (const record of JSON.parse(await fs.readFile(path.join(root, file), "utf8"))) {
    records.set(`${record.slug}:${record.view}`, record);
  }
}
const results = [];
for (const record of records.values()) {
  if (!/^[a-z0-9-]+$/.test(record.slug) || !["front", "back", "left", "right"].includes(record.view)) {
    throw new Error("Invalid gallery asset identity");
  }
  const folder = path.join(root, record.slug);
  await fs.mkdir(folder, { recursive: true });
  const version = record.assetVersion || "20261004";
  if (!/^20261004(?:-v[2-9][0-9]*)?$/.test(version)) throw new Error("Invalid gallery asset version");
  const original = path.join(folder, `${record.view}-${version}.png`);
  try { await fs.access(original); } catch { await fs.copyFile(record.generatedFile, original); }
  const destination = path.resolve("public/products", record.slug, `${record.view}-${version}.webp`);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  try { await fs.access(destination); } catch {
    await sharp(original).resize(1600, 1600, { fit: "inside" }).toColorspace("srgb").webp({ quality: 90 }).toFile(destination);
  }
  const info = await sharp(destination).metadata();
  if (info.width !== 1600 || info.height !== 1600 || info.format !== "webp") throw new Error("Invalid gallery dimensions/format");
  results.push({ ...record, asset: `/products/${record.slug}/${record.view}-${version}.webp`, width: info.width, height: info.height });
}
await fs.writeFile(path.join(root, "generation-manifest.json"), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify({ packagedAssets: results.length, productsWithAssets: new Set(results.map((r) => r.slug)).size, generationTool: "builtin imagegen", format: "1600x1600 sRGB WebP", approval: "separate visual review required" }));
