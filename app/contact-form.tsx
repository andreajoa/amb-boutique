"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset();
      setMessage("Thank you — your message is on its way to our San Diego team.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please email info@ambboutique.online.");
    } finally {
      setPending(false);
    }
  }

  return <form className="contact-form" onSubmit={submit}>
    <div><label>First name<input name="firstName" autoComplete="given-name" required/></label><label>Last name<input name="lastName" autoComplete="family-name" required/></label></div>
    <label>Email<input name="email" type="email" autoComplete="email" required/></label>
    <label>Order number <small>(optional)</small><input name="orderNumber"/></label>
    <label>How can we help?<select name="topic" defaultValue="Product question"><option>Product question</option><option>Order support</option><option>Shipping & returns</option><option>Press & partnerships</option><option>Something else</option></select></label>
    <label>Message<textarea name="message" rows={7} required/></label>
    <button className="button dark" disabled={pending}>{pending ? "Sending…" : "Send Message"}</button>
    {message && <output className="form-message" aria-live="polite">{message}</output>}
  </form>;
}

export function TrackOrderForm() {
  const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Order tracking will activate when live orders are connected. For immediate help, email info@ambboutique.online.");
  }
  return <form className="contact-form compact-form" onSubmit={submit}><label>Order number<input name="orderNumber" placeholder="AMB-1001" required/></label><label>Order email<input name="email" type="email" autoComplete="email" required/></label><button className="button dark">Check Status</button>{message && <output className="form-message" aria-live="polite">{message}</output>}</form>;
}

export function AccountForm() {
  return <form className="contact-form compact-form" onSubmit={(event) => event.preventDefault()}><label>Email<input name="email" type="email" autoComplete="email" required/></label><button className="button dark">Continue with Email</button><p className="form-note">Secure customer accounts will be enabled with the commerce backend before launch. You can still shop as a guest.</p></form>;
}
