import type { MetadataRoute } from "next";
import { categoryPages, products } from "./data";
import { stories } from "./journal/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ambboutique.online";
  const now = new Date();
  const staticPages = ["", "/collections", "/about", "/contact", "/faq", "/shipping", "/returns", "/privacy", "/terms", "/cookies", "/accessibility", "/size-guide", "/journal", "/sale"];
  return [
    ...staticPages.map((path) => ({ url: `${base}${path}`, lastModified: now, changeFrequency: path === "" ? "daily" as const : "monthly" as const, priority: path === "" ? 1 : path === "/collections" ? .9 : .6 })),
    ...categoryPages.map((category) => ({ url: `${base}/collections/${category.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: .8 })),
    ...products.map((product) => ({ url: `${base}/products/${product.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: .8 })),
    ...stories.map((story) => ({ url: `${base}/journal/${story.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: .6 })),
  ];
}
