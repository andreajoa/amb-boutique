"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "./data";
import { recommendSizeForProduct } from "./fit-engine";
import { useFitProfile } from "./fit-profile";
import { stockForSize } from "./product-inventory";
import { productPrice } from "./product-pricing";
import { useStore } from "./store-provider";

export type DressingRoomLook = {
  chapter: string;
  moment: string;
  timeLabel: string;
  note: string;
  bedroomImage: string;
  product: Product;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function DressingRoom({ looks }: { looks: DressingRoomLook[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const seamRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [justAddedSlug, setJustAddedSlug] = useState<string | null>(null);
  const [isDesktopInteractive, setIsDesktopInteractive] = useState(false);

  const { addItem, formatMoney, trackEvent } = useStore();
  const { profile } = useFitProfile();

  const count = looks.length;
  const activeLook = looks[activeIndex] || looks[0];

  const recommendations = useMemo(() => {
    if (!profile) return new Map<string, ReturnType<typeof recommendSizeForProduct>>();
    return new Map(looks.map((look) => [look.product.slug, recommendSizeForProduct(look.product, profile)]));
  }, [looks, profile]);

  const applyProgressToDom = useCallback((rawProgress: number) => {
    const maxStep = Math.max(1, count - 1);
    const clamped = clamp(rawProgress, 0, maxStep);

    layerRefs.current.forEach((node, index) => {
      if (!node) return;
      if (index === 0) {
        node.style.setProperty("--dr-reveal", "100%");
        node.style.setProperty("--dr-scale", "1");
        node.style.opacity = "1";
        return;
      }
      const local = clamp(clamped - (index - 1), 0, 1);
      // Smooth cubic ease for tactile silk-curtain dressing transition
      const eased = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      const pct = (eased * 100).toFixed(2);
      const scale = (1.032 - eased * 0.032).toFixed(4);
      node.style.setProperty("--dr-reveal", `${pct}%`);
      node.style.setProperty("--dr-scale", scale);
      node.style.opacity = local > 0.001 ? "1" : "0";
    });

    if (seamRef.current) {
      const fractional = clamped - Math.floor(clamped);
      const moving = fractional > 0.015 && fractional < 0.985;
      const easedFrac = fractional < 0.5 ? 2 * fractional * fractional : 1 - Math.pow(-2 * fractional + 2, 2) / 2;
      seamRef.current.style.opacity = moving ? "1" : "0";
      seamRef.current.style.top = `${((1 - easedFrac) * 100).toFixed(2)}%`;
    }

    if (meterRef.current) {
      const pct = ((clamped / maxStep) * 100).toFixed(2);
      meterRef.current.style.setProperty("--dr-meter", `${pct}%`);
    }
  }, [count]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || count <= 1) return;

    const desktop = window.matchMedia("(min-width: 961px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const syncMode = () => {
      const interactive = desktop.matches && !reduced.matches;
      setIsDesktopInteractive(interactive);
      if (!interactive) {
        applyProgressToDom(activeIndex);
      }
    };

    const update = () => {
      raf = 0;
      if (!desktop.matches || reduced.matches) return;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / travel, 0, 1);
      const rawStep = progress * (count - 1);
      applyProgressToDom(rawStep);
      const nextIndex = Math.round(rawStep);
      setActiveIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    };

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };

    syncMode();
    if (desktop.matches && !reduced.matches) update();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    desktop.addEventListener("change", syncMode);
    reduced.addEventListener("change", syncMode);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      desktop.removeEventListener("change", syncMode);
      reduced.removeEventListener("change", syncMode);
    };
  }, [activeIndex, applyProgressToDom, count]);

  useEffect(() => {
    if (!isDesktopInteractive) {
      applyProgressToDom(activeIndex);
    }
  }, [activeIndex, applyProgressToDom, isDesktopInteractive]);

  const jumpToStep = (index: number) => {
    const bounded = clamp(index, 0, count - 1);
    const section = sectionRef.current;
    if (isDesktopInteractive && section) {
      const top = section.getBoundingClientRect().top + window.scrollY;
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      const targetY = top + (bounded / Math.max(1, count - 1)) * travel;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    } else {
      setActiveIndex(bounded);
      applyProgressToDom(bounded);
    }
    trackEvent("product_view", { slug: looks[bounded]?.product.slug, category: looks[bounded]?.product.category, source: "dressing_room" });
  };

  if (!activeLook) return null;

  const product = activeLook.product;
  const sizes = product.sizes?.length ? product.sizes : ["S", "M", "L"];
  const rec = recommendations.get(product.slug);
  const defaultSize = (rec?.supported && rec.inStockInSize && sizes.includes(rec.recommendedSize))
    ? rec.recommendedSize
    : sizes.find((s) => {
        const st = stockForSize({ slug: product.slug, stock: product.stock }, s);
        return st === undefined || st > 0;
      }) || sizes[0];
  const chosenSize = selectedSizes[product.slug] || defaultSize;
  const chosenStock = stockForSize({ slug: product.slug, stock: product.stock }, chosenSize);
  const chosenUnavailable = chosenStock !== undefined && chosenStock <= 0;
  const price = productPrice(product, chosenSize);
  const colorName = product.colorNames?.[0] || "Signature";

  const handleQuickAdd = () => {
    if (chosenUnavailable) return;
    addItem(product, { size: chosenSize, color: colorName, quantity: 1 });
    setJustAddedSlug(product.slug);
    trackEvent("add_to_cart", { slug: product.slug, category: product.category, source: "dressing_room", valueUsd: price });
    window.setTimeout(() => {
      setJustAddedSlug((current) => (current === product.slug ? null : current));
    }, 1800);
  };

  return (
    <section
      className="dressing-room"
      ref={sectionRef}
      aria-labelledby="dressing-room-title"
      id="dressing-room"
    >
      <div className="dressing-room-stage">
        <div className="dressing-room-inner shell">
          <div className="dressing-room-visual">
            <div className="dressing-room-frame" aria-live="polite">
              {looks.map((look, index) => (
                <div
                  key={look.product.slug}
                  ref={(node) => { layerRefs.current[index] = node; }}
                  className={`dressing-room-layer${index === activeIndex ? " is-active" : ""}`}
                  style={{ zIndex: index + 1 }}
                  aria-hidden={index !== activeIndex}
                >
                  <Image
                    src={look.bedroomImage}
                    alt={`${look.product.name} tried on in the AMB San Diego dressing room — ${look.moment}`}
                    fill
                    unoptimized
                    priority={index === 0}
                    sizes="(max-width: 960px) 100vw, 48vw"
                  />
                </div>
              ))}
              <div className="dressing-room-seam" ref={seamRef} aria-hidden="true" />
              <div className="dressing-room-caption">
                <span>LOOK {activeLook.chapter} / 0{count}</span>
                <strong>{activeLook.moment}</strong>
              </div>
              <div className="dressing-room-mobile-arrows">
                <button
                  type="button"
                  onClick={() => jumpToStep((activeIndex - 1 + count) % count)}
                  aria-label="Previous outfit look"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStep((activeIndex + 1) % count)}
                  aria-label="Next outfit look"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          <div className="dressing-room-rail">
            <header className="dressing-room-head">
              <p className="eyebrow">THE AMB DRESSING ROOM · SAN DIEGO</p>
              <h2 id="dressing-room-title">Four outfits. One sunlit room.</h2>
              <span className="dressing-room-hint">
                {isDesktopInteractive
                  ? "Scroll gently to watch each silhouette change — or select a moment below."
                  : "Tap each moment to try on the next silhouette."}
              </span>
            </header>

            <div className="dressing-room-meter" ref={meterRef} aria-hidden="true">
              <span />
            </div>

            <ol className="dressing-room-steps" aria-label="Dressing room looks">
              {looks.map((look, index) => {
                const active = index === activeIndex;
                return (
                  <li key={look.product.slug}>
                    <button
                      type="button"
                      className={`dressing-room-step${active ? " active" : ""}`}
                      aria-current={active ? "step" : undefined}
                      onClick={() => jumpToStep(index)}
                    >
                      <span className="dressing-room-num">{look.chapter}</span>
                      <span className="dressing-room-step-copy">
                        <strong>{look.moment}</strong>
                        <small>{look.product.name} · {look.timeLabel}</small>
                      </span>
                      <span
                        className="dressing-room-dot"
                        style={{ backgroundColor: look.product.colors[0] || "#171512" }}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ol>

            <article className="dressing-room-card">
              <div className="dressing-room-card-top">
                <div>
                  <p className="dressing-room-kicker">{activeLook.timeLabel} · {colorName}</p>
                  <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
                </div>
                <strong className="dressing-room-price">{formatMoney(price)}</strong>
              </div>

              <p className="dressing-room-note">{activeLook.note}</p>

              {rec?.supported && !rec.isOneSize && (
                <p className="dressing-room-fit-pill">
                  <span>YOUR FIT MATCH</span>
                  <strong>{rec.headline}</strong>
                  <small>{rec.hemline.label}</small>
                </p>
              )}

              <div className="dressing-room-sizes" role="group" aria-label={`Select size for ${product.name}`}>
                {sizes.map((item) => {
                  const st = stockForSize({ slug: product.slug, stock: product.stock }, item);
                  const out = st !== undefined && st <= 0;
                  const isRec = rec?.supported && !rec.isOneSize && rec.recommendedSize === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={out}
                      className={`${chosenSize === item ? "selected" : ""}${isRec ? " recommended" : ""}`}
                      onClick={() => setSelectedSizes((prev) => ({ ...prev, [product.slug]: item }))}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <div className="dressing-room-actions">
                <button
                  type="button"
                  className="button dark"
                  disabled={chosenUnavailable}
                  onClick={handleQuickAdd}
                >
                  {chosenUnavailable
                    ? "Size Unavailable"
                    : justAddedSlug === product.slug
                      ? "Added to Bag ✓"
                      : `Add Size ${chosenSize} · ${formatMoney(price)}`}
                </button>
                <Link className="button outline" href={`/products/${product.slug}`}>
                  View Piece
                </Link>
              </div>

              <div className="dressing-room-foot">
                <Link href="/fit-finder">Not sure which silhouette flatters you best? Open Personal Fit Studio →</Link>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
