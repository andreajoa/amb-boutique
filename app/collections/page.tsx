import { products } from "../data";
import { CollectionsClient, type CollectionProduct } from "./collections-client";

export default function CollectionsPage() {
  const collectionProducts: CollectionProduct[] = products.map((product) => ({
    slug: product.slug,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
    price: product.price,
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

  return <CollectionsClient products={collectionProducts}/>;
}
