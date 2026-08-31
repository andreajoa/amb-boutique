"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const consentKey = "amb-cookie-consent-v1";
const ahrefsAnalyticsKey = "UuDUZXu+e/yk/8oDyQ+KMQ";

function analyticsConsentGranted() {
  try {
    return JSON.parse(window.localStorage.getItem(consentKey) || "null")?.value === "all";
  } catch {
    return false;
  }
}

export function AhrefsAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const update = () => setEnabled(analyticsConsentGranted());
    update();
    window.addEventListener("amb-consent-change", update);
    return () => window.removeEventListener("amb-consent-change", update);
  }, []);

  if (!enabled) return null;

  return (
    <Script
      id="ahrefs-web-analytics"
      src="https://analytics.ahrefs.com/analytics.js"
      data-key={ahrefsAnalyticsKey}
      strategy="afterInteractive"
    />
  );
}
