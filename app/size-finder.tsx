"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Product } from "./data";
import { useStore } from "./store-provider";

const chart = [
  { us: "2", international: "6", alpha: "XS", bust: 33, waist: 25, hip: 35 },
  { us: "4", international: "8", alpha: "S", bust: 34, waist: 26, hip: 36 },
  { us: "6", international: "10", alpha: "S", bust: 35, waist: 27, hip: 37 },
  { us: "8", international: "12", alpha: "M", bust: 36, waist: 28, hip: 38 },
  { us: "10", international: "14", alpha: "M", bust: 37.5, waist: 29.5, hip: 39.5 },
  { us: "12", international: "16", alpha: "L", bust: 39, waist: 31, hip: 41 },
  { us: "14", international: "18", alpha: "XL", bust: 41, waist: 33, hip: 43 },
];

export function SizeFinder({ product, sizes, onSelect }: { product: Product; sizes: string[]; onSelect: (size: string) => void }) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const [result, setResult] = useState("");
  const { trackEvent } = useStore();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const factor = unit === "cm" ? 1 / 2.54 : 1;
    const values = ["bust", "waist", "hip"].map((key) => Number(data.get(key)) * factor);
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) return setResult("Add all three measurements for the most reliable suggestion.");
    const row = chart.find((entry) => values[0] <= entry.bust && values[1] <= entry.waist && values[2] <= entry.hip) || chart.at(-1)!;
    const available = sizes.find((size) => size.toUpperCase() === row.alpha || size === row.us) || sizes.find((size) => Number(size) >= Number(row.us)) || sizes.at(-1) || row.us;
    setResult(`We suggest size ${available}. Use the garment measurements as the final check.`);
    onSelect(available);
  }

  return <div className="size-finder">
    <button type="button" className="text-link" onClick={() => { setOpen(true); trackEvent("size_guide_open", { slug: product.slug, category: product.category }); }}>Size guide & fit finder</button>
    {open && <div className="size-modal-layer" role="dialog" aria-modal="true" aria-labelledby="size-modal-title">
      <button className="size-modal-backdrop" type="button" onClick={() => setOpen(false)} aria-label="Close size guide"/>
      <section className="size-modal">
        <div className="size-modal-head"><div><p>AMB FIT GUIDE</p><h2 id="size-modal-title">Find your best size</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
        <p className="size-modal-intro">Compare international sizes or enter your measurements. You will stay on {product.name}, and your selected size is preserved.</p>
        <div className="size-modal-grid">
          <div><h3>International conversion</h3><div className="modal-size-table" role="table" aria-label="International women's size conversion"><div role="row"><strong>US / CA</strong><strong>UK / AU / NZ</strong><strong>Bust</strong><strong>Waist</strong><strong>Hip</strong></div>{chart.map((row) => <div role="row" key={row.us}><span>{row.us}</span><span>{row.international}</span><span>{row.bust} in</span><span>{row.waist} in</span><span>{row.hip} in</span></div>)}</div><small>Conversions are a starting point. Product-specific garment measurements take priority.</small></div>
          <form onSubmit={submit}>
            <div className="size-finder-head"><h3>Fit finder</h3><button type="button" onClick={() => setUnit(unit === "in" ? "cm" : "in")}>{unit === "in" ? "Use cm" : "Use inches"}</button></div>
            <p>Measure close to the body over light clothing. We never save these measurements.</p>
            <div className="measurement-fields"><label>Bust<input name="bust" inputMode="decimal" placeholder={unit === "in" ? "36" : "91"}/></label><label>Waist<input name="waist" inputMode="decimal" placeholder={unit === "in" ? "28" : "71"}/></label><label>Hip<input name="hip" inputMode="decimal" placeholder={unit === "in" ? "38" : "97"}/></label></div>
            <button className="suggest-size" type="submit">Suggest my size</button>
            {result && <output aria-live="polite">{result}</output>}
            {!product.garmentMeasurements && <small>Generic AMB body-size guidance is shown until garment-specific measurements arrive with the real catalog.</small>}
          </form>
        </div>
        <div className="measure-how"><span><b>1 · Bust</b> Around the fullest part, tape level.</span><span><b>2 · Waist</b> Around your natural waist, without pulling.</span><span><b>3 · Hip</b> Around the fullest part of hips and seat.</span></div>
      </section>
    </div>}
  </div>;
}
