# AMB BOUTIQUE Product Catalogue Standard

This standard is mandatory for every future product import.

## Brand identity

- The public and internal vendor name is `AMB BOUTIQUE`.
- Product records, copy, media and metadata must not expose the original marketplace, manufacturer, seller, external SKU, source title or sourcing region.
- Customer-facing English follows the natural vocabulary and spelling used by fashion stores in the United States, Canada, United Kingdom, Australia and New Zealand.

## Product publication model

- Every sellable color is published as a separate product with its own slug, title, gallery, color value and inventory.
- Sizes remain variants inside that color-product; do not split sizes into separate products.
- Color-products from the same source style keep the same approved retail price unless AMB explicitly changes the pricing strategy.
- Inventory includes only combinations with positive verified stock.

## Naming

- Every color-product receives a unique, short, elegant editorial name.
- Names must read like a coherent boutique collection and never reuse source listing titles.
- Slugs are derived from the final AMB product name and must remain unique.

## Photography

- Every product has exactly four coordinated images: front, back, left profile and right profile.
- Images use the warm ivory-beige AMB editorial studio palette, consistent lighting and consistent garment color.
- Products are centered with crop-safe margins and rendered without logos, watermarks or text.
- Storefront images use optimized WebP assets and preserve natural proportions.

## Copy and discovery

- Product copy is original AMB copy in polished American English, with clear fit, styling, materials and care information.
- Each product includes an AMB vendor field, category, price, sizes, color, stock, weight estimate, image gallery and SEO-ready description.
- Product pages remain included in sitemap, structured product data and `llms.txt` discovery output.

## Profit protection

- Verified unit cost may be retained privately for margin controls.
- Automatic promotions, order bumps and post-purchase offers stay disabled for a product until its full landed cost is known.
- Discounts never stack and never exceed the configured margin floor.

## Import release checklist

1. One product per color and sizes kept as variants.
2. Unique AMB name and slug.
3. AMB-only identity and clean metadata.
4. Four valid editorial images in the required angle order.
5. Positive inventory and verified price/cost fields.
6. No duplicate names, slugs or image paths.
7. TypeScript and production build pass.
8. Collection, product page, cart, sitemap and AI discovery output are verified.
