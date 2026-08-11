"use client";

import { FormEvent, useState } from "react";
import { useStore } from "./store-provider";

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const { market, visitorId } = useStore();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, market, visitorId, emailConsent: true, source: compact ? "footer-newsletter" : "newsletter-form" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset();
      setMessage("Welcome to the AMB list.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <form className={compact ? "footer-form" : "newsletter-form"} onSubmit={submit}>
    <label className="sr-only" htmlFor={compact ? "footer-email" : "newsletter-email"}>Email address</label>
    <input id={compact ? "footer-email" : "newsletter-email"} name="email" type="email" autoComplete="email" placeholder="Email address" required/>
    <button type="submit" disabled={pending}>{pending ? "Joining…" : "Join"}</button>
    {message && <output className="form-message" aria-live="polite">{message}</output>}
  </form>;
}
