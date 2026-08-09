"use client";

import { ProductCard } from "./components";
import type { Product } from "./data";
import { rankRecommendations } from "./recommendations";
import { useStore } from "./store-provider";

export function PersonalizedProducts({ catalog }: { catalog: Product[] }) {
  const { preferredCategories } = useStore();
  const recommendations = rankRecommendations(catalog, [], preferredCategories).slice(0, 4);
  return <div className="product-row">{recommendations.map((product) => <ProductCard key={product.slug} product={product} compact/>)}</div>;
}
