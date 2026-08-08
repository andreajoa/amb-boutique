"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const consentKey = "amb-cookie-consent-v1";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { queueMicrotask(() => setVisible(!window.localStorage.getItem(consentKey))); }, []);
  if (!visible) return null;

  const save = (value: "essential" | "all") => {
    window.localStorage.setItem(consentKey, JSON.stringify({ value, savedAt: new Date().toISOString() }));
    setVisible(false);
  };

  return <aside className="cookie-banner" aria-label="Cookie preferences">
    <div><strong>Your privacy, your choice</strong><p>We use essential cookies to keep the boutique working. Optional analytics and marketing technologies stay off unless you accept them.</p><Link href="/cookies">Learn more</Link></div>
    <div><button type="button" className="cookie-secondary" onClick={() => save("essential")}>Essential only</button><button type="button" className="cookie-primary" onClick={() => save("all")}>Accept all</button></div>
  </aside>;
}
