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
const slug='lumielle-sequin-slip-mini-dress-silver';
const product=products.find(p=>p.slug===slug);assert.ok(product);assert.deepEqual(product.sizes,['S','M']);assert.deepEqual(product.colorNames,['Silver']);assert.equal(product.stock,7);assert.equal(product.price,42.9);
const item=(size,quantity=1,color='Silver')=>({slug,size,quantity,color,price:0.01});
const cases=[{name:'S charges canonical price',items:[item('S')],status:200},{name:'M accepts its four units',items:[item('M',4)],status:200},{name:'S cap is three',items:[item('S',4)],status:400},{name:'M cap is four',items:[item('M',5)],status:400},{name:'Out-of-stock L excluded',items:[item('L')],status:400},{name:'Duplicate S lines share three units',items:[item('S',2),item('S',2)],status:400},{name:'Wrong display color excluded',items:[item('S',1,'White')],status:400},{name:'Welcome discount preserves 3x',items:[item('S')],promotionCode:'AMBWELCOME10',status:200}];
for(const c of cases){captured=null;const res=await POST({json:async()=>({items:c.items,market:'US',promotionCode:c.promotionCode}),nextUrl:{origin:'https://offline.example'}});const body=await res.json();assert.equal(res.status,c.status,c.name+': '+JSON.stringify(body));assert.equal(Boolean(captured),c.status===200,c.name+' payment boundary');if(captured){const cents=captured.line_items[0].price_data.unit_amount;assert.ok(cents>=4284&&cents<=4290,c.name+' canonical price and3x floor');}}
console.log(JSON.stringify({passed:cases.length,scope:slug,networkRequests:0,realPayments:0}));
