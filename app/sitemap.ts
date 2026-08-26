import type { MetadataRoute } from "next";
import { categoryPages, products } from "./data";
import { stories } from "./journal/data";

const base = "https://ambboutique.online";
const siteModified = new Date("2026-08-10T00:00:00.000Z");
const catalogueModified = new Date("2026-08-24T00:00:00.000Z");

function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${base}${path}`;
}

function indexableImages(images?: string[]) {
  return (images || [])
    .filter((image) => /\.(webp|png|jpe?g)(\?.*)?$/i.test(image))
    .map(absoluteUrl)
    .slice(0, 8);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/collections", "/about", "/contact", "/faq", "/shipping", "/returns", "/privacy", "/terms", "/cookies", "/accessibility", "/size-guide", "/journal", "/sale"];

  return [
    ...staticPages.map((path) => ({
      url: `${base}${path}`,
      lastModified: path === "" || path === "/collections" || path === "/sale" ? catalogueModified : siteModified,
      changeFrequency: path === "" ? "daily" as const : "monthly" as const,
      priority: path === "" ? 1 : path === "/collections" ? .9 : .6,
      ...(path === "" ? { images: [
        `${base}/images/hero-01.webp`,
        `${base}/images/hero-02.webp`,
        `${base}/images/hero-03.webp`,
        `${base}/images/hero-04.webp`,
      ] } : {}),
    })),
    ...categoryPages.map((category) => {
      const categoryImages = products
        .filter((product) => product.category === category.name && (!category.subcategory || product.subcategory === category.subcategory))
        .flatMap((product) => indexableImages(product.images).slice(0, 1))
        .slice(0, 8);
      return {
        url: `${base}/collections/${category.slug}`,
        lastModified: catalogueModified,
        changeFrequency: "weekly" as const,
        priority: .8,
        ...(categoryImages.length ? { images: categoryImages } : {}),
      };
    }),
    ...products.map((product) => {
      const images = indexableImages(product.images);
      return {
        url: `${base}/products/${product.slug}`,
        lastModified: catalogueModified,
        changeFrequency: "weekly" as const,
        priority: .8,
        ...(images.length ? { images } : {}),
      };
    }),
    ...stories.map((story) => ({
      url: `${base}/journal/${story.slug}`,
      lastModified: siteModified,
      changeFrequency: "monthly" as const,
      priority: .6,
    })),
  ];
}
