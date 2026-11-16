# Nerelle remaining colours — November 15, 2026

Adds Chestnut Brown ($25.90), Gray ($26.90), Yellow ($24.90) and Army Green ($25.90) to the five existing Nerelle colours. Each offers the supplier's native S, M, L, XL and XXL selections, with 20 distinct exact SKU mappings.

The supplier names the brown SKU `Champagne`; its actual source photograph is brown. The storefront uses Chestnut Brown while retaining the original `Champagne` identity for fulfillment.

The read-only official US/USD quote is preserved in `imports/nerelle-20261115-cost-quote.json`. Product plus confirmed freight is recorded for every offered size in `catalog-20261026-new-products-bindings.json`; retail and discounted checkout preserve at least 3× the highest offered landed cost. Stock is capped at the minimum of the fresh quote, canonical inventory and mapped supplier inventory. This reduces brown L to 1, brown XL to 4 and army green M to 1 without changing supplier data.

Each gallery has four distinct sRGB WebP files: front, back, left and right. Left faces the left edge and right faces the right edge. The 1600×2400 export follows the five Nerelle galleries already published in #95. Colour and front construction were compared with the supplier's colour-specific images. The generated plain rear and profiles are conservative illustrations, not additional supplier photographs or independent proof of rear construction.

The catalog endpoint test now includes the approved product registry as well as the older release manifest; its previous expected list omitted already-published additions. Bearer authentication, complete catalog coverage and all size, stock and source identity comparisons remain tested.

Local operational receipts, gallery hashes, quote, inventory snapshot and guarded binding tool are retained in `output/catalog-resume-20261115/`. Production verification and supplier activation are separate steps recorded there after deployment.
