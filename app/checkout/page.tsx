import type { Metadata } from "next";
import { Footer, Header } from "../components";
import { EmbeddedCheckoutPanel } from "./embedded-checkout";
import { getStripePublishableKey } from "../stripe-server";

export const metadata: Metadata = { title: "Secure Checkout", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return <main><Header/><section className="checkout-intro"><p>SECURE CHECKOUT</p><h1>Complete your order</h1><span>Review delivery and payment without leaving AMB BOUTIQUE.</span></section><EmbeddedCheckoutPanel publishableKey={getStripePublishableKey()}/><Footer/></main>;
}
