"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useStore } from "./store-provider";

// Saved pieces live only in this browser (no account, no personal data).
const storageKey = "amb-saved-v1";
const changeEvent = "amb-saved-change";
const empty: string[] = [];
let cachedRaw: string | null = null;
let cachedList: string[] = empty;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === cachedRaw) return cachedList;
    cachedRaw = raw;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedList = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : empty;
  } catch {
    cachedList = empty;
  }
  return cachedList;
}

function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useSavedItems() {
  const saved = useSyncExternalStore(subscribe, read, () => empty);
  const toggle = useCallback((slug: string) => {
    const current = read();
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current].slice(0, 60);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* private mode: nothing to persist */ }
    window.dispatchEvent(new Event(changeEvent));
    return next.includes(slug);
  }, []);
  return { saved, toggle };
}

export function SaveButton({ slug, category, name }: { slug: string; category?: string; name: string }) {
  const { saved, toggle } = useSavedItems();
  const { trackEvent } = useStore();
  const isSaved = saved.includes(slug);
  return <button type="button" className={`save-button${isSaved ? " saved" : ""}`} aria-pressed={isSaved}
    aria-label={isSaved ? `Remove ${name} from saved pieces` : `Save ${name} for later`}
    onClick={() => { if (toggle(slug)) trackEvent("save_item", { slug, category, source: "product" }); }}>
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>
    <span>{isSaved ? "Saved" : "Save"}</span>
  </button>;
}
