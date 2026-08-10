import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { products } from "../../data";
import { generatedProducts } from "../../generated-products";
import { convertFromUsd, FIRST_ORDER_CODE, getDiscountState, getShippingQuotes, isMarketCode, markets } from "../../commerce";
import { bestNonStackingDiscount, protectMargin } from "../../profitability";
import { rankRecommendations } from "../../recommendations";
import { getStripe } from "../../stripe-server";
import { ensureInventoryForProducts, InventoryError, releaseExpiredInventory, reserveInventory, resolveInventoryLines } from "../../inventory";

export const runtime = "nodejs";

type RequestedLine = { slug?: string; quantity?: number; size?: string; color?: string; offer?: "cart-bump" | "post-purchase" };
type CheckoutBody = { items?: RequestedLine[]; market?: unknown; promotionCode?: string; orderNote?: string; visitorId?: string; parentSessionId?: string };

const stripeCountry = { US: "US", CA: "CA", UK: "GB", AU: "AU", NZ: "NZ" } as const;

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Secure checkout is prepared and will be activated when payment credentials are connected." }, { status: 503 });
  if (!generatedProducts.length) return NextResponse.json({ error: "The AMB preview catalogue cannot be purchased. Secure checkout will activate automatically after the real product CSV is imported." }, { status: 503 });

  const body = await request.json().catch(() => null) as CheckoutBody | null;
  if (!body?.items?.length || body.items.length > 20) return NextResponse.json({ error: "Your bag is empty or contains too many separate items." }, { status: 400 });

  try {
    await releaseExpiredInventory();
    const market = isMarketCode(body.market) ? body.market : "US";
    const normalized = body.items.map((line) => {
      const product = products.find((item) => item.slug === line.slug);
      const quantity = Math.max(1, Math.min(10, Math.floor(Number(line.quantity) || 1)));
      if (!product) throw new Error("One of the selected products is no longer available.");
      if (product.stock === 0) throw new Error(`${product.name} is currently unavailable.`);
      return { line, product, quantity };
    });
    await ensureInventoryForProducts(normalized.map((item) => item.product.slug));
    const inventoryLines = await resolveInventoryLines(normalized.map((item) => ({
      slug: item.product.slug,
      color: item.line.color || "",
      size: item.line.size || "",
      quantity: item.quantity,
    })));
    const inventoryKey = (slug: string, color: string, size: string) => `${slug}\u0000${color.toLowerCase()}\u0000${size.toLowerCase()}`;
    const inventoryBySelection = new Map(inventoryLines.map((item) => [inventoryKey(item.slug, item.color, item.size), item]));
    const subtotalUsd = normalized.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const packedWeightOz = normalized.reduce((sum, item) => sum + (item.product.weightOz || 12) * item.quantity, 0);
    if (market !== "US" && packedWeightOz > 64) throw new Error("This international parcel needs a live carrier quote. Please contact AMB BOUTIQUE for delivery assistance.");

    const reward = getDiscountState(subtotalUsd);
    const promoCode = body.promotionCode?.trim().toUpperCase();
    const globalOffer = bestNonStackingDiscount(reward.percent, promoCode === FIRST_ORDER_CODE ? promoCode : undefined);
    const complimentaryShippingCostUsd = market === "US" && getShippingQuotes(market, subtotalUsd, packedWeightOz)[0].amountUsd === 0
      ? packedWeightOz <= 16 ? 11.95 : packedWeightOz <= 32 ? 17.65 : 22.45
      : 0;
    const totalUnits = normalized.reduce((sum, item) => sum + item.quantity, 0);

    const cartBumps = normalized.filter((item) => item.line.offer === "cart-bump");
    if (cartBumps.length) {
      const standardItems = normalized.filter((item) => !item.line.offer);
      const anchors = standardItems.map((item) => item.product);
      const allowedBumps = rankRecommendations(products, anchors.map((product) => product.slug), [], anchors);
      if (cartBumps.length > 1 || !anchors.length || !allowedBumps.some((product) => product.slug === cartBumps[0].product.slug)) {
        throw new Error("That cart offer is not available for this selection.");
      }
    }

    const isPostPurchase = normalized.some((item) => item.line.offer === "post-purchase");
    let parentSession: Stripe.Checkout.Session | null = null;
    if (isPostPurchase) {
      if (!body.parentSessionId || normalized.length !== 1) throw new Error("This private offer is no longer available.");
      parentSession = await stripe.checkout.sessions.retrieve(body.parentSessionId);
      const isRecent = parentSession.created * 1000 > Date.now() - 24 * 60 * 60 * 1000;
      const isOriginalPaidOrder = parentSession.payment_status === "paid"
        && parentSession.metadata?.store === "AMB BOUTIQUE"
        && parentSession.metadata?.order_type !== "post-purchase"
        && parentSession.metadata?.market === market;
      if (!isRecent || !isOriginalPaidOrder) throw new Error("This private offer is no longer available.");

      const purchasedSlugs = (parentSession.metadata?.purchased_slugs || "").split("|").filter(Boolean);
      const anchors = purchasedSlugs.map((slug) => products.find((product) => product.slug === slug)).filter((product): product is (typeof products)[number] => Boolean(product));
      if (!anchors.length) throw new Error("This private offer is no longer available.");
      const allowed = rankRecommendations(products, purchasedSlugs, [], anchors).some((product) => product.slug === normalized[0].product.slug);
      if (!allowed) throw new Error("That item is not an eligible match for this order.");
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = normalized.map((item) => {
      const inventory = inventoryBySelection.get(inventoryKey(item.product.slug, item.line.color || "", item.line.size || ""));
      if (!inventory) throw new InventoryError(`${item.product.name} is not available in that color and size.`);
      const requestedPercent = item.line.offer === "post-purchase" ? 15 : Math.max(globalOffer.percent, item.line.offer === "cart-bump" ? 10 : 0);
      const margin = protectMargin(item.product, requestedPercent, complimentaryShippingCostUsd / totalUnits);
      const discountedUnitUsd = item.product.price * (1 - margin.approvedPercent / 100);
      return {
        quantity: item.quantity,
        price_data: {
          currency: markets[market].currency.toLowerCase(),
          unit_amount: Math.max(50, Math.round(convertFromUsd(discountedUnitUsd, market) * 100)),
          product_data: {
            name: item.product.name,
            description: [
              `Size ${item.line.size || "Selected"}`,
              `Color ${item.line.color || "Selected"}`,
              margin.approvedPercent ? `${margin.approvedPercent}% best eligible AMB offer` : "",
            ].filter(Boolean).join(" · "),
            metadata: { slug: item.product.slug, sku: inventory.sku, size: inventory.size, color: inventory.color, offer: item.line.offer || "standard", margin_guard: margin.costKnown ? "verified" : "catalog-cost-pending" },
          },
        },
      };
    });

    const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = getShippingQuotes(market, subtotalUsd, packedWeightOz).map((quote) => ({
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: Math.round(convertFromUsd(quote.amountUsd, market) * 100), currency: markets[market].currency.toLowerCase() },
        display_name: quote.label,
        delivery_estimate: { minimum: { unit: "business_day", value: quote.minBusinessDays }, maximum: { unit: "business_day", value: quote.maxBusinessDays } },
        metadata: { quote_id: quote.id, source: quote.source },
      },
    }));

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const purchasedSlugs = normalized.map((item) => item.product.slug).join("|").slice(0, 450);
    const orderType = isPostPurchase ? "post-purchase" : "standard";
    const customer = typeof parentSession?.customer === "string" ? parentSession.customer : undefined;
    const expiresAtUnix = Math.floor(Date.now() / 1000) + 30 * 60;
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      ui_mode: "embedded_page",
      line_items: lineItems,
      shipping_options: shippingOptions,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: [stripeCountry[market]] },
      ...(customer ? { customer } : { customer_creation: "always" as const }),
      phone_number_collection: { enabled: true },
      expires_at: expiresAtUnix,
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      redirect_on_completion: "always",
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      custom_text: {
        shipping_address: { message: "AMB BOUTIQUE ships from San Diego, California. Duties may apply outside the United States." },
        submit: { message: "Your payment is encrypted and processed securely by Stripe." },
      },
      metadata: {
        store: "AMB BOUTIQUE",
        fulfillment_status: "unfulfilled",
        order_type: orderType,
        parent_session_id: parentSession?.id || "",
        purchased_slugs: purchasedSlugs,
        market,
        currency: markets[market].currency,
        offer_source: globalOffer.source,
        requested_discount_percent: String(globalOffer.percent),
        visitor_id: (body.visitorId || "").slice(0, 100),
        order_note: (body.orderNote || "").slice(0, 450),
      },
    };
    const session = await stripe.checkout.sessions.create(sessionParams);
    try {
      await reserveInventory(session.id, new Date(expiresAtUnix * 1000), inventoryLines);
    } catch (error) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      throw error;
    }
    if (!session.client_secret) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      throw new Error("Secure checkout could not be initialized.");
    }
    return NextResponse.json({ clientSecret: session.client_secret, sessionId: session.id });
  } catch (error) {
    const status = error instanceof InventoryError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout could not be started." }, { status });
  }
}
