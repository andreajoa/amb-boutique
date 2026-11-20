// Browser-safe offer maths. The browser never sees a product's cost: each
// product carries, per price, the highest discount the server's margin guard
// approves (offerCeilingByPrice). For any request between 0 and 25%,
// protectMargin(product, request).approvedPercent === min(request, ceiling).

export function offerPriceKey(price: number) {
  return String(Math.round(price * 100));
}

export function approvedOfferPercent(
  product: { price: number; offerCeilingByPrice?: Record<string, number> },
  requestedPercent: number,
) {
  const requested = Math.max(0, Math.min(25, requestedPercent));
  const ceiling = product.offerCeilingByPrice?.[offerPriceKey(product.price)];
  // Unknown ceiling = unknown cost: no automatic discount (fail closed).
  return typeof ceiling === "number" && Number.isFinite(ceiling) ? Math.min(requested, ceiling) : 0;
}
