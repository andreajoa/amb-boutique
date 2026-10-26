import release from "../../imports/products-20261004-release.json";
import type { Product } from "../data";
import type { CollectionProduct } from "./collections-client";

// Publication order, independent of later image or catalogue repairs.
const arrivalRanks = new Map(release.approvedSlugs.map((slug, index) => [slug, index + 1]));

export function toCollectionProducts(selectedProducts: Product[]): CollectionProduct[] {
  return selectedProducts.map((product) => ({
    slug: product.slug,
    arrivalRank: arrivalRanks.get(product.slug),
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
    price: product.price,
    sizePrices: product.sizePrices,
    compareAt: product.compareAt,
    badge: product.badge,
    sheet: product.sheet,
    quadrant: product.quadrant,
    colors: product.colors,
    rating: product.rating,
    images: product.images,
    gallerySprite: product.gallerySprite,
    galleryAtlasIndex: product.galleryAtlasIndex,
    galleryAtlasCount: product.galleryAtlasCount,
    heelAtlasIndex: product.heelAtlasIndex,
    available: typeof product.stock === "number"
      ? product.stock > 0
      : product.shoeVariants?.length
        ? product.shoeVariants.some((variant) => variant.stock > 0)
        : true,
  }));
}
