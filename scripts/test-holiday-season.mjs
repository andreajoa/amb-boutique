import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import Module, { createRequire } from 'node:module';
const load = createRequire(import.meta.url);
load.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename });
  module._compile(outputText, filename);
};
const original = Module._load;
Module._load = function (name, ...args) { return name === 'server-only' ? {} : original.call(this, name, ...args); };
const { products } = load('../app/data.ts');
const { holidayPhase, holidayCopy, holidayProducts, christmasDeliveryOpen, holidayEligible } = load('../app/holiday/season.ts');
const { getDiscountState, getShippingQuotes, christmasOrderCutoff, BLACK_FRIDAY } = load('../app/commerce.ts');
const { bestNonStackingDiscount, protectMargin } = load('../app/profitability.ts');
const ny = (s, h = 12) => Date.parse(`${s}T${String(h).padStart(2, '0')}:00:00-05:00`);

// fases
assert.equal(holidayPhase(ny('2026-10-28')), 'preview');
assert.equal(holidayPhase(ny('2026-11-20', 0)), 'black-friday');
assert.equal(holidayPhase(ny('2026-11-30', 23)), 'black-friday');
assert.equal(holidayPhase(ny('2026-12-01', 0)), 'gifts');
assert.equal(holidayPhase(ny('2026-12-09')), 'new-year');
assert.equal(holidayPhase(ny('2027-01-02')), 'after');

// prazo de Natal: 18 dias úteis (sem fim de semana nem Thanksgiving) até 23/12 => pedir até 27/11
assert.equal(christmasOrderCutoff('US').toISOString().slice(0, 10), '2026-11-27');
assert.ok(christmasDeliveryOpen(ny('2026-11-27', 23)));
assert.ok(!christmasDeliveryOpen(ny('2026-11-28', 1)));
assert.match(holidayCopy('black-friday', ny('2026-11-21')).notice, /by November 27 arrive before Christmas, or we refund/);
assert.doesNotMatch(holidayCopy('gifts', ny('2026-12-02')).notice, /refund/);

// desconto: níveis normais fora da BF, 20%/25% na BF, sem acumular
assert.equal(getDiscountState(150, ny('2026-11-10')).percent, 5);
assert.equal(getDiscountState(50, ny('2026-11-21')).percent, 20);
assert.equal(getDiscountState(199, ny('2026-11-21')).percent, 20);
assert.equal(getDiscountState(200, ny('2026-11-21')).percent, 25);
assert.equal(getDiscountState(600, ny('2026-11-21')).percent, 25, 'BF nunca passa de 25%');
assert.equal(getDiscountState(50, ny('2026-12-01', 1)).percent, 0, 'BF acaba em 30/11');
// acesso antecipado: só com AMBVIP em 19/11
assert.equal(getDiscountState(50, ny('2026-11-19')).percent, 0);
assert.equal(getDiscountState(50, ny('2026-11-19'), BLACK_FRIDAY.vipCode).percent, 20);
assert.equal(getDiscountState(50, ny('2026-11-18'), BLACK_FRIDAY.vipCode).percent, 0);
assert.equal(bestNonStackingDiscount(25, 'AMBWELCOME10').percent, 25, 'cupom não soma');

// frete internacional grátis acima de US$200 só na BF e até US$50 de custo
assert.equal(getShippingQuotes('CA', 210, 16, ny('2026-11-21'))[0].amountUsd, 0);
assert.ok(getShippingQuotes('CA', 210, 16, ny('2026-12-02'))[0].amountUsd > 0);
assert.ok(getShippingQuotes('CA', 150, 16, ny('2026-11-21'))[0].amountUsd > 0);
assert.ok(getShippingQuotes('AU', 250, 48, ny('2026-11-21'))[0].amountUsd > 0, 'acima do teto paga frete');

// tudo o que a /holiday mostra recebe de verdade 20% e 25% no checkout
for (const phase of ['preview', 'black-friday', 'gifts', 'new-year']) {
  const list = holidayProducts(products, phase);
  assert.ok(list.length >= 40, `${phase}: poucos produtos (${list.length})`);
  for (const p of list) {
    assert.ok(holidayEligible(p));
    assert.equal(protectMargin(p, 20).approvedPercent, 20, p.slug);
    assert.equal(protectMargin(p, 25).approvedPercent, 25, p.slug);
  }
}
assert.ok(['Bags', 'Accessories'].includes(holidayProducts(products, 'gifts')[0].category));
console.log('holiday season ok');
