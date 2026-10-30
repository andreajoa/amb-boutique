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
    "slug": "amara-layered-mesh-skirt-apricot",
    "family": {
      "source": "3256808764754635",
      "product": "cmt64dbzb01eg04jns5m7fxpc",
      "supplier": "cmt64dcoy01es04jnan3l1tgi",
      "quote": "batch02-candidate73-official-quote.json"
    },
    "color": "Apricot",
    "skusBySize": {
      "One Size": "12000047331685117"
    }
  },
  {
    "slug": "amara-layered-mesh-skirt-green",
    "family": {
      "source": "3256808764754635",
      "product": "cmt64dbzb01eg04jns5m7fxpc",
      "supplier": "cmt64dcoy01es04jnan3l1tgi",
      "quote": "batch02-candidate73-official-quote.json"
    },
    "color": "Green",
    "skusBySize": {
      "One Size": "12000047331685116"
    }
  },
  {
    "slug": "marisol-striped-wide-leg-jumpsuit-light-brown",
    "family": {
      "source": "3256812581688557",
      "product": "cmt64id4v01g504jnzf3dxzvi",
      "supplier": "cmt64ie1801hp04jnprbt2f0y",
      "quote": "batch02-candidate75-official-quote.json"
    },
    "color": "01 Light Brown",
    "skusBySize": {
      "XS": "12000059283807478",
      "S": "12000059283807472",
      "M": "12000059283807473",
      "L": "12000059283807474",
      "XL": "12000059283807475",
      "XXL": "12000059283807476",
      "XXXL": "12000059283807477"
    }
  },
  {
    "slug": "marisol-striped-wide-leg-jumpsuit-light-blue",
    "family": {
      "source": "3256812581688557",
      "product": "cmt64id4v01g504jnzf3dxzvi",
      "supplier": "cmt64ie1801hp04jnprbt2f0y",
      "quote": "batch02-candidate75-official-quote.json"
    },
    "color": "02 Light Blue",
    "skusBySize": {
      "XS": "12000059283807485",
      "S": "12000059283807479",
      "M": "12000059283807480",
      "L": "12000059283807481",
      "XL": "12000059283807482",
      "XXL": "12000059283807483",
      "XXXL": "12000059283807484"
    }
  },
  {
    "slug": "marisol-striped-wide-leg-jumpsuit-pink",
    "family": {
      "source": "3256812581688557",
      "product": "cmt64id4v01g504jnzf3dxzvi",
      "supplier": "cmt64ie1801hp04jnprbt2f0y",
      "quote": "batch02-candidate75-official-quote.json"
    },
    "color": "04 Pink",
    "skusBySize": {
      "XS": "12000059283807499",
      "S": "12000059283807493",
      "M": "12000059283807494",
      "L": "12000059283807495",
      "XL": "12000059283807496",
      "XXL": "12000059283807497",
      "XXXL": "12000059283807498"
    }
  },
  {
    "slug": "marisol-striped-wide-leg-jumpsuit-light-green",
    "family": {
      "source": "3256812581688557",
      "product": "cmt64id4v01g504jnzf3dxzvi",
      "supplier": "cmt64ie1801hp04jnprbt2f0y",
      "quote": "batch02-candidate75-official-quote.json"
    },
    "color": "Light Green",
    "skusBySize": {
      "XS": "12000059283807506",
      "S": "12000059283807500",
      "M": "12000059283807501",
      "L": "12000059283807502",
      "XL": "12000059283807503",
      "XXL": "12000059283807504",
      "XXXL": "12000059283807505"
    }
  },
  {
    "slug": "marisol-striped-wide-leg-jumpsuit-royal-blue",
    "family": {
      "source": "3256812581688557",
      "product": "cmt64id4v01g504jnzf3dxzvi",
      "supplier": "cmt64ie1801hp04jnprbt2f0y",
      "quote": "batch02-candidate75-official-quote.json"
    },
    "color": "ROYAL BLUE",
    "skusBySize": {
      "XS": "12000059283807513",
      "S": "12000059283807507",
      "M": "12000059283807508",
      "L": "12000059283807509",
      "XL": "12000059283807510",
      "XXL": "12000059283807511",
      "XXXL": "12000059283807512"
    }
  },
  {
    "slug": "paloma-tie-side-halter-mini-dress-dark-blue",
    "family": {
      "source": "3256806932704131",
      "product": "cmuqi4jxn00g804lenw1as20g",
      "supplier": "cmuqi4knr00gz04lecfxst21o",
      "quote": "batch02-candidate90-official-quote.json"
    },
    "color": "dark blue",
    "skusBySize": {
      "S": "12000039466024151",
      "L": "12000039466024153",
      "XL": "12000039466024154"
    }
  },
  {
    "slug": "paloma-tie-side-halter-mini-dress-pink",
    "family": {
      "source": "3256806932704131",
      "product": "cmuqi4jxn00g804lenw1as20g",
      "supplier": "cmuqi4knr00gz04lecfxst21o",
      "quote": "batch02-candidate90-official-quote.json"
    },
    "color": "pink",
    "skusBySize": {
      "S": "12000039466024156",
      "M": "12000039466024157",
      "L": "12000039466024158",
      "XL": "12000039466024159",
      "XXL": "12000039466024160"
    }
  },
  {
    "slug": "paloma-tie-side-halter-mini-dress-red",
    "family": {
      "source": "3256806932704131",
      "product": "cmuqi4jxn00g804lenw1as20g",
      "supplier": "cmuqi4knr00gz04lecfxst21o",
      "quote": "batch02-candidate90-official-quote.json"
    },
    "color": "red",
    "skusBySize": {
      "M": "12000044575831748",
      "L": "12000044575831749",
      "XL": "12000044575831750",
      "XXL": "12000044575831751"
    }
  },
  {
    "slug": "paloma-tie-side-halter-mini-dress-green",
    "family": {
      "source": "3256806932704131",
      "product": "cmuqi4jxn00g804lenw1as20g",
      "supplier": "cmuqi4knr00gz04lecfxst21o",
      "quote": "batch02-candidate90-official-quote.json"
    },
    "color": "green",
    "skusBySize": {
      "L": "12000039466024168",
      "XL": "12000039466024169",
      "XXL": "12000039466024170"
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
 if(s.family.source==='3256806932704131')for(const absent of ['S','M','L','XL','XXL'].filter(x=>!p.sizes.includes(x)))cases.push({name:'zero stock '+absent,items:[item(absent)],status:400});
 for(const c of cases){
  captured=null;const response=await POST({json:async()=>({items:c.items,market:'US',promotionCode:c.promotionCode}),nextUrl:{origin:'https://offline.example'}}),body=await response.json();
  assert.equal(response.status,c.status,s.slug+' '+c.name+JSON.stringify(body));assert.equal(Boolean(captured),response.status===200);if(c.error)assert.ok(body.error.includes(c.error),JSON.stringify(body));
  if(captured)for(const line of captured.line_items){assert.ok(line.price_data.unit_amount>=Math.round(p.unitCostUsd*100)*3,s.slug+' checkout below3x');assert.ok(line.price_data.unit_amount<=Math.round(p.price*100));}
  passed++;
 }
}
console.log(JSON.stringify({passed,products:spec.length,offeredNativeSelections:spec.reduce((n,s)=>n+Object.keys(s.skusBySize).length,0),networkRequests:0,realPayments:0}));
