import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../../components";
import { GA4Purchase, type GA4PurchasePayload } from "../../ga4-purchase";
import { PostPurchaseOffer } from "../../post-purchase-offer";
import { getStripe } from "../../stripe-server";
import { OrderComplete } from "../order-complete";

export const metadata: Metadata = { title: "Order Confirmed", robots: { index: false, follow: false } };

type PageProps = { searchParams: Promise<{ session_id?: string }> };

async function getConfirmation(sessionId?: string) {
  const stripe = getStripe();
  if (!stripe || !sessionId?.startsWith("cs_")) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });
    if (session.metadata?.store !== "AMB BOUTIQUE") return null;
    const confirmed = session.payment_status === "paid";
    const processing = session.status === "complete" && !confirmed;

    const purchaseItems = (session.line_items?.data || []).map((line) => {
      const stripeProduct = line.price?.product;
      const productMetadata: Record<string, string> = typeof stripeProduct === "object" && stripeProduct && "metadata" in stripeProduct
        ? stripeProduct.metadata
        : {};
      const productName = typeof stripeProduct === "object" && stripeProduct && "name" in stripeProduct
        ? String(stripeProduct.name)
        : line.description || "AMB BOUTIQUE item";
      const quantity = line.quantity || 1;
      const unitPrice = typeof line.price?.unit_amount === "number"
        ? line.price.unit_amount / 100
        : line.amount_subtotal / quantity / 100;
      const itemVariant = [
        productMetadata.color,
        productMetadata.size,
        productMetadata.heel_height_cm ? `${productMetadata.heel_height_cm}cm heel` : "",
      ].filter(Boolean).join(" / ");

      return {
        item_id: productMetadata.slug || line.id,
        item_name: productName,
        item_variant: itemVariant || undefined,
        price: Number(unitPrice.toFixed(2)),
        quantity,
      };
    });

    const discount = session.total_details?.amount_discount || 0;
    const merchandiseValue = Math.max(0, (session.amount_subtotal || 0) - discount) / 100;
    const purchase: GA4PurchasePayload | null = confirmed ? {
      transactionId: session.id,
      value: Number(merchandiseValue.toFixed(2)),
      currency: (session.currency || session.metadata?.currency || "usd").toUpperCase(),
      tax: session.total_details?.amount_tax ? Number((session.total_details.amount_tax / 100).toFixed(2)) : undefined,
      shipping: session.total_details?.amount_shipping ? Number((session.total_details.amount_shipping / 100).toFixed(2)) : undefined,
      items: purchaseItems,
    } : null;

    return {
      confirmed,
      processing,
      sessionId: session.id,
      orderNumber: session.id.slice(-8).toUpperCase(),
      purchasedSlugs: (session.metadata?.purchased_slugs || "").split("|").filter(Boolean),
      allowPrivateOffer: confirmed && session.metadata?.order_type !== "post-purchase",
      purchase,
    };
  } catch {
    return null;
  }
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const { session_id: sessionId } = await searchParams;
  const confirmation = await getConfirmation(sessionId);
  if (!confirmation) return <main><Header/><section className="checkout-status"><p>SECURE CHECKOUT</p><h1>We couldn’t verify this order.</h1><span>Please return to your bag or contact info@ambboutique.online if you completed a payment.</span><Link className="button dark" href="/cart">Return to your bag</Link></section><Footer/></main>;

  return <main><Header/>{confirmation.purchase && <GA4Purchase purchase={confirmation.purchase}/>}<OrderComplete confirmed={confirmation.confirmed}/><section className="checkout-status"><p>{confirmation.processing ? "PAYMENT PROCESSING" : "THANK YOU"}</p><h1>{confirmation.processing ? "Your payment is being confirmed." : "Your order is confirmed."}</h1><span>{confirmation.processing ? "We’ll email you as soon as your payment is complete." : `Order ${confirmation.orderNumber} is safely recorded. A confirmation will arrive at the email used during checkout, followed by tracking when your order leaves San Diego.`}</span><Link className="button dark" href="/collections">Continue Shopping</Link></section>{confirmation.allowPrivateOffer && <PostPurchaseOffer sessionId={confirmation.sessionId} purchasedSlugs={confirmation.purchasedSlugs}/>}<Footer/></main>;
}
