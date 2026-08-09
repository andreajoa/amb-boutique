import type { Product } from "./data";

const complements: Record<Product["category"], Product["category"][]> = {
  Dresses: ["Shoes", "Bags", "Accessories", "Knitwear"],
  Tops: ["Skirts", "Pants", "Shorts", "Shoes", "Bags", "Accessories"],
  Playsuits: ["Shoes", "Bags", "Accessories", "Knitwear"],
  Skirts: ["Tops", "Knitwear", "Shoes", "Bags", "Accessories"],
  Pants: ["Tops", "Knitwear", "Shoes", "Bags", "Accessories"],
  Shorts: ["Tops", "Knitwear", "Shoes", "Bags", "Accessories"],
  Knitwear: ["Skirts", "Pants", "Shorts", "Shoes", "Bags", "Accessories"],
  Bags: ["Dresses", "Tops", "Skirts", "Pants", "Shorts", "Shoes", "Accessories"],
  Shoes: ["Dresses", "Tops", "Skirts", "Pants", "Shorts", "Bags", "Accessories"],
  Accessories: ["Dresses", "Tops", "Skirts", "Pants", "Shorts", "Bags", "Shoes"],
};

export function rankRecommendations(catalog: Product[], excludedSlugs: string[], preferredCategories: string[] = [], anchorProducts: Product[] = []) {
  const excluded = new Set(excludedSlugs);
  const explicit = new Set(anchorProducts.flatMap((product) => product.complementarySlugs || []));
  const complementaryCategories = anchorProducts.flatMap((product) => complements[product.category]);
  const anchorCategories = new Set(anchorProducts.map((product) => product.category));
  const complementaryOnly = anchorProducts.length > 0;
  return catalog
    .filter((product) => !excluded.has(product.slug)
      && !anchorCategories.has(product.category)
      && (!complementaryOnly || complementaryCategories.includes(product.category)))
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

type StyleSlot = Product["category"][];
type StyleBlueprint = [StyleSlot[], StyleSlot[]];

// Each inner array is one outfit slot. Categories inside a slot are alternatives,
// never extra pieces. Missing inventory leaves the slot empty instead of inserting
// an unrelated product.
const styleBlueprints: Record<Product["category"], StyleBlueprint> = {
  Dresses: [[["Shoes"], ["Bags"], ["Accessories"]], [["Knitwear"], ["Shoes"], ["Bags"]]],
  Tops: [[["Skirts", "Pants", "Shorts"], ["Shoes"], ["Bags"]], [["Pants", "Skirts", "Shorts"], ["Shoes"], ["Accessories"]]],
  Playsuits: [[["Shoes"], ["Bags"], ["Accessories"]], [["Knitwear"], ["Shoes"], ["Bags"]]],
  Skirts: [[["Tops", "Knitwear"], ["Shoes"], ["Bags"]], [["Knitwear", "Tops"], ["Shoes"], ["Accessories"]]],
  Pants: [[["Tops", "Knitwear"], ["Shoes"], ["Bags"]], [["Knitwear", "Tops"], ["Shoes"], ["Accessories"]]],
  Shorts: [[["Tops", "Knitwear"], ["Shoes"], ["Bags"]], [["Knitwear", "Tops"], ["Shoes"], ["Accessories"]]],
  Knitwear: [[["Skirts", "Pants", "Shorts"], ["Shoes"], ["Bags"]], [["Pants", "Skirts", "Shorts"], ["Shoes"], ["Accessories"]]],
  Bags: [[["Dresses"], ["Shoes"], ["Accessories"]], [["Pants", "Skirts", "Shorts"], ["Tops", "Knitwear"], ["Shoes"]]],
  Shoes: [[["Dresses"], ["Bags"], ["Accessories"]], [["Pants", "Skirts", "Shorts"], ["Tops", "Knitwear"], ["Bags"]]],
  Accessories: [[["Dresses"], ["Shoes"], ["Bags"]], [["Pants", "Skirts", "Shorts"], ["Tops", "Knitwear"], ["Shoes"]]],
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
  return styleBlueprints[anchor.category].map((slots, lookIndex) => {
    const matches = slots.map((allowedCategories) => {
      const selected = ranked.find((product) => allowedCategories.includes(product.category) && !used.has(product.slug));
      if (selected) used.add(selected.slug);
      return selected;
    }).filter((product): product is Product => Boolean(product));
    return { ...names[lookIndex], products: [anchor, ...matches] };
  }).filter((look) => look.products.length > 1);
}

/** Returns one coherent outfit, without repeating the viewed product's category. */
export function createCompleteLook(anchor: Product, catalog: Product[], preferredCategories: string[] = []) {
  const looks = createStyleLooks(anchor, catalog, preferredCategories);
  const richest = looks.reduce<StyleLook | undefined>((best, look) => !best || look.products.length > best.products.length ? look : best, undefined);
  return richest?.products.filter((product) => product.slug !== anchor.slug) || [];
}
