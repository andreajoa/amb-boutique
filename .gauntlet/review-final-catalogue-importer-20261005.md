# Local final catalogue importer review

Reviewed 2026-10-05 by `mesh_gallery_builder`. The originally supplied temporary importer was inspected independently. It appended draft objects to `allGeneratedProducts` without changing the approval set, but lacked executable before/after preservation guards and exact image-bound approval gates. After notification and explicit authorization from the integrating agent, only `/private/tmp/amb-oct05-continuation/prepare-final-catalogue.mjs` was reinforced. No real application catalogue, import, image or release file was mutated by this reviewer.

**Guarded preparation and fixture checks: PASS.** These guard changes were implemented by this reviewer with root authorization; the integrating agent must independently judge the final script. The root subsequently reported its real 60-image dry run passed the data, image and preservation guards. Real gallery approvals and root authorization remain required before running the mutation modes. This is not production approval.

## Verified preservation

`node --check /private/tmp/amb-oct05-continuation/prepare-final-catalogue.mjs` passed.

`--verify-preservation-only` passed against the actual current `app/data.ts` exports, substituting the proposed `generated-products.ts` content only in memory:

- All 444 baseline full-record hashes matched `imports/products-pre-oct04-baseline-hashes.json` before and after.
- All 23 existing approved products retained their full-record hashes and aggregate economic hash `34d29878c08943b55c1ddaf65021591bc96329e7f4b9dcd2ca6de47d0c218a06`.
- Visible products remained 467. The underlying `allGeneratedProducts` array grew from 368 to 383 in memory; existing records and source bytes outside the insertion remained intact.
- The 100 pending standard source SKU IDs were unique, valid in the saved audit and disjoint from the 126 existing published source SKU IDs. Current supplier inventory was not refreshed or claimed.
- Exact source product/color, reviewed numeric fields, Calienne Red stock 350, seven requested Calienne swatches plus existing Taupe, and the nine canonical fulfillment values were checked.
- Application writes: 0. External actions: 0. Image approval claimed: false.

## Modes and gates

Default invocation requires all 60 selected manifest entries, validates exact slug/source identity/view/version, actual 1600×1600 WebP dimensions and byte hash, simulates the real catalogue, then writes only the candidate plan in `output/imagegen/amb-oct05-final/`. It cannot bypass the approval set.

`--apply-candidates` copies the selected assets and appends the 15 local candidates to `allGeneratedProducts`; `approvedNewProductSlugs` and the existing 23 `approvedSlugs` stay unchanged. Post-write evaluation still requires 467 visible products and all previous full-record hashes. Different existing asset bytes are never overwritten. Source/release/draft/audit/manifest changes during preparation abort the operation.

`--activate-reviewed` is a separate step. It requires the 15 identical candidates already prepared, every public asset present with its selected hash, and `.gauntlet/final-gallery-approval-20261005.json` containing `reviewer: "gallery_review"`, `reviewedAt`, and exactly 60 unique `{slug,view,sha256,decision}` entries. Every selected image must have decision `PASS` and an exact hash match. It then extends only the local approval set and release approval list by 15, verifies 482 visible unique products, and rechecks all previous products. The release explicitly retains `publishedProducts: 23` and those 23 `publishedSlugs`; it makes no deployment claim.

Asset version grammar accepts `YYYYMMDD`, `YYYYMMDD-vN`, and `YYYYMMDD-final`; the latter was corrected after integrating-agent review of the actual generation manifest. Activation also adds the new source product IDs to the release and replaces the previous source-front/rear summary with wording that records permitted approximations, preserving the previous published review separately.

## Private fixture execution

Seven steps passed their expected outcomes in `/private/tmp/amb-oct05-continuation/importer-review-fixture`. It copied catalogue source into the private fixture and used a repeated sample WebP solely to exercise structure and hash gates; these are synthetic approvals, never visual evidence for the real galleries.

1. In-memory preservation simulation passed.
2. Default candidate-plan preparation passed with 60 synthetic entries.
3. Activation before candidate application was rejected.
4. Hidden-candidate application passed: visible count remained 467.
5. Activation with a mismatched approval hash was rejected without changing prepared source.
6. Activation with a `MAJOR` approval was rejected without changing prepared source.
7. Activation with 60 matching synthetic PASS entries passed: 482 local products, 38 local approvals, 23 reported published products.

Detailed execution receipt: `/private/tmp/amb-oct05-continuation/importer-review-fixture-results.json`. Real application assets/imports/catalogue were not changed by these fixture runs.

## Remaining limits

The gallery critic must establish visual fidelity and permitted approximation; the importer verifies its hash-bound decision, not appearance. The legacy slug `elowyn-ruched-mesh-maxi-dress-leopard` and current customer label “Mocha Print” remain unchanged until root decides otherwise. Saved evidence establishes captured stock, not current live inventory.

The script restores source/release bytes if post-write preservation checks fail; newly copied unused assets may remain after such a failure. It is a single local runner, not a cross-process transaction: root must serialize mutation modes with other catalogue writers. A process crash between writes requires checking source/release state before retry. Running activation again after the release already contains 38 approvals intentionally fails the initial 23-approval precondition rather than silently reapplying.

After authorized local activation, root should run the existing catalogue verifier, full build/type checks, review rendered product/cart/checkout notices, and verify the 482 local catalogue. External publication and Manager mutation are separate tasks; this script performs neither.
