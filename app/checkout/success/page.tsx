import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../../components";
import { PostPurchaseOffer } from "../../post-purchase-offer";
import { getStripe } from "../../stripe-server";
import { OrderComplete } from "../order-complete";

export const metadata: Metadata = { title: "Order Confirmed", robots: { index: false, follow: false } };

type PageProps = { searchParams: Promise<{ session_id?: string }> };

async function getConfirmation(sessionId?: string) {
  const stripe = getStripe();
  if (!stripe || !sessionId?.startsWith("cs_")) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.store !== "AMB BOUTIQUE") return null;
    const confirmed = session.payment_status === "paid";
    const processing = session.status === "complete" && !confirmed;
    return {
      confirmed,
      processing,
      sessionId: session.id,
      orderNumber: session.id.slice(-8).toUpperCase(),
      purchasedSlugs: (session.metadata?.purchased_slugs || "").split("|").filter(Boolean),
      allowPrivateOffer: confirmed && session.metadata?.order_type !== "post-purchase",
    };
  } catch {
    return null;
  }
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const { session_id: sessionId } = await searchParams;
  const confirmation = await getConfirmation(sessionId);
  if (!confirmation) return <main><Header/><section className="checkout-status"><p>SECURE CHECKOUT</p><h1>We couldn’t verify this order.</h1><span>Please return to your bag or contact info@ambboutique.online if you completed a payment.</span><Link className="button dark" href="/cart">Return to your bag</Link></section><Footer/></main>;

  return <main><Header/><OrderComplete confirmed={confirmation.confirmed}/><section className="checkout-status"><p>{confirmation.processing ? "PAYMENT PROCESSING" : "THANK YOU"}</p><h1>{confirmation.processing ? "Your payment is being confirmed." : "Your order is confirmed."}</h1><span>{confirmation.processing ? "We’ll email you as soon as your payment is complete." : `Order ${confirmation.orderNumber} is safely recorded. A confirmation will arrive at the email used during checkout, followed by tracking when your order leaves San Diego.`}</span><Link className="button dark" href="/collections">Continue Shopping</Link></section>{confirmation.allowPrivateOffer && <PostPurchaseOffer sessionId={confirmation.sessionId} purchasedSlugs={confirmation.purchasedSlugs}/>}<Footer/></main>;
}
