"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { FIRST_ORDER_CODE, markets } from "./commerce";
import { useStore } from "./store-provider";

const dismissedKey = "amb-welcome-offer-v1";
const consentKey = "amb-cookie-consent-v1";

export function MarketingPopup() {
  const { market, visitorId, setPromoCode } = useStore();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const popupRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    window.localStorage.setItem(dismissedKey, JSON.stringify({ dismissedAt: new Date().toISOString() }));
    setVisible(false);
  }, []);

  useEffect(() => {
    const blockedRoute = pathname?.startsWith("/cart") || pathname?.startsWith("/checkout") || pathname?.startsWith("/account");
    if (blockedRoute || window.localStorage.getItem(dismissedKey)) return;
    let timer: number | undefined;
    let started = false;
    const show = () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      setVisible(true);
    };
    const onScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      if (available > 0 && window.scrollY / available >= 0.35) show();
    };
    const start = () => {
      if (started || window.localStorage.getItem(dismissedKey)) return;
      started = true;
      timer = window.setTimeout(show, 12000);
      window.addEventListener("scroll", onScroll, { passive: true });
    };
    const onConsent = () => start();
    if (window.localStorage.getItem(consentKey)) start();
    else window.addEventListener("amb-consent-change", onConsent);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("amb-consent-change", onConsent);
    };
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const focusable = popupRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]),a[href],input:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [close, visible]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const emailConsent = data.get("emailConsent") === "on";
    const smsConsent = data.get("smsConsent") === "on";
    const phone = String(data.get("phone") || "").trim();
    if (!emailConsent) return setMessage("Please choose email consent to receive your welcome code.");
    if (phone && !smsConsent) return setMessage("Please choose SMS consent if you would like texts, or leave the phone field blank.");
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), phone, emailConsent, smsConsent, market, visitorId, source: "welcome-popup" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPromoCode(result.code || FIRST_ORDER_CODE);
      setUnlocked(true);
      setMessage(result.preview ? "Preview mode: your offer is ready; audience delivery will activate at launch." : "Your private welcome offer is ready.");
      window.localStorage.setItem(dismissedKey, JSON.stringify({ joinedAt: new Date().toISOString() }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally { setPending(false); }
  }

  if (!visible) return null;
  return <div className="welcome-layer" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <button className="welcome-backdrop" onClick={close} aria-label="Close welcome offer"/>
    <section className="welcome-popup" ref={popupRef}>
      <button className="welcome-close" type="button" onClick={close} aria-label="Close welcome offer" ref={closeRef}>×</button>
      <div className="welcome-image" role="img" aria-label="AMB BOUTIQUE coastal fashion editorial"/>
      <div className="welcome-copy">
        <p>WELCOME TO AMB</p>
        <h2 id="welcome-title">Your first look deserves something special.</h2>
        <span>Enjoy 10% off your first full-price order, plus early access to new edits from San Diego.</span>
        {unlocked ? <div className="unlocked-code"><small>YOUR PRIVATE CODE</small><strong>{FIRST_ORDER_CODE}</strong><button type="button" onClick={() => { setPromoCode(FIRST_ORDER_CODE); close(); }}>Apply & Shop</button></div> : <form onSubmit={submit}>
          <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label>
          <label>Mobile number <small>(optional)</small><input name="phone" type="tel" autoComplete="tel" placeholder={`${markets[market].flag} Include country code`}/></label>
          <label className="consent-check"><input name="emailConsent" type="checkbox"/> <span>Email me AMB news and offers. I can unsubscribe anytime.</span></label>
          <label className="consent-check"><input name="smsConsent" type="checkbox"/> <span>Text me AMB offers. Consent is not a condition of purchase; message/data rates may apply. Reply STOP to opt out.</span></label>
          <button type="submit" disabled={pending}>{pending ? "Unlocking…" : "Unlock 10% Off"}</button>
        </form>}
        {message && <output className="form-message" aria-live="polite">{message}</output>}
        <small>One offer per customer. Best eligible discount applies; offers do not stack. See <Link href="/terms">terms</Link> and <Link href="/privacy">privacy</Link>.</small>
      </div>
    </section>
  </div>;
}
