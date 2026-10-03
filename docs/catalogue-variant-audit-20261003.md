# Catalogue colour and heel-height audit — 3 October 2026

The storefront previously had 407 catalogue rows but 403 unique product URLs. All 403 URLs were public and in the sitemap. No current colour pages were held back by the catalogue approval filter. Four supplemental rows repeated established URLs; the established product remains the sole catalogue entry for each of those URLs.

## Supplier colours in the ten supplied exports

The ten supplier products have 31 active colour/print groups. Only ten colour pages existed. This change adds the other 21, with four reviewed gallery images each and the stock and available sizes belonging to that specific source colour.

| Family | Supplier colour/print groups | Existing pages | Added pages |
| --- | ---: | ---: | ---: |
| Elara | 6 | 1 | 5 |
| Rosalie | 2 | 1 | 1 |
| Mirelle | 2 | 1 | 1 |
| Celeste | 15 | 1 | 14 |
| Colette, Seraphine, Amelie, Noelle, Violette, Aurelia | 6 | 6 | 0 |
| Total | 31 | 10 | 21 |

Supplier SKU labels are retained as `sourceColor` for fulfilment. Customer-facing names follow the visible garment: Elara's supplier label `Navy Blue` is a leopard print, and Celeste `as7` is mint with gold hearts. Celeste `as4` has one available unit in M; unavailable sizes are not advertised.

## Shoes

Fourteen colour pages previously grouped multiple heel heights. Following the README requirement, they now become 34 distinct colour + heel-height pages, adding 20 URLs. Each height has three new reviewed images, its own stock, and its own size list. The lowest height keeps the existing URL. Legacy `?heel=` links retain the selected height and size through a redirect. Checkout and cart snapshots resolve saved selections on the old combined URLs to the corresponding separated product.

## Result and verification

- 444 unique catalogue products; one colour per page and no grouped shoe heights.
- 41 added URLs: 21 garment colours/prints and 20 shoe heights.
- 55 galleries added or replaced, containing 186 reviewed images: 84 garment views and 102 shoe views.
- Supplier lineage added to the ten existing colour pages; existing garment pricing is preserved.
- `node scripts/verify-catalogue-variants.mjs` checks unique URLs, all 31 source colours, single-colour pages, gallery files, a scarce size, and legacy heel inventory resolution.
- Production build and browser checks cover the product galleries and image viewer. Release checks compare the installed/served image bytes with the reviewed files, confirm source-colour stock and sizes, and exercise all 34 legacy heel links.

Gallery views were generated from the available garment/shoe references. Unseen angles are compatible AI reconstructions. Garment files are exported at 1600 × 1600 and shoe files at 1000 × 1000; those export sizes do not indicate native generation resolution.

## Pending supplier draft

The recent supplier product `3256806932704131` has four colours (dark blue, pink, red, green), but its landed cost/freight is still incomplete in Store Manager. A refresh through the normal supplier UI returned “Não foi possível sincronizar os fornecedores.” Those four draft colours remain unpublished; no selling price or landed cost was invented. The ten supplied exports have complete colour coverage in this change. The user's exact grouping of “13 products” has not been confirmed.
