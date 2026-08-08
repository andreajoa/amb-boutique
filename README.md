# AMB BOUTIQUE

International women’s fashion storefront based in San Diego, California and founded by Ana Paula Maciel.

## Markets

- United States — USD
- Canada — CAD
- United Kingdom — GBP
- Australia — AUD
- New Zealand — NZD

## Storefront included

- Editorial responsive homepage based on the supplied references
- Shop-all collection with filters and sorting
- Search-friendly category collection pages
- Reusable product detail page with gallery, variants, fit, quantity and recommendations
- Persistent global shopping bag and full cart page
- Stripe Checkout and verified webhook endpoints, ready for credentials
- Contact and newsletter endpoints, ready for Resend credentials
- About, contact, FAQ, shipping, returns, privacy, terms, cookies, accessibility, size guide, order tracking, account, sale and journal pages
- Google/Bing SEO metadata, canonical URLs, sitemap, robots, Open Graph and JSON-LD
- AI/GEO discovery through crawlable semantic content, structured data and `/llms.txt`
- Cookie preference interface with optional technologies disabled by default

## Development

```bash
npm install
npm run dev
```

Run quality checks with:

```bash
npm run lint
npm run build
```

## Product CSV import

1. Copy the real CSV to `imports/products.csv` (use `imports/product-template.csv` for the accepted columns).
2. Keep multiple values separated with `|`. Use `Color name:#hex` for colours and up to four `image_urls` for the gallery.
3. Run:

```bash
npm run import:products
```

The importer validates required data and creates `app/generated-products.ts`. When the generated catalog contains products, it automatically replaces the visual placeholder catalog.

Supported catalog categories: Dresses, Tops/Blouses, Rompers/Playsuits, Skirts, Shorts, Knitwear, Bags, Shoes and Accessories.

## Launch configuration

Copy `.env.example` to `.env.local` and connect Stripe and Resend before launch. Stripe Checkout validates every line against the server catalog and accepts shipping addresses in the US, Canada, UK, Australia and New Zealand. Never commit real secrets.

Policy pages are operational drafts and should be reviewed by the owner and qualified counsel before public launch. Delivery estimates, the $150 U.S. free-shipping threshold, the 30-day return window and tax/duty handling must be confirmed against the final operation.

Deployment is intentionally deferred until explicit approval.
