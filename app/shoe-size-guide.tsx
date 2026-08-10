const shoeSizes = [
  { eu: "33", cm: "21.5", inches: "8.46", us: "4", uk: "2", au: "4" },
  { eu: "34", cm: "22.0", inches: "8.66", us: "4.5", uk: "2.5", au: "4.5" },
  { eu: "35", cm: "22.5", inches: "8.86", us: "5", uk: "3", au: "5" },
  { eu: "36", cm: "23.0", inches: "9.06", us: "5.5", uk: "3.5", au: "5.5" },
  { eu: "37", cm: "23.5", inches: "9.25", us: "6.5", uk: "4.5", au: "6.5" },
  { eu: "38", cm: "24.0", inches: "9.45", us: "7.5", uk: "5.5", au: "7.5" },
  { eu: "39", cm: "24.5", inches: "9.65", us: "8", uk: "6", au: "8" },
  { eu: "40", cm: "25.0", inches: "9.84", us: "9", uk: "7", au: "9" },
  { eu: "41", cm: "25.5", inches: "10.04", us: "9.5", uk: "7.5", au: "9.5" },
  { eu: "42", cm: "26.0", inches: "10.24", us: "10.5", uk: "8.5", au: "10.5" },
  { eu: "43", cm: "26.5", inches: "10.43", us: "11", uk: "9", au: "11" },
  { eu: "44", cm: "27.0", inches: "10.63", us: "12", uk: "10", au: "12" },
  { eu: "45", cm: "27.5", inches: "10.83", us: "13", uk: "11", au: "13" },
  { eu: "46", cm: "28.0", inches: "11.02", us: "14", uk: "12", au: "14" },
];

export function ShoeSizeGuide({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`shoe-size-guide${compact ? " compact" : ""}`} id={compact ? undefined : "shoes"}>
      {!compact && <div className="shoe-size-intro"><p>AMB FIT REFERENCE</p><h2>Women’s Shoe Size Guide</h2><span>Our current heels are listed in EU sizing. For the most reliable fit, measure your foot and use the foot-length column first; international conversions are a reference because fit can vary slightly by style.</span></div>}
      <div className="shoe-size-table-wrap" role="region" aria-label="Women’s shoe size conversion table" tabIndex={0}>
        <table className="shoe-size-table">
          <thead><tr><th>EU</th><th>Foot length</th><th>US / CA</th><th>UK</th><th>AU / NZ</th></tr></thead>
          <tbody>{shoeSizes.map((row) => <tr key={row.eu}><td><strong>{row.eu}</strong></td><td>{row.cm} cm <small>({row.inches} in)</small></td><td>{row.us}</td><td>{row.uk}</td><td>{row.au}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="shoe-size-notes">
        <div><strong>How to measure</strong><p>Stand on a sheet of paper with your heel against a wall. Mark the tip of your longest toe, then measure from the wall to the mark. Measure both feet and use the larger measurement.</p></div>
        <div><strong>Between sizes?</strong><p>For pointed-toe heels, choose the next size up when your measurement falls between two sizes. A secure fit should hold the heel without compressing the toes.</p></div>
      </div>
      <p className="shoe-size-disclaimer">Size conversions are approximate. Foot length is the primary AMB fit reference for these imported heel styles.</p>
    </section>
  );
}
