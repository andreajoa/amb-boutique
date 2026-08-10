import { NextResponse } from "next/server";
import { products, type Product } from "../data";
import { getShippingQuotes } from "../commerce";
import {
  getGoogleProductCategory,
  getMerchantAdditionalImages,
  getMerchantImage,
  merchantSiteUrl,
  merchantVariantLink,
} from "../merchant";

export const revalidate = 3600;

function xml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clean(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/\s+/g, " ").trim();
}

function safePart(value: string | number) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function variantId(product: Product, size?: string, heelHeightCm?: number) {
  const suffix = [size ? `s-${safePart(size)}` : "", heelHeightCm !== undefined ? `h-${safePart(heelHeightCm)}` : ""].filter(Boolean).join("-");
  const maxSlug = Math.max(8, 46 - suffix.length);
  return `amb-${safePart(product.slug).slice(0, maxSlug)}${suffix ? `-${suffix}` : ""}`.slice(0, 50);
}

function commonFields(product: Product, title: string, link: string, image: string, availability: "in_stock" | "out_of_stock") {
  const description = clean(product.description, `${product.name} from AMB BOUTIQUE, a women’s fashion boutique based in San Diego, California.`).slice(0, 5000);
  const color = product.colorNames?.filter(Boolean).slice(0, 3).join("/");
  const shipping = getShippingQuotes("US", product.price, product.weightOz || 12)[0];
  const additionalImages = getMerchantAdditionalImages(product);

  return [
    `<g:title>${xml(title.slice(0, 150))}</g:title>`,
    `<g:description>${xml(description)}</g:description>`,
    `<g:link>${xml(link)}</g:link>`,
    `<g:image_link>${xml(image)}</g:image_link>`,
    ...additionalImages.map((item) => `<g:additional_image_link>${xml(item)}</g:additional_image_link>`),
    `<g:availability>${availability}</g:availability>`,
    `<g:condition>new</g:condition>`,
    `<g:price>${product.price.toFixed(2)} USD</g:price>`,
    `<g:brand>${xml(product.vendor || "AMB BOUTIQUE")}</g:brand>`,
    `<g:gender>female</g:gender>`,
    `<g:age_group>adult</g:age_group>`,
    color ? `<g:color>${xml(color)}</g:color>` : "",
    `<g:google_product_category>${xml(getGoogleProductCategory(product))}</g:google_product_category>`,
    `<g:product_type>${xml(`Women > ${product.category}${product.subcategory ? ` > ${product.subcategory}` : ""}`)}</g:product_type>`,
    product.weightOz ? `<g:shipping_weight>${product.weightOz.toFixed(2)} oz</g:shipping_weight>` : "",
    `<g:shipping><g:country>US</g:country><g:service>Standard</g:service><g:price>${shipping.amountUsd.toFixed(2)} USD</g:price></g:shipping>`,
  ].filter(Boolean).join("\n");
}

function productItems(product: Product) {
  const image = getMerchantImage(product);
  if (!image || typeof product.stock !== "number") return [];

  if (product.shoeVariants?.length) {
    return product.shoeVariants.flatMap((variant) => variant.sizes.map((size) => {
      const title = `${product.name} - Size ${size} - ${variant.heelHeightCm} cm heel`;
      const link = merchantVariantLink(product, size, variant.heelHeightCm);
      return `<item>
<g:id>${xml(variantId(product, size, variant.heelHeightCm))}</g:id>
${commonFields(product, title, link, image, variant.stock > 0 ? "in_stock" : "out_of_stock")}
<g:size>${xml(size)}</g:size>
<g:size_system>EU</g:size_system>
<g:size_type>regular</g:size_type>
<g:item_group_id>${xml(product.slug.slice(0, 50))}</g:item_group_id>
<g:item_group_title>${xml(product.name.slice(0, 150))}</g:item_group_title>
<g:custom_label_0>${xml(`${variant.heelHeightCm}cm heel`)}</g:custom_label_0>
</item>`;
    }));
  }

  if (product.sizes?.length) {
    return product.sizes.map((size) => {
      const title = `${product.name} - Size ${size}`;
      const link = merchantVariantLink(product, size, product.heelHeightCm);
      return `<item>
<g:id>${xml(variantId(product, size, product.heelHeightCm))}</g:id>
${commonFields(product, title, link, image, product.stock! > 0 ? "in_stock" : "out_of_stock")}
<g:size>${xml(size)}</g:size>
<g:size_system>${product.category === "Shoes" ? "EU" : "US"}</g:size_system>
<g:size_type>regular</g:size_type>
<g:item_group_id>${xml(product.slug.slice(0, 50))}</g:item_group_id>
<g:item_group_title>${xml(product.name.slice(0, 150))}</g:item_group_title>
</item>`;
    });
  }

  return [`<item>
<g:id>${xml(variantId(product))}</g:id>
${commonFields(product, product.name, merchantVariantLink(product), image, product.stock > 0 ? "in_stock" : "out_of_stock")}
</item>`];
}

export async function GET() {
  const items = products.flatMap(productItems);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>AMB BOUTIQUE Product Feed</title>
<link>${merchantSiteUrl}</link>
<description>Women’s fashion products available from AMB BOUTIQUE in San Diego, California.</description>
${items.join("\n")}
</channel>
</rss>`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
