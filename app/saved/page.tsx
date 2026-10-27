"use client";

import Link from "next/link";
import { Footer, Header, ProductCard } from "../components";
import { products } from "../data";
import { useSavedItems } from "../saved-items";

export default function SavedPage() {
  const { saved } = useSavedItems();
  const items = saved.map((slug) => products.find((product) => product.slug === slug)).filter((product) => product !== undefined);
  return <main>
    <Header />
    <section className="section shell saved-page">
      <div className="section-heading centered"><div><p>YOUR SELECTION</p><h2>Saved pieces</h2></div></div>
      {items.length
        ? <div className="product-row">{items.map((product) => <ProductCard key={product.slug} product={product} compact />)}</div>
        : <p className="saved-empty">Tap <strong>Save</strong> on any piece to keep it here for later. <Link href="/collections">Explore the collection</Link></p>}
    </section>
    <Footer />
  </main>;
}
