"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getDirectProductImage } from "../components";
import {
  BODY_SHAPE_META,
  DEFAULT_FIT_PROFILE,
  OCCASION_OPTIONS,
  estimateDeliveryWindow,
  formatHeightImperial,
  kgToLb,
  rankProductsForStylist,
  type BodyShape,
  type ColorPreference,
  type FitPreference,
  type FitProfile,
  type LengthPreference,
  type OccasionKey,
  type SizeSystem,
} from "../fit-engine";
import { useFitProfile } from "../fit-profile";
import { getPreparationNotice } from "../product-fulfillment";
import { productPrice } from "../product-pricing";
import { SaveButton } from "../saved-items";
import { useStore } from "../store-provider";

const USUAL_OPTIONS: Record<SizeSystem, string[]> = {
  US: ["2", "4", "6", "8", "10", "12", "14", "16", "18", "20", "22"],
  UK: ["6", "8", "10", "12", "14", "16", "18", "20", "22"],
  EU: ["34", "36", "38", "40", "42", "44", "46", "48", "50"],
  ALPHA: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
};

const COLOR_OPTIONS: ReadonlyArray<{ key: ColorPreference; label: string; swatch?: string }> = [
  { key: "any", label: "Any Shade" },
  { key: "black", label: "Black", swatch: "#171512" },
  { key: "ivory", label: "Ivory & White", swatch: "#f5f1e8" },
  { key: "neutral", label: "Champagne & Sand", swatch: "#d4b998" },
  { key: "red", label: "Red & Wine", swatch: "#9f2c33" },
  { key: "rose", label: "Rose & Blush", swatch: "#d88a9a" },
  { key: "blue", label: "Blue & Sky", swatch: "#5d8cc4" },
  { key: "green", label: "Sage & Emerald", swatch: "#5e876e" },
  { key: "floral", label: "Floral & Print", swatch: "#c98b70" },
];

export function FitFinderClient() {
  const { catalog, market, formatMoney, addItem, trackEvent } = useStore();
  const { profile: savedProfile, saveProfile } = useFitProfile();

  const [heightCm, setHeightCm] = useState<number>(() => savedProfile?.heightCm ?? DEFAULT_FIT_PROFILE.heightCm);
  const [weightKg, setWeightKg] = useState<number>(() => savedProfile?.weightKg ?? DEFAULT_FIT_PROFILE.weightKg);
  const [usualSystem, setUsualSystem] = useState<SizeSystem>(() => savedProfile?.usualSystem ?? DEFAULT_FIT_PROFILE.usualSystem);
  const [usualSize, setUsualSize] = useState<string>(() => savedProfile?.usualSize ?? DEFAULT_FIT_PROFILE.usualSize);
  const [bodyShape, setBodyShape] = useState<BodyShape>(() => savedProfile?.bodyShape ?? DEFAULT_FIT_PROFILE.bodyShape);
  const [fitPreference, setFitPreference] = useState<FitPreference>(() => savedProfile?.fitPreference ?? DEFAULT_FIT_PROFILE.fitPreference);

  const [occasion, setOccasion] = useState<OccasionKey>("all");
  const [lengthPref, setLengthPref] = useState<LengthPreference>("any");
  const [colorPref, setColorPref] = useState<ColorPreference>("any");
  const [eventDate, setEventDate] = useState<string>("");
  const [savedBanner, setSavedBanner] = useState<boolean>(false);
  const [addedSlug, setAddedSlug] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  const activeProfile: FitProfile = useMemo(() => ({
    mode: "quick",
    heightCm,
    weightKg,
    usualSystem,
    usualSize,
    bodyShape,
    fitPreference,
  }), [heightCm, weightKg, usualSystem, usualSize, bodyShape, fitPreference]);

  const deliveryOverview = useMemo(
    () => estimateDeliveryWindow(market, { nowMs, eventDateIso: eventDate || undefined }),
    [market, nowMs, eventDate],
  );

  const matches = useMemo(
    () => rankProductsForStylist(catalog, {
      profile: activeProfile,
      occasion,
      lengthPref,
      colorPref,
      limit: 18,
    }),
    [catalog, activeProfile, occasion, lengthPref, colorPref],
  );

  const handleSave = () => {
    saveProfile(activeProfile);
    setSavedBanner(true);
    trackEvent("size_guide_open", { category: "Dresses", source: "fit_studio_saved" });
    window.setTimeout(() => setSavedBanner(false), 3200);
  };

  const switchSystem = (next: SizeSystem) => {
    setUsualSystem(next);
    const list = USUAL_OPTIONS[next];
    if (!list.includes(usualSize)) setUsualSize(list[Math.min(2, list.length - 1)]);
  };

  return (
    <div className="fit-studio-page">
      <section className="info-hero fit-studio-hero">
        <p>AMB PERSONAL FIT STUDIO · SAN DIEGO</p>
        <h1>Find silhouettes made for your frame.</h1>
        <span>
          Answer once in 20 seconds — no measuring tape needed. We match your height, proportions and event date across our live in-stock edit.
        </span>
      </section>

      <section className="fit-studio-controls shell">
        <div className="fit-studio-panel">
          <div className="fit-studio-block">
            <span className="fit-step-num">01</span>
            <h2>Your Proportions</h2>
            <div className="fit-range-row">
              <label>
                <span>Height <strong>{formatHeightImperial(heightCm)} ({heightCm} cm)</strong></span>
                <input type="range" min={147} max={190} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
              </label>
              <label>
                <span>Weight <strong>{kgToLb(weightKg)} lb ({Math.round(weightKg)} kg)</strong></span>
                <input type="range" min={43} max={120} value={Math.round(weightKg)} onChange={(e) => setWeightKg(Number(e.target.value))} />
              </label>
            </div>

            <div className="fit-usual-row">
              <div className="fit-system-pills" role="group" aria-label="Size system">
                {(["US", "UK", "EU", "ALPHA"] as const).map((sys) => (
                  <button key={sys} type="button" className={usualSystem === sys ? "active" : ""} onClick={() => switchSystem(sys)}>
                    {sys}
                  </button>
                ))}
              </div>
              <select aria-label="Usual size" value={usualSize} onChange={(e) => setUsualSize(e.target.value)}>
                {USUAL_OPTIONS[usualSystem].map((opt) => (
                  <option key={opt} value={opt}>{usualSystem === "ALPHA" ? `Usual ${opt}` : `Usual ${usualSystem} ${opt}`}</option>
                ))}
              </select>
            </div>

            <div className="fit-shape-grid">
              {(Object.keys(BODY_SHAPE_META) as BodyShape[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`fit-shape-btn${bodyShape === key ? " active" : ""}`}
                  onClick={() => setBodyShape(key)}
                >
                  <strong>{BODY_SHAPE_META[key].label}</strong>
                  <small>{BODY_SHAPE_META[key].summary}</small>
                </button>
              ))}
            </div>

            <div className="fit-pref-row">
              {([
                ["sculpted", "Close & Sculpted"],
                ["true", "True to Size"],
                ["relaxed", "Easy Movement"],
              ] as const).map(([key, label]) => (
                <button key={key} type="button" className={fitPreference === key ? "active" : ""} onClick={() => setFitPreference(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="fit-studio-block">
            <span className="fit-step-num">02</span>
            <h2>Occasion &amp; Preferences</h2>

            <div className="fit-occasion-grid" role="group" aria-label="Occasion">
              {OCCASION_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={occasion === item.key ? "active" : ""}
                  onClick={() => setOccasion(item.key)}
                >
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </button>
              ))}
            </div>

            <div className="fit-filter-split">
              <div>
                <span className="fit-field-label">Preferred Length</span>
                <div className="fit-pill-row">
                  {(["any", "mini", "midi", "maxi"] as const).map((len) => (
                    <button key={len} type="button" className={lengthPref === len ? "active" : ""} onClick={() => setLengthPref(len)}>
                      {len === "any" ? "Any Length" : len.charAt(0).toUpperCase() + len.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="fit-date-label">
                  <span className="fit-field-label">Event Date (Optional)</span>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div>
              <span className="fit-field-label">Color Mood</span>
              <div className="fit-color-row">
                {COLOR_OPTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={colorPref === item.key ? "active" : ""}
                    onClick={() => setColorPref(item.key)}
                  >
                    {item.swatch && <i style={{ backgroundColor: item.swatch }} aria-hidden="true" />}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fit-studio-save-row">
              <button type="button" className="button dark" onClick={handleSave}>
                Save Fit Profile Across Store
              </button>
              <div className={`fit-delivery-pill${deliveryOverview.eventStatus ? ` is-${deliveryOverview.eventStatus}` : ""}`}>
                <strong>{deliveryOverview.country}:</strong>{" "}
                {deliveryOverview.eventLabel || `Order today → estimated arrival ${deliveryOverview.rangeLabel}`}
              </div>
            </div>
            {savedBanner && (
              <p className="fit-saved-output" role="status">
                Saved on this device — your recommended size will now highlight automatically on every product page.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="fit-studio-results shell" aria-labelledby="fit-results-title">
        <div className="section-heading">
          <div>
            <p>PERSONALIZED EDIT · {BODY_SHAPE_META[bodyShape].label.toUpperCase()} · {formatHeightImperial(heightCm)}</p>
            <h2 id="fit-results-title">{matches.length} Flattering Matches Ready Now</h2>
          </div>
          <span className="fit-best-cuts-note">Best cuts for you: {BODY_SHAPE_META[bodyShape].bestCuts}</span>
        </div>

        {matches.length === 0 ? (
          <div className="fit-empty-results">
            <p>No pieces matched all active filters together. Broaden color or length to see your strongest silhouette matches.</p>
            <button type="button" className="button dark" onClick={() => { setOccasion("all"); setLengthPref("any"); setColorPref("any"); }}>
              Reset Style Filters
            </button>
          </div>
        ) : (
          <div className="fit-match-grid">
            {matches.map(({ product, recommendation, matchScore, matchReasons }) => {
              const directImage = getDirectProductImage(product, 0);
              const size = recommendation.recommendedSize;
              const price = productPrice(product, size);
              const prepNotice = getPreparationNotice(product);
              const pieceDelivery = estimateDeliveryWindow(market, {
                nowMs,
                preparationNotice: prepNotice,
                eventDateIso: eventDate || undefined,
              });

              return (
                <article className="fit-match-card" key={product.slug}>
                  <Link href={`/products/${product.slug}`} className="fit-match-photo">
                    {directImage && (
                      <Image
                        src={directImage}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    )}
                    <span className="fit-match-score">{matchScore}% FIT MATCH</span>
                    <span className="fit-match-size">SIZE {size}</span>
                  </Link>

                  <div className="fit-match-body">
                    <div className="fit-match-head">
                      <div>
                        <p>{product.category} · {product.colorNames?.[0] || "Signature"}</p>
                        <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
                      </div>
                      <SaveButton slug={product.slug} category={product.category} name={product.name} />
                    </div>

                    <div className="fit-match-price">
                      <strong>{formatMoney(price)}</strong>
                      <span>{recommendation.hemline.label}</span>
                    </div>

                    <ul className="fit-match-reasons">
                      {matchReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>

                    {eventDate && pieceDelivery.eventLabel && (
                      <p className={`fit-piece-arrival is-${pieceDelivery.eventStatus || "on-time"}`}>
                        {pieceDelivery.eventLabel}
                      </p>
                    )}

                    <div className="fit-match-actions">
                      <button
                        type="button"
                        className="button dark"
                        disabled={!recommendation.inStockInSize}
                        onClick={() => {
                          addItem(product, {
                            size,
                            color: product.colorNames?.[0] || "Signature",
                            quantity: 1,
                          });
                          setAddedSlug(product.slug);
                          trackEvent("add_to_cart", { slug: product.slug, category: product.category, source: "fit_studio", valueUsd: price });
                          window.setTimeout(() => setAddedSlug((cur) => (cur === product.slug ? null : cur)), 1800);
                        }}
                      >
                        {!recommendation.inStockInSize
                          ? `Size ${size} Sold Out`
                          : addedSlug === product.slug
                            ? "Added to Bag ✓"
                            : `Add Size ${size}`}
                      </button>
                      <Link className="button outline" href={`/products/${product.slug}`}>Details</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
