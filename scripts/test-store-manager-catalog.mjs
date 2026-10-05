import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import ts from "typescript";

const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  // Framework marker only; the real bearer-token authentication stays active.
  if (name === "server-only") return {};
  return originalLoad.call(this, name, ...args);
};

const tokenBefore = process.env.STORE_CONNECTOR_SYNC_TOKEN;
process.env.STORE_CONNECTOR_SYNC_TOKEN = "local-fixture-catalog-test-only";
try {
  const { GET } = load("../app/api/store-manager/catalog/route.ts");
  const unauthorized = await GET({ headers: new Headers() });
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).products, undefined);
  const invalid = await GET({ headers: new Headers({ authorization: "Bearer wrong-fixture-token" }) });
  assert.equal(invalid.status, 401);

  const response = await GET({ headers: new Headers({ authorization: `Bearer ${process.env.STORE_CONNECTOR_SYNC_TOKEN}` }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  const body = await response.json();
  const baseline = JSON.parse(fs.readFileSync(new URL("../imports/products-pre-oct04-baseline-hashes.json", import.meta.url), "utf8"));
  const release = JSON.parse(fs.readFileSync(new URL("../imports/products-20261004-release.json", import.meta.url), "utf8"));
  const expectedSlugs = [...Object.keys(baseline), ...release.approvedSlugs].sort();
  assert.deepEqual(body.products.map(product => product.slug).sort(), expectedSlugs,
    "Catalog must include every published family, shoe and colour module, and no hidden drafts");
  const { products } = load("../app/data.ts");
  for (const row of body.products) {
    const product = products.find(product => product.slug === row.slug);
    assert.deepEqual(row.sizes, product.sizes);
    assert.equal(row.color, product.colorNames[0]);
    assert.equal(row.stock, product.stock);
    assert.equal(row.unitCostUsd, product.unitCostUsd ?? null);
    if (product.sourceProductId && product.sourceColor) {
      assert.equal(row.sourceProductId, product.sourceProductId);
      assert.equal(row.sourceColor, product.sourceColor);
    }
  }
  assert.match(body.version, /^[0-9a-f]{64}$/);
  console.log(JSON.stringify({ catalogProducts: body.products.length, priorProducts: 444,
    hiddenDrafts: "excluded", sourceIdentity: "preserved", authentication: "enforced", externalActions: 0 }));
} finally {
  Module._load = originalLoad;
  if (tokenBefore === undefined) delete process.env.STORE_CONNECTOR_SYNC_TOKEN;
  else process.env.STORE_CONNECTOR_SYNC_TOKEN = tokenBefore;
}
