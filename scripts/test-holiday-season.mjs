import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const load = createRequire(import.meta.url);
load.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename });
  module._compile(outputText, filename);
};
const { products } = load('../app/data.ts');
const { holidayPhase, holidayCopy, holidayProducts, christmasDeliveryOpen } = load('../app/holiday/season.ts');
const ny = s => Date.parse(s + 'T12:00:00-05:00');
assert.equal(holidayPhase(ny('2026-10-28')), 'preview');
assert.equal(holidayPhase(ny('2026-11-20')), 'black-friday');
assert.equal(holidayPhase(ny('2026-11-30')), 'black-friday');
assert.equal(holidayPhase(ny('2026-12-01')), 'gifts');
assert.equal(holidayPhase(ny('2026-12-09')), 'new-year');
assert.equal(holidayPhase(ny('2027-01-02')), 'after');
// prazo de Natal: 24/12 menos o prazo máximo dos EUA (18 dias) = 6/12
assert.ok(christmasDeliveryOpen(ny('2026-12-06')));
assert.ok(!christmasDeliveryOpen(ny('2026-12-07')));
assert.match(holidayCopy('gifts', ny('2026-12-02')).notice, /Order by December 6/);
assert.doesNotMatch(holidayCopy('gifts', ny('2026-12-08')).notice, /Order by/);
for (const phase of ['preview', 'black-friday', 'gifts', 'new-year']) {
  const list = holidayProducts(products, phase);
  assert.ok(list.length >= 40, `${phase}: poucos produtos (${list.length})`);
  assert.ok(list.every(p => p.stock > 0), `${phase}: produto sem estoque`);
}
assert.ok(['Bags', 'Accessories'].includes(holidayProducts(products, 'gifts')[0].category));
console.log('holiday season ok');
