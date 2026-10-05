import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const load = createRequire(import.meta.url);
const repo = fileURLToPath(new URL('..', import.meta.url));

load.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { products } = load('../app/data.ts');
const { resolveShoeProductSlug } = load('../app/shoe-products.ts');
assert.equal(new Set(products.map(p => p.slug)).size, products.length, 'Duplicate product URLs');
const release = JSON.parse(fs.readFileSync(`${repo}/imports/products-20261004-release.json`, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(`${repo}/imports/products-pre-oct04-baseline-hashes.json`, 'utf8'));
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
assert.equal(Object.keys(baseline).length, 444, 'Established catalogue baseline changed');
assert.equal(release.baseProducts, 444);
assert.equal(products.length, 444 + release.approvedSlugs.length, 'Unexpected catalogue count');
for (const [slug, digest] of Object.entries(baseline)) {
  const product = products.find(product => product.slug === slug);
  assert.ok(product, `Removed established product: ${slug}`);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(stable(product))).digest('hex'), digest,
    `Changed established product: ${slug}`);
}
for (const product of products.filter(product => !Object.hasOwn(baseline, product.slug))) {
  assert.ok(release.approvedSlugs.includes(product.slug), `Unreviewed new product: ${product.slug}`);
  assert.equal(product.images.length, 4, `Incomplete new gallery: ${product.slug}`);
  assert.ok(product.stock > 0 && !product.sizes.includes('Custom size'), `Invalid new stock/size: ${product.slug}`);
}
for (const p of products) {
  assert.equal(p.colors.length, 1, `Combined colours: ${p.slug}`);
  assert.ok(!p.shoeVariants?.length, `Combined heel heights: ${p.slug}`);
  for (const image of p.images || []) {
    if (image.startsWith('/')) assert.ok(fs.existsSync(`${repo}/public${image.split('?')[0]}`), `Missing image: ${image}`);
  }
}

const expectedColours = {
  '3256808172061368': ['Beige', 'Red', 'as  picture', 'Navy Blue', 'MULTI', 'black'],
  '3256806831941342': ['Red', 'black'],
  '3256808746217270': ['BLACK', 'WHITE'],
  '3256808350251270': Array.from({ length: 15 }, (_, i) => `as${i + 1}`),
  '3256808748036289': ['as  picture'],
  '3256806795175477': ['WHITE'],
  '3256809998682147': ['WHITE'],
  '1005010734251631': ['black'],
  '3256809057494964': ['black'],
  '3256812237893090': ['MULTI'],
};
for (const [id, colours] of Object.entries(expectedColours)) {
  const family = products.filter(p => p.sourceProductId === id);
  assert.equal(family.length, colours.length, `Missing or repeated supplier colour for ${id}`);
  assert.deepEqual(family.map(p => p.sourceColor).sort(), colours.sort());
  for (const p of family) assert.equal(p.images.length, 4, `Incomplete colour gallery: ${p.slug}`);
}

// A saved selection on an old combined URL must resolve to its own inventory.
const low = products.find(p => p.slug === resolveShoeProductSlug('aurelia-patent-slingback', 6));
const high = products.find(p => p.slug === resolveShoeProductSlug('aurelia-patent-slingback', 12));
assert.equal(low.heelHeightCm, 6);
assert.equal(low.stock, 1070);
assert.ok(!low.sizes.includes('46'));
assert.equal(high.slug, 'aurelia-patent-slingback-12cm');
assert.equal(high.heelHeightCm, 12);
assert.equal(high.stock, 1370);
assert.ok(high.sizes.includes('46'));
assert.equal(resolveShoeProductSlug('aurelia-patent-slingback', 9), undefined);
assert.equal(resolveShoeProductSlug('aurelia-patent-slingback', NaN), undefined);
assert.equal(resolveShoeProductSlug('aurelia-patent-slingback'), 'aurelia-patent-slingback');
assert.equal(resolveShoeProductSlug('soleil-bow-pump', 10.5), 'soleil-bow-pump-10-5cm');
assert.equal(resolveShoeProductSlug('soleil-bow-pump-10-5cm', 7.5), 'soleil-bow-pump');
assert.equal(resolveShoeProductSlug('elara-halter-mini-dress-black'), 'elara-halter-mini-dress-black');
const red = products.find(p => p.slug === 'celeste-floral-midi-dress-red');
assert.equal(red.stock, 1);
assert.deepEqual(red.sizes, ['M']);
console.log(JSON.stringify({ products: products.length, uniqueSlugs: products.length, combinedColours: 0, combinedHeelHeights: 0, supplierColours: 31, legacyHeelSelections: 'passed', stockAndSizes: 'passed', localImages: 'passed' }));
export { products, resolveShoeProductSlug };
