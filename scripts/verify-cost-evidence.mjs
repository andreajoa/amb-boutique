// Portão de publicação (roda antes do build): produto à venda só entra na loja com o custo landed
// (produto + frete EUA) comprovado por fonte datada e preço de pelo menos 3x esse custo.
// Produtos antigos sem prova ficam numa lista congelada que só pode diminuir.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';

const load = createRequire(import.meta.url);
load.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true }, fileName: filename });
  module._compile(outputText, filename);
};
const original = Module._load;
Module._load = function (name, ...args) { return name === 'server-only' ? {} : original.call(this, name, ...args); };

const imports = new URL('../imports/', import.meta.url);
const read = (file) => JSON.parse(fs.readFileSync(new URL(file, imports), 'utf8'));

// 1. cost-evidence.json tem que estar em dia com os vínculos de fornecedor (gerado, nunca editado à mão)
const before = fs.readFileSync(new URL('cost-evidence.json', imports), 'utf8');
execFileSync(process.execPath, [new URL('./build-cost-evidence.mjs', import.meta.url).pathname], { stdio: 'ignore' });
const after = fs.readFileSync(new URL('cost-evidence.json', imports), 'utf8');
fs.writeFileSync(new URL('cost-evidence.json', imports), before);
assert.equal(after, before, 'imports/cost-evidence.json desatualizado: rode node scripts/build-cost-evidence.mjs e faça commit');

const proven = read('cost-evidence.json').products;
const legacyFile = read('cost-unproven-legacy-20261028.json');
const legacy = new Set(legacyFile.slugs);
const LEGACY_PRICE = new Set(legacyFile.below3xSlugs);
const { products } = load('../app/data.ts');
const onSale = products.filter((p) => typeof p.stock === 'number' && p.stock > 0);

const missing = onSale.filter((p) => !proven[p.slug] && !legacy.has(p.slug)).map((p) => p.slug);
assert.deepEqual(missing, [], `Produto à venda sem custo comprovado (adicione o vínculo com landedCostUsdBySize em imports/*bindings.json): ${missing.join(', ')}`);

const cheap = onSale.filter((p) => proven[p.slug] && !legacy.has(p.slug) && !LEGACY_PRICE.has(p.slug) && p.price < proven[p.slug].landedCostUsd * 3 - 0.01)
  .map((p) => `${p.slug} $${p.price} < 3x $${proven[p.slug].landedCostUsd}`);
assert.deepEqual(cheap, [], `Preço abaixo de 3x o custo comprovado: ${cheap.join('; ')}`);

const nowProven = [...legacy].filter((slug) => proven[slug]);
console.log(`custo comprovado: ${onSale.length - legacy.size}/${onSale.length} à venda; legado sem prova: ${legacy.size}` + (nowProven.length ? ` (${nowProven.length} já comprovados podem sair da lista)` : ''));
