import corrections from "../imports/catalog-corrections-20261024.json";

const reviewed = corrections.products as Record<string, { stockBySize: Record<string, number>; purchasable?: boolean }>;

/** Conservative size caps from the reviewed supplier SKU snapshot. */
export function stockForSize(product: { slug: string; stock?: number }, size: string) {
  const entry = reviewed[product.slug];
  if (!entry) return product.stock;
  if (entry.purchasable === false) return 0;
  const sizeStock = Object.prototype.hasOwnProperty.call(entry.stockBySize, size) ? entry.stockBySize[size] : 0;
  return Math.min(product.stock ?? sizeStock, sizeStock);
}
