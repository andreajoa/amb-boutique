"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Footer, Header, ProductCard, getDirectProductImage } from "../components";
import { DEFAULT_FIT_PROFILE, estimateDeliveryWindow, recommendSizeForProduct } from "../fit-engine";
import { useFitProfile } from "../fit-profile";
import { getPreparationNotice } from "../product-fulfillment";
import { productPrice } from "../product-pricing";
import { useSavedItems } from "../saved-items";
import { useStore } from "../store-provider";

export default function SavedPage() {
  const { saved, toggle } = useSavedItems();
  const { catalog: products, market, formatMoney, addItem } = useStore();
  const { profile } = useFitProfile();

  const items = useMemo(
    () => saved.map((slug) => products.find((product) => product.slug === slug)).filter((product): product is NonNullable<typeof product> => product !== undefined),
    [saved, products],
  );

  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [nowMs] = useState(() => Date.now());

  const activeCompareItems = useMemo(() => {
    const valid = compareSlugs.filter((slug) => items.some((p) => p.slug === slug));
    const chosen = valid.length >= 2 ? valid : items.slice(0, 3).map((p) => p.slug);
    return chosen
      .map((slug) => items.find((p) => p.slug === slug))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [compareSlugs, items]);

  const toggleCompareSlug = (slug: string) => {
    setCompareSlugs((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= 3) return [...current.slice(1), slug];
      return [...current, slug];
    });
  };

  const activeProfile = profile || DEFAULT_FIT_PROFILE;

  return (
    <main>
      <Header />
      <section className="section shell saved-page">
        <div className="section-heading centered">
          <div>
            <p>YOUR SELECTION</p>
            <h2>Saved pieces</h2>
          </div>
        </div>

        {items.length >= 2 && (
          <div className="saved-compare-bar">
            <div>
              <strong>Can&apos;t decide between favorites?</strong>
              <span>Compare up to 3 saved pieces side by side on fit, hemline, price and arrival dates.</span>
            </div>
            <div className="saved-compare-controls">
              <button
                type="button"
                className={`button ${showCompare ? "outline" : "dark"}`}
                onClick={() => setShowCompare((prev) => !prev)}
              >
                {showCompare ? "Hide Comparison" : `Compare Side by Side (${Math.min(3, compareSlugs.length || items.length)})`}
              </button>
              <Link className="button outline" href="/fit-finder">Personal Fit Studio</Link>
            </div>
          </div>
        )}

        {showCompare && activeCompareItems.length >= 2 && (
          <section className="compare-board" aria-label="Side-by-side comparison of saved pieces">
            {items.length > 3 && (
              <div className="compare-selector">
                <span>Pick up to 3 pieces to compare:</span>
                <div>
                  {items.map((item) => {
                    const selected = activeCompareItems.some((c) => c.slug === item.slug);
                    return (
                      <button
                        key={item.slug}
                        type="button"
                        className={selected ? "active" : ""}
                        onClick={() => toggleCompareSlug(item.slug)}
                      >
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={`compare-grid cols-${activeCompareItems.length}`}>
              {activeCompareItems.map((product) => {
                const img = getDirectProductImage(product, 0);
                const rec = recommendSizeForProduct(product, activeProfile);
                const prep = getPreparationNotice(product);
                const delivery = estimateDeliveryWindow(market, { nowMs, preparationNotice: prep });
                const displaySize = rec.recommendedSize;
                const price = productPrice(product, displaySize);

                return (
                  <article key={product.slug} className="compare-column">
                    <Link href={`/products/${product.slug}`} className="compare-photo">
                      {img && <Image src={img} alt={product.name} fill sizes="320px" />}
                    </Link>
                    <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
                    <dl className="compare-specs">
                      <div>
                        <dt>Price</dt>
                        <dd><strong>{formatMoney(price)}</strong></dd>
                      </div>
                      <div>
                        <dt>{profile ? "Your Best Size" : "Suggested Size"}</dt>
                        <dd>{rec.supported ? (rec.isOneSize ? rec.recommendedSize : `${rec.recommendedSize} (${rec.confidence}% match)`) : "See Shoe Guide"}</dd>
                      </div>
                      <div>
                        <dt>Silhouette</dt>
                        <dd>{rec.garment.silhouette.charAt(0).toUpperCase() + rec.garment.silhouette.slice(1)} · {rec.garment.stretch}</dd>
                      </div>
                      <div>
                        <dt>Hemline Preview</dt>
                        <dd>{rec.hemline.label}</dd>
                      </div>
                      <div>
                        <dt>Color</dt>
                        <dd>{product.colorNames?.[0] || "Signature"}</dd>
                      </div>
                      <div>
                        <dt>Est. Arrival</dt>
                        <dd>{delivery.shortRangeLabel}</dd>
                      </div>
                    </dl>
                    <div className="compare-actions">
                      <button
                        type="button"
                        className="button dark"
                        disabled={!rec.inStockInSize}
                        onClick={() => addItem(product, {
                          size: displaySize,
                          color: product.colorNames?.[0] || "Signature",
                          quantity: 1,
                        })}
                      >
                        {rec.inStockInSize ? `Add Size ${displaySize}` : "Unavailable"}
                      </button>
                      <button type="button" className="fit-reset-link" onClick={() => toggle(product.slug)}>
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {items.length ? (
          <div className="product-row">
            {items.map((product) => <ProductCard key={product.slug} product={product} compact />)}
          </div>
        ) : (
          <p className="saved-empty">
            Tap <strong>Save</strong> on any piece to keep it here for later and compare silhouettes side by side. <Link href="/collections">Explore the collection</Link>
          </p>
        )}
      </section>
      <Footer />
    </main>
  );
}
