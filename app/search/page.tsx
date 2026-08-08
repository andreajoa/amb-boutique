import type { Metadata } from "next";
import { Footer, Header } from "../components";
import { SearchPanel } from "./search-panel";

export const metadata: Metadata = { title: "Search", description: "Search AMB BOUTIQUE dresses, tops, blouses, bags, shoes and women’s fashion.", alternates: { canonical: "/search" }, robots: { index: false, follow: true } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) { const { q = "" } = await searchParams; return <main><Header/><section className="info-hero"><p>FIND YOUR NEXT FAVORITE</p><h1>Search</h1><span>Dresses, tops, bags, shoes and more from the AMB edit.</span></section><SearchPanel initialQuery={q}/><Footer/></main>; }
