import { NextResponse } from "next/server";
import { products } from "../../../data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://ambboutique.online";
const BRAND = "AMB BOUTIQUE";
const CURRENCY = "USD";

const googleCategory: Record<string, string> = {
  Dresses: "Apparel & Accessories > Clothing > Dresses",
  Tops: "Apparel & Accessories > Clothing > Shirts & Tops",
  Playsuits: "Apparel & Accessories > Clothing > Jumpsuits & Rompers",
  Skirts: "Apparel & Accessories > Clothing > Skirts",
  Pants: "Apparel & Accessories > Clothing > Pants",
  Shorts: "Apparel & Accessories > Clothing > Shorts",
  Knitwear: "Apparel & Accessories > Clothing > Sweaters",
  Bags: "Apparel & Accessories > Handbags, Wallets & Cases > Handbags",
  Shoes: "Apparel & Accessories > Shoes > High Heels",
  Accessories: "Apparel & Accessories > Jewelry",
};

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xml(tag: string, value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return "";
  return `    <${tag}>${esc(String(value))}</${tag}>\n`;
}

function resolveImage(product: (typeof products)[number]): string | null {
  const images = product.images;
  if (!images?.length) return null;

  // Prefer non-atlas, non-SVG images (individual product photos)
  for (const img of images) {
    if (img.endsWith(".svg") || img.includes("atlas")) continue;
    return img.startsWith("http") ? img : `${BASE}${img}`;
  }

  // Products with only atlas/sprite images cannot be included — Google
  // Shopping requires individual product images (no SVG, no sprite sheets).
  return null;
}

export async function GET() {
  const sellable = products.filter((p) => p.stock === undefined || p.stock > 0);

  let items = "";
  for (const product of sellable) {
    const image = resolveImage(product);
    if (!image) continue; // skip products without usable individual images

    const id = `amb-${product.slug}`;
    const link = `${BASE}/products/${product.slug}`;
    const category = googleCategory[product.category] || "Apparel & Accessories";
    const description =
      product.description ||
      `${product.name}, a contemporary women's ${product.category.toLowerCase()} style curated by ${BRAND} in San Diego.`;
    const availability = product.stock === 0 ? "out_of_stock" : "in_stock";
    const color = product.colorNames?.[0];
    const material = product.materials;
    const basePrice = product.compareAt && product.compareAt > product.price ? product.compareAt : product.price;
    const salePrice = product.compareAt && product.compareAt > product.price ? product.price : undefined;

    items += "  <item>\n";
    items += xml("g:id", id);
    items += xml("g:title", product.name);
    items += xml("g:description", description);
    items += xml("g:link", link);
    items += xml("g:image_link", image);
    items += xml("g:price", `${basePrice.toFixed(2)} ${CURRENCY}`);
    if (salePrice !== undefined) {
      items += xml("g:sale_price", `${salePrice.toFixed(2)} ${CURRENCY}`);
    }
    items += xml("g:availability", availability);
    items += xml("g:condition", "new");
    items += xml("g:brand", product.vendor || BRAND);
    items += xml("g:google_product_category", category);
    items += xml("g:product_type", `Women's ${product.category}`);
    items += xml("g:identifier_exists", "false");
    items += xml("g:gender", "Female");
    items += xml("g:age_group", "Adult");
    items += xml("g:color", color);
    items += xml("g:material", material);
    if (product.sizes?.length === 1) {
      items += xml("g:size", product.sizes[0]);
    }
    items += xml("g:item_group_id", id);
    items += "  </item>\n";
  }

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${BRAND}</title>
    <link>${BASE}</link>
    <description>Contemporary women's fashion curated in San Diego, California.</description>
${items}  </channel>
</rss>
`;

  return new NextResponse(feed, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
