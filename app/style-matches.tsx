"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "./data";
import { createStyleLooks } from "./recommendations";
import { useStore } from "./store-provider";

const apparelSizes = ["2", "4", "6", "8", "10", "12"];
const shoeSizes = ["6", "7", "8", "9", "10"];

function sizesFor(product: Product) {
  if (product.sizes?.length) return product.sizes;
  if (product.category === "Bags" || product.category === "Accessories") return ["One Size"];
  if (product.category === "Shoes") return shoeSizes;
  return apparelSizes;
}

export function StyleMatches({ product, catalog }: { product: Product; catalog: Product[] }) {
  const { addItem, formatMoney, preferredCategories } = useStore();
  const looks = useMemo(() => createStyleLooks(product, catalog, preferredCategories), [catalog, product, preferredCategories]);
  const [active, setActive] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const look = looks[active];
  if (!look) return null;

  const updateSize = (slug: string, size: string) => setSelections((current) => ({ ...current, [slug]: size }));
  const addLook = () => {
    look.products.forEach((item) => addItem(item, {
      size: selections[item.slug] || sizesFor(item)[0],
      color: item.colorNames?.[0] || "Selected",
      quantity: 1,
    }));
  };
  const total = look.products.reduce((sum, item) => sum + item.price, 0);

  return <section className="style-matches shell" data-reveal>
    <div className="style-title"><span/><div><p>STYLED BY AMB</p><h2>How to Style It</h2></div><span/></div>
    <div className="style-look-card">
      <button className="style-arrow previous" type="button" onClick={() => setActive((active + looks.length - 1) % looks.length)} aria-label="Previous look">‹</button>
      <div className="style-look-copy"><p>LOOK {active + 1} OF {looks.length}</p><h3>{look.title}</h3><span>{look.description}</span></div>
      <div className="style-board">
        {look.products.map((item, index) => <article className={`style-piece piece-${index}${item.slug === product.slug ? " anchor" : ""}`} key={`${active}-${item.slug}`}>
          <Link href={`/products/${item.slug}`} className={`style-piece-image sheet-${item.sheet} q${item.quadrant}`} style={item.images?.[0] ? { backgroundImage: `url(${item.images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} aria-label={`View ${item.name}`}/>
          <div><Link href={`/products/${item.slug}`}>{item.name}</Link><span>{formatMoney(item.price)}</span><label><span className="sr-only">Size for {item.name}</span><select value={selections[item.slug] || sizesFor(item)[0]} onChange={(event) => updateSize(item.slug, event.target.value)}>{sizesFor(item).map((size) => <option key={size}>{size}</option>)}</select></label></div>
        </article>)}
      </div>
      <button className="style-arrow next" type="button" onClick={() => setActive((active + 1) % looks.length)} aria-label="Next look">›</button>
      <div className="style-look-action"><button type="button" onClick={addLook}>Add the Look · {formatMoney(total)}</button><small>Sizes are selected above. Cart rewards apply automatically when eligible.</small></div>
    </div>
    <div className="style-dots" aria-label="Choose a styled look">{looks.map((item, index) => <button type="button" className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-label={`View ${item.title}`} key={item.title}/>)}</div>
  </section>;
}
