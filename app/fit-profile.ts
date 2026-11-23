"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_FIT_PROFILE, type FitProfile } from "./fit-engine";

// Fit profile lives only in this shopper's browser — never uploaded to any server.
const storageKey = "amb-fit-profile-v1";
const changeEvent = "amb-fit-profile-change";

let cachedRaw: string | null | undefined = undefined;
let cachedProfile: FitProfile | null = null;

function isValidProfile(value: unknown): value is FitProfile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (candidate.mode === "quick" || candidate.mode === "measurements")
    && typeof candidate.heightCm === "number"
    && Number.isFinite(candidate.heightCm)
    && typeof candidate.weightKg === "number"
    && Number.isFinite(candidate.weightKg)
    && typeof candidate.usualSize === "string"
    && typeof candidate.bodyShape === "string"
    && typeof candidate.fitPreference === "string";
}

function readProfile(): FitProfile | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === cachedRaw) return cachedProfile;
    cachedRaw = raw;
    if (!raw) {
      cachedProfile = null;
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    cachedProfile = isValidProfile(parsed) ? parsed : null;
  } catch {
    cachedProfile = null;
  }
  return cachedProfile;
}

function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useFitProfile() {
  const profile = useSyncExternalStore(subscribe, readProfile, () => null);

  const saveProfile = useCallback((next: FitProfile) => {
    const payload: FitProfile = {
      ...DEFAULT_FIT_PROFILE,
      ...next,
      updatedAt: new Date().toISOString(),
    };
    try {
      const serialized = JSON.stringify(payload);
      window.localStorage.setItem(storageKey, serialized);
      cachedRaw = serialized;
      cachedProfile = payload;
    } catch {
      cachedProfile = payload;
    }
    window.dispatchEvent(new Event(changeEvent));
    return payload;
  }, []);

  const clearProfile = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore private-mode storage failures */
    }
    cachedRaw = null;
    cachedProfile = null;
    window.dispatchEvent(new Event(changeEvent));
  }, []);

  return { profile, saveProfile, clearProfile };
}
