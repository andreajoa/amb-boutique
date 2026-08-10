import type { MetadataRoute } from "next";

const privatePaths = ["/api/", "/cart", "/account", "/checkout/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: privatePaths },
      { userAgent: "ChatGPT-User", allow: "/", disallow: privatePaths },
    ],
    sitemap: "https://ambboutique.online/sitemap.xml",
    host: "https://ambboutique.online",
  };
}
