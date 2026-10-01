"use client";

import { FormEvent, useState } from "react";

type ContactState = "idle" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<ContactState>("idle");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setPending(true);
    setStatus("idle");
    setMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send message.");
      form.reset();
      setStatus("success");
      setMessage("Your message has been sent successfully. Our support team will review it and get back to you within two business days.");
    } catch {
      setStatus("error");
      setMessage("We couldn’t send your message right now. Please try again in a few minutes. If the issue continues, email us at info@ambboutique.online.");
    } finally {
      setPending(false);
    }
  }

  if (status === "success") {
    return <section className="contact-success" aria-live="polite">
      <div className="contact-success-mark" aria-hidden="true">✓</div>
      <p className="contact-success-kicker">MESSAGE SENT</p>
      <h2>Thank you for contacting AMB BOUTIQUE.</h2>
      <p>{message}</p>
      <button type="button" className="button dark" onClick={() => { setStatus("idle"); setMessage(""); }}>
        Send Another Message
      </button>
    </section>;
  }

  return <form className="contact-form" onSubmit={submit}>
    <div><label>First name<input name="firstName" autoComplete="given-name" required/></label><label>Last name<input name="lastName" autoComplete="family-name" required/></label></div>
    <label>Email<input name="email" type="email" autoComplete="email" required/></label>
    <label>Order number <small>(optional)</small><input name="orderNumber"/></label>
    <label>How can we help?<select name="topic" defaultValue="Product question"><option>Product question</option><option>Order support</option><option>Shipping & returns</option><option>Press & partnerships</option><option>Something else</option></select></label>
    <label>Message<textarea name="message" rows={7} required/></label>
    <button className="button dark" disabled={pending}>{pending ? "Sending…" : "Send Message"}</button>
    {status === "error" && message && <output className="form-message form-message-error" aria-live="assertive">{message}</output>}
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
