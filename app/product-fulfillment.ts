import type { Product } from "./data";

/** Preparation is separate from orderable stock and transit after dispatch. */
export function getPreparationNotice(product?: Pick<Product, "fulfillment">): string | undefined {
  const notice = product?.fulfillment?.notice.trim();
  return notice || undefined;
}
