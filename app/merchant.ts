import type { Product } from "./data";

export const merchantSiteUrl = "https://ambboutique.online";

// Some shoe products use a 1x3 vertical editorial sprite in the storefront gallery.
// Merchant Center must receive one clean standalone AMB product image, never a sprite or external supplier CDN.
const merchantImageOverrides: Record<string, string> = {
  "solene-woven-slingback": "/products/solene-woven-slingback/merchant-primary.webp",
  "monaco-buckle-slingback": "/products/monaco-buckle-slingback/merchant-primary.webp",
  "onyx-buckle-pump": "/products/onyx-buckle-pump/merchant-primary.webp",
};

const supportedRaster = /\.(?:jpe?g|png|webp|gif|bmp|tiff?)(?:\?.*)?$/i;

function absoluteImage(image: string) {
  return image.startsWith("http") ? image : `${merchantSiteUrl}${image}`;
}

export function getMerchantImage(product: Product): string | null {
  const override = merchantImageOverrides[product.slug];
  if (override) return absoluteImage(override);

  const image = product.images?.find((candidate) =>
    supportedRaster.test(candidate) &&
    !candidate.includes("user-replacements-atlas") &&
    !candidate.includes("amb-shoes-atlas")
  );

  return image ? absoluteImage(image) : null;
}

export function getMerchantAdditionalImages(product: Product): string[] {
  const primary = getMerchantImage(product);
  const unique = new Set<string>();

  for (const image of product.images || []) {
    if (!supportedRaster.test(image) || image.includes("user-replacements-atlas") || image.includes("amb-shoes-atlas")) continue;
    const absolute = absoluteImage(image);
    if (absolute !== primary) unique.add(absolute);
    if (unique.size >= 10) break;
  }

  return [...unique];
}

export function getGoogleProductCategory(product: Product) {
  if (product.category === "Shoes") return "Apparel & Accessories > Shoes";
  if (product.category === "Bags") return "Apparel & Accessories > Handbags, Wallets & Cases > Handbags";
  if (product.category === "Accessories") return "Apparel & Accessories > Clothing Accessories";
  return "Apparel & Accessories > Clothing";
}

export function merchantVariantLink(product: Product, size?: string, heelHeightCm?: number) {
  const params = new URLSearchParams();
  if (size) params.set("size", size);
  if (heelHeightCm !== undefined) params.set("heel", String(heelHeightCm));
  const query = params.toString();
  return `${merchantSiteUrl}/products/${product.slug}${query ? `?${query}` : ""}`;
}
