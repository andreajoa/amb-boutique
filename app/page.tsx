import Link from "next/link";
import { Footer, Header, ProductCard } from "./components";
import { products } from "./data";
import { NewsletterForm } from "./newsletter-form";
import { HeroCarousel } from "./hero-carousel";
import { PersonalizedProducts } from "./personalized-products";

const collections = [
  { title: "Dresses", subtitle: "Made for every plan", image: "category-one q1", href: "/collections/dresses" },
  { title: "Tops & Blouses", subtitle: "Elevated everyday layers", image: "category-one q2", href: "/collections/tops-blouses" },
  { title: "Rompers & Playsuits", subtitle: "One-and-done ease", image: "category-one q3", href: "/collections/rompers-playsuits" },
];

export default function Home() {
  return (
    <main>
      <Header />
      <HeroCarousel />

      <section className="statement-strip" data-reveal><p>New season, new perspective.</p><span>Curated in San Diego · Designed for wherever life takes you.</span><Link href="/collections">Discover the Edit</Link></section>

      <section className="section shell" data-reveal>
        <div className="section-heading"><div><p>CURATED FOR YOU</p><h2>Your AMB Edit</h2></div><Link href="/collections">View all</Link></div>
        <PersonalizedProducts catalog={products}/>
      </section>

      <section className="collection-tiles shell" data-reveal>
        {collections.map((item) => <Link href={item.href} key={item.title} className={`collection-tile ${item.image}`}><div><p>{item.subtitle}</p><h2>{item.title}</h2><span>Shop Now</span></div></Link>)}
      </section>

      <section className="editorial-banner" data-reveal>
        <div><p>THE COASTAL WARDROBE</p><h2>Sunlit in San Diego</h2><span>Soft tailoring, fluid dresses and understated accessories inspired by golden-hour days.</span><Link className="button dark" href="/collections">Shop the Story</Link></div>
      </section>

      <section className="section shell" data-reveal>
        <div className="section-heading centered"><div><p>FRESHLY CURATED</p><h2>Just Arrived</h2></div></div>
        <div className="product-row">{products.slice(4, 8).map((p) => <ProductCard key={p.slug} product={p} compact />)}</div>
      </section>

      <section className="values-band" data-reveal><div><strong>San Diego Born</strong><span>California ease, thoughtfully curated</span></div><div><strong>Easy Returns</strong><span>Simple returns within 30 days</span></div><div><strong>Worldwide Delivery</strong><span>US, Canada, UK, Australia & New Zealand</span></div><div><strong>Personal Service</strong><span>We’re here at info@ambboutique.online</span></div></section>

      <section className="explore section shell" data-reveal>
        <div className="section-heading centered"><div><p>FIND YOUR FAVORITES</p><h2>Explore the Collections</h2></div></div>
        <div className="explore-grid">
          <Link href="/collections/dresses" className="explore-card category-one q1"><div><h3>Dresses</h3><span>Shop the edit</span></div></Link>
          <Link href="/collections/rompers-playsuits" className="explore-card category-one q3"><div><h3>Rompers & Playsuits</h3><span>Shop the edit</span></div></Link>
          <Link href="/collections/tops-blouses" className="explore-card category-one q2"><div><h3>Tops & Blouses</h3><span>Shop the edit</span></div></Link>
        </div>
      </section>

      <div className="editorial-stack">
        <section className="feature-split stack-panel">
          <div className="feature-copy"><p>THE AMB FAVORITE</p><h2>Selene Satin Maxi Dress</h2><span>A fluid silhouette with a softly draped neckline, selected for luminous evenings and effortless entrances.</span><strong>$118</strong><Link className="button dark" href="/products/selene-satin-maxi-dress">View the Dress</Link></div>
          <div className="feature-image" style={{ backgroundImage: "url(/products/selene-satin-maxi-dress/01.webp)", backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: "#f5f3ef" }} role="img" aria-label="Selene Satin Maxi Dress by AMB BOUTIQUE" />
        </section>

        <div className="stack-panel founder-panel">
          <section className="founder section shell">
            <div className="founder-image story-editorial" role="img" aria-label="AMB Boutique new arrivals editorial" />
            <div className="founder-copy"><p>OUR STORY</p><h2>A boutique with a<br/>California state of mind.</h2><blockquote>“I created AMB BOUTIQUE for women who want getting dressed to feel easy, polished and personal.”</blockquote><span>— Ana Paula Maciel, Founder</span><p>From our home in San Diego, every piece is selected for its versatility, confidence and effortless femininity.</p><Link href="/about">Meet AMB Boutique</Link></div>
          </section>
        </div>

        <div className="stack-panel journal-panel">
          <section className="journal section shell">
            <div className="section-heading centered"><div><p>THE AMB JOURNAL</p><h2>Style Notes</h2></div></div>
            <div className="journal-grid">
              <article><div className="journal-photo journal-brunch"/><p>THE EDIT</p><h3>What to wear from brunch to golden hour</h3><Link href="/journal/brunch-to-golden-hour">Read the story</Link></article>
              <article><div className="journal-photo journal-handbags"/><p>ACCESSORIES</p><h3>The everyday bag, perfected</h3><Link href="/journal/the-everyday-bag">Read the story</Link></article>
              <article><div className="journal-photo journal-capsule"/><p>STYLE GUIDE</p><h3>Five pieces, endless possibilities</h3><Link href="/journal/five-pieces-endless-possibilities">Read the story</Link></article>
            </div>
          </section>
        </div>
      </div>

      <section className="newsletter" data-reveal><div className="newsletter-photo" role="img" aria-label="AMB Boutique San Diego fashion editorial"/><div><p>JOIN THE AMB LIST</p><h2>A little something<br/>beautiful, in your inbox.</h2><span>Be first to discover new arrivals, private offers and style notes from San Diego.</span><NewsletterForm/><small>By subscribing, you agree to receive AMB BOUTIQUE news and offers. Unsubscribe anytime.</small></div></section>
      <Footer />
    </main>
  );
}
