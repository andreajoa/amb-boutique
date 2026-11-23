"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getDirectProductImage } from "./components";
import type { Product } from "./data";
import {
  BODY_SHAPE_META,
  DEFAULT_FIT_PROFILE,
  SIZE_LADDER,
  formatHeightImperial,
  kgToLb,
  recommendSizeForProduct,
  type BodyShape,
  type FitMode,
  type FitPreference,
  type FitProfile,
  type SizeSystem,
} from "./fit-engine";
import { useFitProfile } from "./fit-profile";
import { useStore } from "./store-provider";

export type SizeFinderTab = "profile" | "proportion" | "mirror";

const USUAL_SIZE_OPTIONS: Record<SizeSystem, string[]> = {
  US: ["2", "4", "6", "8", "10", "12", "14", "16", "18", "20", "22"],
  UK: ["6", "8", "10", "12", "14", "16", "18", "20", "22", "24"],
  EU: ["34", "36", "38", "40", "42", "44", "46", "48", "50", "52"],
  ALPHA: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
};

const LIGHTING_PRESETS = [
  { key: "daylight", label: "San Diego Daylight", filter: "brightness(1.03) contrast(1.02) saturate(1.02)" },
  { key: "indoor", label: "Warm Indoor", filter: "brightness(0.99) sepia(0.11) saturate(1.06)" },
  { key: "evening", label: "Candlelight Evening", filter: "brightness(0.92) contrast(1.08) sepia(0.16) saturate(0.98)" },
] as const;

function SilhouetteDiagram({ bodyPercent, heightCm, hemLabel }: { bodyPercent: number; heightCm: number; hemLabel: string }) {
  // SVG height coordinate mapping: top of head y=16, shoulder y=42, waist y=84, hip y=104, knee y=156, ankle y=206
  const yStart = 44;
  const yFloor = 212;
  const hemY = Math.round(yStart + ((Math.max(38, Math.min(98, bodyPercent)) - 30) / 70) * (yFloor - yStart));

  return (
    <div className="fit-diagram" aria-label={`Hemline preview at ${formatHeightImperial(heightCm)}: ${hemLabel}`}>
      <svg viewBox="0 0 180 232" role="img" aria-hidden="true">
        {/* Hairline proportion guide rails */}
        <line x1="14" y1="42" x2="166" y2="42" className="fit-guide-line" />
        <line x1="14" y1="84" x2="166" y2="84" className="fit-guide-line" />
        <line x1="14" y1="156" x2="166" y2="156" className="fit-guide-line" />
        <line x1="14" y1="208" x2="166" y2="208" className="fit-guide-line" />

        <text x="16" y="38" className="fit-guide-label">SHOULDER</text>
        <text x="16" y="80" className="fit-guide-label">WAIST</text>
        <text x="16" y="152" className="fit-guide-label">KNEE</text>
        <text x="16" y="204" className="fit-guide-label">ANKLE</text>

        {/* Minimalist couture figure outline */}
        <circle cx="96" cy="24" r="9.5" className="fit-figure-stroke" />
        <path
          d="M84 42 C88 38 104 38 108 42 L113 62 C110 72 106 79 105 85 C109 94 114 103 112 115 L108 158 L104 208 M84 42 L79 62 C82 72 86 79 87 85 C83 94 78 103 80 115 L84 158 L88 208"
          className="fit-figure-stroke"
        />

        {/* Garment drape overlay down to calculated hemline */}
        <path
          d={`M83 43 L109 43 L105 84 L${Math.min(126, 110 + (hemY - 84) * 0.14)} ${hemY} L${Math.max(66, 82 - (hemY - 84) * 0.14)} ${hemY} L87 84 Z`}
          className="fit-garment-fill"
        />

        {/* Active hemline indicator */}
        <line x1="56" y1={hemY} x2="166" y2={hemY} className="fit-hem-line" />
        <circle cx="156" cy={hemY} r="3.5" className="fit-hem-dot" />
      </svg>
      <div className="fit-diagram-meta">
        <span>AT {formatHeightImperial(heightCm)} ({heightCm} cm)</span>
        <strong>{hemLabel}</strong>
      </div>
    </div>
  );
}

export function SizeFinder({
  product,
  sizes,
  onSelect,
  externalOpen,
  onExternalClose,
  activeTab,
  onTabChange,
  hideTrigger = false,
}: {
  product: Product;
  sizes: string[];
  onSelect: (size: string) => void;
  externalOpen?: boolean;
  onExternalClose?: () => void;
  activeTab?: SizeFinderTab;
  onTabChange?: (tab: SizeFinderTab) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const closeModal = () => {
    setInternalOpen(false);
    onExternalClose?.();
  };

  const { profile, saveProfile, clearProfile } = useFitProfile();
  const { trackEvent } = useStore();

  const [internalTab, setInternalTab] = useState<SizeFinderTab>(activeTab || "profile");
  const tab = activeTab ?? internalTab;
  const setTab = (next: SizeFinderTab) => {
    setInternalTab(next);
    onTabChange?.(next);
  };
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const [mode, setMode] = useState<FitMode>(profile?.mode || DEFAULT_FIT_PROFILE.mode);
  const [heightCm, setHeightCm] = useState<number>(profile?.heightCm || DEFAULT_FIT_PROFILE.heightCm);
  const [weightKg, setWeightKg] = useState<number>(profile?.weightKg || DEFAULT_FIT_PROFILE.weightKg);
  const [usualSystem, setUsualSystem] = useState<SizeSystem>(profile?.usualSystem || DEFAULT_FIT_PROFILE.usualSystem);
  const [usualSize, setUsualSize] = useState<string>(profile?.usualSize || DEFAULT_FIT_PROFILE.usualSize);
  const [bodyShape, setBodyShape] = useState<BodyShape>(profile?.bodyShape || DEFAULT_FIT_PROFILE.bodyShape);
  const [fitPreference, setFitPreference] = useState<FitPreference>(profile?.fitPreference || DEFAULT_FIT_PROFILE.fitPreference);
  const [bustVal, setBustVal] = useState<string>(profile?.bustIn ? String(profile.bustIn) : "");
  const [waistVal, setWaistVal] = useState<string>(profile?.waistIn ? String(profile.waistIn) : "");
  const [hipVal, setHipVal] = useState<string>(profile?.hipIn ? String(profile.hipIn) : "");
  const [savedNotice, setSavedNotice] = useState<string>("");

  // Local Color & Tone Mirror state (never uploaded anywhere!)
  const [mirrorUrl, setMirrorUrl] = useState<string | null>(null);
  const [lighting, setLighting] = useState<(typeof LIGHTING_PRESETS)[number]["key"]>("daylight");
  const mirrorUrlRef = useRef<string | null>(null);

  const openWithTab = (targetTab: SizeFinderTab) => {
    setTab(targetTab);
    setInternalOpen(true);
    trackEvent("size_guide_open", { slug: product.slug, category: product.category, source: `fit_advisor_${targetTab}` });
  };

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeModal(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (mirrorUrlRef.current) {
        URL.revokeObjectURL(mirrorUrlRef.current);
      }
    };
  }, []);

  const draftProfile: FitProfile = useMemo(() => {
    const factor = unit === "cm" ? 1 / 2.54 : 1;
    const bustNum = Number(bustVal) * factor;
    const waistNum = Number(waistVal) * factor;
    const hipNum = Number(hipVal) * factor;
    return {
      mode,
      heightCm,
      weightKg,
      usualSystem,
      usualSize,
      bodyShape,
      fitPreference,
      bustIn: Number.isFinite(bustNum) && bustNum > 0 ? Math.round(bustNum * 10) / 10 : undefined,
      waistIn: Number.isFinite(waistNum) && waistNum > 0 ? Math.round(waistNum * 10) / 10 : undefined,
      hipIn: Number.isFinite(hipNum) && hipNum > 0 ? Math.round(hipNum * 10) / 10 : undefined,
    };
  }, [mode, heightCm, weightKg, usualSystem, usualSize, bodyShape, fitPreference, bustVal, waistVal, hipVal, unit]);

  const liveRec = useMemo(
    () => recommendSizeForProduct({ ...product, sizes }, draftProfile),
    [product, sizes, draftProfile],
  );

  const productImage = getDirectProductImage(product, 0);
  const activeLighting = LIGHTING_PRESETS.find((item) => item.key === lighting) || LIGHTING_PRESETS[0];

  function handleSaveFit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "measurements") {
      if (!draftProfile.bustIn || !draftProfile.waistIn || !draftProfile.hipIn) {
        setSavedNotice("Add Bust, Waist and Hip measurements — or switch to Quick Fit (no tape needed).");
        return;
      }
    }
    saveProfile(draftProfile);
    if (liveRec.supported && sizes.includes(liveRec.recommendedSize)) {
      onSelect(liveRec.recommendedSize);
    }
    setSavedNotice(`Fit profile saved on this device · Size ${liveRec.recommendedSize} selected.`);
    trackEvent("size_guide_open", {
      slug: product.slug,
      category: product.category,
      source: `fit_profile_saved_${mode}`,
    });
  }

  function handlePhotoPick(file?: File) {
    if (!file) return;
    if (mirrorUrlRef.current) URL.revokeObjectURL(mirrorUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    mirrorUrlRef.current = nextUrl;
    setMirrorUrl(nextUrl);
    trackEvent("size_guide_open", { slug: product.slug, category: product.category, source: "color_mirror" });
  }

  function clearPhoto() {
    if (mirrorUrlRef.current) {
      URL.revokeObjectURL(mirrorUrlRef.current);
      mirrorUrlRef.current = null;
    }
    setMirrorUrl(null);
  }

  const switchSystem = (next: SizeSystem) => {
    setUsualSystem(next);
    const opts = USUAL_SIZE_OPTIONS[next];
    if (!opts.includes(usualSize)) {
      setUsualSize(opts[Math.min(2, opts.length - 1)]);
    }
  };

  return (
    <div className="size-finder">
      {!hideTrigger && (
        <div className="size-finder-triggers">
          <button type="button" className="text-link" onClick={() => openWithTab("profile")}>
            {profile ? "Adjust My Fit" : "Find My Best Size"}
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" className="text-link" onClick={() => openWithTab("mirror")}>
            Color &amp; Tone Mirror
          </button>
        </div>
      )}

      {open && (
        <div className="size-modal-layer" role="dialog" aria-modal="true" aria-labelledby="size-modal-title">
          <button className="size-modal-backdrop" type="button" onClick={closeModal} aria-label="Close fit advisor" />
          <section className="size-modal fit-studio-modal">
            <div className="size-modal-head">
              <div>
                <p>AMB FIT &amp; STYLE ADVISOR</p>
                <h2 id="size-modal-title">{product.name}</h2>
              </div>
              <button type="button" autoFocus onClick={closeModal} aria-label="Close">×</button>
            </div>

            <div className="fit-tabs" role="tablist" aria-label="Fit advisor sections">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "profile"}
                className={tab === "profile" ? "active" : ""}
                onClick={() => setTab("profile")}
              >
                01 · My Fit Profile
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "proportion"}
                className={tab === "proportion" ? "active" : ""}
                onClick={() => setTab("proportion")}
              >
                02 · Length &amp; Size Chart
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "mirror"}
                className={tab === "mirror" ? "active" : ""}
                onClick={() => setTab("mirror")}
              >
                03 · Color &amp; Tone Mirror
              </button>
            </div>

            {tab === "profile" && (
              <div className="fit-advisor-grid">
                <form className="fit-advisor-form" onSubmit={handleSaveFit}>
                  <div className="fit-mode-switch" role="group" aria-label="Fit input mode">
                    <button
                      type="button"
                      className={mode === "quick" ? "active" : ""}
                      onClick={() => setMode("quick")}
                    >
                      Quick Fit (20 sec · no tape)
                    </button>
                    <button
                      type="button"
                      className={mode === "measurements" ? "active" : ""}
                      onClick={() => setMode("measurements")}
                    >
                      Exact Measurements
                    </button>
                  </div>

                  {mode === "quick" ? (
                    <>
                      <div className="fit-range-row">
                        <label>
                          <span>Height <strong>{formatHeightImperial(heightCm)} ({heightCm} cm)</strong></span>
                          <input
                            type="range"
                            min={147}
                            max={190}
                            value={heightCm}
                            onChange={(e) => setHeightCm(Number(e.target.value))}
                          />
                        </label>
                        <label>
                          <span>Weight <strong>{kgToLb(weightKg)} lb ({Math.round(weightKg)} kg)</strong></span>
                          <input
                            type="range"
                            min={43}
                            max={120}
                            value={Math.round(weightKg)}
                            onChange={(e) => setWeightKg(Number(e.target.value))}
                          />
                        </label>
                      </div>

                      <div className="fit-field-group">
                        <span className="fit-field-label">Your usual dress size</span>
                        <div className="fit-usual-row">
                          <div className="fit-system-pills" role="group" aria-label="Size system">
                            {(["US", "UK", "EU", "ALPHA"] as const).map((sys) => (
                              <button
                                key={sys}
                                type="button"
                                className={usualSystem === sys ? "active" : ""}
                                onClick={() => switchSystem(sys)}
                              >
                                {sys}
                              </button>
                            ))}
                          </div>
                          <select
                            aria-label="Usual size"
                            value={usualSize}
                            onChange={(e) => setUsualSize(e.target.value)}
                          >
                            {USUAL_SIZE_OPTIONS[usualSystem].map((opt) => (
                              <option key={opt} value={opt}>{usualSystem === "ALPHA" ? opt : `${usualSystem} ${opt}`}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="fit-field-group">
                        <span className="fit-field-label">Proportions that feel closest to you</span>
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
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="size-finder-head">
                        <span>Enter close-to-body measurements</span>
                        <button type="button" onClick={() => setUnit(unit === "in" ? "cm" : "in")}>
                          Switch to {unit === "in" ? "cm" : "inches"}
                        </button>
                      </div>
                      <div className="measurement-fields">
                        <label>
                          Bust ({unit})
                          <input
                            inputMode="decimal"
                            value={bustVal}
                            onChange={(e) => setBustVal(e.target.value)}
                            placeholder={unit === "in" ? "36" : "91"}
                          />
                        </label>
                        <label>
                          Waist ({unit})
                          <input
                            inputMode="decimal"
                            value={waistVal}
                            onChange={(e) => setWaistVal(e.target.value)}
                            placeholder={unit === "in" ? "28" : "71"}
                          />
                        </label>
                        <label>
                          Hip ({unit})
                          <input
                            inputMode="decimal"
                            value={hipVal}
                            onChange={(e) => setHipVal(e.target.value)}
                            placeholder={unit === "in" ? "38" : "97"}
                          />
                        </label>
                      </div>
                      <div className="fit-range-row single">
                        <label>
                          <span>Height (for hemline preview) <strong>{formatHeightImperial(heightCm)} ({heightCm} cm)</strong></span>
                          <input
                            type="range"
                            min={147}
                            max={190}
                            value={heightCm}
                            onChange={(e) => setHeightCm(Number(e.target.value))}
                          />
                        </label>
                      </div>
                    </>
                  )}

                  <div className="fit-field-group">
                    <span className="fit-field-label">How do you like dresses to sit?</span>
                    <div className="fit-pref-row">
                      {([
                        ["sculpted", "Close & Sculpted"],
                        ["true", "True to Size"],
                        ["relaxed", "Easy Movement"],
                      ] as const).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={fitPreference === key ? "active" : ""}
                          onClick={() => setFitPreference(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="fit-form-actions">
                    <button className="suggest-size" type="submit">
                      Save My Fit &amp; Apply Size {liveRec.recommendedSize}
                    </button>
                    {profile && (
                      <button
                        type="button"
                        className="fit-reset-link"
                        onClick={() => {
                          clearProfile();
                          setSavedNotice("Saved profile cleared from this browser.");
                        }}
                      >
                        Reset saved profile
                      </button>
                    )}
                  </div>
                  {savedNotice && <output className="fit-saved-output" aria-live="polite">{savedNotice}</output>}
                  <small className="fit-privacy-note">
                    Saved privately in your browser so your recommended size appears automatically across every AMB piece. Never uploaded.
                  </small>
                </form>

                <aside className="fit-result-card">
                  <p className="eyebrow">LIVE RECOMMENDATION</p>
                  <div className="fit-result-hero">
                    <strong>{liveRec.recommendedSize}</strong>
                    <div>
                      <span>{liveRec.confidence}% fit confidence</span>
                      <small>{liveRec.inStockInSize ? "In stock right now" : "Currently sold out in this size"}</small>
                    </div>
                  </div>
                  <p className="fit-result-note">{liveRec.fitNote}</p>
                  {liveRec.sizeUpTip && <p className="fit-result-tip">{liveRec.sizeUpTip}</p>}

                  <div className="fit-zones" aria-label="Expected fit by zone">
                    <div><span>Bust</span><strong>{liveRec.zoneFit.bust}</strong></div>
                    <div><span>Waist</span><strong>{liveRec.zoneFit.waist}</strong></div>
                    <div><span>Hips</span><strong>{liveRec.zoneFit.hip}</strong></div>
                  </div>

                  <div className="fit-hemline-box">
                    <span>HEMLINE AT {formatHeightImperial(heightCm)}</span>
                    <strong>{liveRec.hemline.label}</strong>
                    <p>{liveRec.hemline.note}</p>
                  </div>

                  <button
                    type="button"
                    className="button dark fit-apply-now"
                    onClick={() => {
                      saveProfile(draftProfile);
                      if (sizes.includes(liveRec.recommendedSize)) onSelect(liveRec.recommendedSize);
                      closeModal();
                    }}
                  >
                    Select Size {liveRec.recommendedSize} &amp; Return to Piece
                  </button>
                </aside>
              </div>
            )}

            {tab === "proportion" && (
              <div className="fit-proportion-layout">
                <div className="fit-proportion-stage">
                  <SilhouetteDiagram
                    bodyPercent={liveRec.hemline.bodyPercent}
                    heightCm={heightCm}
                    hemLabel={liveRec.hemline.label}
                  />
                  <div className="fit-proportion-controls">
                    <label>
                      <span>Adjust height to preview hemline: <strong>{formatHeightImperial(heightCm)} ({heightCm} cm)</strong></span>
                      <input
                        type="range"
                        min={147}
                        max={190}
                        value={heightCm}
                        onChange={(e) => setHeightCm(Number(e.target.value))}
                      />
                    </label>
                    <p>{liveRec.hemline.note}</p>
                    <small>Proportion preview is calibrated against a standard 5&apos;7&quot; (170 cm) studio sample and updates live as you slide.</small>
                  </div>
                </div>

                <div>
                  <h3 className="fit-subhead">International Size Conversion</h3>
                  <div className="modal-size-table" role="table" aria-label="International women's size conversion">
                    <div role="row">
                      <strong>US / CA</strong>
                      <strong>UK / AU</strong>
                      <strong>Alpha</strong>
                      <strong>Bust</strong>
                      <strong>Waist</strong>
                      <strong>Hip</strong>
                    </div>
                    {SIZE_LADDER.slice(0, 8).map((row) => (
                      <div role="row" key={row.us}>
                        <span>{row.us}</span>
                        <span>{row.uk}</span>
                        <span>{row.alpha}</span>
                        <span>{row.bust}&quot;</span>
                        <span>{row.waist}&quot;</span>
                        <span>{row.hip}&quot;</span>
                      </div>
                    ))}
                  </div>
                  <div className="measure-how">
                    <span><b>1 · Bust</b> Around fullest part, tape level.</span>
                    <span><b>2 · Waist</b> Natural waist, without pulling.</span>
                    <span><b>3 · Hip</b> Fullest part of hips and seat.</span>
                  </div>
                </div>
              </div>
            )}

            {tab === "mirror" && (
              <div className="fit-mirror-panel">
                <div className="fit-mirror-intro">
                  <div>
                    <p className="eyebrow">PRIVATE BROWSER PREVIEW · ZERO UPLOAD</p>
                    <h3>See how this color &amp; silhouette sit beside you</h3>
                    <p>
                      Choose a portrait or mirror photo from your phone or computer to compare your skin tone and hair directly next to {product.name} under three lighting moods.
                      Your photo stays strictly in your browser memory and is never sent to any server.
                    </p>
                  </div>
                  <div className="fit-mirror-controls">
                    <label className="button dark fit-upload-btn">
                      {mirrorUrl ? "Change Photo" : "Choose Your Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handlePhotoPick(e.target.files?.[0])}
                      />
                    </label>
                    {mirrorUrl && (
                      <button type="button" className="button outline" onClick={clearPhoto}>
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="fit-lighting-bar" role="group" aria-label="Preview lighting mood">
                  <span>Lighting mood:</span>
                  {LIGHTING_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className={lighting === preset.key ? "active" : ""}
                      onClick={() => setLighting(preset.key)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="fit-mirror-stage" style={{ filter: activeLighting.filter }}>
                  <div className="fit-mirror-pane fit-mirror-user">
                    {mirrorUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mirrorUrl} alt="Your local browser preview photo" />
                    ) : (
                      <div className="fit-mirror-placeholder">
                        <strong>Your Private Mirror</strong>
                        <span>Select any daylight selfie or full-length mirror photo from your device to check tone harmony beside this piece.</span>
                      </div>
                    )}
                    <span className="fit-mirror-tag">YOU · LOCAL ONLY</span>
                  </div>

                  <div className="fit-mirror-pane fit-mirror-piece">
                    {productImage && (
                      <Image
                        src={productImage}
                        alt={product.name}
                        fill
                        sizes="(max-width: 720px) 50vw, 380px"
                      />
                    )}
                    <span className="fit-mirror-tag">{product.colorNames?.[0] || "AMB PIECE"}</span>
                  </div>
                </div>

                <div className="fit-palette-strip">
                  <span>Piece palette:</span>
                  {product.colors.map((hex, index) => (
                    <span key={`${hex}-${index}`} className="fit-palette-chip">
                      <i style={{ backgroundColor: hex }} />
                      {product.colorNames?.[index] || `Shade ${index + 1}`}
                    </span>
                  ))}
                  <small>Preview shows color harmony &amp; proportion reference side by side (not an AI body overlay).</small>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
