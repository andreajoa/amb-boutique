# Independent fulfillment implementation review

Reviewed 2026-10-05 by `mesh_gallery_builder`, independently from the fulfillment builder. Scope: canonical preparation notices, customer purchase flow, checkout snapshots, structured data and confirmation rendering. No payment, email, order or external request was made.

**Implementation review: PASS for the exercised offline behavior. BLOCKER: 0. MAJOR: 0.** This does not claim a production deployment or replace the pending full build and browser verification.

Reference: `.gauntlet/review-fulfillment-20261005.json`, including its nine exact `proposedPerProductValues`. The reviewed importer maps those values onto one Elaris and eight Calienne candidates, preserving kind and notice verbatim. The candidates remain outside the visible catalogue until independent gallery approval.

Reviewed files: `app/product-fulfillment.ts`, `app/data.ts`, `app/store-provider.tsx`, `app/cart/page.tsx`, `app/checkout/embedded-checkout.tsx`, `app/products/[slug]/product-detail.tsx`, `app/products/[slug]/page.tsx`, `app/api/checkout/route.ts`, `app/email/commerce-lifecycle.ts`, `app/email/template.ts`, and `scripts/test-product-fulfillment.mjs`.

Read the local Next.js 16.3 documentation for Route Handlers, metadata, and serializable Server-to-Client props, plus the Vercel `react-best-practices` skill. The optional fulfillment object is serializable. The client lookup callback depends on the memoized catalogue map; it derives notices from the current canonical product rather than persisted cart text. UI changes introduce no network or effects.

## Execution evidence

Independently reran `node scripts/test-product-fulfillment.mjs`, exit 0. The test executes the real checkout handler, PDP structured-data function, confirmation lifecycle and renderer with Stripe, SQL and email boundaries replaced in memory. Global `fetch` throws on attempted external requests. Report:

```json
{"helper":"PASS","checkout":"standard5markets + extended/mixed5baskets PASS","canonicalNotices":"PASS","shippingAndPricesUnchanged":"PASS","international64ozGuard":"PASS","jsonLd":"PASS","confirmationSnapshotAndFallback":"PASS","normalPublishedBaselineParity":"PASS","externalActions":0}
```

- Five standard-market baskets compare exact Stripe request parameters and stored journey data with commit `3835c8ce5979941c69c25742a232a3c2d66695a7`; they remain identical.
- Five extended/mixed US baskets suppress the unsupported checkout delivery estimate while preserving shipping amount/service and line prices. Server-derived notices appear in product description, product metadata, session metadata and each journey item. Fabricated client “Ships today” text is ignored.
- Four international heavy-gown cases reject before the Stripe boundary, preserving the 64 oz live-quote guard.
- Extended PDP JSON-LD omits the fixed 1–3 day handling/delivery block. Standard PDP JSON-LD remains equal to the baseline.
- Confirmation uses the saved paid-order preparation snapshot after catalogue wording changes; session metadata supplies a fallback if saved lines are absent. Preparation is separate from the transit window after dispatch. HTML escapes notice text. Standard confirmation output remains equivalent to baseline.

Also reran `node scripts/verify-catalogue-variants.mjs`, exit 0: 467 visible unique slugs, all 444 baseline full-record hashes unchanged, local images present, existing stock/size/heel behavior passed. `git diff --check` on the fulfillment files passed.

## Merchant feed timing audit

Read `app/merchant.ts` and both Merchant TSV route implementations. No handling, delivery, transit or availability-date columns exist; `shipping_weight` is the only shipping column. No hardcoded 1–3 day handling or 12–18 day total-delivery promise is emitted by these modules.

Executed both real GET handlers with the nine canonical candidate records substituted only in memory, using `/private/tmp/amb-oct05-continuation/review-merchant-preparation.mjs`. Global fetch throws if called. Exit 0: full feed 70 rows for nine products; compact feed nine rows. Every row retained 70.55 oz, positive captured-stock availability and a generated AMB `/products/` image URL. Descriptions contained no short handling or total-delivery promise. External actions: 0. No feed changes were needed. Merchant Center account-level shipping settings were not inspected, so this conclusion concerns the local feed output only.

## Limits and remaining release gates

The implementation cannot itself establish current supplier stock, confirm unestablished calendar/business-day semantics, or approve gallery fidelity. It preserves the exact reviewed wording and captured stock; the 64 oz market limitation remains intentional. The nine candidate fields must be checked in rendered pages after local activation. Browser verification of restored bag/checkout notices, the root full build/type check, and release review remain integrating-agent responsibilities.

No shipping rates, return policy, price/cost data, established-product records, payment boundaries or email-send implementation were changed by this reviewer. Only this receipt and the separately authorized temporary importer were written.
