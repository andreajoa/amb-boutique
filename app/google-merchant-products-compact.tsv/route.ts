import { NextResponse } from "next/server";
import { products, type Product } from "../data";
import { getGoogleProductCategory, getMerchantImage, merchantVariantLink } from "../merchant";

export const revalidate = 3600;

const HEADERS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "availability",
  "price",
  "sale_price",
  "condition",
  "brand",
  "google_product_category",
  "product_type",
  "gender",
  "age_group",
  "color",
  "size",
  "size_system",
  "size_type",
  "shipping_weight",
] as const;

type Header = (typeof HEADERS)[number];
type FeedRow = Record<Header, string>;

function cell(value: unknown) {
  return String(value ?? "")
    .replace(/\t/g, " ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function safePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function colorName(product: Product) {
  return product.colorNames?.filter(Boolean).join("/") || "";
}

function preferredGarmentSize(product: Product) {
  const sizes = product.sizes || [];
  if (!sizes.length) return undefined;
  for (const preferred of ["M", "8", "6", "S", "One Size"]) {
    if (sizes.includes(preferred)) return preferred;
  }
  return sizes[0];
}

function representativeSelection(product: Product) {
  if (product.shoeVariants?.length) {
    const variant = product.shoeVariants[Math.floor(product.shoeVariants.length / 2)] || product.shoeVariants[0];
    const size = variant.sizes.includes("38") ? "38" : variant.sizes[Math.floor(variant.sizes.length / 2)] || variant.sizes[0];
    return { size, heelHeightCm: variant.heelHeightCm, inStock: variant.stock > 0 };
  }

  if (product.category === "Shoes" && product.sizes?.length) {
    const size = product.sizes.includes("38") ? "38" : product.sizes[Math.floor(product.sizes.length / 2)] || product.sizes[0];
    return { size, heelHeightCm: product.heelHeightCm, inStock: (product.stock || 0) > 0 };
  }

  return {
    size: preferredGarmentSize(product),
    heelHeightCm: product.heelHeightCm,
    inStock: (product.stock || 0) > 0,
  };
}

function priceFields(product: Product) {
  if (product.compareAt && product.compareAt > product.price) {
    return {
      price: `${product.compareAt.toFixed(2)} USD`,
      sale_price: `${product.price.toFixed(2)} USD`,
    };
  }
  return { price: `${product.price.toFixed(2)} USD`, sale_price: "" };
}

function productRow(product: Product): FeedRow | null {
  if (typeof product.stock !== "number") return null;
  const image = getMerchantImage(product);
  if (!image) return null;

  const selected = representativeSelection(product);
  const prices = priceFields(product);
  const color = colorName(product);
  const titleParts = [product.name];
  if (color && !product.name.toLowerCase().includes(color.toLowerCase())) titleParts.push(color);

  return {
    id: `amb-${safePart(product.slug)}`.slice(0, 50),
    title: titleParts.join(" - ").slice(0, 150),
    description: (product.description || `${product.name} from AMB BOUTIQUE, a women’s fashion boutique based in San Diego, California.`).slice(0, 5000),
    link: merchantVariantLink(product, selected.size, selected.heelHeightCm),
    image_link: image,
    availability: selected.inStock ? "in_stock" : "out_of_stock",
    price: prices.price,
    sale_price: prices.sale_price,
    condition: "new",
    brand: product.vendor || "AMB BOUTIQUE",
    google_product_category: getGoogleProductCategory(product),
    product_type: `Women > ${product.category}${product.subcategory ? ` > ${product.subcategory}` : ""}`,
    gender: "female",
    age_group: "adult",
    color,
    size: selected.size || "",
    size_system: product.category === "Shoes" && selected.size ? "EU" : selected.size ? "US" : "",
    size_type: selected.size ? "regular" : "",
    shipping_weight: product.weightOz ? `${product.weightOz.toFixed(2)} oz` : "",
  };
}

export async function GET() {
  const rows = products.map(productRow).filter((row): row is FeedRow => Boolean(row));
  const lines = [
    HEADERS.join("\t"),
    ...rows.map((row) => HEADERS.map((header) => cell(row[header])).join("\t")),
  ];
  const body = `\uFEFF${lines.join("\n")}\n`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Content-Disposition": 'attachment; filename="amb-boutique-google-merchant-COMPACT.tsv"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
