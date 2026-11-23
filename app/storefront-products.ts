import { products, type Product } from "./data";
import { approvedNewProductSlugs } from "./generated-products";
import release from "../imports/products-20261004-release.json";

const arrivalRanks = new Map(release.approvedSlugs.map((slug, index) => [slug, index + 1]));
const approvedCount = approvedNewProductSlugs.size;
Array.from(approvedNewProductSlugs).forEach((slug, index) => {
  arrivalRanks.set(slug, release.approvedSlugs.length + approvedCount - index);
});

export function arrivalRank(slug: string): number {
  return arrivalRanks.get(slug) ?? 0;
}

export function isNewArrival(product: Pick<Product, "slug" | "badge">): boolean {
  return approvedNewProductSlugs.has(product.slug) || /^(new|just in)$/i.test(product.badge || "");
}

/**
 * Homepage merchandising uses the same approval source as the public catalogue
 * so a product cannot be featured until its final gallery is active.
 */
export function isStorefrontReady(product: Product): boolean {
  const hasFourFinalViews = product.images?.length === 4
    && product.images.every((image) => image.endsWith(".webp"));
  const isInStock = typeof product.stock === "number" && product.stock > 0;
  return approvedNewProductSlugs.has(product.slug) && hasFourFinalViews && isInStock;
}

export const storefrontReadyProducts = products.filter(isStorefrontReady);
export const storefrontNewArrivals = storefrontReadyProducts.slice()
  .sort((a, b) => arrivalRank(b.slug) - arrivalRank(a.slug));
