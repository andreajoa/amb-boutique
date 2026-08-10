"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Footer, Header, ProductCard } from "../../components";
import { Product, products } from "../../data";
import { useStore } from "../../store-provider";
import { SizeFinder } from "../../size-finder";
import { createCompleteLook } from "../../recommendations";
import { StyleMatches } from "../../style-matches";

const defaultSizes = ["2", "4", "6", "8", "10", "12"];
const galleryAngles = ["front", "back", "side", "interior"];
const spritePositions = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"];
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
  const [inventory, setInventory] = useState<{ managed: boolean; available: number } | null>(null);
  const [inventoryError, setInventoryError] = useState("");
  const { addItem, buyNow, formatMoney, preferredCategories, recordProductView } = useStore();
  const completeLook = useMemo(() => createCompleteLook(product, products, preferredCategories), [product, preferredCategories]);
  const gallery = product.gallerySprite && product.images?.[0]
    ? Array.from({ length: 4 }, () => product.images?.[0])
    : product.images?.length ? product.images : [undefined, undefined, undefined, undefined];

  useEffect(() => { recordProductView(product); }, [product, recordProductView]);

  useEffect(() => {
    const controller = new AbortController();
    setInventory(null);
    setInventoryError("");
    const params = new URLSearchParams({ slug: product.slug, color: color.name, size });
    fetch(`/api/inventory?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Live availability could not be confirmed.");
        setInventory({ managed: Boolean(result.managed), available: Math.max(0, Number(result.available) || 0) });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setInventoryError(error instanceof Error ? error.message : "Live availability could not be confirmed.");
      });
    return () => controller.abort();
  }, [product.slug, color.name, size]);

  useEffect(() => {
    if (inventory?.managed && quantity > inventory.available) setQuantity(Math.max(1, inventory.available));
  }, [inventory, quantity]);

  const purchasable = Boolean(inventory?.managed && inventory.available > 0 && !inventoryError);
  const maximumQuantity = inventory?.managed ? Math.min(10, inventory.available) : 1;

  const addToBag = () => {
    if (!purchasable) return;
    addItem(product, { size, color: color.name, quantity });
  };

  return (
    <main>
      <Header />
      <div className="product-layout shell" data-reveal>
        <section className="product-gallery" aria-label={`${product.name} gallery`}>
          {gallery.map((image, index) => <button key={`${image || "placeholder"}-${index}`} className={`gallery-image gallery-q${index + 1}`} style={image ? { backgroundImage: `url(${image})`, backgroundSize: product.gallerySprite ? "200% 200%" : "contain", backgroundPosition: product.gallerySprite ? spritePositions[index] : "center", backgroundRepeat: "no-repeat", backgroundColor: "#f5f3ef" } : undefined} aria-label={`Open ${product.name} ${galleryAngles[index] || `image ${index + 1}`} view`}><span>⌕</span></button>)}
        </section>

        <section className="product-info">
          <p className="product-breadcrumb"><Link href="/collections">Shop</Link> / {product.category}</p>
          <h1>{product.name}</h1>
          <div className="product-price"><span>{formatMoney(product.price)}</span>{product.compareAt && <del>{formatMoney(product.compareAt)}</del>}</div>
          <p className="product-intro">{product.description || "An effortless AMB essential designed with a softly structured silhouette and an easy, feminine finish."}</p>

          <fieldset className="option-group"><legend><strong>Size:</strong> {size}</legend><div className="size-options">{sizes.map((item) => <button type="button" key={item} className={size === item ? "selected" : ""} onClick={() => setSize(item)}>{item}</button>)}</div><div className="size-help-links"><SizeFinder product={product} sizes={sizes} onSelect={setSize}/></div></fieldset>

          <fieldset className="option-group"><legend><strong>Color:</strong> {color.name}</legend><div className="color-options">{colors.map((item) => <button type="button" key={item.name} className={color.name === item.name ? "selected" : ""} onClick={() => setColor(item)} aria-label={item.name}><span style={{ backgroundColor: item.value }}/></button>)}</div></fieldset>

          <div className="fit-guide"><span>How it fits</span><div><i/><i/><i className="active"/><i/><i/></div><p><small>Slim fit</small><small>Regular fit</small><small>Oversized</small></p></div>

          <div className="quantity-block"><span>Quantity</span><div><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" disabled={!purchasable || quantity <= 1}>−</button><span>{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(maximumQuantity, quantity + 1))} aria-label="Increase quantity" disabled={!purchasable || quantity >= maximumQuantity}>+</button></div></div>
          <p className={`stock-line ${inventory?.managed && inventory.available === 0 ? "sold-out" : ""}`} role="status"><i/> {
            inventoryError ? "Live availability will be confirmed at checkout"
              : !inventory ? "Checking live availability…"
                : !inventory.managed ? "Coming soon"
                  : inventory.available === 0 ? "Sold out in this size"
                    : inventory.available <= 5 ? `Only ${inventory.available} left in this size`
                      : "In stock and ready to order"
          }</p>
          <button className="add-button" type="button" onClick={addToBag} disabled={!purchasable}>Add to Bag · {formatMoney(product.price * quantity)}</button>
          <button className="buy-button" type="button" disabled={!purchasable} onClick={() => void buyNow(product, { size, color: color.name, quantity })}>Buy Now</button>

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

      <StyleMatches product={product} catalog={products}/>

      {completeLook.length > 0 && <section className="section shell product-recommendations" data-reveal><div className="section-heading centered"><div><p>SELECTED FOR THIS LOOK</p><h2>Complete the Look</h2></div></div><div className="product-row">{completeLook.map((item) => <ProductCard key={item.slug} product={item} compact />)}</div></section>}
      <section className="product-campaign" data-reveal><div><p>THE SAN DIEGO EDIT</p><h2>More to discover</h2><span>New silhouettes and finishing touches, curated for warm days and easy nights.</span><Link className="button light" href="/collections">Explore the Collection</Link></div></section>
      <section className="collection-explore shell product-explore" data-reveal><p>SHOP BY CATEGORY</p><h2>More to Explore</h2><div><Link href="/collections/dresses" className="category-one q1"><span>Dresses<small>Effortless silhouettes</small></span></Link><Link href="/collections/rompers-playsuits" className="category-one q3"><span>Playsuits<small>One-and-done style</small></span></Link><Link href="/collections/tops-blouses" className="category-one q2"><span>Tops & Blouses<small>Elevated essentials</small></span></Link></div></section>
      <Footer />

    </main>
  );
}
