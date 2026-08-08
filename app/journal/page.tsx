import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../components";
import { stories } from "./data";

export const metadata: Metadata = { title: "The AMB Journal", description: "Women’s style guides, wardrobe ideas and San Diego fashion notes from AMB BOUTIQUE.", alternates: { canonical: "/journal" } };
export default function JournalPage() { return <main><Header/><section className="info-hero journal-hero"><p>STYLE FROM SAN DIEGO</p><h1>The AMB Journal</h1><span>Considered notes for getting dressed beautifully.</span></section><section className="journal journal-index section shell"><div className="journal-grid">{stories.map((story) => <article key={story.slug}><div className={`journal-photo ${story.image}`}/><p>{story.category}</p><h2>{story.title}</h2><span>{story.excerpt}</span><Link href={`/journal/${story.slug}`}>Read the story</Link></article>)}</div></section><Footer/></main>; }
