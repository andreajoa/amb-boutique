"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type ConsentAPI = {
  consentManager: { setConsent(value: { necessary: boolean; analytics: boolean; marketing: boolean; preferences: boolean }): void };
};
type OmnisendWindow = Window & {
  omnisend?: { push(value: unknown[]): unknown };
  __omnisendCookieConsent?: { getConsentAPI(options: { wait: boolean }): Promise<ConsentAPI | null> };
};
const brandID = "6ac18cebf9e55097b6c81ad9";
const scriptID = "amb-omnisend-loader";
let consentAPI: ConsentAPI | null = null;
let lastPage = "";
let configured = false;

function permitted() {
  // Private pages and signed recovery/unsubscribe links never load this SDK.
  if (/^\/(dashboard|api|recover-cart|unsubscribe|checkout)(\/|$)/.test(window.location.pathname)) return false;
  if ([...new URLSearchParams(window.location.search).keys()].some(key => /token|email|secret|session|signature/i.test(key))) return false;
  try { return JSON.parse(localStorage.getItem("amb-cookie-consent-v1") || "null")?.value === "all"; }
  catch { return false; }
}
function forwardConsent() {
  const allowed = permitted();
  consentAPI?.consentManager.setConsent({ necessary: true, analytics: allowed, marketing: allowed, preferences: allowed });
  return allowed;
}
function pageViewed() {
  if (!consentAPI || !forwardConsent()) return;
  const page = window.location.pathname + window.location.search;
  if (page === lastPage) return;
  lastPage = page;
  (window as OmnisendWindow).omnisend?.push(["track", "$pageViewed"]);
}
async function attachConsent() {
  const sdk = window as OmnisendWindow;
  // The launcher downloads its core asynchronously; waiting is bounded.
  for (let attempt = 0; attempt < 100; attempt++) {
    if (sdk.__omnisendCookieConsent) {
      consentAPI = await sdk.__omnisendCookieConsent.getConsentAPI({ wait: true });
      // Read the current preference, not the one present when download started.
      forwardConsent();
      pageViewed();
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
function update() {
  if (!forwardConsent()) { lastPage = ""; return; }
  const sdk = window as OmnisendWindow;
  if (!configured) {
    sdk.omnisend = sdk.omnisend || [];
    sdk.omnisend.push(["brandID", brandID]);
    configured = true;
  }
  if (!document.getElementById(scriptID)) {
    const script = document.createElement("script");
    script.id = scriptID;
    script.async = true;
    script.src = "https://omnisnippet1.com/inshop/launcher-v2.js";
    script.addEventListener("load", () => { void attachConsent().catch(() => undefined); }, { once: true });
    script.addEventListener("error", () => { script.remove(); }, { once: true });
    document.body.appendChild(script);
  } else {
    pageViewed();
  }
}

export function OmnisendTracker() {
  const pathname = usePathname();
  useEffect(() => {
    update();
    window.addEventListener("amb-consent-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("amb-consent-change", update);
      window.removeEventListener("storage", update);
    };
  }, [pathname]);
  return null;
}
