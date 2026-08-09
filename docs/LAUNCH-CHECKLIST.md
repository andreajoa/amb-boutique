# AMB BOUTIQUE launch checklist

## Ready in the repository

- Homepage, collections, category collections, product template, global cart and support pages
- Responsive desktop/mobile design and generated editorial imagery
- SEO, JSON-LD, sitemap, robots, social sharing metadata and llms.txt
- Stripe Checkout/webhook code and Resend contact/newsletter code
- Margin guard, non-stacking welcome/cart/post-purchase offers and native Checkout cross-sell
- Consent-aware preference ID, welcome email/SMS capture and size recommendation helper
- Consent-gated first-party behavior events, ready for an analytics webhook
- $99 complimentary U.S. shipping rule and January 2026 USPS preview bands for international parcels up to 4 lb
- CSV product importer and documented catalog format
- English brand, service, journal and policy copy for the intended markets

## Complete after the real product CSV arrives

- Write product-specific native-English names, descriptions, materials, fit and care copy
- Import final pricing, compare-at pricing, sizes, colours, inventory and images
- Import packed weight plus unit, inbound freight, duty and packaging costs; review the calculated safe-discount ceiling
- Confirm each product’s image order and crop on desktop/mobile
- Replace all placeholder products before making the site public

## Connect before deployment

- Confirm the real business return address and support hours
- Confirm San Diego origin ZIP, packed dimensions/weights, carrier account, delivery estimates and international duties policy; replace preview bands with live rates
- Confirm the 30-day return policy and exclusions with the owner; obtain legal review for policies
- Create Stripe account/products settings, enable desired payment methods and add webhook secret
- Configure tax collection with qualified tax advice; set `STRIPE_AUTOMATIC_TAX=true` only after Stripe Tax is ready
- Verify `ambboutique.online` and sending domain in Resend; connect contact and newsletter credentials
- Add real social profile URLs
- Add final analytics only after consent gating is verified
- Review product schema, sitemap and Search Console/Bing Webmaster verification

## Deployment day

- Add production environment variables without committing them
- Run `npm run lint` and `npm run build`
- Deploy only after explicit approval
- Test homepage, category, product, bag, checkout, email, return/contact links and policy pages on mobile and desktop
- Submit `https://ambboutique.online/sitemap.xml` to search engines after DNS and canonical domain are live
