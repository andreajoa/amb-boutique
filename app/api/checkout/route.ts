import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { products } from "../../data";
import { convertFromUsd, FIRST_ORDER_CODE, getDiscountState, getShippingQuotes, isMarketCode, markets } from "../../commerce";
import { bestNonStackingDiscount, protectMargin } from "../../profitability";
import { rankRecommendations } from "../../recommendations";

export const runtime = "nodejs";

type RequestedLine = { slug?: string; quantity?: number; size?: string; color?: string; offer?: "cart-bump" | "post-purchase" };
type CheckoutBody = { items?: RequestedLine[]; market?: unknown; promotionCode?: string; orderNote?: string; visitorId?: string };

const stripeCountry = { US: "US", CA: "CA", UK: "GB", AU: "AU", NZ: "NZ" } as const;

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Secure checkout is prepared and will be activated when payment credentials are connected." }, { status: 503 });

  const body = await request.json().catch(() => null) as CheckoutBody | null;
  if (!body?.items?.length || body.items.length > 20) return NextResponse.json({ error: "Your bag is empty or contains too many separate items." }, { status: 400 });

  try {
    const market = isMarketCode(body.market) ? body.market : "US";
    const normalized = body.items.map((line) => {
      const product = products.find((item) => item.slug === line.slug);
      const quantity = Math.max(1, Math.min(10, Math.floor(Number(line.quantity) || 1)));
      if (!product) throw new Error("One of the selected products is no longer available.");
      if (product.stock === 0) throw new Error(`${product.name} is currently unavailable.`);
      return { line, product, quantity };
    });
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

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = normalized.map((item) => {
      const requestedPercent = Math.max(globalOffer.percent, item.line.offer === "post-purchase" ? 15 : item.line.offer === "cart-bump" ? 10 : 0);
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
            metadata: { slug: item.product.slug, size: item.line.size || "", color: item.line.color || "", offer: item.line.offer || "standard", margin_guard: margin.costKnown ? "verified" : "catalog-cost-pending" },
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

    const cartProducts = normalized.map((item) => item.product);
    const crossSell = rankRecommendations(products, cartProducts.map((product) => product.slug), [], cartProducts)
      .find((product) => (product.category === "Bags" || product.category === "Accessories") && product.stripePriceId);
    const optionalItems = crossSell ? [{
      price: crossSell.stripePriceId!,
      quantity: 1,
    }] : undefined;

    const stripe = new Stripe(secret, { apiVersion: "2026-07-29.dahlia" });
    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems,
      ...(optionalItems ? { optional_items: optionalItems } : {}),
      shipping_options: shippingOptions,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: [stripeCountry[market]] },
      customer_creation: "always",
      phone_number_collection: { enabled: true },
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        store: "AMB BOUTIQUE",
        fulfillment_status: "unfulfilled",
        market,
        currency: markets[market].currency,
        offer_source: globalOffer.source,
        requested_discount_percent: String(globalOffer.percent),
        visitor_id: (body.visitorId || "").slice(0, 100),
        order_note: (body.orderNote || "").slice(0, 450),
      },
    };
    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout could not be started." }, { status: 400 });
  }
}
