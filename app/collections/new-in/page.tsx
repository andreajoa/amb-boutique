import type { Metadata } from "next";
import { products } from "../../data";
import { CollectionsClient } from "../collections-client";
import { toCollectionProducts } from "../collection-products";

export const metadata: Metadata = {
  title: "New In",
  description: "Discover the latest arrivals at AMB BOUTIQUE.",
  alternates: { canonical: "/collections/new-in" },
};

export default function NewInPage() {
  const arrivals = toCollectionProducts(products.filter((product) => /^(new|just in)$/i.test(product.badge || "")))
    .sort((a, b) => (b.arrivalRank ?? 0) - (a.arrivalRank ?? 0));

  return <CollectionsClient products={arrivals} initialNewOnly initialSort="newest" title="New In"/>;
}
