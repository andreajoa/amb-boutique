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
    "slug": "nerelle-sleeveless-swing-mini-dress-black",
    "family": {
      "source": "3256803997860484",
      "product": "cmvr79q0g002c08l93gi59ii0",
      "supplier": "cmvr79qxh003s08l9eatt3wwz",
      "quote": "extra-quote.json"
    },
    "color": "black",
    "skusBySize": {
      "S": "12000028313744204",
      "M": "12000028313744205",
      "L": "12000028313744206",
      "XL": "12000028313744207",
      "XXL": "12000028313744208"
    },
    "attributes": {
      "12000028313744204": {
        "Color": "black",
        "Size": "S"
      },
      "12000028313744205": {
        "Color": "black",
        "Size": "M"
      },
      "12000028313744206": {
        "Color": "black",
        "Size": "L"
      },
      "12000028313744207": {
        "Color": "black",
        "Size": "XL"
      },
      "12000028313744208": {
        "Color": "black",
        "Size": "XXL"
      }
    },
    "orderSkuAttrs": {
      "12000028313744204": "5:100014064;14:193",
      "12000028313744205": "5:361386;14:193",
      "12000028313744206": "5:361385;14:193",
      "12000028313744207": "5:100014065;14:193",
      "12000028313744208": "5:4182;14:193"
    }
  },
  {
    "slug": "nerelle-sleeveless-swing-mini-dress-white",
    "family": {
      "source": "3256803997860484",
      "product": "cmvr79q0g002c08l93gi59ii0",
      "supplier": "cmvr79qxh003s08l9eatt3wwz",
      "quote": "extra-quote.json"
    },
    "color": "WHITE",
    "skusBySize": {
      "S": "12000028313744174",
      "M": "12000028313744175",
      "L": "12000028313744176",
      "XL": "12000028313744177",
      "XXL": "12000028313744178"
    },
    "attributes": {
      "12000028313744174": {
        "Color": "WHITE",
        "Size": "S"
      },
      "12000028313744175": {
        "Color": "WHITE",
        "Size": "M"
      },
      "12000028313744176": {
        "Color": "WHITE",
        "Size": "L"
      },
      "12000028313744177": {
        "Color": "WHITE",
        "Size": "XL"
      },
      "12000028313744178": {
        "Color": "WHITE",
        "Size": "XXL"
      }
    },
    "orderSkuAttrs": {
      "12000028313744174": "5:100014064;14:29",
      "12000028313744175": "5:361386;14:29",
      "12000028313744176": "5:361385;14:29",
      "12000028313744177": "5:100014065;14:29",
      "12000028313744178": "5:4182;14:29"
    }
  },
  {
    "slug": "nerelle-sleeveless-swing-mini-dress-royal-blue",
    "family": {
      "source": "3256803997860484",
      "product": "cmvr79q0g002c08l93gi59ii0",
      "supplier": "cmvr79qxh003s08l9eatt3wwz",
      "quote": "extra-quote.json"
    },
    "color": "Blue",
    "skusBySize": {
      "S": "12000028313744209",
      "M": "12000028313744210",
      "L": "12000028313744211",
      "XL": "12000028313744212",
      "XXL": "12000028313744213"
    },
    "attributes": {
      "12000028313744209": {
        "Color": "Blue",
        "Size": "S"
      },
      "12000028313744210": {
        "Color": "Blue",
        "Size": "M"
      },
      "12000028313744211": {
        "Color": "Blue",
        "Size": "L"
      },
      "12000028313744212": {
        "Color": "Blue",
        "Size": "XL"
      },
      "12000028313744213": {
        "Color": "Blue",
        "Size": "XXL"
      }
    },
    "orderSkuAttrs": {
      "12000028313744209": "5:100014064;14:173",
      "12000028313744210": "5:361386;14:173",
      "12000028313744211": "5:361385;14:173",
      "12000028313744212": "5:100014065;14:173",
      "12000028313744213": "5:4182;14:173"
    }
  },
  {
    "slug": "nerelle-sleeveless-swing-mini-dress-pink",
    "family": {
      "source": "3256803997860484",
      "product": "cmvr79q0g002c08l93gi59ii0",
      "supplier": "cmvr79qxh003s08l9eatt3wwz",
      "quote": "extra-quote.json"
    },
    "color": "Pink",
    "skusBySize": {
      "S": "12000028313744179",
      "M": "12000028313744180",
      "L": "12000028313744181",
      "XL": "12000028313744182",
      "XXL": "12000028313744183"
    },
    "attributes": {
      "12000028313744179": {
        "Color": "Pink",
        "Size": "S"
      },
      "12000028313744180": {
        "Color": "Pink",
        "Size": "M"
      },
      "12000028313744181": {
        "Color": "Pink",
        "Size": "L"
      },
      "12000028313744182": {
        "Color": "Pink",
        "Size": "XL"
      },
      "12000028313744183": {
        "Color": "Pink",
        "Size": "XXL"
      }
    },
    "orderSkuAttrs": {
      "12000028313744179": "5:100014064;14:1052",
      "12000028313744180": "5:361386;14:1052",
      "12000028313744181": "5:361385;14:1052",
      "12000028313744182": "5:100014065;14:1052",
      "12000028313744183": "5:4182;14:1052"
    }
  },
  {
    "slug": "nerelle-sleeveless-swing-mini-dress-red",
    "family": {
      "source": "3256803997860484",
      "product": "cmvr79q0g002c08l93gi59ii0",
      "supplier": "cmvr79qxh003s08l9eatt3wwz",
      "quote": "extra-quote.json"
    },
    "color": "Red",
    "skusBySize": {
      "S": "12000028313744189",
      "M": "12000028313744190",
      "L": "12000028313744191",
      "XL": "12000028313744192",
      "XXL": "12000028313744193"
    },
    "attributes": {
      "12000028313744189": {
        "Color": "Red",
        "Size": "S"
      },
      "12000028313744190": {
        "Color": "Red",
        "Size": "M"
      },
      "12000028313744191": {
        "Color": "Red",
        "Size": "L"
      },
      "12000028313744192": {
        "Color": "Red",
        "Size": "XL"
      },
      "12000028313744193": {
        "Color": "Red",
        "Size": "XXL"
      }
    },
    "orderSkuAttrs": {
      "12000028313744189": "5:100014064;14:10",
      "12000028313744190": "5:361386;14:10",
      "12000028313744191": "5:361385;14:10",
      "12000028313744192": "5:100014065;14:10",
      "12000028313744193": "5:4182;14:10"
    }
  },
{
  "slug": "nerelle-sleeveless-swing-mini-dress-chestnut-brown",
  "family": {
    "source": "3256803997860484",
    "product": "cmvr79q0g002c08l93gi59ii0",
    "supplier": "cmvr79qxh003s08l9eatt3wwz",
    "quote": "nerelle-quote.json"
  },
  "color": "Champagne",
  "skusBySize": {
    "S": "12000028313744214",
    "M": "12000028313744215",
    "L": "12000028313744216",
    "XL": "12000028313744217",
    "XXL": "12000028313744218"
  },
  "attributes": {
    "12000028313744214": {
      "Color": "Champagne",
      "Size": "S"
    },
    "12000028313744215": {
      "Color": "Champagne",
      "Size": "M"
    },
    "12000028313744216": {
      "Color": "Champagne",
      "Size": "L"
    },
    "12000028313744217": {
      "Color": "Champagne",
      "Size": "XL"
    },
    "12000028313744218": {
      "Color": "Champagne",
      "Size": "XXL"
    }
  },
  "orderSkuAttrs": {
    "12000028313744214": "5:100014064;14:200001951",
    "12000028313744215": "5:361386;14:200001951",
    "12000028313744216": "5:361385;14:200001951",
    "12000028313744217": "5:100014065;14:200001951",
    "12000028313744218": "5:4182;14:200001951"
  }
},
{
  "slug": "nerelle-sleeveless-swing-mini-dress-gray",
  "family": {
    "source": "3256803997860484",
    "product": "cmvr79q0g002c08l93gi59ii0",
    "supplier": "cmvr79qxh003s08l9eatt3wwz",
    "quote": "nerelle-quote.json"
  },
  "color": "GRAY",
  "skusBySize": {
    "S": "12000028313744194",
    "M": "12000028313744195",
    "L": "12000028313744196",
    "XL": "12000028313744197",
    "XXL": "12000028313744198"
  },
  "attributes": {
    "12000028313744194": {
      "Color": "GRAY",
      "Size": "S"
    },
    "12000028313744195": {
      "Color": "GRAY",
      "Size": "M"
    },
    "12000028313744196": {
      "Color": "GRAY",
      "Size": "L"
    },
    "12000028313744197": {
      "Color": "GRAY",
      "Size": "XL"
    },
    "12000028313744198": {
      "Color": "GRAY",
      "Size": "XXL"
    }
  },
  "orderSkuAttrs": {
    "12000028313744194": "5:100014064;14:691",
    "12000028313744195": "5:361386;14:691",
    "12000028313744196": "5:361385;14:691",
    "12000028313744197": "5:100014065;14:691",
    "12000028313744198": "5:4182;14:691"
  }
},
{
  "slug": "nerelle-sleeveless-swing-mini-dress-yellow",
  "family": {
    "source": "3256803997860484",
    "product": "cmvr79q0g002c08l93gi59ii0",
    "supplier": "cmvr79qxh003s08l9eatt3wwz",
    "quote": "nerelle-quote.json"
  },
  "color": "YELLOW",
  "skusBySize": {
    "S": "12000028313744184",
    "M": "12000028313744185",
    "L": "12000028313744186",
    "XL": "12000028313744187",
    "XXL": "12000028313744188"
  },
  "attributes": {
    "12000028313744184": {
      "Color": "YELLOW",
      "Size": "S"
    },
    "12000028313744185": {
      "Color": "YELLOW",
      "Size": "M"
    },
    "12000028313744186": {
      "Color": "YELLOW",
      "Size": "L"
    },
    "12000028313744187": {
      "Color": "YELLOW",
      "Size": "XL"
    },
    "12000028313744188": {
      "Color": "YELLOW",
      "Size": "XXL"
    }
  },
  "orderSkuAttrs": {
    "12000028313744184": "5:100014064;14:366",
    "12000028313744185": "5:361386;14:366",
    "12000028313744186": "5:361385;14:366",
    "12000028313744187": "5:100014065;14:366",
    "12000028313744188": "5:4182;14:366"
  }
},
{
  "slug": "nerelle-sleeveless-swing-mini-dress-army-green",
  "family": {
    "source": "3256803997860484",
    "product": "cmvr79q0g002c08l93gi59ii0",
    "supplier": "cmvr79qxh003s08l9eatt3wwz",
    "quote": "nerelle-quote.json"
  },
  "color": "army green",
  "skusBySize": {
    "S": "12000028313744199",
    "M": "12000028313744200",
    "L": "12000028313744201",
    "XL": "12000028313744202",
    "XXL": "12000028313744203"
  },
  "attributes": {
    "12000028313744199": {
      "Color": "army green",
      "Size": "S"
    },
    "12000028313744200": {
      "Color": "army green",
      "Size": "M"
    },
    "12000028313744201": {
      "Color": "army green",
      "Size": "L"
    },
    "12000028313744202": {
      "Color": "army green",
      "Size": "XL"
    },
    "12000028313744203": {
      "Color": "army green",
      "Size": "XXL"
    }
  },
  "orderSkuAttrs": {
    "12000028313744199": "5:100014064;14:200004889",
    "12000028313744200": "5:361386;14:200004889",
    "12000028313744201": "5:361385;14:200004889",
    "12000028313744202": "5:100014065;14:200004889",
    "12000028313744203": "5:4182;14:200004889"
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
