"use client";

import { useState } from "react";
import Link from "next/link";
import { Footer, Header, ProductCard } from "../../components";
import { Product, formatPrice, products } from "../../data";
import { useStore } from "../../store-provider";

const defaultSizes = ["2", "4", "6", "8", "10", "12"];
const defaultColors = [
  { name: "Ivory", value: "#efe8dc" },
  { name: "Black", value: "#171717" },
  { name: "Camel", value: "#a46d4e" },
];

export default function ProductDetail({ product }: { product: Product }) {
  const sizes = product.sizes?.length ? product.sizes : defaultSizes;
  const colors = product.colors.map((value, index) => ({ name: product.colorNames?.[index] || defaultColors[index]?.name || `Color ${index + 1}`, value }));
  const [size, setSize] = useState(sizes[Math.min(1, sizes.length - 1)] || "One Size");
  const [color, setColor] = useState(colors[0] || defaultColors[0]);
  const [quantity, setQuantity] = useState(1);
  const { addItem, buyNow } = useStore();

  const addToBag = () => {
    addItem(product, { size, color: color.name, quantity });
  };

  return (
    <main>
      <Header />
      <div className="product-layout shell">
        <section className="product-gallery" aria-label={`${product.name} gallery`}>
          {[1, 2, 3, 4].map((view) => <button key={view} className={`gallery-image gallery-q${view}`} style={product.images?.[view - 1] ? { backgroundImage: `url(${product.images[view - 1]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} aria-label={`Open ${product.name} image ${view}`}><span>⌕</span></button>)}
        </section>

        <section className="product-info">
          <p className="product-breadcrumb"><Link href="/collections">Shop</Link> / {product.category}</p>
          <h1>{product.name}</h1>
          <div className="product-price"><span>{formatPrice(product.price)}</span>{product.compareAt && <del>{formatPrice(product.compareAt)}</del>}</div>
          <p className="product-intro">{product.description || "An effortless AMB essential designed with a softly structured silhouette and an easy, feminine finish."}</p>

          <fieldset className="option-group"><legend><strong>Size:</strong> {size}</legend><div className="size-options">{sizes.map((item) => <button type="button" key={item} className={size === item ? "selected" : ""} onClick={() => setSize(item)}>{item}</button>)}</div><Link className="text-link" href="/size-guide">Size guide</Link></fieldset>

          <fieldset className="option-group"><legend><strong>Color:</strong> {color.name}</legend><div className="color-options">{colors.map((item) => <button type="button" key={item.name} className={color.name === item.name ? "selected" : ""} onClick={() => setColor(item)} aria-label={item.name}><span style={{ backgroundColor: item.value }}/></button>)}</div></fieldset>

          <div className="fit-guide"><span>How it fits</span><div><i/><i/><i className="active"/><i/><i/></div><p><small>Slim fit</small><small>Regular fit</small><small>Oversized</small></p></div>

          <div className="quantity-block"><span>Quantity</span><div><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button><span>{quantity}</span><button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">+</button></div></div>
          <p className="stock-line"><i/> {typeof product.stock === "number" && product.stock <= 5 ? `Only ${product.stock} left` : "In stock and ready to ship"}</p>
          <button className="add-button" type="button" onClick={addToBag}>Add to Bag · {formatPrice(product.price * quantity)}</button>
          <button className="buy-button" type="button" onClick={() => void buyNow(product, { size, color: color.name, quantity })}>Buy Now</button>

          <div className="secure-box"><strong>Secure checkout</strong><span>Amex&nbsp;&nbsp; Apple Pay&nbsp;&nbsp; Mastercard&nbsp;&nbsp; Visa</span></div>
          <div className="product-accordions">
            <details open><summary>Details</summary><p>{product.materials || "Designed for repeat wear with a timeless silhouette, thoughtful seaming and an easy feel. Final fabric composition will be added with the real product catalog."}</p></details>
            <details><summary>Size & Fit</summary><p>Model sizing and garment measurements will be displayed for each product. International size conversion will include US, CA, UK, AU and NZ.</p></details>
            <details><summary>Product Care</summary><p>{product.care || "Care instructions will be supplied according to each garment label."}</p></details>
            <details><summary>Shipping & Returns</summary><p>Delivery estimates and return eligibility adapt to the customer’s market at checkout. <Link href="/shipping">Shipping details</Link> · <Link href="/returns">Return policy</Link></p></details>
          </div>
          <div className="product-help"><Link href="/contact">Contact us</Link><span>San Diego, California</span></div>
        </section>
      </div>

      <section className="section shell product-recommendations"><div className="section-heading centered"><div><p>COMPLETE THE LOOK</p><h2>You May Also Like</h2></div></div><div className="product-row">{products.filter((item) => item.slug !== product.slug).slice(0, 4).map((item) => <ProductCard key={item.slug} product={item} compact />)}</div></section>
      <section className="product-campaign"><div><p>THE SAN DIEGO EDIT</p><h2>More to discover</h2><span>New silhouettes and finishing touches, curated for warm days and easy nights.</span><Link className="button light" href="/collections">Explore the Collection</Link></div></section>
      <section className="collection-explore shell product-explore"><p>SHOP BY CATEGORY</p><h2>More to Explore</h2><div><Link href="/collections" className="sheet-one q3"><span>Dresses<small>Effortless silhouettes</small></span></Link><Link href="/collections" className="sheet-two q2"><span>Playsuits<small>One-and-done style</small></span></Link><Link href="/collections" className="sheet-one q2"><span>Tops & Blouses<small>Elevated essentials</small></span></Link></div></section>
      <Footer />

    </main>
  );
}
