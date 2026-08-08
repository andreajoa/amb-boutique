import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../../components";
export const metadata: Metadata = { title: "Checkout Paused", robots: { index: false, follow: false } };
export default function CancelledPage() { return <main><Header/><section className="checkout-status"><p>YOUR BAG IS SAVED</p><h1>Checkout paused.</h1><span>No charge was made. Your selections are still waiting in your bag.</span><Link className="button dark" href="/cart">Return to Your Bag</Link></section><Footer/></main>; }
