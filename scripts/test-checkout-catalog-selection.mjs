import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)).replace(/\/$/,'');
const load=createRequire(root+'/package.json');const ts=load('typescript');
for(const ext of ['.ts','.tsx'])load.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replace(/^import "server-only";$/m,''),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:f}).outputText,f);
function stub(path,exports){const f=load.resolve(root+path);load.cache[f]={id:f,filename:f,loaded:true,exports};}
let captured;
stub('/app/stripe-server.ts',{getStripe:()=>({checkout:{sessions:{create:async params=>{captured=params;return {id:'cs_fixture_only',client_secret:'fixture-not-a-real-secret'}}}}})});
stub('/app/email/commerce-lifecycle.ts',{recordCheckoutJourney:async()=>{}});
globalThis.fetch=async()=>{throw new Error('External requests forbidden in critic audit')};
const {products}=load(root+'/app/data.ts');const {POST}=load(root+'/app/api/checkout/route.ts');const {protectMargin,bestNonStackingDiscount}=load(root+'/app/profitability.ts');const {getDiscountState}=load(root+'/app/commerce.ts');
const p=products.find(p=>p.slug==='celeste-floral-midi-dress-red');assert.equal(p.stock,1);
const cases=[{name:'Quantity exceeds stock',items:[{slug:p.slug,size:'M',color:'Red Floral',quantity:10}],expected:400},{name:'Missing size',items:[{slug:p.slug,color:'Red Floral',quantity:1}],expected:400},{name:'Incorrect color',items:[{slug:p.slug,size:'M',color:'Nonexistent Color',quantity:1}],expected:400}];
cases.push({name:'Aggregate duplicate lines exceed stock',items:[{slug:p.slug,size:'M',color:'Red Floral',quantity:1},{slug:p.slug,size:'M',color:'Red Floral',quantity:1}],expected:400});
cases.push({name:'Valid canonical selection',items:[{slug:p.slug,size:'M',color:'Red Floral',quantity:1}],expected:200});
cases.push({name:'Zero quantity rejected',items:[{slug:p.slug,size:'M',color:'Red Floral',quantity:0}],expected:400});
cases.push({name:'Fractional quantity rejected',items:[{slug:p.slug,size:'M',color:'Red Floral',quantity:1.5}],expected:400});
cases.push({name:'Missing color rejected',items:[{slug:p.slug,size:'M',quantity:1}],expected:400});
cases.push({name:'Reviewed SKU size stock cap',items:[{slug:'ada-knit-vest',size:'L',color:'Khaki',quantity:4}],expected:400});
cases.push({name:'Reviewed SKU duplicate lines cap',items:[{slug:'ada-knit-vest',size:'L',color:'Khaki',quantity:2},{slug:'ada-knit-vest',size:'L',color:'Khaki',quantity:2}],expected:400});
cases.push({name:'Different sizes use separate stock',items:[{slug:'ada-knit-vest',size:'L',color:'Khaki',quantity:2},{slug:'ada-knit-vest',size:'M',color:'Khaki',quantity:2}],expected:200});
cases.push({name:'Piping color has only verified XS',items:[{slug:'elle-ribbed-tank',size:'M',color:'White',quantity:1}],expected:400});
cases.push({name:'Unavailable supplier color blocked',items:[{slug:'zoe-square-neck-top',size:'S',color:'Blue',quantity:1}],expected:400});
cases.push({name:'Unconfirmed freight blocks a stocked SKU',items:[{slug:'elle-ribbed-tank',size:'XS',color:'White',quantity:1}],expected:400});
cases.push({name:'New Fiorenza valid exact size and color',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-green',size:'S',color:'Green',quantity:1,price:0.01}],expected:200});
cases.push({name:'New Fiorenza S cannot exceed its six units',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-green',size:'S',color:'Green',quantity:7}],expected:400});
cases.push({name:'New Fiorenza duplicate size lines share stock',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-green',size:'S',color:'Green',quantity:4},{slug:'fiorenza-sequin-bodice-maxi-dress-green',size:'S',color:'Green',quantity:3}],expected:400});
cases.push({name:'New Fiorenza native XS label cannot be silently replaced',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-green',size:'XS',color:'Green',quantity:1}],expected:400});
for (const [slug,color] of [['mosaico-swing-midi-dress','Teal & Olive Geometric'],['fio-dourado-swing-midi-dress','Black & Gold Line'],['tartan-swing-midi-dress','Red Tartan Plaid']]) {
  cases.push({name:slug+' uses canonical price despite client tampering',items:[{slug,size:'S',color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:4190});
}
for (const [slug,color] of [['mostarda-velvet-cowl-dress','Mustard'],['nevoa-velvet-cowl-dress','Dusty Blue'],['ameixa-velvet-cowl-dress','Plum']]) {
  cases.push({name:slug+' uses canonical price despite client tampering',items:[{slug,size:'S',color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:8390});
}
cases.push({name:'Black Fiorenza uses canonical price despite client tampering',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-black',size:'S',color:'Black',quantity:1,price:0.01}],expected:200,expectedUnitAmount:8590});
cases.push({name:'Black Fiorenza native XS label cannot be aliased',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-black',size:'XS',color:'Black',quantity:1}],expected:400});
cases.push({name:'Black Fiorenza native XS has only four units',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-black',size:'XS（old）',color:'Black',quantity:5}],expected:400});
cases.push({name:'Dark Blue Fiorenza uses canonical price despite client tampering',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-dark-blue',size:'S',color:'Dark Blue',quantity:1,price:0.01}],expected:200,expectedUnitAmount:8590});
cases.push({name:'Dark Blue native XS cannot be aliased',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-dark-blue',size:'XS',color:'Dark Blue',quantity:1}],expected:400});
cases.push({name:'Dark Blue XS stock cap is ten',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-dark-blue',size:'XS（old）',color:'Dark Blue',quantity:11}],expected:400});
cases.push({name:'Pink uses canonical price',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-pink',size:'S',color:'Pink',quantity:1,price:0.01}],expected:200,expectedUnitAmount:8590});
cases.push({name:'Red native XS old is purchasable',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-red',size:'XS（old）',color:'Red',quantity:1,price:0.01}],expected:200,expectedUnitAmount:8590});
cases.push({name:'Red unavailable S is blocked',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-red',size:'S',color:'Red',quantity:1}],expected:400});
cases.push({name:'Wine Red L uses canonical price',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-wine-red',size:'L',color:'Wine Red',quantity:1,price:0.01}],expected:200,expectedUnitAmount:8590});
cases.push({name:'Wine Red unavailable M is blocked',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-wine-red',size:'M',color:'Wine Red',quantity:1}],expected:400});
cases.push({name:'Wine Red L respects twelve-unit cap',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-wine-red',size:'L',color:'Wine Red',quantity:13}],expected:400});
cases.push({name:'Pink M respects thirty-four-unit cap',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-pink',size:'M',color:'Pink',quantity:35}],expected:400});
for (const [suffix,color,amount] of [['emerald-style-07','Emerald',8390],['royal-blue-style-06','Royal Blue',8390],['burgundy-style-23','Burgundy',7890],['black-style-22','Black',7890]]) {
  const slug='evelisse-cowl-neck-velvet-mini-dress-'+suffix;
  cases.push({name:slug+' charges confirmed catalog price despite client tampering',items:[{slug,size:'S',color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:amount});
  cases.push({name:slug+' rejects unavailable XS',items:[{slug,size:'XS',color,quantity:1}],expected:400});
}
for (const [slug,color] of [
  ['evelisse-cowl-neck-velvet-mini-dress-champagne-style-05','Champagne'],
  ['elowyn-embellished-sleeve-mini-dress-pink-style-14','Pink'],
  ['elowyn-embellished-sleeve-mini-dress-burgundy-style-30','Burgundy'],
  ['elowyn-embellished-sleeve-mini-dress-charcoal-style-13','Charcoal'],
]) {
  cases.push({name:slug+' uses confirmed canonical price',items:[{slug,size:'XXXL',color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:8390});
}
cases.push({name:'Champagne velvet rejects unavailable XS',items:[{slug:'evelisse-cowl-neck-velvet-mini-dress-champagne-style-05',size:'XS',color:'Champagne',quantity:1}],expected:400});
for (const [suffix,color] of [['emerald-style-31','Emerald'],['black-style-29','Black'],['royal-blue-style-12','Royal Blue'],['red-style-11','Red'],['navy-style-28','Navy'],['gold-style-10','Gold']]) {
  const slug='elowyn-embellished-sleeve-mini-dress-'+suffix;
  cases.push({name:slug+' charges the canonical 3x retail price',items:[{slug,size:'S',color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:8390});
}
cases.push({name:'Red Elowyn M cannot exceed its 64 units',items:[{slug:'elowyn-embellished-sleeve-mini-dress-red-style-11',size:'M',color:'Red',quantity:65}],expected:400});
cases.push({name:'Welcome offer discounts Fiorenza 3x selling price',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-green',size:'S',color:'Green',quantity:1}],promotionCode:'AMBWELCOME10',expected:200,listUnitAmount:8590});
cases.push({name:'Cart rewards discounts Elowyn 3x selling price',items:[{slug:'elowyn-embellished-sleeve-mini-dress-red-style-11',size:'M',color:'Red',quantity:2}],expected:200,listUnitAmount:8390});
for (const [suffix,color] of [['blue','Blue'],['green','Teal Green'],['red','Red'],['black','Black'],['white','White & Black'],['lavender','Lavender']]) {
  const slug='odessa-polka-dot-halter-swing-dress-'+suffix;
  cases.push({name:slug+' uses the confirmed native XXL price',items:[{slug,size:'XXL',color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:8990});
}
for (const [suffix,color] of [['black-style-19','Black'],['plum-style-18','Plum'],['burgundy-style-17','Burgundy'],['emerald-style-16','Emerald']]) {
  const slug='vionelle-lace-sleeve-asymmetric-mini-dress-'+suffix;
  cases.push({name:slug+' uses the confirmed native XXXL price',items:[{slug,size:'XXXL',color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:8390});
}
cases.push({name:'Odessa does not inherit unavailable XXXL',items:[{slug:'odessa-polka-dot-halter-swing-dress-blue',size:'XXXL',color:'Blue',quantity:1}],expected:400});
cases.push({name:'Vionelle rejects unavailable XS',items:[{slug:'vionelle-lace-sleeve-asymmetric-mini-dress-black-style-19',size:'XS',color:'Black',quantity:1}],expected:400});
cases.push({name:'Odessa welcome offer discounts 3x retail',items:[{slug:'odessa-polka-dot-halter-swing-dress-white',size:'S',color:'White & Black',quantity:1}],promotionCode:'AMBWELCOME10',expected:200,listUnitAmount:8990});
cases.push({name:'Odessa cart rewards discounts 3x retail',items:[{slug:'odessa-polka-dot-halter-swing-dress-blue',size:'S',color:'Blue',quantity:2}],expected:200,listUnitAmount:8990});
for (const [suffix,color,size,amount] of [
  ['yellow','Yellow','L',21090],['black','Black','S',21090],
  ['red-high-end-fabric','Red Smooth','S',21090],['hot-pink','Hot Pink','XS',21090],
  ['red-bandage-fabric','Red Ribbed','XS',20490],
]) {
  const slug='rosaline-rosette-corset-mini-dress-'+suffix;
  cases.push({name:slug+' charges the confirmed 3x canonical price',items:[{slug,size,color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:amount});
}
cases.push({name:'Yellow Rosaline omits unavailable M',items:[{slug:'rosaline-rosette-corset-mini-dress-yellow',size:'M',color:'Yellow',quantity:1}],expected:400});
cases.push({name:'Black Rosaline enforces its one-unit S cap',items:[{slug:'rosaline-rosette-corset-mini-dress-black',size:'S',color:'Black',quantity:2}],expected:400});
cases.push({name:'Red Smooth Rosaline caps the newly confirmed S at five units',items:[{slug:'rosaline-rosette-corset-mini-dress-red-high-end-fabric',size:'S',color:'Red Smooth',quantity:6}],expected:400});
cases.push({name:'Rosaline welcome offer discounts 3x selling price',items:[{slug:'rosaline-rosette-corset-mini-dress-red-bandage-fabric',size:'XS',color:'Red Ribbed',quantity:1}],promotionCode:'AMBWELCOME10',expected:200,listUnitAmount:20490});
cases.push({name:'Rosaline cart rewards discounts 3x selling price',items:[{slug:'rosaline-rosette-corset-mini-dress-hot-pink',size:'XS',color:'Hot Pink',quantity:2}],expected:200,listUnitAmount:21090});
for (const [slug,color,size,amount] of [
  ['arlena-cutout-halter-maxi-dress-black','Black','XS',16990],
  ['arlena-cutout-halter-maxi-dress-coffee','Coffee','L',16990],
  ['verdelle-lace-bodice-pleated-gown-green','Green','S',18890],
  ['verdelle-lace-bodice-pleated-gown-green','Green','M',18890],
]) {
  cases.push({name:slug+'/'+size+' charges the canonical 3x maximum eligible cost price',items:[{slug,size,color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:amount});
}
cases.push({name:'Arlena omits non-native XL',items:[{slug:'arlena-cutout-halter-maxi-dress-black',size:'XL',color:'Black',quantity:1}],expected:400});
cases.push({name:'Verdelle Green omits non-native XL',items:[{slug:'verdelle-lace-bodice-pleated-gown-green',size:'XL',color:'Green',quantity:1}],expected:400});
cases.push({name:'Held Arlena Red cannot be purchased',items:[{slug:'arlena-cutout-halter-maxi-dress-red',size:'S',color:'Red',quantity:1}],expected:400});
cases.push({name:'Held Khaki gown cannot be purchased',items:[{slug:'verdelle-lace-bodice-pleated-gown-khaki',size:'S',color:'Khaki',quantity:1}],expected:400});
cases.push({name:'Coffee XS cannot exceed its thirty-three unit cap',items:[{slug:'arlena-cutout-halter-maxi-dress-coffee',size:'XS',color:'Coffee',quantity:34}],expected:400});
cases.push({name:'Verdelle welcome offer discounts 3x cost pricing',items:[{slug:'verdelle-lace-bodice-pleated-gown-green',size:'S',color:'Green',quantity:1}],promotionCode:'AMBWELCOME10',expected:200,listUnitAmount:18890});
cases.push({name:'Arlena cart rewards discounts 3x cost pricing',items:[{slug:'arlena-cutout-halter-maxi-dress-coffee',size:'XS',color:'Coffee',quantity:2}],expected:200,listUnitAmount:16990});
cases.push({name:'Noctelle Black uses confirmed 3x cost price',items:[{slug:'noctelle-strapless-corset-midi-dress-black',size:'XS',color:'Black',quantity:1,price:0.01}],expected:200,expectedUnitAmount:13290});
cases.push({name:'Noctelle does not invent native XL',items:[{slug:'noctelle-strapless-corset-midi-dress-black',size:'XL',color:'Black',quantity:1}],expected:400});
cases.push({name:'Noctelle Red held for missing garment reference cannot be purchased',items:[{slug:'noctelle-strapless-corset-midi-dress-red',size:'S',color:'Red',quantity:1}],expected:400});
cases.push({name:'Noctelle welcome offer discounts 3x retail',items:[{slug:'noctelle-strapless-corset-midi-dress-black',size:'S',color:'Black',quantity:1}],promotionCode:'AMBWELCOME10',expected:200,listUnitAmount:13290});
for (const [slug,color,size,amount] of [
  ['mirabelle-bow-strap-floral-gown-red','Red','XS',11190],
  ['bellora-slit-slip-maxi-dress-red','Red','S',3390],
  ['bellora-slit-slip-maxi-dress-black','Black','M',3490],
  ['cerelia-lace-corset-mini-dress-gray','Gray','XS（old）',13290],
  ['asteria-star-print-tulle-mini-dress-green','Green','XL',5390],
  ['caldera-graphic-stripe-mini-dress-black','Black','XS',13590],
  ['hollis-festive-knit-sweater-dress-white','White','L',6890],
  ['hollis-festive-knit-sweater-dress-red','Red','M',6890],
]) {
  cases.push({name:slug+' preserves the confirmed 3x price despite client tampering',items:[{slug,size,color,quantity:1,price:0.01}],expected:200,expectedUnitAmount:amount});
}
for (const [slug,color] of [['sorelia-draped-halter-mini-dress-red','Red'],['cerelia-lace-corset-mini-dress-white','White'],['cerelia-lace-corset-mini-dress-black','Black'],['cerelia-lace-corset-mini-dress-red','Red']]) {
  cases.push({name:slug+' remains held and cannot be purchased',items:[{slug,size:'S',color,quantity:1}],expected:400});
}
cases.push({name:'Cerelia literal native XS old is not plain XS',items:[{slug:'cerelia-lace-corset-mini-dress-gray',size:'XS',color:'Gray',quantity:1}],expected:400});
cases.push({name:'Cerelia official zero XL is omitted',items:[{slug:'cerelia-lace-corset-mini-dress-gray',size:'XL',color:'Gray',quantity:1}],expected:400});
cases.push({name:'Cerelia duplicate native XS old lines share the five-unit cap',items:[{slug:'cerelia-lace-corset-mini-dress-gray',size:'XS（old）',color:'Gray',quantity:3},{slug:'cerelia-lace-corset-mini-dress-gray',size:'XS（old）',color:'Gray',quantity:3}],expected:400});
cases.push({name:'Asteria newly synced XL cannot exceed seven',items:[{slug:'asteria-star-print-tulle-mini-dress-green',size:'XL',color:'Green',quantity:8}],expected:400});
cases.push({name:'Asteria unavailable L is blocked even when cached stock is positive',items:[{slug:'asteria-star-print-tulle-mini-dress-green',size:'L',color:'Green',quantity:5}],expected:400});
cases.push({name:'Bellora Black M cannot exceed seventeen',items:[{slug:'bellora-slit-slip-maxi-dress-black',size:'M',color:'Black',quantity:18}],expected:400});
cases.push({name:'Caldera S cannot exceed four',items:[{slug:'caldera-graphic-stripe-mini-dress-black',size:'S',color:'Black',quantity:5}],expected:400});
cases.push({name:'Cerelia welcome offer discounts 3x selling price',items:[{slug:'cerelia-lace-corset-mini-dress-gray',size:'XS（old）',color:'Gray',quantity:1}],promotionCode:'AMBWELCOME10',expected:200,listUnitAmount:13290});
cases.push({name:'Bellora cart rewards discounts 3x selling price',items:[{slug:'bellora-slit-slip-maxi-dress-red',size:'S',color:'Red',quantity:2}],expected:200,listUnitAmount:3390});
cases.push({name:'Fresh official zero Asteria L cannot be purchased',items:[{slug:'asteria-star-print-tulle-mini-dress-green',size:'L',color:'Green',quantity:1}],expected:400});
cases.push({name:'Fresh Asteria M cap is three',items:[{slug:'asteria-star-print-tulle-mini-dress-green',size:'M',color:'Green',quantity:4}],expected:400});
cases.push({name:'Published Ameixa L refreshed cap is sixty-four',items:[10, 10, 10, 10, 10, 10, 5].map(quantity=>({slug:'ameixa-velvet-cowl-dress',size:'L',color:'Plum',quantity})),expected:400,expectedErrorIncludes:['Only 64 of','in size L are']});
cases.push({name:'Published Evelisse Champagne XXL refreshed cap is sixty-three',items:[10, 10, 10, 10, 10, 10, 4].map(quantity=>({slug:'evelisse-cowl-neck-velvet-mini-dress-champagne-style-05',size:'XXL',color:'Champagne',quantity})),expected:400,expectedErrorIncludes:['Only 63 of','in size XXL are']});
cases.push({name:'Published Vionelle Burgundy XXL refreshed cap is sixty-four',items:[10, 10, 10, 10, 10, 10, 5].map(quantity=>({slug:'vionelle-lace-sleeve-asymmetric-mini-dress-burgundy-style-17',size:'XXL',color:'Burgundy',quantity})),expected:400,expectedErrorIncludes:['Only 64 of','in size XXL are']});

// Preço canônico (3x) menos o melhor desconto elegível do momento, travado na margem mínima.
function offerPrice(name, listCents) {
  const c = cases.find(x => x.name === name);
  const product = products.find(x => x.slug === c.items[0].slug);
  const unit = listCents / 100, quantity = c.items.reduce((sum, item) => sum + item.quantity, 0);
  const offer = bestNonStackingDiscount(getDiscountState(unit * quantity, Date.now(), c.promotionCode).percent, c.promotionCode);
  const margin = protectMargin({ ...product, price: unit }, offer.percent);
  return Math.max(50, Math.round(unit * (1 - margin.approvedPercent / 100) * 100));
}
const results=[];
for(const c of cases){captured=null;const res=await POST({json:async()=>({items:c.items,market:'US',promotionCode:c.promotionCode}),nextUrl:{origin:'https://offline.example'}});results.push({case:c.name,productSlug:p.slug,catalogStock:p.stock,catalogSizes:p.sizes,catalogColors:p.colorNames,request:c.items,expectedStatus:c.expected,expectedUnitAmount:c.expectedUnitAmount,expectedErrorIncludes:c.expectedErrorIncludes,actualStatus:res.status,body:await res.json(),stripeFixtureCreated:!!captured,chargedUnitAmount:captured?.line_items?.[0]?.price_data?.unit_amount,chargedQuantity:captured?.line_items?.[0]?.quantity,chargedDescription:captured?.line_items?.[0]?.price_data?.product_data?.description});}
for(const result of results){for(const phrase of result.expectedErrorIncludes||[])assert.ok(result.body.error?.includes(phrase),result.case+' exact stock guard: '+JSON.stringify(result.body));assert.equal(result.actualStatus,result.expectedStatus,result.case);if(result.expectedUnitAmount)assert.equal(result.chargedUnitAmount,offerPrice(result.case,result.expectedUnitAmount),result.case+' canonical price');assert.equal(result.stripeFixtureCreated,result.expectedStatus===200,result.case+' payment boundary');}console.log(JSON.stringify({passed:results.length,cases:results.map(r=>({name:r.case,status:r.actualStatus}))}));
// Ofertas: o checkout aplica o melhor desconto (sem acumular) e nunca passa da margem mínima do produto.
for (const c of cases.filter(c => c.listUnitAmount)) {
  const result = results.find(r => r.case === c.name);
  const product = products.find(x => x.slug === c.items[0].slug);
  const quantity = c.items.reduce((sum, item) => sum + item.quantity, 0);
  const offer = bestNonStackingDiscount(getDiscountState(product.price * quantity, Date.now(), c.promotionCode).percent, c.promotionCode);
  const margin = protectMargin(product, offer.percent);
  assert.ok(margin.costKnown, c.name + ': cost known');
  assert.equal(result.chargedUnitAmount, Math.max(50, Math.round(product.price * (1 - margin.approvedPercent / 100) * 100)), c.name + ' discounted price');
  if (offer.percent) assert.ok(margin.approvedPercent > 0, c.name + ': offer applied');
  assert.ok(margin.marginPercent >= (product.minimumMarginPercent ?? 30) - 0.01, c.name + ': margin floor');
}
