import Link from "next/link";
import { Footer, Header, ProductCard } from "./components";
import { products } from "./data";

const collections = [
  { title: "Dresses", subtitle: "Made for every plan", image: "sheet-one q1", href: "/collections?category=Dresses" },
  { title: "Tops & Blouses", subtitle: "Elevated everyday layers", image: "sheet-one q2", href: "/collections?category=Tops" },
  { title: "Bags", subtitle: "The finishing touch", image: "sheet-two q1", href: "/collections?category=Bags" },
];

export default function Home() {
  return (
    <main>
      <Header />
      <section className="hero" aria-label="AMB Boutique summer edit">
        <div className="hero-content">
          <p>THE SAN DIEGO EDIT</p>
          <h1>Effortless style,<br/>beautifully considered.</h1>
          <span>Fresh silhouettes and refined essentials for every day.</span>
          <div className="hero-actions"><Link className="button light" href="/collections">Shop New Arrivals</Link><Link className="button ghost" href="/collections">Shop Best Sellers</Link></div>
        </div>
        <span className="hero-index">01&nbsp;&nbsp;—&nbsp;&nbsp;03</span>
      </section>

      <section className="statement-strip"><p>New season, new perspective.</p><span>Curated in San Diego · Designed for wherever life takes you.</span><Link href="/collections">Discover the Edit</Link></section>

      <section className="section shell">
        <div className="section-heading"><div><p>CURATED FOR YOU</p><h2>Trending Now</h2></div><Link href="/collections">View all</Link></div>
        <div className="product-row">{products.slice(0, 4).map((p) => <ProductCard key={p.slug} product={p} compact />)}</div>
      </section>

      <section className="collection-tiles shell">
        {collections.map((item) => <Link href={item.href} key={item.title} className={`collection-tile ${item.image}`}><div><p>{item.subtitle}</p><h2>{item.title}</h2><span>Shop Now</span></div></Link>)}
      </section>

      <section className="editorial-banner">
        <div><p>THE COASTAL WARDROBE</p><h2>Sunlit in San Diego</h2><span>Soft tailoring, fluid dresses and understated accessories inspired by golden-hour days.</span><Link className="button dark" href="/collections">Shop the Story</Link></div>
      </section>

      <section className="section shell">
        <div className="section-heading centered"><div><p>FRESHLY CURATED</p><h2>Just Arrived</h2></div></div>
        <div className="product-row">{products.slice(4, 8).map((p) => <ProductCard key={p.slug} product={p} compact />)}</div>
      </section>

      <section className="values-band"><div><strong>San Diego Born</strong><span>California ease, thoughtfully curated</span></div><div><strong>Easy Returns</strong><span>Simple returns within 30 days</span></div><div><strong>Worldwide Delivery</strong><span>US, Canada, UK, Australia & New Zealand</span></div><div><strong>Personal Service</strong><span>We’re here at info@ambboutique.online</span></div></section>

      <section className="explore section shell">
        <div className="section-heading centered"><div><p>FIND YOUR FAVORITES</p><h2>Explore the Collections</h2></div></div>
        <div className="explore-grid">
          <Link href="/collections?category=Dresses" className="explore-card sheet-one q3"><div><h3>Dresses</h3><span>Shop 24 styles</span></div></Link>
          <Link href="/collections?category=Playsuits" className="explore-card sheet-two q2"><div><h3>Playsuits</h3><span>Shop 12 styles</span></div></Link>
          <Link href="/collections?category=Shoes" className="explore-card sheet-two q3"><div><h3>Shoes</h3><span>Shop 18 styles</span></div></Link>
        </div>
      </section>

      <section className="feature-split">
        <div className="feature-copy"><p>THE AMB FAVORITE</p><h2>Catalina Shoulder Bag</h2><span>Clean lines, a warm caramel finish and just enough room for every day.</span><strong>$128</strong><Link className="button dark" href="/collections">View the Bag</Link></div>
        <div className="feature-image sheet-two q1" role="img" aria-label="Catalina caramel shoulder bag styled with a cream dress" />
      </section>

      <section className="founder section shell">
        <div className="founder-image story-editorial" role="img" aria-label="AMB Boutique new arrivals editorial" />
        <div className="founder-copy"><p>OUR STORY</p><h2>A boutique with a<br/>California state of mind.</h2><blockquote>“I created AMB BOUTIQUE for women who want getting dressed to feel easy, polished and personal.”</blockquote><span>— Ana Paula Maciel, Founder</span><p>From our home in San Diego, every piece is selected for its versatility, confidence and effortless femininity.</p><a href="mailto:info@ambboutique.online">Meet AMB Boutique</a></div>
      </section>

      <section className="journal section shell">
        <div className="section-heading centered"><div><p>THE AMB JOURNAL</p><h2>Style Notes</h2></div></div>
        <div className="journal-grid">
          <article><div className="journal-photo sheet-one q1"/><p>THE EDIT</p><h3>What to wear from brunch to golden hour</h3><a href="#">Read the story</a></article>
          <article><div className="journal-photo sheet-two q1"/><p>ACCESSORIES</p><h3>The everyday bag, perfected</h3><a href="#">Read the story</a></article>
          <article><div className="journal-photo sheet-one q4"/><p>STYLE GUIDE</p><h3>Five pieces, endless possibilities</h3><a href="#">Read the story</a></article>
        </div>
      </section>

      <section className="newsletter"><div className="newsletter-photo" role="img" aria-label="AMB Boutique San Diego fashion editorial"/><div><p>JOIN THE AMB LIST</p><h2>A little something<br/>beautiful, in your inbox.</h2><span>Be first to discover new arrivals, private offers and style notes from San Diego.</span><form action="mailto:info@ambboutique.online" method="post" encType="text/plain"><label className="sr-only" htmlFor="email">Email address</label><input id="email" name="email" type="email" placeholder="Enter your email address" required/><button type="submit">Join the List</button></form><small>By subscribing, you agree to receive AMB BOUTIQUE news and offers.</small></div></section>
      <Footer />
    </main>
  );
}
