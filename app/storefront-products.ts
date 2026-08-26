import { products, type Product } from "./data";

/**
 * Products whose final four-view galleries have passed the catalogue approval
 * gates documented in docs/CATALOG-STANDARDIZATION-PROGRESS.md.
 *
 * A slug must not be added here until its gallery is approved and integrated.
 * Homepage merchandising uses this list so an unfinished import cannot be
 * promoted accidentally.
 */
const approvedGallerySlugs = [
  "calla-maxi-dress",
  "talia-wide-leg-trousers",
  "mira-wide-leg-trousers",
  "unity-wide-leg-trousers",
  "xyla-wide-leg-trousers",
  "kira-wide-leg-trousers",
  "ivy-wide-leg-trousers",
] as const;

const approvedGallerySet = new Set<string>(approvedGallerySlugs);

export function isStorefrontReady(product: Product): boolean {
  const hasFourFinalViews = product.images?.length === 4
    && product.images.every((image) => image.endsWith(".webp"));
  const isInStock = typeof product.stock === "number" && product.stock > 0;
  return approvedGallerySet.has(product.slug) && hasFourFinalViews && isInStock;
}

export const storefrontReadyProducts = products.filter(isStorefrontReady);

