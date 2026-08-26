"use client";

import { useEffect } from "react";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function EditorialStackMotion() {
  useEffect(() => {
    const stack = document.querySelector<HTMLElement>(".editorial-stack");
    if (!stack) return;
    const panels = Array.from(stack.querySelectorAll<HTMLElement>(".stack-panel"));
    const desktop = window.matchMedia("(min-width: 901px) and (min-height: 700px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const reset = () => panels.forEach((panel) => {
      panel.style.removeProperty("--stack-scale");
      panel.style.removeProperty("--stack-brightness");
    });
    const update = () => {
      frame = 0;
      if (!desktop.matches || reducedMotion.matches) { reset(); return; }
      const viewportHeight = window.innerHeight;
      panels.forEach((panel, index) => {
        const next = panels[index + 1];
        if (!next) return;
        const progress = clamp((viewportHeight - next.getBoundingClientRect().top) / viewportHeight, 0, 1);
        panel.style.setProperty("--stack-scale", String(1 - progress * 0.045));
        panel.style.setProperty("--stack-brightness", String(1 - progress * 0.08));
      });
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    desktop.addEventListener("change", schedule);
    reducedMotion.addEventListener("change", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      desktop.removeEventListener("change", schedule);
      reducedMotion.removeEventListener("change", schedule);
      reset();
    };
  }, []);

  return null;
}
