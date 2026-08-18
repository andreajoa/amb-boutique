import { NextResponse } from "next/server";
import { products, type Product } from "../data";
import {
  getGoogleProductCategory,
  getMerchantImage,
  merchantVariantLink,
} from "../merchant";

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
  "item_group_id",
  "item_group_title",
  "variant_option",
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

function safePart(value: string | number) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function variantId(product: Product, size?: string, heelHeightCm?: number) {
  const suffix = [
    size ? `s-${safePart(size)}` : "",
    heelHeightCm !== undefined ? `h-${safePart(heelHeightCm)}` : "",
  ].filter(Boolean).join("-");
  const maxSlug = Math.max(8, 46 - suffix.length);
  return `amb-${safePart(product.slug).slice(0, maxSlug)}${suffix ? `-${suffix}` : ""}`.slice(0, 50);
}

function colorName(product: Product) {
  return product.colorNames?.filter(Boolean).join("/") || "";
}

function variantTitle(product: Product, size?: string, heelHeightCm?: number) {
  const color = colorName(product);
  const parts = [product.name];
  if (color && !product.name.toLowerCase().includes(color.toLowerCase())) parts.push(color);
  if (size) parts.push(`Size ${size}`);
  if (heelHeightCm !== undefined) parts.push(`${heelHeightCm} cm heel`);
  return parts.join(" - ").slice(0, 150);
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

function baseRow(product: Product, size?: string, heelHeightCm?: number, inStock = true): FeedRow | null {
  const image = getMerchantImage(product);
  if (!image) return null;

  const prices = priceFields(product);
  const isVariant = Boolean(size || heelHeightCm !== undefined);
  const options: string[] = [];
  if (size) options.push(`size:${size}`);
  if (heelHeightCm !== undefined) options.push(`heel height:${heelHeightCm} cm`);

  return {
    id: variantId(product, size, heelHeightCm),
    title: variantTitle(product, size, heelHeightCm),
    description: (product.description || `${product.name} from AMB BOUTIQUE, a women’s fashion boutique based in San Diego, California.`).slice(0, 5000),
    link: merchantVariantLink(product, size, heelHeightCm),
    image_link: image,
    availability: inStock ? "in_stock" : "out_of_stock",
    price: prices.price,
    sale_price: prices.sale_price,
    condition: "new",
    brand: product.vendor || "AMB BOUTIQUE",
    google_product_category: getGoogleProductCategory(product),
    product_type: `Women > ${product.category}${product.subcategory ? ` > ${product.subcategory}` : ""}`,
    gender: "female",
    age_group: "adult",
    color: colorName(product),
    size: size || "",
    size_system: product.category === "Shoes" && size ? "EU" : "",
    size_type: size ? "regular" : "",
    item_group_id: isVariant ? product.slug.slice(0, 50) : "",
    item_group_title: isVariant ? product.name.slice(0, 150) : "",
    variant_option: options.join(","),
    shipping_weight: product.weightOz ? `${product.weightOz.toFixed(2)} oz` : "",
  };
}

function productRows(product: Product): FeedRow[] {
  if (typeof product.stock !== "number") return [];

  if (product.shoeVariants?.length) {
    return product.shoeVariants.flatMap((variant) =>
      variant.sizes
        .map((size) => baseRow(product, size, variant.heelHeightCm, variant.stock > 0))
        .filter((row): row is FeedRow => Boolean(row))
    );
  }

  if (product.sizes?.length) {
    return product.sizes
      .map((size) => baseRow(product, size, product.heelHeightCm, product.stock! > 0))
      .filter((row): row is FeedRow => Boolean(row));
  }

  const row = baseRow(product, undefined, undefined, product.stock > 0);
  return row ? [row] : [];
}

export async function GET() {
  const rows = products.flatMap(productRows);
  const lines = [
    HEADERS.join("\t"),
    ...rows.map((row) => HEADERS.map((header) => cell(row[header])).join("\t")),
  ];
  const body = `\uFEFF${lines.join("\n")}\n`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Content-Disposition": 'attachment; filename="amb-boutique-google-merchant.tsv"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
