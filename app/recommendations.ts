import type { Product } from "./data";

const complements: Record<Product["category"], Product["category"][]> = {
  Dresses: ["Shoes", "Bags", "Accessories"],
  Tops: ["Skirts", "Shorts", "Bags"],
  Playsuits: ["Shoes", "Bags", "Accessories"],
  Skirts: ["Tops", "Shoes", "Bags"],
  Pants: ["Tops", "Shoes", "Bags"],
  Shorts: ["Tops", "Shoes", "Bags"],
  Knitwear: ["Skirts", "Bags", "Accessories"],
  Bags: ["Dresses", "Shoes", "Accessories"],
  Shoes: ["Dresses", "Bags", "Accessories"],
  Accessories: ["Dresses", "Bags", "Shoes"],
};

export function rankRecommendations(catalog: Product[], excludedSlugs: string[], preferredCategories: string[] = [], anchorProducts: Product[] = []) {
  const excluded = new Set(excludedSlugs);
  const explicit = new Set(anchorProducts.flatMap((product) => product.complementarySlugs || []));
  const complementaryCategories = anchorProducts.flatMap((product) => complements[product.category]);
  return catalog
    .filter((product) => !excluded.has(product.slug))
    .map((product, index) => ({
      product,
      score: (explicit.has(product.slug) ? 100 : 0)
        + (complementaryCategories.includes(product.category) ? 30 : 0)
        + (preferredCategories.includes(product.category) ? 12 : 0)
        + (product.rating ? 4 : 0)
        - index / 100,
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.product);
}

const styleBlueprints: Record<Product["category"], [Product["category"][], Product["category"][]]> = {
  Dresses: [["Shoes", "Bags", "Accessories"], ["Knitwear", "Shoes", "Bags"]],
  Tops: [["Skirts", "Shoes", "Bags"], ["Pants", "Shoes", "Accessories"]],
  Playsuits: [["Shoes", "Bags", "Accessories"], ["Knitwear", "Shoes", "Bags"]],
  Skirts: [["Tops", "Shoes", "Bags"], ["Knitwear", "Shoes", "Accessories"]],
  Pants: [["Tops", "Shoes", "Bags"], ["Knitwear", "Shoes", "Accessories"]],
  Shorts: [["Tops", "Shoes", "Bags"], ["Knitwear", "Shoes", "Accessories"]],
  Knitwear: [["Skirts", "Shoes", "Bags"], ["Dresses", "Shoes", "Accessories"]],
  Bags: [["Dresses", "Shoes", "Accessories"], ["Tops", "Skirts", "Shoes"]],
  Shoes: [["Dresses", "Bags", "Accessories"], ["Pants", "Tops", "Bags"]],
  Accessories: [["Dresses", "Shoes", "Bags"], ["Tops", "Skirts", "Shoes"]],
};

export type StyleLook = { title: string; description: string; products: Product[] };

/** Produces two category-balanced outfits while avoiding duplicate suggestions. */
export function createStyleLooks(anchor: Product, catalog: Product[], preferredCategories: string[] = []): StyleLook[] {
  const ranked = rankRecommendations(catalog, [anchor.slug], preferredCategories, [anchor]);
  const used = new Set([anchor.slug]);
  const names = [
    { title: "Coastal Polished", description: "Clean lines, refined contrast and an effortless San Diego finish." },
    { title: "Golden Hour", description: "A softer styling direction with warm, feminine finishing touches." },
  ];
  return styleBlueprints[anchor.category].map((categories, lookIndex) => {
    const matches = categories.map((category) => {
      const fresh = ranked.find((product) => product.category === category && !used.has(product.slug));
      const fallback = ranked.find((product) => product.category === category) || ranked.find((product) => !used.has(product.slug));
      const selected = fresh || fallback;
      if (selected) used.add(selected.slug);
      return selected;
    }).filter((product): product is Product => Boolean(product));
    return { ...names[lookIndex], products: [anchor, ...matches] };
  });
}
