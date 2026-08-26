import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header, ProductCard } from "../../components";
import { categoryPages, products } from "../../data";

const siteUrl = "https://ambboutique.online";

export function generateStaticParams() {
  return categoryPages.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const item = categoryPages.find((entry) => entry.slug === category);
  if (!item) return {};

  const firstImage = products.find((product) => product.category === item.name && (!item.subcategory || product.subcategory === item.subcategory))?.images?.[0] || "/images/hero-01.webp";

  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: `/collections/${item.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: `${item.title} | AMB BOUTIQUE`,
      description: item.description,
      url: `/collections/${item.slug}`,
      images: [{ url: firstImage, alt: `${item.title} at AMB BOUTIQUE` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${item.title} | AMB BOUTIQUE`,
      description: item.description,
      images: [firstImage],
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const entry = categoryPages.find((item) => item.slug === category);
  if (!entry) notFound();

  const selected = products.filter((product) => product.category === entry.name && (!entry.subcategory || product.subcategory === entry.subcategory));
  const pageUrl = `${siteUrl}/collections/${entry.slug}`;

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    name: entry.title,
    description: entry.description,
    url: pageUrl,
    inLanguage: "en",
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: selected.length,
      itemListElement: selected.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/products/${product.slug}`,
        name: product.name,
      })),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Collections", item: `${siteUrl}/collections` },
      { "@type": "ListItem", position: 3, name: entry.title, item: pageUrl },
    ],
  };

  return <main>
    <Header/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}/>
    <section className="collection-hero"><div><p>THE AMB EDIT</p><h1>{entry.title}</h1><span>{entry.description}</span></div></section>
    <section className="collection-shell shell" data-reveal={entry.slug === "dresses" ? undefined : ""}>
      <div className="collection-toolbar"><p><strong>{selected.length}</strong> {selected.length === 1 ? "piece" : "pieces"}</p></div>
      <div className="product-grid">{selected.map((product) => <ProductCard product={product} key={product.slug}/>)}</div>
    </section>
    <Footer/>
  </main>;
}
