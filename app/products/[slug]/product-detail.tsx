"use client";

import { useState } from "react";
import Link from "next/link";
import { Footer, Header, ProductCard } from "../../components";
import { Product, formatPrice, products } from "../../data";

const sizes = ["2", "4", "6", "8", "10", "12"];
const colors = [
  { name: "Ivory", value: "#efe8dc" },
  { name: "Black", value: "#171717" },
  { name: "Camel", value: "#a46d4e" },
];

export default function ProductDetail({ product }: { product: Product }) {
  const [size, setSize] = useState("4");
  const [color, setColor] = useState(colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const addToBag = () => {
    setAdded(true);
    setCartOpen(true);
  };

  return (
    <main>
      <Header onCartClick={() => setCartOpen(true)} cartCount={added ? quantity : 0} />
      <div className="product-layout shell">
        <section className="product-gallery" aria-label={`${product.name} gallery`}>
          {[1, 2, 3, 4].map((view) => <button key={view} className={`gallery-image gallery-q${view}`} aria-label={`Open ${product.name} image ${view}`}><span>⌕</span></button>)}
        </section>

        <section className="product-info">
          <p className="product-breadcrumb"><Link href="/collections">Shop</Link> / {product.category}</p>
          <h1>{product.name}</h1>
          <div className="product-price"><span>{formatPrice(product.price)}</span>{product.compareAt && <del>{formatPrice(product.compareAt)}</del>}</div>
          <p className="product-intro">An effortless AMB essential designed with a softly structured silhouette and an easy, feminine finish.</p>

          <fieldset className="option-group"><legend><strong>Size:</strong> {size}</legend><div className="size-options">{sizes.map((item) => <button type="button" key={item} className={size === item ? "selected" : ""} onClick={() => setSize(item)}>{item}</button>)}</div><button className="text-link" type="button">Size guide</button></fieldset>

          <fieldset className="option-group"><legend><strong>Color:</strong> {color.name}</legend><div className="color-options">{colors.map((item) => <button type="button" key={item.name} className={color.name === item.name ? "selected" : ""} onClick={() => setColor(item)} aria-label={item.name}><span style={{ backgroundColor: item.value }}/></button>)}</div></fieldset>

          <div className="fit-guide"><span>How it fits</span><div><i/><i/><i className="active"/><i/><i/></div><p><small>Slim fit</small><small>Regular fit</small><small>Oversized</small></p></div>

          <div className="quantity-block"><span>Quantity</span><div><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button><span>{quantity}</span><button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">+</button></div></div>
          <p className="stock-line"><i/> In stock and ready to ship</p>
          <button className="add-button" type="button" onClick={addToBag}>Add to Bag · {formatPrice(product.price * quantity)}</button>
          <button className="buy-button" type="button" onClick={addToBag}>Buy Now</button>

          <div className="secure-box"><strong>Secure checkout</strong><span>Amex&nbsp;&nbsp; Apple Pay&nbsp;&nbsp; Mastercard&nbsp;&nbsp; Visa</span></div>
          <div className="product-accordions">
            <details open><summary>Details</summary><p>Designed for repeat wear with a timeless silhouette, thoughtful seaming and an easy feel. Final fabric composition will be added with the real product catalog.</p></details>
            <details><summary>Size & Fit</summary><p>Model sizing and garment measurements will be displayed for each product. International size conversion will include US, CA, UK, AU and NZ.</p></details>
            <details><summary>Product Care</summary><p>Care instructions will be supplied according to each garment label.</p></details>
            <details><summary>Shipping & Returns</summary><p>Delivery estimates and return eligibility will adapt to the customer’s market at checkout.</p></details>
          </div>
          <div className="product-help"><a href="mailto:info@ambboutique.online">Contact us</a><span>San Diego, California</span></div>
        </section>
      </div>

      <section className="section shell product-recommendations"><div className="section-heading centered"><div><p>COMPLETE THE LOOK</p><h2>You May Also Like</h2></div></div><div className="product-row">{products.filter((item) => item.slug !== product.slug).slice(0, 4).map((item) => <ProductCard key={item.slug} product={item} compact />)}</div></section>
      <section className="product-campaign"><div><p>THE SAN DIEGO EDIT</p><h2>More to discover</h2><span>New silhouettes and finishing touches, curated for warm days and easy nights.</span><Link className="button light" href="/collections">Explore the Collection</Link></div></section>
      <section className="collection-explore shell product-explore"><p>SHOP BY CATEGORY</p><h2>More to Explore</h2><div><Link href="/collections" className="sheet-one q3"><span>Dresses<small>Effortless silhouettes</small></span></Link><Link href="/collections" className="sheet-two q2"><span>Playsuits<small>One-and-done style</small></span></Link><Link href="/collections" className="sheet-one q2"><span>Tops & Blouses<small>Elevated essentials</small></span></Link></div></section>
      <Footer />

      {cartOpen && <div className="cart-layer" role="dialog" aria-modal="true" aria-label="Shopping bag"><button className="cart-backdrop" aria-label="Close shopping bag" onClick={() => setCartOpen(false)}/><aside className="cart-drawer"><div className="cart-head"><button onClick={() => setCartOpen(false)} aria-label="Close">×</button><strong>Your Bag</strong><span>{added ? `${quantity} item${quantity > 1 ? "s" : ""}` : "Empty"}</span></div>{added ? <><div className="cart-item"><div className="cart-thumb gallery-q1"/><div><strong>{product.name}</strong><span>Size: {size}</span><span>Color: {color.name}</span><button onClick={() => setAdded(false)}>Remove</button></div><b>{formatPrice(product.price * quantity)}</b></div><div className="cart-upsell"><p>Complete your look</p><div><div className="upsell-thumb sheet-two q1"/><span><strong>Catalina Shoulder Bag</strong><small>$128</small></span><button type="button">Add</button></div></div><div className="shipping-progress"><span>You’re {formatPrice(Math.max(0, 150 - product.price * quantity))} away from complimentary U.S. shipping.</span><i><b style={{ width: `${Math.min(100, (product.price * quantity / 150) * 100)}%` }}/></i></div><label className="order-note">Add a note to your order<textarea rows={2}/></label><div className="cart-totals"><p><span>Subtotal</span><strong>{formatPrice(product.price * quantity)}</strong></p><p><span>Shipping</span><span>Calculated at checkout</span></p></div><button className="view-bag" type="button">View Bag</button><button className="checkout-button" type="button">Checkout</button><small>Taxes and delivery are calculated at checkout.</small></> : <div className="empty-cart"><h2>Your bag is empty</h2><p>Discover something beautiful from the latest AMB edit.</p><Link className="button dark" href="/collections" onClick={() => setCartOpen(false)}>Start Shopping</Link></div>}</aside></div>}
    </main>
  );
}
