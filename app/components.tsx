"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Product } from "./data";
import { MarketCode, marketCodes, markets, US_FREE_SHIPPING_THRESHOLD_USD } from "./commerce";
import { useStore } from "./store-provider";
import { NewsletterForm } from "./newsletter-form";

const SHOE_ATLAS_PRODUCT_COUNT = 27;

export function getProductImageStyle(product: Product, view = 0): CSSProperties | undefined {
  const firstImage = product.images?.[0];
  if (!firstImage) return undefined;

  const singleImageSprite = Boolean(product.gallerySprite && product.images?.length === 1);

  // Normal products use their exact image directly. Editorial bag sheets with a
  // single source image are intentionally excluded here so view 0 is cropped to
  // the first cell instead of displaying the whole 2x3 contact sheet.
  if ((!singleImageSprite && view === 0) || !product.gallerySprite) {
    const image = product.images?.[view] || firstImage;
    const isEditorialAsset = image.startsWith("/editorial/") || image.startsWith("/products/");
    return {
      backgroundImage: `url(${image})`,
      backgroundSize: "contain",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundColor: "#f5efe5",
      ...(isEditorialAsset ? {} : { backgroundBlendMode: "multiply" as const }),
    };
  }

  const sprite = product.images?.[1] || firstImage;
  const { columns, rows, viewWidth, viewHeight } = product.gallerySprite;
  const count = Math.max(1, columns * rows);
  const spriteView = Math.min(Math.max(singleImageSprite ? view : view - 1, 0), count - 1);
  const col = spriteView % columns;
  const row = Math.floor(spriteView / columns);

  // Shoes share one validated AMB editorial atlas. Every product occupies one
  // 2x3 block (front/three-quarter/profile/back/top/sole). heelAtlasIndex points
  // to that product block so no corrupt per-family SVG/base64 file is needed.
  if (typeof product.heelAtlasIndex === "number") {
    const atlasRows = rows * SHOE_ATLAS_PRODUCT_COUNT;
    const atlasRow = product.heelAtlasIndex * rows + row;
    const x = columns === 1 ? 0 : (col / (columns - 1)) * 100;
    const y = atlasRows === 1 ? 0 : (atlasRow / (atlasRows - 1)) * 100;

    return {
      backgroundImage: `url(${sprite})`,
      backgroundSize: `${columns * 100}% ${atlasRows * 100}%`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundRepeat: "no-repeat",
      backgroundColor: "#f5efe5",
      aspectRatio: `${viewWidth} / ${viewHeight}`,
    };
  }

  // Generic editorial sheets (including Bags) crop one clean cell per view.
  const x = columns === 1 ? 0 : (col / (columns - 1)) * 100;
  const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;

  return {
    backgroundImage: `url(${sprite})`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundRepeat: "no-repeat",
    backgroundColor: "#f5efe5",
    aspectRatio: `${viewWidth} / ${viewHeight}`,
  };
}

function Icon({ name }: { name: "search" | "user" | "bag" }) {
  if (name === "search") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
  if (name === "user") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.7-4.1 3-6 6.5-6s5.8 1.9 6.5 6"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
}

export function Header() {
  const { openCart, cartCount, market, setMarket, formatMoney } = useStore();
  return (
    <>
      <div className="announcement">
        <div className="social-mini" aria-label="Social media"><span>f</span><span>◎</span><span>p</span><span>𝕏</span></div>
        <p>{market === "US" ? `COMPLIMENTARY U.S. SHIPPING ON ORDERS ${formatMoney(US_FREE_SHIPPING_THRESHOLD_USD)}+` : `NOW SHOPPING FOR ${markets[market].country.toUpperCase()}`}</p>
        <label className="market"><span aria-hidden="true">{markets[market].flag}</span><select aria-label="Market and currency" value={market} onChange={(event) => setMarket(event.target.value as MarketCode)}>{marketCodes.map((code) => <option value={code} key={code}>{markets[code].currency} {code === "UK" ? "£" : "$"}</option>)}</select></label>
      </div>
      <header className="site-header">
        <div className="header-main shell">
          <details className="mobile-menu">
            <summary aria-label="Open menu">☰</summary>
            <div>
              <Link href="/">Home</Link>
              <Link href="/collections">New In</Link>
              <Link href="/collections/dresses">Dresses</Link>
              <Link href="/collections/tops-blouses">Tops & Blouses</Link>
              <Link href="/collections/rompers-playsuits">Rompers & Playsuits</Link>
              <Link href="/collections/skirts">Skirts</Link>
              <Link href="/collections/pants">Pants</Link>
              <Link href="/collections/shorts">Shorts</Link>
              <Link href="/collections/bags">Bags</Link>
              <details className="mobile-submenu"><summary>Shoes</summary><div><Link href="/collections/shoes">All Shoes</Link><Link href="/collections/heels">Heels</Link><Link href="/size-guide#shoes">Shoe Size Guide</Link></div></details>
              <Link className="sale-nav" href="/sale">Sale</Link>
              <Link href="/about">Our Story</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </details>
          <Link className="wordmark" href="/" aria-label="AMB Boutique home">AMB <span>BOUTIQUE</span></Link>
          <div className="header-actions">
            <Link href="/search" aria-label="Search"><Icon name="search" /></Link>
            <Link href="/account" aria-label="Account"><Icon name="user" /></Link>
            <button aria-label="Shopping bag" className="bag-button" onClick={openCart}><Icon name="bag" /><span>{cartCount}</span></button>
          </div>
        </div>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/collections">New In</Link>
          <Link href="/collections/dresses">Dresses</Link>
          <Link href="/collections/tops-blouses">Tops & Blouses</Link>
          <Link href="/collections/bags">Bags</Link>
          <div className="nav-mega">
            <Link href="/collections/shoes">Shoes <span aria-hidden="true">⌄</span></Link>
            <div className="mega-panel" aria-label="Shoes menu">
              <div><strong>Shop Shoes</strong><Link href="/collections/shoes">All Shoes</Link><Link href="/collections/heels">Heels</Link></div>
              <div><strong>Find Your Fit</strong><p>Compare EU, US/CA, UK and AU/NZ sizing before choosing your pair.</p><Link className="mega-size-link" href="/size-guide#shoes">Shoe Size Guide</Link></div>
            </div>
          </div>
          <Link className="sale-nav" href="/sale">Sale</Link>
          <Link href="/about">Our Story</Link>
        </nav>
      </header>
    </>
  );
}

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { formatMoney } = useStore();
  return (
    <article className={`product-card${compact ? " compact" : ""}`}>
      <Link href={`/products/${product.slug}`} className={`product-photo sheet-${product.sheet} q${product.quadrant}`} style={getProductImageStyle(product, 0)} aria-label={`View ${product.name}`}>
        {product.badge && <span className={`product-badge${product.badge === "New" || product.badge === "Just In" ? " dark" : ""}`}>{product.badge}</span>}
        <span className="quick-shop">Quick Shop</span>
      </Link>
      <div className="product-meta">
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
        <div className="price-row">
          <span className={product.compareAt ? "sale-price" : ""}>{formatMoney(product.price)}</span>
          {product.compareAt && <del>{formatMoney(product.compareAt)}</del>}
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
        <div><h3>Shop</h3><Link href="/collections">New In</Link><Link href="/collections/dresses">Dresses</Link><Link href="/collections/tops-blouses">Tops & Blouses</Link><Link href="/collections/rompers-playsuits">Rompers & Playsuits</Link><Link href="/collections/skirts">Skirts</Link><Link href="/collections/pants">Pants & Trousers</Link><Link href="/collections/shorts">Shorts</Link><Link href="/collections/bags">Bags</Link><Link href="/collections/shoes">Shoes</Link><Link href="/collections/heels">Heels</Link></div>
        <div><h3>Customer Care</h3><Link href="/contact">Contact Us</Link><Link href="/shipping">Shipping</Link><Link href="/returns">Returns</Link><Link href="/size-guide">Size Guide</Link><Link href="/faq">FAQ</Link><Link href="/track-order">Track an Order</Link></div>
        <div><h3>About & Legal</h3><Link href="/about">Our Story</Link><Link href="/journal">Journal</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookie Preferences</Link><Link href="/accessibility">Accessibility</Link></div>
        <div><h3>Stay in the know</h3><p>New arrivals, private offers and notes from San Diego.</p><NewsletterForm compact/><a href="mailto:info@ambboutique.online">info@ambboutique.online</a></div>
      </div>
      <div className="footer-bottom shell"><span>© 2026 AMB BOUTIQUE</span><span>USD · CAD · GBP · AUD · NZD</span><span>Visa · Mastercard · Amex · Apple Pay</span></div>
    </footer>
  );
}
