import { NextResponse } from "next/server";
import { products } from "../../../data";
import {
  getGoogleProductCategory,
  getMerchantAdditionalImages,
  getMerchantImage,
  merchantSiteUrl,
  merchantVariantLink,
} from "../../../merchant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = merchantSiteUrl;
const BRAND = "AMB BOUTIQUE";
const CURRENCY = "USD";

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

function variantToken(value: string | number) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sizeType(size: string) {
  return /w$/i.test(size.trim()) ? "plus" : "regular";
}

type FeedVariant = {
  size?: string;
  heelHeightCm?: number;
  stock?: number;
};

function getFeedVariants(product: (typeof products)[number]): FeedVariant[] {
  if (product.shoeVariants?.length) {
    return product.shoeVariants.flatMap((shoeVariant) =>
      shoeVariant.sizes.map((size) => ({
        size,
        heelHeightCm: shoeVariant.heelHeightCm,
        stock: shoeVariant.stock,
      })),
    );
  }

  if (product.sizes?.length) {
    return product.sizes.map((size) => ({ size, stock: product.stock }));
  }

  return [{ stock: product.stock }];
}

export async function GET() {
  const sellable = products.filter((p) => p.stock === undefined || p.stock > 0 || p.shoeVariants?.some((variant) => variant.stock > 0));

  let items = "";
  for (const product of sellable) {
    const image = getMerchantImage(product);
    if (!image) continue;

    const additionalImages = getMerchantAdditionalImages(product);
    const description =
      product.description ||
      `${product.name}, a contemporary women's ${product.category.toLowerCase()} style curated by ${BRAND} in San Diego.`;
    const color = product.colorNames?.[0];
    const material = product.materials;
    const basePrice = product.compareAt && product.compareAt > product.price ? product.compareAt : product.price;
    const salePrice = product.compareAt && product.compareAt > product.price ? product.price : undefined;
    const groupId = `amb-${product.slug}`;
    const variants = getFeedVariants(product);
    const hasVariants = variants.length > 1;

    for (const variant of variants) {
      const idParts = [groupId];
      if (variant.size) idParts.push(`size-${variantToken(variant.size)}`);
      if (variant.heelHeightCm !== undefined) idParts.push(`heel-${variantToken(variant.heelHeightCm)}`);
      const id = idParts.join("-");
      const link = merchantVariantLink(product, variant.size, variant.heelHeightCm);
      const availability = variant.stock === 0 ? "out_of_stock" : "in_stock";
      const title = [
        product.name,
        variant.size ? `Size ${variant.size}` : undefined,
        variant.heelHeightCm !== undefined ? `${variant.heelHeightCm} cm heel` : undefined,
      ]
        .filter(Boolean)
        .join(" - ");

      items += "  <item>\n";
      items += xml("g:id", id);
      items += xml("g:title", title);
      items += xml("g:description", description);
      items += xml("g:link", link);
      items += xml("g:image_link", image);
      for (const additionalImage of additionalImages) {
        items += xml("g:additional_image_link", additionalImage);
      }
      items += xml("g:price", `${basePrice.toFixed(2)} ${CURRENCY}`);
      if (salePrice !== undefined) {
        items += xml("g:sale_price", `${salePrice.toFixed(2)} ${CURRENCY}`);
      }
      items += xml("g:availability", availability);
      items += xml("g:condition", "new");
      items += xml("g:brand", product.vendor || BRAND);
      items += xml("g:google_product_category", getGoogleProductCategory(product));
      items += xml("g:product_type", `Women's ${product.category}`);
      items += xml("g:identifier_exists", "false");
      items += xml("g:gender", "female");
      items += xml("g:age_group", "adult");
      items += xml("g:color", color);
      items += xml("g:material", material);
      if (variant.size) {
        items += xml("g:size", variant.size);
        items += xml("g:size_system", "US");
        items += xml("g:size_type", sizeType(variant.size));
      }
      if (hasVariants) {
        items += xml("g:item_group_id", groupId);
        items += xml("g:item_group_title", product.name);
      }
      items += "  </item>\n";
    }
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
