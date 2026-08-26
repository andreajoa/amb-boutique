import { products, type Product } from "./data";
import { approvedNewProductSlugs } from "./generated-products";

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
