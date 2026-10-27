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
const {products}=load(root+'/app/data.ts');const {POST}=load(root+'/app/api/checkout/route.ts');
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
cases.push({name:'Welcome offer preserves the new Fiorenza 3x selling price',items:[{slug:'fiorenza-sequin-bodice-maxi-dress-green',size:'S',color:'Green',quantity:1}],promotionCode:'AMBWELCOME10',expected:200,expectedUnitAmount:8590});
cases.push({name:'Cart rewards preserve the new Elowyn 3x selling price',items:[{slug:'elowyn-embellished-sleeve-mini-dress-red-style-11',size:'M',color:'Red',quantity:2}],expected:200,expectedUnitAmount:8390});
const results=[];
for(const c of cases){captured=null;const res=await POST({json:async()=>({items:c.items,market:'US',promotionCode:c.promotionCode}),nextUrl:{origin:'https://offline.example'}});results.push({case:c.name,productSlug:p.slug,catalogStock:p.stock,catalogSizes:p.sizes,catalogColors:p.colorNames,request:c.items,expectedStatus:c.expected,expectedUnitAmount:c.expectedUnitAmount,actualStatus:res.status,body:await res.json(),stripeFixtureCreated:!!captured,chargedUnitAmount:captured?.line_items?.[0]?.price_data?.unit_amount,chargedQuantity:captured?.line_items?.[0]?.quantity,chargedDescription:captured?.line_items?.[0]?.price_data?.product_data?.description});}
for(const result of results){assert.equal(result.actualStatus,result.expectedStatus,result.case);if(result.expectedUnitAmount)assert.equal(result.chargedUnitAmount,result.expectedUnitAmount,result.case+' canonical price');assert.equal(result.stripeFixtureCreated,result.expectedStatus===200,result.case+' payment boundary');}console.log(JSON.stringify({passed:results.length,cases:results.map(r=>({name:r.case,status:r.actualStatus}))}));
