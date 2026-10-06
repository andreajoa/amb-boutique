# Independent final catalogue data review — 2026-10-05

Status: PASS for local data, preservation and generated-image provenance. Final visible catalogue: 482 unique products. No production-readiness or deployment claim. This review does not judge the reviewer’s own shipping implementation; that has a separate independent critic.

## Executed evidence

`node /private/tmp/amb-oct05-continuation/critic-catalogue-data.mjs` passed against the actual activated source at 2026-10-06T02:28:47.299Z. The critic script was authored independently and loads application exports in memory. Global fetch is forbidden. It writes only this review JSON; no application, import, backend or external state is changed.

- All 444 baseline full-record stable hashes match `imports/products-pre-oct04-baseline-hashes.json`.
- All 467 previously visible full objects, including the 23 previous approved October products, equal the fixed pre-change catalogue from commit `3835c8ce5979941c69c25742a232a3c2d66695a7`. Prices, stock, sizes, source identity, copy and prior image lists remain exact.
- All 15 candidate objects equal current drafts except the four selected image paths and nine authorized fulfillment fields.
- All 100 standard source SKU IDs are unique and disjoint from the 126 previously published batch SKUs. Each was checked against the after-repricing canonical editor, the newest successful saved supplier response and native rawPayload cost/official attribute binding. Standard size sets and aggregate stock sums match exactly. Custom sizes and Customized Color never enter these 100 SKUs or the product size sets.
- Final prices end in .90, are at least 3× captured landed cost and less than one dollar above 3×. Canonical final sale prices are preserved; no repricing performed.
- All 100 Manager planned variant rows equal the saved SKU audit and exact slug/product/color; all 15 planned bridge mappings match the product source identity. The plan remains LOCAL_PLAN_ONLY_NOT_APPLIED; actual Manager synchronization is not verified here.
- All 60 selected generated image files and public copies match manifest SHA-256, exact slug/source product/raw color and front/back/left/right order. Sharp read actual WebP metadata: all 1600×1600. Each has an existing generation provenance file. Supplier originals are only references; these product image lists contain local generated AMB assets.
- Actual activation has exactly 60 matching SHA-bound PASS entries from reviewer `gallery_review`; release has 38 approved local slugs, 23 published slugs and baseProducts 444. Every earlier approved slug remains present. Nine canonical fulfillment configurations match the authorized review JSON.

Existing `node scripts/test-store-manager-catalog.mjs` passed while the candidates were still hidden and 467 products visible: hidden drafts excluded, baseline444 preserved, authentication/source identity enforced. The custom independent critic then passed after actual activation to 482. `node scripts/verify-catalogue-variants.mjs` also passed on 482 unique products: no merged colors/heel heights, raw supplier colors, legacy heel selection, stock/sizes and local images verified.

## Product values checked

All stock values below are captured inventory, not current supplier availability.

| Slug | Raw source color | Standard SKUs | Captured stock | Cost USD | Price USD |
|---|---|---:|---:|---:|---:|
| elowyn-ruched-mesh-maxi-dress-rose-floral | Rose Red | 5 | 3328 | 36.28 | 108.90 |
| elowyn-ruched-mesh-maxi-dress-leopard | Dark Brown | 5 | 3330 | 36.28 | 108.90 |
| elowyn-ruched-mesh-maxi-dress-black-mesh | black | 5 | 3329 | 36.28 | 108.90 |
| elowyn-ruched-mesh-maxi-dress-fuchsia | Fuchsia | 5 | 3330 | 36.28 | 108.90 |
| elowyn-ruched-mesh-maxi-dress-burgundy | Burgundy | 5 | 3327 | 36.28 | 108.90 |
| elowyn-ruched-mesh-maxi-dress-brown-print | brown-1 | 5 | 3327 | 36.28 | 108.90 |
| calienne-rhinestone-suit-taupe | as the picture | 7 | 337 | 149.24 | 447.90 |
| calienne-rhinestone-suit-blue | Blue | 7 | 350 | 149.24 | 447.90 |
| calienne-rhinestone-suit-red | Red | 7 | 350 | 149.24 | 447.90 |
| calienne-rhinestone-suit-grey | GRAY | 7 | 350 | 149.24 | 447.90 |
| calienne-rhinestone-suit-forest | green | 7 | 350 | 149.24 | 447.90 |
| calienne-rhinestone-suit-khaki | Khaki | 7 | 350 | 149.24 | 447.90 |
| calienne-rhinestone-suit-orange | Orange | 7 | 350 | 149.24 | 447.90 |
| calienne-rhinestone-suit-blush | Pink | 7 | 350 | 149.24 | 447.90 |
| elaris-ruffle-gown-butter-yellow | model color | 14 | 279 | 109.98 | 330.90 |

Source product IDs: Elowyn `3256809742511895`; Calienne `3256811405926531`; Elaris `3256812807042028`. All raw sizes, including Elaris `18 W`, remain unchanged. Calienne Red has seven standard SKUs ×50 units =350; no later zero-stock receipt was found in this saved evidence.

## Evidence freshness

The newest successful saved checks are:
- 3256809742511895: supplier checked 2026-10-05T00:21:54.443Z; refresh completed 2026-10-05T00:22:10.867Z.
- 3256811405926531: supplier checked 2026-10-05T00:22:36.493Z; refresh completed 2026-10-05T00:22:54.617Z.
- 3256812807042028: supplier checked 2026-10-05T00:08:39.515Z; refresh completed 2026-10-05T00:08:48.852Z.

Native rawPayload recovered on October5 contains older cost/source snapshots, not a new supplier refresh. The critic compared immutable SKU identity and corroborated captured final cost, but does not claim fresh stock. Full rawPayload SHA-256 and per-product selected image hashes are in the JSON receipt.

## Remaining gates

No BLOCKER or MAJOR was found in the reviewed local data/provenance scope. Final build and local desktop/mobile runtime review remain pending. Publication, live HTML/Pinterest verification and actual Manager binding application/readback remain separate; no claim that all 38 products are live is made. No payment/session/order/email/production request was executed.
