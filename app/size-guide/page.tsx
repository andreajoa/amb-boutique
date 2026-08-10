import type { Metadata } from "next";
import { Footer, Header } from "../components";
import { ShoeSizeGuide } from "../shoe-size-guide";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "AMB BOUTIQUE women’s size guide, including international shoe conversion and foot-length measurements for heels.",
  alternates: { canonical: "/size-guide" },
};

export default function SizeGuidePage() {
  return (
    <main>
      <Header />
      <section className="info-hero size-guide-hero"><div><p>FIT, MADE CLEAR</p><h1>Size Guide</h1><span>Use measurements first, then international conversions as a reference.</span></div></section>
      <div className="size-guide-page shell">
        <ShoeSizeGuide />
        <section className="apparel-size-note">
          <p>APPAREL</p>
          <h2>Clothing fit</h2>
          <span>For dresses, tops, playsuits and separates, use the Size Finder shown on each product page. It combines the measurements available for that individual style rather than relying on a single generic chart.</span>
        </section>
      </div>
      <Footer />
    </main>
  );
}
