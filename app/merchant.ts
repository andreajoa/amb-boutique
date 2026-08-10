import type { Product } from "./data";

export const merchantSiteUrl = "https://ambboutique.online";

// Some products use multi-product editorial atlases in the storefront gallery.
// Merchant Center must receive one clean product image, never the full atlas.
const merchantImageOverrides: Record<string, string> = {
  "camille-multi-pocket-crossbody-black": "https://ae01.alicdn.com/kf/S3affadc9f04e49f797aa92118ffedb32s.jpg",
  "camille-multi-pocket-crossbody-green": "https://ae01.alicdn.com/kf/S3165e8413c8a49459920718c9d8a75fbq.jpg",
  "siena-signature-satchel-kangaroo-brown": "https://ae01.alicdn.com/kf/S92477319ee894cdf908d3991e7869544H.jpg",
  "marina-structured-tote-black": "https://ae01.alicdn.com/kf/S17b24d99d47b4479beaad67fe8278542Q.jpg",
  "solene-woven-slingback": "https://ae01.alicdn.com/kf/S655d62ab31404631807ff432090cb079c.jpg",
  "monaco-buckle-slingback": "https://ae01.alicdn.com/kf/S1fbeb0fa6d6c463facd3d85f6a2f7c60g.jpg",
  "onyx-buckle-pump": "https://ae01.alicdn.com/kf/Sd67d5605437e42508835c41803929a83e.jpg",
  "noir-matte-slingback": "https://ae01.alicdn.com/kf/Sa5c914c312d843978ca77e11e99d8299w.jpg",
  "rouge-bow-pump": "https://ae01.alicdn.com/kf/S29b4f55d90b24469abc87f809b0fd13fA.jpg",
};

const supportedRaster = /\.(?:jpe?g|png|webp|gif|bmp|tiff?)(?:\?.*)?$/i;

function absoluteImage(image: string) {
  return image.startsWith("http") ? image : `${merchantSiteUrl}${image}`;
}

export function getMerchantImage(product: Product): string | null {
  const override = merchantImageOverrides[product.slug];
  if (override) return override;

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
