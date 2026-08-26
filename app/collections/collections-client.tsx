"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Footer, Header, ProductCard, type ProductCardProduct } from "../components";
import type { Product } from "../data";
import { useStore } from "../store-provider";

export type CollectionProduct = ProductCardProduct & {
  category: Product["category"];
  subcategory?: string;
  available: boolean;
};

const PAGE_SIZE = 24;
const categories = [
  { value: "All", label: "Everything" },
  { value: "Dresses", label: "Dresses" },
  { value: "Tops", label: "Tops" },
  { value: "Sets", label: "Matching Sets" },
  { value: "Playsuits", label: "Playsuits" },
  { value: "Skirts", label: "Skirts" },
  { value: "Pants", label: "Pants" },
  { value: "Shorts", label: "Shorts" },
  { value: "Knitwear", label: "Knitwear" },
  { value: "Bags", label: "Bags" },
  { value: "Shoes", label: "Shoes" },
  { value: "Heels", label: "Heels" },
  { value: "Accessories", label: "Accessories" },
] as const;

export function CollectionsClient({ products }: { products: CollectionProduct[] }) {
  const highestPrice = useMemo(() => Math.max(0, Math.ceil(Math.max(...products.map((product) => product.price), 0) / 10) * 10), [products]);
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(highestPrice);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const gridRef = useRef<HTMLDivElement>(null);
  const previousPositions = useRef(new Map<string, DOMRect>());
  const { formatMoney } = useStore();

  const filtered = useMemo(() => {
    const selected = products.filter((product) => {
      const matchesCategory = category === "All"
        || (category === "Heels" ? product.category === "Shoes" && product.subcategory === "Heels" : product.category === category);
      const matchesStock = !inStockOnly || product.available;
      const matchesNew = !newOnly || /^(new|just in)$/i.test(product.badge || "");
      const matchesSale = !saleOnly || Boolean(product.compareAt && product.compareAt > product.price);
      return matchesCategory && matchesStock && matchesNew && matchesSale && product.price <= maxPrice;
    });
    if (sort === "low") selected.sort((a, b) => a.price - b.price);
    if (sort === "high") selected.sort((a, b) => b.price - a.price);
    if (sort === "name") selected.sort((a, b) => a.name.localeCompare(b.name));
    return selected;
  }, [category, inStockOnly, maxPrice, newOnly, products, saleOnly, sort]);

  const visibleProducts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const activeFilterCount = Number(inStockOnly) + Number(newOnly) + Number(saleOnly) + Number(maxPrice < highestPrice);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const currentPositions = new Map<string, DOMRect>();
    grid.querySelectorAll<HTMLElement>("[data-product-slug]").forEach((card) => {
      const slug = card.dataset.productSlug;
      if (!slug) return;
      const current = card.getBoundingClientRect();
      currentPositions.set(slug, current);
      const previous = previousPositions.current.get(slug);
      if (!previous || reduceMotion) return;
      const x = previous.left - current.left;
      const y = previous.top - current.top;
      if (Math.abs(x) < 1 && Math.abs(y) < 1) return;
      card.animate(
        [{ transform: `translate(${x}px, ${y}px)`, opacity: 0.72 }, { transform: "translate(0, 0)", opacity: 1 }],
        { duration: 420, easing: "cubic-bezier(.2,.7,.2,1)" },
      );
    });
    previousPositions.current = currentPositions;
  }, [visibleProducts]);

  const selectCategory = (value: string) => {
    setCategory(value);
    setVisibleCount(PAGE_SIZE);
  };

  const clearFilters = () => {
    setCategory("All");
    setInStockOnly(false);
    setNewOnly(false);
    setSaleOnly(false);
    setMaxPrice(highestPrice);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <main>
      <Header />
      <section className="collection-hero"><div><p>THE AMB EDIT</p><h1>Shop All</h1><span>Easy silhouettes, polished layers and finishing touches curated for modern life.</span></div></section>
      <nav className="collection-tabs" aria-label="Product categories">
        {categories.map((item) => <button type="button" key={item.value} className={category === item.value ? "active" : ""} aria-pressed={category === item.value} onClick={() => selectCategory(item.value)} data-track={`collection-category:${item.value}`}>{item.label}</button>)}
      </nav>

      <section className="collection-shell shell">
        <div className="collection-toolbar">
          <p aria-live="polite"><strong>{filtered.length}</strong> {filtered.length === 1 ? "piece" : "pieces"}</p>
          <div>
            <button type="button" className={`filter-button${activeFilterCount ? " active" : ""}`} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-controls="collection-filters" data-track="collection-filter-toggle">Filter{activeFilterCount ? ` (${activeFilterCount})` : ""} <span aria-hidden="true">☷</span></button>
            <label className="sort-select"><span className="sr-only">Sort products</span><select value={sort} onChange={(event) => { setSort(event.target.value); setVisibleCount(PAGE_SIZE); }} data-track="collection-sort"><option value="featured">Sort by: Featured</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option><option value="name">Name: A–Z</option></select></label>
          </div>
        </div>

        {filtersOpen && <div className="filter-panel" id="collection-filters"><div><strong>Category</strong>{categories.map((item) => <label key={item.value}><input type="radio" name="category" checked={category === item.value} onChange={() => selectCategory(item.value)}/>{item.label}</label>)}</div><div><strong>Availability</strong><label><input type="checkbox" checked={inStockOnly} onChange={(event) => { setInStockOnly(event.target.checked); setVisibleCount(PAGE_SIZE); }}/> In stock</label><label><input type="checkbox" checked={newOnly} onChange={(event) => { setNewOnly(event.target.checked); setVisibleCount(PAGE_SIZE); }}/> New arrivals</label><label><input type="checkbox" checked={saleOnly} onChange={(event) => { setSaleOnly(event.target.checked); setVisibleCount(PAGE_SIZE); }}/> On sale</label></div><div><strong>Price</strong><span>Up to {formatMoney(maxPrice)}</span><input aria-label="Maximum price" type="range" min="0" max={highestPrice} step="5" value={maxPrice} onChange={(event) => { setMaxPrice(Number(event.target.value)); setVisibleCount(PAGE_SIZE); }}/><span className="filter-price-limit">Maximum {formatMoney(highestPrice)}</span></div><button type="button" onClick={clearFilters}>Clear filters</button></div>}

        {visibleProducts.length ? <div className="product-grid filterable-grid" ref={gridRef}>{visibleProducts.map((product) => <ProductCard key={product.slug} product={product} />)}</div> : <div className="collection-empty" role="status"><h2>No pieces match these filters.</h2><p>Clear the filters to return to the complete AMB edit.</p><button type="button" className="button dark" onClick={clearFilters}>Clear filters</button></div>}
        <p className="results-count">Showing {visibleProducts.length} of {filtered.length} matching pieces.</p>
        {visibleProducts.length < filtered.length && <button type="button" className="load-more-button" onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length))} data-track="collection-load-more">Load more</button>}
      </section>

      <section className="collection-explore shell" data-reveal><p>SHOP BY MOOD</p><h2>Explore the Collections</h2><div><Link href="/collections/tops-blouses" className="category-one q2"><span>Tops & Blouses<small>Everyday, elevated</small></span></Link><Link href="/collections/dresses" className="category-one q1"><span>Dresses<small>Made for the moment</small></span></Link><Link href="/collections/heels" className="category-one q3"><span>Heels<small>The finishing touch</small></span></Link></div></section>
      <Footer />
    </main>
  );
}
