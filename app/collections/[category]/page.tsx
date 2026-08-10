import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header, ProductCard } from "../../components";
import { categoryPages, products } from "../../data";

export function generateStaticParams() { return categoryPages.map((category) => ({ category: category.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> { const { category } = await params; const item = categoryPages.find((entry) => entry.slug === category); return item ? { title: item.title, description: item.description, alternates: { canonical: `/collections/${item.slug}` }, openGraph: { title: item.title, description: item.description, url: `/collections/${item.slug}` } } : {}; }
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const entry = categoryPages.find((item) => item.slug === category);
  if (!entry) notFound();
  const selected = products.filter((product) => product.category === entry.name && (!entry.subcategory || product.subcategory === entry.subcategory));
  const collectionJsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: entry.title, description: entry.description, url: `https://ambboutique.online/collections/${entry.slug}`, isPartOf: { "@type": "WebSite", name: "AMB BOUTIQUE", url: "https://ambboutique.online" }, mainEntity: { "@type": "ItemList", itemListElement: selected.map((product, index) => ({ "@type": "ListItem", position: index + 1, url: `https://ambboutique.online/products/${product.slug}`, name: product.name })) } };
  return <main><Header/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}/><section className="collection-hero"><div><p>THE AMB EDIT</p><h1>{entry.title}</h1><span>{entry.description}</span></div></section><section className="collection-shell shell" data-reveal><div className="collection-toolbar"><p><strong>{selected.length}</strong> {selected.length === 1 ? "piece" : "pieces"}</p></div><div className="product-grid">{selected.map((product) => <ProductCard product={product} key={product.slug}/>)}</div></section><Footer/></main>;
}
