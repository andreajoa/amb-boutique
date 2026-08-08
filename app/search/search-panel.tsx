"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ProductCard } from "../components";
import { products } from "../data";

export function SearchPanel({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [searched, setSearched] = useState(Boolean(initialQuery));
  const results = query.trim() ? products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query.trim().toLowerCase())) : [];
  function submit(event: FormEvent) { event.preventDefault(); setSearched(true); }
  return <section className="search-section shell"><form className="site-search" role="search" onSubmit={submit}><label htmlFor="search-query">Search the boutique</label><div><input id="search-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “linen dress” or “bag”" autoFocus/><button className="button dark">Search</button></div></form>{searched && <><p className="search-count">{results.length ? `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”` : `No results for “${query}”`}</p>{results.length ? <div className="product-grid">{results.map((product) => <ProductCard product={product} key={product.slug}/>)}</div> : <p>Try a broader term, or browse <Link href="/collections">all collections</Link>.</p>}</>}</section>;
}
