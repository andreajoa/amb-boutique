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
const results=[];
for(const c of cases){captured=null;const res=await POST({json:async()=>({items:c.items,market:'US'}),nextUrl:{origin:'https://offline.example'}});results.push({case:c.name,productSlug:p.slug,catalogStock:p.stock,catalogSizes:p.sizes,catalogColors:p.colorNames,request:c.items,expectedStatus:c.expected,actualStatus:res.status,body:await res.json(),stripeFixtureCreated:!!captured,chargedQuantity:captured?.line_items?.[0]?.quantity,chargedDescription:captured?.line_items?.[0]?.price_data?.product_data?.description});}
for(const result of results){assert.equal(result.actualStatus,result.expectedStatus,result.case);assert.equal(result.stripeFixtureCreated,result.expectedStatus===200,result.case+' payment boundary');}console.log(JSON.stringify({passed:results.length,cases:results.map(r=>({name:r.case,status:r.actualStatus}))}));
