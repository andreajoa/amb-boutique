import { notFound } from "next/navigation";
import { products } from "../../data";
import { getShippingQuotes } from "../../commerce";
import { getMerchantAdditionalImages, getMerchantImage, merchantVariantLink } from "../../merchant";
import ProductDetail from "./product-detail";
import type { Metadata } from "next";

const siteUrl = "https://ambboutique.online";
const servedMarkets = ["US", "CA", "GB", "AU", "NZ"];

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ size?: string; heel?: string }>;
};

export async function generateMetadata({ params }: Pick<ProductPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) return {};

  const description = product.description || `${product.name} by AMB BOUTIQUE. Shop contemporary women’s ${product.category.toLowerCase()} curated in San Diego with delivery to the US, Canada, UK, Australia and New Zealand.`;
  const socialImage = getMerchantImage(product) || "/images/product-gallery.webp";

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

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();

  const requestedHeel = query.heel === undefined ? undefined : Number(query.heel);
  const initialHeelHeightCm = Number.isFinite(requestedHeel) ? requestedHeel : undefined;
  const selectedShoeVariant = product.shoeVariants?.find((variant) => variant.heelHeightCm === initialHeelHeightCm);
  const availableSizes = selectedShoeVariant?.sizes || product.sizes || [];
  const selectedSize = query.size && availableSizes.includes(query.size) ? query.size : undefined;
  const activeStock = selectedShoeVariant?.stock ?? product.stock;
  const pageUrl = `${siteUrl}/products/${product.slug}`;
  const variantPageUrl = merchantVariantLink(product, selectedSize, initialHeelHeightCm);
  const merchantPrimary = getMerchantImage(product);
  const productImages = merchantPrimary
    ? [merchantPrimary, ...getMerchantAdditionalImages(product)]
    : [`${siteUrl}/images/product-gallery.webp`];
  const usShipping = getShippingQuotes("US", product.price, product.weightOz || 12)[0];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${variantPageUrl}#product`,
    url: variantPageUrl,
    name: product.name,
    description: product.description || `${product.name}, a contemporary women’s ${product.category.toLowerCase()} style curated by AMB BOUTIQUE in San Diego.`,
    sku: `AMB-${product.slug.toUpperCase()}${selectedSize ? `-${selectedSize.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}` : ""}`,
    brand: { "@type": "Brand", name: product.vendor || "AMB BOUTIQUE" },
    category: `Women’s ${product.category}`,
    image: productImages,
    ...(product.colorNames?.length ? { color: product.colorNames.join(", ") } : {}),
    ...(product.materials ? { material: product.materials } : {}),
    ...(selectedSize ? { size: selectedSize } : {}),
    audience: { "@type": "PeopleAudience", suggestedGender: "female", suggestedMinAge: 18 },
    offers: {
      "@type": "Offer",
      url: variantPageUrl,
      priceCurrency: "USD",
      price: product.price.toFixed(2),
      availability: activeStock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      eligibleRegion: servedMarkets,
      seller: { "@id": `${siteUrl}/#store` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
        shippingRate: { "@type": "MonetaryAmount", value: usShipping.amountUsd.toFixed(2), currency: "USD" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: usShipping.minBusinessDays, maxValue: usShipping.maxBusinessDays, unitCode: "DAY" },
        },
      },
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
    <ProductDetail product={product} initialSize={selectedSize} initialHeelHeightCm={initialHeelHeightCm} />
  </>;
}

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}
