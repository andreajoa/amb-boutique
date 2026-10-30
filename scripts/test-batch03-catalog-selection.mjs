import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)).replace(/\/$/,''),load=createRequire(root+'/package.json'),ts=load('typescript');
for(const ext of ['.ts','.tsx'])load.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replace(/^import "server-only";$/m,''),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:f}).outputText,f);
function stub(p,exports){const f=load.resolve(root+p);load.cache[f]={id:f,filename:f,loaded:true,exports};}
let captured;
stub('/app/stripe-server.ts',{getStripe:()=>({checkout:{sessions:{create:async p=>{captured=p;return{id:'cs_fixture_only',client_secret:'fixture'}}}}})});
stub('/app/email/commerce-lifecycle.ts',{recordCheckoutJourney:async()=>{}});
globalThis.fetch=async()=>{throw Error('External requests forbidden')};
const {products}=load(root+'/app/data.ts'),{POST}=load(root+'/app/api/checkout/route.ts'),{stockForSize}=load(root+'/app/product-inventory.ts');
const spec=[
  {
    "slug": "liora-twist-back-knit-tank-black",
    "family": {
      "source": "3256811871148479",
      "product": "cmsm3auh2000004lb65vf3nsc",
      "supplier": "ambsp-9ce98d7d1e1ec975eff601843997f935",
      "quote": "batch03-candidateliora-official-quote.json"
    },
    "color": "black",
    "skusBySize": {
      "S": "12000057414074548",
      "M": "12000057414074549",
      "L": "12000057414074550"
    }
  },
  {
    "slug": "liora-twist-back-knit-tank-ivory",
    "family": {
      "source": "3256811871148479",
      "product": "cmsm3auh2000004lb65vf3nsc",
      "supplier": "ambsp-9ce98d7d1e1ec975eff601843997f935",
      "quote": "batch03-candidateliora-official-quote.json"
    },
    "color": "Ivory",
    "skusBySize": {
      "S": "12000057414074551",
      "M": "12000057414074552",
      "L": "12000057414074553"
    }
  },
  {
    "slug": "liora-twist-back-knit-tank-khaki",
    "family": {
      "source": "3256811871148479",
      "product": "cmsm3auh2000004lb65vf3nsc",
      "supplier": "ambsp-9ce98d7d1e1ec975eff601843997f935",
      "quote": "batch03-candidateliora-official-quote.json"
    },
    "color": "Khaki",
    "skusBySize": {
      "S": "12000057414074554",
      "M": "12000057414074555",
      "L": "12000057414074556"
    }
  },
  {
    "slug": "isadora-gathered-v-neck-midi-dress-white",
    "family": {
      "source": "3256810384374361",
      "product": "cmsm3ui1a001q04l10nb26r65",
      "supplier": "ambsp-179ed3cc2490a899f679e969a9b4caad",
      "quote": "batch03-candidateisadora-official-quote.json"
    },
    "color": "White",
    "skusBySize": {
      "3XL": "12000052854046782",
      "4XL": "12000052854046783"
    }
  },
  {
    "slug": "isadora-gathered-v-neck-midi-dress-terracotta",
    "family": {
      "source": "3256810384374361",
      "product": "cmsm3ui1a001q04l10nb26r65",
      "supplier": "ambsp-179ed3cc2490a899f679e969a9b4caad",
      "quote": "batch03-candidateisadora-official-quote.json"
    },
    "color": "Lightbrown",
    "skusBySize": {
      "4XL": "12000052854046787",
      "5XL": "12000052854046788"
    }
  }
];
const plan=JSON.parse(fs.readFileSync(root+'/imports/catalog-20261026-new-products-bindings.json'));
let passed=0;
for(const s of spec){
 const p=products.find(p=>p.slug===s.slug),b=plan.products.find(p=>p.slug===s.slug);assert.ok(p&&b,s.slug);assert.equal(p.sourceColor,s.color);assert.equal(p.sourceProductId,s.family.source);assert.equal(p.minimumCostMultiplier,3);
 assert.deepEqual([...p.sizes].sort(),Object.keys(s.skusBySize).sort());assert.equal(p.price,b.retailPriceUsd);assert.ok(p.price>=3*Math.max(...Object.values(b.landedCostUsdBySize))-.000001);
 const item=(size,quantity=1,color=p.colorNames[0])=>({slug:p.slug,size,quantity,color,price:.01});
 const cases=p.sizes.map(size=>({name:'native '+size,items:[item(size)],status:200}));
 const size=p.sizes[0],cap=b.stockBySize[size];assert.equal(stockForSize(p,size),cap);
 const overcap=[];let quantity=cap+1;while(quantity>0){const part=Math.min(quantity,10);overcap.push(item(size,part));quantity-=part;}
 if(cap<200)cases.push({name:'stock cap',items:overcap,status:400,error:'Only '+cap+' of'});
 cases.push({name:'invented size',items:[item('INVALID')],status:400},{name:'wrong color',items:[item(size,1,'WRONG')],status:400},{name:'welcome markupfloor',items:[item(size)],promotionCode:'AMBWELCOME10',status:200});
 if(p.sizes.includes('XXXL'))cases.push({name:'no invented3XLalias',items:[item('3XL')],status:400});
 // Paloma has current zero-stock sizes that must remain unavailable.
 if(s.family.source==='3256810384374361')for(const absent of ['3XL','4XL','5XL'].filter(x=>!p.sizes.includes(x)))cases.push({name:'zero stock '+absent,items:[item(absent)],status:400});
 for(const c of cases){
  captured=null;const response=await POST({json:async()=>({items:c.items,market:'US',promotionCode:c.promotionCode}),nextUrl:{origin:'https://offline.example'}}),body=await response.json();
  assert.equal(response.status,c.status,s.slug+' '+c.name+JSON.stringify(body));assert.equal(Boolean(captured),response.status===200);if(c.error)assert.ok(body.error.includes(c.error),JSON.stringify(body));
  if(captured)for(const line of captured.line_items){assert.ok(line.price_data.unit_amount>=Math.round(p.unitCostUsd*100)*3,s.slug+' checkout below3x');assert.ok(line.price_data.unit_amount<=Math.round(p.price*100));}
  passed++;
 }
}
console.log(JSON.stringify({passed,products:spec.length,offeredNativeSelections:spec.reduce((n,s)=>n+Object.keys(s.skusBySize).length,0),networkRequests:0,realPayments:0}));
