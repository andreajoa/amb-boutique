import { notFound } from "next/navigation";
import { products } from "../../data";
import ProductDetail from "./product-detail";
import type { Metadata } from "next";

const siteUrl = "https://ambboutique.online";
const servedMarkets = ["US", "CA", "GB", "AU", "NZ"];

function absoluteImage(image: string) {
  return image.startsWith("http") ? image : `${siteUrl}${image}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) return {};

  const description = product.description || `${product.name} by AMB BOUTIQUE. Shop contemporary women’s ${product.category.toLowerCase()} curated in San Diego with delivery to the US, Canada, UK, Australia and New Zealand.`;
  const socialImage = product.images?.[0] || "/images/product-gallery.webp";

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: `${product.name} | AMB BOUTIQUE`,
      description,
      url: `/products/${product.slug}`,
      images: [{ url: socialImage, alt: `${product.name} by AMB BOUTIQUE` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | AMB BOUTIQUE`,
      description,
      images: [socialImage],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();

  const pageUrl = `${siteUrl}/products/${product.slug}`;
  const productImages = product.images?.length
    ? product.images.map(absoluteImage)
    : [`${siteUrl}/images/product-gallery.webp`];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${pageUrl}#product`,
    url: pageUrl,
    name: product.name,
    description: product.description || `${product.name}, a contemporary women’s ${product.category.toLowerCase()} style curated by AMB BOUTIQUE in San Diego.`,
    sku: `AMB-${product.slug.toUpperCase()}`,
    brand: { "@type": "Brand", name: "AMB BOUTIQUE" },
    category: `Women’s ${product.category}`,
    image: productImages,
    ...(product.colorNames?.length ? { color: product.colorNames.join(", ") } : {}),
    ...(product.materials ? { material: product.materials } : {}),
    audience: { "@type": "PeopleAudience", suggestedGender: "female" },
    offers: {
      "@type": "Offer",
      url: pageUrl,
      priceCurrency: "USD",
      price: product.price.toFixed(2),
      availability: product.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      eligibleRegion: servedMarkets,
      seller: { "@id": `${siteUrl}/#store` },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: product.category, item: `${siteUrl}/collections` },
      { "@type": "ListItem", position: 3, name: product.name, item: pageUrl },
    ],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}/>
    <ProductDetail product={product} />
  </>;
}

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}
