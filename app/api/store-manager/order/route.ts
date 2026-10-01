import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "../../../stripe-server";
import { storeManagerRequestAuthorized } from "../../../store-manager-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stringMetadata(value: Stripe.Metadata | null | undefined) {
  return Object.fromEntries(
    Object.entries(value || {}).map(([key, raw]) => [key, String(raw ?? "")]),
  );
}

export async function GET(request: NextRequest) {
  if (!storeManagerRequestAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim() || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid Stripe session." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Stripe is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [session, lineItems] = await Promise.all([
      stripe.checkout.sessions.retrieve(sessionId),
      stripe.checkout.sessions.listLineItems(sessionId, {
        limit: 100,
        expand: ["data.price.product"],
      }),
    ]);

    if (
      session.payment_status !== "paid" ||
      session.metadata?.store !== "AMB BOUTIQUE"
    ) {
      return NextResponse.json(
        { ok: false, error: "Order is not a paid AMB BOUTIQUE order." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const shipping = session.collected_information?.shipping_details;
    const address = shipping?.address;
    if (
      !shipping?.name ||
      !address?.line1 ||
      !address.city ||
      !address.postal_code ||
      !address.country
    ) {
      return NextResponse.json(
        { ok: false, error: "Order shipping address is incomplete." },
        { status: 422, headers: { "Cache-Control": "no-store" } },
      );
    }

    const lines = lineItems.data.map((line, index) => {
      const rawProduct = line.price?.product;
      const product =
        rawProduct && typeof rawProduct === "object" && !("deleted" in rawProduct)
          ? rawProduct
          : null;

      if (!product) {
        throw new Error(
          `Stripe line ${index + 1} did not return an expanded product.`,
        );
      }

      return {
        id: line.id,
        quantity: Math.max(1, line.quantity || 1),
        amountSubtotal: line.amount_subtotal,
        amountTotal: line.amount_total,
        product: {
          id: product.id,
          name: product.name || "AMB BOUTIQUE product",
          metadata: stringMetadata(product.metadata),
        },
      };
    });

    return NextResponse.json(
      {
        ok: true,
        session: {
          id: session.id,
          paymentStatus: session.payment_status,
          currency: (session.currency || "usd").toUpperCase(),
          amountSubtotal: session.amount_subtotal || 0,
          amountTotal: session.amount_total || 0,
          amountShipping:
            session.total_details?.amount_shipping ??
            session.shipping_cost?.amount_total ??
            0,
          amountDiscount: session.total_details?.amount_discount || 0,
          customerName: session.customer_details?.name || shipping.name,
          customerEmail: session.customer_details?.email || null,
          customerPhone: session.customer_details?.phone || null,
          shipping: {
            recipient: shipping.name,
            line1: address.line1,
            line2: address.line2 || null,
            city: address.city,
            state: address.state || address.city,
            postalCode: address.postal_code,
            countryCode: address.country.toUpperCase(),
          },
          metadata: stringMetadata(session.metadata),
          lines,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Order lookup failed.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
