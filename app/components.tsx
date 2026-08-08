"use client";

import Link from "next/link";
import { Product, formatPrice } from "./data";

function Icon({ name }: { name: "search" | "user" | "bag" }) {
  if (name === "search") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
  if (name === "user") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.7-4.1 3-6 6.5-6s5.8 1.9 6.5 6"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
}

export function Header({ onCartClick, cartCount = 0 }: { onCartClick?: () => void; cartCount?: number }) {
  return (
    <>
      <div className="announcement">
        <div className="social-mini" aria-label="Social media"><span>f</span><span>◎</span><span>p</span><span>𝕏</span></div>
        <p>COMPLIMENTARY U.S. SHIPPING ON ORDERS $150+</p>
        <label className="market"><span aria-hidden="true">🇺🇸</span><select aria-label="Market and currency" defaultValue="US"><option value="US">USD $</option><option value="CA">CAD $</option><option value="UK">GBP £</option><option value="AU">AUD $</option><option value="NZ">NZD $</option></select></label>
      </div>
      <header className="site-header">
        <div className="header-main shell">
          <details className="mobile-menu"><summary aria-label="Open menu">☰</summary><div><Link href="/">Home</Link><Link href="/collections">Shop</Link><a href="#about">Our Story</a><a href="mailto:info@ambboutique.online">Contact</a></div></details>
          <Link className="wordmark" href="/" aria-label="AMB Boutique home">AMB <span>BOUTIQUE</span></Link>
          <div className="header-actions">
            <button aria-label="Search"><Icon name="search" /></button>
            <button aria-label="Account"><Icon name="user" /></button>
            <button aria-label="Shopping bag" className="bag-button" onClick={onCartClick}><Icon name="bag" /><span>{cartCount}</span></button>
          </div>
        </div>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/collections">New In</Link>
          <Link href="/collections?category=Dresses">Dresses</Link>
          <Link href="/collections?category=Tops">Tops & Blouses</Link>
          <Link href="/collections?category=Bags">Bags</Link>
          <Link href="/collections?category=Shoes">Shoes</Link>
          <a href="#about">Our Story</a>
        </nav>
      </header>
    </>
  );
}

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <article className={`product-card${compact ? " compact" : ""}`}>
      <Link href={`/products/${product.slug}`} className={`product-photo sheet-${product.sheet} q${product.quadrant}`} aria-label={`View ${product.name}`}>
        {product.badge && <span className={`product-badge${product.badge === "New" || product.badge === "Just In" ? " dark" : ""}`}>{product.badge}</span>}
        <span className="quick-shop">Quick Shop</span>
      </Link>
      <div className="product-meta">
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
        <div className="price-row">
          <span className={product.compareAt ? "sale-price" : ""}>{formatPrice(product.price)}</span>
          {product.compareAt && <del>{formatPrice(product.compareAt)}</del>}
        </div>
        <div className="swatches" aria-label="Available colors">
          {product.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
        </div>
        {product.rating && <div className="stars" aria-label={`${product.rating} out of 5 stars`}>★★★★★</div>}
      </div>
    </article>
  );
}

export function Footer() {
  return (
    <footer className="footer" id="about">
      <div className="footer-grid shell">
        <div><Link className="footer-logo" href="/">AMB BOUTIQUE</Link><p>Contemporary women’s style, thoughtfully curated in San Diego by founder Ana Paula Maciel.</p><p className="location">San Diego, California</p></div>
        <div><h3>Shop</h3><Link href="/collections">New In</Link><Link href="/collections?category=Dresses">Dresses</Link><Link href="/collections?category=Tops">Tops & Blouses</Link><Link href="/collections?category=Bags">Bags</Link><Link href="/collections?category=Shoes">Shoes</Link></div>
        <div><h3>Customer Care</h3><a href="mailto:info@ambboutique.online">Contact Us</a><span>Shipping & Returns — coming next</span><span>Size Guide — coming next</span><span>FAQ — coming next</span><span>Privacy — coming next</span></div>
        <div><h3>Stay in the know</h3><p>New arrivals, private offers and notes from San Diego.</p><form className="footer-form"><label className="sr-only" htmlFor="footer-email">Email address</label><input id="footer-email" type="email" placeholder="Email address" required/><button type="submit">Join</button></form><a href="mailto:info@ambboutique.online">info@ambboutique.online</a></div>
      </div>
      <div className="footer-bottom shell"><span>© 2026 AMB BOUTIQUE</span><span>USD · CAD · GBP · AUD · NZD</span><span>Visa · Mastercard · Amex · Apple Pay</span></div>
    </footer>
  );
}
