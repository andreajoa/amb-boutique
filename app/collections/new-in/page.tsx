import type { Metadata } from "next";
import { products } from "../../data";
import { isNewArrival } from "../../storefront-products";
import { CollectionsClient } from "../collections-client";
import { toCollectionProducts } from "../collection-products";

export const metadata: Metadata = {
  title: "New In",
  description: "Discover the latest arrivals at AMB BOUTIQUE.",
  alternates: { canonical: "/collections/new-in" },
};

export default function NewInPage() {
  const arrivals = toCollectionProducts(products.filter(isNewArrival));

  return <CollectionsClient products={arrivals} initialNewOnly initialSort="newest" title="New In"/>;
}
