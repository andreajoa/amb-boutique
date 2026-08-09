"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Footer, Header, ProductCard } from "../components";
import { products } from "../data";

const categories = ["All", "Dresses", "Tops", "Playsuits", "Skirts", "Shorts", "Knitwear", "Bags", "Shoes", "Accessories"] as const;

export default function CollectionsPage() {
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const selected = category === "All" ? [...products] : products.filter((p) => p.category === category);
    if (sort === "low") selected.sort((a, b) => a.price - b.price);
    if (sort === "high") selected.sort((a, b) => b.price - a.price);
    if (sort === "name") selected.sort((a, b) => a.name.localeCompare(b.name));
    return selected;
  }, [category, sort]);

  return (
    <main>
      <Header />
      <section className="collection-hero"><div><p>THE AMB EDIT</p><h1>Shop All</h1><span>Easy silhouettes, polished layers and finishing touches curated for modern life.</span></div></section>
      <nav className="collection-tabs" aria-label="Product categories">
        {categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item === "All" ? "Everything" : item}</button>)}
      </nav>

      <section className="collection-shell shell" data-reveal>
        <div className="collection-toolbar">
          <p><strong>{filtered.length}</strong> {filtered.length === 1 ? "piece" : "pieces"}</p>
          <div>
            <button className="filter-button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}>Filter <span>☷</span></button>
            <label className="sort-select"><span className="sr-only">Sort products</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Sort by: Featured</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option><option value="name">Name: A–Z</option></select></label>
          </div>
        </div>

        {filtersOpen && <div className="filter-panel"><div><strong>Category</strong>{categories.map((item) => <label key={item}><input type="radio" name="category" checked={category === item} onChange={() => setCategory(item)}/>{item === "All" ? "Everything" : item}</label>)}</div><div><strong>Availability</strong><label><input type="checkbox"/> In stock</label><label><input type="checkbox"/> New arrivals</label><label><input type="checkbox"/> On sale</label></div><div><strong>Price</strong><span>$0</span><input aria-label="Maximum price" type="range" min="0" max="200" defaultValue="200"/><span>$200+</span></div><button onClick={() => { setCategory("All"); setFiltersOpen(false); }}>Clear filters</button></div>}

        <div className="product-grid">{filtered.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
        <p className="results-count">Showing {filtered.length} of {products.length} pieces.</p>
      </section>

      <section className="collection-explore shell" data-reveal><p>SHOP BY MOOD</p><h2>Explore the Collections</h2><div><Link href="/collections/tops-blouses" className="category-one q2"><span>Tops & Blouses<small>Everyday, elevated</small></span></Link><Link href="/collections/dresses" className="category-one q1"><span>Dresses<small>Made for the moment</small></span></Link><Link href="/collections/bags" className="category-two q3"><span>Bags<small>The finishing touch</small></span></Link></div></section>
      <Footer />
    </main>
  );
}
