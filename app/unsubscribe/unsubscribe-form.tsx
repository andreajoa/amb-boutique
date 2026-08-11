"use client";

import { useState } from "react";

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  async function unsubscribe() {
    setState("pending");
    const response = await fetch("/api/unsubscribe", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    });
    setState(response.ok ? "done" : "error");
  }
  if (state === "done") return <p>You’re unsubscribed. We’ll miss you, and we respect your choice.</p>;
  return <div>
    <p>Stop AMB BOUTIQUE marketing emails to this address. Transactional order updates may still be sent when necessary.</p>
    <button onClick={unsubscribe} disabled={state === "pending"}>{state === "pending" ? "Updating…" : "Unsubscribe"}</button>
    {state === "error" ? <p>This link could not be verified. Contact info@ambboutique.online for help.</p> : null}
  </div>;
}

