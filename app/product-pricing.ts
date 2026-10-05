import type { Product } from "./data";

type PricedProduct = Pick<Product, "price" | "sizePrices">;

/** Catalogue prices show the lowest available size; purchases specify a size. */
export function productPrice(product: PricedProduct, size?: string): number {
  if (!product.sizePrices) return product.price;
  if (size !== undefined) {
    const price = Object.hasOwn(product.sizePrices, size) ? product.sizePrices[size] : undefined;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      throw new Error("Choose an available size for this product.");
    }
    return price;
  }
  const prices = Object.values(product.sizePrices);
  if (!prices.length || prices.some((price) => !Number.isFinite(price) || price <= 0)) {
    throw new Error("This product's size pricing is unavailable.");
  }
  return Math.min(...prices);
}

export function hasPriceRange(product: PricedProduct): boolean {
  return Boolean(product.sizePrices && new Set(Object.values(product.sizePrices)).size > 1);
}

/** Resolve from trusted catalogue data before totals, margin checks or payment. */
export function productForSize(product: Product, size?: string): Product {
  if (!product.sizePrices) return product;
  if (!size || !product.sizes?.includes(size)) {
    throw new Error(`Choose an available size for ${product.name}.`);
  }
  return { ...product, price: productPrice(product, size) };
}
