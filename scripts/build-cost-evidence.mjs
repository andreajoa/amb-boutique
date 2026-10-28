// Gera imports/cost-evidence.json: maior custo landed (produto + frete EUA) comprovado por fonte datada, por página.
// Fontes: auditoria de preços 3x (25/10) e vínculos de fornecedor dos lotes novos. Sem prova, a página não recebe desconto.
import fs from 'node:fs';
const dir = new URL('../imports/', import.meta.url);
const evidence = {};
const add = (slug, cost, source) => {
  if (!slug || !(cost > 0)) return;
  if (!evidence[slug] || cost > evidence[slug].landedCostUsd) evidence[slug] = { landedCostUsd: Math.round(cost * 100) / 100, source };
};
const markup = JSON.parse(fs.readFileSync(new URL('markup-3x-20261025.json', dir)));
for (const p of markup.products) add(p.slug, Number(p.highestLandedCostUsd), `markup-3x-20261025 (${p.costEvidence})`);
for (const file of fs.readdirSync(dir).filter((f) => /bindings\.json$/.test(f)).sort()) {
  const data = JSON.parse(fs.readFileSync(new URL(file, dir)));
  for (const p of data.products || data) add(p.slug, Math.max(...Object.values(p.landedCostUsdBySize || {}).map(Number)), file);
}
// Páginas extras comprovadas por arquivo datado (custo do fornecedor ligado à página pelo mapa do Codex ou pelo Manager).
for (const file of fs.readdirSync(dir).filter((f) => /^cost-evidence-extra-.*\.json$/.test(f)).sort()) {
  for (const [slug, row] of Object.entries(JSON.parse(fs.readFileSync(new URL(file, dir))))) add(slug, Number(row.landedCostUsd), `${file}: ${row.source}`);
}
const sorted = Object.fromEntries(Object.keys(evidence).sort().map((k) => [k, evidence[k]]));
fs.writeFileSync(new URL('cost-evidence.json', dir), JSON.stringify({ generatedBy: 'scripts/build-cost-evidence.mjs', products: sorted }, null, 1) + '\n');
console.log('páginas com custo comprovado:', Object.keys(sorted).length);
