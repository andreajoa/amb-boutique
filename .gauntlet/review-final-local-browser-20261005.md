# Final local browser / built-artifact review — 2026-10-05

Status: **BLOCKED for browser/runtime verification**. Built homepage HTML serialized catalogue checks passed. No screenshots, browser interactions or PDP-rendering PASS is claimed.

## Blocking evidence

Root reported the final local server failed to start on `127.0.0.1:3048`: `listen EPERM: operation not permitted`. Root also reported the agent-browser daemon failed startup. Approval policy is `never`. This reviewer did not try another port, escalate permissions, start another build/server or work around the restriction. Root's blank DB/webhook server never started.

The requested fifteen static PDP artifacts do not exist in the actual final build. `.next/server/app/products` contains only `[slug]/page.js` and associated manifests. Recursive `.html` count under this folder is zero. `.next/prerender-manifest.json` has 42 routes, with no `/products/` entries. The build's 482 generated product parameters are not 482 static PDP HTML files; these PDPs require runtime rendering. Therefore actual PDP notice position, gallery image loading, PDP prices/buttons and conditional JSON-LD cannot be proven by reading a nonexistent HTML artifact.

## Actual built HTML checks executed

`python3 /private/tmp/amb-oct05-continuation/critic-built-html.py` passed. It reads the real `.next/server/app/index.html` with Python's HTMLParser, decodes the HTML's embedded React Flight payload and binds the exact `StoreProvider` import reference to its serialized `catalog` prop. It does not execute app code, contact a server, fetch images or perform backend writes.

- The rendered homepage contains exactly one full StoreProvider catalogue of 482 unique products.
- All fifteen final candidate products in that built HTML match independently reviewed source product/raw color, final cost, final price, captured stock and exact raw size sets.
- All fifteen carry the four selected generated local image paths in front/back/left/right order. The 60 local public image bytes still match the independently approved manifest SHA-256. This proves selected artifact identity, not browser image loading.
- Exactly nine product fulfillment notices are configured: Elaris plus eight Calienne colors, with canonical text matching the source-backed review. This proves data reached the compiled artifact, not the PDP's visual notice placement.
- Normal Calista has no fulfillment notice and retains S 111.90 / M 115.90 / L 115.90 in the serialized final catalogue.
- Local rendered `<head>` has exactly one `p:domain_verify` meta with content `609dd2d6c2bcaf7c6bb74981abb48c30`.

Full result and per-product checks: `.gauntlet/review-final-built-html-20261005.json`. Built homepage HTML SHA-256: `c5c205927dff6c52df0d3320b62ee3d4525cbb6018ca98863783c5403ee157db`.

## Runtime tests unavailable

Desktop/mobile layout, actual four-image loading per PDP, gallery interaction, Add to Bag, drawer/cart notices and restored-cart/reload behavior: **NOT RUN / BLOCKED**. Screenshots produced: 0. The offline real-handler/helper/JSON-LD/confirmation test passed separately with in-memory payment/SQL/email boundaries; it is not a browser substitute. Shipping implementation has a separate independent critic; this reviewer does not self-approve it.

No local or production page was opened during this final review. Network requests: 0. Application writes: 0. External actions: 0. No checkout session, payment, order, email, contact entry, commit or deployment was created.

## Pinterest scope

The exact-once token is proven only in the locally built homepage head by this reviewer. Root reports separate PR47/READY production deployment evidence; that is outside this local review. Public production HTML was not fetched here, and this receipt makes no website-claim readiness assertion.

## No-write test preparation retained

Client analytics POSTs only with consent value `all`, but StoreProvider independently POSTs `/api/cart` after hydration/cart changes regardless of consent. Its route writes journeys and can schedule recovery when DB is configured. `/api/events` writes when DB exists and can forward to a behavior webhook; neither has a hostname local bypass. Google analytics loader is external and unconditional. If a permitted local server/browser later becomes available, use isolated `amb-final-local`, essential consent, explicit empty `DATABASE_URL`, `AMB_DATABASE_URL`, `BEHAVIOR_EVENT_WEBHOOK_URL`, and pre-navigation request interception for `/api/*` and remote HTTPS. No checkout actions are authorized in that local review.
