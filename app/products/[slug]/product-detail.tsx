"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Footer, Header, ProductCard, getProductImageStyle } from "../../components";
import { Product, products } from "../../data";
import { useStore } from "../../store-provider";
import { SizeFinder } from "../../size-finder";
import { ShoeSizeGuide } from "../../shoe-size-guide";
import { createCompleteLook } from "../../recommendations";
import { StyleMatches } from "../../style-matches";

const defaultSizes = ["2", "4", "6", "8", "10", "12"];
const defaultColors = [
  { name: "Ivory", value: "#efe8dc" },
  { name: "Black", value: "#171717" },
  { name: "Camel", value: "#a46d4e" },
];

export default function ProductDetail({
  product,
  initialSize,
  initialHeelHeightCm,
}: {
  product: Product;
  initialSize?: string;
  initialHeelHeightCm?: number;
}) {
  const isShoe = product.category === "Shoes";
  const colors = product.colors.map((value, index) => ({ name: product.colorNames?.[index] || defaultColors[index]?.name || `Color ${index + 1}`, value }));
  const heelOptions = product.shoeVariants?.map((variant) => variant.heelHeightCm) || (product.heelHeightCm ? [product.heelHeightCm] : []);
  const initialHeel = initialHeelHeightCm !== undefined && heelOptions.includes(initialHeelHeightCm) ? initialHeelHeightCm : heelOptions[0];
  const initialShoeVariant = product.shoeVariants?.find((variant) => variant.heelHeightCm === initialHeel);
  const initialSizes = initialShoeVariant?.sizes?.length ? initialShoeVariant.sizes : product.sizes?.length ? product.sizes : defaultSizes;
  const startingSize = initialSize && initialSizes.includes(initialSize) ? initialSize : initialSizes[Math.min(1, initialSizes.length - 1)] || "One Size";

  const [heelHeightCm, setHeelHeightCm] = useState<number | undefined>(initialHeel);
  const activeShoeVariant = product.shoeVariants?.find((variant) => variant.heelHeightCm === heelHeightCm);
  const sizes = activeShoeVariant?.sizes?.length ? activeShoeVariant.sizes : product.sizes?.length ? product.sizes : defaultSizes;
  const activeStock = activeShoeVariant?.stock ?? product.stock;

  const [size, setSize] = useState(startingSize);
  const [color, setColor] = useState(colors[0] || defaultColors[0]);
  const [quantity, setQuantity] = useState(1);
  const { addItem, buyNow, formatMoney, preferredCategories, recordProductView } = useStore();
  const completeLook = useMemo(() => createCompleteLook(product, products, preferredCategories), [product, preferredCategories]);

  const spriteCount = product.gallerySprite ? product.gallerySprite.columns * product.gallerySprite.rows : 0;
  const gallery = product.gallerySprite && product.images?.length === 1
    ? Array.from({ length: spriteCount }, () => product.images![0])
    : product.gallerySprite && product.images?.[1]
      ? Array.from({ length: 1 + spriteCount }, (_, index) => index === 0 ? product.images![0] : product.images![1])
      : product.images?.length ? product.images : [undefined, undefined, undefined, undefined];

  useEffect(() => { recordProductView(product); }, [product, recordProductView]);
  useEffect(() => {
    if (!sizes.includes(size)) setSize(sizes[0] || "One Size");
  }, [heelHeightCm, size, sizes]);

  const addToBag = () => {
    addItem(product, { size, color: color.name, quantity, heelHeightCm: isShoe ? (heelHeightCm ?? product.heelHeightCm) : undefined });
  };

  return (
    <main>
      <Header />
      <div className="product-layout shell" data-reveal>
        <section className="product-gallery" aria-label={`${product.name} gallery`}>
          {gallery.map((image, index) => (
            <button key={`${image || "gallery"}-${index}`} className={`gallery-image gallery-q${index + 1}`} style={image ? getProductImageStyle(product, index) : undefined} aria-label={`Open ${product.name} image ${index + 1}`}><span>⌕</span></button>
          ))}
        </section>

        <section className="product-info">
          <p className="product-breadcrumb"><Link href="/collections">Shop</Link> / {isShoe ? <><Link href="/collections/shoes">Shoes</Link>{product.subcategory ? <> / <Link href="/collections/heels">{product.subcategory}</Link></> : null}</> : product.category}</p>
          <h1>{product.name}</h1>
          <div className="product-price"><span>{formatMoney(product.price)}</span>{product.compareAt && <del>{formatMoney(product.compareAt)}</del>}</div>
          <p className="product-intro">{product.description || "An effortless AMB essential designed with a softly structured silhouette and an easy, feminine finish."}</p>

          {isShoe && heelOptions.length > 1 && <fieldset className="option-group"><legend><strong>Heel height:</strong> {heelHeightCm} cm</legend><div className="size-options">{heelOptions.map((height) => <button type="button" key={height} className={heelHeightCm === height ? "selected" : ""} onClick={() => setHeelHeightCm(height)}>{height} cm</button>)}</div></fieldset>}

          <fieldset className="option-group"><legend><strong>{isShoe ? "AMB Size" : "Size"}:</strong> {size}</legend><div className="size-options">{sizes.map((item) => <button type="button" key={item} className={size === item ? "selected" : ""} onClick={() => setSize(item)}>{item}</button>)}</div><div className="size-help-links">{isShoe ? <Link className="shoe-size-link" href="/size-guide#shoes">Shoe Size Guide</Link> : <SizeFinder product={product} sizes={sizes} onSelect={setSize}/>}</div></fieldset>

          <fieldset className="option-group"><legend><strong>Color:</strong> {color.name}</legend><div className="color-options">{colors.map((item) => <button type="button" key={item.name} className={color.name === item.name ? "selected" : ""} onClick={() => setColor(item)} aria-label={item.name}><span style={{ backgroundColor: item.value }}/></button>)}</div></fieldset>

          {isShoe ? <div className="shoe-fit-summary"><div><span>Size system</span><strong>AMB numbered sizing</strong></div><div><span>Style</span><strong>{product.subcategory || "Shoes"}</strong></div>{(heelHeightCm ?? product.heelHeightCm) ? <div><span>Heel height</span><strong>{heelHeightCm ?? product.heelHeightCm} cm</strong></div> : null}<div><span>Fit tip</span><strong>Measure foot length first</strong></div></div> : <div className="fit-guide"><span>How it fits</span><div><i/><i/><i className="active"/><i/><i/></div><p><small>Slim fit</small><small>Regular fit</small><small>Oversized</small></p></div>}

          <div className="quantity-block"><span>Quantity</span><div><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button><span>{quantity}</span><button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">+</button></div></div>
          <p className="stock-line"><i/> {typeof activeStock === "number" && activeStock <= 5 ? `Only ${activeStock} left` : "Available to order"}</p>
          <button className="add-button" type="button" onClick={addToBag}>Add to Bag · {formatMoney(product.price * quantity)}</button>
          <button className="buy-button" type="button" onClick={() => void buyNow(product, { size, color: color.name, quantity, heelHeightCm: isShoe ? (heelHeightCm ?? product.heelHeightCm) : undefined })}>Buy Now</button>

          <div className="secure-box"><strong>Secure checkout</strong><span>Amex&nbsp;&nbsp; Apple Pay&nbsp;&nbsp; Mastercard&nbsp;&nbsp; Visa</span></div>
          <div className="product-accordions">
            <details open><summary>Details</summary><p>{product.materials || "Designed for repeat wear with a timeless silhouette, thoughtful seaming and an easy feel."}</p></details>
            <details><summary>Size & Fit</summary>{isShoe ? <ShoeSizeGuide compact/> : <p>Use the available sizes and garment measurements shown for this product. Our size guide includes US, CA, UK, AU and NZ conversions.</p>}</details>
            <details><summary>Product Care</summary><p>{product.care || "Follow the care label attached to the item to preserve color, shape and finish."}</p></details>
            <details><summary>Shipping & Returns</summary><p>Delivery estimates and return eligibility adapt to the customer’s market at checkout. <Link href="/shipping">Shipping details</Link> · <Link href="/returns">Return policy</Link></p></details>
          </div>
          <div className="product-help"><Link href="/contact">Contact us</Link><span>San Diego, California</span></div>
        </section>
      </div>

      <StyleMatches product={product} catalog={products}/>

      {completeLook.length > 0 && <section className="section shell product-recommendations" data-reveal><div className="section-heading centered"><div><p>SELECTED FOR THIS LOOK</p><h2>Complete the Look</h2></div></div><div className="product-row">{completeLook.map((item) => <ProductCard key={item.slug} product={item} compact />)}</div></section>}
      <section className="product-campaign" data-reveal><div><p>THE SAN DIEGO EDIT</p><h2>More to discover</h2><span>New silhouettes and finishing touches, curated for warm days and easy nights.</span><Link className="button light" href="/collections">Explore the Collection</Link></div></section>
      <section className="collection-explore shell product-explore" data-reveal><p>SHOP BY CATEGORY</p><h2>More to Explore</h2><div><Link href="/collections/dresses" className="category-one q1"><span>Dresses<small>Effortless silhouettes</small></span></Link><Link href="/collections/rompers-playsuits" className="category-one q3"><span>Playsuits<small>One-and-done style</small></span></Link><Link href="/collections/heels" className="category-one q2"><span>Heels<small>Polished finishing touch</small></span></Link></div></section>
      <Footer />
    </main>
  );
}

