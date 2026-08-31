"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ga4Event, updateGA4Consent } from "./ga4";

const consentKey = "amb-cookie-consent-v1";
const profileKey = "amb-boutique-preferences-v1";
const sessionKey = "amb-analytics-session-v1";
const visitorSessionKey = "amb-session-id";

function randomId(prefix: string) {
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

function consentValue(): "essential" | "all" | null {
  try {
    const value = JSON.parse(localStorage.getItem(consentKey) || "null")?.value;
    return value === "all" || value === "essential" ? value : null;
  } catch {
    return null;
  }
}

function consentGranted() {
  return consentValue() === "all";
}

function identity() {
  let visitorId = sessionStorage.getItem(visitorSessionKey) || randomId("visitor");
  sessionStorage.setItem(visitorSessionKey, visitorId);
  try {
    const profile = JSON.parse(localStorage.getItem(profileKey) || "null");
    if (profile?.visitorId) visitorId = String(profile.visitorId);
  } catch {}
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = randomId("session");
    sessionStorage.setItem(sessionKey, sessionId);
  }
  return { visitorId, sessionId };
}

function device() {
  const ua = navigator.userAgent;
  return {
    type: /Mobi|Android/i.test(ua) ? "mobile" : /Tablet|iPad/i.test(ua) ? "tablet" : "desktop",
    browser: /Edg/i.test(ua) ? "Edge" : /Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : /Firefox/i.test(ua) ? "Firefox" : "Other",
    os: /iPhone|iPad/i.test(ua) ? "iOS" : /Android/i.test(ua) ? "Android" : /Mac OS/i.test(ua) ? "macOS" : /Windows/i.test(ua) ? "Windows" : "Other",
    language: navigator.language,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function acquisition() {
  const url = new URL(window.location.href);
  return {
    source: url.searchParams.get("utm_source") || "",
    medium: url.searchParams.get("utm_medium") || "",
    campaign: url.searchParams.get("utm_campaign") || "",
    content: url.searchParams.get("utm_content") || "",
    term: url.searchParams.get("utm_term") || "",
  };
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const startedAt = useRef(0);
  const scrollMarks = useRef(new Set<number>());
  const lastPath = useRef("");

  useEffect(() => {
    const update = () => {
      const value = consentValue();
      updateGA4Consent(value === "all" ? "all" : "essential");
      setEnabled(value === "all");
    };
    update();
    window.addEventListener("amb-consent-change", update);
    return () => window.removeEventListener("amb-consent-change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    startedAt.current = Date.now();
    const ids = identity();
    const base = {
      ...ids,
      path: window.location.pathname,
      referrer: document.referrer,
      utm: acquisition(),
      device: device(),
      market: localStorage.getItem("amb-boutique-market-v1") || "US",
    };
    const send = (event: string, extra: Record<string, unknown> = {}, beacon = false) => {
      const payload = JSON.stringify({ event, ...base, path: window.location.pathname, ...extra });
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
        return;
      }
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    };

    send("session_start");
    const onClick = (event: MouseEvent) => {
      const element = (event.target as HTMLElement | null)?.closest<HTMLElement>("a,button,[data-track]");
      if (!element) return;
      const raw = element.dataset.track || element.getAttribute("aria-label") || element.textContent || element.tagName;
      const target = raw.replace(/\s+/g, " ").trim().slice(0, 120);
      const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") || "" : "";
      send("click", { target, metadata: { href: href.slice(0, 300) } });
    };
    const onScroll = () => {
      const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const depth = Math.min(100, Math.round((window.scrollY / available) * 100));
      [25, 50, 75, 100].forEach((mark) => {
        if (depth >= mark && !scrollMarks.current.has(mark)) {
          scrollMarks.current.add(mark);
          send("scroll_depth", { scrollDepth: mark });
        }
      });
    };
    const heartbeat = window.setInterval(() => {
      send("heartbeat", { durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
    }, 30000);
    const end = () => send("session_end", {
      durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      scrollDepth: Math.max(0, ...scrollMarks.current),
    }, true);

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", end);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", end);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    scrollMarks.current.clear();

    ga4Event("page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pathname,
    });

    const ids = identity();
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event: "page_view",
        ...ids,
        path: pathname,
        referrer: document.referrer,
        utm: acquisition(),
        device: device(),
        market: localStorage.getItem("amb-boutique-market-v1") || "US",
      }),
    }).catch(() => undefined);
  }, [enabled, pathname]);

  return null;
}
