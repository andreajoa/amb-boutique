import type { Metadata } from "next";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = { title: "Email Preferences", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 32, background: "#f4eee4" }}>
    <section style={{ maxWidth: 560, padding: "48px", background: "#fffdfa", border: "1px solid #ddd2c4" }}>
      <p style={{ letterSpacing: ".2em", fontSize: 11 }}>AMB BOUTIQUE</p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 42, fontWeight: 500 }}>Email preferences</h1>
      <UnsubscribeForm token={token}/>
    </section>
  </main>;
}

