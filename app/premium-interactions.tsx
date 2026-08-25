"use client";

import { useEffect } from "react";

const buttonSelector = [
  ".button",
  ".add-button",
  ".buy-button",
  ".checkout-button",
  ".load-more-button",
  ".view-bag",
  ".newsletter button[type='submit']",
  ".footer-form button[type='submit']",
  ".welcome-copy button[type='submit']",
].join(",");

function resetButton(button: HTMLElement | null) {
  if (!button) return;
  button.style.removeProperty("--button-shift-x");
  button.style.removeProperty("--button-shift-y");
  button.classList.remove("is-magnetic");
}

export function PremiumInteractions() {
  useEffect(() => {
    const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeButton: HTMLElement | null = null;
    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;

    const update = () => {
      frame = 0;
      if (!activeButton || !precisePointer.matches || reducedMotion.matches) return;
      const rect = activeButton.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (pointerX - (rect.left + rect.width / 2)) / Math.max(1, rect.width / 2)));
      const y = Math.max(-1, Math.min(1, (pointerY - (rect.top + rect.height / 2)) / Math.max(1, rect.height / 2)));
      activeButton.style.setProperty("--button-shift-x", `${(x * 4).toFixed(2)}px`);
      activeButton.style.setProperty("--button-shift-y", `${(y * 3).toFixed(2)}px`);
      activeButton.classList.add("is-magnetic");
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!precisePointer.matches || reducedMotion.matches) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(buttonSelector) : null;
      if (target !== activeButton) {
        resetButton(activeButton);
        activeButton = target;
      }
      if (!activeButton) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!activeButton) return;
      const related = event.relatedTarget;
      if (related instanceof Node && activeButton.contains(related)) return;
      resetButton(activeButton);
      activeButton = null;
    };

    const onPreferenceChange = () => {
      if (!precisePointer.matches || reducedMotion.matches) {
        resetButton(activeButton);
        activeButton = null;
      }
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    precisePointer.addEventListener("change", onPreferenceChange);
    reducedMotion.addEventListener("change", onPreferenceChange);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      precisePointer.removeEventListener("change", onPreferenceChange);
      reducedMotion.removeEventListener("change", onPreferenceChange);
      resetButton(activeButton);
    };
  }, []);

  return null;
}
