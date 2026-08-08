import Link from "next/link";
import { Footer, Header } from "./components";
export default function NotFound() { return <main><Header/><section className="not-found"><p>404</p><h1>This page slipped away.</h1><span>Let’s take you back to something beautiful.</span><Link className="button dark" href="/collections">Shop the Edit</Link></section><Footer/></main>; }
