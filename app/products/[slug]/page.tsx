import { notFound } from "next/navigation";
import { products } from "../../data";
import ProductDetail from "./product-detail";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) return {};
  const description = product.description || `${product.name} by AMB BOUTIQUE. Contemporary women’s ${product.category.toLowerCase()} curated in San Diego, California.`;
  const socialImage = product.images?.[0] || "/images/product-gallery.webp";
  return { title: product.name, description, alternates: { canonical: `/products/${product.slug}` }, openGraph: { type: "website", title: product.name, description, url: `/products/${product.slug}`, images: [socialImage] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const productJsonLd = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description || `${product.name}, a contemporary women’s ${product.category.toLowerCase()} style curated by AMB BOUTIQUE in San Diego.`, sku: `AMB-${product.slug.toUpperCase()}`, brand: { "@type": "Brand", name: "AMB BOUTIQUE" }, category: `Women’s ${product.category}`, image: product.images?.length ? product.images.map((image) => image.startsWith("http") ? image : `https://ambboutique.online${image}`) : ["https://ambboutique.online/images/product-gallery.webp"], offers: { "@type": "Offer", url: `https://ambboutique.online/products/${product.slug}`, priceCurrency: "USD", price: product.price.toFixed(2), availability: product.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition", seller: { "@id": "https://ambboutique.online/#store" } } };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}/><ProductDetail product={product} /></>;
}

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}
