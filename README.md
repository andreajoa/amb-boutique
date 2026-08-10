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
- Dedicated Shoes navigation with a Heels collection, desktop mega menu and mobile submenu
- Women’s shoe size guide with EU, US/CA, UK and AU/NZ references plus foot-length measurements
- Persistent global shopping bag and full cart page
- Automatic cart rewards: 5% at US$100, 10% at US$200, 15% at US$300, 20% at US$400 and 25% at US$500
- Margin-protected, non-stacking welcome, cart-bump and post-purchase offers
- Complimentary standard U.S. shipping at US$99 and configurable carrier previews for CA, UK, AU and NZ
- Consent-aware visitor preference ID, personalised product ranking and a measurement-based size finder
- Email/SMS welcome-offer capture prepared for Resend plus a marketing webhook
- Stripe Embedded Checkout, shipping choices, verified cart bump and a separate secure post-purchase offer/downsell flow
- Real market formatting and configurable USD-to-CAD/GBP/AUD/NZD preview conversions
- Stripe Checkout and verified webhook endpoints, ready for credentials
- Contact and newsletter endpoints, ready for Resend credentials
- About, contact, FAQ, shipping, returns, privacy, terms, cookies, accessibility, size guide, order tracking, account, sale and journal pages
- Google/Bing SEO metadata, canonical URLs, sitemap, robots, Open Graph and JSON-LD
- AI/GEO discovery through crawlable semantic content, structured data and `/llms.txt`
- Cookie preference interface with optional technologies disabled by default

## Development

### One-click preview on Mac

Download and unzip the project, then double-click `OPEN-LOCAL-PREVIEW.command`. The first run installs the project packages and opens [http://127.0.0.1:3000](http://127.0.0.1:3000). Keep the Terminal window open while browsing. If macOS blocks the file, right-click it and choose **Open**.

The preview includes working navigation, collections, product options, cart drawer, quick-add upsell, automatic cart rewards and market currency switching. Checkout stays safely inactive until Stripe credentials and the real generated product catalogue are present; demonstration products can never reach payment. Unknown product costs fail closed: no automatic cart, order-bump or post-purchase discount is applied until landed cost and minimum margin are present.

### Terminal

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
2. Publish every source colour as a separate AMB product with its own short editorial name, URL and gallery. Keep the same retail price across colour-separated products unless merchandising requires otherwise. Use an evocative name plus the garment type (for example, `Vesper Belted Romper`); never expose supplier titles to customers.
3. When a shoe is offered with materially different heel heights, publish each colour + heel-height combination as its own AMB product. Use `category=Shoes`, `subcategory=Heels` and `heel_height_cm` so navigation and product fit details stay automatic.
4. Every product colour should have a coordinated AMB studio gallery on a warm ivory-beige background from the store palette. The target gallery is four square images in this order: front, back, left profile and right profile. Preserve the real product construction and never invent accessories or details. If the source export contains fewer verified angles, do not fabricate new product views; keep the verified source imagery until an AMB gallery is produced.
5. Keep multiple values separated with `|`. Use `Color name:#hex` for colours and four `image_urls` when a complete gallery is available. Add packed `weight_oz`, unit cost, inbound freight, duty, packaging and minimum margin so every promotion can be checked for profit before checkout.
6. `vendor` defaults to `AMB BOUTIQUE`. `subcategory`, `heel_height_cm` and `style_eligible` are optional importer fields. Use `style_eligible=false` when a product should not be used as the anchor for automated apparel styling.
7. Shoes use EU sizes as the catalogue variant values. The storefront automatically presents the dedicated shoe-size reference at `/size-guide#shoes`, with foot length as the primary fit reference and US/CA, UK and AU/NZ conversions as guidance.
8. Run:

```bash
npm run import:products
```

The importer validates required data and creates `app/generated-products.ts`. When the generated catalog contains products, it automatically replaces the visual placeholder catalog.

Supported catalog categories: Dresses, Tops/Blouses, Rompers/Playsuits, Skirts, Pants/Trousers, Shorts, Knitwear, Bags, Shoes and Accessories. `Heels` is currently a Shoes subcategory.

## Launch configuration

Copy `.env.example` to `.env.local` and connect Stripe and Resend before launch. Stripe Embedded Checkout validates every line and offer against the server catalog, applies only the margin-safe reward server-side and charges in USD, CAD, GBP, AUD or NZD for the selected market. It accepts shipping addresses in the US, Canada, UK, Australia and New Zealand. Configure the Stripe webhook at `/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`. Refresh the configurable conversion rates immediately before launch or replace them with a live-rate provider. Never commit real secrets.

Policy pages are operational drafts and should be reviewed by the owner and qualified counsel before public launch. Delivery estimates, the $99 U.S. free-shipping threshold, the 30-day return window and tax/duty handling must be confirmed against the final operation.

Production is connected to the `main` branch on Vercel. Product changes are prepared on a review branch, verified, and merged to `main` for release.

<!-- Production deployment refresh: 2026-08-09 -->