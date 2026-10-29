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
const slug='arlena-cutout-halter-maxi-dress-red',product=products.find(p=>p.slug===slug);assert.ok(product);assert.deepEqual(product.sizes,['XS','S','M','L']);assert.deepEqual(product.colorNames,['Red']);assert.equal(product.stock,226);assert.equal(product.price,169.9);assert.equal(product.minimumCostMultiplier,3);
const item=(size,quantity=1,color='Red')=>({slug,size,quantity,color,price:0.01});
const cases=[...['XS','S','M','L'].map(size=>({name:size+' canonical stock and price',items:[item(size)],status:200})),{name:'S aggregate cap55',items:[10,10,10,10,10,6].map(n=>item('S',n)),status:400,stockError:'Only 55 of'},{name:'XS aggregate cap54',items:[10,10,10,10,10,5].map(n=>item('XS',n)),status:400,stockError:'Only 54 of'},{name:'Unknown XXL rejected',items:[item('XXL')],status:400},{name:'Native XS label not replaced',items:[item('XS（old）')],status:400},{name:'Wrong Black color rejected',items:[item('S',1,'Black')],status:400},{name:'Welcome discount preserves3x',items:[item('S')],promotionCode:'AMBWELCOME10',status:200},{name:'Cart discount preserves3x',items:[item('S',2)],status:200}];
for(const c of cases){captured=null;const res=await POST({json:async()=>({items:c.items,market:'US',promotionCode:c.promotionCode}),nextUrl:{origin:'https://offline.example'}});const body=await res.json();assert.equal(res.status,c.status,c.name+': '+JSON.stringify(body));assert.equal(Boolean(captured),c.status===200,c.name+' payment boundary');if(c.stockError)assert.ok(body.error.includes(c.stockError),c.name+' actual size stock guard');if(captured){const cents=captured.line_items[0].price_data.unit_amount;assert.ok(cents>=16923&&cents<=16990,c.name+'3x after discount');}}
console.log(JSON.stringify({passed:cases.length,scope:slug,networkRequests:0,realPayments:0}));
