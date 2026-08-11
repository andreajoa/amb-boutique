"use client";

import { FormEvent, useState } from "react";

export function DashboardLoginForm({ configured }: { configured: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accessKey = String(new FormData(event.currentTarget).get("accessKey") || "");
    setPending(true);
    setMessage("");
    const response = await fetch("/api/dashboard/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessKey }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) window.location.replace("/dashboard");
    else {
      setMessage(result.error || "Access unavailable.");
      setPending(false);
    }
  }
  return <form onSubmit={submit}>
    <label>Private access key<input name="accessKey" type="password" autoComplete="current-password" disabled={!configured} required/></label>
    <button type="submit" disabled={pending || !configured}>{pending ? "Opening…" : "Open dashboard"}</button>
    {!configured ? <p>Set DASHBOARD_ACCESS_KEY and DASHBOARD_SESSION_SECRET in Vercel to activate private access.</p> : null}
    {message ? <output>{message}</output> : null}
  </form>;
}

