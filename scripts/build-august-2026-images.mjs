import { mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

import { august2026ProductAssets } from "../app/generated-august-2026-products.ts";

const sourceRoot = process.argv[2] ? resolve(process.argv[2]) : "";
const destinationRoot = resolve("public/products");
const sourceFiles = ["01-front.png", "02-back.png", "03-left.png", "04-right.png"];

if (!sourceRoot) {
  throw new Error("Pass the prepared image directory as the first argument.");
}

await stat(sourceRoot);

const tasks = august2026ProductAssets.flatMap(({ sourceId, color, slug }) =>
  sourceFiles.map((sourceFile, index) => ({
    source: resolve(sourceRoot, sourceId, color, sourceFile),
    destinationDirectory: resolve(destinationRoot, slug),
    destination: resolve(destinationRoot, slug, `${String(index + 1).padStart(2, "0")}.webp`),
  })),
);

for (let start = 0; start < tasks.length; start += 8) {
  await Promise.all(tasks.slice(start, start + 8).map(async ({ source, destinationDirectory, destination }) => {
    await stat(source);
    await mkdir(destinationDirectory, { recursive: true });
    await sharp(source)
      .rotate()
      .resize(1600, 1600, {
        fit: "contain",
        background: { r: 246, g: 245, b: 243, alpha: 1 },
      })
      .webp({ quality: 88, effort: 5 })
      .toFile(destination);
  }));
}

console.log(`Built ${tasks.length} product images across ${august2026ProductAssets.length} color-specific products.`);
