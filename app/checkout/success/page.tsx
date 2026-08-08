import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../../components";
export const metadata: Metadata = { title: "Order Confirmed", robots: { index: false, follow: false } };
export default function SuccessPage() { return <main><Header/><section className="checkout-status"><p>THANK YOU</p><h1>Your order is confirmed.</h1><span>A confirmation will arrive at the email used during checkout. We’ll send tracking as soon as your order leaves San Diego.</span><Link className="button dark" href="/collections">Continue Shopping</Link></section><Footer/></main>; }
